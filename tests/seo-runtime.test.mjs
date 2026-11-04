import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import vm from "node:vm";

const port = process.env.SEO_TEST_PORT || "4327";
const origin = `http://127.0.0.1:${port}`;
let server, scratch, output = "";
before(async () => {
  scratch = await mkdtemp(`${tmpdir()}/marketing-seo-`);
  const env = { ...process.env, HOST: "127.0.0.1", PORT: port };
  for (const key of Object.keys(env)) if (/STRIPE|RESEND/.test(key)) delete env[key];
  // Execute the unchanged package start command, in isolated runtime data.
  await writeFile(`${scratch}/package.json`, await readFile("package.json"));
  await symlink(resolve("scripts"), `${scratch}/scripts`, "dir");
  await symlink(resolve("dist"), `${scratch}/dist`, "dir");
  server = spawn("npm", ["start"], { cwd: scratch, env, detached: true });
  server.stdout.on("data", (chunk) => output += chunk);
  server.stderr.on("data", (chunk) => output += chunk);
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(origin)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${output}`);
});
after(async () => {
  if (server && server.exitCode === null) {
    process.kill(-server.pid, "SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  if (scratch) await rm(scratch, { recursive: true, force: true });
});
const request = (path, init) => fetch(origin + path, { redirect: "manual", ...init });

test("Docker deploys the same production entry exercised through npm start", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  const docker = await readFile("Dockerfile", "utf8");
  const cmd = JSON.parse(docker.match(/^CMD (\[.*\])$/m)[1]);
  assert.deepEqual(cmd.map((value) => value.replace(/^\.\//, "")), manifest.scripts.start.split(/\s+/));
  assert.match(docker, /COPY --from=build \/app\/scripts \.\/scripts/);
});

test("public alternatives redirect permanently, retaining queries", async () => {
  for (const [from, to] of [
    ["/ia-angers?ref=test%40example.invalid&x=1&x=2", "/ia-angers/?ref=test%40example.invalid&x=1&x=2"],
    ["/services?source=old", "/offres/?source=old"],
    ["/services/?source=old", "/offres/?source=old"],
    ["/blog/welcome-to-the-lab", "/blog/welcome-to-the-lab/"],
    ["/formations", "/formations/"],
    ["/ia-angers/index.html?x=1", "/ia-angers/?x=1"],
  ]) {
    for (const method of ["GET", "HEAD"]) {
      const res = await request(from, { method });
      assert.equal(res.status, 301, `${method} ${from}`);
      assert.equal(res.headers.get("location"), to, from);
    }
  }
});

test("API, assets, unknown pages and private routes bypass page redirects", async () => {
  for (const path of ["/api/contact", "/api/stripe/webhook", "/api/auth/logout", "/ingest/flags", "/unknown-page", "/brand/logo.svg", "/robots.txt", "/sitemap.xml"]) {
    // OPTIONS avoids contacting the external analytics proxy or changing state.
    const res = await request(path, { method: path.startsWith("/api/") || path.startsWith("/ingest/") ? "OPTIONS" : "GET" });
    assert.ok(![301, 308].includes(res.status), `${path}: ${res.status}`);
  }
  const auth = await request("/auth/connexion?redirect=%2Fformations%2F");
  assert.equal(auth.status, 200);
  assert.match(await auth.text(), /noindex/);
  const stripe = await request("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: origin }, body: "pack=not-a-pack" });
  assert.ok(![301, 308].includes(stripe.status));
  assert.equal(stripe.status, 302);
  assert.equal(stripe.headers.get("location"), "/formations/?error=invalid_pack");
  const post = await request("/ia-angers", { method: "POST" });
  assert.ok(![301, 308].includes(post.status), "page normalization must not redirect POST");
});

test("sitemap lists existing canonical indexable HTML with truthful dates", async () => {
  const res = await request("/sitemap.xml");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /xml/);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  assert.ok(urls.length >= 56);
  const locations = urls.map((item) => item.match(/<loc>(.*?)<\/loc>/)[1]);
  assert.equal(new Set(locations).size, locations.length);
  assert.ok(locations.includes("https://ligerianlabs.fr/ia-angers-pme/"));
  assert.ok(!locations.some((url) => /\/(auth|dashboard|api|services)\//.test(url)));
  for (const entry of urls) {
    const loc = entry.match(/<loc>(.*?)<\/loc>/)[1];
    const url = new URL(loc);
    assert.equal(url.origin, "https://ligerianlabs.fr");
    assert.ok(url.pathname.endsWith("/"), loc);
    assert.equal(url.search + url.hash, "");
    const response = await request(url.pathname);
    assert.equal(response.status, 200, loc);
    const html = await response.text();
    assert.match(html, new RegExp(`<link rel="canonical" href="${loc}"`), loc);
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html), loc);
    if (entry.includes("<lastmod>")) assert.match(entry, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    let articleDate, articlePublished;
    if (url.pathname.startsWith("/blog/") && url.pathname !== "/blog/") {
      const source = await readFile(`src/content/blog/${decodeURIComponent(url.pathname.slice(6, -1))}.md`, "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      articlePublished = frontmatter.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)[1];
      articleDate = frontmatter.match(/^updated:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] ?? articlePublished;
      assert.ok(entry.includes(`<lastmod>${articleDate}</lastmod>`), "article date must be authored, unaffected by mechanical Git edits");
    }
    if (!url.pathname.startsWith("/blog/")) {
      const basename = url.pathname === "/" ? "index" : url.pathname.slice(1, -1);
      const source = [`src/pages/${basename}.astro`, `src/pages/${basename}/index.astro`].find(existsSync);
      if (source) {
        const expectedDate = execFileSync("git", ["log", "-1", "--format=%cs", "--", source], { encoding: "utf8" }).trim();
        if (expectedDate) assert.ok(entry.includes(`<lastmod>${expectedDate}</lastmod>`), `${source} lastmod must equal source history`);
      }
    }
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    if (articleDate) {
      const article = schemas.flatMap((schema) => schema["@graph"] || [schema]).find((item) => item["@type"] === "BlogPosting");
      assert.ok(article.dateModified.startsWith(articleDate));
      assert.ok(article.datePublished.startsWith(articlePublished));
    }
    const checkSchema = (value) => {
      if (Array.isArray(value)) return value.forEach(checkSchema);
      if (value && typeof value === "object") {
        assert.ok(!("parentOrganization" in value), "no unverified parent company assertion");
        return Object.values(value).forEach(checkSchema);
      }
      if (typeof value === "string" && value.startsWith("https://ligerianlabs.fr/")) {
        const linked = new URL(value);
        if (locations.includes(`https://ligerianlabs.fr${linked.pathname.replace(/\/*$/, "/")}`)) assert.ok(linked.pathname.endsWith("/"), `schema URL ${value}`);
      }
    };
    schemas.forEach(checkSchema);
    if (url.pathname.startsWith("/blog/") && url.pathname !== "/blog/") {
      const article = html.match(/<article\b[\s\S]*?<\/article>/)?.[0];
      assert.ok(article, loc);
      for (const match of article.matchAll(/href="([^"]+)"/g)) {
        const linked = new URL(match[1], loc);
        if (locations.includes(`https://ligerianlabs.fr${linked.pathname.replace(/\/*$/, "/")}`) && linked.origin === "https://ligerianlabs.fr") {
          assert.ok(linked.pathname.endsWith("/"), `article link ${match[1]} in ${loc}`);
        }
      }
    }
  }
  // These dates come from committed page history, not today's build clock.
  assert.ok(!urls.every((entry) => entry.includes(new Date().toISOString().slice(0, 10))));
});

test("HTML canonical, social URL, shared schema and offer anchors agree", async () => {
  const html = await (await request("/ia-angers-pme/?email=private%40example.invalid")).text();
  assert.match(html, /rel="canonical" href="https:\/\/ligerianlabs.fr\/ia-angers-pme\/"/);
  assert.match(html, /property="og:url" content="https:\/\/ligerianlabs.fr\/ia-angers-pme\/"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const graph = schemas.flatMap((s) => s["@graph"] || [s]);
  assert.ok(graph.some((item) => item["@id"] === "https://ligerianlabs.fr/#organization"));
  assert.ok(graph.some((item) => item["@id"] === "https://ligerianlabs.fr/#business"));
  for (const item of graph) {
    assert.ok(!("foundingDate" in item));
    assert.ok(!("geo" in item));
    assert.ok(!("priceRange" in item));
  }
  for (const id of ["voir", "livrer", "reconstruire", "automatiser"]) {
    assert.match(await (await request("/offres/")).text(), new RegExp(`id="${id}"`));
  }
});

function analyticsHarness(html, { hostname = "ligerianlabs.fr", pathname = "/offres/", optOut = false, search = "?email=private@example.invalid", referrer = "", storage = new Map() } = {}) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = scripts.find((s) => s.includes("posthog.init"));
  assert.ok(code, "analytics bootstrap must be present");
  const listeners = {}, inserted = [];
  const window = { location: { hostname, pathname, origin: `https://${hostname}`, search }, localStorage: { getItem: () => optOut ? "1" : null }, sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
  const document = { referrer, addEventListener: (name, callback) => listeners[name] = callback, createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => inserted.push(node) } }] };
  const context = { window, document, URL, URLSearchParams, location: window.location, navigator: { webdriver: false }, localStorage: window.localStorage };
  Object.defineProperty(context, "posthog", { get: () => window.posthog });
  vm.runInNewContext(code, context);
  return { window, listeners, inserted, storage };
}

test("analytics never initializes on local/internal hosts or opted-out browsers", async () => {
  const html = await (await request("/offres/")).text();
  for (const hostname of ["localhost", "127.0.0.1", "preview.example.invalid", "ligerianlabs.fr.evil.invalid"]) {
    const result = analyticsHarness(html, { hostname });
    assert.equal(result.window.posthog, undefined, hostname);
    assert.equal(result.inserted.length, 0);
  }
  assert.equal(analyticsHarness(html, { optOut: true }).window.posthog, undefined);
  assert.equal(analyticsHarness(html, { pathname: "/uncategorised/" }).window.posthog, undefined);
  assert.equal(analyticsHarness(html, { pathname: "/realisations/unknown/" }).window.posthog, undefined);
  assert.equal(analyticsHarness(html, { pathname: "/blog/unpublished-private/" }).window.posthog, undefined);
  const privateHtml = await (await request("/auth/connexion?token=private")).text();
  assert.ok(!privateHtml.includes("posthog.init"), "no analytics on private/noindex pages");
});

test("analytics configuration and click properties cannot transmit personal contents", async () => {
  const html = await (await request("/offres/")).text();
  const { window, listeners } = analyticsHarness(html);
  const config = window.posthog._i[0][1];
  assert.equal(config.autocapture, false);
  assert.equal(config.capture_pageview, false);
  assert.equal(config.capture_pageleave, false);
  assert.equal(config.disable_session_recording, true);
  assert.equal(config.person_profiles, "never");
  assert.equal(config.persistence, "memory", "no persistent cross-visit visitor identifier");
  assert.equal(typeof config.before_send, "function");
  const output = config.before_send({ event: "service_enquiry_click", properties: { page: "offres", $current_url: "https://ligerianlabs.fr/?email=private", $referrer: "https://example.invalid/private", email: "private", message: "private" } });
  assert.ok(output);
  assert.ok(!JSON.stringify(output).includes("private"));
  assert.equal(config.before_send({ event: "unknown", properties: {} }), null);
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  for (const key of ["distinct_id", "$device_id", "$session_id", "$window_id"]) {
    assert.equal(config.before_send({ event: "$pageview", properties: { [key]: uuid } }).properties[key], uuid);
    assert.equal(config.before_send({ event: "$pageview", properties: { [key]: "private@example.invalid" } }).properties[key], undefined);
  }
  for (const project_type of ["new-application", "existing-software", "ai-integration", "other"]) {
    const event = config.before_send({ event: "contact_form_submitted", properties: { project_type, email: "private", description: "private" } });
    assert.equal(event.properties.project_type, project_type);
    assert.ok(!JSON.stringify(event).includes("private"));
  }
  assert.equal(config.before_send({ event: "contact_form_submitted", properties: { project_type: "private contents" } }).properties.project_type, undefined);
  const forgedProperties = config.before_send({ event: "$pageview", properties: { page_id: "/private/alice/", landing_page_id: "/private/alice/", channel: "private" } }).properties;
  assert.equal(forgedProperties.page_id, "/offres/");
  assert.equal(forgedProperties.landing_page_id, "/offres/");
  assert.equal(forgedProperties.channel, "direct");
  const captured = [];
  window.posthog.capture = (...args) => captured.push(args);
  const click = (href) => listeners.click({ target: { closest: () => ({ getAttribute: () => href }) } });
  click("mailto:someone@example.invalid?body=private");
  click("/contact/?message=private#private");
  click("https://other.example.invalid/contact/");
  assert.equal(captured.length, 2);
  assert.equal(captured[0][0], "email_contact_click");
  assert.equal(captured[1][0], "service_enquiry_click");
  assert.ok(!JSON.stringify(captured).includes("private"));
  window.posthog.capture = () => { throw new Error("analytics unavailable"); };
  assert.doesNotThrow(() => click("/contact/"));
});

test("public page IDs and first-touch channels survive navigation without storing identifiers", async () => {
  const html = await (await request("/offres/")).text();
  for (const [options, expected] of [
    [{ search: "?utm_source=google_maps&email=private" }, "maps"],
    [{ referrer: "https://www.google.fr/search?q=private" }, "organic"],
    [{ referrer: "https://partner.example.invalid/private" }, "referral"],
    [{ referrer: "https://www.linkedin.com/private" }, "social"],
    [{ search: "?utm_source=private&message=private" }, "campaign"],
    [{ search: "?email=private" }, "direct"],
  ]) {
    const storage = new Map();
    const first = analyticsHarness(html, { ...options, storage });
    const event = first.window.posthog._i[0][1].before_send({ event: "$pageview", properties: {} });
    assert.equal(event.properties.page_id, "/offres/");
    assert.equal(event.properties.landing_page_id, "/offres/");
    assert.equal(event.properties.channel, expected);
    assert.ok(!JSON.stringify([...storage]).includes("private"));
    const next = analyticsHarness(html, { pathname: "/contact/", search: "", storage });
    const accepted = next.window.posthog._i[0][1].before_send({ event: "contact_form_submitted", properties: { project_type: "ai-integration" } });
    assert.equal(accepted.properties.page_id, "/contact/");
    assert.equal(accepted.properties.landing_page_id, "/offres/");
    assert.equal(accepted.properties.channel, expected);
    assert.deepEqual(Object.keys(JSON.parse(storage.get("ll_analytics_context"))).sort(), ["channel", "landing_page_id"]);
  }
  const firstPost = "/blog/welcome-to-the-lab/";
  const secondPost = "/blog/combien-coute-ia-pour-pme/";
  for (const path of [firstPost, secondPost]) {
    const h = analyticsHarness(html, { pathname: path });
    assert.equal(h.window.posthog._i[0][1].before_send({ event: "$pageview", properties: {} }).properties.page_id, path);
    const captured = [];
    h.window.posthog.capture = (...args) => captured.push(args);
    h.listeners.click({ target: { closest: () => ({ getAttribute: () => "/contact/" }) } });
    assert.equal(captured.length, 0, "blog clicks are not service enquiry clicks");
  }
  const forged = new Map([["ll_analytics_context", JSON.stringify({ landing_page_id: "/private/alice/", channel: "private" })]]);
  const cleaned = analyticsHarness(html, { storage: forged });
  assert.ok(!JSON.stringify([...cleaned.storage]).includes("private"));
  // Forge one field at a time, so either missing validator causes failure.
  for (const stored of [
    { landing_page_id: "/private/alice/", channel: "organic" },
    { landing_page_id: "/offres/", channel: "private" },
  ]) {
    const storage = new Map([["ll_analytics_context", JSON.stringify(stored)]]);
    const h = analyticsHarness(html, { storage });
    const event = h.window.posthog._i[0][1].before_send({ event: "$pageview", properties: {} });
    assert.equal(event.properties.landing_page_id, "/offres/");
    assert.equal(event.properties.channel, "direct");
    assert.ok(!JSON.stringify([...storage]).includes("private"));
  }
  const extra = new Map([["ll_analytics_context", JSON.stringify({ landing_page_id: "/offres/", channel: "organic", visitor_id: "private" })]]);
  assert.ok(!JSON.stringify([...analyticsHarness(html, { storage: extra }).storage]).includes("private"));
});
