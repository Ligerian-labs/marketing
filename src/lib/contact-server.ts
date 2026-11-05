/**
 * Server side of the contact form: bounded body read, honeypot, validation,
 * durable storage, then an optional notification. The route in
 * `src/pages/api/contact.ts` only wires in the environment.
 */
import { randomBytes } from "node:crypto";
import { appendFile, mkdir, open, stat, truncate, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  LIMITS,
  PROJECT_TYPE_LABELS,
  validateContact,
  type ContactEnquiry,
  type ContactErrors,
} from "./contact.ts";

export interface Lead extends ContactEnquiry {
  id: string;
  timestamp: string;
  projectTypeLabel: string;
  consent: true;
  status: "new";
}

export interface Notification {
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  html: string;
}

export interface ContactDeps {
  /** Directory that holds `leads.jsonl` and one `<id>.json` per lead. */
  leadsDir: string;
  /** Sends the owner notification; null when email is not configured. */
  notify: ((message: Notification) => Promise<unknown>) | null;
  notifyTimeoutMs?: number;
  now?: () => Date;
  log?: Pick<Console, "warn" | "error" | "info">;
}

export const NOTIFY_TO = "bonjour@ligerianlabs.fr";
export const FROM_EMAIL = "leads@ligerianlabs.fr";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function fail(status: number, error: string, message: string, fields?: ContactErrors): Response {
  return reply(status, { ok: false, error, message, ...(fields ? { fields } : {}) });
}

class BodyTooLarge extends Error {}

/** Read at most `max` bytes, refusing early on the declared length and again while streaming. */
async function readBounded(request: Request, max: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) throw new BodyTooLarge();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:8px;font-weight:bold;color:#3A3A3A;">${label}</td><td style="padding:8px;">${value}</td></tr>`;
}

export function buildNotification(lead: Lead): Notification {
  const e = escapeHtml;
  return {
    from: `Ligerian Labs <${FROM_EMAIL}>`,
    to: [NOTIFY_TO],
    replyTo: lead.email,
    subject: `Nouvelle demande — ${lead.projectTypeLabel}`,
    html: `
      <h2>Nouvelle demande depuis ligerianlabs.fr</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;">
        ${row("Nom", e(lead.name))}
        ${row("Email", `<a href="mailto:${e(lead.email)}">${e(lead.email)}</a>`)}
        ${lead.company ? row("Entreprise", e(lead.company)) : ""}
        ${row("Type de projet", e(lead.projectTypeLabel))}
        ${lead.currentTool ? row("Outil actuel", e(lead.currentTool)) : ""}
        ${lead.timing ? row("Calendrier", e(lead.timing)) : ""}
        ${lead.budget ? row("Budget", e(lead.budget)) : ""}
      </table>
      <h3 style="margin-top:20px;">Description</h3>
      <p style="background:#ECE8DF;padding:16px;white-space:pre-wrap;">${e(lead.description)}</p>
      <hr style="margin-top:24px;border:none;border-top:1px solid #DED9CD;" />
      <p style="color:#6E6A62;font-size:12px;">Lead ID: ${lead.id} · ${lead.timestamp}</p>
    `,
  };
}

// Index appends run one at a time (per process) so a rollback cannot cut off a
// concurrent request's row. `leads.jsonl` is written by one server process.
let indexQueue: Promise<unknown> = Promise.resolve();
const TAIL_SCAN = 64 * 1024; // longer than any row the body limit allows

/** Read exactly `length` bytes at `position`; a read may return fewer, and EOF is an error. */
async function readExactly(path: string, position: number, length: number): Promise<Buffer> {
  const handle = await open(path, "r");
  try {
    const out = Buffer.alloc(length);
    let filled = 0;
    while (filled < length) {
      const { bytesRead } = await handle.read(out, filled, length - filled, position + filled);
      if (bytesRead === 0) throw new Error("leads index ended before its tail could be read");
      filled += bytesRead;
    }
    return out;
  } finally {
    await handle.close();
  }
}

/**
 * Return the length of the index up to its last complete row, cutting off a
 * part-written row (failed rollback, crash). Throws when the length or tail
 * cannot be established, so a new row is never glued onto a corrupt tail and
 * a failed look-up never truncates good rows.
 */
async function safeIndexLength(path: string): Promise<number> {
  const size = await stat(path).then(
    (info) => info.size,
    (err) => (err?.code === "ENOENT" ? 0 : Promise.reject(err)),
  );
  if (size === 0) return 0;
  const start = Math.max(0, size - TAIL_SCAN);
  const tail = await readExactly(path, start, size - start);
  if (tail[tail.length - 1] === 0x0a) return size;
  const lastNewline = tail.lastIndexOf(0x0a);
  if (lastNewline < 0 && start > 0) throw new Error("leads index has an unterminated row that cannot be repaired");
  const safe = lastNewline < 0 ? 0 : start + lastNewline + 1;
  await truncate(path, safe);
  return safe;
}

/**
 * Append one JSONL row. The tail is made whole first. If the write then fails
 * part-way (disk full, I/O error) the file is cut back to that length; if the
 * cut-back itself fails, the next call repairs the tail or refuses to write.
 * Rows are only ever added or cut off at the tail, never rewritten.
 */
export function appendIndexLine(path: string, line: string): Promise<void> {
  const run = indexQueue.then(async () => {
    const safe = await safeIndexLength(path);
    try {
      await appendFile(path, line);
    } catch (err) {
      await truncate(path, safe).catch(() => {});
      throw err;
    }
  });
  indexQueue = run.catch(() => {});
  return run;
}

/**
 * Store the lead. The per-lead file (`wx`, never overwrites, never removed) is
 * the durable record: once it exists the enquiry is accepted. `leads.jsonl` is
 * an index of those files, so it can only ever lack a row, never hold one whose
 * file is missing. An index failure is logged and does not lose or reject the lead.
 */
async function persist(lead: Lead, leadsDir: string, log: Pick<Console, "error">): Promise<void> {
  await mkdir(leadsDir, { recursive: true });
  await writeFile(join(leadsDir, `${lead.id}.json`), JSON.stringify(lead, null, 2), { flag: "wx" });
  try {
    await appendIndexLine(join(leadsDir, "leads.jsonl"), JSON.stringify(lead) + "\n");
  } catch (err) {
    log.error(`[LEAD] ${lead.id} saved, index row not written: ${err instanceof Error ? err.message : "unknown"}`);
  }
}

async function notifyOwner(lead: Lead, deps: ContactDeps): Promise<void> {
  const log = deps.log ?? console;
  if (!deps.notify) {
    log.warn(`[LEAD] ${lead.id} saved, email notification not configured`);
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      deps.notify(buildNotification(lead)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("notification timed out")), deps.notifyTimeoutMs ?? 8000);
      }),
    ]);
  } catch (err) {
    // The lead is already on disk; a mail problem must not turn into a lost visitor.
    log.error(`[LEAD] ${lead.id} saved, email notification failed: ${err instanceof Error ? err.message : "unknown"}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  const log = deps.log ?? console;

  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return fail(415, "unsupported_media_type", "Le contenu doit être au format JSON.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await readBounded(request, LIMITS.bodyBytes));
  } catch (err) {
    if (err instanceof BodyTooLarge) return fail(413, "payload_too_large", "Le message est trop volumineux.");
    return fail(400, "invalid_json", "Le message est illisible.");
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return fail(400, "invalid_payload", "Le message est illisible.");
  }

  // Honeypot: look accepted to a bot, keep nothing, and return no lead id so
  // the browser cannot mistake it for a real enquiry.
  if ((payload as Record<string, unknown>).website) return reply(200, { ok: true });

  const verdict = validateContact(payload);
  if (!verdict.ok) {
    return fail(400, "validation", "Certains champs sont à corriger.", verdict.errors);
  }

  const lead: Lead = {
    id: `lead_${Date.now()}_${randomBytes(4).toString("hex")}`,
    timestamp: (deps.now?.() ?? new Date()).toISOString(),
    ...verdict.value,
    projectTypeLabel: PROJECT_TYPE_LABELS[verdict.value.projectType],
    consent: true,
    status: "new",
  };

  try {
    await persist(lead, deps.leadsDir, log);
  } catch (err) {
    log.error(`[LEAD] could not store enquiry: ${err instanceof Error ? err.message : "unknown"}`);
    return fail(500, "storage_failed", "Votre message n'a pas pu être enregistré.");
  }

  await notifyOwner(lead, deps);
  log.info(`[LEAD] ${lead.id} stored (${lead.projectType})`);
  return reply(200, { ok: true, id: lead.id });
}
