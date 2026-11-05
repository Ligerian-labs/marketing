import type { ProjectType } from "../lib/contact.ts";

// Public offer links keep PR #98's French slugs. The API retains the contact
// contract's existing category IDs and adds maintenance as an optional path.
const OFFER_PROJECT_TYPES: Record<string, ProjectType> = {
  creation: "new-application",
  reprise: "existing-software",
  suivi: "maintenance",
  expertise: "ai-integration",
};

export function projectTypeForOffer(offer: string | null): ProjectType | null {
  return offer && Object.hasOwn(OFFER_PROJECT_TYPES, offer) ? OFFER_PROJECT_TYPES[offer] : null;
}

export const projectOffers = [
  {
    slug: "creation",
    step: "Point de départ 01",
    name: "Créer votre logiciel",
    price: "2 000 €",
    period: "par mois de construction",
    description: "Un outil métier, un espace client ou une première version de votre application. Nous définissons les priorités et construisons une version que vous pouvez utiliser.",
    features: [
      "Un périmètre initial, une durée estimée et un budget cible définis avant de démarrer.",
      "Des versions intermédiaires à tester et des jalons de validation partagés.",
      "La mise en production et la documentation du fonctionnement du logiciel.",
    ],
    note: "La mensualité couvre la phase de construction convenue. Toute extension du périmètre est discutée avec vous avant de poursuivre.",
    cta: "Décrire mon projet",
  },
  {
    slug: "reprise",
    step: "Point de départ 02",
    name: "Reprendre votre existant",
    price: "Sur devis",
    period: "après diagnostic",
    description: "Votre logiciel doit évoluer ou changer de prestataire ? Nous examinons son code et son fonctionnement pour conserver ce qui répond à vos besoins.",
    features: [
      "Un examen du code, des données, de l'hébergement et des difficultés rencontrées.",
      "Une proposition pour corriger, faire évoluer ou reconstruire les parties nécessaires.",
      "Un périmètre, un budget et les étapes de transition annoncés avant les travaux.",
    ],
    note: "Si une reconstruction est retenue, nous proposons une phase de construction à 2 000 € par mois. La décision dépend du diagnostic, pas du nombre de lignes de code.",
    cta: "Faire reprendre mon logiciel",
  },
  {
    slug: "suivi",
    step: "Après la livraison",
    name: "Faire fonctionner votre logiciel",
    price: "Sur devis",
    period: "abonnement mensuel de suivi",
    description: "Après la construction, un abonnement de suivi distinct prend le relais. Son montant dépend de l'hébergement, de l'usage et du niveau de suivi nécessaire.",
    features: [
      "Hébergement, surveillance et sauvegardes selon les ressources convenues.",
      "Maintenance corrective et mises à jour dans le périmètre défini.",
      "Une enveloppe d'évolutions précisée dans la proposition. Les ajouts importants sont chiffrés séparément.",
    ],
    note: "Le tarif de suivi, les services inclus et les coûts des services externes sont précisés avant le démarrage du projet. Un logiciel existant peut aussi être pris en charge après diagnostic.",
    cta: "Parler du suivi de mon logiciel",
  },
] as const;
