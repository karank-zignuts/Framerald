import { test as base, expect } from "@playwright/test";

// Fails any test that hits a page error or a 5xx from the app or its Supabase
// project, so live bugs surface as text instead of screenshots.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("response", (r) => {
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
