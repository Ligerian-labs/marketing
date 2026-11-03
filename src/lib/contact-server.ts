/**
 * Server side of the contact form: bounded body read, honeypot, validation,
 * durable storage, then an optional notification. The route in
 * `src/pages/api/contact.ts` only wires in the environment.
 */
import { randomBytes } from "node:crypto";
import { appendFile, mkdir, open, stat, truncate, unlink, writeFile } from "node:fs/promises";
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
// concurrent request's row. The index is written by a single server process.
let indexQueue: Promise<unknown> = Promise.resolve();
const TAIL_SCAN = 64 * 1024; // longer than any row the body limit allows

/**
 * Make sure the index ends on a row boundary before appending. A row that was
 * only part-written (failed rollback, crash) is cut back to the last newline.
 * Throws when it cannot be repaired, so a new row is never glued onto a corrupt tail.
 */
async function ensureRowBoundary(path: string, size: number): Promise<void> {
  if (size === 0) return;
  const handle = await open(path, "r");
  let start = 0;
  let tail: Buffer;
  try {
    start = Math.max(0, size - TAIL_SCAN);
    tail = Buffer.alloc(size - start);
    await handle.read(tail, 0, tail.length, start);
  } finally {
    await handle.close();
  }
  if (tail[tail.length - 1] === 0x0a) return;
  const lastNewline = tail.lastIndexOf(0x0a);
  if (lastNewline < 0 && start > 0) throw new Error("leads index has an unterminated row that cannot be repaired");
  await truncate(path, lastNewline < 0 ? 0 : start + lastNewline + 1);
}

/**
 * Append one JSONL row. If the write fails part-way (disk full, I/O error) the
 * file is cut back to its previous length. If even that fails, the next call
 * repairs the tail first, or refuses to write, so the index stays parseable.
 */
export function appendIndexLine(path: string, line: string): Promise<void> {
  const run = indexQueue.then(async () => {
    const before = await stat(path).then(
      (info) => info.size,
      (err) => (err?.code === "ENOENT" ? 0 : Promise.reject(err)),
    );
    await ensureRowBoundary(path, before);
    const safe = await stat(path).then((info) => info.size, () => 0);
    try {
      await appendFile(path, line);
    } catch (err) {
      await truncate(path, safe).catch(() => {}); // a failed rollback is repaired by the next call
      throw err;
    }
  });
  indexQueue = run.catch(() => {});
  return run;
}

/**
 * Store the lead durably: the per-lead file first (`wx`, never overwrites),
 * then the index line. If the index append fails the file is removed so a
 * failed request leaves nothing half-written for the retry to duplicate.
 */
async function persist(lead: Lead, leadsDir: string): Promise<void> {
  await mkdir(leadsDir, { recursive: true });
  const file = join(leadsDir, `${lead.id}.json`);
  await writeFile(file, JSON.stringify(lead, null, 2), { flag: "wx" });
  try {
    await appendIndexLine(join(leadsDir, "leads.jsonl"), JSON.stringify(lead) + "\n");
  } catch (err) {
    await unlink(file).catch(() => {});
    throw err;
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
    await persist(lead, deps.leadsDir);
  } catch (err) {
    log.error(`[LEAD] could not store enquiry: ${err instanceof Error ? err.message : "unknown"}`);
    return fail(500, "storage_failed", "Votre message n'a pas pu être enregistré.");
  }

  await notifyOwner(lead, deps);
  log.info(`[LEAD] ${lead.id} stored (${lead.projectType})`);
  return reply(200, { ok: true, id: lead.id });
}
