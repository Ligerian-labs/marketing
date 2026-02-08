import type { APIRoute } from "astro";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const LEADS_DIR = join(process.cwd(), "leads");

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

    // Ensure leads directory exists
    await mkdir(LEADS_DIR, { recursive: true });

    // Append to leads file (one JSON per line for easy processing)
    const leadsFile = join(LEADS_DIR, "leads.jsonl");
    await writeFile(leadsFile, JSON.stringify(lead) + "\n", { flag: "a" });

    // Also write individual lead file for easy access
    const leadFile = join(LEADS_DIR, `${lead.id}.json`);
    await writeFile(leadFile, JSON.stringify(lead, null, 2));

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
