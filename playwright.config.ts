import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests (tests/e2e). Locally they run against the production build:
 *   npm run build && npm run test:e2e        (needs `npm run db:start` for data-driven tests)
 * Against a deployed site (read-only tests only — the booking test skips itself):
 *   E2E_BASE_URL=https://www.balticnuoma.lt npm run test:e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const remote = process.env.E2E_BASE_URL?.replace(/\/+$/, "");
const baseURL = remote ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 45_000,
  use: { baseURL, trace: "off", screenshot: "only-on-failure", locale: "lt-LT", timezoneId: "Europe/Vilnius" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: remote
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: `${baseURL}/robots.txt`,
        reuseExistingServer: true,
        timeout: 120_000,
        // Repeated local runs must not hit the booking rate limit.
        env: { BOOKING_RATE_LIMIT_PER_HOUR: "1000" },
      },
});
