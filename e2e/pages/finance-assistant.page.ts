import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Page Object for the Finance Assistant single-page app.
 * Encapsulates all selectors, actions, and assertions.
 * Steps call these methods — no raw locators in step definitions.
 */
export class FinanceAssistantPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /* ==================== navigation ==================== */

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  /* ==================== locators ==================== */

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Finance Assistant' });
  }

  get input(): Locator {
    return this.page.getByPlaceholder(/e\.g\. Paid 350 baht/);
  }

  get parseButton(): Locator {
    return this.page.getByRole('button', { name: /^Parse with AI$/ });
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  get confirmButton(): Locator {
    return this.page.getByRole('button', { name: 'Confirm Locally' });
  }

  get draftCardHeading(): Locator {
    return this.page.getByText('Parsed Draft');
  }

  get confidenceChip(): Locator {
    return this.page.getByText(/Confidence:/);
  }

  // Error/validation alerts are located via text matching in expectErrorVisible
  // and expectValidationError, which use the `.text(message)` fallback.
  // These CSS-free selectors avoid depending on MUI internal class names.

  get spinner(): Locator {
    return this.page.getByRole('progressbar');
  }

  /**
   * Scoped locator for the confirmed-drafts section.
   * All "in the confirmed drafts section" assertions use this as parent,
   * avoiding fuzzy global text matches.
   */
  get confirmedDraftsSection(): Locator {
    return this.page.getByText(/Confirmed Drafts/).locator('..');
  }

  /* — form fields — */

  get amountInput(): Locator {
    return this.page.getByLabel('Amount');
  }

  get currencyInput(): Locator {
    return this.page.getByLabel('Currency');
  }

  get descriptionInput(): Locator {
    return this.page.getByLabel('Description');
  }

  get dateInput(): Locator {
    return this.page.getByLabel('Date (YYYY-MM-DD)');
  }

  get merchantInput(): Locator {
    return this.page.getByLabel('Merchant (optional)');
  }

  get categoryInput(): Locator {
    return this.page.getByLabel('Category Hint (optional)');
  }

  /* ==================== actions ==================== */

  async typeExpense(text: string): Promise<void> {
    await this.input.fill(text);
  }

  async clickParse(): Promise<void> {
    await this.parseButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickConfirmLocally(): Promise<void> {
    await this.confirmButton.click();
  }

  async changeAmount(value: string): Promise<void> {
    await this.amountInput.fill(value);
  }

  async changeDescription(value: string): Promise<void> {
    await this.descriptionInput.fill(value);
  }

  async changeDate(value: string): Promise<void> {
    await this.dateInput.fill(value);
  }

  async changeMerchant(value: string): Promise<void> {
    await this.merchantInput.fill(value);
  }

  async changeCategory(value: string): Promise<void> {
    await this.categoryInput.fill(value);
  }

  async clearAmount(): Promise<void> {
    await this.amountInput.fill('');
  }

  /* ==================== wait helpers ==================== */

  async waitForDraftCard(timeout = 10_000): Promise<void> {
    await expect(this.draftCardHeading).toBeVisible({ timeout });
  }

  async waitForDraftCardGone(timeout = 5_000): Promise<void> {
    await expect(this.draftCardHeading).not.toBeVisible({ timeout });
  }

  async waitForConfirmedDraft(timeout = 5_000): Promise<void> {
    await expect(this.confirmedDraftsSection).toBeVisible({ timeout });
  }

  async waitForParseComplete(timeout = 10_000): Promise<void> {
    await expect(this.spinner).not.toBeVisible({ timeout });
  }

  /* ==================== assertions ==================== */

  async expectHeadingVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectDraftCardVisible(): Promise<void> {
    await expect(this.draftCardHeading).toBeVisible();
  }

  async expectDraftCardNotVisible(): Promise<void> {
    await expect(this.draftCardHeading).not.toBeVisible();
  }

  async expectInputDisabled(): Promise<void> {
    await expect(this.input).toBeDisabled();
  }

  async expectLoadingState(): Promise<void> {
    // During loading the parse button renders a CircularProgress.
    // The accessible name changes from "Parse with AI" to empty,
    // so we check the progressbar element and the disabled textarea.
    await expect(this.spinner).toBeVisible();
    await expect(this.input).toBeDisabled();
    // Also assert the Parse button (with spinner inside) is disabled.
    const loadingButton = this.page.getByRole('button').filter({ has: this.spinner });
    await expect(loadingButton).toBeDisabled();
  }

  async expectAmountValue(value: string): Promise<void> {
    await expect(this.amountInput).toHaveValue(value);
  }

  async expectCurrencyValue(value: string): Promise<void> {
    await expect(this.currencyInput).toHaveValue(value);
  }

  async expectDescriptionValue(value: string): Promise<void> {
    await expect(this.descriptionInput).toHaveValue(value);
  }

  async expectConfidenceText(text: string): Promise<void> {
    await expect(this.confidenceChip).toContainText(text);
  }

  async expectDateValue(value: string): Promise<void> {
    await expect(this.dateInput).toHaveValue(value);
  }

  async expectMerchantValue(value: string): Promise<void> {
    await expect(this.merchantInput).toHaveValue(value);
  }

  async expectCategoryValue(value: string): Promise<void> {
    await expect(this.categoryInput).toHaveValue(value);
  }

  async expectErrorVisible(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  async expectValidationError(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: false })).toBeVisible();
  }

  /**
   * Assert that text appears somewhere within the confirmed-drafts section.
   * Scoped to the parent container of the "Confirmed Drafts" heading,
   * avoiding false positives from other parts of the page.
   */
  async expectTextInConfirmedDrafts(text: string): Promise<void> {
    await expect(this.confirmedDraftsSection.getByText(text, { exact: false })).toBeVisible();
  }
}
