# Phase 06 — Taxonomy, Permissions, Gateway & Audit

> **Status:** ⬜ Not started · **Depends on:** 04 (memories), 05 (apps, `authenticateApp`) · **Unlocks:** 07, 08, 09

## Goal

The owner controls exactly what each connected app may write and read: by **category**, capped by **sensitivity tier**, and by **source** (which writer's data it may see). A pure, default-deny policy engine makes every decision. Apps get one consistent gateway (auth, validation, errors), and every app access lands in an audit table.

**Sprint mode:** libraries are already decided (nothing new). Unit tests cover the policy engine only.

## In scope

- **Taxonomy pivot** ([classification-model.md](../classification-model.md)):
  - `src/lib/memory-taxonomy.ts` gets **16 categories** and the **4 tiers** `shareable < personal < private < protected`, each with a label and a one-line description.
  - The migration maps existing rows: category `personal → identity`; `low → shareable`, `moderate → personal`, `high → private`, `restricted → protected`. It also regenerates both check constraints.
  - Update the memory badges, filters and form (they read the taxonomy module) and `scripts/seed-jane.ts`, so nothing references the old values.
- **Grants schema** (`src/db/schema/grants.ts`):
  - `app_grants`:
    - columns: `user_id`, `app_id` → `connected_apps` (cascade), `operation` (`read`\|`write`), `category`, `max_sensitivity`, `created_at`
    - unique on `(app_id, operation, category)`
    - revoking deletes the row (no expiry, no history)
  - `app_source_access`:
    - columns: `user_id`, `app_id` (the reader, cascade), `source`: "Your entries" or a source app id (cascade)
    - a row means "allowed", and no row means denied
- **Policy engine** (`src/lib/policy/evaluate-access.ts`, pure, no I/O):
  - `evaluateAccess({ grants, sources, operation })` returns `AccessScope`: allowed categories with their caps, plus allowed sources.
  - `canWrite(scope, category, sensitivity)`
  - `canRead(scope, memory, readerAppId)`: category cap, allowed source, visibility (`shared` or own), not expired. A memory from a deleted app (source app null) is never readable.
  - **Unit tests:** default deny, read/write independence, the tier cap, source deny/allow, own writes, `app_private`, expiry, orphaned memories.
- **Grants DAL** (`src/data/grants.ts`):
  - owner-scoped: `getAppPermissions(appId)`, `setGrant`, `removeGrant`, `setSourceAccess`, `revokeAllForApp`
  - low-level: `getAccessScope(userId, appId, operation)` for the gateway
- **`/dashboard/permissions`** (replaces the placeholder):
  - pick an app
  - a matrix of categories × {read, write}, each with a tier-cap select that shows the tier descriptions
  - **"Reads data from"** switches: Your entries, every connected app, and this app itself
  - **Revoke all**
- **Gateway:**
  - `requireApp(request)` in `src/lib/app-auth.ts` throws `ApiError(401, "unauthorized")`.
  - A small `parseBody(request, schema)` helper uses strict zod.
  - `errorResponse` switches `validation_error` details to `z.treeifyError`, since the bodies are nested (closes the P00 backlog item).
- **Audit** (`src/db/schema/access-events.ts`, `src/data/access-events.ts`):
  - `access_events` columns:
    - app: `user_id`, `app_id` (`on delete set null`), `app_name` (a snapshot, so the log outlives the app)
    - request: `action` (`write`\|`retract`\|`context`\|`consent`), `channel` (`api`\|`playground`), `outcome` (`allowed`\|`partial`\|`denied`)
    - content: `purpose_encrypted`, `query_encrypted` (via `encryptField`)
    - results: `categories` text[], `memory_ids` uuid[], `withheld_count`, `session_id`, `created_at`
  - Low-level `recordAccess(event)`; owner-scoped `listAccessEvents(page)`.
- **`GET /api/v1/permissions`**, per [public-api.md](../public-api.md). Its `sources` summary never names other apps.
- Keep `docs/public-api.md` in sync if anything here changes.

## Contract provided

- **Taxonomy:** `MEMORY_CATEGORIES` (16), the ordered tiers, a rank helper, and labels and descriptions for both, from `@/lib/memory-taxonomy`.
- **Policy:** `evaluateAccess`, `canRead`, `canWrite` and the `AccessScope` type, from `@/lib/policy/evaluate-access`. Decisions apply **before** retrieval.
- **DAL:** `getAccessScope(userId, appId, operation)` from `@/data/grants`; `recordAccess(event)` and `listAccessEvents(page)` from `@/data/access-events`.
- **Gateway:** `requireApp(request): Promise<AppIdentity>`; `parseBody(request, schema)`; errors through `errorResponse`.

## Acceptance

- [ ] The policy engine's unit tests pass (`bun run test`).
- [ ] The migration maps the existing Jane memories, and `/dashboard/memories` shows the new labels.
- [ ] Permission toggles and source switches persist. "Revoke all" clears both.
- [ ] `GET /api/v1/permissions` returns 200 with a valid key and 401 with none (curl).
- [ ] Lint, typecheck, format and build pass. The next-devtools compile check is clean.

## Outcome & handoff notes

_10 bullets or fewer, filled in at the end._
