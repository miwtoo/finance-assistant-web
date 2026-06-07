import { Given, When, Then } from '../support/fixtures';

/* ---------- parse-mock configuration ---------- */

Given('the parse API will return a valid draft', async ({ mockState }) => {
  mockState.parseError = undefined;
  mockState.parseDelay = 0;
});

Given(
  'the parse API will return an error with status {int} and message {string}',
  async ({ mockState }, status: number, message: string) => {
    mockState.parseError = { status, body: { error: message } };
  },
);

Given(
  'the parse API will respond after {int} second(s)',
  async ({ mockState }, seconds: number) => {
    mockState.parseDelay = seconds * 1000;
    mockState.parseError = undefined;
  },
);

/* ---------- actions ---------- */

When('I type {string}', async ({ pageObject }, text: string) => {
  await pageObject.typeExpense(text);
});

When('I click {string}', async ({ pageObject }, buttonText: string) => {
  const actions: Record<string, () => Promise<void>> = {
    'Parse with AI': () => pageObject.clickParse(),
    Cancel: () => pageObject.clickCancel(),
    'Confirm Locally': () => pageObject.clickConfirmLocally(),
  };
  const action = actions[buttonText];
  if (!action) {
    throw new Error(`Unknown button label: "${buttonText}"`);
  }
  await action();
});

When('I change amount to {string}', async ({ pageObject }, value: string) => {
  await pageObject.changeAmount(value);
});

When('I change description to {string}', async ({ pageObject }, value: string) => {
  await pageObject.changeDescription(value);
});

When('I change the date to {string}', async ({ pageObject }, value: string) => {
  await pageObject.changeDate(value);
});

When('I change merchant to {string}', async ({ pageObject }, value: string) => {
  await pageObject.changeMerchant(value);
});

When('I change category to {string}', async ({ pageObject }, value: string) => {
  await pageObject.changeCategory(value);
});

When('I clear the amount field', async ({ pageObject }) => {
  await pageObject.clearAmount();
});

/* ---------- assertions ---------- */

Then(
  'I should see a parsed draft with amount {string}, currency {string}, description {string}, confidence {string}',
  async ({ pageObject }, amount: string, currency: string, description: string, confidence: string) => {
    await pageObject.expectDraftCardVisible();
    await pageObject.expectAmountValue(amount);
    await pageObject.expectCurrencyValue(currency);
    await pageObject.expectDescriptionValue(description);
    await pageObject.expectConfidenceText(confidence);
  },
);

Then('I should see an error {string}', async ({ pageObject }, message: string) => {
  await pageObject.expectErrorVisible(message);
});

Then(
  'I should see a validation error {string}',
  async ({ pageObject }, message: string) => {
    await pageObject.expectValidationError(message);
  },
);

Then('the date should be {string}', async ({ pageObject }, value: string) => {
  await pageObject.expectDateValue(value);
});

Then('the merchant should be {string}', async ({ pageObject }, value: string) => {
  await pageObject.expectMerchantValue(value);
});

Then('the category hint should be {string}', async ({ pageObject }, value: string) => {
  await pageObject.expectCategoryValue(value);
});

Then('the draft card should disappear', async ({ pageObject }) => {
  await pageObject.waitForDraftCardGone();
});

Then('I should not see the draft card', async ({ pageObject }) => {
  await pageObject.expectDraftCardNotVisible();
});

Then(
  'the parse button should show a spinner and be disabled',
  async ({ pageObject }) => {
    await pageObject.expectLoadingState();
  },
);

Then('the textarea should be disabled', async ({ pageObject }) => {
  await pageObject.expectInputDisabled();
});

Then('I should see a valid draft', async ({ pageObject }) => {
  await pageObject.expectDraftCardVisible();
});

When('the parse completes', async ({ pageObject }) => {
  await pageObject.waitForParseComplete();
  await pageObject.expectDraftCardVisible();
});

Then(
  'I should see {string} in the confirmed drafts section',
  async ({ pageObject }, text: string) => {
    await pageObject.expectTextInConfirmedDrafts(text);
  },
);
