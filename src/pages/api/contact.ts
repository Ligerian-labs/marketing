export const prerender = false;
import type { APIRoute } from "astro";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Resend } from "resend";

const LEADS_DIR = join(process.cwd(), "leads");

// Built on demand: the Resend constructor throws when the key is missing, and
// a missing key must never cost us the lead — it is already on disk by then.
let resend: Resend | null = null;
function mailer(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const NOTIFY_TO = "bonjour@ligerianlabs.fr";
const FROM_EMAIL = "leads@ligerianlabs.fr";

/** The four-stage diagnostic the contact form asks about. */
const STAGE_LABELS: Record<string, string> = {
  "00": "Stade 00 — Expérimentation",
  "01": "Stade 01 — En prod, à l'aveugle",
  "02": "Stade 02 — Mesurée, mais greffée",
  "03": "Stade 03 — Nativement IA",
  ns: "Ne sait pas encore",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:8px;font-weight:bold;color:#3A3A3A;">${label}</td><td style="padding:8px;">${value}</td></tr>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Honeypot check
    if (body.website) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const { name, email, message } = body;
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), { status: 400 });
    }

    const stade = typeof body.stade === "string" ? body.stade : "";
    const stadeLabel = STAGE_LABELS[stade] ?? "Non renseigné";

    const lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      name,
      email,
      company: body.company || null,
      role: body.role || null,
      stade: stade || null,
      stadeLabel,
      message,
      status: "new",
    };

    // Save to disk
    await mkdir(LEADS_DIR, { recursive: true });
    await writeFile(join(LEADS_DIR, "leads.jsonl"), JSON.stringify(lead) + "\n", { flag: "a" });
    await writeFile(join(LEADS_DIR, `${lead.id}.json`), JSON.stringify(lead, null, 2));

    // Send notification email
    const client = mailer();
    if (!client) {
      console.warn("[LEAD] RESEND_API_KEY not set — lead saved, no email sent");
    }
    try {
      await client?.emails.send({
        from: `Ligerian Labs <${FROM_EMAIL}>`,
        to: [NOTIFY_TO],
        replyTo: email,
        subject: `🔔 Nouveau lead — ${stadeLabel}`,
        html: `
          <h2>Nouveau contact depuis ligerianlabs.fr</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            ${row("Nom", escapeHtml(String(name)))}
            ${row("Email", `<a href="mailto:${escapeHtml(String(email))}">${escapeHtml(String(email))}</a>`)}
            ${lead.company ? row("Entreprise", escapeHtml(String(lead.company))) : ""}
            ${lead.role ? row("Rôle", escapeHtml(String(lead.role))) : ""}
            ${row("Stade", escapeHtml(stadeLabel))}
          </table>
          <h3 style="margin-top:20px;">Situation décrite</h3>
          <p style="background:#ECE8DF;padding:16px;white-space:pre-wrap;">${escapeHtml(String(message))}</p>
          <hr style="margin-top:24px;border:none;border-top:1px solid #DED9CD;" />
          <p style="color:#6E6A62;font-size:12px;">Lead ID: ${lead.id} · ${lead.timestamp}</p>
        `,
      });
    } catch (emailErr) {
      console.error("[LEAD] Email notification failed:", emailErr);
      // Don't fail the request if email fails — lead is already saved
    }

    console.log(`[LEAD] New lead from ${name} <${email}> — ${stadeLabel}`);

    return new Response(JSON.stringify({ ok: true, id: lead.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[LEAD] Error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
};
