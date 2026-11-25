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
  const free = widget.locator('[role="grid"] button[data-date]:not([aria-disabled="true"])');
  await expect(free.first()).toBeVisible();
  // Two days a little ahead (both free in a fresh local database).
  await free.nth(4).click();
  await free.nth(5).click();
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
