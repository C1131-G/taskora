import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { CLIENT_ONE_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// The seeded client companies have no bug reports and these specs never create
// data, so this covers the not-found state for a bug the company cannot see.
// The all-zero id is a valid UUID that no record uses.
const MISSING_BUG_PATH = "/portal/bugs/00000000-0000-4000-8000-000000000000";

test.describe("Portal bug detail (/portal/bugs/[bugId])", () => {
  test.use({ storageState: CLIENT_ONE_STATE });

  test("a bug the company cannot see shows the not-found state", async ({
    page,
  }) => {
    await page.goto(MISSING_BUG_PATH);

    await expect(
      page.getByRole("main").getByRole("link", { name: "Go to company bugs" })
    ).toBeVisible();
    await expect(page).toHaveURL(MISSING_BUG_PATH);
  });

  test("the not-found link returns to the company bugs list", async ({
    page,
  }) => {
    await page.goto(MISSING_BUG_PATH);

    await page
      .getByRole("main")
      .getByRole("link", { name: "Go to company bugs" })
      .click();
    await expect(page).toHaveURL(/\/portal$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Company bugs" })
    ).toBeVisible();
  });

  test("the not-found state passes axe", async ({ page }) => {
    await page.goto(MISSING_BUG_PATH);
    await expect(
      page.getByRole("main").getByRole("link", { name: "Go to company bugs" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
