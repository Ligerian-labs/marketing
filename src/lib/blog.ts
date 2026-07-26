/** Helpers shared by the blog index, the article template and the homepage teasers. */

const MONTHS_NUMERIC = /^\d{4}-\d{2}-\d{2}/;

/** "2026-06-05" → "05.06.2026", the Space Mono date form used across the system. */
export function formatDate(date: string): string {
  if (MONTHS_NUMERIC.test(date)) {
    const [y, m, d] = date.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${parsed.getFullYear()}`;
}

/** ISO form for <time datetime> and JSON-LD. */
export function isoDate(date: string): string {
  if (MONTHS_NUMERIC.test(date)) return date.slice(0, 10);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString().slice(0, 10);
}

/** Reading time in minutes, at 220 words per minute, floored at 1. */
export function readingTimeFromBody(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/** One `##` heading of an article, as surfaced by Astro's renderer. */
export interface TocEntry {
  id: string;
  text: string;
}

/** Stable key for filter buttons and data attributes — not a content anchor. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export type OfferSlug = "voir" | "livrer" | "reconstruire" | "automatiser";

/** Maps a post tag onto the offer it naturally leads to. First hit wins. */
const TAG_TO_OFFER: Record<string, OfferSlug> = {
  agents: "automatiser",
  agent: "automatiser",
  automatisation: "automatiser",
  architecture: "reconstruire",
  rag: "reconstruire",
  production: "livrer",
  deploiement: "livrer",
  securite: "livrer",
  cybersecurite: "livrer",
  rgpd: "livrer",
  reglementation: "livrer",
  donnees: "livrer",
  "vie-privee": "livrer",
  confiance: "livrer",
  couts: "voir",
  observabilite: "voir",
  supervision: "voir",
};

/** Broad topic shown on blog cards, in the vocabulary of the offer menu. */
const TAG_TO_CATEGORY: Record<string, string> = {
  agents: "Agents",
  agent: "Agents",
  automatisation: "Agents",
  architecture: "Architecture",
  rag: "Architecture",
  outils: "Architecture",
  securite: "Sécurité & production",
  cybersecurite: "Sécurité & production",
  rgpd: "Sécurité & production",
  reglementation: "Sécurité & production",
  "vie-privee": "Sécurité & production",
  donnees: "Sécurité & production",
  confiance: "Sécurité & production",
  couts: "Coûts & token ops",
  productivite: "Coûts & token ops",
  conseil: "Coûts & token ops",
  formation: "Montée en compétence",
  pme: "PME",
  tendances: "Tendances",
};

function normalise(tag: string): string {
  return slug(tag);
}

export function relatedOffer(tags: string[] = []): OfferSlug {
  for (const tag of tags) {
    const hit = TAG_TO_OFFER[normalise(tag)];
    if (hit) return hit;
  }
  return "voir";
}

export function category(tags: string[] = []): string {
  for (const tag of tags) {
    const hit = TAG_TO_CATEGORY[normalise(tag)];
    if (hit) return hit;
  }
  return "Notes d'ingénierie";
}

/** Distinct categories present in a set of posts, most frequent first. */
export function categoriesOf(postTags: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const tags of postTags) {
    const c = category(tags);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
