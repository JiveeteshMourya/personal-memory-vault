import "server-only";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { auth } from "@/server/lib/auth";

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
