import { test, expect } from "./fixtures";

// Template: copy per flow. Assert on roles and text, not pixels.
test("home loads with the prompt box", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What do you want to make?" })).toBeVisible({
    timeout: 45_000, // first paint is slow on the dev server (on-demand compile)
  });
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
});
