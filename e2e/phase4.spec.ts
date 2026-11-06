import { test, expect , projectId } from "./fixtures";

// Spend, projects and search in the browser, with the AI mocked. Test data is named "[e2e] ..." so the
// teardown can delete it.

const unique = () => Math.random().toString(36).slice(2, 8);
const tag = (s: string) => `[e2e] ${s} ${unique()}`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FIRST_PAINT = { timeout: 45_000 };

test("Spend shows what you've spent, by day, kind and model", async ({ page }) => {
  await page.request.post("/api/generations", { data: { projectId: projectId(), prompt: tag("spend check") } }); // ₹3.43 (about $0.039) on the mock
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

test("search the Library by prompt: the URL follows, matches show, and no match has a way out", async ({ page }) => {
  const word = `quokka${unique()}`;
  const hitText = `[e2e] a ${word} smiling`;
  const missText = tag("a heron standing");
  await page.request.post("/api/generations", { data: { projectId: projectId(), prompt: hitText } });
  await page.request.post("/api/generations", { data: { projectId: projectId(), prompt: missText } });

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

test("the download link uses the file's real type", async ({ page }) => {
  const text = tag("download name");
  await page.request.post("/api/generations", { data: { projectId: projectId(), prompt: text } });
  await page.goto("/library");
  await page.getByRole("button", { name: new RegExp(`^Open image: ${esc(text)}$`) }).click(FIRST_PAINT);
  const href = await page.getByTestId("asset-dialog").getByRole("link", { name: "Download" }).getAttribute("href");
  expect(new URL(href!).searchParams.get("download")).toMatch(/^framerald-[0-9a-f]{8}\.png$/);
});
