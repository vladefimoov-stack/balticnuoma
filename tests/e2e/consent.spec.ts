import { expect, test } from "@playwright/test";

/** First visit: no consent cookie in these tests. */
test.describe("cookie consent", () => {
  test("banner on first visit; 'necessary only' is remembered without a flash", async ({ page }) => {
    await page.goto("/kontaktai");
    const banner = page.getByRole("dialog", { name: "Slapukai" });
    await expect(banner).toBeVisible();
    await expect(page.locator('iframe[src*="maps.google"]')).toHaveCount(0);

    await banner.getByRole("button", { name: "Tik būtini" }).click();
    await expect(banner).toBeHidden();
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "bn_consent")).toBe(true);
    expect(cookies.some((c) => /google/.test(c.domain))).toBe(false);

    // Server HTML contains the banner; the pre-paint script must hide it before it shows.
    await page.reload({ waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-consent-set", "");
    await expect(page.getByRole("dialog", { name: "Slapukai" })).toBeHidden();
  });

  test("the map loads only after consent", async ({ page }) => {
    await page.goto("/kontaktai");
    await page.getByRole("dialog", { name: "Slapukai" }).getByRole("button", { name: "Tik būtini" }).click();
    const show = page.getByRole("button", { name: "Rodyti žemėlapį" });
    await show.scrollIntoViewIfNeeded();
    await expect(page.locator('iframe[src*="maps.google"]')).toHaveCount(0);
    await show.click();
    await expect(page.locator('iframe[src*="maps.google"]')).toHaveCount(1);
  });

  test("settings can be reopened from the footer and closed with Escape", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("dialog", { name: "Slapukai" }).getByRole("button", { name: "Priimti visus" }).click();
    await page.getByRole("button", { name: "Slapukų nustatymai", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slapukai" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("checkbox").nth(1)).toBeChecked(); // map — accepted
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
