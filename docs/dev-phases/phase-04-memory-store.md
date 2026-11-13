# Phase 04 — Memory Store

> **Status:** ⬜ Not started · **Depends on:** 02 (db), 03 (auth) · **Unlocks:** 06, 08, 10, 16

## Goal

The vault owner can store, view, edit, delete and filter personal memories. Memory content is **encrypted at the application level** before it reaches the database.

## Coupling boundary

- **Owns:** `src/lib/crypto.ts`, `src/lib/memory-taxonomy.ts`, the `memories` table and migration, `src/data/memories.ts`, the `/dashboard/memories` page and its Server Actions, the Jane seed script.
- **Must not:** know about permissions, connected-app auth or AI. `source_app_id` is just a nullable column; Phase 05 may add the FK in its own migration.
- **Later changes by other phases:** Phase 10 adds index-sync calls to this DAL's write functions. Phase 11 reuses `insertMemory`.

## Decisions to make with the user (at phase start)

- **Encryption:** Node `crypto` AES-256-GCM (recommended, no dependency) / libsodium.
- **Key:** a single `MEMORY_ENCRYPTION_KEY` (32 bytes, base64) for the MVP. The ciphertext is prefixed with a key version (`v1:`).
- **Category taxonomy:** a fixed list (recommended for the MVP) or user-defined. Suggested list:
  - `activity`, `sleep`, `diet`, `mood`, `health`, `work`, `social`, `finance`, `relationships`, `personal`
- **Sensitivity levels (ordered):** suggested `low` < `moderate` < `high` < `restricted`.
- **Memories table UI:** a plain table (recommended) / TanStack Table.

## Skills / plugins to look for

None beyond those already installed. Re-check the ORM's skills if any were installed in Phase 02.

## In scope (MVP slice)

- `src/lib/crypto.ts`:
  - `encryptField(plaintext)` returns `"v1:<iv>:<tag>:<ciphertext>"`; `decryptField(value)` reverses it.
  - Unit tests: round trip, tampered ciphertext fails, wrong key fails.
- `src/lib/memory-taxonomy.ts`: the `MEMORY_CATEGORIES` and `SENSITIVITY_LEVELS` constants, types, and a `sensitivityRank()` helper.
- `memories` table:
  - `id`, `user_id`
  - `content_encrypted`
  - `category`, `sensitivity`
  - `source_type` (`user` | `app`), `source_app_id` (nullable)
  - `occurred_at`, `created_at`, `updated_at`
  - **No plaintext content or summaries anywhere.**
- `src/data/memories.ts` (server-only):
  - Owner-scoped functions through `requireUser()`: `listMemories(filters)` (category, sensitivity, source; simple pagination), `getMemory(id)`, `createMemory(input)`, `updateMemory(id, input)`, `deleteMemory(id)`. They return decrypted DTOs only to the owner.
  - Low-level `insertMemory(userId, input, source)` and `getMemoriesByIds(userId, ids)`. These are **not** session-checked; they're documented as "only call after authorization" and used by the gateway phases.
- `/dashboard/memories`:
  - a list with category, sensitivity and source filters
  - create and edit dialog
  - delete confirmation
  - category and sensitivity badges
  - all mutations go through Server Actions
- `bun run seed:jane`: about 30 realistic memories for "Jane" across activity, sleep, diet, mood, plus a few finance and relationships entries (these test privacy later).
- Env var: `MEMORY_ENCRYPTION_KEY`.

## Out of scope → hardening backlog

- Per-user keys, key rotation, KMS, soft delete (seeded). Content search arrives in Phase 10.

## Contract provided

- `encryptField` / `decryptField` from `@/lib/crypto`.
- `MEMORY_CATEGORIES`, `SENSITIVITY_LEVELS`, `MemoryCategory`, `Sensitivity`, `sensitivityRank()` from `@/lib/memory-taxonomy`.
- `MemoryDTO = { id, content, category, sensitivity, source: { type, appId? }, occurredAt, createdAt }`.
- `insertMemory(userId, input, source)`, `getMemoriesByIds(userId, ids)`. The caller must have authorized the access.

## Deliverables

Crypto module + tests, taxonomy module, `memories` migration, memories DAL, Memories page + actions, seed script, env var.

## Acceptance criteria & verification

- [ ] Create, edit, delete and filter work in the UI.
- [ ] In the database, `content_encrypted` is ciphertext only.
- [ ] Crypto unit tests pass.
- [ ] User B cannot read or modify user A's memories, including by calling the action with A's memory id.
- [ ] `bun run seed:jane` populates a fresh account.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
