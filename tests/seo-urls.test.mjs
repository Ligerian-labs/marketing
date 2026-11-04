import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { canonicalSchema, canonicalUrl, publicRedirect } from "../scripts/server/urls.mjs";

test("public redirects preserve methods and cannot normalize private endpoints", () => {
  const paths = new Set(["/offres/", "/api/stripe/webhook/", "/auth/connexion/", "/ingest/flags/"]);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(publicRedirect(new URL("https://ligerianlabs.fr/offres?x=1"), method, paths), null);
  }
  for (const path of ["/api/stripe/webhook", "/auth/connexion", "/ingest/flags"]) {
    assert.equal(publicRedirect(new URL(`https://ligerianlabs.fr${path}?token=private`), "GET", paths), null);
  }
  assert.equal(canonicalUrl("/offres"), "https://ligerianlabs.fr/offres/");
  assert.equal(publicRedirect(new URL("https://ligerianlabs.fr/offres?x=1&x=2"), "GET", paths), "/offres/?x=1&x=2");
});

test("schema normalization keeps assets, external identity URLs and fragment connections", () => {
  const result = canonicalSchema({
    "@id": "https://ligerianlabs.fr/contact#page",
    logo: "https://ligerianlabs.fr/brand/logo.svg",
    sameAs: "https://github.com/Ligerian-labs",
    provider: { "@id": "https://ligerianlabs.fr/#business" },
  });
  assert.equal(result["@id"], "https://ligerianlabs.fr/contact/#page");
  assert.equal(result.logo, "https://ligerianlabs.fr/brand/logo.svg");
  assert.equal(result.sameAs, "https://github.com/Ligerian-labs");
  assert.equal(result.provider["@id"], "https://ligerianlabs.fr/#business");
});

test("C-owned public URL literals use slash paths before queries and fragments", () => {
  const owned = [
    "src/layouts/BlogPost.astro", "src/pages/404.astro", "src/pages/[...slug].astro",
    "src/pages/approche.astro", "src/pages/ia-angers-pme.astro", "src/pages/kit-presse.astro",
    "src/pages/mentions-legales.astro", "src/pages/blog/index.astro", "src/pages/formations/index.astro",
    "src/pages/formations/[tier]/index.astro", "src/pages/formations/[tier]/[chapter].astro",
    "src/pages/dashboard/index.astro", "src/pages/auth/connexion.astro",
  ];
  for (const file of owned) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/href=(?:["']|\{`)(\/[^"'`]*)(?:["'`])/g)) {
      const path = match[1].split(/[?#]/)[0];
      if (/^\/(?:api|auth|dashboard|brand)(?:\/|$)/.test(path) || /\.[^/]+$/.test(path)) continue;
      assert.ok(path.endsWith("/"), `${file}: ${match[1]}`);
    }
  }
});
