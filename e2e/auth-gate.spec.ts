import { test, expect } from "@playwright/test";
import { createSessionToken, deriveSessionKey } from "../src/lib/auth/session";

// The password gate, on a second server started with APP_PASSWORD and CRON_SECRET set
// (see playwright.config.ts). Each test uses its own x-forwarded-for address so the
// login rate limiter's memory of one test never affects another.

const PASSWORD = "e2e-password-123";
const CRON_SECRET = "e2e-cron-secret";
const SESSION_COOKIE = "framerald_session";
let nextIp = 10;
const ip = () => ({ "x-forwarded-for": `10.1.0.${nextIp++}` });

test("pages send you to the login page, remembering where you were going", async ({ page }) => {
  await page.goto("/library?view=videos", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?next=%2Flibrary%3Fview%3Dvideos$/, { timeout: 45_000 });
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("the API says 401 without a session, but the status and login routes stay open", async ({ request }) => {
  const res = await request.get("/api/library");
  expect(res.status()).toBe(401);
  expect((await res.json()).error).toBe("Sign in first.");
  expect((await request.get("/api/projects")).status()).toBe(401);
  expect((await request.post("/api/generations", { data: { prompt: "x" } })).status()).toBe(401);

  expect(await (await request.get("/api/auth/status")).json()).toEqual({ enabled: true });
  expect((await request.get("/favicon.ico")).status()).toBe(200);
});

test("a wrong password is refused, and the right one signs you in with a safe cookie", async ({ request }) => {
  const headers = ip();
  const wrong = await request.post("/api/auth/login", { headers, data: { password: "nope" } });
  expect(wrong.status()).toBe(401);
  expect((await wrong.json()).error).toBe("That password isn't right.");
  expect(wrong.headers()["set-cookie"]).toBeUndefined();

  const ok = await request.post("/api/auth/login", { headers, data: { password: PASSWORD, next: "/library" } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ ok: true, next: "/library" });
  const cookie = ok.headers()["set-cookie"];
  expect(cookie).toContain(`${SESSION_COOKIE}=`);
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/SameSite=Lax/i);
  expect(cookie).toMatch(/Max-Age=\d+/i);

  // The session cookie is now in this request context, so the API opens up.
  expect((await request.get("/api/projects")).status()).toBe(200);
});

test("sign in through the page, stay signed in after a reload, then sign out", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.setExtraHTTPHeaders(ip());
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("That password isn't right."); // not the route announcer

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/image$/, { timeout: 45_000 });
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible({ timeout: 45_000 });

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await page.goto("/image", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?next=%2Fimage/, { timeout: 30_000 });
});

test("the sign-in redirect can only stay on this site", async ({ request }) => {
  for (const next of ["//evil.example", "https://evil.example/x", "/\\evil.example", "/login"]) {
    const res = await request.post("/api/auth/login", { headers: ip(), data: { password: PASSWORD, next } });
    expect((await res.json()).next, next).toBe("/image");
  }
});

test("five wrong guesses lock the door, even for the right password, for a while", async ({ request }) => {
  const headers = ip();
  for (let i = 0; i < 5; i++) {
    expect((await request.post("/api/auth/login", { headers, data: { password: `wrong${i}` } })).status()).toBe(401);
  }
  const locked = await request.post("/api/auth/login", { headers, data: { password: PASSWORD } });
  expect(locked.status()).toBe(429);
  expect(Number(locked.headers()["retry-after"])).toBeGreaterThan(0);
  expect((await locked.json()).error).toMatch(/Too many tries\. Wait \d+ seconds/);

  // Someone else, from another address, is not affected.
  expect((await request.post("/api/auth/login", { headers: ip(), data: { password: PASSWORD } })).status()).toBe(200);
});

test("a forged, tampered or expired cookie is refused", async ({ playwright, baseURL }) => {
  const key = deriveSessionKey(PASSWORD);
  const good = createSessionToken(key);
  const cases: Record<string, string> = {
    "signed with another password": createSessionToken(deriveSessionKey("another-password")),
    expired: createSessionToken(key, Date.now() - 2000, 1000),
    "payload changed": `${Buffer.from(JSON.stringify({ exp: Date.now() + 1e12 })).toString("base64url")}.${good.split(".")[1]}`,
    garbage: "not-a-token",
  };
  for (const [name, token] of Object.entries(cases)) {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { cookie: `${SESSION_COOKIE}=${token}` } });
    expect((await ctx.get("/api/projects")).status(), name).toBe(401);
    await ctx.dispose();
  }
  const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { cookie: `${SESSION_COOKIE}=${good}` } });
  expect((await ctx.get("/api/projects")).status()).toBe(200); // the control: a good token works
  await ctx.dispose();
});

test("the cron route needs its own bearer token, and a session cookie is not enough", async ({ request, playwright, baseURL }) => {
  expect((await request.get("/api/cron/videos")).status()).toBe(401);
  expect((await request.get("/api/cron/videos", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);

  const ok = await request.get("/api/cron/videos", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(Object.keys(await ok.json()).sort()).toEqual(["checked", "failed", "stillRunning", "succeeded"]);

  const signedIn = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { cookie: `${SESSION_COOKIE}=${createSessionToken(deriveSessionKey(PASSWORD))}` },
  });
  expect((await signedIn.get("/api/cron/videos")).status()).toBe(401);
  await signedIn.dispose();
});
