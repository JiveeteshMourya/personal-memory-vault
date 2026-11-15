import "server-only";
import { DrizzleQueryError } from "drizzle-orm";
import { after } from "next/server";
import { findAppIdentityByKeyHash, touchApiKey, type AppIdentity } from "@/data/apps";
import { hashApiKey, isApiKeyFormat } from "@/lib/api-keys";
import { logger } from "@/lib/logger";

export type { AppIdentity };

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * The connected app behind a request's `Authorization: Bearer <key>` header, or null for a missing,
 * malformed, unknown or revoked key. Proves identity only: what the app may do is up to its grants.
 * Call it from Route Handlers; it records the key's use after the response.
 */
export async function authenticateApp(request: Request): Promise<AppIdentity | null> {
  const key = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!key || !isApiKeyFormat(key)) return null;

  const identity = await findAppIdentityByKeyHash(hashApiKey(key));
  if (!identity) return null;

  after(async () => {
    try {
      await touchApiKey(identity.keyId);
    } catch (error) {
      // The driver error, not Drizzle's wrapper (whose message carries the query and params).
      logger.warn("Couldn't record API key use", {
        keyId: identity.keyId,
        error: error instanceof DrizzleQueryError ? error.cause : error,
      });
    }
  });
  return identity;
}
