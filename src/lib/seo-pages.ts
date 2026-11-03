// Resolve source routes at build time. Dynamic blog routes come from the
// content collection; private/dynamic/error/redirect pages are excluded.
const sources = import.meta.glob("../pages/**/*.astro", { eager: true, query: "?raw", import: "default" });

export const publicPages = Object.entries(sources).flatMap(([source, contents]) => {
  const name = source.replace("../pages/", "").replace(/\.astro$/, "");
  if (/[\[\]]/.test(name) || /^(?:auth|dashboard)(?:\/|$)/.test(name) || ["404", "500", "services"].includes(name)) return [];
  if (/robots\s*=\s*["'][^"']*noindex/.test(String(contents))) return [];
  const path = "/" + name.replace(/(?:^|\/)index$/, "");
  return [{ path: path.endsWith("/") ? path : `${path}/`, source: `src/pages/${name}.astro` }];
});

export const publicPaths = new Set(publicPages.map((page) => page.path));
