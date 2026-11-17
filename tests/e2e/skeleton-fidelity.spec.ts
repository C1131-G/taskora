import { expect as baseExpect, test } from "@playwright/test";

// Loading the data behind these routes can take longer than the default 5
// seconds on a busy dev server.
const expect = baseExpect.configure({ timeout: 30_000 });

// A skeleton is a promise about the loaded layout: it must hold its place, so
// nothing moves when the data lands. Each route below was measured against its
// loaded page at phone and desktop widths. The tolerance is far below the
// movement a skeleton with the wrong header, toolbar or panel chrome causes.
// That the skeleton commits in the static shell is guarded per route by the
// *-instant-flow specs.
const MAX_SHIFT = 0.005;
const SETTLE_MS = 1500;

const ROUTES = [
  "/budgets",
  "/bug-approvals",
  "/inbox",
  "/my-time",
  "/overview",
  "/settings/github",
  "/settings/webhooks",
  "/timeline",
] as const;

const VIEWPORTS = [
  { height: 844, width: 390 },
  { height: 800, width: 1280 },
] as const;

interface ShiftStore {
  __shift: number;
}

const watchLayoutShift = () => {
  const store = window as unknown as ShiftStore;
  store.__shift = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      };
      if (!shift.hadRecentInput) {
        store.__shift += shift.value;
      }
    }
  }).observe({ buffered: true, type: "layout-shift" });
};

for (const path of ROUTES) {
  for (const { height, width } of VIEWPORTS) {
    test(`${path} does not shift when its data lands at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ height, width });
      await page.addInitScript(watchLayoutShift);

      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator("main output[aria-busy='true']:visible")
      ).toHaveCount(0);
      // Late reveals and fonts settle before the total is read.
      await page.waitForTimeout(SETTLE_MS);

      const shift = await page.evaluate(
        () => (window as unknown as ShiftStore).__shift
      );
      expect(shift).toBeLessThan(MAX_SHIFT);
    });
  }
}
