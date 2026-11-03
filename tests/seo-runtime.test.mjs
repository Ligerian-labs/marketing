import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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
  server = spawn(process.execPath, [resolve("scripts/server/entry.mjs")], { cwd: scratch, env });
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
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  if (scratch) await rm(scratch, { recursive: true, force: true });
});
const request = (path, init) => fetch(origin + path, { redirect: "manual", ...init });

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
  const stripe = await request("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "pack=not-a-pack" });
  assert.ok(![301, 308].includes(stripe.status));
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

function analyticsHarness(html, { hostname = "ligerianlabs.fr", pathname = "/offres/", optOut = false } = {}) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = scripts.find((s) => s.includes("posthog.init"));
  assert.ok(code, "analytics bootstrap must be present");
  const listeners = {}, inserted = [];
  const window = { location: { hostname, pathname, origin: `https://${hostname}`, search: "?email=private@example.invalid" }, localStorage: { getItem: () => optOut ? "1" : null } };
  const document = { addEventListener: (name, callback) => listeners[name] = callback, createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => inserted.push(node) } }] };
  const context = { window, document, URL, location: window.location, navigator: { webdriver: false }, localStorage: window.localStorage };
  Object.defineProperty(context, "posthog", { get: () => window.posthog });
  vm.runInNewContext(code, context);
  return { window, listeners, inserted };
}

test("analytics never initializes on local/internal hosts or opted-out browsers", async () => {
  const html = await (await request("/offres/")).text();
  for (const hostname of ["localhost", "127.0.0.1", "preview.example.invalid", "ligerianlabs.fr.evil.invalid"]) {
    const result = analyticsHarness(html, { hostname });
    assert.equal(result.window.posthog, undefined, hostname);
    assert.equal(result.inserted.length, 0);
  }
  assert.equal(analyticsHarness(html, { optOut: true }).window.posthog, undefined);
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
  assert.equal(typeof config.before_send, "function");
  const output = config.before_send({ event: "service_enquiry_click", properties: { page: "offres", $current_url: "https://ligerianlabs.fr/?email=private", $referrer: "https://example.invalid/private", email: "private", message: "private" } });
  assert.ok(output);
  assert.ok(!JSON.stringify(output).includes("private"));
  assert.equal(config.before_send({ event: "unknown", properties: {} }), null);
  for (const project_type of ["new-application", "existing-software", "ai-integration", "other"]) {
    const event = config.before_send({ event: "contact_form_submitted", properties: { project_type, email: "private", description: "private" } });
    assert.equal(event.properties.project_type, project_type);
    assert.ok(!JSON.stringify(event).includes("private"));
  }
  assert.equal(config.before_send({ event: "contact_form_submitted", properties: { project_type: "private contents" } }).properties.project_type, undefined);
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
