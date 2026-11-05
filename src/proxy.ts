import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { bearerMatches, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// The password gate. With APP_PASSWORD empty (local use) every request passes. With it set,
// everything needs a valid signed session cookie except the login page, the auth routes,
// and the cron route (which needs its own bearer token). Runs on the Node runtime.

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/status"]);

export function proxy(request: NextRequest) {
  const config = authConfig();
  if (!config.enabled) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (pathname.startsWith("/api/cron/")) {
    return bearerMatches(request.headers.get("authorization"), config.cronSecret)
      ? NextResponse.next()
      : NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, config.key)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip static files so the login page can load its own styles.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|txt)$).*)"],
};
