import { NextResponse, type NextRequest } from "next/server";

/**
 * One Next.js project serves two hosts: the public site on the apex domain and the app on the
 * app subdomain (NEXT_PUBLIC_APP_URL, e.g. https://app.example.com). App routes requested on any
 * other host are redirected to the app host. Unset in local dev, where this does nothing.
 */
const APP_PATHS = ["/home", "/learn", "/chat", "/earn", "/stake", "/profile", "/settings", "/leaderboard", "/league", "/language", "/admin"];

export function middleware(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.next();
  const app = new URL(appUrl);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (host === app.host || host.startsWith("localhost") || host.endsWith(".vercel.app")) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL(pathname + search, app), 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
