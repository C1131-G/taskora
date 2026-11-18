import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

interface PortalReport {
  readonly actual: string;
  readonly expected: string;
  readonly firstStep: string;
  readonly pageUrl: string;
  readonly title: string;
}

const continueTo = async (page: Page, step: string) => {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: step })
  ).toBeVisible();
};

// Walks the four-step report wizard on /portal/new up to its last step,
// "Environment and evidence", where screenshots and files are attached.
const fillPortalReport = async (page: Page, report: PortalReport) => {
  await page.goto("/portal/new");
  await page.getByRole("combobox", { name: "Project" }).click();
  await page.getByRole("option", { name: "Acme Web App" }).click();
  await page.getByLabel("Title").fill(report.title);

  await continueTo(page, "Reproduction");
  await page.getByRole("textbox", { name: "Step 1" }).fill(report.firstStep);
  await page.getByLabel("Expected behavior").fill(report.expected);
  await page.getByLabel("Actual behavior").fill(report.actual);

  await continueTo(page, "Impact and location");
  await page.getByLabel("Page URL").fill(report.pageUrl);
  await page.getByRole("radio", { name: /High/u }).check();

  await continueTo(page, "Environment and evidence");
};

export { fillPortalReport };
