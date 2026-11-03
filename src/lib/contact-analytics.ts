/**
 * Decides whether a finished submission counts as a `contact_form_submitted`
 * event. Pure on purpose: the page passes in what it observed, so the rules
 * (server-accepted only, bounded properties, no local or automated traffic)
 * can be tested without a browser.
 */
import { PROJECT_TYPES, type ProjectType } from "./contact.ts";

export const CONTACT_SUBMITTED_EVENT = "contact_form_submitted";

export interface SubmittedEvent {
  name: typeof CONTACT_SUBMITTED_EVENT;
  properties: { project_type: ProjectType };
}

export interface Visit {
  hostname: string;
  /** `navigator.webdriver`: true under Playwright, Selenium and similar. */
  automated?: boolean;
}

const PRIVATE_IPV4 = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;

/** Local development, LAN previews and automated browsers must not skew counts. */
export function isInternalVisit({ hostname, automated }: Visit): boolean {
  if (automated) return true;
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "" ||
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".test") ||
    host.endsWith(".invalid") ||
    PRIVATE_IPV4.test(host)
  );
}

/**
 * `response` is the parsed API body of a 2xx reply. Only a freshly stored lead
 * carries an `id`; the honeypot reply is `{ ok: true }` without one, so it never
 * counts. Returns null whenever nothing should be sent.
 */
export function submittedEvent(response: unknown, projectType: unknown, visit: Visit): SubmittedEvent | null {
  if (isInternalVisit(visit)) return null;
  if (typeof response !== "object" || response === null) return null;
  const { ok, id } = response as { ok?: unknown; id?: unknown };
  if (ok !== true || typeof id !== "string" || !id.startsWith("lead_")) return null;
  const bounded = (PROJECT_TYPES as readonly string[]).includes(projectType as string)
    ? (projectType as ProjectType)
    : "other";
  return { name: CONTACT_SUBMITTED_EVENT, properties: { project_type: bounded } };
}
