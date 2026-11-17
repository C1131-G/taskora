import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

import { ADMIN_STATE } from "./tests/e2e/auth-state";

config({ path: ".env.e2e.local", quiet: true });

const baseURL = process.env["E2E_BASE_URL"] ?? "http://localhost:3000";
const chromiumPath = process.env["E2E_CHROMIUM_PATH"];

export default defineConfig({
  forbidOnly: Boolean(process.env["CI"]),
  fullyParallel: false,
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/u },
    {
      dependencies: ["setup"],
      name: "chromium",
      testIgnore: /auth\.setup\.ts/u,
      use: {
        ...devices["Desktop Chrome"],
        // Specs start signed in; the smoke spec opts out to test the login form.
        storageState: existsSync(ADMIN_STATE) ? ADMIN_STATE : undefined,
      },
    },
  ],
  reporter: [["list"]],
  // Flaky tests must be fixed, not retried into a green run.
  retries: 0,
  // CI runs a production build, so routes need no dev-compile headroom;
  // 30s is Playwright's default and keeps genuine hangs loud.
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
    trace: "retain-on-failure",
  },
});
