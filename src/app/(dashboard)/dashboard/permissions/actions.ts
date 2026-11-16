"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { approveConsentRequest, denyConsentRequest } from "@/data/consent";
import { removeGrant, revokeAllForApp, setGrant, setSourceAccess } from "@/data/grants";
import { GRANT_OPERATIONS } from "@/db/schema";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/lib/memory-taxonomy";

const PERMISSIONS_PATH = "/dashboard/permissions";
// The Overview lists pending requests too.
const OVERVIEW_PATH = "/dashboard";

// "user" is the owner's own entries; otherwise the id of the app whose writes may be read.
const source = z.union([z.literal("user"), z.uuid()]);

const toAccessSource = (value: z.output<typeof source>) =>
  value === "user" ? ({ type: "user" } as const) : ({ type: "app", appId: value } as const);

const grantChange = z.strictObject({
  appId: z.uuid(),
  operation: z.enum(GRANT_OPERATIONS),
  category: z.enum(MEMORY_CATEGORIES),
  // Null takes the grant away ("No access").
  maxSensitivity: z.enum(SENSITIVITY_TIERS).nullable(),
});

const sourceChange = z.strictObject({
  appId: z.uuid(),
  source,
  allowed: z.boolean(),
});

const consentApproval = z.strictObject({
  requestId: z.uuid(),
  categories: z.array(z.enum(MEMORY_CATEGORIES)).min(1).max(MEMORY_CATEGORIES.length),
  maxSensitivity: z.enum(SENSITIVITY_TIERS),
  // Sources to allow on top of what the app already reads from. Reads only.
  sources: z.array(source).max(100),
});

export type GrantChange = z.input<typeof grantChange>;
export type SourceChange = z.input<typeof sourceChange>;
export type ConsentApproval = z.input<typeof consentApproval>;

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
  const ok = await setSourceAccess(appId, toAccessSource(source), allowed);
  if (ok) revalidatePath(PERMISSIONS_PATH);
  return { ok };
}

/**
 * Approves an app's consent request with what the owner allowed: the request as asked, or narrower.
 * Fails if it was already decided, its app is gone, or the approval asks for more than the app did.
 */
export async function approveConsentAction(approval: ConsentApproval): Promise<{ ok: boolean }> {
  const parsed = consentApproval.safeParse(approval);
  if (!parsed.success) return { ok: false };

  const { requestId, categories, maxSensitivity, sources } = parsed.data;
  const ok = await approveConsentRequest(requestId, {
    categories,
    maxSensitivity,
    sources: [...new Set(sources)].map(toAccessSource),
  });
  if (ok) {
    revalidatePath(PERMISSIONS_PATH);
    revalidatePath(OVERVIEW_PATH);
  }
  return { ok };
}

/** Denies an app's consent request. Its access stays exactly as it was. */
export async function denyConsentAction(requestId: string): Promise<{ ok: boolean }> {
  const parsed = z.uuid().safeParse(requestId);
  if (!parsed.success) return { ok: false };

  const ok = await denyConsentRequest(parsed.data);
  if (ok) {
    revalidatePath(PERMISSIONS_PATH);
    revalidatePath(OVERVIEW_PATH);
  }
  return { ok };
}

export async function revokeAllAction(appId: string): Promise<{ ok: boolean }> {
  const parsed = z.uuid().safeParse(appId);
  if (!parsed.success) return { ok: false };

  const ok = await revokeAllForApp(parsed.data);
  if (ok) revalidatePath(PERMISSIONS_PATH);
  return { ok };
}
