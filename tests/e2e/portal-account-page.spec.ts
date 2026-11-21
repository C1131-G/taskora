import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { CLIENT_ONE_STATE } from "./auth-state";
import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Portal account (/portal/account)", () => {
  test.use({ storageState: CLIENT_ONE_STATE });

  test("renders the profile, password, notification and device regions", async ({
    page,
  }) => {
    await page.goto("/portal/account");

    await expect(
      page.getByRole("heading", { level: 1, name: "Account" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Profile" }).getByText("Acme")
    ).toBeVisible();
    const password = page.getByRole("region", { name: "Change password" });
    await expect(password.getByLabel("Current password")).toBeVisible();
    await expect(
      password.getByLabel("New password", { exact: true })
    ).toBeVisible();
    await expect(password.getByLabel("Confirm new password")).toBeVisible();
    await expect(
      password.getByRole("button", { name: "Change password" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Push notifications" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Email updates" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Signed-in devices" })
        .getByRole("button", { name: /^Sign out /u })
        .first()
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Sign out" })
        .getByRole("button", { name: "Sign out" })
    ).toBeVisible();
  });

  test("the sidebar moves between Account and Notifications", async ({
    page,
  }) => {
    await page.goto("/portal/account");
    const nav = page.getByRole("navigation", { name: "Client portal" });

    await nav.getByRole("link", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/\/portal\/notifications$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" })
    ).toBeVisible();

    await nav.getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/portal\/account$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Account" })
    ).toBeVisible();
  });

  test("the account page passes axe", async ({ page }) => {
    await page.goto("/portal/account");
    await expect(
      page.getByRole("region", { name: "Signed-in devices" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
