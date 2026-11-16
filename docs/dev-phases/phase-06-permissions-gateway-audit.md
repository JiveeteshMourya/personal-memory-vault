# Phase 06 — Taxonomy, Permissions, Gateway & Audit

> **Status:** ✅ Done · **Depends on:** 04 (memories), 05 (apps, `authenticateApp`) · **Unlocks:** 07, 08, 09

## Goal

The owner controls exactly what each connected app may write and read: by **category**, capped by **sensitivity tier**, and by **source** (which writer's data it may see). A pure, default-deny policy engine makes every decision. Apps get one consistent gateway (auth, validation, errors), and every app access lands in an audit table.

**Sprint mode:** libraries are already decided (nothing new). Unit tests cover the policy engine only.

## In scope

- **Taxonomy pivot** ([classification-model.md](../classification-model.md)):
  - `src/shared/constants/memory-taxonomy.ts` gets **16 categories** and the **4 tiers** `shareable < personal < private < protected`, each with a label and a one-line description.
  - The migration maps existing rows: category `personal → identity`; `low → shareable`, `moderate → personal`, `high → private`, `restricted → protected`. It also regenerates both check constraints.
  - Update the memory badges, filters and form (they read the taxonomy module) and `scripts/seed-jane.ts`, so nothing references the old values.
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
- **Grants DAL** (`src/server/services/grant.service.ts`):
  - owner-scoped: `getAppPermissions(appId)`, `setGrant`, `removeGrant`, `setSourceAccess`, `revokeAllForApp`
  - low-level: `getAccessScope(userId, appId, operation)` for the gateway
- **`/dashboard/permissions`** (replaces the placeholder):
  - pick an app
  - a matrix of categories × {read, write}, each with a tier-cap select that shows the tier descriptions
  - **"Reads data from"** switches: Your entries, every connected app, and this app itself
  - **Revoke all**
- **Gateway:**
  - `requireApp(request)` in `src/server/middlewares/require-app.middleware.ts` throws `ApiError(401, "unauthorized")`.
  - A small `parseBody(request, schema)` helper uses strict zod.
  - `errorResponse` switches `validation_error` details to `z.treeifyError`, since the bodies are nested (closes the P00 backlog item).
- **Audit** (`src/server/models/access-event.model.ts`, `src/server/services/access-event.service.ts`):
  - `access_events` columns:
    - app: `user_id`, `app_id` (`on delete set null`), `app_name` (a snapshot, so the log outlives the app)
    - request: `action` (`write`\|`retract`\|`context`\|`consent`), `channel` (`api`\|`playground`), `outcome` (`allowed`\|`partial`\|`denied`)
    - content: `purpose_encrypted`, `query_encrypted` (via `encryptField`)
    - results: `categories` text[], `memory_ids` uuid[], `withheld_count`, `session_id`, `created_at`
  - Low-level `recordAccess(event)`; owner-scoped `listAccessEvents(page)`.
- **`GET /api/v1/permissions`**, per [public-api.md](../public-api.md). Its `sources` summary never names other apps.
- Keep `docs/public-api.md` in sync if anything here changes.

## Contract provided

- **Taxonomy** (`@/shared/constants/memory-taxonomy`, no imports):
  - `MEMORY_CATEGORIES` (16) and `SENSITIVITY_TIERS` (ordered `shareable` → `protected`), with `sensitivityRank(tier)` (0–3)
  - `CATEGORY_LABELS` / `CATEGORY_DESCRIPTIONS` and `SENSITIVITY_LABELS` / `SENSITIVITY_DESCRIPTIONS`
  - `MEMORY_VISIBILITIES` (`shared`, `app_private`) and `Visibility`: Phase 07 adds the column from this list
- **Policy** (`@/server/services/access-policy.service`, pure):
  - `evaluateAccess({ grants, sources, operation })` returns `AccessScope = { operation, categories: CategoryCap[], sources: { ownEntries, appIds } }`. Categories come in taxonomy order; a write scope's sources are always empty.
  - `canWrite(scope, category, sensitivity)`
  - `canRead(scope, memory: ReadableMemory, readerAppId, now?)`. `ReadableMemory` **requires** `visibility` and `expiresAt`, so Phase 07's `MemoryDTO` must carry both before Phase 08 can pass it.
  - Types: `CategoryCap`, `Grant`, `AccessSource`. Decisions apply **before** retrieval.
- **Schema** (`@/server/models`): `appGrants`, `appSourceAccess`, `accessEvents`, `GRANT_OPERATIONS`, `ACCESS_ACTIONS` / `ACCESS_CHANNELS` / `ACCESS_OUTCOMES`.
- **DAL:**
  - `@/server/services/grant.service`, owner-scoped: `getAppPermissions`, `setGrant`, `removeGrant`, `setSourceAccess`, `revokeAllForApp`. The writes return `false` when the app isn't the owner's.
  - `@/server/services/grant.service`, low-level: `getAccessScope(userId, appId, operation)`.
  - `@/server/services/access-event.service`: `recordAccess({ app, action, channel, outcome, purpose?, query?, categories?, memoryIds?, withheldCount?, sessionId? })` and the owner-scoped `listAccessEvents(page)` (20 per page, decrypted).
- **Gateway:**
  - `requireApp(request): Promise<AppIdentity>` (`@/server/middlewares/require-app.middleware`) throws a 401 `unauthorized`.
  - `parseBody(request, schema)` (`@/server/middlewares/validate-body.middleware`): pass a `z.strictObject`.
  - Errors go through `errorResponse`, with `validation_error` details from `z.treeifyError`.

## Acceptance

- [x] The policy engine's unit tests pass (`bun run test`).
- [x] The migration maps the existing Jane memories, and `/dashboard/memories` shows the new labels.
- [x] Permission toggles and source switches persist. "Revoke all" clears both.
- [x] `GET /api/v1/permissions` returns 200 with a valid key and 401 with none (curl).
- [x] Lint, typecheck, format and build pass. The next-devtools compile check is clean.

## Outcome & handoff notes

Done 2026-11-15.

- **Built as planned, with no new npm packages.** One shadcn primitive was added: `switch` (Base UI). The local tests (git-ignored) now number 122: the 18 policy tests are new, and the old taxonomy values were renamed in the existing suites.
- **Migration `0004_taxonomy_permissions_audit`:** drizzle-kit generated it. A hand-written `UPDATE` sits between the dropped and re-added `memories` checks. Jane's 32 rows were mapped mechanically. The seed script is instead re-tiered by the model: activity, sleep and diet are `personal`, mood and relationships are `private`, health and finance are `protected`.
- **Sources:** `app_source_access.source_app_id` null means "Your entries". It's `UNIQUE NULLS NOT DISTINCT`, so `onConflictDoNothing` makes ticking idempotent. Deleting a source app cascades its rows away.
- **Grant writes:** each runs in a transaction that first locks the owner's app rows `FOR KEY SHARE`, so an app deleted at the same moment can't break the insert.
- **Permissions UI:** one select per cell ("No access" or a tier cap, each item described), saved on change with `useOptimistic`. The app is picked with `?app=` (unknown ids fall back to the first app). "Revoke all" clears only the app's own grants and sources, not other apps' permission to read its data.
- **`GET /api/v1/permissions`** matches `public-api.md`. `sources` reports `ownEntries`, `thisApp` and `otherAppsCount`, never ids or names. `scripts/smoke-api.sh` (`VAULT_API_KEY=… bash scripts/smoke-api.sh`) covers health and permissions. Phases 07 and 08 extend it.
- **Verified** against `next start -p 3005`:
  - real Server Action POSTs: grants upsert and remove; sources are idempotent; invalid or extra fields → `ok:false`
  - a second account gets `ok:false` on Jane's app ids
  - the audit round trip through a throwaway route: `v1:` ciphertext for purpose and query, decrypted for the owner, and `app_id` set to null with `app_name` kept after the app is deleted
  - logs hold no keys and no memory content
  - all probe data was deleted
- **Gotcha: a long-running `bun dev` can keep stale server modules.** The dev server started before this phase answered `/api/v1/permissions` with 500 "requireApp is not a function", although the compiled chunk was correct. Restart `bun dev` after pulling this phase.
- **Gotcha: React 19.3 decodes action multipart bodies as a stream.** When testing a `(state, formData)` action by hand, send the `_1_<field>` parts **before** `0=["$undefined","$K1"]`, or the fields arrive empty. Plain-args actions take `text/plain` `[{…}]`.
- **Phase 07 hook points:**
  - `canWrite(await getAccessScope(…, "write"), …)` for each extracted memory
  - `recordAccess` with `outcome` `partial` when anything is withheld
  - the memories `visibility` check should use `MEMORY_VISIBILITIES`
