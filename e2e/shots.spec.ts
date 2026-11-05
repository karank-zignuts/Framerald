import { test, expect } from "@playwright/test";

// Visual review only. Run with: E2E_SHOTS=1 npx playwright test e2e/shots.spec.ts
// Writes one screenshot per screen to test-results/shots/. View each once.
test.skip(!process.env.E2E_SHOTS, "set E2E_SHOTS=1");

const FIRST_PAINT = { timeout: 60_000 };
const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

test("screenshots", async ({ page, request }) => {
  const shot = (name: string) => page.screenshot({ path: `test-results/shots/${name}.png` });

  // Studio, empty.
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(1200); // let the beam settle
  await shot("studio-empty");

  // Studio with a two-image batch and a failed one.
  await page.getByRole("radio", { name: "16:9" }).click();
  await page.getByRole("radio", { name: "2", exact: true }).click();
  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("A slow dolly shot through a rain-soaked neon street at night"));
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile")).toHaveCount(2, { timeout: 30_000 });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await shot("studio-results");

  // Library with a few more images so the grid has something to show.
  for (const t of ["a glass cube on black", "foggy harbour at dawn", "a red door in a white wall", "portrait in window light"]) {
    await request.post("/api/generations", { data: { prompt: tag(t), aspectRatio: "3:4" } });
  }
  await page.goto("/library");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible(FIRST_PAINT);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await shot("library");

  // Detail dialog.
  await page.getByTestId("asset-tile").first().getByRole("button").first().click();
  await expect(page.getByTestId("asset-dialog")).toBeVisible();
  await page.waitForTimeout(500);
  await shot("dialog");
  await page.keyboard.press("Escape");

  // Empty favourites.
  await page.getByRole("radio", { name: "Favourites" }).click();
  await expect(page.getByText("No favourites yet")).toBeVisible();
  await shot("library-favourites-empty");

  // Agent: empty, then a conversation with a shot list.
  await page.goto("/agent");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(500);
  await shot("agent-empty");
  await page.getByRole("textbox", { name: "Message" }).fill(tag("a lighthouse keeper in a storm, 35mm film look"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByTestId("shot-card")).toHaveCount(3, { timeout: 30_000 });
  await page.waitForTimeout(600);
  await shot("agent-conversation");

  // Image studio with a prompt sent from a shot.
  await page.getByTestId("shot-card").first().getByRole("link", { name: /Send to Image/ }).click();
  await expect(page.getByRole("textbox", { name: "Prompt" })).not.toHaveValue("", FIRST_PAINT);
  await page.waitForTimeout(900);
  await shot("studio-prefilled");

  // Video Studio: empty, then with a clip and one running.
  await page.goto("/video");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await shot("video-empty");
  await page.locator("summary").filter({ hasText: "Camera and look" }).click();
  await page.getByRole("radio", { name: "Slow dolly in" }).click();
  await page.getByRole("radio", { name: "35mm film" }).click();
  await page.locator("summary").filter({ hasText: "Camera and look" }).click(); // close it again for the picture
  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("A lighthouse keeper climbs the stairs"));
  await page.getByRole("button", { name: "Generate video" }).click();
  await expect(page.getByTestId("job-video").first()).toBeVisible({ timeout: 40_000 });
  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("[slow] A long take of waves at dusk"));
  await page.getByRole("button", { name: "Generate video" }).click();
  await expect(page.getByTestId("job").first()).toHaveAttribute("data-status", "running");
  await page.waitForTimeout(1500);
  await shot("video-jobs");

  // Library with a clip, and the clip's dialog.
  await page.goto("/library?view=videos");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await shot("library-videos");
  await page.getByTestId("asset-tile").first().getByRole("button").first().click();
  await expect(page.getByTestId("asset-video")).toBeVisible();
  await page.waitForTimeout(800);
  await shot("dialog-video");
  await page.keyboard.press("Escape");

  // Spend, with the usage the steps above created.
  await page.goto("/spend");
  await expect(page.getByTestId("spend-month")).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(600);
  await shot("spend");

  // Library with search and the projects dialog.
  await page.goto("/library");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible(FIRST_PAINT);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.waitForTimeout(400);
  await shot("projects-dialog");
  await page.keyboard.press("Escape");

  // Phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await shot("studio-mobile");
  await page.goto("/library");
  await expect(page.getByTestId("asset-tile").first()).toBeVisible(FIRST_PAINT);
  await shot("library-mobile");
  await page.goto("/agent");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(500);
  await shot("agent-mobile");
  await page.goto("/video");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800);
  await shot("video-mobile");
});
