// The real built page in Chromium: form wiring, analytics calls, failure paths.
// Playwright is not a repo dependency. Point CONTACT_PLAYWRIGHT at an installed
// `@playwright/test` (path or package name); without it this file reports a skip
// and the wiring is NOT covered.
//
//   npm run build
//   CONTACT_PLAYWRIGHT=/path/to/node_modules/@playwright/test node --test tests/contact-browser.test.ts
//
// Every request that is not the test server is aborted, which includes PostHog,
// `/ingest`, fonts and production hosts.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, beforeEach, describe, test } from "node:test";
import { startServer, type TestServer } from "./contact-helpers.ts";

const require = createRequire(import.meta.url);
let playwright: any = null;
for (const name of [process.env.CONTACT_PLAYWRIGHT, "@playwright/test"]) {
  if (!name) continue;
  try {
    playwright = require(name);
    break;
  } catch {
    /* try the next candidate */
  }
}

const PUBLIC_HOST = "lab.example.org"; // resolved to 127.0.0.1 by the browser, not a real site
const MAPPED = "[::ffff:7f00:1]";

describe("contact page in a browser", { skip: playwright ? false : "Playwright not found: set CONTACT_PLAYWRIGHT" }, () => {
  let srv: TestServer;
  let browser: any;
  let blocked: string[]; // requests this file refused to let out (PostHog loader, fonts, ...)

  before(async () => {
    srv = await startServer();
    browser = await playwright.chromium.launch({ args: [`--host-resolver-rules=MAP ${PUBLIC_HOST} 127.0.0.1`] });
  });
  after(async () => {
    await browser?.close();
    await srv?.stop();
  });
  beforeEach(async () => {
    blocked = [];
    await srv.resetLeads();
  });

  /**
   * Open the form. `origin` picks the hostname the page sees; `human` hides
   * navigator.webdriver so the automation suppression does not mask the rest.
   */
  async function open({ origin = PUBLIC_HOST, human = true, viewport = { width: 1280, height: 900 } } = {}) {
    const context = await browser.newContext({ viewport, locale: "fr-FR" });
    if (human) await context.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
    await context.route("**/*", async (route: any) => {
      const url = new URL(route.request().url());
      const isOrigin = url.hostname === origin || url.hostname === "127.0.0.1" || url.hostname === PUBLIC_HOST;
      if (!isOrigin || url.pathname.startsWith("/ingest")) {
        blocked.push(url.href);
        return route.abort();
      }
      if (url.hostname === origin && origin !== "127.0.0.1" && origin !== PUBLIC_HOST) {
        // Local-looking origins (IPv6 literals, "localhost.") are not resolvable to the test server: forward them.
        const target = url.href.replace(`//${origin}`, "//127.0.0.1");
        return route.fulfill({ response: await route.fetch({ url: target }) });
      }
      return route.continue();
    });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on("request", (r: any) => r.url().includes("/api/contact") && requests.push(r.url()));
    await page.goto(`http://${origin}:${srv.port}/contact/`);
    // Record what the page hands to PostHog. The site's own snippet defines window.posthog during load.
    await page.evaluate(() => {
      const w = window as any;
      w.__captured = [];
      w.posthog = w.posthog ?? {};
      w.posthog.capture = (...args: unknown[]) => w.__captured.push(args);
    });
    return {
      page,
      requests,
      captured: (): Promise<unknown[][]> => page.evaluate(() => (window as any).__captured),
      close: () => context.close(),
    };
  }

  async function fill(page: any, honeypot = "") {
    await page.fill("#contact-name", "Camille Synthétique");
    await page.fill("#contact-email", "camille@example.invalid");
    await page.check("input[name=projectType][value=ai-integration]");
    await page.fill("#contact-description", "Brancher un assistant sur notre base documentaire.");
    await page.check("input[name=consent]");
    if (honeypot) await page.evaluate((v: string) => ((document.querySelector("input[name=website]") as HTMLInputElement).value = v), honeypot);
  }
  const submit = (page: any) => page.click("#contact-submit");

  test("accepted enquiry: success state, stored lead, exactly one event with only project_type", async () => {
    const t = await open();
    await fill(t.page);
    await submit(t.page);
    await t.page.waitForSelector("#form-success:not([hidden])");
    assert.equal(await t.page.$eval("#contact-form", (f: HTMLElement) => getComputedStyle(f).display), "none");
    assert.equal((await srv.storedLeads()).length, 1);
    assert.deepEqual(await t.captured(), [["contact_form_submitted", { project_type: "ai-integration" }]]);
    await t.close();
  });

  test("failed requests store nothing, count nothing and keep the form usable", async () => {
    const failures: [string, (r: any) => Promise<void>, string][] = [
      ["network failure", (r) => r.abort(), "#form-alert"],
      ["server 500", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false}' }), "#form-alert"],
      ["non-JSON 502", (r) => r.fulfill({ status: 502, contentType: "text/html", body: "<h1>Bad gateway</h1>" }), "#form-alert"],
      ["server field errors", (r) => r.fulfill({ status: 400, contentType: "application/json", body: '{"ok":false,"fields":{"email":"Adresse refusée."}}' }), "#error-email"],
    ];
    for (const [label, handler, visible] of failures) {
      const t = await open();
      await t.page.route("**/api/contact", handler);
      await fill(t.page);
      await submit(t.page);
      await t.page.waitForSelector(`${visible}:not([hidden])`);
      assert.deepEqual(await t.captured(), [], label);
      assert.equal((await srv.storedLeads()).length, 0, label);
      assert.equal(await t.page.isVisible("#contact-form"), true, label);
      assert.equal(await t.page.isVisible("#form-success"), false, label);
      assert.equal(await t.page.$eval("#contact-submit", (b: HTMLButtonElement) => b.disabled), false, label);
      await t.close();
    }
  });

  test("validation failure sends no request and no event, and flags the fields", async () => {
    const t = await open();
    await submit(t.page);
    const shown = await t.page.$$eval(".contact-error:not([hidden])", (els: HTMLElement[]) => els.map((e) => e.id).sort());
    assert.deepEqual(shown, ["error-consent", "error-description", "error-email", "error-name", "error-projectType"]);
    assert.equal(await t.page.evaluate(() => document.activeElement?.id), "contact-name");
    assert.equal(t.requests.length, 0);
    assert.deepEqual(await t.captured(), []);
    await t.close();
  });

  test("honeypot: nothing stored, no event", async () => {
    const t = await open();
    await fill(t.page, "http://spam.invalid");
    await submit(t.page);
    await t.page.waitForSelector("#form-success:not([hidden])");
    assert.equal((await srv.storedLeads()).length, 0);
    assert.deepEqual(await t.captured(), []);
    await t.close();
  });

  test("local, IPv6 and automated visits are accepted but never counted", async () => {
    const visits: [string, Parameters<typeof open>[0]][] = [
      ["127.0.0.1", { origin: "127.0.0.1" }],
      ["IPv4-mapped loopback", { origin: MAPPED }],
      ["unique-local IPv6", { origin: "[fd00::1]" }],
      ["link-local IPv6", { origin: "[fe80::1]" }],
      ["root-dotted localhost", { origin: "localhost." }],
      ["root-dotted .localhost", { origin: "app.localhost." }],
      ["root-dotted .local", { origin: "mac.local." }],
      ["root-dotted .test", { origin: "lab.test." }],
      ["automated browser", { human: false }],
    ];
    for (const [label, options] of visits) {
      const t = await open(options);
      await fill(t.page);
      await submit(t.page);
      await t.page.waitForSelector("#form-success:not([hidden])");
      assert.deepEqual(await t.captured(), [], label);
      await t.close();
    }
    assert.equal((await srv.storedLeads()).length, visits.length);
  });

  test("absent or throwing window.posthog does not stop the enquiry", async () => {
    for (const mode of ["absent", "throwing"]) {
      const t = await open();
      await t.page.evaluate((m: string) => {
        const w = window as any;
        if (m === "absent") delete w.posthog;
        else w.posthog.capture = () => { throw new Error("analytics down"); };
      }, mode);
      await fill(t.page);
      await submit(t.page);
      await t.page.waitForSelector("#form-success:not([hidden])");
      await t.close();
    }
    assert.equal((await srv.storedLeads()).length, 2);
  });

  test("double click stores one lead", async () => {
    const t = await open();
    await fill(t.page);
    await t.page.dblclick("#contact-submit");
    await t.page.waitForSelector("#form-success:not([hidden])");
    assert.equal(t.requests.length, 1);
    assert.equal((await srv.storedLeads()).length, 1);
    await t.close();
  });

  test("controls are labelled and stay inside a 320 px viewport", async () => {
    const t = await open({ viewport: { width: 320, height: 640 } });
    const unlabeled = await t.page.evaluate(() =>
      [...document.querySelectorAll("#contact-form input:not([name=website]), #contact-form textarea")].filter(
        (el: any) => !(el.labels && el.labels.length),
      ).length,
    );
    assert.equal(unlabeled, 0);
    const overflowing = await t.page.evaluate(
      () => [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length,
    );
    assert.equal(overflowing, 0);
    await t.close();
  });
});
