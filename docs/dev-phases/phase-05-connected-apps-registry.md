# Phase 05 — Connected Apps & API Keys

> **Status:** ⬜ Not started · **Depends on:** 02 (db), 03 (auth) · **Unlocks:** 06, 07

## Goal

The vault owner registers external applications and issues them API keys, and an app can prove its identity with its key. **Connecting an app grants it no access to any data.** Reading and writing are granted separately in Phase 06.

## Coupling boundary

- **Owns:** the `connected_apps` and `app_api_keys` tables, `src/data/apps.ts`, `src/lib/app-auth.ts`, the `/dashboard/apps` page.
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
- `src/data/apps.ts` (owner-scoped):
  - `listApps()`, `createApp(input)`, `deleteApp(id)`
  - `createApiKey(appId)`, which returns the plaintext key **once**
  - `revokeApiKey(keyId)`
- `src/lib/app-auth.ts`: `authenticateApp(request: Request): Promise<AppIdentity | null>`.
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

- `authenticateApp(request)` returns `AppIdentity | null`, where `AppIdentity = { appId, appName, userId, keyId }`. `userId` is the owner of the app, so it is the vault the app may talk to.
- `connected_apps.id` is the FK target for grants (Phase 06) and audit events (Phase 07).
- `listApps()` for other dashboard pages, e.g. the permissions matrix.

## Deliverables

Migration, apps DAL, `app-auth.ts`, the Apps page and actions.

## Acceptance criteria & verification

- [ ] Registering an app and creating a key shows the key exactly once. Only the hash is stored.
- [ ] A small `bun test` or script calls `authenticateApp` with a constructed `Request`:
  - a valid key returns the identity
  - a revoked or garbage key returns `null`
- [ ] Deleting an app removes its keys.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
