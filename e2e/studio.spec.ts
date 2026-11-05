import { openChip } from "./chips";
import sharp from "sharp";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// The browser flow end to end with the AI mocked (E2E_MOCK_AI=1, set by
// playwright.config.ts). Mock images cost $0.039 each.

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const openTile = (page: Page, text: string) => page.getByRole("button", { name: new RegExp(`^Open image: ${esc(text)}$`) });
const FIRST_PAINT = { timeout: 45_000 }; // the dev server compiles on first visit

const prompt = (page: Page) => page.getByRole("textbox", { name: "Prompt" });
const generate = (page: Page) => page.getByRole("button", { name: /^Generate/ });

async function openStudio(page: Page, query = "") {
  await page.goto(`/image${query}`);
  await expect(prompt(page)).toBeVisible(FIRST_PAINT);
}

async function makeImage(page: Page, text: string) {
  await prompt(page).fill(text);
  await generate(page).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
}

// These tests read the grouped (Batch) layout: its cost line and per-generation alerts. Grid is the default and has its own spec in phase5.spec.ts.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("framerald.view", JSON.stringify({ mode: "batch" })));
});

test("the home page sends you to the Image studio, and the nav works", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/image$/, FIRST_PAINT);
  await expect(page.getByRole("heading", { name: "Image", level: 1 })).toBeVisible();
  await expect(generate(page)).toBeDisabled(); // nothing to generate yet

  await page.getByRole("link", { name: /^Video/ }).first().click();
  await expect(page.getByRole("button", { name: "Generate video" })).toBeVisible(FIRST_PAINT);
  await page.getByRole("link", { name: /^Agent/ }).first().click();
  await expect(page.getByText("What are you making?")).toBeVisible(FIRST_PAINT);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
});

test("make an image and see what it cost", async ({ page }) => {
  await openStudio(page);
  await expect(page.getByText("Your images appear here")).toBeVisible();

  await openChip(page, /^Aspect ratio/);
  await page.getByRole("radio", { name: "Aspect ratio 16:9" }).click();
  await page.keyboard.press("Escape");
  await makeImage(page, tag("a red door"));

  await expect(prompt(page)).toHaveValue(""); // the box clears once Generate is pressed
  await expect(page.getByTestId("batch")).toHaveCount(1);
  await expect(page.getByTestId("batch-cost")).toHaveText("≈ ₹3.43");
  await expect(page.getByTestId("asset-tile")).toHaveCount(1);
});

test("two images add up the cost", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("button", { name: "More images" }).click();
  await expect(page.getByRole("button", { name: /^Generate 2 images/ })).toBeVisible();
  await prompt(page).fill(tag("pair"));
  await page.getByRole("button", { name: /^Generate 2 images/ }).click();
  await expect(page.getByTestId("asset-tile")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByTestId("batch-cost")).toHaveText("≈ ₹6.86");
});

test("a failed generation says why and can be retried", async ({ page }) => {
  await openStudio(page);
  await prompt(page).fill(tag("[fail] nope"));
  await generate(page).click();
  const alert = page.getByTestId("batch").getByRole("alert"); // not Next's route announcer, which is also an alert
  await expect(alert).toContainText("Mock failure", { timeout: 30_000 });
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("the Lite model only offers 1K", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("combobox", { name: "Model" }).click();
  await page.getByRole("option", { name: /Nano Banana 2 Lite/ }).click();
  await openChip(page, /^Quality/);
  await expect(page.getByRole("radio", { name: "2K" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "1K" })).toBeEnabled();
});

test("find it in the Library, favourite it, then delete it", async ({ page }) => {
  const text = tag("library flow");
  await openStudio(page);
  await makeImage(page, text);

  await page.getByRole("link", { name: "Library" }).first().click();
  // Wait for the page itself: the Studio's own tile has the same label and stays on screen while /library loads.
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible(FIRST_PAINT);
  const tile = openTile(page, text);
  await expect(tile).toBeVisible(FIRST_PAINT);

  await tile.click();
  const dialog = page.getByTestId("asset-dialog");
  await expect(dialog).toContainText(text);
  await expect(dialog.getByTestId("asset-cost")).toHaveText("≈ ₹3.43");

  await dialog.getByRole("button", { name: "Add to favourites" }).click();
  await expect(dialog.getByRole("button", { name: "Remove from favourites" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("radio", { name: "Favourites" }).click();
  await expect(page).toHaveURL(/view=favourites/);
  await expect(tile).toBeVisible();

  await tile.click();
  const confirmDialog = page.getByTestId("asset-dialog");
  await confirmDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(confirmDialog.getByRole("alert")).toContainText("Delete this image?");
  await confirmDialog.getByRole("alert").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("asset-dialog")).toBeHidden();
  await expect(tile).toBeHidden();
});

test("edit with a reference image, then re-run the same settings", async ({ page }) => {
  const text = tag("make it night");
  const ref = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#10b981" } }).png().toBuffer();

  await openStudio(page);
  await page.getByTestId("reference-input").setInputFiles({ name: "ref.png", mimeType: "image/png", buffer: ref });
  await expect(page.getByTestId("reference")).toHaveCount(1);
  await openChip(page, /^Aspect ratio/);
  await page.getByRole("radio", { name: "Aspect ratio 4:3" }).click();
  await page.keyboard.press("Escape");
  await makeImage(page, text);
  await expect(page.getByTestId("batch")).toContainText("Edit");

  // Library → open → re-run these settings.
  await page.goto("/library");
  await openTile(page, text).click(FIRST_PAINT);
  await page.getByRole("link", { name: "Re-run these settings" }).click();
  await expect(page).toHaveURL(/\/image\?from=/);
  await expect(prompt(page)).toHaveValue(text, FIRST_PAINT);
  await openChip(page, /^Aspect ratio/);
  await expect(page.getByRole("radio", { name: "Aspect ratio 4:3" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("reference")).toHaveCount(1);

  // "Edit this image" starts from the picture as a reference.
  await page.goto("/library");
  await openTile(page, text).click(FIRST_PAINT);
  await page.getByRole("link", { name: "Edit this image" }).click();
  await expect(page).toHaveURL(/\/image\?edit=/);
  await expect(page.getByTestId("reference")).toHaveCount(1, FIRST_PAINT);
  await expect(prompt(page)).toHaveValue("");
});

test("a bad file is refused with a message", async ({ page }) => {
  await openStudio(page);
  await page.getByTestId("reference-input").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: Buffer.from("nope") });
  await expect(page.getByText(/isn't an image/)).toBeVisible();
  await expect(page.getByTestId("reference")).toHaveCount(0);
});
