import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const isCI = !!process.env.CI;

const bddTestDir = defineBddConfig({
  features: "features/*.feature",
  steps: ["support/fixtures.ts", "steps/**/*.ts"],
  outputDir: ".features-gen",
});

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testDir: bddTestDir,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke",
      testMatch: "smoke.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "vite --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !isCI,
    cwd: "..",
  },
});
