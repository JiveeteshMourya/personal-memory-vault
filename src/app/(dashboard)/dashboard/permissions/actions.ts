"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { removeGrant, revokeAllForApp, setGrant, setSourceAccess } from "@/data/grants";
import { GRANT_OPERATIONS } from "@/db/schema";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/lib/memory-taxonomy";

const PERMISSIONS_PATH = "/dashboard/permissions";

const grantChange = z.strictObject({
  appId: z.uuid(),
  operation: z.enum(GRANT_OPERATIONS),
  category: z.enum(MEMORY_CATEGORIES),
  // Null takes the grant away ("No access").
  maxSensitivity: z.enum(SENSITIVITY_TIERS).nullable(),
});

const sourceChange = z.strictObject({
  appId: z.uuid(),
  // "user" is the owner's own entries; otherwise the id of the app whose writes may be read.
  source: z.union([z.literal("user"), z.uuid()]),
  allowed: z.boolean(),
});

export type GrantChange = z.input<typeof grantChange>;
export type SourceChange = z.input<typeof sourceChange>;

/** Sets the tier cap of one cell of the matrix, or removes the grant. */
export async function setGrantAction(change: GrantChange): Promise<{ ok: boolean }> {
  const parsed = grantChange.safeParse(change);
  if (!parsed.success) return { ok: false };

  const { appId, operation, category, maxSensitivity } = parsed.data;
  const ok = maxSensitivity
    ? await setGrant(appId, { operation, category, maxSensitivity })
    : await removeGrant(appId, operation, category);
  if (ok) revalidatePath(PERMISSIONS_PATH);
  return { ok };
}

/** Switches one "Reads data from" source on or off. */
export async function setSourceAccessAction(change: SourceChange): Promise<{ ok: boolean }> {
  const parsed = sourceChange.safeParse(change);
  if (!parsed.success) return { ok: false };

  const { appId, source, allowed } = parsed.data;
  const ok = await setSourceAccess(
    appId,
    source === "user" ? { type: "user" } : { type: "app", appId: source },
    allowed
  );
  if (ok) revalidatePath(PERMISSIONS_PATH);
  return { ok };
}

export async function revokeAllAction(appId: string): Promise<{ ok: boolean }> {
  const parsed = z.uuid().safeParse(appId);
  if (!parsed.success) return { ok: false };

  const ok = await revokeAllForApp(parsed.data);
  if (ok) revalidatePath(PERMISSIONS_PATH);
  return { ok };
}
