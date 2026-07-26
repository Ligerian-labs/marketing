import { getCollection } from "astro:content";

export const prerender = true;

const site = "https://ligerianlabs.fr";
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/offres", priority: "0.95", changefreq: "monthly" },
  { path: "/approche", priority: "0.9", changefreq: "monthly" },
  { path: "/ia-angers", priority: "0.9", changefreq: "monthly" },
  { path: "/ia-angers-pme", priority: "0.9", changefreq: "monthly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/a-propos", priority: "0.7", changefreq: "monthly" },
  { path: "/formations", priority: "0.6", changefreq: "monthly" },
  { path: "/kit-presse", priority: "0.4", changefreq: "yearly" },
  { path: "/mentions-legales", priority: "0.2", changefreq: "yearly" },
];

function entry(url: string, lastmod: string, changefreq: string, priority: string) {
  return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const posts = await getCollection("blog");

  const urls = [
    ...staticPages.map((page) => entry(`${site}${page.path}`, today, page.changefreq, page.priority)),
    ...posts.map((post) => entry(`${site}/blog/${post.slug}`, post.data.date, "monthly", "0.7")),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}
