import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireUser } from "@/data/auth";
import { appGrants, appSourceAccess, connectedApps, type GrantOperation } from "@/db/schema";
import { db } from "@/lib/db";
import type { MemoryCategory } from "@/lib/memory-taxonomy";
import {
  evaluateAccess,
  type AccessScope,
  type AccessSource,
  type Grant,
} from "@/lib/policy/evaluate-access";

/** Everything the owner has allowed one app: its grants and whose memories it may read. */
export type AppPermissions = { grants: Grant[]; sources: AccessSource[] };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const grantColumns = {
  operation: appGrants.operation,
  category: appGrants.category,
  maxSensitivity: appGrants.maxSensitivity,
};

// A null source app means the owner's own entries.
function toSource(sourceAppId: string | null): AccessSource {
  return sourceAppId ? { type: "app", appId: sourceAppId } : { type: "user" };
}

/**
 * True only if every app in `ids` is the owner's. Locks those rows until the transaction ends, so a
 * concurrent delete can't remove an app between this check and the write that references it.
 */
async function lockOwnedApps(tx: Tx, userId: string, ids: string[]): Promise<boolean> {
  const distinct = [...new Set(ids)];
  const owned = await tx
    .select({ id: connectedApps.id })
    .from(connectedApps)
    .where(and(eq(connectedApps.userId, userId), inArray(connectedApps.id, distinct)))
    .for("key share");
  return owned.length === distinct.length;
}

// ── Owner-scoped: each function checks the session and only touches the owner's apps. Writes
// return true once the app is in the requested state, and false if it isn't the owner's. ──

/** One app's grants and source permissions. Someone else's app has none. */
export async function getAppPermissions(appId: string): Promise<AppPermissions> {
  const user = await requireUser();
  const [grants, sources] = await Promise.all([
    db
      .select(grantColumns)
      .from(appGrants)
      .where(and(eq(appGrants.appId, appId), eq(appGrants.userId, user.id))),
    db
      .select({ sourceAppId: appSourceAccess.sourceAppId })
      .from(appSourceAccess)
      .where(and(eq(appSourceAccess.appId, appId), eq(appSourceAccess.userId, user.id))),
  ]);
  return { grants, sources: sources.map(row => toSource(row.sourceAppId)) };
}

/** Grants an app one operation on one category, or changes the tier cap of that grant. */
export async function setGrant(appId: string, grant: Grant): Promise<boolean> {
  const user = await requireUser();
  return db.transaction(async tx => {
    if (!(await lockOwnedApps(tx, user.id, [appId]))) return false;
    await tx
      .insert(appGrants)
      .values({
        userId: user.id,
        appId,
        operation: grant.operation,
        category: grant.category,
        maxSensitivity: grant.maxSensitivity,
      })
      .onConflictDoUpdate({
        target: [appGrants.appId, appGrants.operation, appGrants.category],
        set: { maxSensitivity: grant.maxSensitivity },
      });
    return true;
  });
}

/** Revokes one grant. Revoking deletes the row: no expiry, no history. */
export async function removeGrant(
  appId: string,
  operation: GrantOperation,
  category: MemoryCategory
): Promise<boolean> {
  const user = await requireUser();
  return db.transaction(async tx => {
    if (!(await lockOwnedApps(tx, user.id, [appId]))) return false;
    await tx
      .delete(appGrants)
      .where(
        and(
          eq(appGrants.appId, appId),
          eq(appGrants.userId, user.id),
          eq(appGrants.operation, operation),
          eq(appGrants.category, category)
        )
      );
    return true;
  });
}

/**
 * Allows or denies an app reading one source: the owner's own entries, or one of the owner's apps
 * (the reader itself included). Both apps must be the owner's.
 */
export async function setSourceAccess(
  appId: string,
  source: AccessSource,
  allowed: boolean
): Promise<boolean> {
  const user = await requireUser();
  const sourceAppId = source.type === "app" ? source.appId : null;
  return db.transaction(async tx => {
    const apps = sourceAppId ? [appId, sourceAppId] : [appId];
    if (!(await lockOwnedApps(tx, user.id, apps))) return false;
    if (allowed) {
      await tx
        .insert(appSourceAccess)
        .values({ userId: user.id, appId, sourceAppId })
        .onConflictDoNothing();
    } else {
      await tx
        .delete(appSourceAccess)
        .where(
          and(
            eq(appSourceAccess.appId, appId),
            eq(appSourceAccess.userId, user.id),
            sourceAppId
              ? eq(appSourceAccess.sourceAppId, sourceAppId)
              : isNull(appSourceAccess.sourceAppId)
          )
        );
    }
    return true;
  });
}

/**
 * Removes every grant and source permission the app holds, so it can read and write nothing.
 * Other apps' permission to read what this app wrote is theirs, and stays.
 */
export async function revokeAllForApp(appId: string): Promise<boolean> {
  const user = await requireUser();
  return db.transaction(async tx => {
    if (!(await lockOwnedApps(tx, user.id, [appId]))) return false;
    await tx
      .delete(appGrants)
      .where(and(eq(appGrants.appId, appId), eq(appGrants.userId, user.id)));
    await tx
      .delete(appSourceAccess)
      .where(and(eq(appSourceAccess.appId, appId), eq(appSourceAccess.userId, user.id)));
    return true;
  });
}

// ── Low-level: NOT session-checked. Only for the gateway, with an identity from `requireApp`. ──

/** What `appId` may do in `userId`'s vault for one operation, decided by the policy engine. */
export async function getAccessScope(
  userId: string,
  appId: string,
  operation: GrantOperation
): Promise<AccessScope> {
  const [grants, sources] = await Promise.all([
    db
      .select(grantColumns)
      .from(appGrants)
      .where(
        and(
          eq(appGrants.userId, userId),
          eq(appGrants.appId, appId),
          eq(appGrants.operation, operation)
        )
      ),
    // Sources only matter for reads.
    operation === "read"
      ? db
          .select({ sourceAppId: appSourceAccess.sourceAppId })
          .from(appSourceAccess)
          .where(and(eq(appSourceAccess.userId, userId), eq(appSourceAccess.appId, appId)))
      : [],
  ]);
  return evaluateAccess({
    grants,
    sources: sources.map(row => toSource(row.sourceAppId)),
    operation,
  });
}
