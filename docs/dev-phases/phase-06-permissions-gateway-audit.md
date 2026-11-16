# Phase 06 — Taxonomy, Permissions, Gateway & Audit

> **Status:** ✅ Done · **Depends on:** 04 (memories), 05 (apps, `authenticateApp`) · **Unlocks:** 07, 08, 09

## Goal

The owner controls exactly what each connected app may write and read: by **category**, capped by **sensitivity tier**, and by **source** (which writer's data it may see). A pure, default-deny policy engine makes every decision. Apps get one consistent gateway (auth, validation, errors), and every app access lands in an audit table.

**Sprint mode:** libraries are already decided (nothing new). Unit tests cover the policy engine only.

## In scope

- **Classification** ([classification-model.md](../classification-model.md)), in `src/shared/constants/memory-taxonomy.ts`:
  - a one-line description for each of the 16 categories and the 4 tiers `shareable < personal < private < protected`, shown wherever the owner picks one
  - `MEMORY_VISIBILITIES` (`shared`, `app_private`) for the policy engine and the `memories.visibility` column
- **Permission vocabularies** (`src/shared/constants/permissions.ts`): `GRANT_OPERATIONS`, `ACCESS_ACTIONS`, `ACCESS_CHANNELS`, `ACCESS_OUTCOMES`.
- **Grants schema** (`src/server/models/grant.model.ts`):
  - `app_grants`:
    - columns: `user_id`, `app_id` → `connected_apps` (cascade), `operation` (`read`\|`write`), `category`, `max_sensitivity`, `created_at`
    - unique on `(app_id, operation, category)`
    - revoking deletes the row (no expiry, no history)
  - `app_source_access`:
    - columns: `user_id`, `app_id` (the reader, cascade), `source`: "Your entries" or a source app id (cascade)
    - a row means "allowed", and no row means denied
- **Policy engine** (`src/server/services/access-policy.service.ts`, pure, no I/O):
  - `evaluateAccess({ grants, sources, operation })` returns `AccessScope`: allowed categories with their caps, plus allowed sources.
  - `canWrite(scope, category, sensitivity)`
  - `canRead(scope, memory, readerAppId)`: category cap, allowed source, visibility (`shared` or own), not expired. A memory from a deleted app (source app null) is never readable.
  - **Unit tests:** default deny, read/write independence, the tier cap, source deny/allow, own writes, `app_private`, expiry, orphaned memories.
- **Grants** (`src/server/repository/grant.repository.ts`, `src/server/services/grant.service.ts`):
  - owner-facing: `getAppPermissions`, `getGrantCounts`, `setGrant`, `removeGrant`, `setSourceAccess`, `revokeAllForApp`, each taking the owner's `userId` first
  - app-facing: `getAccessScope(userId, appId, operation)`, which feeds the stored rules to the policy engine
- **`/dashboard/permissions`** (`src/client/features/permissions/`):
  - pick an app
  - a matrix of categories × {read, write}, each with a tier-cap select that shows the tier descriptions
  - **"Reads data from"** switches: Your entries, every connected app, and this app itself
  - **Revoke all**
- **Gateway** (`src/server/middlewares/`):
  - `requireApp(request)` (`require-app.middleware.ts`) throws `ApiError(401, "unauthorized")` when `authenticateApp` finds no app.
  - `validateBody(request, schema)` (`validate-body.middleware.ts`) reads the JSON body against a strict zod schema.
  - Controllers are wrapped in `withErrorHandler` (Phase 00).
- **Audit** (`src/server/models/access-event.model.ts`, `src/server/repository/access-event.repository.ts`, `src/server/services/access-event.service.ts`):
  - `access_events` columns:
    - app: `user_id`, `app_id` (`on delete set null`), `app_name` (a snapshot, so the log outlives the app)
    - request: `action` (`write`\|`retract`\|`context`\|`consent`), `channel` (`api`\|`playground`), `outcome` (`allowed`\|`partial`\|`denied`)
    - content: `purpose_encrypted`, `query_encrypted` (via `encryptField`)
    - results: `categories` text[], `memory_ids` uuid[], `withheld_count`, `session_id`, `created_at`
  - `recordAccess(event)` for the gateway; owner-facing `listAccessEvents(userId, page)`.
- **`GET /api/v1/permissions`** (`permission.controller.ts`), per [public-api.md](../public-api.md). Its `sources` summary never names other apps.
- Keep `docs/public-api.md` in sync if anything here changes.

## Contract provided

- **Taxonomy** (`@/shared/constants/memory-taxonomy`, no imports), on top of Phase 04's lists:
  - `CATEGORY_DESCRIPTIONS` and `SENSITIVITY_DESCRIPTIONS`
  - `MEMORY_VISIBILITIES` (`shared`, `app_private`) and `Visibility`
- **Vocabularies** (`@/shared/constants/permissions`): `GRANT_OPERATIONS` / `GrantOperation`, and `ACCESS_ACTIONS` / `ACCESS_CHANNELS` / `ACCESS_OUTCOMES` with their types.
- **Types** (`@/shared/types/grant.types`): `CategoryCap`, `Grant`, `AccessSource`, `AppPermissions`, and `AccessScope = { operation, categories: CategoryCap[], sources: { ownEntries, appIds } }`.
- **Policy** (`@/server/services/access-policy.service`, pure):
  - `evaluateAccess({ grants, sources, operation })` returns an `AccessScope`. Categories come in taxonomy order; a write scope's sources are always empty.
  - `canWrite(scope, category, sensitivity)`
  - `canRead(scope, memory: ReadableMemory, readerAppId, now?)`. `ReadableMemory` **requires** `visibility` and `expiresAt`, which `MemoryDTO` carries.
  - Decisions apply **before** retrieval.
- **Schema** (`@/server/models`): `appGrants`, `appSourceAccess`, `accessEvents`.
- **Services:**
  - `@/server/services/grant.service`, owner-facing: `getAppPermissions(userId, appId)`, `getGrantCounts(userId)`, `setGrant(userId, appId, grant)`, `removeGrant(userId, appId, operation, category)`, `setSourceAccess(userId, appId, source, allowed)`, `revokeAllForApp(userId, appId)`. The writes return `false` when the app isn't the owner's.
  - `@/server/services/grant.service`, app-facing: `getAccessScope(userId, appId, operation)`.
  - `@/server/services/access-event.service`: `recordAccess({ app, action, channel, outcome, purpose?, query?, categories?, memoryIds?, withheldCount?, sessionId? })` returns the event id. The owner-facing `listAccessEvents(userId, page)` returns 20 per page, decrypted (`AccessEventPage` in `@/shared/types/access-event.types`).
- **Gateway:**
  - `requireApp(request): Promise<AppIdentity>` (`@/server/middlewares/require-app.middleware`) throws a 401 `unauthorized`.
  - `validateBody(request, schema)` (`@/server/middlewares/validate-body.middleware`): pass a `z.strictObject`, so an unknown field is a 400.
  - Errors go through `withErrorHandler`, with `validation_error` details from `z.treeifyError`.

## Acceptance

- [x] The policy engine's unit tests pass (`bun run test`).
- [x] Memories show the 16 categories and the four tiers everywhere: badges, filters and the form.
- [x] Permission toggles and source switches persist. "Revoke all" clears both.
- [x] `GET /api/v1/permissions` returns 200 with a valid key and 401 with none (curl).
- [x] Lint, typecheck, format and build pass. The next-devtools compile check is clean.

## Outcome & handoff notes

Done 2026-11-15.

- **Built as planned, with no new npm packages.** One shadcn primitive: `switch` (Base UI). 18 policy tests (122 local tests in all).
- **Sources:** `app_source_access.source_app_id` null means "Your entries". It's `UNIQUE NULLS NOT DISTINCT`, so `onConflictDoNothing` makes ticking idempotent. Deleting a source app cascades its rows away.
- **Grant writes:** each runs in a transaction that first locks the owner's app rows `FOR KEY SHARE` (`lockOwnedApps` in the grant repository), so an app deleted at the same moment can't break the insert.
- **Permissions UI:** one select per cell ("No access" or a tier cap, each item described), saved on change with `useOptimistic`. The app is picked with `?app=` (unknown ids fall back to the first app). "Revoke all" clears only the app's own grants and sources, not other apps' permission to read its data.
- **`GET /api/v1/permissions`** matches `public-api.md`. `sources` reports `ownEntries`, `thisApp` and `otherAppsCount`, never ids or names. `scripts/smoke-api.sh` (`VAULT_API_KEY=… bash scripts/smoke-api.sh`) covers health and permissions; Phases 07–09 add their endpoints to it.
- **Verified** against `next start -p 3005`:
  - real Server Action POSTs: grants upsert and remove; sources are idempotent; invalid or extra fields → `ok:false`
  - a second account gets `ok:false` on Jane's app ids
  - the audit round trip through a throwaway route: `v1:` ciphertext for purpose and query, decrypted for the owner, and `app_id` set to null with `app_name` kept after the app is deleted
  - logs hold no keys and no memory content
  - all probe data was deleted
- **Gotcha: a long-running `bun dev` can keep stale server modules.** It can answer with errors like "requireApp is not a function" although the compiled chunk is correct. Restart `bun dev` after pulling large changes.
- **Gotcha: React 19.3 decodes action multipart bodies as a stream.** When testing a `(state, formData)` action by hand, send the `_1_<field>` parts **before** `0=["$undefined","$K1"]`, or the fields arrive empty. Plain-args actions take `text/plain` `[{…}]`.
