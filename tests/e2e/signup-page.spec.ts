import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Request access (/signup)", () => {
  // Auth pages are for signed-out visitors, so these specs start without a session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows the heading and the three steps to get an account", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Request access" })
    ).toBeVisible();
    await expect(
      page.getByText("Taskora accounts are created by an administrator.")
    ).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveText([
      /Ask your administrator/u,
      /Get your sign-in details/u,
      /Set your own password/u,
    ]);
  });

  test("offers no form, so nothing can create an account here", async ({
    page,
  }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: "Request access" })
    ).toBeVisible();

    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign up" })).toHaveCount(0);
  });

  test("Back to sign in leads to the sign-in page", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: "Back to sign in" }).click();

    await page.waitForURL("**/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
  });

  test("the Already have an account link leads to the sign-in page", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page
      .getByText("Already have an account?")
      .getByRole("link", { name: "Sign in" })
      .click();

    await page.waitForURL("**/login");
    await expect(page.getByLabel("Work email")).toBeVisible();
  });

  test("the page passes WCAG A and AA checks", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: "Request access" })
    ).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
});
