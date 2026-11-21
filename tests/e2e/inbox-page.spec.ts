import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Inbox (/inbox)", () => {
  test("renders the heading, the type filters and the detail pane", async ({
    page,
  }) => {
    await page.goto("/inbox");

    await expect(
      page.getByRole("heading", { level: 1, name: "Inbox" })
    ).toBeVisible();
    const region = page.getByRole("region", { name: "Inbox notifications" });
    const filters = region.getByRole("navigation", {
      name: "Filter inbox by type",
    });
    await Promise.all(
      [/^All/u, /^Mentions/u, /^Assignments/u, /^Comments/u, /^Updates/u].map(
        (name) => expect(filters.getByRole("button", { name })).toBeVisible()
      )
    );
    await expect(
      filters.getByRole("button", { name: /^All/u })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      region.getByRole("complementary", { name: "Selected notification" })
    ).toBeVisible();
  });

  test("the type filters and the unread switch report their state", async ({
    page,
  }) => {
    await page.goto("/inbox");
    const filters = page.getByRole("navigation", {
      name: "Filter inbox by type",
    });
    const all = filters.getByRole("button", { name: /^All/u });
    const mentions = filters.getByRole("button", { name: /^Mentions/u });
    const unread = page.getByRole("switch", { name: "Unread only" });

    await mentions.click();
    await expect(mentions).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");

    await unread.click();
    await expect(unread).toBeChecked();
    await unread.click();
    await expect(unread).not.toBeChecked();

    await all.click();
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(mentions).toHaveAttribute("aria-pressed", "false");
  });

  test("the inbox page passes axe", async ({ page }) => {
    await page.goto("/inbox");
    await expect(
      page.getByRole("heading", { level: 1, name: "Inbox" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
