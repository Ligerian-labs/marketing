export interface Project {
  slug: string;
  name: string;
  summary: string;
  status: string;
  need: string;
  users: string;
  contribution: string;
  built: string[];
  decisions: string[];
  limits: string;
  diagram: { title: string; detail: string }[];
  sources: { label: string; href: string }[];
  service: { label: string; href: string };
}

// Public repository inspection, 2026-11-03. Pin the evidence rather than
// treating a README's roadmap as proof of shipped functionality.
export const projects: Project[] = [
  {
    slug: "contremaitre",
    name: "Contremaitre",
    summary: "Séparer les environnements de développement pour tester une branche sans partager sa base de données avec les autres.",
    status: "Projet indépendant, outil en développement",
    need: "Plusieurs versions d'un logiciel peuvent partager involontairement les mêmes données et ports. Une modification devient difficile à vérifier sans perturber les autres travaux.",
    users: "Équipes de développement travaillant sur plusieurs branches ou avec des agents de code.",
    contribution: "Développement d'un outil public sous l'organisation Ligerian Labs : configuration des services, environnements par espace de travail et commandes de vérification. Ce travail indépendant est présenté à partir du dépôt, sans attribution à un client.",
    built: [
      "Une interface en ligne de commande pour déployer et arrêter des environnements locaux.",
      "Une configuration des applications, bases PostgreSQL et volumes de fichiers associés à chaque environnement.",
      "Des commandes de vérification et un rapport local reliant résultats, journaux et liens de prévisualisation.",
    ],
    decisions: [
      "Conserver les données propres à chaque environnement au lieu de réutiliser une base partagée.",
      "Rendre explicites les copies de données et leur coût disque : une copie ne fusionne pas automatiquement avec la base d'origine.",
      "Distinguer un résultat de vérification actuel d'un résultat devenu ancien après une modification du code.",
    ],
    limits: "Le dépôt décrit un outil en développement et des prérequis de plateforme. Sa documentation contient encore des indications de support Linux contradictoires : vérifier le guide de la plateforme et la version avant tout essai. Nous n'avons pas exécuté cet outil pour cette présentation. Aucun résultat client, gain de temps ni niveau d'adoption n'est établi ici.",
    diagram: [
      { title: "Code de la branche", detail: "Un espace de travail identifié" },
      { title: "Environnement dédié", detail: "Application, données et fichiers séparés" },
      { title: "Vérification", detail: "Commandes, journaux et rapport local" },
    ],
    sources: [
      { label: "Dépôt public", href: "https://github.com/Ligerian-labs/contremaitre" },
      { label: "Fonctionnement et limites documentés", href: "https://github.com/Ligerian-labs/contremaitre/blob/3e24d49e6ff7551f293785922cec2379bb384479/README.md" },
      { label: "Vérification et limites de preuve", href: "https://github.com/Ligerian-labs/contremaitre/blob/3e24d49e6ff7551f293785922cec2379bb384479/docs/agent-workflow.md" },
    ],
    service: { label: "Développement logiciel sur mesure", href: "/developpement-logiciel-sur-mesure/" },
  },
  {
    slug: "assistant-export",
    name: "Assistant Export",
    summary: "Explorer un assistant documentaire pour les PME françaises qui préparent une démarche d'exportation.",
    status: "Projet indépendant, prototype initial non opérationnel",
    need: "Les formalités d'exportation se répartissent entre plusieurs documents. Le projet explore une interface pour poser une question et retrouver les sources utiles.",
    users: "PME françaises cherchant à comprendre des démarches d'exportation. Il s'agit du public visé, sans utilisateurs ni adoption vérifiés.",
    contribution: "Cadrage et socle de code publiés sous Ligerian Labs : interface de conversation, contrat d'API et architecture prévue. Le README cite une inspiration régionale ; cela n'établit ni commande, ni partenariat, ni validation par la Région.",
    built: [
      "Une interface HTML/CSS/JavaScript de conversation et un point d'entrée FastAPI.",
      "Un contrat de réponse avec message, sources et identifiant de session.",
      "Des modules préparés pour l'ingestion et la recherche documentaire, encore à implémenter à la version examinée.",
    ],
    decisions: [
      "Prévoir des sources dans le contrat de réponse pour permettre leur vérification par le lecteur.",
      "Séparer recherche documentaire, génération et interface dans l'architecture prévue.",
      "Commencer par un prototype ; évaluer la recherche, les erreurs et les coûts avant de proposer un usage métier.",
    ],
    limits: "À la version examinée, l'API renvoie un message d'attente et une liste de sources vide. La recherche documentaire et la génération sont marquées TODO. Le dépôt ne démontre donc pas un assistant fonctionnel, des réponses fiables, un déploiement ou des résultats clients. Aucun calendrier de réalisation ni résultat mesuré n'est publié ici.",
    diagram: [
      { title: "Interface", detail: "Socle de conversation présent" },
      { title: "API", detail: "Réponse d'attente, sources vides" },
      { title: "Recherche + IA", detail: "À implémenter et à évaluer" },
    ],
    sources: [
      { label: "Dépôt public", href: "https://github.com/Ligerian-labs/assistant-export" },
      { label: "Contrat et réponse actuelle de l'API", href: "https://github.com/Ligerian-labs/assistant-export/blob/1ed4f87ec173ebef2c74324372ffbdb81e69f71e/app/api/chat.py" },
      { label: "État du module de recherche", href: "https://github.com/Ligerian-labs/assistant-export/blob/1ed4f87ec173ebef2c74324372ffbdb81e69f71e/app/core/rag.py" },
      { label: "Architecture et intention du projet", href: "https://github.com/Ligerian-labs/assistant-export/blob/1ed4f87ec173ebef2c74324372ffbdb81e69f71e/README.md" },
    ],
    service: { label: "Intégration IA", href: "/integration-ia/" },
  },
];
