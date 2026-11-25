import { expect, test } from "@playwright/test";
import { carLinks, chooseNecessaryCookies, expectNoHorizontalScroll, watchErrors } from "./helpers";

test.describe("public site", () => {
  test.beforeEach(async ({ context, baseURL }) => chooseNecessaryCookies(context, baseURL));

  test("home: hero, navigation, metadata and structured data", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Baltic Nuoma/);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/api\/og\/lt$/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((json) => JSON.parse(json)["@type"] === "AutoRental")).toBe(true);
    await expectNoHorizontalScroll(page);
    errors.expectNone();
  });

  test("catalog opens a car page with the booking widget", async ({ page }) => {
    const errors = watchErrors(page);
    const links = await carLinks(page);
    test.skip((await links.count()) === 0, "no published cars");
    const href = await links.first().getAttribute("href");
    await links.first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#rezervacija")).toBeVisible();
    await expect(page.locator('[role="grid"]')).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld ?? "[]").map((x: { "@type": string }) => x["@type"])).toContain("Car");
    await expectNoHorizontalScroll(page);
    errors.expectNone();
  });

  test("language switch keeps the page", async ({ page, isMobile }) => {
    await page.goto("/kontaktai");
    if (isMobile) await page.getByRole("button", { name: "Atidaryti meniu" }).click();
    await page.locator('a[hreflang="en"]:visible').first().click();
    await expect(page).toHaveURL(/\/en\/contacts$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  for (const path of [
    "/salygos",
    "/privatumo-politika",
    "/slapukai",
    "/en/terms",
    "/en/privacy-policy",
    "/en/cookies",
  ]) {
    test(`legal page ${path} is published as a draft`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("article h2").first()).toBeVisible();
      expect(await page.content()).toContain("ЧЕРНОВИК: требует юридической проверки");
      await expectNoHorizontalScroll(page);
    });
  }

  test("unknown URL shows the localized 404", async ({ page }) => {
    const res = await page.goto("/sitas-puslapis-neegzistuoja");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Kelias čia baigiasi")).toBeVisible();
  });

  test("old prices page redirects to the catalog", async ({ page }) => {
    await page.goto("/kainos");
    await expect(page).toHaveURL(/\/automobiliai$/);
  });

  test("admin is behind the login and never indexed", async ({ page }) => {
    const res = await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/prisijungimas/);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("robots and sitemap", () => {
  test("robots.txt points to the sitemap and closes the admin", async ({ request, baseURL }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
    expect(baseURL).toBeTruthy();
  });

  test("sitemap lists LT and EN pages", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toMatch(/<loc>[^<]+\/automobiliai<\/loc>/);
    expect(xml).toMatch(/<loc>[^<]+\/en\/cars<\/loc>/);
    expect(xml).toContain('hreflang="x-default"');
  });

  test("Open Graph card renders as PNG", async ({ request }) => {
    const res = await request.get("/api/og/lt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  });
});
