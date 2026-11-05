import { test as base, expect } from "@playwright/test";
import { trackAsset } from "./cleanup";

// Fails any test that hits a page error or a 5xx from the app or its Supabase
// project, so live bugs surface as text instead of screenshots. Also records
// uploads so the teardown can delete them.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("response", async (r) => {
      if (r.url().endsWith("/api/uploads") && r.request().method() === "POST" && r.ok()) {
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
