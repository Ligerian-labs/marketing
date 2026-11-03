/**
 * Browser-side submit flow, free of DOM access so every branch can be tested
 * with a fake `fetch`. The page binds it to the form and to `window.posthog`.
 */
import { validateContact, type ContactErrors, type ContactField, type ProjectType } from "./contact.ts";
import { submittedEvent, type Visit } from "./contact-analytics.ts";

export interface ClientEnv {
  fetch: typeof fetch;
  visit: Visit;
  /** Analytics hook. May be missing or throw: neither affects the outcome. */
  capture?: (event: string, properties: { project_type: ProjectType }) => void;
  timeoutMs?: number;
}

export type SubmitOutcome =
  | { status: "invalid"; errors: ContactErrors }
  | { status: "fields"; errors: ContactErrors }
  | { status: "sent" }
  | { status: "failed"; reason: "network" | "server" };

const FIELDS: ContactField[] = ["name", "email", "company", "projectType", "description", "timing", "budget", "consent"];

/** Keep only known field keys with string messages from a server reply. */
function serverFieldErrors(fields: unknown): ContactErrors {
  const out: ContactErrors = {};
  if (typeof fields !== "object" || fields === null) return out;
  for (const field of FIELDS) {
    const message = (fields as Record<string, unknown>)[field];
    if (typeof message === "string") out[field] = message;
  }
  return out;
}

export async function submitEnquiry(payload: Record<string, unknown>, env: ClientEnv): Promise<SubmitOutcome> {
  const verdict = validateContact(payload);
  if (!verdict.ok) return { status: "invalid", errors: verdict.errors };

  let response: Response;
  try {
    response = await env.fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(env.timeoutMs ?? 20000),
    });
  } catch {
    return { status: "failed", reason: "network" };
  }

  let result: unknown = null;
  try {
    result = await response.json();
  } catch {
    /* non-JSON error page */
  }

  if (response.status === 400) {
    const errors = serverFieldErrors((result as { fields?: unknown } | null)?.fields);
    if (Object.keys(errors).length > 0) return { status: "fields", errors };
  }
  if (!response.ok) return { status: "failed", reason: "server" };

  // Only a 2xx reply that carries a stored lead id counts as an enquiry.
  try {
    const event = submittedEvent(result, verdict.value.projectType, env.visit);
    if (event) env.capture?.(event.name, event.properties);
  } catch {
    /* analytics must never affect the visitor */
  }
  return { status: "sent" };
}
