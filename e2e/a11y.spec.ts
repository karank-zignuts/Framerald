import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// An accessibility scan (axe, WCAG 2.0/2.1 A and AA) of every screen in its main states.
// Anything it finds fails the test with the rule, the element and a one-line fix.

const FIRST_PAINT = { timeout: 45_000 };
const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

async function scan(page: Page, label: string) {
  await page.waitForTimeout(450); // let dialogs and menus finish fading in, or axe measures half-transparent text
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map(
    (v) => `${label}: ${v.id} (${v.impact}) ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`,
  );
  expect(summary, `accessibility problems on ${label}`).toEqual([]);
}

test("Image studio, with a result and a dialog open", async ({ page }) => {
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await scan(page, "image studio, empty");

  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("a red door"));
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
  await scan(page, "image studio, with a result");

  await page.getByTestId("asset-tile").first().getByRole("button").first().click();
  await expect(page.getByTestId("asset-dialog")).toBeVisible();
  await page.waitForTimeout(500);
  await scan(page, "image dialog");
});

test("Video studio, with a clip and the presets open", async ({ page }) => {
  await page.goto("/video");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await scan(page, "video studio, empty");

  await page.locator("summary").filter({ hasText: "Camera and look" }).click();
  await scan(page, "video studio, presets open");

  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("a harbour"));
  await page.getByRole("button", { name: "Generate video" }).click();
  await expect(page.getByTestId("job-video").first()).toBeVisible({ timeout: 40_000 });
  await scan(page, "video studio, with a clip");
});

test("Agent, empty and with a shot list", async ({ page }) => {
  await page.goto("/agent");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(FIRST_PAINT);
  await scan(page, "agent, empty");
  await page.getByRole("textbox", { name: "Message" }).fill(tag("a quiet harbour"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByTestId("shot-card").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await scan(page, "agent, with a shot list");
});

test("Library, Spend and the projects dialog", async ({ page }) => {
  await page.request.post("/api/generations", { data: { prompt: tag("for the library") } });
  await page.goto("/library");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible(FIRST_PAINT);
  await scan(page, "library");

  await page.getByRole("button", { name: "Projects" }).click();
  await expect(page.getByTestId("projects-dialog")).toBeVisible();
  await scan(page, "projects dialog");
  await page.keyboard.press("Escape");

  await page.goto("/library?q=nothing-matches-this-at-all");
  await expect(page.getByText("No matches")).toBeVisible(FIRST_PAINT);
  await scan(page, "library, no matches");

  await page.goto("/spend");
  await expect(page.getByTestId("spend-month")).toBeVisible(FIRST_PAINT);
  await scan(page, "spend");
});

test("phone width: the shell and a studio", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await scan(page, "image studio, phone");
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible(FIRST_PAINT);
  await scan(page, "library, phone");
});
