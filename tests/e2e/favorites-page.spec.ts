import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Favorites (/favorites)", () => {
  test("renders the heading and both favorites sections", async ({ page }) => {
    await page.goto("/favorites");

    await expect(
      page.getByRole("heading", { level: 1, name: "Favorites" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: /^Projects \d+$/u })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: /^Tasks \d+$/u })
    ).toBeVisible();
  });

  test("the empty-state links lead to the project and task lists", async ({
    page,
  }) => {
    await page.goto("/favorites");
    // Nothing is starred in the seeded workspace, so the page offers a way out.
    const browseProjects = page.getByRole("link", { name: "Browse projects" });
    await expect(browseProjects).toHaveAttribute("href", "/projects");
    await expect(
      page.getByRole("link", { name: "Browse tasks" })
    ).toHaveAttribute("href", "/tasks");

    await browseProjects.click();
    await expect(page).toHaveURL(/\/projects$/u);
  });

  test("the favorites page passes axe", async ({ page }) => {
    await page.goto("/favorites");
    await expect(
      page.getByRole("heading", { level: 1, name: "Favorites" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
