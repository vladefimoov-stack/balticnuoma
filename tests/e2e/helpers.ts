import { expect, type BrowserContext, type Page } from "@playwright/test";

export const isRemote = Boolean(process.env.E2E_BASE_URL);

/** Pretend the visitor already chose "necessary only", so the cookie banner stays out of the way. */
export async function chooseNecessaryCookies(context: BrowserContext, baseURL: string | undefined) {
  const value = encodeURIComponent(JSON.stringify({ v: 1, m: 0, a: 0, t: Date.now() }));
  await context.addCookies([{ name: "bn_consent", value, url: baseURL ?? "http://localhost:3100" }]);
}

/** Collects uncaught errors and console errors (ignoring third-party noise) for a final assertion. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/google|gstatic|favicon|ERR_BLOCKED_BY_CLIENT/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return {
    expectNone: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

/** Links to published cars from the catalog (empty when nothing is published). */
export async function carLinks(page: Page) {
  await page.goto("/automobiliai");
  return page.locator('main a[href*="/automobiliai/"]');
}

export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, "page scrolls sideways").toBeLessThanOrEqual(client);
}
