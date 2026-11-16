import "server-only";
import { DrizzleQueryError } from "drizzle-orm";
import { generateApiKey, hashApiKey, isApiKeyFormat } from "@/server/lib/api-keys";
import { logger } from "@/server/lib/logger";
import * as appRepository from "@/server/repository/app.repository";
import type { AppIdentity } from "@/server/repository/app.repository";
import type { AppDTO, AppInput, CreateAppResult, IssuedApiKey } from "@/shared/types/app.types";

export type { AppIdentity };

// ── Owner-facing: pass the id of the owner from `requireUser`. Only the owner's apps are touched. ──

/** The owner's apps, by name, each with its active key if it has one. */
export function listApps(userId: string): Promise<AppDTO[]> {
  return appRepository.listApps(userId);
}

/** Registers an app, without a key. Names are unique per owner, ignoring case. */
export function createApp(userId: string, input: AppInput): Promise<CreateAppResult> {
  return appRepository.createApp(userId, input);
}

/**
 * Issues a new key for one of the owner's apps, revoking its current key. Returns the plaintext
 * once, or null if the app doesn't exist or isn't the owner's.
 */
export async function createApiKey(userId: string, appId: string): Promise<IssuedApiKey | null> {
  // Only the prefix and the hash ever reach the database.
  const { key, prefix, hash } = generateApiKey();
  const stored = await appRepository.replaceApiKey(userId, appId, { prefix, hash });
  return stored ? { key, prefix } : null;
}

/** Revokes an active key of one of the owner's apps. False if there's no such active key. */
export function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  return appRepository.revokeApiKey(userId, keyId);
}

/** Deletes one of the owner's apps and its keys. Memories it wrote stay, with no app attached. */
export function deleteApp(userId: string, id: string): Promise<boolean> {
  return appRepository.deleteApp(userId, id);
}

// ── App-facing: only for `requireApp`. ──

/** The app behind a plaintext API key, or null for a malformed, unknown or revoked key. */
export async function findAppByApiKey(key: string): Promise<AppIdentity | null> {
  if (!isApiKeyFormat(key)) return null;
  return appRepository.findAppIdentityByKeyHash(hashApiKey(key));
}

/** Records that a key was just used. Never throws: a failure is only logged. */
export async function recordApiKeyUse(keyId: string): Promise<void> {
  try {
    await appRepository.touchApiKey(keyId);
  } catch (error) {
    // The driver error, not Drizzle's wrapper (whose message carries the query and params).
    logger.warn("Couldn't record API key use", {
      keyId,
      error: error instanceof DrizzleQueryError ? error.cause : error,
    });
  }
}
