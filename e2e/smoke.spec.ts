import { test, expect } from "@playwright/test";

test("home page shows Finance Assistant heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Finance Assistant" }),
  ).toBeVisible();
});
