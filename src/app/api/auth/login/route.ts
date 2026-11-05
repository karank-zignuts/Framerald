import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authConfig } from "@/lib/auth/config";
import { createLoginLimiter } from "@/lib/auth/rate-limit";
import { createSessionToken, isSafeNext, passwordMatches, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/session";
import { assertSameOrigin, handle, HttpError } from "@/lib/http";

const MINUTE = 60_000;
// Per server instance; see rate-limit.ts.
const limiter = createLoginLimiter({ maxFailures: 5, baseLockMs: 30_000, maxLockMs: 15 * MINUTE, windowMs: 15 * MINUTE });

const bodySchema = z.object({
  password: z.string().max(200),
  next: z.string().max(500).nullish(),
});

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export const POST = handle(async (request: NextRequest) => {
  assertSameOrigin(request);
  const config = authConfig();
  const body = bodySchema.parse(await request.json().catch(() => ({})));
  const next = isSafeNext(body.next);
  if (!config.enabled) return NextResponse.json({ ok: true, next });

  const key = clientKey(request);
  const state = limiter.check(key, Date.now());
  if (!state.allowed) {
    const seconds = Math.ceil(state.retryAfterMs / 1000);
    return NextResponse.json({ error: `Too many tries. Wait ${seconds} seconds and try again.` }, { status: 429, headers: { "Retry-After": String(seconds) } });
  }

  if (!passwordMatches(body.password, config.password)) {
    limiter.fail(key, Date.now());
    throw new HttpError(401, "That password isn't right.");
  }

  limiter.succeed(key);
  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(SESSION_COOKIE, createSessionToken(config.key), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
});
