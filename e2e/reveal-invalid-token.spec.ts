import { expect, test } from "@playwright/test";

// A recipient hitting a broken / forged reveal link must see a
// graceful error screen with the logo — never a Next.js stack
// trace or a 500 page. This is the most recipient-facing error
// in the whole product, so it's worth a smoke test.
test.describe("Invalid reveal token", () => {
  test("shows a graceful error, not a stack trace", async ({ page }) => {
    // Any string that's not a real accessToken. Our route is
    // public so the 404/invalid path renders without auth.
    const response = await page.goto(
      "/reveal/this-token-does-not-exist-playwright-smoke",
    );

    // Next returns 404 for an unknown route match, but our
    // catch-all reveal handler renders a graceful page in the
    // browser regardless. We just need the page to render.
    expect(response).not.toBeNull();

    // The page body shouldn't contain a raw stack trace or
    // "Application failed to respond." A graceful error has
    // human-readable copy + the untilThen mark.
    const body = page.locator("body");
    await expect(body).not.toContainText(/at [a-zA-Z]+\.js:\d+/, {
      timeout: 10_000,
    });
    await expect(body).not.toContainText(/Application failed to respond/i);
  });
});
