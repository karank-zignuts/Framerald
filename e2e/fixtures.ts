import { test as base, expect } from "@playwright/test";
import { trackAsset } from "./cleanup";

// Fails any test that hits a page error or a 5xx from the app or its Supabase
// project, so live bugs surface as text instead of screenshots. Also records
// uploads so the teardown can delete them.
/** The project the tests work in, made by global-setup.ts. */
export const projectId = () => process.env.E2E_PROJECT_ID!;

export const test = base.extend({
  page: async ({ page }, use) => {
    // The old addresses (/image, /library) open the project you were last in. Tests start in their own.
    const id = projectId();
    await page.addInitScript((value) => localStorage.setItem("framerald.project", value), id);
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("response", async (r) => {
      if (r.url().endsWith("/api/uploads/complete") && r.request().method() === "POST" && r.ok()) {
        const body = await r.json().catch(() => null);
        if (body?.id) trackAsset(body.id);
      }
      if (r.status() < 500) return;
      const host = new URL(r.url()).hostname;
      const own = host === "localhost" || host === "127.0.0.1" || host.endsWith(".supabase.co");
      if (own) problems.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });
    await use(page);
    expect(problems, "console/network problems").toEqual([]);
  },
});
export { expect };
