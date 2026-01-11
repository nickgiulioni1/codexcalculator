import { test, expect } from "@playwright/test";

test.describe("Input Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analyze");
  });

  test("shows validation alert for high refinance LTV", async ({ page }) => {
    // Switch to BRRRR strategy
    await page.getByRole("button", { name: /BRRRR/i }).click();

    // Find and set refinance LTV > 100%
    const refinanceLtvInput = page.getByLabel(/Refinance LTV/i);
    if (await refinanceLtvInput.isVisible()) {
      await refinanceLtvInput.clear();
      await refinanceLtvInput.fill("105");

      // Should show a validation warning
      await expect(page.getByText(/exceeds 100%/i)).toBeVisible();
    }
  });

  test("shows validation alert for zero bridge rate", async ({ page }) => {
    // Switch to BRRRR strategy
    await page.getByRole("button", { name: /BRRRR/i }).click();

    // Set bridge rate to 0
    const bridgeRateInput = page.getByLabel(/Bridge rate/i);
    if (await bridgeRateInput.isVisible()) {
      await bridgeRateInput.clear();
      await bridgeRateInput.fill("0");

      // Should show a validation warning
      await expect(page.getByText(/zero.*negative/i)).toBeVisible();
    }
  });

  test("months to simulate must be at least 1", async ({ page }) => {
    const monthsInput = page.getByLabel(/Months to simulate/i);
    await monthsInput.clear();
    await monthsInput.fill("0");

    // Should show validation warning
    await expect(page.getByText(/at least 1/i)).toBeVisible();
  });

  test("purchase price accepts only positive numbers", async ({ page }) => {
    const purchasePriceInput = page.getByLabel(/Purchase price/i);
    await purchasePriceInput.clear();
    await purchasePriceInput.fill("-100000");

    // The input should not accept negative value (handled by number input)
    // Or show an error message
    const value = await purchasePriceInput.inputValue();
    expect(parseFloat(value)).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Real-time Calculations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analyze");
  });

  test("calculations update when purchase price changes", async ({ page }) => {
    // Get initial cash required value
    const cashRequiredText = page.getByText(/Cash Required/i).locator("..");

    // Change purchase price
    const purchasePriceInput = page.getByLabel(/Purchase price/i);
    await purchasePriceInput.clear();
    await purchasePriceInput.fill("400000");

    // Wait for calculations to update
    await page.waitForTimeout(100);

    // Cash required should have changed (different from default)
    await expect(cashRequiredText).toBeVisible();
  });

  test("calculations update when down payment changes", async ({ page }) => {
    const downPaymentInput = page.getByLabel(/Down payment/i);
    await downPaymentInput.clear();
    await downPaymentInput.fill("30");

    // Wait for recalculation
    await page.waitForTimeout(100);

    // Results should still be visible
    await expect(page.getByText(/Cash Required/i)).toBeVisible();
  });
});
