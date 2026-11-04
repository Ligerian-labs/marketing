import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { startServer, type TestServer } from "./contact-helpers.ts";

const require = createRequire(import.meta.url);
let playwright: any;
try { playwright = require(process.env.CONTACT_PLAYWRIGHT || "@playwright/test"); } catch {}

describe("confirmed software offer in the browser", { skip: playwright ? false : "Set CONTACT_PLAYWRIGHT to run Chromium" }, () => {
  let srv: TestServer;
  let browser: any;
  before(async () => { srv = await startServer(); browser = await playwright.chromium.launch(); });
  after(async () => { await browser?.close(); await srv?.stop(); });
  beforeEach(async () => { await srv.resetLeads(); });

  async function open(width = 390) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("**/*", (route: any) => {
      const url = new URL(route.request().url());
      return url.origin === srv.base && !url.pathname.startsWith("/ingest") ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    return { context, page };
  }

  test("construction pricing, separate maintenance and old expertise destinations stay reachable", async () => {
    const t = await open();
    try {
      await t.page.goto(srv.base + "/");
      assert.match(await t.page.locator(".ll-hero__aside").innerText(), /2 000 €[\s\S]*par mois de construction/i);
      await t.page.locator('a[href="/offres/#creation"]').first().click();
      await t.page.waitForURL(srv.base + "/offres/#creation");
      assert.match(await t.page.locator("#creation").innerText(), /2 000 €[\s\S]*par mois de construction/i);
      assert.match(await t.page.locator("#suivi").innerText(), /Sur devis/);
      assert.match(await t.page.locator("#budget + section").innerText(), /illustration/);
      for (const id of ["voir", "livrer", "reconstruire", "automatiser"]) {
        await t.page.locator(`#${id}`).click();
        await t.page.waitForURL(srv.base + `/expertise/#${id}`);
        assert.equal(await t.page.locator(`#${id}`).count(), 1);
        await t.page.goto(srv.base + "/offres/");
      }
      await t.page.goto(srv.base + "/developpement-logiciel-sur-mesure/");
      assert.match(await t.page.locator("body").innerText(), /2 000 € par mois de construction/);
    } finally { await t.context.close(); }
  });

  test("offer CTAs preselect creation, takeover and support while invalid queries select nothing", async () => {
    const t = await open();
    try {
      for (const [offer, projectType] of Object.entries({ creation: "new-application", reprise: "existing-software", suivi: "maintenance" })) {
        await t.page.goto(srv.base + "/offres/");
        await t.page.locator(`#${offer} a[href^="/contact/"]`).click();
        await t.page.waitForURL(srv.base + `/contact/?projet=${offer}`);
        assert.equal(await t.page.locator('input[name="projectType"]:checked').inputValue(), projectType);
      }
      await t.page.goto(srv.base + "/contact/?projet=expertise");
      assert.equal(await t.page.locator('input[name="projectType"]:checked').inputValue(), "ai-integration");
      for (const offer of ["unknown", "toString", '__proto__', 'suivi" onfocus=alert(1)']) {
        await t.page.goto(srv.base + "/contact/?projet=" + encodeURIComponent(offer));
        assert.equal(await t.page.locator('input[name="projectType"]:checked').count(), 0);
      }
    } finally { await t.context.close(); }
  });

  test("a preselected maintenance request reaches both lead files without loading analytics", async () => {
    const t = await open(320);
    try {
      await t.page.goto(srv.base + "/contact/?projet=suivi");
      await t.page.fill("#contact-name", "Test offre");
      await t.page.fill("#contact-email", "offre@example.invalid");
      await t.page.fill("#contact-currentTool", "Portail métier");
      await t.page.fill("#contact-description", "Organiser le suivi du portail après sa livraison.");
      await t.page.fill("#contact-timing", "Après réception");
      await t.page.fill("#contact-budget", "Sur devis distinct");
      await t.page.check('input[name="consent"]');
      await t.page.click("#contact-submit");
      await t.page.waitForSelector("#form-success:not([hidden])");
      const leads = await srv.storedLeads();
      assert.equal(leads.length, 1);
      assert.equal(leads[0].projectType, "maintenance");
      assert.equal(leads[0].currentTool, "Portail métier");
      assert.equal(leads[0].timing, "Après réception");
      assert.equal(leads[0].budget, "Sur devis distinct");
      assert.deepEqual(JSON.parse(await readFile(join(srv.leadsDir, `${leads[0].id}.json`), "utf8")), leads[0]);
      assert.equal(await t.page.evaluate(() => typeof (window as any).posthog), "undefined");
    } finally { await t.context.close(); }
  });
});
