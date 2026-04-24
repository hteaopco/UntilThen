import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke tests for untilThen.
 *
 * Scope: unauthenticated public surfaces only (landing, sign-in,
 * terms, help/recovery, invalid-token reveal). Authenticated flows
 * would need Clerk test users + a seeded test database, which is
 * overkill for the current pre-launch safety net.
 *
 * Runs against whatever URL is in PLAYWRIGHT_BASE_URL, defaulting
 * to localhost:3000. Locally, `npm run test:e2e` spins up the dev
 * server automatically via the `webServer` block. To run against
 * prod, set PLAYWRIGHT_BASE_URL=https://untilthenapp.io and skip
 * the auto-start.
 *
 * First-time setup on a fresh machine:
 *   npm install
 *   npx playwright install --with-deps chromium
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  // Generous timeout because Next cold-starts can take a while
  // on first hit (JIT + middleware + Clerk handshake).
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // CI fails fast on .only() leftovers.
  forbidOnly: Boolean(process.env.CI),
  // Two retries in CI so a transient network blip doesn't nuke
  // the whole run. Local runs don't retry — faster feedback.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Runs unauthenticated by design — we intentionally don't
    // set cookies/storage so the tests hit public surfaces.
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // When PLAYWRIGHT_BASE_URL is set (e.g. running against prod),
  // skip the auto-start. Otherwise boot Next in dev mode.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
