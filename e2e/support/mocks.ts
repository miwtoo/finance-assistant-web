import type { Page, Route } from '@playwright/test';

/* ---------- URL patterns ---------- */

// Glob patterns catch any host/port so mocks work regardless of
// VITE_API_BASE_URL or local dev-server config.
export const PARSE_URL_PATTERN = '**/api/parse-expense';

// Catch-all for any unmocked API call — registered FIRST in setupDefaultMocks
// (lowest priority) so it only fires for unhandled paths.
export const API_GUARD_PATTERN = '**/api/**';

/* ---------- default mock data ---------- */

export const MOCK_DRAFT = {
  amount: 350,
  currency: 'THB',
  description: 'Lunch at food court',
  spentAt: '2026-06-06',
  merchant: 'Food Court',
  categoryHint: 'food',
  confidence: 0.95,
  rawText: 'Paid 350 baht for lunch at the food court today',
};

/* ---------- types ---------- */

export interface MockState {
  parseDelay?: number;
  parseError?: { status: number; body: Record<string, unknown> };
}

/* ---------- mock setup ---------- */

/**
 * Set up route mocks for parse endpoint with a fail-fast guard
 * for any unmocked API calls.
 *
 * Route handlers read from a mutable `mockState` reference so tests can
 * mutate `mockState` before triggering an action without re-registering.
 *
 * Registration order is intentional — catch-all guard FIRST, then specific
 * routes. Playwright checks routes in reverse registration order (last
 * registered wins). By registering the guard first, it becomes the lowest
 * priority, so specific parse mocks (registered after) are checked
 * first and only unhandled `/api/` calls reach the guard.
 */
export async function setupDefaultMocks(
  page: Page,
  mockState: MockState,
): Promise<void> {
  /* ---- fail-fast guard for any unmocked API call (register first = lowest priority) ---- */

  await page.route(API_GUARD_PATTERN, async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    throw new Error(
      `FAIL-FAST: Unmocked API request intercepted — ${method} ${url}. ` +
        `All API endpoints used in e2e tests must be explicitly mocked via ` +
        `setupDefaultMocks. If this is a new endpoint, add it to mocks.ts.`,
    );
  });

  /* ---- parse endpoint ---- */

  await page.route(PARSE_URL_PATTERN, async (route: Route) => {
    // Validate POST + body has non-empty "text"
    if (route.request().method() !== 'POST') {
      throw new Error(
        `Parse endpoint expected POST, got ${route.request().method()} — ${route.request().url()}`,
      );
    }

    const rawBody = route.request().postData();
    if (!rawBody) {
      // Missing body — fulfill 400 error, do not silently succeed
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: "Missing or invalid 'text' field" }),
      });
      return;
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    if (typeof body.text !== 'string' || !body.text.trim()) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: "Missing or invalid 'text' field" }),
      });
      return;
    }

    if (mockState.parseDelay && mockState.parseDelay > 0) {
      await new Promise((r) => setTimeout(r, mockState.parseDelay));
    }

    if (mockState.parseError) {
      await route.fulfill({
        status: mockState.parseError.status,
        contentType: 'application/json',
        body: JSON.stringify(mockState.parseError.body),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ draft: MOCK_DRAFT }),
    });
  });
}
