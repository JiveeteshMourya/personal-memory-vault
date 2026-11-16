// The fixed vocabularies of grants, the access log and consent requests (docs/classification-model.md).
// The tables in `src/server/models` enforce them with check constraints, so changing one needs a
// migration.

/** What a grant allows an app to do with one category. */
export const GRANT_OPERATIONS = ["read", "write"] as const;

export type GrantOperation = (typeof GRANT_OPERATIONS)[number];

export const ACCESS_ACTIONS = ["write", "retract", "context", "consent"] as const;
export const ACCESS_CHANNELS = ["api", "playground"] as const;
export const ACCESS_OUTCOMES = ["allowed", "partial", "denied"] as const;

export type AccessAction = (typeof ACCESS_ACTIONS)[number];
export type AccessChannel = (typeof ACCESS_CHANNELS)[number];
export type AccessOutcome = (typeof ACCESS_OUTCOMES)[number];

export const CONSENT_STATUSES = ["pending", "approved", "denied"] as const;

export type ConsentStatus = (typeof CONSENT_STATUSES)[number];
