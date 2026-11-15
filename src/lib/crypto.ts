import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

// Application-level encryption for memory content. AES-256-GCM authenticates as well as encrypts,
// so a tampered value or the wrong key fails loudly instead of decrypting to garbage.
// Stored format: "v1:<iv>:<tag>:<ciphertext>", each part base64. The version names the key, so a
// future rotation can tell old values from new ones.

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12; // GCM's standard nonce size
const key = Buffer.from(env.MEMORY_ENCRYPTION_KEY, "base64");

/** Encrypts a field for storage. Every call uses a fresh IV, so equal inputs never match. */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext].map(part => part.toString("base64")).join(":");
}

/**
 * Reverses `encryptField`. Throws on a malformed value, an unknown key version, a tampered value
 * or the wrong key. The error never includes the value.
 */
export function decryptField(value: string): string {
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unrecognized encrypted field format");
  }
  const [iv, tag, ciphertext] = parts.slice(1).map(part => Buffer.from(part, "base64"));
  const decipher = createDecipheriv(ALGORITHM, key, iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(ciphertext!), decipher.final()]).toString("utf8");
}
