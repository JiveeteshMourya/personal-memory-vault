import { NextResponse, type NextRequest } from "next/server";

import { hasSessionCookie } from "@/server/lib/auth-cookie";

// Optimistic only: a visitor without a session cookie never needs to render the dashboard. The
// real check is `requireUser()` before every service call. Always redirect, never rewrite (a rewrite breaks
// `usePathname` on prerendered pages).
export function proxy(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
