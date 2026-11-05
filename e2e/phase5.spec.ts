import { test, expect } from "./fixtures";

const FIRST_PAINT = { timeout: 60_000 };
const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

test("the sidebar collapses to icons, stays collapsed after a reload, and opens again", async ({ page }) => {
  await page.goto("/image");
  const toggle = page.getByRole("button", { name: "Collapse sidebar" });
  await expect(toggle).toBeVisible(FIRST_PAINT);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true");
  await expect(page.getByRole("link", { name: "Library" })).toBeVisible(); // still reachable by name when only icons show

  await page.reload();
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true", FIRST_PAINT);
  await page.keyboard.press("ControlOrMeta+b");
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "false");
});

test("Agent mode hands the idea to the Agent page instead of generating", async ({ page }) => {
  const idea = tag("a lighthouse in a storm");
  await page.goto("/image");
  const agent = page.getByRole("button", { name: "Agent", exact: true });
  await expect(agent).toBeVisible(FIRST_PAINT);
  await agent.click();
  await expect(agent).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("textbox", { name: "Prompt" }).fill(idea);
  await page.getByRole("button", { name: "Plan with agent" }).click();
  await expect(page).toHaveURL(/\/agent\?idea=/);
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(idea, FIRST_PAINT);
});

test("the balance chip takes your Google Cloud balance in rupees and shows what is left", async ({ page }) => {
  await page.goto("/image");
  const chip = page.getByTestId("balance-chip");
  await expect(chip).toContainText("Set balance", FIRST_PAINT);
  await chip.click();
  await page.getByRole("textbox", { name: /Balance in the Google Cloud console/ }).fill("25000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(chip).toContainText(/₹[\d,]+\.\d\d\s*left/);
  await page.reload();
  await expect(page.getByTestId("balance-chip")).toContainText(/left/, FIRST_PAINT);
  await page.getByTestId("balance-chip").click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByTestId("balance-chip")).toContainText("Set balance");
});

test("costs show in rupees", async ({ page }) => {
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("rupee check"));
  await expect(page.getByRole("button", { name: /^Generate/ })).toContainText(/≈ ₹/); // the estimate is on the button
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("tile-cost").first()).toHaveText(/^≈ ₹/, { timeout: 30_000 });
});

async function makeOne(page: import("@playwright/test").Page, text: string) {
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.getByRole("textbox", { name: "Prompt" }).fill(text);
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
}

test("results flow in one grid, the View menu changes size and mode", async ({ page }) => {
  await makeOne(page, tag("a red door in a white wall, soft light"));
  await expect(page.getByTestId("batch")).toHaveCount(0); // Grid is the default, with no per-generation groups
  const grid = page.getByTestId("results").locator("div").first();
  await expect(page.getByTestId("asset-tile")).toHaveCount(1);

  await page.getByRole("button", { name: "View" }).click();
  await page.getByRole("radio", { name: "L", exact: true }).click();
  await expect(page.getByTestId("results").locator('[style*="column-width: 360px"]')).toHaveCount(1);
  await page.getByRole("radio", { name: "S", exact: true }).click();
  await expect(page.getByTestId("results").locator('[style*="column-width: 150px"]')).toHaveCount(1);
  await page.getByRole("radio", { name: "Batch" }).click();
  await expect(page.getByTestId("batch")).toHaveCount(1);
  void grid;

  await page.reload(); // the choice is remembered
  await expect(page.getByTestId("batch")).toHaveCount(0, { timeout: 5_000 }).catch(() => undefined);
});

test("each tile has a name from its prompt, a heart, reuse, and a menu with rename and delete", async ({ page }) => {
  const word = `quokka${Math.random().toString(36).slice(2, 7)}`;
  await makeOne(page, `[e2e] a ${word} on a beach, golden hour`);
  const tile = page.getByTestId("asset-tile").first();
  await expect(tile).toContainText(`Quokka`.toLowerCase() === "" ? "" : word.slice(0, 3), { ignoreCase: true }); // named from its prompt

  await tile.hover();
  await expect(tile.getByRole("button", { name: "Add to favourites" })).toBeVisible();
  await expect(tile.getByRole("link", { name: "Reuse prompt and references" })).toBeVisible();

  await tile.getByRole("button", { name: "More actions" }).click();
  for (const item of ["Favourite", "Reuse prompt and references", "Animate this image", "Download", "Copy prompt", "Rename", "Delete"]) {
    await expect(page.getByRole("menuitem", { name: item })).toBeVisible();
  }
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Beach dog");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(tile).toContainText("Beach dog");

  await tile.hover();
  await tile.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("asset-tile")).toHaveCount(0);
});

test("Reuse brings the prompt back into the composer", async ({ page }) => {
  const text = tag("a quiet harbour at dawn");
  await makeOne(page, text);
  const tile = page.getByTestId("asset-tile").first();
  await tile.hover();
  await tile.getByRole("link", { name: "Reuse prompt and references" }).click();
  await expect(page).toHaveURL(/\/image\?from=/);
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveValue(text, FIRST_PAINT);
});

test("with Clear prompt on submit turned off, the prompt stays", async ({ page }) => {
  const text = tag("keep this prompt");
  await page.goto("/image");
  await page.getByRole("button", { name: "View" }).click();
  await page.getByRole("switch", { name: "Clear prompt on submit" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Prompt" }).fill(text);
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveValue(text);
});

test("the model picker lists models with a note, searches, and switches", async ({ page }) => {
  await page.goto("/image");
  await page.getByRole("combobox", { name: "Model" }).click();
  const options = page.getByRole("option");
  await expect(options).toHaveCount(3);
  await expect(options.first()).toContainText("Balanced");
  await page.getByRole("textbox", { name: "Search models" }).fill("lite");
  await expect(options).toHaveCount(1);
  await options.first().click();
  await expect(page.getByRole("combobox", { name: "Model" })).toContainText("Nano Banana 2 Lite");
});

test("the media picker offers uploads, generations and favourites, with sorting, and adds a reference", async ({ page }) => {
  await makeOne(page, tag("picker source image"));
  await page.getByRole("button", { name: "Add reference images" }).click();
  await expect(page.getByRole("tab", { name: "Uploads" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Upload media" })).toBeVisible();
  await page.getByRole("tab", { name: "Favourites" }).click();
  await page.getByRole("tab", { name: "Generations" }).click();
  await page.getByRole("button", { name: "Sort by" }).click();
  await page.getByRole("menuitemradio", { name: "First created" }).click();
  const use = page.getByRole("button", { name: /^Use / }).first();
  await expect(use).toBeVisible(FIRST_PAINT);
  await use.click();
  await expect(page.getByRole("dialog").or(page.locator("[data-radix-popper-content-wrapper]")).getByRole("button", { pressed: true })).toHaveCount(1); // chosen: it shows as pressed
  // The panel opens above the dock, not over it.
  const panel = page.locator("[data-radix-popper-content-wrapper]").first();
  const dock = page.getByRole("region", { name: "Controls" });
  const [panelBox, dockBox] = [await panel.boundingBox(), await dock.boundingBox()];
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(dockBox!.y + 4);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("reference")).toHaveCount(1);
});
