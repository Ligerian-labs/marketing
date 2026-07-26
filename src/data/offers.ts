/**
 * The four offers and the four-stage diagnostic.
 * Single source of truth: the homepage, /offres, /ia-angers and the article
 * sidebar all read from here so a wording change lands everywhere at once.
 */

export type OfferSlug = "voir" | "livrer" | "reconstruire" | "automatiser";

export interface Offer {
  slug: OfferSlug;
  code: string;
  name: string;
  promise: string;
  duration: string;
  /** Homepage teaser — the pain, in the client's words. */
  teaser: string;
  /** Short line used on the local SEO pages. */
  short: string;
  lead: boolean;
}

export const offers: Offer[] = [
  {
    slug: "voir",
    code: "S/01",
    name: "Voir",
    promise: "Token ops & supervision",
    duration: "3–5 semaines",
    teaser:
      "Le coût, la latence et la qualité deviennent des chiffres que votre équipe regarde chaque matin.",
    short: "Supervision des coûts, de la latence et de la qualité de vos appels IA.",
    lead: true,
  },
  {
    slug: "livrer",
    code: "S/02",
    name: "Livrer",
    promise: "Déployer l'IA en production",
    duration: "4–8 semaines",
    teaser: "La démo a convaincu tout le monde. Six mois plus tard, c'est toujours une démo.",
    short: "Faire passer votre prototype IA en production, pour de vrai.",
    lead: false,
  },
  {
    slug: "reconstruire",
    code: "S/03",
    name: "Reconstruire",
    promise: "L'IA au cœur du produit",
    duration: "3–9 mois",
    teaser:
      "Étendre, brancher ou réécrire — trois routes honnêtes, une choisie par écrit en semaine 1.",
    short: "Remettre l'IA au cœur d'un produit existant, sans big-bang.",
    lead: false,
  },
  {
    slug: "automatiser",
    code: "S/04",
    name: "Automatiser",
    promise: "Développer des agents",
    duration: "6–12 semaines",
    teaser:
      "Un agent n'est pas un chatbot. C'est un logiciel qui prend une tâche et montre ce qu'il a fait.",
    short: "Des agents qui prennent en charge du travail répétitif, avec traces.",
    lead: false,
  },
];

export interface Stage {
  code: string;
  name: string;
  description: string;
  /** The offer that gets you out of this stage. */
  go: OfferSlug;
  goLabel: string;
  common: boolean;
}

export const stages: Stage[] = [
  {
    code: "Stade 00",
    name: "Expérimentation",
    description:
      "Des démos impressionnantes dans des notebooks. Un champion qui pousse. Pas de propriétaire, pas de chemin de déploiement, et une direction qui demande quand ça sort.",
    go: "livrer",
    goLabel: "Livrer",
    common: false,
  },
  {
    code: "Stade 01 · le plus courant",
    name: "En prod, à l'aveugle",
    description:
      "Ça marche et vos clients en dépendent. Le coût arrive comme une surprise, la qualité est anecdotique, et personne ne veut toucher au prompt qui tient l'ensemble.",
    go: "voir",
    goLabel: "Voir",
    common: true,
  },
  {
    code: "Stade 02",
    name: "Mesurée, mais greffée",
    description:
      "Vous savez ce que ça coûte et si ça progresse. Mais l'IA est une fonctionnalité à côté du produit — chaque nouveau cas d'usage est une nouvelle intégration.",
    go: "reconstruire",
    goLabel: "Reconstruire",
    common: false,
  },
  {
    code: "Stade 03",
    name: "Nativement IA",
    description:
      "L'architecture tient et changer de modèle est une question de configuration. La question n'est plus « est-ce qu'on peut » — c'est quelle partie du travail vous déléguez.",
    go: "automatiser",
    goLabel: "Automatiser",
    common: false,
  },
];

export interface OpenSourceProject {
  name: string;
  what: string;
}

export const openSource: OpenSourceProject[] = [
  {
    name: "marathon",
    what: "Runner Zig exécutant des tâches d'agent dans des VM Firecracker isolées. L'isolation réelle, pas un conteneur avec de bonnes intentions.",
  },
  {
    name: "claudeswarm",
    what: "Orchestration du ticket à la pull request, avec des points de contrôle humains là où l'erreur coûte cher.",
  },
  {
    name: "atelier",
    what: "Studio Rust pilotant quatre agents de code derrière une seule interface.",
  },
  {
    name: "dojo.js · torii",
    what: "Maintenance de bibliothèques onchain utilisées par des équipes tierces en production.",
  },
];
