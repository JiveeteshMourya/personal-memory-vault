import { NextResponse, type NextRequest } from "next/server";

import { hasSessionCookie } from "@/lib/auth-cookie";

// Optimistic only: a visitor without a session cookie never needs to render the dashboard. The
// real check is `requireUser()` in the DAL. Always redirect, never rewrite (a rewrite breaks
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
