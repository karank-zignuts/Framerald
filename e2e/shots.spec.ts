import { test } from "@playwright/test";

// Visual review only. Run with: E2E_SHOTS=1 npx playwright test e2e/shots.spec.ts
// Writes one screenshot per screen to test-results/shots/. View each once.
test.skip(!process.env.E2E_SHOTS, "set E2E_SHOTS=1");

const screens: { name: string; path: string; ready: string }[] = [
  { name: "home", path: "/", ready: "What do you want to make?" },
];

for (const s of screens) {
  test(`screenshot: ${s.name}`, async ({ page }) => {
    await page.goto(s.path);
    await page.getByText(s.ready).first().waitFor({ timeout: 45_000 });
    await page.waitForTimeout(800); // let the beam and fonts settle
    await page.screenshot({ path: `test-results/shots/${s.name}.png` });
  });
}
