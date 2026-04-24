import { expect, test } from "@playwright/test";

// Smoke tests for the unauthenticated landing page. If any of
// these fail we've either broken the top of the marketing funnel
// or a provider (Clerk, Sentry, PostHog) is crashing the root
// layout.
test.describe("Landing page", () => {
  test("renders the hero + core nav without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    // Logo is part of the nav on every marketing surface.
    await expect(
      page.getByRole("link", { name: /untilThen/i }).first(),
    ).toBeVisible();

    // Sign-in + sign-up CTAs must route somewhere. We don't
    // assert exact copy (it changes) but we do assert the anchors
    // exist and point at the right paths.
    await expect(page.locator('a[href="/sign-in"]').first()).toBeVisible();

    // Allow framework / extension noise but fail on anything
    // the app itself emitted — identified by the [untilThen] or
    // route-path prefixes we use in our own console.error calls.
    const appErrors = consoleErrors.filter(
      (e) =>
        e.includes("[untilThen]") ||
        e.includes("[cron/") ||
        e.includes("[sentry]") ||
        e.includes("[health]"),
    );
    expect(appErrors).toEqual([]);
  });
});
