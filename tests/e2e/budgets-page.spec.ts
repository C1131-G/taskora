import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const COLUMNS = ["Project", "Type", "Spent", "Remaining", "Used", "Status"];

test.describe("Budgets (/budgets)", () => {
  test("renders the heading and the budget table or its empty state", async ({
    page,
  }) => {
    await page.goto("/budgets");

    await expect(
      page.getByRole("heading", { level: 1, name: "Budgets" })
    ).toBeVisible();
    // A workspace with budgets lists them; one without shows the empty message.
    const table = page.getByRole("table");
    const empty = page.getByText("No project has an hours budget yet.");
    await expect(table.or(empty)).toBeVisible();
    if (await table.isVisible()) {
      await Promise.all(
        COLUMNS.map((name) =>
          expect(table.getByRole("columnheader", { name })).toBeVisible()
        )
      );
    }
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
