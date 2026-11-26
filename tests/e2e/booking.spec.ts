import { expect, test } from "@playwright/test";
import { carLinks, chooseNecessaryCookies, isRemote, watchErrors } from "./helpers";

// Creates a real `pending` booking — only ever against the local stack, never production.
test.skip(isRemote, "creates a booking — local stack only");

test("visitor sends a booking request for two days", async ({ page, context, baseURL }) => {
  await chooseNecessaryCookies(context, baseURL);
  const errors = watchErrors(page);
  const links = await carLinks(page);
  test.skip((await links.count()) === 0, "no published cars (run npm run db:reset)");
  await links.first().click();

  const widget = page.locator("#rezervacija");
  await expect(widget.locator('[role="grid"] button[data-date]').first()).toBeVisible();
  // The 10th and 11th of next month: always inside the booking horizon, whatever today is, and free
  // in a local database (test requests stay pending and don't occupy dates).
  await widget.getByRole("button", { name: "Kitas mėnuo" }).click();
  const day = (n: string) => widget.locator(`[role="grid"] button[data-date$="-${n}"]:not([aria-disabled="true"])`);
  await day("10").click();
  await day("11").click();
  await widget.getByRole("button", { name: "Tęsti" }).click();

  // Empty submit → client validation (zod loads lazily) marks the fields.
  await widget.getByRole("button", { name: "Siųsti užklausą" }).click();
  await expect(widget.locator("#bk-first-name")).toHaveAttribute("aria-invalid", "true");
  await expect(widget.getByText("Užpildykite šį laukelį.").first()).toBeVisible();

  await widget.locator("#bk-first-name").fill("Testas");
  await widget.locator("#bk-last-name").fill("Testauskas");
  await widget.locator("#bk-phone").fill("+370 600 00000");
  await widget.locator("#bk-email").fill("testas@example.com");
  await widget.locator("#bk-license").selectOption({ index: 1 });
  await widget.locator("#bk-experience").check();
  await widget.locator("#bk-consent").check();
  // The server treats submits faster than 3 s after opening the widget as bots.
  await page.waitForTimeout(3_100);
  await widget.getByRole("button", { name: "Siųsti užklausą" }).click();

  const success = page.getByRole("dialog", { name: "Užklausa išsiųsta!" });
  await expect(success).toBeVisible({ timeout: 15_000 });
  await expect(success).toContainText(/BN-\d{6}/);
  errors.expectNone();
});
