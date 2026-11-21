import { expect, test } from "@playwright/test";

test.describe("Set a new password (/change-password)", () => {
  // The form is only for a signed-in user who must change a temporary password,
  // and reaching it would need such an account (and changing it would persist).
  // Without a session the page is read-only reachable: it must send the visitor
  // to sign in, never show the password form.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a signed-out visit is sent to sign in without exposing the form", async ({
    page,
  }) => {
    await page.goto("/change-password");

    await page.waitForURL("**/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
    await expect(page.getByLabel("Temporary password")).toHaveCount(0);
    await expect(page.getByLabel("New password")).toHaveCount(0);
  });
});
