import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Notifications (/notifications)", () => {
  test("renders the heading, the filter tabs and the preferences link", async ({
    page,
  }) => {
    await page.goto("/notifications");

    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" })
    ).toBeVisible();
    const region = page.getByRole("region", {
      name: "Workspace notifications",
    });
    const tabs = region.getByRole("tablist", { name: "Filter notifications" });
    await expect(tabs.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(tabs.getByRole("tab", { name: "Unread" })).toBeVisible();
    await expect(
      region.getByRole("button", { name: "Mark all as read" })
    ).toBeVisible();
    await expect(
      region.getByRole("link", { name: "Notification preferences" })
    ).toHaveAttribute("href", "/settings?section=preferences");
  });

  test("the Unread tab selects and All selects the list back", async ({
    page,
  }) => {
    await page.goto("/notifications");
    const tabs = page.getByRole("tablist", { name: "Filter notifications" });
    const all = tabs.getByRole("tab", { name: "All" });
    const unread = tabs.getByRole("tab", { name: "Unread" });

    await unread.click();
    await expect(unread).toHaveAttribute("aria-selected", "true");
    await expect(all).toHaveAttribute("aria-selected", "false");

    await all.click();
    await expect(all).toHaveAttribute("aria-selected", "true");
    await expect(unread).toHaveAttribute("aria-selected", "false");
  });

  test("the notifications page passes axe", async ({ page }) => {
    await page.goto("/notifications");
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
