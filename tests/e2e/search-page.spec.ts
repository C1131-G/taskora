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
    // Whatever the workspace holds, a query with the letter "a" finds something
    // and a nonsense one finds nothing.
    const first = page
      .getByRole("main")
      .getByRole("link")
      .filter({ hasText: /\S/u })
      .first();
    await expect(first).toBeVisible();
    const firstName = ((await first.textContent()) ?? "").trim();
    expect(firstName).not.toBe("");

    await box.fill("qqzzxx");
    await page.getByRole("button", { exact: true, name: "Search" }).click();

    await expect(page).toHaveURL(/q=qqzzxx/u);
    await expect(box).toHaveValue("qqzzxx");
    await expect(
      page.getByRole("main").getByRole("link", { exact: true, name: firstName })
    ).toHaveCount(0);
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
