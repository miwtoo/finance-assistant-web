import { test as base, createBdd } from "playwright-bdd";
import { FinanceAssistantPage } from "../pages/finance-assistant.page";
import type { MockState } from "./mocks";

/**
 * Extended test fixture with page object and mutable mock state.
 * Each scenario gets a fresh page, page object, and mockState.
 * Hooks are registered via Before/After (safe during bddgen loading).
 */
export const test = base.extend<{
  pageObject: FinanceAssistantPage;
  mockState: MockState;
}>({
  pageObject: async ({ page }, use) => {
    await use(new FinanceAssistantPage(page));
  },
  // eslint-disable-next-line no-empty-pattern -- playwright-bdd requires destructuring
  mockState: async ({ }, use) => {
    await use({});
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
