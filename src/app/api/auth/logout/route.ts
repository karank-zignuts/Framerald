import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { assertSameOrigin, handle } from "@/lib/http";

export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
});
