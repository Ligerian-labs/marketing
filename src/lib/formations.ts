import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import db from "./db";

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
  
  // Check if user has purchased the specific tier for this formation
  const tierForSlug = Object.entries(TIER_MAPPING).find(([_, tierDir]) => 
    formationSlug.startsWith(tierDir)
  )?.[0];
  
  if (!tierForSlug) return false;
  
  // For premium tier, user needs premium access
  if (tierForSlug === 'formation-premium') {
    return purchases.some(p => p.pack === 'formation-premium' && p.status === 'completed');
  }
  
  // For intermediate tier, user needs intermediate or premium access
  if (tierForSlug === 'formation-intermediate') {
    return purchases.some(p => 
      (p.pack === 'formation-intermediate' || p.pack === 'formation-premium') && 
      p.status === 'completed'
    );
  }
  
  // For starter tier, user needs any tier access
  if (tierForSlug === 'formation-starter') {
    return purchases.some(p => 
      p.pack.startsWith('formation-') && p.status === 'completed'
    );
  }
  
  return false;
}

export function getFormationContent(tier: string, chapter: string): string | null {
  try {
    const contentPath = join(process.cwd(), 'src', 'formations', tier, `${chapter}.md`);
    
    if (!existsSync(contentPath)) {
      console.warn(`Formation content not found: ${contentPath}`);
      return null;
    }
    
    return readFileSync(contentPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading formation content: ${tier}/${chapter}`, error);
    return null;
  }
}

export function getFormationChapters(tier: string): Array<{slug: string, title: string}> {
  try {
    const contentPath = join(process.cwd(), 'src', 'formations', tier);
    
    if (!existsSync(contentPath)) {
      return [];
    }
    
    // Read the README.md to get chapter list or scan directory
    const readmePath = join(contentPath, 'README.md');
    if (existsSync(readmePath)) {
      const readmeContent = readFileSync(readmePath, 'utf-8');
      // Extract chapter titles from markdown headers
      const chapters: Array<{slug: string, title: string}> = [];
      const lines = readmeContent.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+\[(.+?)\]\((\d+-.*?)\.md\)/);
        if (match) {
          const [, title, slug] = match;
          chapters.push({ slug, title });
        }
      }
      
      return chapters;
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting formation chapters for tier: ${tier}`, error);
    return [];
  }
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