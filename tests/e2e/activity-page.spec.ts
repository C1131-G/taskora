import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Activity (/activity)", () => {
  test("renders the heading and the activity filters", async ({ page }) => {
    await page.goto("/activity");

    await expect(
      page.getByRole("heading", { level: 1, name: "Activity" })
    ).toBeVisible();
    const region = page.getByRole("region", { name: "Workspace activity" });
    const filters = region.getByRole("tablist", { name: "Filter activity" });
    await Promise.all(
      ["All", "Status changes", "Comments", "Projects"].map((name) =>
        expect(filters.getByRole("tab", { name })).toBeVisible()
      )
    );
    await expect(filters.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(
      region.getByRole("button", { name: "Filter by person: Everyone" })
    ).toBeVisible();
    await expect(region.getByRole("article").first()).toBeVisible();
  });

  test("choosing a filter tab selects it and All selects it back", async ({
    page,
  }) => {
    await page.goto("/activity");
    const filters = page.getByRole("tablist", { name: "Filter activity" });
    const all = filters.getByRole("tab", { name: "All" });
    const projects = filters.getByRole("tab", { name: "Projects" });
    await expect(all).toHaveAttribute("aria-selected", "true");

    // The tabs are inert until hydration; retry the click until it lands.
    await expect(async () => {
      await projects.click();
      await expect(projects).toHaveAttribute("aria-selected", "true", {
        timeout: 1000,
      });
    }).toPass();
    await expect(page).toHaveURL(/activity=projects/u);
    await expect(all).toHaveAttribute("aria-selected", "false");

    await all.click();
    await expect(all).toHaveAttribute("aria-selected", "true");
    await expect(projects).toHaveAttribute("aria-selected", "false");
  });

  test("the activity page passes axe", async ({ page }) => {
    await page.goto("/activity");
    await expect(
      page.getByRole("heading", { level: 1, name: "Activity" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
