import { defineConfig, devices } from "@playwright/test";

/**
 * QA end-to-end tests (docs/11-QA-VERIFY.md). Runs against BASE_URL (default: a local `next start` on 3111).
 * Uses the installed Google Chrome, so no browser download is needed.
 *   npm run build && npx next start -p 3111 &
 *   node tests/fixtures/fetch-fixtures.mjs
 *   npx playwright test
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3111",
    channel: "chrome",
    trace: "off",
  },
  projects: [
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
  ],
});
