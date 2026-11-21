import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Budgets (/budgets)", () => {
  test("renders the heading and the budget table", async ({ page }) => {
    await page.goto("/budgets");

    await expect(
      page.getByRole("heading", { level: 1, name: "Budgets" })
    ).toBeVisible();
    const table = page.getByRole("table");
    await Promise.all(
      ["Project", "Type", "Spent", "Remaining", "Used", "Status"].map((name) =>
        expect(table.getByRole("columnheader", { name })).toBeVisible()
      )
    );
    // The header row plus at least one budgeted project.
    await expect(table.getByRole("row")).not.toHaveCount(1);
  });

  test("a project row links to that project's time page", async ({ page }) => {
    await page.goto("/budgets");
    const link = page.getByRole("table").getByRole("link").first();
    await expect(link).toHaveAttribute("href", /^\/projects\/[^/]+\/time$/u);

    await link.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/time$/u);
  });

  test("the budgets page passes axe", async ({ page }) => {
    await page.goto("/budgets");
    await expect(
      page.getByRole("heading", { level: 1, name: "Budgets" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
