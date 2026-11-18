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
  // Real CI runs showed 30s produces spurious failures on slow page loads and
  // drawer interactions; 120s is the measured floor for this suite. Retries
  // are still 0 and per-test bounds stay tight, so hangs remain loud.
  testDir: "tests/e2e",
  timeout: 120_000,
  use: {
    baseURL,
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
    trace: "retain-on-failure",
  },
});
