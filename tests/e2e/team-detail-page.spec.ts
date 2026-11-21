import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const openEngineering = async (page: Page) => {
  await page.goto("/teams");
  await page.getByRole("link", { name: /^Engineering/u }).click();
  await expect(page).toHaveURL(/\/teams\/[0-9a-f-]{36}$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "Engineering" })
  ).toBeVisible();
};

test.describe("Team detail (/teams/[teamId])", () => {
  test.use({ storageState: ADMIN_STATE });

  test("renders the team heading, actions, projects and open tasks", async ({
    page,
  }) => {
    await openEngineering(page);

    await expect(
      page.getByRole("button", { name: "Edit team Engineering" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add team member" })
    ).toBeVisible();
    const projects = page.getByRole("region", { name: "Projects" });
    await expect(
      projects.getByRole("heading", { level: 2, name: "Projects" })
    ).toBeVisible();
    await expect(
      projects.getByRole("link", { name: /^Acme Web Platform/u })
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Open tasks" })
        .getByRole("heading", { level: 2, name: "Open tasks" })
    ).toBeVisible();
  });

  test("a team project opens the project page and back returns to the team", async ({
    page,
  }) => {
    await openEngineering(page);
    const teamUrl = page.url();

    await page
      .getByRole("region", { name: "Projects" })
      .getByRole("link", { name: /^Acme Web Platform/u })
      .click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}/u);

    await page.goBack();
    await expect(page).toHaveURL(teamUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Engineering" })
    ).toBeVisible();
  });

  test("the team detail passes axe", async ({ page }) => {
    await openEngineering(page);
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
