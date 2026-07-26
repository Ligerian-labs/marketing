export const prerender = true;

const site = "https://ligerianlabs.fr";

// Private areas are already `noindex`, but keep crawlers out of them entirely:
// they are behind auth and produce nothing useful in an index.
const disallow = ["/auth/", "/dashboard/", "/api/", "/ingest/"];

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    ...disallow.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${site}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
