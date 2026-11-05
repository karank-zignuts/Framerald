import { defineConfig, devices } from "@playwright/test";

// Port 3100 so e2e never collides with other local projects on :3000.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  workers: 2, // dev server compiles on demand; more workers cause slow first paint and flaky waits
  retries: 0,
  // Terse output keeps token cost low: only failures print detail.
  reporter: [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      // System Chrome by default; E2E_USE_BUNDLED_CHROMIUM=1 for machines without it.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        ...(process.env.E2E_USE_BUNDLED_CHROMIUM === "1" ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    // AI calls are mocked in e2e so tests never spend Vertex AI credits.
    env: { E2E_MOCK_AI: "1" },
  },
});
