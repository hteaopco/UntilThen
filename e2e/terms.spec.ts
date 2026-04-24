import { expect, test } from "@playwright/test";

// The ToS is a legal document — a missing section means a
// contractual gap. This smoke test asserts the sections we
// care about contractually are present (CSAM zero-tolerance,
// Death / Incapacity, Contact).
test.describe("Terms of Service", () => {
  test("renders required legal sections", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.status()).toBe(200);

    // Launch-critical legal sections. If any of these headings
    // disappear, someone probably accidentally deleted a chunk
    // while editing and we want CI to scream.
    await expect(
      page.getByRole("heading", {
        name: /4\.1 Child Sexual Abuse Material/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /2\.5 Death or Incapacity/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Contact/i }),
    ).toBeVisible();
  });
});
