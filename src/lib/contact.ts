/**
 * Contact enquiry contract, shared by the browser form and the API route so
 * both enforce the same fields and limits. No Node or Astro imports here.
 */

export const PROJECT_TYPES = ["new-application", "existing-software", "ai-integration", "other"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  "new-application": "Nouvelle application",
  "existing-software": "Logiciel existant",
  "ai-integration": "Intégration d'IA",
  other: "Autre",
};

export const LIMITS = {
  name: 100,
  email: 254,
  company: 120,
  descriptionMin: 10,
  description: 4000,
  timing: 120,
  budget: 120,
  /** Whole JSON body. Four-byte characters plus JSON escaping fit well inside it. */
  bodyBytes: 64 * 1024,
} as const;

export type ContactField =
  | "name"
  | "email"
  | "company"
  | "projectType"
  | "description"
  | "timing"
  | "budget"
  | "consent";

export interface ContactEnquiry {
  name: string;
  email: string;
  company: string | null;
  projectType: ProjectType;
  description: string;
  timing: string | null;
  budget: string | null;
}

export type ContactErrors = Partial<Record<ContactField, string>>;

export type ContactValidation =
  | { ok: true; value: ContactEnquiry }
  | { ok: false; errors: ContactErrors };

// ASCII addresses only: enough for a work email, and it keeps header-injection
// characters (CR, LF, angle brackets, quotes, commas) out of reply-to.
const EMAIL =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const MESSAGES = {
  name: "Indiquez votre nom.",
  email: "Indiquez une adresse email valide, par exemple vous@entreprise.fr.",
  projectType: "Choisissez le type de projet.",
  descriptionShort: `Décrivez votre projet en quelques lignes (${LIMITS.descriptionMin} caractères minimum).`,
  consent: "Cochez la case pour que nous puissions utiliser ces informations pour vous répondre.",
  type: "Valeur invalide.",
} as const;

function tooLong(max: number): string {
  return `${max.toLocaleString("fr-FR")} caractères maximum.`;
}

// Control characters never belong in a single-line field or the description.
// Newline and tab survive in the description only.
function clean(value: string, multiline: boolean): string {
  const keep = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(/\r\n?/g, "\n").replace(keep, multiline ? "" : " ").trim();
}

/**
 * Validate an unknown payload. Pure and total: any input yields a verdict,
 * never an exception. Unknown keys are ignored and never reach `value`.
 */
export function validateContact(input: unknown): ContactValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: { name: MESSAGES.type } };
  }
  const raw = input as Record<string, unknown>;
  const errors: ContactErrors = {};

  const text = (field: ContactField, multiline = false): string | undefined => {
    const v = raw[field];
    if (v === undefined || v === null) return "";
    if (typeof v !== "string") {
      errors[field] = MESSAGES.type;
      return undefined;
    }
    return clean(v, multiline);
  };

  const name = text("name");
  if (name === "") errors.name = MESSAGES.name;
  else if (name !== undefined && name.length > LIMITS.name) errors.name = tooLong(LIMITS.name);

  const email = text("email");
  if (email !== undefined && !errors.email) {
    if (email === "" || email.length > LIMITS.email || !EMAIL.test(email)) errors.email = MESSAGES.email;
  }

  const company = text("company");
  if (company !== undefined && company.length > LIMITS.company) errors.company = tooLong(LIMITS.company);

  let projectType: ProjectType | undefined;
  if (typeof raw.projectType === "string" && (PROJECT_TYPES as readonly string[]).includes(raw.projectType)) {
    projectType = raw.projectType as ProjectType;
  } else {
    errors.projectType = MESSAGES.projectType;
  }

  const description = text("description", true);
  if (description !== undefined) {
    if (description.length < LIMITS.descriptionMin) errors.description = MESSAGES.descriptionShort;
    else if (description.length > LIMITS.description) errors.description = tooLong(LIMITS.description);
  }

  const timing = text("timing");
  if (timing !== undefined && timing.length > LIMITS.timing) errors.timing = tooLong(LIMITS.timing);
  const budget = text("budget");
  if (budget !== undefined && budget.length > LIMITS.budget) errors.budget = tooLong(LIMITS.budget);

  if (raw.consent !== true) errors.consent = MESSAGES.consent;

  if (Object.keys(errors).length > 0 || projectType === undefined) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: name as string,
      email: email as string,
      company: company || null,
      projectType,
      description: description as string,
      timing: timing || null,
      budget: budget || null,
    },
  };
}
