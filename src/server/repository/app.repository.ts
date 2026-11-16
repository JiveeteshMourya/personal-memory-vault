import "server-only";
import { and, DrizzleQueryError, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/lib/db";
import { appApiKeys, connectedApps } from "@/server/models";
import type { AppDTO, AppInput, CreateAppResult } from "@/shared/types/app.types";

// Connected apps and their API keys. Not session-checked: every function takes the owner's id, and
// only touches that owner's apps. Call it from services, after authorization.

/** Who is calling, proven by an API key. `userId` is the app's owner: the vault it may talk to. */
export type AppIdentity = { appId: string; appName: string; userId: string; keyId: string };

const appColumns = {
  id: connectedApps.id,
  name: connectedApps.name,
  description: connectedApps.description,
  createdAt: connectedApps.createdAt,
};

// Postgres's unique_violation, which Drizzle wraps in a DrizzleQueryError.
function isUniqueViolation(error: unknown) {
  return (
    error instanceof DrizzleQueryError &&
    (error.cause as { code?: unknown } | undefined)?.code === "23505"
  );
}

/** The owner's apps, by name, each with its active key if it has one. */
export async function listApps(userId: string): Promise<AppDTO[]> {
  const rows = await db
    .select({
      ...appColumns,
      keyId: appApiKeys.id,
      keyPrefix: appApiKeys.keyPrefix,
      keyCreatedAt: appApiKeys.createdAt,
      keyLastUsedAt: appApiKeys.lastUsedAt,
    })
    .from(connectedApps)
    .leftJoin(appApiKeys, and(eq(appApiKeys.appId, connectedApps.id), isNull(appApiKeys.revokedAt)))
    .where(eq(connectedApps.userId, userId))
    .orderBy(sql`lower(${connectedApps.name})`);

  return rows.map(({ keyId, keyPrefix, keyCreatedAt, keyLastUsedAt, ...app }) => ({
    ...app,
    activeKey: keyId
      ? { id: keyId, prefix: keyPrefix!, createdAt: keyCreatedAt!, lastUsedAt: keyLastUsedAt }
      : null,
  }));
}

/** Registers an app, without a key. Names are unique per owner, ignoring case. */
export async function createApp(userId: string, input: AppInput): Promise<CreateAppResult> {
  try {
    const [row] = await db
      .insert(connectedApps)
      .values({ userId, name: input.name, description: input.description ?? null })
      .returning(appColumns);
    return { ok: true, app: { ...row!, activeKey: null } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "name_taken" };
    throw error;
  }
}

/**
 * Stores a new key (its prefix and hash only) for one of the owner's apps, revoking its current
 * key: an app has one active key at a time. False if the app doesn't exist or isn't the owner's.
 */
export async function replaceApiKey(
  userId: string,
  appId: string,
  key: { prefix: string; hash: string }
): Promise<boolean> {
  return db.transaction(async tx => {
    // Locks the app's row, so two rotations at once run one after the other.
    const [app] = await tx
      .select({ id: connectedApps.id })
      .from(connectedApps)
      .where(and(eq(connectedApps.id, appId), eq(connectedApps.userId, userId)))
      .for("update");
    if (!app) return false;

    await tx
      .update(appApiKeys)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(appApiKeys.appId, app.id), isNull(appApiKeys.revokedAt)));
    await tx.insert(appApiKeys).values({ appId: app.id, keyPrefix: key.prefix, keyHash: key.hash });
    return true;
  });
}

/** Revokes an active key of one of the owner's apps. False if there's no such active key. */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const revoked = await db
    .update(appApiKeys)
    .set({ revokedAt: sql`now()` })
    .from(connectedApps)
    .where(
      and(
        eq(appApiKeys.id, keyId),
        isNull(appApiKeys.revokedAt),
        eq(connectedApps.id, appApiKeys.appId),
        eq(connectedApps.userId, userId)
      )
    )
    .returning({ id: appApiKeys.id });
  return revoked.length > 0;
}

/**
 * Deletes one of the owner's apps and its keys. Memories it wrote stay, with no app attached.
 * False if it doesn't exist or isn't the owner's.
 */
export async function deleteApp(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(connectedApps)
    .where(and(eq(connectedApps.id, id), eq(connectedApps.userId, userId)))
    .returning({ id: connectedApps.id });
  return deleted.length > 0;
}

/** The app behind an active key's hash, or null for an unknown or revoked key. */
export async function findAppIdentityByKeyHash(keyHash: string): Promise<AppIdentity | null> {
  const [row] = await db
    .select({
      appId: connectedApps.id,
      appName: connectedApps.name,
      userId: connectedApps.userId,
      keyId: appApiKeys.id,
    })
    .from(appApiKeys)
    .innerJoin(connectedApps, eq(connectedApps.id, appApiKeys.appId))
    .where(and(eq(appApiKeys.keyHash, keyHash), isNull(appApiKeys.revokedAt)));
  return row ?? null;
}

/** Records that a key was just used. */
export async function touchApiKey(keyId: string): Promise<void> {
  await db
    .update(appApiKeys)
    .set({ lastUsedAt: sql`now()` })
    .where(eq(appApiKeys.id, keyId));
}
