import sharp from "sharp";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// The Video Studio in the browser with the AI mocked (E2E_MOCK_AI=1). A mock clip takes about 2 seconds
// ("[slow]" 8, "[fail]" ends in an error). A default clip (Fast, 720p, 4 s, no sound) is estimated at $0.32.
// Every prompt starts with "[e2e]" so the teardown can delete what the tests make. The studio lists
// every recent clip, so each test finds its own by its prompt text.

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FIRST_PAINT = { timeout: 45_000 };

const prompt = (page: Page) => page.getByRole("textbox", { name: "Prompt" });
const generate = (page: Page) => page.getByRole("button", { name: "Generate video" });
const estimate = (page: Page) => page.getByTestId("estimate");
const openPresets = (page: Page, title = "Camera and look") => page.locator("summary").filter({ hasText: title }).click();
const jobFor = (page: Page, text: string) => page.getByTestId("job").filter({ hasText: text });

async function openVideo(page: Page, query = "") {
  await page.goto(`/video${query}`);
  await expect(prompt(page)).toBeVisible(FIRST_PAINT);
}

async function makeClip(page: Page, text: string) {
  await prompt(page).fill(text);
  await generate(page).click();
  await expect(jobFor(page, text).getByTestId("job-video")).toBeVisible({ timeout: 40_000 });
}

test("the estimate follows the model, length, resolution and sound", async ({ page }) => {
  await openVideo(page);
  await expect(estimate(page)).toHaveText("≈ $0.320"); // Fast, 4 s, 720p, no sound: 4 x $0.08

  await page.getByRole("combobox", { name: "Model" }).click();
  await page.getByRole("option", { name: /Veo 3.1 Lite/ }).click();
  await expect(estimate(page)).toHaveText("≈ $0.120"); // 4 x $0.03

  await expect(page.getByRole("radio", { name: "1080p" })).toBeDisabled(); // needs 8 seconds
  await page.getByRole("radio", { name: "8 s" }).click();
  await expect(page.getByRole("radio", { name: "1080p" })).toBeEnabled();
  await page.getByRole("radio", { name: "1080p" }).click();
  await expect(estimate(page)).toHaveText("≈ $0.400"); // 8 x $0.05

  await page.getByRole("radio", { name: "4 s" }).click(); // shorter clips are 720p only
  await expect(page.getByRole("radio", { name: "720p" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("switch", { name: "Sound" }).click();
  await expect(estimate(page)).toHaveText("≈ $0.200"); // 4 x $0.05 with sound
  await expect(page.getByRole("radio", { name: "4K" })).toBeDisabled(); // Lite can't make 4K
});

test("make a clip, watch it run, play it, and find it in the Library", async ({ page }) => {
  const text = tag("harbour at dawn");
  await openVideo(page);
  await prompt(page).fill(text);
  await generate(page).click();

  const job = jobFor(page, text);
  await expect(job).toHaveAttribute("data-status", "running");
  await expect(job.getByRole("status", { name: "Generating" })).toBeVisible();
  await expect(job.getByTestId("job-video")).toBeVisible({ timeout: 40_000 });
  await expect(job.getByTestId("job-cost")).toHaveText("≈ $0.320");

  await page.getByRole("link", { name: "Library" }).first().click();
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible(FIRST_PAINT);
  await page.getByRole("radio", { name: "Videos" }).click();
  await expect(page).toHaveURL(/view=videos/);
  const tile = page.getByRole("button", { name: new RegExp(`^Open video: ${esc(text)}$`) });
  await expect(tile).toBeVisible();

  await tile.click();
  const dialog = page.getByTestId("asset-dialog");
  await expect(dialog.getByTestId("asset-video")).toBeVisible();
  await expect(dialog.getByTestId("asset-cost")).toHaveText("≈ $0.320");
  await expect(dialog).toContainText("16:9, 4 s, 720p");
  await expect(dialog.getByRole("link", { name: "Re-run these settings" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Edit this image" })).toHaveCount(0); // that's for images

  await dialog.getByRole("button", { name: "Add to favourites" }).click();
  await expect(dialog.getByRole("button", { name: "Remove from favourites" })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await dialog.getByRole("alert").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("asset-dialog")).toBeHidden();
  await expect(tile).toBeHidden();
});

test("a running clip survives a reload", async ({ page }) => {
  const text = tag("[slow] a long take");
  await openVideo(page);
  await prompt(page).fill(text);
  await generate(page).click();
  await expect(jobFor(page, text)).toHaveAttribute("data-status", "running");

  await page.reload();
  await expect(prompt(page)).toBeVisible(FIRST_PAINT);
  const job = jobFor(page, text);
  await expect(job).toHaveAttribute("data-status", "running"); // still in flight, listed again after the reload
  await expect(job.getByTestId("job-video")).toBeVisible({ timeout: 45_000 }); // and finished by the polling that restarted
});

test("a failed clip says why and Try again starts another", async ({ page }) => {
  const text = tag("[fail] nope");
  await openVideo(page);
  await prompt(page).fill(text);
  await generate(page).click();
  await expect(jobFor(page, text).getByTestId("job-error")).toContainText("Mock failure", { timeout: 40_000 });
  await expect(jobFor(page, text)).toHaveCount(1);

  await jobFor(page, text).getByRole("button", { name: "Try again" }).click();
  await expect(jobFor(page, text)).toHaveCount(2); // the same settings, started again
});

test("presets are added to the prompt when you generate, and you can make your own", async ({ page }) => {
  const text = tag("a lighthouse");
  await openVideo(page);
  await openPresets(page);
  await page.getByRole("radio", { name: "Slow dolly in" }).click();
  await page.getByRole("radio", { name: "Film noir" }).click();
  await prompt(page).fill(text);
  await generate(page).click();
  const job = jobFor(page, text);
  await expect(job).toContainText("slow dolly in toward the subject");
  await expect(job).toContainText("black and white film noir");
  await expect(job.getByTestId("job-video")).toBeVisible({ timeout: 40_000 });

  // Your own preset: make it, use it, delete it.
  const name = tag("my grain");
  await page.getByRole("button", { name: "Add your own" }).click();
  await page.getByRole("textbox", { name: "Preset name" }).fill(name);
  // Enter in the name field must never start a (paid) clip, even with a prompt typed above.
  await page.getByRole("textbox", { name: "Preset name" }).press("Enter");
  await page.waitForTimeout(500);
  await expect(jobFor(page, text)).toHaveCount(1);
  await page.getByRole("textbox", { name: "What the preset adds" }).fill("heavy 16mm grain");
  await page.getByRole("button", { name: "Save preset" }).click();
  await expect(page.getByRole("radio", { name })).toBeVisible();
  await expect(page.getByRole("radio", { name })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: `Delete preset ${name}` }).click();
  await expect(page.getByRole("radio", { name })).toBeHidden();
});

test("animate an image: upload a first frame, pick a last one from the Library", async ({ page }) => {
  const png = await sharp({ create: { width: 64, height: 36, channels: 3, background: "#10b981" } }).png().toBuffer();
  const libraryPrompt = tag("a frame for the library");
  await page.request.post("/api/generations", { data: { prompt: libraryPrompt } });

  await openVideo(page);
  await expect(page.getByRole("button", { name: "From Library" }).nth(1)).toBeDisabled(); // no last frame without a first
  await page.getByTestId("first-frame-input").setInputFiles({ name: "first.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("frame")).toHaveCount(1);

  await page.getByRole("button", { name: "From Library" }).click();
  const picker = page.getByTestId("image-picker");
  await picker.getByRole("button", { name: new RegExp(`^Use image: ${esc(libraryPrompt)}`) }).click();
  await expect(page.getByTestId("frame")).toHaveCount(2);

  const text = tag("the door opens");
  await prompt(page).fill(text);
  await generate(page).click();
  const job = jobFor(page, text);
  await expect(job).toContainText("From an image");
  await expect(job.getByTestId("job-video")).toBeVisible({ timeout: 40_000 });
});

test("Animate this image from the Library, and re-running a clip's settings", async ({ page }) => {
  const imagePrompt = tag("a still to animate");
  await page.request.post("/api/generations", { data: { prompt: imagePrompt } });
  await page.goto("/library");
  await page.getByRole("button", { name: new RegExp(`^Open image: ${esc(imagePrompt)}$`) }).click(FIRST_PAINT);
  await page.getByRole("link", { name: "Animate this image" }).click();
  await expect(page).toHaveURL(/\/video\?first=/);
  await expect(page.getByTestId("frame")).toHaveCount(1, FIRST_PAINT);

  const text = tag("animated still");
  await makeClip(page, text);
  await page.goto("/library?view=videos");
  await page.getByRole("button", { name: new RegExp(`^Open video: ${esc(text)}$`) }).click(FIRST_PAINT);
  await page.getByRole("link", { name: "Re-run these settings" }).click();
  await expect(page).toHaveURL(/\/video\?from=/);
  await expect(prompt(page)).toHaveValue(text, FIRST_PAINT);
  await expect(page.getByTestId("frame")).toHaveCount(1); // the first frame comes back too
});

test("Refine with agent writes a video-minded prompt, and Undo restores yours", async ({ page }) => {
  const original = tag("a red door");
  await openVideo(page);
  await prompt(page).fill(original);
  await page.getByRole("button", { name: "Refine with agent" }).click();
  await expect(prompt(page)).toHaveValue(/slow push in/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(prompt(page)).toHaveValue(original);
});

test("the Library filters: Images shows no clips, Videos shows no pictures", async ({ page }) => {
  const imageText = tag("only a picture");
  await page.request.post("/api/generations", { data: { prompt: imageText } });
  await page.goto("/library?view=videos");
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible(FIRST_PAINT);
  await expect(page.getByRole("button", { name: new RegExp(`^Open image: ${esc(imageText)}$`) })).toHaveCount(0);

  await page.getByRole("radio", { name: "Images" }).click();
  await expect(page).toHaveURL(/view=images/);
  await expect(page.getByRole("button", { name: new RegExp(`^Open image: ${esc(imageText)}$`) })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Open video:/ })).toHaveCount(0);
});

test("a style preset in the Image studio is added to the prompt when you generate", async ({ page }) => {
  const text = tag("a quiet street");
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await expect(page.locator("summary").filter({ hasText: "Camera and look" })).toHaveCount(0); // camera moves are for video
  await openPresets(page, "Look");
  await expect(page.getByRole("radio", { name: "Slow dolly in" })).toHaveCount(0);
  await page.getByRole("radio", { name: "35mm film" }).click();
  await page.getByRole("textbox", { name: "Prompt" }).fill(text);
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("batch").first()).toContainText("shot on 35mm film");
});
