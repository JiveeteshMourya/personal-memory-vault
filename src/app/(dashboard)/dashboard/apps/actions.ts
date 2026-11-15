"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createApiKey, createApp, deleteApp, revokeApiKey } from "@/data/apps";

const APPS_PATH = "/dashboard/apps";

/**
 * What the register form gets back. On success it carries the new key: the only time its plaintext
 * leaves the server. Nothing else echoes the submitted fields (the form doesn't reset).
 */
export type RegisterAppState =
  | { ok: true; appName: string; key: string }
  | {
      ok: false;
      errors?: { name?: string[]; description?: string[] };
      message?: string;
    }
  | undefined;

/** A key action's result. `key` is the new plaintext key, shown to the owner once. */
export type NewKeyResult = { ok: true; key: string } | { ok: false };

const appSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name the app." })
    .max(60, { error: "Use 60 characters or fewer." }),
  description: z
    .string()
    .trim()
    .max(280, { error: "Use 280 characters or fewer." })
    .transform(value => value || undefined),
});

const id = z.uuid();

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function registerAppAction(
  _state: RegisterAppState,
  formData: FormData
): Promise<RegisterAppState> {
  const parsed = appSchema.safeParse({
    name: field(formData, "name"),
    description: field(formData, "description"),
  });
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const created = await createApp(parsed.data);
  if (!created.ok) {
    return { ok: false, errors: { name: ["You already have an app with this name."] } };
  }

  const issued = await createApiKey(created.app.id);
  revalidatePath(APPS_PATH);
  // Only if the app vanished in between (deleted from another tab). It can't be used without a key.
  if (!issued) return { ok: false, message: "The app was removed before its key was issued." };
  return { ok: true, appName: created.app.name, key: issued.key };
}

/** Issues a new key for an app, revoking its current one. */
export async function createApiKeyAction(appId: string): Promise<NewKeyResult> {
  const parsed = id.safeParse(appId);
  if (!parsed.success) return { ok: false };

  const issued = await createApiKey(parsed.data);
  if (!issued) return { ok: false };
  revalidatePath(APPS_PATH);
  return { ok: true, key: issued.key };
}

export async function revokeApiKeyAction(keyId: string): Promise<{ ok: boolean }> {
  const parsed = id.safeParse(keyId);
  if (!parsed.success) return { ok: false };

  const revoked = await revokeApiKey(parsed.data);
  if (revoked) revalidatePath(APPS_PATH);
  return { ok: revoked };
}

export async function deleteAppAction(appId: string): Promise<{ ok: boolean }> {
  const parsed = id.safeParse(appId);
  if (!parsed.success) return { ok: false };

  const deleted = await deleteApp(parsed.data);
  if (deleted) revalidatePath(APPS_PATH);
  return { ok: deleted };
}
