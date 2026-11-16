import "server-only";
import { after } from "next/server";
import { ApiError } from "@/server/lib/api-error";
import { findAppByApiKey, recordApiKeyUse, type AppIdentity } from "@/server/services/app.service";

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * The connected app behind a request's `Authorization: Bearer <key>` header, or null for a missing,
 * malformed, unknown or revoked key. Proves identity only: what the app may do is up to its grants.
 * Call it from controllers; it records the key's use after the response.
 */
export async function authenticateApp(request: Request): Promise<AppIdentity | null> {
  const key = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!key) return null;

  const identity = await findAppByApiKey(key);
  if (!identity) return null;

  after(() => recordApiKeyUse(identity.keyId));
  return identity;
}

/**
 * The calling app, or a 401 `unauthorized` ApiError for `errorResponse` to answer with. Every
 * authenticated `/api/v1` controller starts with it.
 */
export async function requireApp(request: Request): Promise<AppIdentity> {
  const identity = await authenticateApp(request);
  if (!identity) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
  return identity;
}
