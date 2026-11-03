import { expect, test } from "@playwright/test";

test.describe("Error toasts (native validation)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("reports required fields without submitting the sign-in form", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator("form.auth-form")).toHaveAttribute(
      "data-hydrated",
      "true"
    );
    await page.getByRole("button", { exact: true, name: "Sign in" }).click();

    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: "Work email" })
    ).toBeVisible();
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: "Password" })
    ).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeFocused();
    await expect(page).toHaveURL(/\/login/u);
  });

  test("reports each failed sign-in attempt as a toast", async ({ page }) => {
    await page.route("**/api/auth/sign-in/email", (route) =>
      route.abort("failed")
    );
    await page.goto("/login");
    await expect(page.locator("form.auth-form")).toHaveAttribute(
      "data-hydrated",
      "true"
    );
    await page.getByLabel("Work email").fill("toast-test@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill("not-a-real-password");
    const submit = page.getByRole("button", { exact: true, name: "Sign in" });
    const errors = page.locator('[data-sonner-toast][data-type="error"]');

    await submit.click();
    await expect(errors).toHaveCount(1);
    await submit.click();
    await expect(errors).toHaveCount(2);
    await expect(page).toHaveURL(/\/login/u);
  });
});
