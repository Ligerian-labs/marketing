import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";
import { startServer, type TestServer } from "./contact-helpers.ts";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CONTACT_PLAYWRIGHT || "@playwright/test");

describe("marketing UI coherence", () => {
  let srv: TestServer;
  let browser: any;
  before(async () => { srv = await startServer(); browser = await chromium.launch(); });
  after(async () => { await browser?.close(); await srv?.stop(); });

  async function open(width = 1440) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route: any) => {
      const url = new URL(route.request().url());
      return url.origin === srv.base && !url.pathname.startsWith("/ingest") ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    return { context, page };
  }

  test("topics filter all articles, announce an accurate count and expose selection", async () => {
    const { context, page } = await open(390);
    try {
      await page.goto(srv.base + "/blog/");
      const results = page.locator("[data-category]");
      const total = await results.count();
      assert.equal(total, await page.locator('a[href^="/blog/"] h2, #ll-posts h3').count());
      const buttons = page.locator("#ll-filters button");
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        await button.click();
        assert.equal(await button.getAttribute("aria-pressed"), "true");
        assert.equal(await page.locator('#ll-filters [aria-pressed="true"]').count(), 1);
        const wanted = await button.getAttribute("data-filter");
        const visible = page.locator("[data-category]:visible");
        const expected = wanted === "all" ? total : await page.locator(`[data-category="${wanted}"]`).count();
        assert.equal(await visible.count(), expected);
        assert.equal(await page.locator("#ll-result-count").innerText(), `${expected} article${expected === 1 ? "" : "s"}`);
        assert.equal(await page.locator("#ll-result-count").getAttribute("role"), "status");
        assert.equal(await page.locator("#ll-empty").isVisible(), expected === 0);
        assert.equal(await button.evaluate((el: HTMLElement) => el.getBoundingClientRect().height >= 44), true);
      }
      await buttons.first().click();
      assert.equal(await page.locator("[data-category]:visible").count(), total);
    } finally { await context.close(); }
  });

  test("service hero CTAs preserve contact context and project index avoids a self-link", async () => {
    const { context, page } = await open(390);
    try {
      for (const [path, project, type] of [
        ["/developpement-logiciel-sur-mesure/", "creation", "new-application"],
        ["/integration-ia/", "expertise", "ai-integration"],
      ]) {
        await page.goto(srv.base + path);
        const primary = page.locator(".ll-hero__main .ll-btn").first();
        assert.equal(await primary.getAttribute("href"), `/contact/?projet=${project}`);
        await primary.click();
        assert.equal(await page.locator('input[name="projectType"]:checked').inputValue(), type);
      }
      await page.goto(srv.base + "/realisations/");
      assert.equal(await page.locator('.ll-hero__main a[href="/realisations/"]').count(), 0);
      assert.equal(await page.locator('.ll-hero__main a[href="/offres/"]').count(), 1);
    } finally { await context.close(); }
  });

  test("wrapped desktop and tablet buttons retain complete borders", async () => {
    const { context, page } = await open(1024);
    try {
      for (const width of [1440, 1024, 900, 768, 621, 620, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ["/", "/offres/"]) {
          await page.goto(srv.base + path);
          const broken = await page.locator(".ll-btn-row").evaluateAll((rows: HTMLElement[]) => rows.flatMap((row) => {
            const buttons = Array.from(row.querySelectorAll<HTMLElement>(".ll-btn"));
            return buttons.flatMap((button, index) => {
              const rect = button.getBoundingClientRect();
              const previous = buttons[index - 1]?.getBoundingClientRect();
              const rowStart = !previous || Math.abs(rect.top - previous.top) > 1;
              return rowStart && parseFloat(getComputedStyle(button).borderLeftWidth) < 2 ? [button.textContent] : [];
            });
          }));
          assert.deepEqual(broken, [], `${path} incomplete button at ${width}px`);
        }
      }
    } finally { await context.close(); }
  });

  test("press panels and article comparisons fit narrow mobile screens", async () => {
    const { context, page } = await open(320);
    try {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ["/kit-presse/", "/blog/chatgpt-claude-mistral-quel-modele-choisir/"]) {
          await page.goto(srv.base + path);
          const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
          assert.ok(layout.document <= layout.viewport + 1, `${path} overflows at ${width}: ${JSON.stringify(layout)}`);
        }
      }
      assert.equal(await page.getByRole("table").count(), 1);
      assert.equal(await page.getByRole("columnheader", { name: "Alternative", exact: true }).count(), 1);
      const comparison = page.getByRole("region", { name: "Tableau à faire défiler horizontalement" });
      await comparison.focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => (document.querySelector(".ll-table-scroll")?.scrollLeft ?? 0) > 0);
      assert.equal(await comparison.evaluate((el: HTMLElement) => el === document.activeElement), true);
    } finally { await context.close(); }
  });
});
