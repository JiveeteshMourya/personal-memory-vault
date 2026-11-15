import "server-only";
import { and, DrizzleQueryError, eq, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/data/auth";
import { appApiKeys, connectedApps } from "@/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";

/** The active key of an app, without anything secret: only its display prefix. */
export type ApiKeySummary = {
  id: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

/** A connected app as the owner sees it. Connecting grants no access; grants live elsewhere. */
export type AppDTO = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  /** Null when the app has no usable key (never issued, or revoked). */
  activeKey: ApiKeySummary | null;
};

export type AppInput = { name: string; description?: string };

export type CreateAppResult = { ok: true; app: AppDTO } | { ok: false; error: "name_taken" };

/** A newly issued key. `key` is the only copy of the plaintext: show it once, never store it. */
export type IssuedApiKey = { key: string; prefix: string };

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

// ── Owner-scoped: each function checks the session and only touches the owner's apps. ──

/** The owner's apps, by name, each with its active key if it has one. */
export async function listApps(): Promise<AppDTO[]> {
  const user = await requireUser();
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
    .where(eq(connectedApps.userId, user.id))
    .orderBy(sql`lower(${connectedApps.name})`);

  return rows.map(({ keyId, keyPrefix, keyCreatedAt, keyLastUsedAt, ...app }) => ({
    ...app,
    activeKey: keyId
      ? { id: keyId, prefix: keyPrefix!, createdAt: keyCreatedAt!, lastUsedAt: keyLastUsedAt }
      : null,
  }));
}

/** Registers an app, without a key. Names are unique per owner, ignoring case. */
export async function createApp(input: AppInput): Promise<CreateAppResult> {
  const user = await requireUser();
  try {
    const [row] = await db
      .insert(connectedApps)
      .values({ userId: user.id, name: input.name, description: input.description ?? null })
      .returning(appColumns);
    return { ok: true, app: { ...row!, activeKey: null } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "name_taken" };
    throw error;
  }
}

/**
 * Issues a new key for one of the owner's apps, revoking its current key: an app has one active key
 * at a time. Returns the plaintext once, or null if the app doesn't exist or isn't the owner's.
 */
export async function createApiKey(appId: string): Promise<IssuedApiKey | null> {
  const user = await requireUser();
  // Only the prefix and the hash ever reach the database.
  const { key, prefix, hash } = generateApiKey();
  return db.transaction(async tx => {
    // Locks the app's row, so two rotations at once run one after the other.
    const [app] = await tx
      .select({ id: connectedApps.id })
      .from(connectedApps)
      .where(and(eq(connectedApps.id, appId), eq(connectedApps.userId, user.id)))
      .for("update");
    if (!app) return null;

    await tx
      .update(appApiKeys)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(appApiKeys.appId, app.id), isNull(appApiKeys.revokedAt)));
    await tx.insert(appApiKeys).values({ appId: app.id, keyPrefix: prefix, keyHash: hash });
    return { key, prefix };
  });
}

/** Revokes an active key of one of the owner's apps. False if there's no such active key. */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  const user = await requireUser();
  const revoked = await db
    .update(appApiKeys)
    .set({ revokedAt: sql`now()` })
    .from(connectedApps)
    .where(
      and(
        eq(appApiKeys.id, keyId),
        isNull(appApiKeys.revokedAt),
        eq(connectedApps.id, appApiKeys.appId),
        eq(connectedApps.userId, user.id)
      )
    )
    .returning({ id: appApiKeys.id });
  return revoked.length > 0;
}

/**
 * Deletes one of the owner's apps and its keys. Memories it wrote stay, with no app attached.
 * False if it doesn't exist or isn't the owner's.
 */
export async function deleteApp(id: string): Promise<boolean> {
  const user = await requireUser();
  const deleted = await db
    .delete(connectedApps)
    .where(and(eq(connectedApps.id, id), eq(connectedApps.userId, user.id)))
    .returning({ id: connectedApps.id });
  return deleted.length > 0;
}

// ── Low-level: NOT session-checked. Only for authenticating app requests (`@/lib/app-auth`). ──

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
