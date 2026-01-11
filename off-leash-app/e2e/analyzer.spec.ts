import { test, expect } from "@playwright/test";

test.describe("Analyzer Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analyze");
  });

  test("loads the analyzer page", async ({ page }) => {
    await expect(page.locator("h2")).toContainText("Analyzer");
  });

  test("displays strategy toggle buttons", async ({ page }) => {
    const buyHoldBtn = page.getByRole("button", { name: /Buy & Hold/i });
    const brrrrBtn = page.getByRole("button", { name: /BRRRR/i });
    const flipBtn = page.getByRole("button", { name: /Flip/i });

    await expect(buyHoldBtn).toBeVisible();
    await expect(brrrrBtn).toBeVisible();
    await expect(flipBtn).toBeVisible();
  });

  test("Buy & Hold is selected by default", async ({ page }) => {
    const buyHoldBtn = page.getByRole("button", { name: /Buy & Hold/i });
    await expect(buyHoldBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("can switch between strategies", async ({ page }) => {
    const brrrrBtn = page.getByRole("button", { name: /BRRRR/i });
    await brrrrBtn.click();
    await expect(brrrrBtn).toHaveAttribute("aria-pressed", "true");

    const flipBtn = page.getByRole("button", { name: /Flip/i });
    await flipBtn.click();
    await expect(flipBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("shows bridge rate field for BRRRR and Flip strategies", async ({ page }) => {
    // Bridge rate should not be visible for Buy & Hold
    await expect(page.getByLabel(/Bridge rate/i)).not.toBeVisible();

    // Switch to BRRRR
    await page.getByRole("button", { name: /BRRRR/i }).click();
    await expect(page.getByLabel(/Bridge rate/i)).toBeVisible();

    // Switch to Flip
    await page.getByRole("button", { name: /Flip/i }).click();
    await expect(page.getByLabel(/Bridge rate/i)).toBeVisible();
  });

  test("can enter purchase price", async ({ page }) => {
    const purchasePriceInput = page.getByLabel(/Purchase price/i);
    await purchasePriceInput.clear();
    await purchasePriceInput.fill("400000");
    await expect(purchasePriceInput).toHaveValue("400000");
  });

  test("can enter target monthly rent", async ({ page }) => {
    const rentInput = page.getByLabel(/Target monthly rent/i);
    await rentInput.clear();
    await rentInput.fill("3000");
    await expect(rentInput).toHaveValue("3000");
  });

  test("displays results after entering values", async ({ page }) => {
    // The results should be visible with default values
    // Look for metrics that should always be present
    await expect(page.getByText(/Cash Required/i)).toBeVisible();
  });
});

test.describe("Scenario Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analyze");
  });

  test("can enter scenario name", async ({ page }) => {
    const nameInput = page.getByLabel(/Scenario name/i);
    await nameInput.clear();
    await nameInput.fill("Test Property");
    await expect(nameInput).toHaveValue("Test Property");
  });

  test("shows save button", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /Save scenario/i });
    await expect(saveBtn).toBeVisible();
  });

  test("shows reset button", async ({ page }) => {
    const resetBtn = page.getByRole("button", { name: /Reset/i });
    await expect(resetBtn).toBeVisible();
  });

  test("can reset form to defaults", async ({ page }) => {
    // Change a value
    const purchasePriceInput = page.getByLabel(/Purchase price/i);
    await purchasePriceInput.clear();
    await purchasePriceInput.fill("500000");

    // Reset
    await page.getByRole("button", { name: /Reset/i }).click();

    // Should be back to default (325000)
    await expect(purchasePriceInput).toHaveValue("325000");
  });
});

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analyze");
  });

  test("all form fields have labels", async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test("toggle buttons have aria-pressed attribute", async ({ page }) => {
    const toggleButtons = page.locator('button[aria-pressed]');
    await expect(toggleButtons.first()).toBeVisible();
  });

  test("can navigate with keyboard", async ({ page }) => {
    // Focus the first input
    await page.keyboard.press("Tab");

    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Something should be focused
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

test.describe("Home Page", () => {
  test("loads the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("has navigation to analyzer", async ({ page }) => {
    await page.goto("/");
    const analyzeLink = page.getByRole("link", { name: /Analyze/i });
    await expect(analyzeLink).toBeVisible();
  });

  test("can navigate to analyzer from home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Analyze/i }).first().click();
    await expect(page).toHaveURL(/analyze/);
  });
});
