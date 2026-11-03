import { getCollection } from "astro:content";
import { execFileSync } from "node:child_process";
import { publicPages } from "../lib/seo-pages";
import { canonicalUrl } from "../../scripts/server/urls.mjs";

export const prerender = true;

function sourceDate(source: string) {
  try {
    const value = execFileSync("git", ["log", "-1", "--format=%cs", "--", source], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  } catch {
    // Archives and container builds may lack Git/history. Never substitute the
    // build clock for missing content-update evidence.
    return undefined;
  }
}

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await getCollection("blog");
  const pages = [
    ...publicPages.map((page) => ({ path: page.path, lastmod: sourceDate(page.source) })),
    ...posts.map((post) => ({ path: `/blog/${post.slug}/`, lastmod: (post.data.updated ?? post.data.date).slice(0, 10) })),
  ];
  const entries = pages.sort((a, b) => a.path.localeCompare(b.path)).map((page) =>
    `  <url><loc>${escapeXml(canonicalUrl(page.path))}</loc>${page.lastmod ? `<lastmod>${escapeXml(page.lastmod)}</lastmod>` : ""}</url>`,
  );
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
