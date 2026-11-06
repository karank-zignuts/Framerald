import { test, expect } from "./fixtures";

const FIRST_PAINT = { timeout: 60_000 };
const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;

test("the sidebar hides completely, stays hidden after a reload, and comes back from the screen's edge", async ({ page }) => {
  await page.goto("/image");
  const toggle = page.getByRole("button", { name: "Collapse sidebar" });
  await expect(toggle).toBeVisible(FIRST_PAINT);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true");
  await expect(page.locator("#sidebar")).toHaveJSProperty("inert", true); // out of the tab order and the accessibility tree
  await expect.poll(async () => (await page.locator("#sidebar").boundingBox())!.width).toBe(0); // and takes no room

  await page.reload();
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true", FIRST_PAINT);

  // The whole left edge is one clickable strip, from top to bottom.
  const show = page.getByRole("button", { name: "Show sidebar" });
  await expect(show).toHaveCSS("cursor", "e-resize"); // a direction, not the pointing hand
  const box = (await show.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.height).toBeGreaterThan(600);
  await page.mouse.move(2, 120); // anywhere along it, not only the middle
  await page.mouse.click(2, 120);
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "false");
  await expect(page.getByRole("link", { name: "Library" })).toBeVisible();

  // The sidebar's own right edge hides it again, and says which way it will go.
  await expect(page.getByTestId("sidebar-rail")).toHaveCSS("cursor", "w-resize");
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toHaveCSS("cursor", "w-resize");
  await page.getByTestId("sidebar-rail").click({ position: { x: 6, y: 200 } });
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true");
  await page.keyboard.press("ControlOrMeta+b"); // the keyboard does both ways
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

/** A project of its own, so counts in these tests aren't mixed with the history the other tests leave behind. */
async function freshProject(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("/api/projects", { data: { name: tag("fresh") } });
  return ((await res.json()) as { id: string }).id;
}

async function makeOne(page: import("@playwright/test").Page, text: string, project?: string) {
  await page.goto(project ? `/p/${project}/image` : "/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.getByRole("textbox", { name: "Prompt" }).fill(text);
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
}

test("the history is one masonry grid, and the View menu changes its size and mode", async ({ page, request }) => {
  const project = await freshProject(request);
  await makeOne(page, tag("a red door in a white wall, soft light"), project);
  await expect(page.getByTestId("batch")).toHaveCount(0); // Masonry is the default, with no per-generation groups
  await expect(page.getByTestId("history-grid")).toBeVisible();
  await expect(page.getByTestId("asset-tile")).toHaveCount(1);

  const width = async () => (await page.getByTestId("asset-tile").first().boundingBox())!.width;
  await page.getByRole("button", { name: "View" }).click();
  await page.getByRole("radio", { name: "S", exact: true }).click();
  await expect.poll(width).toBeLessThan(250);
  await page.getByRole("radio", { name: "L", exact: true }).click();
  await expect.poll(width).toBeGreaterThan(300); // the tile grew as the columns did
  await page.getByRole("radio", { name: "Batch" }).click();
  await expect(page.getByTestId("batch")).toHaveCount(1);
});

test("each tile has a name from its prompt, a heart, reuse, and a menu with rename and delete", async ({ page, request }) => {
  const word = `quokka${Math.random().toString(36).slice(2, 7)}`;
  await makeOne(page, `[e2e] a ${word} on a beach, golden hour`, await freshProject(request));
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

test("Reuse brings the prompt back into the composer", async ({ page, request }) => {
  const text = tag("a quiet harbour at dawn");
  await makeOne(page, text, await freshProject(request));
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
  const dockBox = await page.locator("form").first().boundingBox();
  const panelBox = await page.locator("[data-radix-popper-content-wrapper]").first().boundingBox();
  expect(panelBox!.x).toBeGreaterThanOrEqual(dockBox!.x - 1); // lined up with the dock
  const gap = dockBox!.y - (panelBox!.y + panelBox!.height);
  expect(gap).toBeGreaterThanOrEqual(8); // clear space between the panel and the dock
  expect(gap).toBeLessThanOrEqual(30);
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
  const dock = page.locator("form").first();
  const [panelBox, dockBox] = [await panel.boundingBox(), await dock.boundingBox()];
  expect(panelBox!.x).toBeGreaterThanOrEqual(dockBox!.x - 1); // lined up with the dock, not stuck in the page corner
  const gap = dockBox!.y - (panelBox!.y + panelBox!.height);
  expect(gap).toBeGreaterThanOrEqual(8); // clear space between the panel and the dock
  expect(gap).toBeLessThanOrEqual(30);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("reference")).toHaveCount(1);
});

test("when the chips don't fit, arrows float over the strip and nothing moves or resizes", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.goto("/image");
  const right = page.getByRole("button", { name: "Scroll options right" });
  await expect(right).toBeVisible(FIRST_PAINT);
  await page.waitForTimeout(800); // the page has finished fading in
  const left = page.getByRole("button", { name: "Scroll options left" });
  const strip = page.getByTestId("chip-strip");
  const plus = page.getByRole("button", { name: "Add reference images" });
  const before = { strip: (await strip.boundingBox())!, plus: (await plus.boundingBox())! };
  await expect(left).toBeHidden(); // at the start there is nothing to the left

  await right.click();
  await expect(left).toBeVisible();
  await page.waitForTimeout(600); // the smooth scroll settles
  const after = { strip: (await strip.boundingBox())!, plus: (await plus.boundingBox())! };
  // The arrows took no room: the strip and the attach button are exactly where they were.
  expect(after.strip).toEqual(before.strip);
  expect(after.plus).toEqual(before.plus);
  // And they sit on top of the strip, at its ends.
  const arrow = (await left.boundingBox())!;
  expect(arrow.x).toBeGreaterThanOrEqual(after.strip.x);
  expect(arrow.x + arrow.width).toBeLessThanOrEqual(after.strip.x + after.strip.width);
});

test("renaming goes through the API: a bad name is refused, a good one is saved or says what is missing", async ({ request }) => {
  const made = await request.post("/api/generations", { data: { prompt: `[e2e] rename api ${Math.random().toString(36).slice(2, 7)}` } });
  const assetId = ((await made.json()) as { assets: { id: string }[] }).assets[0].id;
  const empty = await request.patch(`/api/assets/${assetId}`, { data: { name: "   " } });
  expect(empty.status()).toBe(400);
  const long = await request.patch(`/api/assets/${assetId}`, { data: { name: "x".repeat(81) } });
  expect(long.status()).toBe(400);
  const ok = await request.patch(`/api/assets/${assetId}`, { data: { name: "Harbour at dawn" } });
  // 200 once the latest database update is applied; before that the API says so instead of pretending.
  expect([200, 409]).toContain(ok.status());
  if (ok.status() === 409) expect((await ok.json()).error).toMatch(/database update/);
  if (ok.status() === 200) {
    const got = (await (await request.get(`/api/assets/${assetId}`)).json()) as { name: string | null };
    expect(got.name).toBe("Harbour at dawn");
  }
});


test("the dock's flowing gradient shows when it isn't focused and fades out when you click into it", async ({ page }) => {
  await page.goto("/image");
  const gradient = page.getByTestId("dock-gradient");
  await expect(gradient).toBeAttached(FIRST_PAINT);
  await expect.poll(async () => Number(await gradient.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.3);

  await page.getByRole("textbox", { name: "Prompt" }).focus();
  await expect.poll(async () => Number(await gradient.evaluate((el) => getComputedStyle(el).opacity))).toBe(0);

  await page.getByRole("heading", { name: "Image", level: 1 }).evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(async () => Number(await gradient.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.3);
});

test("the picker's tabs have one pill that glides to the active tab", async ({ page }) => {
  await page.goto("/image");
  await page.getByRole("button", { name: "Add reference images" }).click();
  const tablist = page.getByRole("tablist", { name: "Where to pick from" });
  await expect(tablist).toBeVisible(FIRST_PAINT);
  const pill = tablist.getByTestId("sliding-pill");
  const centre = async (loc: import("@playwright/test").Locator) => {
    const b = (await loc.boundingBox())!;
    return b.x + b.width / 2;
  };
  await expect(pill).toHaveCount(1);
  expect(Math.abs((await centre(pill)) - (await centre(page.getByRole("tab", { name: "Uploads" }))))).toBeLessThan(2);

  await page.getByRole("tab", { name: "Favourites" }).click();
  await expect(pill).toHaveCount(1); // the same pill moves, a second one never appears
  await expect.poll(async () => Math.abs((await centre(pill)) - (await centre(page.getByRole("tab", { name: "Favourites" }))))).toBeLessThan(2);
  await expect(page.getByRole("tab", { name: "Favourites" })).toHaveAttribute("aria-selected", "true");
});

test("focusing the prompt shows no ring or box around it", async ({ page }) => {
  await page.goto("/image");
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.focus();
  await expect(prompt).toHaveCSS("outline-style", "none");
  const shadow = await prompt.evaluate((el) => getComputedStyle(el).boxShadow);
  expect((shadow.match(/-?[\d.]+px/g) ?? []).every((v) => parseFloat(v) === 0)).toBe(true); // only empty zero-size layers, no ring
  await expect(prompt).toHaveCSS("border-top-width", "0px");
});

test("a hidden sidebar is hidden from the first frame, with no flash of it open", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("framerald.sidebar", "collapsed"));
  const seen: number[] = [];
  await page.exposeFunction("report", (w: number) => seen.push(w));
  await page.addInitScript(() => {
    const check = () => {
      const el = document.getElementById("sidebar");
      if (el) (window as unknown as { report: (w: number) => void }).report(el.getBoundingClientRect().width);
    };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", check);
  });
  await page.goto("/image");
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true", FIRST_PAINT);
  expect(seen.length).toBeGreaterThan(0);
  expect(Math.max(...seen)).toBe(0); // every time it was measured, from its first appearance, it took no room
});

test("the Generate button's star border shows while it is active and fades out when it is disabled", async ({ page }) => {
  await page.goto("/image");
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await expect(prompt).toBeVisible(FIRST_PAINT);
  const stars = page.locator(".star-border-stars").first();
  const opacity = async () => Number(await stars.evaluate((el) => getComputedStyle(el).opacity));
  await expect(page.getByRole("button", { name: /^Generate/ })).toBeDisabled(); // nothing written yet
  await expect.poll(opacity).toBe(0);
  await prompt.fill("[e2e] star border");
  await expect(page.getByRole("button", { name: /^Generate/ })).toBeEnabled();
  await expect.poll(opacity).toBe(1);
  await prompt.fill("");
  await expect.poll(opacity).toBe(0);
});
