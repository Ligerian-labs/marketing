# Ligerian Labs — site marketing

Développement logiciel et ingénierie IA à Angers, Pays de la Loire.
Le site tourne sur le système visuel **Cobalt Bold Blocks**.

## Offre confirmée le 4 novembre 2026

La création est proposée à **2 000 € par mois de construction**. Le périmètre initial,
la durée estimée et le budget cible sont précisés avant le démarrage. La reprise
d'un logiciel est chiffrée après diagnostic. L'hébergement et la maintenance
font l'objet d'un abonnement de suivi distinct sur devis. Aucun prix fixe de
maintenance ni traitement fiscal du montant n'est ajouté.

`src/data/project-offers.ts` porte les offres commerciales et la correspondance
entre les liens `?projet=creation|reprise|suivi|expertise` et les catégories du
contact. Le contrat partagé de `src/lib/contact.ts` conserve les catégories
existantes et ajoute `maintenance`. Le champ facultatif `currentTool` est limité
à 500 caractères, enregistré dans la demande et inclus dans la notification.
L'outil, le budget et le calendrier restent exclus de l'analytics.

Cette composition reprend les pages et projets de #97, le contact de #100 et
les conventions URL/analytics de #99, puis rapproche l'offre de #98. Elle conserve
le stockage canonique par demande et l'index dérivé de B plutôt que de remettre
l'ancien handler contact de #98. Les projets restent des prototypes indépendants.

## Stack

- **Astro** (SSR Node, pages publiques prérendues)
- **CSS** — design system maison dans `src/styles/cobalt.css` ; Tailwind reste
  chargé pour l'outillage utilitaire, mais les pages utilisent les classes `ll-*`
- **Blog Markdown** — contenu dans `src/content/blog/`
- **Lead capture** — formulaire de contact → `leads/` (JSONL + fichiers individuels)
- **Espace client** — SQLite (`better-sqlite3`), Stripe, Resend

## Getting started

```bash
npm ci --legacy-peer-deps --no-audit --no-fund
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Design system — Cobalt Bold Blocks

Une seule chromie, des filets 2px, aucun arrondi, aucun dégradé.

| Token | Valeur | Rôle |
| --- | --- | --- |
| `--cobalt` | `#1E2BE6` | accent unique : blocs, CTA, liens, chiffres |
| `--cream` | `#ECE8DF` | fond de page |
| `--ink` | `#0E0E0E` | texte et filets 2px |
| `--panel` | `#DED9CD` | encarts, bandeaux de section |
| `--ink-soft` | `#333333` | corps de texte sur crème |
| `--meta` | `#3A3A3A` | labels mono, méta |
| `--ink-invert` | `#A8A49B` | corps de texte sur ink |
| `--meta-invert` | `#A8A49B` | labels mono sur ink |

Typographie : **Unbounded** 700/800 (display, capitales), **Archivo** 400–700
(titres et corps), **Space Mono** 400/700 (labels, méta, chiffres).

Règles de composition :

- Conteneur `1320px`, gouttières `clamp(18px, 3vw, 40px)` → `.ll-wrap`.
- Chaque section est fermée par un filet `2px` pleine largeur → `.ll-sec`.
- Les grilles de cartes égales posent un fond ink avec `gap: 2px` → `.ll-grid`.
- Un seul bloc cobalt par écran. Jamais deux côte à côte.
- Chaque page publique se termine par le bandeau CTA → `<CtaBand />`.

Composants partagés : `Header`, `Footer`, `SectionBar`, `CtaBand`, `OfferGrid`,
`DiagnosticTable`, `ProofSection`, `ProjectOffers`. Les trois offres commerciales
vivent dans `src/data/project-offers.ts`. Les quatre expertises IA et le diagnostic
vivent dans `src/data/offers.ts`.

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Accueil : tarif de construction, création/reprise/suivi, services, prototypes et démarche |
| `/offres/` | Création à 2 000 € par mois de construction, reprise et suivi sur devis, FAQ budget |
| `/expertise/` | Les quatre expertises IA Voir, Livrer, Reconstruire et Automatiser |
| `/approche/` | Cadrage, construction, mise en service et suivi |
| `/developpement-logiciel-sur-mesure/`, `/integration-ia/` | Services, livrables, estimation et travaux indépendants |
| `/realisations/`, `/realisations/<projet>/` | Deux prototypes indépendants avec sources et limites |
| `/a-propos` | Le labo, le fondateur, le parcours, la stack |
| `/contact` | Formulaire (lead capture) |
| `/blog`, `/blog/<slug>` | Notes d'ingénierie |
| `/ia-angers`, `/ia-angers-pme` | Pages locales (fil d'Ariane + FAQ, JSON-LD) |
| `/kit-presse` | Logos, couleurs, typographie, textes et bios prêts à publier |
| `/mentions-legales` | Informations légales |
| `/formations`, `/dashboard`, `/auth/*` | Espace client |

Les pages publiques canoniques ont un slash final. `/services` et `/services/`
redirigent en 301 vers `/offres/`, avec les paramètres conservés.
Les anciens liens `/offres/#voir`, `#livrer`, `#reconstruire`, `#automatiser`
et `#cadrage` conservent leur destination ; les quatre premières ancres renvoient
vers le détail correspondant sur `/expertise/`.

## Marque

Les fichiers de marque sont servis depuis `public/brand/` :

- `brand/logo/` — lockups SVG et PNG, marque LL, favicons
- `brand/og/` — neuf visuels 1200 × 630, un par page
- `brand/valentin-dosimont.jpg` — portrait du fondateur

⚠️ Les SVG de logo contiennent du **texte vivant** et nécessitent la fonte
Unbounded. Avant impression ou envoi externe, vectorisez le texte ou utilisez
les PNG.

## Blog

Écrire des articles `.md` dans `src/content/blog/` :

```yaml
---
title: "Titre de l'article"
date: "2026-02-08"
excerpt: "Description courte pour l'index."
author: "Nom"
tags: ["ia", "outils"]
---
```

Le champ facultatif `updated` indique la date d'une modification significative du contenu.
Sans ce champ, le sitemap et le schéma conservent la date publiée ; une
normalisation de liens ne doit pas modifier ces dates.

Les tags pilotent la catégorie affichée sur les cartes et l'offre mise en avant
dans la colonne de l'article — voir `src/lib/blog.ts`.

## Leads

Le fichier individuel `leads/lead_<id>.json` est la source canonique : son
écriture complète précède la réponse HTTP 200. `leads/leads.jsonl` est un index
dérivé, alimenté au mieux ; un échec d'index est signalé sans rejeter la demande
déjà enregistrée.

Ces garanties s'appliquent après intégration de la branche contact B, qui doit
précéder cette branche C. Le [guide de stockage du contact](docs/contact-storage.md)
est maintenu avec le code de stockage ; il précise l'inspection, le comptage des
fichiers valides, la reconstruction à service arrêté et la limite à un processus serveur.

Les leads sont gitignorés. La notification email part via Resend ; sans
`RESEND_API_KEY`, le lead est quand même enregistré et un avertissement est logué.

## Build & deploy

```bash
npm run build
HOST=127.0.0.1 PORT=4327 npm start
```

`npm start` exécute `node scripts/server/entry.mjs`, également utilisé par le
Dockerfile. Cette entrée applique les redirections publiques avant le handler
standalone natif qui conserve les assets, le SSR et les sessions. Livrer `scripts/`
avec `dist/`. L'ancien démarrage direct `node dist/server/entry.mjs` et le preview
natif contournent les redirections des pages prérendues ; ne pas les utiliser pour
valider une release. `RESEND_API_KEY` et les clés Stripe doivent être retirées de
l'environnement des tests locaux.

Limite de développement vérifiée : `astro dev` retire les paramètres des
redirections de pages prérendues, même via `context.request.url`. Par exemple
`/ia-angers?x=1` devient `/ia-angers/`. L'entrée `npm start` conserve ces paramètres
et doit servir aux contrôles de release. Aucun correctif interne à Astro n'est
appliqué pour masquer cette différence.

```bash
npm run test:seo
# Même serveur isolé, port distinct pour une vérification indépendante :
SEO_TEST_PORT=4328 npm run test:seo
# Optionnel, si Playwright est installé hors de ce dépôt :
PLAYWRIGHT_MODULE=/absolute/path/to/@playwright/test node tests/seo-browser.mjs
```

Le test Node démarre l'entrée de production avec une base locale éphémère, retire
les clés email/Stripe puis nettoie son serveur et ses données. Le contrôle
navigateur utilise des contextes isolés à 1440/390 px et bloque toute requête
analytics externe. `CHROMIUM_EXECUTABLE` peut désigner un Chromium fourni par
l'hôte. Aucun lint/typecheck n'est configuré dans le dépôt ; ne pas les annoncer
comme exécutés. Les tests analytics vérifient le bootstrap et son filtre avec un
SDK simulé, sans envoyer de données à PostHog.

Contrôle réseau statique facultatif, avec `npm start` déjà lancé :

```bash
curl --head http://127.0.0.1:4327/ingest/static/array.js
curl --fail --silent --show-error --output /dev/null http://127.0.0.1:4327/ingest/static/array.js
```

Ces deux lectures GET/HEAD passent par l'entrée de production vers le fichier
JavaScript public. Elles n'exécutent pas le SDK et n'envoient ni capture, ni
soumission, ni donnée personnelle. Les chemins `/static/` et `/array/` vont vers
`eu-assets.i.posthog.com`, les événements vers `eu.i.posthog.com`, conformément à
la [documentation du proxy PostHog](https://posthog.com/docs/advanced/proxy/nextjs-middleware).

Le [dossier marketing](docs/marketing/README.md) conserve le point de départ
daté, les faits à confirmer, les permissions externes et le plan des 90 jours.

Après intégration de la branche contact B, ses tests se lancent après le build :

```bash
node --test tests/contact.test.ts tests/contact-client.test.ts tests/contact-http.test.ts
CONTACT_PLAYWRIGHT=/absolute/path/to/node_modules/@playwright/test node --test tests/contact-browser.test.ts
CONTACT_PLAYWRIGHT=/absolute/path/to/node_modules/@playwright/test node --test tests/ui-coherence-browser.test.ts
```

Ils demandent Node 24 ou 22.18+. Le test HTTP utilise un port éphémère, un dossier
temporaire sans clé Resend et nettoie ses leads. Le test navigateur est **ignoré**
si Playwright n'est pas disponible ; un test ignoré n'est pas un succès. Il bloque
les requêtes hors du serveur local, y compris `/ingest` et les polices.
`CONTACT_LEADS_DIR` choisit le dossier des leads, `./leads` par défaut. La
notification email n'est envoyée que si `RESEND_API_KEY` est définie. Ces fichiers
contact appartiennent à B et ne sont pas présents dans le candidat C seul.

Le contrôle de cohérence UI exige Playwright et échoue si le module manque. Il
vérifie le filtrage de tous les articles, le compteur annoncé, les états des
filtres, les liens de contact contextualisés et les boutons de 320 à 1 440 px.
Il couvre aussi les encarts du kit presse et le défilement au clavier des
tableaux Markdown sur petit écran.

Le dossier `public/brand/` doit être déployé à la racine du site : les balises
`og:image` et les téléchargements du kit presse pointent vers `/brand/…`.
