# The Lab — Marketing Website

AI-driven innovation lab. Empowering local actors through artificial intelligence.

## Stack

- **Astro** — zero-JS by default, blazing fast
- **Tailwind CSS** — utility-first styling
- **Markdown blog** — content in `src/content/blog/`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Blog

Write posts as `.md` files in `src/content/blog/`. Frontmatter:

```yaml
---
title: "Your Post Title"
date: "2026-02-08"
excerpt: "Short description for the blog index."
author: "Author Name"
tags: ["ai", "tools"]
---
```

Posts are automatically listed on `/blog` and rendered at `/blog/<slug>`.

## Build & Deploy

```bash
npm run build    # outputs to dist/
npm run preview  # preview the build locally
```

Deploy `dist/` anywhere — Vercel, Netlify, Cloudflare Pages, or any static host.
