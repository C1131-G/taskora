import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Search (/search)", () => {
  test("renders the heading, the search box and the result groups", async ({
    page,
  }) => {
    await page.goto("/search?q=a");

    await expect(
      page.getByRole("heading", { level: 1, name: "Search" })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Search projects and tasks" })
    ).toHaveValue("a");
    await expect(
      page.getByRole("button", { exact: true, name: "Search" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Projects" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Tasks" })
    ).toBeVisible();
  });

  test("submitting a new query keeps it in the URL and narrows the results", async ({
    page,
  }) => {
    await page.goto("/search?q=a");
    const box = page.getByRole("textbox", {
      name: "Search projects and tasks",
    });
    const acme = page.getByRole("main").getByRole("link", {
      exact: true,
      name: "Acme Web Platform",
    });
    await expect(acme.first()).toBeVisible();

    await box.fill("Globex");
    await page.getByRole("button", { exact: true, name: "Search" }).click();

    await expect(page).toHaveURL(/q=Globex/u);
    await expect(
      page.getByRole("link", { name: "Globex Brand Refresh" }).first()
    ).toBeVisible();
    await expect(acme).toHaveCount(0);
  });

  test("the search page passes axe", async ({ page }) => {
    await page.goto("/search?q=a");
    await expect(
      page.getByRole("heading", { level: 1, name: "Search" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
