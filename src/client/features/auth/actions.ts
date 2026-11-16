"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { endSession, signInWithEmail, signUpWithEmail } from "@/server/services/auth.service";

/**
 * What the sign-in and sign-up forms get back when they don't redirect. `values` refills the
 * fields React resets after the action; the password is never sent back.
 */
export type AuthFormState =
  | {
      errors?: { name?: string[]; email?: string[]; password?: string[] };
      message?: string;
      values?: { name?: string; email?: string };
    }
  | undefined;

// Trim before validating, so a pasted address with stray spaces still passes.
const email = z
  .string()
  .trim()
  .pipe(z.email({ error: "Enter a valid email address." }));

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter your name." })
    .max(100, { error: "Use 100 characters or fewer." }),
  email,
  // Better Auth's own limits. Passwords are never trimmed.
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .max(128, { error: "Use 128 characters or fewer." }),
});

const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: field(formData, "name"), email: field(formData, "email") };
  const parsed = signUpSchema.safeParse({ ...values, password: field(formData, "password") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const result = await signUpWithEmail(parsed.data);
  if (!result.ok) {
    return { errors: { email: ["An account with this email already exists."] }, values };
  }

  redirect("/dashboard");
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: field(formData, "email") };
  const parsed = signInSchema.safeParse({ ...values, password: field(formData, "password") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const result = await signInWithEmail(parsed.data);
  if (!result.ok) {
    return { message: "That email and password don’t match.", values };
  }

  redirect("/dashboard");
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
