import { expect, test } from "@playwright/test";

// Last-resort support surface. If this page breaks, users who
// lost email access have no path back into their account.
test.describe("Help / account recovery", () => {
  test("form renders with all required fields", async ({ page }) => {
    const response = await page.goto("/help/recovery");
    expect(response?.status()).toBe(200);

    // Heading — anchors the page.
    await expect(
      page.getByRole("heading", { name: /trouble signing in/i }),
    ).toBeVisible();

    // The "lost email" form must render. We assert on the
    // submit button and a couple of required fields by label
    // instead of selector so a copy tweak doesn't break us.
    await expect(
      page.getByRole("button", { name: /send recovery request/i }),
    ).toBeVisible();
    await expect(
      page.getByLabel(/original email/i),
    ).toBeVisible();
    await expect(
      page.getByLabel(/new email/i),
    ).toBeVisible();
  });
});
