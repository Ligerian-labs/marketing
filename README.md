# Ligerian Labs — site marketing

Laboratoire d'ingénierie IA basé à Angers, Pays de la Loire.
Le site tourne sur le système visuel **Cobalt Bold Blocks**.

## Stack

- **Astro** (SSR Node, pages publiques prérendues)
- **CSS** — design system maison dans `src/styles/cobalt.css` ; Tailwind reste
  chargé pour l'outillage utilitaire, mais les pages utilisent les classes `ll-*`
- **Blog Markdown** — contenu dans `src/content/blog/`
- **Lead capture** — formulaire de contact → `leads/` (JSONL + fichiers individuels)
- **Espace client** — SQLite (`better-sqlite3`), Stripe, Resend

## Getting started

```bash
npm install
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
| `--meta-invert` | `#6E6A62` | labels mono sur ink |

Typographie : **Unbounded** 700/800 (display, capitales), **Archivo** 400–700
(titres et corps), **Space Mono** 400/700 (labels, méta, chiffres).

Règles de composition :

- Conteneur `1320px`, gouttières `clamp(18px, 3vw, 40px)` → `.ll-wrap`.
- Chaque section est fermée par un filet `2px` pleine largeur → `.ll-sec`.
- Les grilles de cartes égales posent un fond ink avec `gap: 2px` → `.ll-grid`.
- Un seul bloc cobalt par écran. Jamais deux côte à côte.
- Chaque page publique se termine par le bandeau CTA → `<CtaBand />`.

Composants partagés : `Header`, `Footer`, `SectionBar`, `CtaBand`, `OfferGrid`,
`DiagnosticTable`, `ProofSection`. Les quatre offres et le diagnostic en quatre
stades vivent dans `src/data/offers.ts` — une seule source de vérité.

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Accueil : hero, quatre questions, offres, diagnostic, preuve, ancrage, blog |
| `/offres` | Les quatre offres (Voir, Livrer, Reconstruire, Automatiser) + formats d'engagement |
| `/approche` | Diagnostic, méthode en quatre temps, cinq principes |
| `/a-propos` | Le labo, le fondateur, le parcours, la stack |
| `/contact` | Formulaire (lead capture) |
| `/blog`, `/blog/<slug>` | Notes d'ingénierie |
| `/ia-angers`, `/ia-angers-pme` | Pages locales (fil d'Ariane + FAQ, JSON-LD) |
| `/kit-presse` | Logos, couleurs, typographie, textes et bios prêts à publier |
| `/mentions-legales` | Informations légales |
| `/formations`, `/dashboard`, `/auth/*` | Espace client |

`/services` redirige en 301 vers `/offres`.

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

Les tags pilotent la catégorie affichée sur les cartes et l'offre mise en avant
dans la colonne de l'article — voir `src/lib/blog.ts`.

## Leads

Les soumissions du formulaire de contact sont stockées dans :

- `leads/leads.jsonl` — un JSON par ligne (append-only)
- `leads/lead_<id>.json` — fichiers individuels

Les leads sont gitignorés. La notification email part via Resend ; sans
`RESEND_API_KEY`, le lead est quand même enregistré et un avertissement est logué.

## Build & deploy

```bash
npm run build
npm run preview
```

Le dossier `public/brand/` doit être déployé à la racine du site : les balises
`og:image` et les téléchargements du kit presse pointent vers `/brand/…`.
