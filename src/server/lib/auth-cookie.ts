import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

/**
 * Whether the request carries a Better Auth session cookie. It only checks that the cookie
 * exists, not that the session is valid: good for the proxy's optimistic redirect, never for
 * authorization (that is `requireUser`, `@/server/middlewares/require-user.middleware`).
 */
export function hasSessionCookie(request: NextRequest): boolean {
  return getSessionCookie(request) !== null;
}
