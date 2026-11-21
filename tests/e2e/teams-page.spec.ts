import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Teams (/teams)", () => {
  test.use({ storageState: ADMIN_STATE });

  test("renders the heading, the new team button and a card per team", async ({
    page,
  }) => {
    await page.goto("/teams");

    await expect(
      page.getByRole("heading", { level: 1, name: "Teams" })
    ).toBeVisible();
    await expect(page.getByText("Organize employees by team.")).toBeVisible();
    await expect(page.getByRole("button", { name: "New team" })).toBeVisible();
    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible();
    await expect(
      cards.first().getByRole("button", { name: /^Manage /u })
    ).toBeVisible();
    await expect(cards.first().getByRole("link").first()).toBeVisible();
  });

  test("a team card opens its detail page and back returns to the list", async ({
    page,
  }) => {
    await page.goto("/teams");

    const link = page.getByRole("article").first().getByRole("link").first();
    const nameText = await link.locator("strong").textContent();
    const teamName = nameText?.trim() ?? "";
    expect(teamName).not.toBe("");
    await link.click();
    await expect(page).toHaveURL(/\/teams\/[0-9a-f-]{36}$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: teamName })
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/teams$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Teams" })
    ).toBeVisible();
  });

  test("the teams page passes axe", async ({ page }) => {
    await page.goto("/teams");
    await expect(page.getByRole("article").first()).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
