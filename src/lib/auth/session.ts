import { createHmac, timingSafeEqual } from "node:crypto";

// Pure helpers for the password gate. No framework imports, so `proxy.ts`, route
// handlers and tests all use the same code.

export const SESSION_COOKIE = "framerald_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const b64url = (buf: Buffer) => buf.toString("base64url");

/** The signing key. Changing the password or SESSION_SECRET signs everyone out. */
export function deriveSessionKey(password: string, sessionSecret = ""): Buffer {
  return createHmac("sha256", "framerald-session-v1").update(`${password}\0${sessionSecret}`).digest();
}

function sign(payload: string, key: Buffer): Buffer {
  return createHmac("sha256", key).update(payload).digest();
}

/** `<payload>.<signature>`; the payload is just the expiry time. */
export function createSessionToken(key: Buffer, now = Date.now(), ttlMs = SESSION_TTL_MS): string {
  const payload = b64url(Buffer.from(JSON.stringify({ exp: now + ttlMs })));
  return `${payload}.${b64url(sign(payload, key))}`;
}

export function verifySessionToken(token: string | null | undefined, key: Buffer, now = Date.now()): boolean {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [payload, sig] = parts;

  const given = Buffer.from(sig, "base64url");
  const expected = sign(payload, key);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof exp === "number" && now < exp;
  } catch {
    return false;
  }
}

/** Compares in constant time, whatever the lengths: both sides are hashed first. */
export function passwordMatches(input: string, expected: string): boolean {
  if (!expected || !input) return false;
  const key = Buffer.from("framerald-password-compare");
  return timingSafeEqual(createHmac("sha256", key).update(input).digest(), createHmac("sha256", key).update(expected).digest());
}

/** Where to go after signing in. Only same-site paths; anything else goes to the Image studio. */
export function isSafeNext(next: string | null | undefined): string {
  const fallback = "/image";
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return fallback;
  return next;
}
