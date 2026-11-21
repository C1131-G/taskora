import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { CLIENT_ONE_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Report a bug (/portal/new)", () => {
  test.use({ storageState: CLIENT_ONE_STATE });

  test("renders the heading and the first step of the report form", async ({
    page,
  }) => {
    await page.goto("/portal/new");

    await expect(
      page.getByRole("heading", { level: 1, name: "Report a bug" })
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Report progress" }).getByRole("listitem")
    ).toHaveText([
      /Summary/u,
      /Reproduction/u,
      /Impact and location/u,
      /Environment and evidence/u,
    ]);
    const summary = page.getByRole("region", { name: "Summary" });
    await expect(
      summary.getByRole("combobox", { name: "Project" })
    ).toBeVisible();
    await expect(summary.getByRole("textbox", { name: "Title" })).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("the sidebar leads to company bugs and the report link returns", async ({
    page,
  }) => {
    await page.goto("/portal/new");

    await page
      .getByRole("navigation", { name: "Client portal" })
      .getByRole("link", { name: "Company bugs" })
      .click();
    await expect(page).toHaveURL(/\/portal$/u);

    await page.getByRole("link", { name: "Report a bug" }).first().click();
    await expect(page).toHaveURL(/\/portal\/new/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Report a bug" })
    ).toBeVisible();
  });

  test("the report form passes axe", async ({ page }) => {
    await page.goto("/portal/new");
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
