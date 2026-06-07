import { Given, When } from '../support/fixtures';

/* ---------- Background / setup ---------- */

Given('the page is loaded', async () => {
  // Precondition verified in beforeEach hook (steps/hooks.ts) — documents the precondition in Gherkin.
});

Given('the parse API responds successfully', async () => {
  // Default mocks already set up in beforeEach hook — documents precondition.
});

/* ---------- navigation ---------- */

When('I reload the page', async ({ pageObject }) => {
  await pageObject.reload();
});
