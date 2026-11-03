export const prerender = false;
import type { APIRoute } from "astro";
import { join } from "node:path";
import { Resend } from "resend";
import { handleContact, type ContactDeps } from "../../lib/contact-server.ts";

// Built on demand: the Resend constructor throws when the key is missing, and
// a missing key must never cost us the lead — it is already on disk by then.
let resend: Resend | null = null;
function notifier(): ContactDeps["notify"] {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend ??= new Resend(key);
  const client = resend;
  return async (message) => {
    // Resend reports API failures in `error` instead of throwing.
    const { error } = await client.emails.send(message);
    if (error) throw new Error(error.message);
  };
}

export const POST: APIRoute = ({ request }) =>
  handleContact(request, {
    leadsDir: process.env.CONTACT_LEADS_DIR || join(process.cwd(), "leads"),
    notify: notifier(),
  });
