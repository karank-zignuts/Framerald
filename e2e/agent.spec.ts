import { openChip } from "./chips";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// The Agent in the browser with the AI mocked (E2E_MOCK_AI=1). The mock streams a short
// reply and a 3-shot list. "[fail]" fails the reply, "[slow]" slows it so Stop can be pressed.
// Every message starts with "[e2e]" so the teardown can delete the chats.

const tag = (s: string) => `[e2e] ${s} ${Math.random().toString(36).slice(2, 8)}`;
const FIRST_PAINT = { timeout: 45_000 };

const message = (page: Page) => page.getByRole("textbox", { name: "Message" });
const send = (page: Page) => page.getByRole("button", { name: "Send", exact: true });

async function openAgent(page: Page) {
  await page.goto("/agent");
  await expect(message(page)).toBeVisible(FIRST_PAINT);
}

async function ask(page: Page, text: string) {
  await message(page).fill(text);
  await send(page).click();
  await expect(page.getByTestId("shot-card").first()).toBeVisible({ timeout: 30_000 });
}

test("idea to shot list to a generated frame, in one flow", async ({ page }) => {
  const idea = tag("a lighthouse in a storm");
  await openAgent(page);
  await expect(page.getByText("What are you making?")).toBeVisible();

  await ask(page, idea);
  await expect(page).toHaveURL(/\/agent\?thread=/);
  await expect(page.getByTestId("shot-card")).toHaveCount(3);
  await expect(page.getByText(/Send a shot to Image, or to Video/)).toBeVisible();
  await expect(page.getByTestId("reply-cost")).toHaveText("≈ ₹0.10"); // the mock's usage is about $0.0011

  // The chat is named after the first message and listed.
  await expect(page.getByRole("button", { name: idea.slice(0, 60) })).toBeVisible();

  // Send the first shot to the Image studio, ready to generate.
  await page.getByTestId("shot-card").first().getByRole("link", { name: /Send to Image/ }).click();
  await expect(page).toHaveURL(/\/image\?prompt=/);
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveValue(new RegExp(idea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), FIRST_PAINT);
  await openChip(page, /^Aspect ratio/);
  await expect(page.getByRole("radio", { name: "Aspect ratio 16:9" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 }); // the project's history is shown too
});

test("Refine this shot puts the shot back in the chat box", async ({ page }) => {
  await openAgent(page);
  await ask(page, tag("a quiet harbour"));
  await page.getByTestId("shot-card").nth(1).getByRole("button", { name: "Refine this shot" }).click();
  await expect(message(page)).toHaveValue(/^Refine shot 2: "\[e2e\] a quiet harbour/);
  await expect(message(page)).toBeFocused();
});

test("rename and delete a chat", async ({ page }) => {
  await openAgent(page);
  await ask(page, tag("to rename"));

  const renamed = tag("renamed chat");
  await page.getByRole("button", { name: "Rename chat" }).click();
  await page.getByRole("textbox", { name: "Chat name" }).fill(renamed);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("thread-title")).toHaveText(renamed);
  await expect(page.getByRole("button", { name: renamed })).toBeVisible();

  await page.getByRole("button", { name: "Delete chat" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Delete this chat?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("What are you making?")).toBeVisible();
  await expect(page.getByRole("button", { name: renamed })).toBeHidden();
});

test("a failed reply says why and the chat carries on", async ({ page }) => {
  await openAgent(page);
  await message(page).fill(tag("[fail] go"));
  await send(page).click();
  await expect(page.getByTestId("reply-error")).toContainText("Mock failure", { timeout: 30_000 });

  await ask(page, tag("try again"));
  await expect(page.getByTestId("shot-card")).toHaveCount(3);
});

test("Stop ends a reply and keeps what was written", async ({ page }) => {
  await openAgent(page);
  await message(page).fill(tag("[slow] a long idea"));
  await send(page).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(page.getByTestId("assistant-message").first()).toContainText("Here is a plan");
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeVisible();
  await expect(page.getByTestId("reply-error")).toContainText("Stopped", { timeout: 15_000 });
  await expect(page.getByTestId("shot-card")).toHaveCount(0);
});

test("opening an earlier chat shows its messages", async ({ page }) => {
  const first = tag("first chat");
  const second = tag("second chat");
  await openAgent(page);
  await ask(page, first);
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByText("What are you making?")).toBeVisible();
  await ask(page, second);

  await page.getByRole("button", { name: first.slice(0, 60) }).click();
  await expect(page.getByTestId("user-message")).toHaveText(first);
  await expect(page.getByTestId("thread-title")).toHaveText(first.slice(0, 60));
});

test("Refine with agent rewrites the prompt in the Image studio, and Undo brings it back", async ({ page }) => {
  const original = tag("a red door");
  await page.goto("/image");
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await expect(prompt).toBeVisible(FIRST_PAINT);
  await expect(page.getByRole("button", { name: "Refine with agent" })).toBeDisabled(); // nothing to refine yet

  await prompt.fill(original);
  await page.getByRole("button", { name: "Refine with agent" }).click();
  await expect(prompt).toHaveValue(new RegExp("shot on 35mm"), { timeout: 30_000 });
  await expect(prompt).toHaveValue(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(prompt).toHaveValue(original);
  await expect(page.getByRole("button", { name: "Undo" })).toBeHidden();
});

test("Send to Video opens the Video studio with the shot ready", async ({ page }) => {
  const idea = tag("a train crossing a bridge");
  await openAgent(page);
  await ask(page, idea);
  await page.getByTestId("shot-card").first().getByRole("link", { name: /Send to Video/ }).click();
  await expect(page).toHaveURL(/\/video\?prompt=/);
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveValue(new RegExp(idea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), FIRST_PAINT);
  await expect(page.getByRole("radio", { name: "Aspect ratio 16:9" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
});
