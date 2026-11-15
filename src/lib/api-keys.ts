import "server-only";
import { createHash, randomBytes } from "node:crypto";

// App API keys: "pmv_" + 32 random bytes in base64url. The vault stores only a SHA-256 of each key.
// A key carries 256 bits of randomness, so a fast hash is enough (slow hashes are for passwords),
// and the hash itself is the lookup index.

const KEY_TAG = "pmv_";
const KEY_PATTERN = /^pmv_[A-Za-z0-9_-]{43}$/;
/** Shown to the owner to tell keys apart: the tag plus 8 characters. */
const DISPLAY_PREFIX_LENGTH = KEY_TAG.length + 8;

export type GeneratedApiKey = { key: string; prefix: string; hash: string };

/** A new random key, its display prefix and its hash. Hand the key to the owner once, then drop it. */
export function generateApiKey(): GeneratedApiKey {
  const key = KEY_TAG + randomBytes(32).toString("base64url");
  return { key, prefix: key.slice(0, DISPLAY_PREFIX_LENGTH), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Whether a value is shaped like a vault key, so anything else is turned away without a lookup. */
export function isApiKeyFormat(value: string): boolean {
  return KEY_PATTERN.test(value);
}
