import { describe, expect, it } from "vitest";
import { createSessionToken, deriveSessionKey, isSafeNext, passwordMatches, verifySessionToken } from "./session";

const key = deriveSessionKey("correct horse");
const now = 1_800_000_000_000;
const DAY = 86_400_000;

describe("session tokens", () => {
  it("accepts a token it just made", () => {
    expect(verifySessionToken(createSessionToken(key, now), key, now + DAY)).toBe(true);
  });

  it("refuses an expired token, including at the exact expiry", () => {
    const token = createSessionToken(key, now, 1000);
    expect(verifySessionToken(token, key, now + 999)).toBe(true);
    expect(verifySessionToken(token, key, now + 1000)).toBe(false);
  });

  it("refuses a token signed with a different password or secret", () => {
    const token = createSessionToken(key, now);
    expect(verifySessionToken(token, deriveSessionKey("another password"), now)).toBe(false);
    expect(verifySessionToken(token, deriveSessionKey("correct horse", "extra"), now)).toBe(false);
  });

  it("refuses a token whose payload or signature was changed", () => {
    const [payload, sig] = createSessionToken(key, now).split(".");
    const forged = Buffer.from(JSON.stringify({ exp: now + 365 * DAY })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`, key, now)).toBe(false);
    expect(verifySessionToken(`${payload}.${sig.slice(0, -2)}AA`, key, now)).toBe(false);
  });

  it("refuses garbage without throwing", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "....", "%%%.%%%", undefined, null]) {
      expect(verifySessionToken(bad as string, key, now)).toBe(false);
    }
  });

  it("derives the same key every time, and a different one when the password or secret changes", () => {
    expect(deriveSessionKey("p", "s").equals(deriveSessionKey("p", "s"))).toBe(true);
    expect(deriveSessionKey("p", "s").equals(deriveSessionKey("p", "t"))).toBe(false);
    expect(deriveSessionKey("p").equals(deriveSessionKey("q"))).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("matches only the exact password, whatever the lengths", () => {
    expect(passwordMatches("secret", "secret")).toBe(true);
    expect(passwordMatches("secret", "Secret")).toBe(false);
    expect(passwordMatches("secre", "secret")).toBe(false);
    expect(passwordMatches("", "secret")).toBe(false);
    expect(passwordMatches("secret", "")).toBe(false);
  });
});

describe("isSafeNext", () => {
  it("keeps same-site paths, query included", () => {
    expect(isSafeNext("/library?view=videos&q=door")).toBe("/library?view=videos&q=door");
  });
  it("falls back to the Image studio for anything that could leave the site or loop", () => {
    for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "", "library", "/login", "/login?next=/x"]) {
      expect(isSafeNext(bad)).toBe("/image");
    }
    expect(isSafeNext(null)).toBe("/image");
  });
});
