import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Archive (/archive)", () => {
  test("renders the heading and the archived work tabs", async ({ page }) => {
    await page.goto("/archive");

    await expect(
      page.getByRole("heading", { level: 1, name: "Archive" })
    ).toBeVisible();
    const region = page.getByRole("region", { name: "Archived work" });
    const tabs = region.getByRole("tablist", {
      name: "Choose archived work type",
    });
    await expect(
      tabs.getByRole("tab", { name: /^Tasks \d+$/u })
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      tabs.getByRole("tab", { name: /^Projects \d+$/u })
    ).toBeVisible();
    await expect(
      region
        .getByRole("tabpanel")
        .getByRole("button", { name: "Restore" })
        .first()
    ).toBeVisible();
  });

  test("switching to Projects shows that panel and Tasks brings the tasks back", async ({
    page,
  }) => {
    await page.goto("/archive");
    const tabs = page.getByRole("tablist", {
      name: "Choose archived work type",
    });
    const tasks = tabs.getByRole("tab", { name: /^Tasks \d+$/u });
    const projects = tabs.getByRole("tab", { name: /^Projects \d+$/u });

    await projects.click();
    await expect(projects).toHaveAttribute("aria-selected", "true");
    await expect(tasks).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName(
      /^Projects \d+$/u
    );

    await tasks.click();
    await expect(tasks).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName(
      /^Tasks \d+$/u
    );
  });

  test("the archive page passes axe", async ({ page }) => {
    await page.goto("/archive");
    await expect(
      page.getByRole("heading", { level: 1, name: "Archive" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
