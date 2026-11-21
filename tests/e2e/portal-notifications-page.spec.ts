import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { CLIENT_ONE_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Portal notifications (/portal/notifications)", () => {
  test.use({ storageState: CLIENT_ONE_STATE });

  test("renders the heading inside the portal shell", async ({ page }) => {
    await page.goto("/portal/notifications");

    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Client portal" })
        .getByRole("link", { name: "Notifications" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("the sidebar leads to company bugs and back to notifications", async ({
    page,
  }) => {
    await page.goto("/portal/notifications");
    const nav = page.getByRole("navigation", { name: "Client portal" });

    await nav.getByRole("link", { name: "Company bugs" }).click();
    await expect(page).toHaveURL(/\/portal$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Company bugs" })
    ).toBeVisible();

    await nav.getByRole("link", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/\/portal\/notifications$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" })
    ).toBeVisible();
  });

  test("the notifications page passes axe", async ({ page }) => {
    await page.goto("/portal/notifications");
    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
