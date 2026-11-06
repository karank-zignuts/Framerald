import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect, projectId } from "./fixtures";

// Projects in the browser: each has its own address (/p/<id>/...), everything you make belongs to one, the switcher moves
// between them, and deleted things wait in a trash. AI is mocked. Test data is named "[e2e] ..." so the teardown removes it.

const FIRST_PAINT = { timeout: 60_000 };
const unique = () => Math.random().toString(36).slice(2, 8);
const tag = (s: string) => `[e2e] ${s} ${unique()}`;

async function makeProject(request: APIRequestContext, name = tag("project")) {
  const res = await request.post("/api/projects", { data: { name } });
  expect(res.status()).toBe(200);
  return (await res.json()) as { id: string; name: string };
}

async function makeImage(page: Page, id: string, text: string) {
  await page.goto(`/p/${id}/image`);
  await page.getByRole("textbox", { name: "Prompt" }).fill(text);
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
}

// The sidebar has one; the narrow-screen top bar has another that is hidden on a wide screen.
const switcher = (page: Page) => page.locator("#sidebar").getByTestId("project-switcher");

test("the old addresses open the same page inside your project", async ({ page }) => {
  await page.goto("/image");
  await expect(page).toHaveURL(new RegExp(`/p/${projectId()}/image$`), FIRST_PAINT);
  await page.goto("/library?view=videos");
  await expect(page).toHaveURL(new RegExp(`/p/${projectId()}/library\\?view=videos$`), FIRST_PAINT);
});

test("the switcher shows the project, lists the others, and keeps you on the same page", async ({ page, request }) => {
  const other = await makeProject(request, tag("second"));
  await page.goto(`/p/${projectId()}/video`);
  await expect(switcher(page)).toContainText("[e2e] studio", FIRST_PAINT);
  await switcher(page).click();
  await expect(page.locator("[role=menuitem][data-current]")).toContainText("[e2e] studio"); // the project you are in is marked
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Video");
  await expect(page.getByRole("menuitem", { name: new RegExp(other.name.replace(/[[\]]/g, "\\$&")) })).toBeVisible();
  await page.getByRole("menuitem", { name: new RegExp(other.name.replace(/[[\]]/g, "\\$&")) }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${other.id}/video$`));
  await expect(switcher(page)).toContainText(other.name);
});

test("while the switcher is open, a digit picks that project", async ({ page, request }) => {
  await makeProject(request, tag("digit")); // so there is more than one
  const first = ((await (await request.get("/api/projects")).json()) as { projects: { id: string }[] }).projects[0];
  await page.goto(`/p/${projectId()}/image`);
  await switcher(page).click();
  // Add project and All projects are always there; wait for the projects themselves to load.
  await expect.poll(() => page.getByRole("menuitem").count(), FIRST_PAINT).toBeGreaterThan(3);
  await page.keyboard.press("1"); // the digits stop at 9; 1 is the first project in the list
  await expect(page).toHaveURL(new RegExp(`/p/${first.id}/image$`));
});

test("Add project makes one, opens it, and gives it a date-and-time name you can change", async ({ page }) => {
  await page.goto(`/p/${projectId()}/image`);
  await switcher(page).click();
  await page.getByRole("menuitem", { name: "Add project" }).click();
  const field = page.getByRole("textbox", { name: "Project name" });
  await expect(field).toHaveValue(/^[A-Z][a-z]{2} \d{2} - \d{2}:\d{2}$/);
  const name = tag("added");
  await field.fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}\/image$/);
  await expect(switcher(page)).toContainText(name);
});

test("what you make belongs to the project: another project's studio and Library don't show it", async ({ page, request }) => {
  const other = await makeProject(request, tag("empty"));
  const text = tag("a lighthouse at dusk");
  await makeImage(page, projectId(), text);

  await page.goto(`/p/${other.id}/image`);
  await expect(page.getByText("Your images appear here")).toBeVisible(FIRST_PAINT);
  await page.goto(`/p/${other.id}/library`);
  await expect(page.getByText("Nothing here yet")).toBeVisible(FIRST_PAINT);

  await page.goto(`/p/${projectId()}/library`);
  await expect(page.getByRole("button", { name: new RegExp(`^Open image: ${text.replace(/[[\]]/g, "\\$&")}`) })).toBeVisible(FIRST_PAINT);
});

test("chats and clips are scoped to the project too", async ({ page, request }) => {
  const other = await makeProject(request, tag("chats"));
  const chat = (await (await request.post("/api/agent/threads", { data: { title: tag("only here"), projectId: projectId() } })).json()) as { id: string; title: string };
  const there = await (await request.get(`/api/agent/threads?project=${other.id}`)).json();
  expect((there as { id: string }[]).map((t) => t.id)).not.toContain(chat.id);
  const here = await (await request.get(`/api/agent/threads?project=${projectId()}`)).json();
  expect((here as { id: string }[]).map((t) => t.id)).toContain(chat.id);
  await page.goto(`/p/${other.id}/agent`);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(FIRST_PAINT);
});

test("the three dots rename a project, show its trash, and delete it into the trash", async ({ page, request }) => {
  const p = await makeProject(request, tag("menu"));
  const renamed = tag("renamed");
  await page.goto(`/p/${p.id}/library`);
  const menu = page.getByRole("button", { name: `Actions for ${p.name}` });
  await expect(menu).toBeVisible(FIRST_PAINT);

  await menu.click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Project name" }).fill(renamed);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(switcher(page)).toContainText(renamed);

  await page.getByRole("button", { name: `Actions for ${renamed}` }).click();
  await page.getByRole("menuitem", { name: "View trash" }).click();
  await expect(page).toHaveURL(/view=trash$/);
  await expect(page.getByText("The trash is empty")).toBeVisible(FIRST_PAINT);

  await page.getByRole("button", { name: `Actions for ${renamed}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByTestId("project-card").filter({ hasText: renamed })).toHaveCount(0);

  // It is in the trash, and Restore brings it back.
  await page.getByRole("button", { name: "Trash" }).click();
  const trashed = page.getByTestId("trashed-project").filter({ hasText: renamed });
  await expect(trashed).toBeVisible();
  await trashed.getByRole("button", { name: `Restore ${renamed}` }).click();
  await expect(trashed).toHaveCount(0);
  await page.getByRole("button", { name: "Trash" }).click();
  await expect(page.getByTestId("project-card").filter({ hasText: renamed })).toBeVisible();
});

test("the Projects page shows cards with counts and a cover, and a New project tile", async ({ page, request }) => {
  const p = await makeProject(request, tag("cover"));
  await makeImage(page, p.id, tag("something to cover"));
  await page.goto("/projects");
  const card = page.getByTestId("project-card").filter({ hasText: p.name });
  await expect(card).toContainText("1 image, 0 clips", FIRST_PAINT);
  await expect(card.locator("img")).toHaveCount(1);
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.getByRole("textbox", { name: "Project name" })).toBeVisible();
  await page.keyboard.press("Escape");
  await card.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/p/${p.id}/image$`));
});

test("deleting an image sends it to the project's trash, and Restore puts it back", async ({ page, request }) => {
  const p = await makeProject(request, tag("trash"));
  const text = tag("to be trashed");
  await makeImage(page, p.id, text);
  await page.goto(`/p/${p.id}/library`);
  const tile = page.getByTestId("asset-tile").first();
  await tile.hover();
  await tile.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("asset-tile")).toHaveCount(0);

  await page.getByRole("radio", { name: "Trash" }).click();
  const trashed = page.getByTestId("trash-tile");
  await expect(trashed).toHaveCount(1, FIRST_PAINT);
  await trashed.getByRole("button", { name: /^Restore/ }).click();
  await expect(trashed).toHaveCount(0);

  await page.getByRole("radio", { name: "All" }).click();
  await expect(page.getByTestId("asset-tile")).toHaveCount(1, FIRST_PAINT);
});

test("work made before projects stays in Unsorted, which only has a Library", async ({ page, request }) => {
  const made = await request.post("/api/generations", { data: { prompt: tag("old work") } }); // no project
  expect(made.status()).toBe(200);
  await page.goto("/projects");
  const card = page.getByTestId("project-card").filter({ hasText: "Unsorted" });
  await expect(card).toBeVisible(FIRST_PAINT);
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/p\/unsorted\/library$/);
  await expect(page.getByTestId("asset-tile").first()).toBeVisible(FIRST_PAINT);
  await page.goto("/p/unsorted/image"); // nothing is made here
  await expect(page).toHaveURL(/\/projects$/, FIRST_PAINT);
});

test("a project that doesn't exist sends you to the Projects page", async ({ page }) => {
  await page.goto("/p/00000000-0000-4000-8000-000000000099/image");
  await expect(page).toHaveURL(/\/projects$/, FIRST_PAINT);
});

test("with the sidebar hidden, its edge brings it back", async ({ page }) => {
  await page.goto(`/p/${projectId()}/image`);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "true");
  await expect(page.getByTestId("sidebar-edge")).toBeAttached();
  await page.getByRole("button", { name: "Show sidebar" }).click();
  await expect(page.locator("#sidebar")).toHaveAttribute("data-collapsed", "false");
  await expect(switcher(page)).toBeVisible();
});
