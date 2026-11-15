import "server-only";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/** The signed-in vault owner. `id` is the owner id that every feature table stores as `user_id`. */
export type UserDTO = { id: string; name: string; email: string };

/**
 * The signed-in owner, or null. Checks the session against the database, and runs once per
 * render pass however many components ask. Reads the request, so callers in a page or layout
 * render behind a `<Suspense>` boundary.
 */
export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

/**
 * The signed-in owner, or a redirect to `/sign-in`. Every DAL function that reads or writes the
 * owner's data starts with it, so it holds even when a request skips the proxy.
 */
export async function requireUser(): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export type AuthResult = { ok: true } | { ok: false; error: "email_taken" | "invalid_credentials" };

/** Creates the account and signs it in (sets the session cookie). Only for the sign-up action. */
export async function signUpWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    await auth.api.signUpEmail({ body: input, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (isAPIError(error) && error.body?.code?.startsWith("USER_ALREADY_EXISTS")) {
      return { ok: false, error: "email_taken" };
    }
    throw error;
  }
}

/** Checks the credentials and sets the session cookie. Only for the sign-in action. */
export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    await auth.api.signInEmail({ body: input, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
      return { ok: false, error: "invalid_credentials" };
    }
    throw error;
  }
}

/** Deletes the current session and clears its cookie. Safe to call without a session. */
export async function endSession(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
}
