# Ligerian Labs — Site Marketing

Laboratoire d'innovation IA basé à Angers, Pays de la Loire.

## Stack

- **Astro** (hybrid SSR) — zero-JS par défaut, ultra rapide
- **Tailwind CSS** — styling utilitaire
- **Blog Markdown** — contenu dans `src/content/blog/`
- **Lead capture** — formulaire de contact → `leads/` (JSONL + fichiers individuels)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Pages

- `/` — Accueil (hero, pilliers, articles récents, CTA)
- `/a-propos` — À propos du lab
- `/blog` — Index des articles
- `/blog/<slug>` — Article individuel
- `/contact` — Formulaire de contact (lead capture)

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

## Leads

Les soumissions du formulaire de contact sont stockées dans :
- `leads/leads.jsonl` — un JSON par ligne (append-only)
- `leads/lead_<id>.json` — fichiers individuels

Les leads sont gitignorés. Pour un usage production, branchez un service email (Resend, Postmark) ou un CRM.

## Build & Deploy

```bash
npm run build
npm run preview
```

Deploy sur Vercel, Netlify, ou tout hébergeur supportant Astro SSR.
