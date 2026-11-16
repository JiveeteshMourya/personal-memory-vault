import "server-only";
import * as grantRepository from "@/server/repository/grant.repository";
import { evaluateAccess } from "@/server/services/access-policy.service";
import type { MemoryCategory } from "@/shared/constants/memory-taxonomy";
import type { GrantOperation } from "@/shared/constants/permissions";
import type { AccessScope, AccessSource, AppPermissions, Grant } from "@/shared/types/grant.types";

// ── Owner-facing: pass the id of the owner from `requireUser`. Writes return true once the app is in
// the requested state, and false if it isn't the owner's. ──

/** One app's grants and source permissions. Someone else's app has none. */
export function getAppPermissions(userId: string, appId: string): Promise<AppPermissions> {
  return grantRepository.getAppPermissions(userId, appId);
}

/** How many topics each of the owner's apps may read and save, keyed by app id. */
export function getGrantCounts(
  userId: string
): Promise<Map<string, Record<GrantOperation, number>>> {
  return grantRepository.getGrantCounts(userId);
}

/** Grants an app one operation on one category, or changes the tier cap of that grant. */
export function setGrant(userId: string, appId: string, grant: Grant): Promise<boolean> {
  return grantRepository.setGrant(userId, appId, grant);
}

/** Revokes one grant. Revoking deletes the row: no expiry, no history. */
export function removeGrant(
  userId: string,
  appId: string,
  operation: GrantOperation,
  category: MemoryCategory
): Promise<boolean> {
  return grantRepository.removeGrant(userId, appId, operation, category);
}

/** Allows or denies an app reading one source. Both apps must be the owner's. */
export function setSourceAccess(
  userId: string,
  appId: string,
  source: AccessSource,
  allowed: boolean
): Promise<boolean> {
  return grantRepository.setSourceAccess(userId, appId, source, allowed);
}

/** Removes every grant and source permission the app holds, so it can read and write nothing. */
export function revokeAllForApp(userId: string, appId: string): Promise<boolean> {
  return grantRepository.revokeAllForApp(userId, appId);
}

// ── App-facing: only with an identity from `requireApp` (or the owner's own app pick in the
// Playground). ──

/** What `appId` may do in `userId`'s vault for one operation, decided by the policy engine. */
export async function getAccessScope(
  userId: string,
  appId: string,
  operation: GrantOperation
): Promise<AccessScope> {
  const { grants, sources } = await grantRepository.getAccessRules(userId, appId, operation);
  return evaluateAccess({ grants, sources, operation });
}
