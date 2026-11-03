// Run against the built server. Set PLAYWRIGHT_MODULE when using a toolkit
// installed outside this repository; no browser dependency is added here.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "@playwright/test");

const origin = process.env.MARKETING_ORIGIN || "http://127.0.0.1:4323";
const routes = ["/", "/offres/", "/a-propos/", "/ia-angers/", "/developpement-logiciel-sur-mesure/", "/integration-ia/", "/realisations/", "/realisations/contremaitre/", "/realisations/assistant-export/"];

(async () => {
  const browser = await chromium.launch({ headless: true });
  let checks = 0;
  try {
    for (const width of [1440, 1024, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route(/posthog|\/ingest(?:\/|$)/, (route) => route.abort());
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(20000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const path of routes) {
        const response = await page.goto(origin + path);
        assert.equal(response.status(), 200, path);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("h1").count(), 1, path);
        assert.equal(await page.locator('a[href="/contact/"]:visible').count() > 0, true, `contact path ${path}`);
        const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        assert.ok(layout.document <= layout.viewport + 1, `${path} overflows at ${width}: ${JSON.stringify(layout)}`);
        const badLinks = await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter((href) => {
          const pathname = new URL(href, location.origin).pathname;
          return !pathname.startsWith("/api/") && !pathname.split("/").pop().includes(".") && !pathname.endsWith("/");
        }));
        assert.deepEqual(badLinks, [], `page links normalized: ${path}`);
        checks++;
      }
      await page.goto(origin + "/");
      assert.equal(await page.title(), "Logiciels sur mesure et IA à Angers | Ligerian Labs");
      assert.equal((await page.locator("h1").textContent()).replace(/\s+/g, " "), "Développement de logiciels sur mesure et de solutions IA à Angers");
      assert.ok(await page.getByRole("link", { name: "Voir les réalisations", exact: true }).isVisible());
      if (width <= 1100) {
        const button = page.locator("#ll-burger");
        assert.equal(await button.getAttribute("aria-label"), "Ouvrir le menu");
        await button.click();
        assert.equal(await button.getAttribute("aria-expanded"), "true");
        const menu = page.locator("#ll-nav-panel");
        for (const label of ["Services", "Réalisations", "À propos", "Ressources", "Contact"]) {
          assert.ok(await menu.getByRole("link", { name: label, exact: true }).isVisible(), label);
        }
        await page.keyboard.press("Escape");
        assert.equal(await button.getAttribute("aria-expanded"), "false");
        assert.equal(await button.evaluate((element) => element === document.activeElement), true);
        assert.equal(await menu.evaluate((element) => element.inert), true);
        await button.click();
        await menu.getByRole("link", { name: "Réalisations", exact: true }).click();
        await page.waitForURL(origin + "/realisations/");
        assert.ok(await page.locator("h1").isVisible());
      }
      assert.deepEqual(errors, [], `browser JS errors at ${width}`);
      await context.close();
    }
    const context = await browser.newContext();
    await context.route(/posthog|\/ingest(?:\/|$)/, (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    for (const anchor of ["voir", "livrer", "reconstruire", "automatiser"]) {
      await page.goto(origin + "/offres/#" + anchor);
      assert.equal(await page.locator("#" + anchor).count(), 1);
    }
    for (const slug of ["contremaitre", "assistant-export"]) {
      await page.goto(origin + "/realisations/" + slug + "/");
      assert.ok(await page.getByRole("link", { name: "Dépôt public", exact: false }).count());
      const sources = await page.locator('a[href*="github.com/Ligerian-labs/' + slug + '/blob/"]').count();
      assert.ok(sources >= 2, "pinned evidence links");
    }
    assert.equal((await page.locator("main").innerText()).includes("sources vide"), true);
    await context.close();
    console.log(JSON.stringify({ status: "PASS", pageViewportChecks: checks, widths: [1440, 1024, 390, 320], anchors: 4, projectSourceChecks: 2 }));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
