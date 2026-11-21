import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const RECEIVED_PATH = "/intake/any-public-form-slug/received";
const HEADING = "Thank you, your report was received";

test.describe("Report received (/intake/[slug]/received)", () => {
  // The page is public, so it is checked as a visitor with no session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows the thank-you heading and the reference from the address", async ({
    page,
  }) => {
    await page.goto(`${RECEIVED_PATH}?ref=INT-AB12CD34`);

    await expect(page.getByRole("heading", { name: HEADING })).toBeVisible();
    await expect(
      page.getByText("The team has been told and will review it.")
    ).toBeVisible();
    await expect(page.getByTestId("intake-reference")).toHaveText(
      "INT-AB12CD34"
    );
  });

  test("shows no reference when the address carries none", async ({ page }) => {
    await page.goto(RECEIVED_PATH);

    await expect(page.getByRole("heading", { name: HEADING })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByTestId("intake-reference")).toHaveCount(0);
  });

  test("ignores a reference that does not have the exact shape", async ({
    page,
  }) => {
    await page.goto(`${RECEIVED_PATH}?ref=<b>INT-AB12CD34</b>`);

    await expect(page.getByRole("heading", { name: HEADING })).toBeVisible();
    await expect(page.getByTestId("intake-reference")).toHaveCount(0);
    await expect(page.getByText("Your reference is")).toHaveCount(0);
  });

  test("the page passes WCAG A and AA checks", async ({ page }) => {
    await page.goto(`${RECEIVED_PATH}?ref=INT-AB12CD34`);
    await expect(page.getByTestId("intake-reference")).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
});
