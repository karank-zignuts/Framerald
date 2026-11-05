import type { Page } from "@playwright/test";

/** The Image composer keeps its less-used controls in chips that open small menus. Opens one by its name. */
export async function openChip(page: Page, name: RegExp | string) {
  await page.getByRole("button", { name }).click();
}
