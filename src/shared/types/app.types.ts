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
