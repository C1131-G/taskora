import { expect, test } from "@playwright/test";

// A public intake form is reachable only through an unguessable link that an
// admin creates (tests/e2e/intake-flow.spec.ts covers filing a report through
// one). The seeded forms use short slugs the page rejects, and creating a form
// would persist data, so this spec covers what a stranger sees without a valid
// link: the not-found state for slugs that match no enabled form.
const UNKNOWN_SLUG = "no-such-form-0123456789";
const TOO_SHORT_SLUG = "acme-bugs";

test.describe("Report a problem (/intake/[slug])", () => {
  // The page is public, so it is checked as a visitor with no session.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const [name, slug] of [
    ["a well-formed slug that matches no form", UNKNOWN_SLUG],
    ["a slug too short to be a real link", TOO_SHORT_SLUG],
  ] as const) {
    test(`${name} shows page not found with a way home`, async ({ page }) => {
      await page.goto(`/intake/${slug}`);

      await expect(
        page.locator("[data-sonner-toast]", { hasText: "Page not found." })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Go to home" })
      ).toBeVisible();
    });

    test(`${name} never shows the report form`, async ({ page }) => {
      await page.goto(`/intake/${slug}`);
      await expect(
        page.getByRole("link", { name: "Go to home" })
      ).toBeVisible();

      await expect(page.getByLabel("Title")).toHaveCount(0);
      await expect(page.getByLabel("Your email")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Send report" })
      ).toHaveCount(0);
    });
  }
});
