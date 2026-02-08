import type { APIRoute } from "astro";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Resend } from "resend";

const LEADS_DIR = join(process.cwd(), "leads");
const resend = new Resend(import.meta.env.RESEND_API_KEY);

const NOTIFY_TO = "bonjour@ligerianlabs.fr";
const FROM_EMAIL = "leads@ligerianlabs.fr";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Honeypot check
    if (body.website) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Validate required fields
    const { name, email, subject, message } = body;
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400 }
      );
    }

    const subjectLabels: Record<string, string> = {
      conseil: "Conseil IA — Audit & stratégie",
      outil: "Développement d'un outil IA",
      formation: "Formation IA",
      autre: "Autre",
    };

    // Build lead record
    const lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      name,
      email,
      company: body.company || null,
      phone: body.phone || null,
      subject,
      message,
      status: "new",
    };

    // Save to disk
    await mkdir(LEADS_DIR, { recursive: true });
    const leadsFile = join(LEADS_DIR, "leads.jsonl");
    await writeFile(leadsFile, JSON.stringify(lead) + "\n", { flag: "a" });
    const leadFile = join(LEADS_DIR, `${lead.id}.json`);
    await writeFile(leadFile, JSON.stringify(lead, null, 2));

    // Send notification email
    try {
      await resend.emails.send({
        from: `Ligerian Labs <${FROM_EMAIL}>`,
        to: [NOTIFY_TO],
        replyTo: email,
        subject: `🔔 Nouveau lead — ${subjectLabels[subject] || subject}`,
        html: `
          <h2>Nouveau contact depuis ligerianlabs.fr</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:8px;font-weight:bold;color:#666;">Nom</td><td style="padding:8px;">${name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#666;">Email</td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
            ${body.company ? `<tr><td style="padding:8px;font-weight:bold;color:#666;">Entreprise</td><td style="padding:8px;">${body.company}</td></tr>` : ""}
            ${body.phone ? `<tr><td style="padding:8px;font-weight:bold;color:#666;">Téléphone</td><td style="padding:8px;">${body.phone}</td></tr>` : ""}
            <tr><td style="padding:8px;font-weight:bold;color:#666;">Sujet</td><td style="padding:8px;">${subjectLabels[subject] || subject}</td></tr>
          </table>
          <h3 style="margin-top:20px;">Message</h3>
          <p style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;">${message}</p>
          <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
          <p style="color:#999;font-size:12px;">Lead ID: ${lead.id} · ${lead.timestamp}</p>
        `,
      });
    } catch (emailErr) {
      console.error("[LEAD] Email notification failed:", emailErr);
      // Don't fail the request if email fails — lead is already saved
    }

    console.log(`[LEAD] New lead from ${name} <${email}> — ${subject}`);

    return new Response(JSON.stringify({ ok: true, id: lead.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[LEAD] Error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500 }
    );
  }
};
