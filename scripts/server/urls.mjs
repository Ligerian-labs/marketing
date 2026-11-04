export const SITE = "https://ligerianlabs.fr";

export function pagePath(path) {
  return path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`;
}

export function canonicalUrl(path) {
  return new URL(pagePath(path), SITE).href;
}

/** Restrict redirects to the actual public inventory, never endpoint prefixes. */
export function publicRedirect(url, method, publicPaths) {
  if (!["GET", "HEAD"].includes(method)) return null;
  if (/^\/(?:api|auth|dashboard|ingest|_astro|_image)(?:\/|$)/.test(url.pathname)) return null;
  if (/^\/services\/?$/.test(url.pathname)) return `/offres/${url.search}`;
  const path = pagePath(url.pathname.replace(/\/index\.html$/, ""));
  if (publicPaths.has(path) && url.pathname !== path) return path + url.search;
  return null;
}

/** Page schema shares the public URL convention, including fragment IDs. */
export function canonicalSchema(value) {
  if (Array.isArray(value)) return value.map(canonicalSchema);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonicalSchema(item)]));
  }
  if (typeof value === "string" && value.startsWith(SITE + "/")) {
    const url = new URL(value);
    if (!/\.[^/]+$/.test(url.pathname) && !/^\/(api|auth|dashboard|ingest)(\/|$)/.test(url.pathname)) {
      url.pathname = pagePath(url.pathname);
      return url.href;
    }
  }
  return value;
}
