import { openChip } from "./chips";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// Spend, projects and search in the browser, with the AI mocked. Test data is named "[e2e] ..." so the
// teardown can delete it.

const unique = () => Math.random().toString(36).slice(2, 8);
const tag = (s: string) => `[e2e] ${s} ${unique()}`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FIRST_PAINT = { timeout: 45_000 };

/** The Image studio keeps the project menu inside its Look chip; the Video studio shows it inline. */
async function showProjectMenu(page: Page) {
  const menu = page.getByRole("combobox", { name: "Project", exact: true });
  if (!(await menu.isVisible())) await openChip(page, /^Look and project/);
}
const projectMenu = (page: Page) => page.getByRole("combobox", { name: "Project", exact: true });

async function newProject(page: Page, name: string) {
  await showProjectMenu(page);
  await projectMenu(page).click();
  await page.getByRole("option", { name: "New project" }).click();
  await page.getByRole("textbox", { name: "Project name" }).fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await showProjectMenu(page);
  await expect(projectMenu(page)).toContainText(name);
}

test("Spend shows what you've spent, by day, kind and model", async ({ page }) => {
  await page.request.post("/api/generations", { data: { prompt: tag("spend check") } }); // ₹3.43 (about $0.039) on the mock
  await page.goto("/image");
  await page.getByRole("link", { name: "Spend" }).first().click();
  await expect(page.getByRole("heading", { name: "Spend", level: 1 })).toBeVisible(FIRST_PAINT);

  await expect(page.getByText("Estimated from Google's list prices")).toBeVisible();
  await expect(page.getByTestId("spend-month")).toHaveText(/^₹[\d,]/, { timeout: 30_000 });
  await expect(page.getByTestId("spend-30")).toContainText("in the last 30 days");
  await expect(page.getByTestId("spend-bars")).toHaveAttribute("aria-label", /Spend per day for the last 30 days/);
  await expect(page.getByRole("table", { name: "By kind" })).toContainText("Images");
  await expect(page.getByRole("table", { name: "By model" })).toContainText("Nano Banana");
  await expect(page.getByTestId("expensive").getByRole("listitem").first()).toBeVisible();
});

test("make a project, put an image in it, and find it by that project in the Library", async ({ page }) => {
  const name = tag("night chase");
  const other = tag("other");
  const text = tag("a neon street");

  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await newProject(page, name);

  await page.getByRole("textbox", { name: "Prompt" }).fill(text);
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });

  await page.goto("/library");
  const tile = page.getByRole("button", { name: new RegExp(`^Open image: ${esc(text)}$`) });
  await expect(tile).toBeVisible(FIRST_PAINT);

  // Filter by the project: it's there. Another project: it isn't.
  await showProjectMenu(page);
  await projectMenu(page).click();
  await page.getByRole("option", { name }).click();
  await expect(page).toHaveURL(/project=/);
  await expect(tile).toBeVisible();

  // Move it to another project from its dialog, then both filters follow.
  await tile.click();
  const dialog = page.getByTestId("asset-dialog");
  await dialog.getByRole("combobox", { name: "Move to project" }).click();
  await page.getByRole("option", { name: "New project" }).click();
  await page.getByRole("textbox", { name: "Project name" }).fill(other);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "Move to project" })).toContainText(other);
  await page.keyboard.press("Escape");
  await expect(tile).toBeHidden(); // the filter is still the first project

  await showProjectMenu(page);
  await projectMenu(page).click();
  await page.getByRole("option", { name: other }).click();
  await expect(tile).toBeVisible();
});

test("Enter in the new-project field never starts a generation", async ({ page }) => {
  await page.goto("/image");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible(FIRST_PAINT);
  await page.getByRole("textbox", { name: "Prompt" }).fill(tag("do not generate"));
  await showProjectMenu(page);
  await projectMenu(page).click();
  await page.getByRole("option", { name: "New project" }).click();
  const field = page.getByRole("textbox", { name: "Project name" });
  await field.fill(tag("enter test"));
  await field.press("Enter"); // saves the project
  await showProjectMenu(page);
  await expect(projectMenu(page)).toContainText("[e2e] enter test");
  await page.waitForTimeout(800);
  await expect(page.getByTestId("batch")).toHaveCount(0); // no image was made
});

test("the Projects dialog adds, renames and deletes", async ({ page }) => {
  const name = tag("dialog project");
  const renamed = tag("renamed project");
  await page.goto("/library");
  await page.getByRole("button", { name: "Projects" }).click({ timeout: 45_000 });
  const dialog = page.getByTestId("projects-dialog");

  await dialog.getByRole("textbox", { name: "New project name" }).fill(name);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByTestId("project-name").filter({ hasText: name })).toBeVisible();

  await dialog.getByRole("button", { name: `Rename ${name}` }).click();
  await dialog.getByRole("textbox", { name: "Project name", exact: true }).fill(renamed);
  await dialog.getByRole("button", { name: "Save name" }).click();
  await expect(dialog.getByTestId("project-name").filter({ hasText: renamed })).toBeVisible();

  await dialog.getByRole("button", { name: `Delete ${renamed}` }).click();
  await expect(dialog.getByRole("alert")).toContainText("Its items stay.");
  await dialog.getByRole("alert").getByRole("button", { name: "Delete" }).click();
  await expect(dialog.getByTestId("project-name").filter({ hasText: renamed })).toBeHidden();
});

test("search the Library by prompt: the URL follows, matches show, and no match has a way out", async ({ page }) => {
  const word = `quokka${unique()}`;
  const hitText = `[e2e] a ${word} smiling`;
  const missText = tag("a heron standing");
  await page.request.post("/api/generations", { data: { prompt: hitText } });
  await page.request.post("/api/generations", { data: { prompt: missText } });

  await page.goto("/library");
  const hit = page.getByRole("button", { name: new RegExp(`^Open image: ${esc(hitText)}$`) });
  const miss = page.getByRole("button", { name: new RegExp(`^Open image: ${esc(missText)}$`) });
  await expect(hit).toBeVisible(FIRST_PAINT);

  await page.getByRole("searchbox", { name: "Search prompts" }).fill(word.toUpperCase());
  await expect(page).toHaveURL(new RegExp(`q=${word.toUpperCase()}`));
  await expect(hit).toBeVisible();
  await expect(miss).toBeHidden();

  await page.getByRole("searchbox", { name: "Search prompts" }).fill(`nothing-matches-${unique()}`);
  await expect(page.getByText("No matches")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByRole("searchbox", { name: "Search prompts" })).toHaveValue("");
  await expect(miss).toBeVisible();
});

test("a chat started in a project belongs to it, and a reload shows that", async ({ page }) => {
  const name = tag("chat project");
  await page.goto("/agent");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(FIRST_PAINT);
  await newProject(page, name);

  await page.getByRole("textbox", { name: "Message" }).fill(tag("a quiet harbour"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByTestId("shot-card").first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/thread=/);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(FIRST_PAINT);
  await showProjectMenu(page);
  await expect(projectMenu(page)).toContainText(name);
});

test("the download link uses the file's real type", async ({ page }) => {
  const text = tag("download name");
  await page.request.post("/api/generations", { data: { prompt: text } });
  await page.goto("/library");
  await page.getByRole("button", { name: new RegExp(`^Open image: ${esc(text)}$`) }).click(FIRST_PAINT);
  const href = await page.getByTestId("asset-dialog").getByRole("link", { name: "Download" }).getAttribute("href");
  expect(new URL(href!).searchParams.get("download")).toMatch(/^framerald-[0-9a-f]{8}\.png$/);
});
