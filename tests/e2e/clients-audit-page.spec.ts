import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleAnimations } from "./settle-animations";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Client audit log (/clients/audit)", () => {
  test("renders the heading, locked accounts, filters and the events table", async ({
    page,
  }) => {
    await page.goto("/clients/audit");

    await expect(
      page.getByRole("heading", { level: 1, name: "Audit log" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "All clients" })
    ).toHaveAttribute("href", "/clients");
    await expect(
      page.getByRole("region", { name: "Locked accounts" })
    ).toBeVisible();
    const form = page.getByRole("form", { name: "Filter audit events" });
    await expect(form.getByRole("combobox", { name: "Event" })).toBeVisible();
    await expect(form.getByRole("searchbox", { name: "Person" })).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Apply filters" })
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Audit events, newest first" })
    ).toBeVisible();
  });

  test("filtering by event keeps it in the URL and Reset clears it", async ({
    page,
  }) => {
    await page.goto("/clients/audit");
    const form = page.getByRole("form", { name: "Filter audit events" });
    const table = page.getByRole("table", {
      name: "Audit events, newest first",
    });

    await form
      .getByRole("combobox", { name: "Event" })
      .selectOption({ label: "Signed in" });
    await form.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/type=login_succeeded/u);
    await expect(
      table.getByRole("cell", { exact: true, name: "Signed in" }).first()
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { exact: true, name: "Sign-in failed" })
    ).toHaveCount(0);

    await form.getByRole("link", { name: "Reset" }).click();
    await expect(page).toHaveURL(/\/clients\/audit$/u);
  });

  test("the client audit log page passes axe", async ({ page }) => {
    await page.goto("/clients/audit");
    await expect(
      page.getByRole("heading", { level: 1, name: "Audit log" })
    ).toBeVisible();
    await settleAnimations(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
