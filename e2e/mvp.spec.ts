import { test, expect, type Page } from "@playwright/test";

/* ---------- constants ---------- */

const API_ENDPOINT = "http://localhost:3000/api/parse-expense";

const MOCK_DRAFT = {
  amount: 350,
  currency: "THB",
  description: "Lunch at food court",
  spentAt: "2026-06-06",
  merchant: "Food Court",
  categoryHint: "food",
  confidence: 0.95,
  rawText: "Paid 350 baht for lunch at the food court today",
};

const INPUT_TEXT = "Paid 350 baht for lunch at the food court today";

/* ---------- helpers ---------- */

async function setupApiMock(page: Page) {
  await page.route(API_ENDPOINT, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ draft: MOCK_DRAFT }),
    });
  });
}

async function clearStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/* ---------- tests ---------- */

test.describe("MVP tracer bullet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearStorage(page);
    await setupApiMock(page);
    // Reload so the app picks up the cleared localStorage and route mock
    await page.reload();
  });

  test("full flow: parse → edit → confirm → persist on reload", async ({ page }) => {
    // 1. Verify heading and input area are present
    await expect(
      page.getByRole("heading", { name: "Finance Assistant" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/e\.g\. Paid 350 baht/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Parse with AI" }),
    ).toBeVisible();

    // 2. Type expense text and click parse
    await page
      .getByPlaceholder(/e\.g\. Paid 350 baht/)
      .fill(INPUT_TEXT);
    await page.getByRole("button", { name: "Parse with AI" }).click();

    // 3. Wait for draft card to appear with parsed data
    await expect(
      page.getByText("Parsed Draft"),
    ).toBeVisible();
    await expect(
      page.getByText("Confidence: 95%"),
    ).toBeVisible();

    // 4. Verify initial field values from mock
    const amountInput = page.getByLabel("Amount");
    await expect(amountInput).toHaveValue("350");

    const currInput = page.getByLabel("Currency");
    await expect(currInput).toHaveValue("THB");

    const descInput = page.getByLabel("Description");
    await expect(descInput).toHaveValue("Lunch at food court");

    const dateInput = page.getByLabel("Date (YYYY-MM-DD)");
    await expect(dateInput).toHaveValue("2026-06-06");

    const merchInput = page.getByLabel("Merchant (optional)");
    await expect(merchInput).toHaveValue("Food Court");

    const catInput = page.getByLabel("Category Hint (optional)");
    await expect(catInput).toHaveValue("food");

    // 5. Edit amount, description, date, and category hint
    await amountInput.fill("380");
    await descInput.fill("Lunch at central food court");
    await dateInput.fill("2026-06-07");
    await catInput.fill("dining");

    // 6. Confirm locally
    await page.getByRole("button", { name: "Confirm Locally" }).click();

    // 7. Verify draft card is gone
    await expect(
      page.getByText("Parsed Draft"),
    ).not.toBeVisible();

    // 8. Verify confirmed draft appears with edited values
    await expect(
      page.getByText("Lunch at central food court"),
    ).toBeVisible();
    await expect(
      page.getByText("380.00 THB"),
    ).toBeVisible();
    await expect(
      page.getByText("dining"),
    ).toBeVisible();

    // 9. Reload the page
    await page.reload();

    // 10. Verify confirmed draft persists across reloads
    await expect(
      page.getByText("Confirmed Drafts"),
    ).toBeVisible();
    await expect(
      page.getByText("Lunch at central food court"),
    ).toBeVisible();
    await expect(
      page.getByText("380.00 THB"),
    ).toBeVisible();
    await expect(
      page.getByText("dining"),
    ).toBeVisible();
  });

  test("parse error is displayed when API returns error", async ({ page }) => {
    // Override mock to return error
    await page.unroute(API_ENDPOINT);
    await page.route(API_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Missing or invalid 'text' field" }),
      });
    });

    await page.getByPlaceholder(/e\.g\. Paid 350 baht/).fill(INPUT_TEXT);
    await page.getByRole("button", { name: "Parse with AI" }).click();

    await expect(
      page.getByText("Missing or invalid 'text' field"),
    ).toBeVisible();
  });

  test("validation error shows when amount is cleared on confirm", async ({ page }) => {
    await page.getByPlaceholder(/e\.g\. Paid 350 baht/).fill(INPUT_TEXT);
    await page.getByRole("button", { name: "Parse with AI" }).click();

    await expect(page.getByText("Parsed Draft")).toBeVisible();

    // Clear amount
    await page.getByLabel("Amount").fill("");
    await page.getByRole("button", { name: "Confirm Locally" }).click();

    await expect(
      page.getByText("Amount must be a positive number."),
    ).toBeVisible();
  });

  test("cancel clears draft card", async ({ page }) => {
    await page.getByPlaceholder(/e\.g\. Paid 350 baht/).fill(INPUT_TEXT);
    await page.getByRole("button", { name: "Parse with AI" }).click();

    await expect(page.getByText("Parsed Draft")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByText("Parsed Draft"),
    ).not.toBeVisible();
  });

  test("disabled states while loading", async ({ page }) => {
    // Make the API response slow so we can observe loading state
    await page.unroute(API_ENDPOINT);
    await page.route(API_ENDPOINT, async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ draft: MOCK_DRAFT }),
      });
    });

    await page.getByPlaceholder(/e\.g\. Paid 350 baht/).fill(INPUT_TEXT);
    await page.getByRole("button", { name: "Parse with AI" }).click();

    // When loading, the button shows a CircularProgress spinner.
    await expect(page.getByRole("progressbar")).toBeVisible();

    // Textarea should be disabled during loading
    await expect(
      page.getByPlaceholder(/e\.g\. Paid 350 baht/),
    ).toBeDisabled();

    // Wait for draft to appear (loading finished)
    await expect(page.getByText("Parsed Draft")).toBeVisible({ timeout: 10_000 });
  });
});
