# Phase 05 — Connected Apps & API Keys

> **Status:** ✅ Done · **Depends on:** 02 (db), 03 (auth) · **Unlocks:** 06, 07

## Goal

The vault owner registers external applications and issues them API keys, and an app can prove its identity with its key. **Connecting an app grants it no access to any data.** Reading and writing are granted separately in Phase 06.

## Coupling boundary

- **Owns:** the `connected_apps` and `app_api_keys` tables, `src/server/services/app.service.ts`, `src/server/middlewares/require-app.middleware.ts`, the `/dashboard/apps` page.
- **Must not:** decide what an app may read or write. That is Phase 06.

## Decisions to make with the user (at phase start)

- **Key format:** recommended `pmv_<random 32 bytes base64url>`, with the first characters stored as a display prefix.
- **Key storage:** SHA-256 hash (recommended; keys are high-entropy, so a slow hash isn't needed) / bcrypt or argon2.
- **App metadata:** name, description, and an optional icon or color.

## Skills / plugins to look for

None expected.

## In scope (MVP slice)

- Tables:
  - `connected_apps`: `id`, `user_id`, `name`, `description`, `created_at`
  - `app_api_keys`: `id`, `app_id`, `key_prefix`, `key_hash`, `created_at`, `last_used_at`, `revoked_at`
  - Optionally add the FK from `memories.source_app_id` to `connected_apps.id`.
- `src/server/services/app.service.ts` (owner-scoped):
  - `listApps()`, `createApp(input)`, `deleteApp(id)`
  - `createApiKey(appId)`, which returns the plaintext key **once**
  - `revokeApiKey(keyId)`
- `src/server/middlewares/require-app.middleware.ts`: `authenticateApp(request: Request): Promise<AppIdentity | null>`.
  - Reads `Authorization: Bearer <key>`, hashes it and looks it up.
  - Rejects revoked keys.
  - Updates `last_used_at` (non-blocking, e.g. `after()`).
- `/dashboard/apps`:
  - the app list, with key status and last used
  - a register dialog
  - a "key shown once" dialog with a copy button
  - revoke key, delete app

## Out of scope → hardening backlog

- Rotation grace period, key expiry (seeded). Key scopes beyond grants.

## Contract provided

- **App auth:** `authenticateApp(request)` from `@/server/middlewares/require-app.middleware` returns `AppIdentity | null`, where `AppIdentity = { appId, appName, userId, keyId }`.
  - `userId` is the owner of the app, so it is the vault the app may talk to.
  - It returns `null` for a missing header, another scheme, or a malformed, unknown or revoked key. It never throws for a bad key and never logs one.
  - It proves identity only and knows nothing about grants.
  - Call it from Route Handlers: it records the key's use with `after()`.
- **Schema:** `connectedApps` and `appApiKeys` from `@/server/models`. `connected_apps.id` is the FK target for grants (Phase 06) and audit events (Phase 07).
- **DAL** (`@/server/services/app.service`), owner-scoped:
  - `listApps()` returns `AppDTO[]`, ordered by name. Use it on other dashboard pages, e.g. the permissions matrix.
    - `AppDTO = { id, name, description: string | null, createdAt, activeKey: ApiKeySummary | null }`
    - `ApiKeySummary = { id, prefix, createdAt, lastUsedAt: Date | null }`
  - `createApp({ name, description? })` returns `{ ok: true, app } | { ok: false, error: "name_taken" }`. Names are unique per owner, ignoring case.
  - `createApiKey(appId)` returns `{ key, prefix } | null`. It revokes the app's current key: **an app has one active key at a time.** `key` is the only copy of the plaintext.
  - `revokeApiKey(keyId)` and `deleteApp(id)` return `boolean`.
  - Someone else's id behaves exactly like a missing one.
- **Deleting an app** removes its keys. The memories it wrote stay, with `source_app_id` set to null.

## Deliverables

Migration, apps DAL, `app-auth.ts`, the Apps page and actions.

## Acceptance criteria & verification

- [x] Registering an app and creating a key shows the key exactly once. Only the hash is stored.
- [x] A small `bun test` or script calls `authenticateApp` with a constructed `Request`:
  - a valid key returns the identity
  - a revoked or garbage key returns `null`
- [x] Deleting an app removes its keys.
- [x] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

Done 2026-11-15.

**Built:**

- **No new dependencies.** Keys and hashing use `node:crypto`, the copy button uses `navigator.clipboard`, and the UI uses shadcn primitives already installed.
- **Keys (`src/server/lib/api-keys.ts`):**
  - `generateApiKey()` returns `{ key, prefix, hash }`. The key is `pmv_` + 32 random bytes in base64url (47 chars), and the prefix is its first 12 chars.
  - `hashApiKey(key)` is SHA-256 hex. Keys carry 256 bits of randomness, so a fast hash is enough, and the hash serves as the lookup index.
  - `isApiKeyFormat(value)` turns away anything not shaped like a key before any lookup.
- **Schema (`src/server/models/app.model.ts`, `drizzle/0003_connected_apps.sql`):**
  - **`connected_apps`:** a cascading FK to `users`, and the unique index `connected_apps_user_id_name_key` on `(user_id, lower(name))`, which also serves the FK.
  - **`app_api_keys`:**
    - a cascading FK to `connected_apps`, and a unique `key_hash`
    - `app_api_keys_app_id_idx`, for the FK and cascades
    - the partial unique index `app_api_keys_one_active_key` on `(app_id) where revoked_at is null`
  - **`memories`:**
    - `source_app_id` gets its FK (`on delete set null`) and `memories_source_app_id_idx`.
    - `memories_source_check` now allows an app-sourced row with a null app id.
    - This changes Phase 04's `MemorySource` to `appId: string | null`; its doc is updated.
- **DAL (`src/server/services/app.service.ts`):**
  - **Owner functions** start with `requireUser()` and scope by owner in the same statement. Revoking uses `update … from connected_apps`, so there's no read-then-check.
  - **`createApiKey`** runs in one transaction:
    - it locks the owner's app row (`for update`), so concurrent rotations run one after the other
    - it revokes the active key, then inserts the new hash
    - only the prefix and hash ever reach Drizzle, so a `DrizzleQueryError`'s params can't leak a key
  - **`createApp`** maps a unique violation (a `DrizzleQueryError` whose `.cause.code` is `23505`) to `name_taken`.
  - **Low-level, not session-checked:**
    - `findAppIdentityByKeyHash(hash)` joins apps and active keys.
    - `touchApiKey(keyId)` sets `last_used_at = now()`.
- **App auth (`src/server/middlewares/require-app.middleware.ts`):**
  1. Parses `Authorization: Bearer <key>`; the scheme is case-insensitive.
  2. Checks the format, hashes the key and looks it up.
  3. Then `after()` touches `last_used_at`. A failed touch logs a `warn` with the driver error (`.cause`) and the key id, never the key.
- **Actions (`apps/actions.ts`):**
  - **`registerAppAction`** (`useActionState`-shaped):
    - validates the name (trimmed, 1–60) and the description (trimmed, ≤ 280; empty means none)
    - creates the app and issues its first key
    - returns `{ ok: true, appName, key }`
  - **`createApiKeyAction(appId)`, `revokeApiKeyAction(keyId)` and `deleteAppAction(appId)`** check `z.uuid()` and return `{ ok }`, plus `key` for the new-key action.
  - Every success revalidates `/dashboard/apps`.
  - **The plaintext key travels only in an action response.** No Server Component renders it.
- **Page (`/dashboard/apps`):**
  - **Shell:** a static header with "Register app", and `<Suspense fallback={<AppListSkeleton/>}>` around `AppList`.
  - **`AppList`:** a bordered list. Each row shows:
    - a monogram, the name and the description
    - "Active key" + the mono prefix, or "No active key"
    - when it was last used, and the date it was added
  - **Empty state:** it now says a key grants nothing. The placeholder copy wrongly said connecting lets an app save memories.
  - **`RegisterAppButton`:**
    - a dialog with the form, submitted through `onSubmit` + `startTransition` so fields survive errors
    - on success, the same dialog shows `KeyReveal`
    - it closes only by Done, X or Escape (`disablePointerDismissal`)
    - closing unmounts the flow, which drops the key from memory
  - **`KeyReveal`:** the key in a read-only mono input with a Copy button, plus "you won't see it again; keep it on the app's server".
  - **`AppRowActions`:**
    - a menu with "New key" (when there's no active key), "Replace key" and "Revoke key" (when there is), and "Delete app"
    - every item except "New key" is confirmed in an `AlertDialog`
    - a new key opens `KeyReveal`, whose state is cleared once that dialog finishes closing
- **Shared:** `LocalDateTime` moved to `src/client/components/local-date-time.tsx`, since Memories and Apps both use it.
- **Test script:** it's now `bun test --isolate`.
  - Bun shares one module registry across test files by default, so one file's `mock.module()` leaked into later files. The suite had only passed because of file order.
  - Adding `apps.test.ts` (which mocks `@/server/middlewares/require-user.middleware`) broke `auth.test.ts`.
  - `isolate` isn't a `bunfig.toml` option, only a CLI flag.
- **Tests (local, git-ignored):** 103 pass (43 new).
  - **Keys:** the format and length, the prefix, the hash, uniqueness, the format check.
  - **App auth:** built with constructed `Request`s.
    - a valid key, looked up by its hash and never the key, returns the identity
    - revoked and unknown keys return null
    - no header, another scheme, garbage or extra parts return null without a lookup
    - the use is recorded after the response, and a failed record logs without the key
  - **DAL:** a recording fake of Drizzle that runs `transaction(cb)`. It covers:
    - owner scoping
    - the lock → revoke → insert order and hash-only inserts
    - `name_taken`, and rethrowing other errors
    - no DB call without a session
    - the low-level lookups
  - **Actions:** field errors, trimming, the empty description, name-taken without a key, no echo, uuid checks, revalidation.

**Verified:**

- **Migration:**
  - `db:migrate` created both tables with their indexes and FKs, plus the `memories` FK, index and relaxed check.
  - Re-running it is a no-op, and `db:generate` reports no changes.
  - The `parse_utilcmd.c` lines in the migrate output are a Postgres NOTICE ("schema drizzle already exists, skipping"), not an error.
- **Actions (raw `Next-Action` POSTs with a session):**
  - **Validation:** a blank name → "Name the app."
  - **Register:** "Health Records AI" → `ok:true` with the key.
    - In psql the row holds only the prefix and a hash equal to `sha256(key)`.
    - A whole-row search of both tables for the key's random part finds 0 rows.
  - **Duplicate:** "health records ai" again → "You already have an app with this name." A second account could use the same name.
  - **Replace:** the old key → 401, the new key → 200. One row is active and one revoked.
  - **Revoke:** the new key → 401, and a second revoke → `ok:false`.
  - **Page:** the HTML shows the prefix and never a full key.
  - **No session:** 307 to `/sign-in`.
- **Isolation:**
  - The second account's new-key, revoke and delete calls with Jane's app and key ids → `ok:false`, and Jane's active key was unchanged.
  - A malformed id → `ok:false`.
- **`authenticateApp` in the real runtime** (a throwaway `/api/v1/probe-app-auth` route, deleted afterwards):
  - a valid key → 200 with `{ appId, appName, userId, keyId }`, and `last_used_at` was set after the response
  - a lowercase `bearer` scheme → 200
  - garbage, a well-formed unknown key, or no header → 401
- **Delete:** an encrypted app-sourced memory was inserted for the app, then the app was deleted.
  - 0 app rows and 0 keys remained.
  - The memory stayed (`source_type = 'app'`, `source_app_id` null) and still rendered on `/dashboard/memories?source=app`.
  - The probe memory was removed afterwards.
- **Logs:** the dev log has no errors, no `pmv_` keys and no memory content.
- **Checks:**
  - next-devtools MCP `get_compilation_issues`: none.
  - Lint, typecheck, tests, format and build pass.
  - The build shows `/dashboard/apps` as partially prerendered (◐).
- **Probe data:** the second account and the probe session were deleted. `jane@example.com` is unchanged (32 memories, no apps).
- **Not verified by the agent:** the browser walk-through (dialogs, the Copy button, toasts). It needs `agent-browser`, which this project's tooling rules exclude, so it's for the user.

**Gotchas for later phases:**

- **Phase 06/07 FKs to `connected_apps.id`:**
  - Grants should cascade: they mean nothing without the app.
  - Audit events should use `on delete set null` (with a nullable `app_id`), or apps should be soft-deleted, so the access log outlives the app.
  - Apps are hard-deleted today, so a deleted app's name is gone (backlog).
- **Use `requireApp` (Phase 06) in handlers, not the DAL's low-level lookups.** `findAppIdentityByKeyHash` and `touchApiKey` are only for `authenticateApp`.
- **One key equals one vault owner.** An external app serving several people needs a key from each person's vault (backlog: a "connect your vault" flow). A demo uses one persona.
- **External apps call server-to-server.** Keys belong in the calling app's server env, never in browser code. There's deliberately no CORS setup.
- **Testing actions by hand:**
  - A `(state, formData)` action takes multipart fields named `_1_<field>` (not `1_<field>`), plus `0=["$undefined","$K1"]`.
  - A plain-args action takes `text/plain` `["<arg>"]`.
  - Action ids are in `.next/dev/server/app/<route>/page/server-reference-manifest.json`.
- **Run tests with `bun run test`**, not bare `bun test`: the script adds `--isolate`.
