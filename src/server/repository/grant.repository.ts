import "server-only";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/lib/db";
import { appGrants, appSourceAccess, connectedApps } from "@/server/models";
import type { MemoryCategory } from "@/shared/constants/memory-taxonomy";
import type { GrantOperation } from "@/shared/constants/permissions";
import type { AccessSource, AppPermissions, Grant } from "@/shared/types/grant.types";

// Grants and source permissions. Not session-checked: every function takes the owner's id and only
// touches that owner's apps. Writes return true once the app is in the requested state, and false if
// it isn't the owner's. Call it from services, after authorization.

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
 * concurrent delete can't remove an app between this check and the write that references it. Take
 * this lock before locking any row that cascades from those apps: an app delete locks in that order.
 */
export async function lockOwnedApps(tx: Tx, userId: string, ids: string[]): Promise<boolean> {
  const distinct = [...new Set(ids)];
  const owned = await tx
    .select({ id: connectedApps.id })
    .from(connectedApps)
    .where(and(eq(connectedApps.userId, userId), inArray(connectedApps.id, distinct)))
    .for("key share");
  return owned.length === distinct.length;
}

/** One app's grants and source permissions. Someone else's app has none. */
export async function getAppPermissions(userId: string, appId: string): Promise<AppPermissions> {
  const [grants, sources] = await Promise.all([
    db
      .select(grantColumns)
      .from(appGrants)
      .where(and(eq(appGrants.appId, appId), eq(appGrants.userId, userId))),
    db
      .select({ sourceAppId: appSourceAccess.sourceAppId })
      .from(appSourceAccess)
      .where(and(eq(appSourceAccess.appId, appId), eq(appSourceAccess.userId, userId))),
  ]);
  return { grants, sources: sources.map(row => toSource(row.sourceAppId)) };
}

/**
 * One app's grants for one operation and, for reads, its source permissions: what the policy
 * engine decides from. Sources only matter for reads, so a write gets none.
 */
export async function getAccessRules(
  userId: string,
  appId: string,
  operation: GrantOperation
): Promise<AppPermissions> {
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
    operation === "read"
      ? db
          .select({ sourceAppId: appSourceAccess.sourceAppId })
          .from(appSourceAccess)
          .where(and(eq(appSourceAccess.userId, userId), eq(appSourceAccess.appId, appId)))
      : [],
  ]);
  return { grants, sources: sources.map(row => toSource(row.sourceAppId)) };
}

/** How many topics each of the owner's apps may read and save, keyed by app id. */
export async function getGrantCounts(
  userId: string
): Promise<Map<string, Record<GrantOperation, number>>> {
  const rows = await db
    .select({ appId: appGrants.appId, operation: appGrants.operation, total: count() })
    .from(appGrants)
    .where(eq(appGrants.userId, userId))
    .groupBy(appGrants.appId, appGrants.operation);
  const counts = new Map<string, Record<GrantOperation, number>>();
  for (const { appId, operation, total } of rows) {
    const app = counts.get(appId) ?? { read: 0, write: 0 };
    app[operation] = total;
    counts.set(appId, app);
  }
  return counts;
}

/** Grants an app one operation on one category, or changes the tier cap of that grant. */
export async function setGrant(userId: string, appId: string, grant: Grant): Promise<boolean> {
  return db.transaction(async tx => {
    if (!(await lockOwnedApps(tx, userId, [appId]))) return false;
    await tx
      .insert(appGrants)
      .values({
        userId,
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
  userId: string,
  appId: string,
  operation: GrantOperation,
  category: MemoryCategory
): Promise<boolean> {
  return db.transaction(async tx => {
    if (!(await lockOwnedApps(tx, userId, [appId]))) return false;
    await tx
      .delete(appGrants)
      .where(
        and(
          eq(appGrants.appId, appId),
          eq(appGrants.userId, userId),
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
  userId: string,
  appId: string,
  source: AccessSource,
  allowed: boolean
): Promise<boolean> {
  const sourceAppId = source.type === "app" ? source.appId : null;
  return db.transaction(async tx => {
    const apps = sourceAppId ? [appId, sourceAppId] : [appId];
    if (!(await lockOwnedApps(tx, userId, apps))) return false;
    if (allowed) {
      await tx.insert(appSourceAccess).values({ userId, appId, sourceAppId }).onConflictDoNothing();
    } else {
      await tx
        .delete(appSourceAccess)
        .where(
          and(
            eq(appSourceAccess.appId, appId),
            eq(appSourceAccess.userId, userId),
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
export async function revokeAllForApp(userId: string, appId: string): Promise<boolean> {
  return db.transaction(async tx => {
    if (!(await lockOwnedApps(tx, userId, [appId]))) return false;
    await tx.delete(appGrants).where(and(eq(appGrants.appId, appId), eq(appGrants.userId, userId)));
    await tx
      .delete(appSourceAccess)
      .where(and(eq(appSourceAccess.appId, appId), eq(appSourceAccess.userId, userId)));
    return true;
  });
}
