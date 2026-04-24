import { expect, test } from "@playwright/test";

// Clerk's hosted sign-in widget renders here. We can't exercise
// the auth flow end-to-end without a Clerk test user + email
// infrastructure, so we verify the page loads and our two custom
// additions are wired:
//   1. The footer "Lost access to your email?" link → /help/recovery
//   2. The Clerk widget mounts (checking for an input field is
//      enough — Clerk renders them client-side)
test.describe("Sign-in page", () => {
  test("renders Clerk widget and recovery link", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response?.status()).toBe(200);

    // The recovery link is ours — added so users who lost email
    // access have a visible escape hatch. If it's missing, we
    // broke the escape hatch.
    await expect(
      page.locator('a[href="/help/recovery"]'),
    ).toBeVisible({ timeout: 15_000 });

    // Clerk mounts its widget async. A password or email input
    // is enough to know the widget rendered without JS errors.
    await expect(
      page.locator('input[type="email"], input[name="identifier"]').first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
