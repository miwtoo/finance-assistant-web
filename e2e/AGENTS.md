# finance-assistant-web-e2e — Agent Guide

## Identity

Isolated E2E test suite for finance-assistant-web. playwright-bdd generates Playwright specs from Gherkin feature files. Playwright handles browser lifecycle. Pure test infra, not app/library/service.

Owns: `features/`, `steps/`, `pages/`, `support/`, `playwright.config.ts`, `tsconfig.json`, `package.json`, `bun.lock`, `smoke.spec.ts`.

Does not own: React app code, unit tests, web `package.json` deps (except delegation scripts).

## Bootstrap / CI

Two separate installs — parent Vite deps and e2e deps are independent:

```
cd finance-assistant-web   # web root
bun install                # Vite + React deps
cd e2e
bun install                # Playwright + playwright-bdd deps
bun run browsers:install   # Chromium browser binary
```

From web root: `bun run e2e:install` delegates to `browsers:install`.

CI needs all three steps. No workspace symlink — own `node_modules`.

## Commands

### From e2e cwd
- `bun install`
- `bun run e2e` — generate BDD specs (`bddgen test`) + run all Playwright projects (BDD scenarios + smoke spec)
- `bun run e2e:gen` — generate/validate BDD specs via `bddgen test --verbose`; not dry-run, writes `.features-gen/`
- `bun run e2e:ui` — generate + Playwright UI mode (scenario browser, watch automation)
- `bun run e2e:headed` — generate + headed Playwright run
- `bun run e2e:playwright` — standalone smoke spec (`playwright test --project=smoke`)
- `bun run browsers:install` — Playwright browsers (chromium)
- `bun run typecheck` — `tsc --noEmit`

### From web root
- `bun run e2e` — delegates to e2e/
- `bun run e2e:gen` — generate/validate BDD specs via `bddgen test --verbose`
- `bun run e2e:headed` — generate + headed Playwright run
- `bun run e2e:install` — browsers:install
- `bun run e2e:ui` — delegates to e2e/ for UI mode
- `bun run typecheck:e2e` — typecheck

Owned in e2e package. Web root just delegates via `cd e2e && bun run ...`.

## Layer Rules

- **features/**: Gherkin behavior specs only. No logic.
- **steps/**: Thin glue. Import BDD exports from `support/fixtures`. Call page object methods. No raw locators/routes.
- **steps/hooks.ts**: Per-scenario setup via `Before`. Wire route mocks via `setupDefaultMocks`, then navigate + assert heading visible.
- **pages/**: Selectors, actions, assertions. Prefer accessible selectors (role/label) over CSS/MUI class.
- **support/fixtures.ts**: `test` base with custom fixtures (`pageObject`, `mockState`). Exports `Given`, `When`, `Then`, `Before`, `After` via `createBdd(test)`. Owns BDD exports, not hooks.
- **support/mocks.ts**: All API mocks + fail-closed guard.
- **playwright.config.ts**: Browser/context/webServer lifecycle via `defineConfig`. Screenshots (`only-on-failure`) and traces (`on-first-retry`) configured here, not in test hooks.

## Hard Constraints

- **Backend mocked always.** Fail-fast guard catches unmocked `/api/**`.
- No real Firefly write or ledger assertion.
- No auth flows.
- Scope: already-paid THB expenses, one-shot parse → editable draft → local confirm → local persistence.
- No income, transfers, credit, debt, installments, foreign cash.
- No sync-to-ledger scenarios unless user explicitly expands MVP.
- No secrets. Do not read/write `.env`.

## MVP Scope Note

App has pre-existing sync UI / Firefly III integration code (from broader application). e2e MVP deliberately excludes scenarios for sync, ledger write, or Firefly interaction. Only local draft capture → confirm flow. User must expand scope explicitly.

## Package Boundary

- Owns deps: `@playwright/test`, `playwright-bdd`, `typescript`, `@types/node`.
- Do not add deps without asking.
- Do not import from `../src` or parent `node_modules`. Duplicate small test type or ask.
- Do not dirty web `package.json` except thin delegation scripts when explicitly needed.
- No Bun workspace refactor.

## BDD & Playwright Architecture

- `playwright-bdd` (`defineBddConfig` + `createBdd`) replaces raw `@cucumber/cucumber`.
- `defineBddConfig` in `playwright.config.ts` maps `features/` + `steps/` → `.features-gen/` (gitignored) as Playwright test specs.
- `playwright.config.ts` owns browser/context/webServer lifecycle — no manual hooks.
  - `webServer` starts Vite dev server from web root (`..`) on `127.0.0.1:5173`.
  - Screenshots `only-on-failure`, trace `on-first-retry`.
  - Two projects: `chromium` (generated BDD specs) and `smoke` (standalone spec).
- `support/fixtures.ts` provides `test` with custom fixtures (`pageObject`, `mockState`) and exports `Given`, `When`, `Then`, `Before`, `After` via `createBdd(test)`.
- `steps/hooks.ts` registers `Before` for per-scenario mock wiring + navigation.
- `bun run e2e` runs both projects: BDD scenarios from `.features-gen/` + `smoke.spec.ts`.
- Running `bun run e2e:ui` opens Playwright UI where Gherkin scenarios are visible and automation clicks/steps can be watched.

## Definition of Done

1. `bun run typecheck` — passes
2. `bun run e2e:gen` — passes (generates `.features-gen/` cleanly)
3. `bun run e2e` — passes (or known skip documented)
4. If touching Playwright config/specs or smoke test: `bun run e2e:playwright` passes
5. `git status --short` clean in e2e/, web/, root. If web changed, remember root submodule pointer.

## Anti-patterns

- `page.route` in steps (use mocks.ts)
- `page.reload` for reset (fresh context handles it; reload only for persistence tests)
- CSS/MUI class selectors when role/label works
- Global mutable scenario state
- Real backend dependency
- Over-broad fuzzy text assertions; scope to section/card
