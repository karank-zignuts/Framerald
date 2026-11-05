import { defineConfig, devices } from "@playwright/test";

// Port 3100 so e2e never collides with other local projects on :3000.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// A second server with the password gate switched on, for e2e/auth-gate.spec.ts. The main suite stays open.
const AUTH_PORT = Number(process.env.E2E_AUTH_PORT ?? 3101);
const AUTH_URL = `http://localhost:${AUTH_PORT}`;
const chrome = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
  // System Chrome by default; E2E_USE_BUNDLED_CHROMIUM=1 for machines without it.
  ...(process.env.E2E_USE_BUNDLED_CHROMIUM === "1" ? {} : { channel: "chrome" }),
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  workers: 2, // dev server compiles on demand; more workers cause slow first paint and flaky waits
  retries: 0,
  timeout: 90_000, // the dev server compiles each route on its first visit
  expect: { timeout: 15_000 },
  // Terse output keeps token cost low: only failures print detail.
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: "chromium", testIgnore: /auth-gate\.spec\.ts/, use: chrome },
    { name: "auth-gate", testMatch: /auth-gate\.spec\.ts/, use: { ...chrome, baseURL: AUTH_URL } },
  ],
  webServer: [
    {
      command: `next dev -p ${PORT}`,
      url: BASE_URL,
      // Never reuse: only a server started here is guaranteed to run with the AI mock.
      reuseExistingServer: false,
      timeout: 180_000,
      // AI calls are mocked in e2e so tests never spend Vertex AI credits.
      env: { E2E_MOCK_AI: "1", NEXT_PUBLIC_USD_INR: "88" },
    },
    {
      command: `next dev -p ${AUTH_PORT}`,
      url: `${AUTH_URL}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        E2E_MOCK_AI: "1",
        NEXT_PUBLIC_USD_INR: "88",
        NEXT_DIST_DIR: ".next-e2e-auth", // its own build folder, so the two dev servers don't share a lock
        APP_PASSWORD: "e2e-password-123",
        CRON_SECRET: "e2e-cron-secret",
      },
    },
  ],
});
