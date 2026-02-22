import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import db from "./db";

// --- Private repo config ---
const CONTENT_REPO = "Ligerian-labs/ai-learning-content";
const CONTENT_BRANCH = "main";
const GITHUB_TOKEN = import.meta.env.GITHUB_CONTENT_TOKEN || "";
const CACHE_DIR = join(process.cwd(), "data", "formations-cache");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Ensure cache dir exists
mkdirSync(CACHE_DIR, { recursive: true });

export interface Purchase {
  id: string;
  user_id: string;
  pack: string;
  stripe_session_id: string | null;
  status: string;
  created_at: string;
}

// Formation tier mapping
const TIER_MAPPING = {
  'formation-starter': '01-guide-pme',
  'formation-intermediate': '02-automatiser',
  'formation-premium': '03-deployer'
} as const;

export const FORMATION_TIERS = {
  'formation-starter': {
    name: 'IA pour les PME',
    description: 'Guide pratique pour intégrer l\'IA dans votre PME',
    price_cents: 4900,
    tier_dir: '01-guide-pme'
  },
  'formation-intermediate': {
    name: 'Automatiser son Business',
    description: 'Workflows et automatisations IA pour votre entreprise',
    price_cents: 9900,
    tier_dir: '02-automatiser'
  },
  'formation-premium': {
    name: 'Déployer l\'IA en Entreprise',
    description: 'Stratégie et architecture IA pour grandes organisations',
    price_cents: 14900,
    tier_dir: '03-deployer'
  }
} as const;

export type FormationTier = keyof typeof FORMATION_TIERS;

// --- Purchase Management ---

export function createPurchase(
  userId: string,
  pack: string,
  stripeSessionId?: string
): Purchase {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO purchases (id, user_id, pack, stripe_session_id, status)
     VALUES (?, ?, ?, ?, 'completed')`
  ).run(id, userId, pack, stripeSessionId || null);

  return db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as Purchase;
}

export function getUserPurchases(userId: string): Purchase[] {
  return db.prepare(
    "SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId) as Purchase[];
}

export function hasAccess(userId: string, formationSlug: string): boolean {
  const purchases = getUserPurchases(userId);

  const tierForSlug = Object.entries(TIER_MAPPING).find(([_, tierDir]) =>
    formationSlug.startsWith(tierDir)
  )?.[0];

  if (!tierForSlug) return false;

  if (tierForSlug === 'formation-premium') {
    return purchases.some(p => p.pack === 'formation-premium' && p.status === 'completed');
  }

  if (tierForSlug === 'formation-intermediate') {
    return purchases.some(p =>
      (p.pack === 'formation-intermediate' || p.pack === 'formation-premium') &&
      p.status === 'completed'
    );
  }

  if (tierForSlug === 'formation-starter') {
    return purchases.some(p =>
      p.pack.startsWith('formation-') && p.status === 'completed'
    );
  }

  return false;
}

// --- GitHub Content Fetching with Disk Cache ---

async function fetchFromGitHub(path: string): Promise<string | null> {
  if (!GITHUB_TOKEN) {
    console.error("[FORMATIONS] GITHUB_CONTENT_TOKEN not set — cannot fetch content");
    return null;
  }

  // Check disk cache first
  const cacheKey = path.replace(/\//g, "__");
  const cachePath = join(CACHE_DIR, cacheKey);
  const cacheMetaPath = cachePath + ".meta";

  if (existsSync(cachePath) && existsSync(cacheMetaPath)) {
    try {
      const meta = JSON.parse(readFileSync(cacheMetaPath, "utf-8"));
      if (Date.now() - meta.timestamp < CACHE_TTL_MS) {
        return readFileSync(cachePath, "utf-8");
      }
    } catch { /* cache miss */ }
  }

  // Fetch from GitHub
  try {
    const url = `https://api.github.com/repos/${CONTENT_REPO}/contents/${path}?ref=${CONTENT_BRANCH}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.raw+json",
      },
    });

    if (!res.ok) {
      console.warn(`[FORMATIONS] GitHub fetch failed for ${path}: ${res.status}`);
      // Return stale cache if available
      if (existsSync(cachePath)) return readFileSync(cachePath, "utf-8");
      return null;
    }

    const content = await res.text();

    // Write to cache
    writeFileSync(cachePath, content, "utf-8");
    writeFileSync(cacheMetaPath, JSON.stringify({ timestamp: Date.now() }), "utf-8");

    return content;
  } catch (error) {
    console.error(`[FORMATIONS] Error fetching ${path}:`, error);
    if (existsSync(cachePath)) return readFileSync(cachePath, "utf-8");
    return null;
  }
}

export async function getFormationContent(tier: string, chapter: string): Promise<string | null> {
  return fetchFromGitHub(`${tier}/${chapter}.md`);
}

export async function getFormationChapters(tier: string): Promise<Array<{ slug: string; title: string }>> {
  const readmeContent = await fetchFromGitHub(`${tier}/README.md`);
  if (!readmeContent) return [];

  const chapters: Array<{ slug: string; title: string }> = [];
  for (const line of readmeContent.split("\n")) {
    // Match patterns like: 1. **[Title](01-file.md)** or 1. [Title](01-file.md)
    const match = line.match(/\[(.+?)\]\((\d+-[^)]+?)\.md\)/);
    if (match) {
      const [, rawTitle, slug] = match;
      // Strip markdown bold markers
      const title = rawTitle.replace(/\*\*/g, "");
      chapters.push({ slug, title });
    }
  }

  return chapters;
}

export function getTierFromPack(pack: string): string | null {
  if (pack in TIER_MAPPING) {
    return TIER_MAPPING[pack as keyof typeof TIER_MAPPING];
  }
  return null;
}

export function getPackFromTier(tier: string): FormationTier | null {
  const entry = Object.entries(TIER_MAPPING).find(([_, tierDir]) => tierDir === tier);
  return entry ? entry[0] as FormationTier : null;
}