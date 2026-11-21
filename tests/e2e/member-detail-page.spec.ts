import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Opens the first member on the directory and returns their name.
const openMember = async (page: Page) => {
  await page.goto("/members");
  const link = page.getByRole("main").locator('a[href^="/members/"]').first();
  await expect(link).toBeVisible();
  const nameText = await link.locator("strong").textContent();
  const memberName = nameText?.trim() ?? "";
  expect(memberName).not.toBe("");
  await link.click();
  await expect(page).toHaveURL(/\/members\/[0-9a-f-]{36}$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: memberName })
  ).toBeVisible();
  return memberName;
};

test.describe("Member detail (/members/[employeeId])", () => {
  test.use({ storageState: ADMIN_STATE });

  test("renders the profile header, summary and work regions", async ({
    page,
  }) => {
    await openMember(page);

    await expect(page.getByRole("link", { name: /@/u }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copy email address" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Assign task" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Member work summary" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Assigned tasks" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Active projects" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Recent activity" })
    ).toBeVisible();
  });

  test("the task filter keeps the tab in the URL", async ({ page }) => {
    await openMember(page);
    const filters = page.getByRole("navigation", {
      name: "Member task filters",
    });
    const completed = filters.getByRole("link", { name: /^Completed/u });
    await expect(
      page.getByRole("region", { name: "Assigned tasks" })
    ).toBeVisible();

    await completed.click();
    await expect(page).toHaveURL(/tab=completed/u, { timeout: 15_000 });
    await expect(completed).toHaveAttribute("aria-current", "page");

    await filters.getByRole("link", { name: /^Assigned/u }).click();
    await expect(page).toHaveURL(/tab=assigned/u, { timeout: 15_000 });
  });

  test("the back link returns to the members directory", async ({ page }) => {
    await openMember(page);

    await page.getByRole("link", { name: "All members" }).click();
    await expect(page).toHaveURL(/\/members$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Members" })
    ).toBeVisible();
  });

  test("the member profile passes axe", async ({ page }) => {
    await openMember(page);
    await expect(
      page.getByRole("region", { name: "Recent activity" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
