import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Opens the first team on the list and returns its name.
const openFirstTeam = async (page: Page) => {
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
  return teamName;
};

test.describe("Team detail (/teams/[teamId])", () => {
  test.use({ storageState: ADMIN_STATE });

  test("renders the team heading, actions, projects and open tasks", async ({
    page,
  }) => {
    const teamName = await openFirstTeam(page);

    await expect(
      page.getByRole("button", { name: `Edit team ${teamName}` })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add team member" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Projects" })
        .getByRole("heading", { level: 2, name: "Projects" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Open tasks" })
        .getByRole("heading", { level: 2, name: "Open tasks" })
    ).toBeVisible();
  });

  test("back returns from the team to the teams list", async ({ page }) => {
    await openFirstTeam(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/teams$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Teams" })
    ).toBeVisible();
  });

  test("the team detail passes axe", async ({ page }) => {
    await openFirstTeam(page);
    await expect(
      page.getByRole("region", { name: "Open tasks" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
