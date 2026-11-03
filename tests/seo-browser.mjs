import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

// Optional host-provided browser tooling; no repository dependency is needed.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "@playwright/test");
const origin = `http://127.0.0.1:${process.env.SEO_TEST_PORT || "4327"}`;
const scratch = await mkdtemp(`${tmpdir()}/marketing-seo-browser-`);
const env = { ...process.env, HOST: "127.0.0.1", PORT: process.env.SEO_TEST_PORT || "4327" };
for (const key of Object.keys(env)) if (/STRIPE|RESEND/.test(key)) delete env[key];
const server = spawn(process.execPath, [resolve("scripts/server/entry.mjs")], { cwd: scratch, env });
let browser, log = "", assertions = 0;
server.stderr.on("data", (chunk) => log += chunk);
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(log);
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const analyticsRequests = [];
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/ingest") || url.includes("posthog")) analyticsRequests.push(url);
      if (!url.startsWith(origin + "/") || url.includes("/ingest")) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    for (const path of ["/offres/", "/blog/welcome-to-the-lab/", "/contact/"]) {
      await page.goto(origin + path);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://ligerianlabs.fr" + path); assertions++;
      assert.equal(await page.evaluate(() => typeof window.posthog), "undefined"); assertions++;
      assert.equal(await page.locator("h1").count(), 1); assertions++;
    }
    await page.goto(origin + "/services?source=browser#voir");
    assert.equal(new URL(page.url()).pathname, "/offres/"); assertions++;
    assert.equal(new URL(page.url()).search, "?source=browser"); assertions++;
    assert.equal(new URL(page.url()).hash, "#voir"); assertions++;
    for (const id of ["voir", "livrer", "reconstruire", "automatiser"]) {
      assert.equal(await page.locator(`#${id}`).count(), 1); assertions++;
    }
    assert.equal(analyticsRequests.length, 0); assertions++;
    if (process.env.SEO_SCREENSHOTS_DIR) {
      await mkdir(process.env.SEO_SCREENSHOTS_DIR, { recursive: true });
      await page.screenshot({ path: resolve(process.env.SEO_SCREENSHOTS_DIR, `offers-${width}.png`), fullPage: true });
    }
    await context.close();
  }

  // Simulate the public hostname in a separate context. Every request is
  // fulfilled locally or blocked, including the SDK, so no production event is sent.
  const context = await browser.newContext();
  const analyticsReferrers = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/ingest")) {
      analyticsReferrers.push(route.request().headers().referer);
      return route.abort();
    }
    if (url.hostname !== "ligerianlabs.fr") return route.abort();
    const response = await fetch(origin + url.pathname + url.search);
    return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  const page = await context.newPage();
  await page.goto("https://ligerianlabs.fr/offres/?email=private%40example.invalid");
  const result = await page.evaluate(() => {
    const sdk = window.posthog;
    const config = sdk._i[0][1];
    const captured = [];
    sdk.capture = (event, properties) => captured.push(config.before_send({ event, properties }));
    document.addEventListener("click", (event) => event.preventDefault());
    for (const href of ["mailto:private@example.invalid?body=private", "/contact/?message=private#private"]) {
      const anchor = document.createElement("a");
      anchor.href = href;
      document.body.append(anchor);
      anchor.click();
    }
    const submitted = config.before_send({ event: "contact_form_submitted", properties: { project_type: "ai-integration", description: "private", $current_url: window.location.href } });
    return { captured, submitted, autocapture: config.autocapture, replay: config.disable_session_recording };
  });
  assert.deepEqual(result.captured.map((item) => item.event), ["email_contact_click", "service_enquiry_click"]); assertions++;
  assert.ok(!JSON.stringify(result).includes("private")); assertions++;
  assert.equal(result.submitted.properties.project_type, "ai-integration"); assertions++;
  assert.equal(result.autocapture, false); assertions++;
  assert.equal(result.replay, true); assertions++;
  await page.evaluate(() => fetch("/ingest/privacy-probe", { method: "POST", body: "test" }).catch(() => {}));
  assert.ok(analyticsReferrers.length > 0); assertions++;
  assert.ok(analyticsReferrers.every((value) => value === undefined)); assertions++;
  await page.evaluate(() => localStorage.setItem("ll_analytics_disabled", "1"));
  await page.reload();
  assert.equal(await page.evaluate(() => typeof window.posthog), "undefined"); assertions++;
  await context.close();
  console.log(JSON.stringify({ status: "PASS", assertions, browser: browser.version(), widths: [1440, 390], production_network: "blocked; SDK stub and actual send filter exercised", entry: "node scripts/server/entry.mjs" }));
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await rm(scratch, { recursive: true, force: true });
}
