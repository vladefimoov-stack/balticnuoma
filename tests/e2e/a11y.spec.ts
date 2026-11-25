import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseNecessaryCookies } from "./helpers";

const PAGES = ["/", "/automobiliai", "/kontaktai", "/salygos", "/slapukai", "/en", "/en/cars", "/admin/prisijungimas"];

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of PAGES) {
    test(`${path} has no violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("car page has no violations", async ({ page, context, baseURL }) => {
    await chooseNecessaryCookies(context, baseURL);
    await page.goto("/automobiliai");
    const link = page.locator('main a[href*="/automobiliai/"]').first();
    test.skip((await link.count()) === 0, "no published cars");
    await link.click();
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
