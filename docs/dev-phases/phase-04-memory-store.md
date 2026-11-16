# Phase 04 — Memory Store

> **Status:** ✅ Done · **Depends on:** 02 (db), 03 (auth) · **Unlocks:** 05, 06, 07, 08

## Goal

The vault owner can store, view, edit, delete and filter personal memories. Memory content is **encrypted at the application level** before it reaches the database.

## Coupling boundary

- **Owns:** `src/server/lib/crypto.ts`, `src/shared/constants/memory-taxonomy.ts`, the `memories` model (`src/server/models/memory.model.ts`), `src/server/repository/memory.repository.ts`, `src/server/services/memory.service.ts`, `src/shared/types/memory.types.ts`, the `/dashboard/memories` page (`src/client/features/memories/`) and its Server Actions, the Jane seed script.
- **Must not:** know about permissions, connected-app auth or AI. The FK from `source_app_id` to `connected_apps` is Phase 05's; the semantic index the write functions keep in step is Phase 07's.

## Decisions (made with the user, 2026-11-15)

- **Encryption:** Node `crypto` AES-256-GCM, no dependency. libsodium was not picked.
- **Key:** a single `MEMORY_ENCRYPTION_KEY` (32 bytes, base64) for the MVP. The ciphertext is prefixed with a key version (`v1:`).
- **Taxonomy:** fixed lists, per [classification-model.md](../classification-model.md): 16 platform-agnostic categories, and 4 sensitivity tiers ordered by the harm if leaked, `shareable` < `personal` < `private` < `protected`. User-defined categories were not picked.
- **Memories table UI:** the plain shadcn table, with filtering and pagination on the server through URL search params. TanStack Table was not picked.
- **Agent's picks:**
  - Offset pagination (`?page=N`, 20 per page).
  - The native `datetime-local` input, so no date-picker dependency.
  - shadcn's `alert-dialog` for the delete confirmation.

## Skills / plugins

- None added. `supabase-postgres-best-practices` (installed in Phase 02) was loaded before designing the table. Its rules shaped the schema: text + check constraints for enums, `timestamptz`, the FK index, composite index order. Drizzle has no official skill.
- Bundled Next.js guides read: `server-actions.md`, `01-getting-started/07-mutating-data.md`, `forms.md`, and the `searchParams` + Cache Components parts of `08-caching.md` and `03-layouts-and-pages.md`.

## In scope (MVP slice)

- `src/server/lib/crypto.ts`:
  - `encryptField(plaintext)` returns `"v1:<iv>:<tag>:<ciphertext>"`; `decryptField(value)` reverses it.
  - Unit tests: round trip, tampered ciphertext fails, wrong key fails.
- `src/shared/constants/memory-taxonomy.ts`: `MEMORY_CATEGORIES` and `SENSITIVITY_TIERS`, their types, `sensitivityRank()`, and display labels.
- `memories` table:
  - `id`, `user_id`
  - `content_encrypted`
  - `category`, `sensitivity`
  - `source_type` (`user` | `app`), `source_app_id` (null for the owner's own entries)
  - `occurred_at`, `created_at`, `updated_at`
  - the app-written labels that Phase 07 fills, with defaults that describe an owner's own entry
  - **No plaintext content or summaries anywhere.**
- `src/server/repository/memory.repository.ts` (server-only): every memory query. It takes the owner's `userId`, encrypts on write, and decrypts rows into DTOs.
- `src/server/services/memory.service.ts`: the owner-facing functions (list, counts, create, update, delete). Their callers pass `user.id` from `requireUser()`, and they return decrypted DTOs only to the owner.
- `/dashboard/memories`:
  - a list with category, sensitivity and source filters
  - create and edit dialog
  - delete confirmation
  - category and sensitivity badges
  - all mutations go through Server Actions
- `bun run seed:jane [email]`: realistic memories for "Jane", written straight to the table, encrypted. The clearly sensitive entries (health, finance, relationships) show privacy at work. Phase 09 sets the demo's full set.
- Env var: `MEMORY_ENCRYPTION_KEY`.

## Out of scope → hardening backlog

- Per-user keys, key rotation, KMS, soft delete (seeded). Content search arrives in Phase 07.
- This phase added:
  - AAD binding of ciphertext to its row
  - keyset pagination
  - app-sourced seed data
  - server-side local time
  - the 2,000-character cap

## Contract provided

- **Crypto:** `encryptField` / `decryptField` from `@/server/lib/crypto` (server-only).
  - `decryptField` throws on a malformed value, an unknown version, tampering or the wrong key.
  - Its errors never include the value.
- **Taxonomy:** from `@/shared/constants/memory-taxonomy`, with no imports (safe in client components and model files).
  - `MEMORY_CATEGORIES` (16) and `SENSITIVITY_TIERS` (ordered `shareable` → `protected`)
  - `MemoryCategory`, `Sensitivity`
  - `sensitivityRank(tier)`, from 0 (shareable) to 3 (protected)
  - `CATEGORY_LABELS`, `SENSITIVITY_LABELS` (sentence case, for UIs)
- **Types** from `@/shared/types/memory.types`:
  - **`MemorySource`** `= { type: "user" } | { type: "app"; appId: string | null }`. `appId` is null once the app that wrote the memory is deleted (`ON DELETE SET NULL`); the memory stays the owner's.
  - **`MemoryDTO`** `= { id, content, category, sensitivity, source, provenance, confidence, importance, visibility, expiresAt, sessionId, tags, entities, occurredAt, createdAt }`. The labels after `source` are Phase 07's.
  - **`MemoryInput`** `= { content, category, sensitivity, occurredAt?: Date }`. `occurredAt` defaults to now.
  - `MemoryFilters` (`category?`, `sensitivity?`, `source?: "user" | "app"`, `page?`), `MemoryPage` (`{ memories, page, hasNextPage }`) and `MemoryCounts` (`total`, `byCategory`, `bySensitivity`, `bySource`).
- **Service** (`@/server/services/memory.service`). Each function takes the owner's `userId` first, which its caller gets from `requireUser()`:
  - `listMemories(userId, filters?)` returns a `MemoryPage`, newest `occurredAt` first, 20 per page.
  - `getMemoryCounts(userId)` counts by label without decrypting anything.
  - `listMemoriesByIds(userId, ids)` returns the owner's memories in the order of `ids`.
  - `createMemory(userId, input)` returns the `MemoryDTO`.
  - `updateMemory(userId, id, input)` returns `MemoryDTO | null`. It replaces content, category, sensitivity and date; the source and the app-written labels never change.
  - `deleteMemory(userId, id)` returns `boolean`.
  - The writes keep Phase 07's semantic index in step. A sync failure is logged and repaired by `bun run reindex`.
  - Someone else's id behaves exactly like a missing one.
- **Repository** (`@/server/repository/memory.repository`), called only by services after they've authorized the access:
  - `insertMemories(userId, inputs: NewMemory[], source)` returns `MemoryDTO[]` from one multi-row insert (all or none). `source` is `{ type: "user" } | { type: "app"; appId: string }`: a new memory always names its writer.
  - `getMemoriesByIds(userId, ids)` returns `MemoryDTO[]` **in the order of `ids`**, so a relevance ranking survives. Ids that are missing or belong to someone else are left out.
  - `listAllMemories(userId)` (for `reindex`), plus Phase 07's `hasExternalId` and `deleteAppMemories`.
- **Schema:** `memories` and `MEMORY_SOURCE_TYPES` from `@/server/models`.

## Deliverables

Crypto module + tests, taxonomy module, the `memories` model, memory types, repository and service, the Memories page + actions, seed script, env var.

## Acceptance criteria & verification

- [x] Create, edit, delete and filter work in the UI.
- [x] In the database, `content_encrypted` is ciphertext only.
- [x] Crypto unit tests pass.
- [x] User B cannot read or modify user A's memories, including by calling the action with A's memory id.
- [x] `bun run seed:jane` populates a fresh account.
- [x] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

Done 2026-11-15.

**Built:**

- **No new npm dependencies.** One new shadcn primitive, `alert-dialog` (Base UI). `button.tsx` was kept, not overwritten (see Phase 01's local edits).
- **Env:** `MEMORY_ENCRYPTION_KEY` is validated in `env.ts` as base64 decoding to exactly 32 bytes. It is documented in `.env.example` and given a placeholder in `test/setup.ts`.
- **Crypto (`src/server/lib/crypto.ts`):**
  - AES-256-GCM with a random 12-byte IV per call and the 16-byte auth tag.
  - Each part is base64, joined as `v1:<iv>:<tag>:<ciphertext>`.
  - The key is decoded once at import.
- **Schema (`src/server/models/memory.model.ts`):**
  - The columns above, with a cascading FK to `users`.
  - Check constraints for category and sensitivity. Their value lists are inlined from the taxonomy module through `sql.raw`.
  - `memories_source_check`: `user` ⇒ no app id; `app` ⇒ an app id until that app is deleted. It also rejects any other `source_type`.
  - `memories_user_id_occurred_at_idx` on `(user_id, occurred_at desc, id desc)` serves the FK and the list's filter and order.
- **Repository (`src/server/repository/memory.repository.ts`):**
  - Every query filters by `user_id` in the same `where` as the id, so there's no read-then-check.
  - Selects and `returning` use an explicit column set without `user_id`.
  - `toDTO` decrypts. Only ciphertext ever reaches Drizzle, so a `DrizzleQueryError`'s params can't leak plaintext.
- **Service (`src/server/services/memory.service.ts`):** the owner-facing functions, with the index sync around the writes.
- **Actions (`src/client/features/memories/actions.ts`):**
  - `createMemoryAction` and `updateMemoryAction` (`useActionState`-shaped), and `deleteMemoryAction(id)`. Each starts with `requireUser()`.
  - zod checks: content trimmed and 1–2,000 chars, enums, an ISO datetime with offset, and `z.uuid()` ids.
  - A malformed, missing or foreign id → "This memory no longer exists." / `{ ok: false }`.
  - Success → `revalidatePath("/dashboard/memories")`.
  - Nothing echoes the content back.
- **Page:**
  - `page.tsx` keeps `metadata` and renders `MemoriesContent`: the static header with "New memory", plus `<Suspense fallback={<MemoryListSkeleton/>}>`.
  - `MemoryList` (a server component) calls `requireUser()`, parses `searchParams` with zod (dropping invalid values), then calls `listMemories(user.id, …)`.
  - It renders the filters, the table (columns fold into the content cell below `md`), Newer/Older links, and three empty states (none yet, no match, page out of range).
- **Client components (`src/client/features/memories/`):**
  - `MemoryFilters`: Base UI Selects → `router.replace` in a transition, with `useOptimistic`. The list dims via `group-has-data-pending/list`.
  - `MemoryForm`: used by `NewMemoryButton` and the edit dialog in `MemoryRowActions`.
  - `MemoryRowActions`: edit, and delete through an `AlertDialog`.
  - `LocalDateTime`.
  - Badges (`src/client/components/memory-badges.tsx`): a neutral category badge; sensitivity escalating through the `withheld` slate, with a lock on "protected".
- **Seed (`scripts/seed-jane.ts`, `bun run seed:jane [email]`, default `jane@example.com`):**
  - Needs an existing account with no memories. It refuses otherwise and exits with 1.
  - Writes every memory in one batched insert, all owner-sourced: app-written memories come from the hub apps during the demo.
- **Tests (local, git-ignored):** 60 pass (30 new).
  - **Crypto:** round trip, a fresh IV, the format, tampered iv/tag/ciphertext, wrong key, malformed values and versions.
  - **Taxonomy:** rank order and labels.
  - **Repository and service:** a recording fake of Drizzle, with `where` params rendered through `PgDialect`. Owner scoping, ciphertext-only inserts, the DTO shape, pagination, and the order of `getMemoriesByIds`.
  - **Actions:** field errors, trimming and date conversion, the uuid check, not-found, revalidation, no content echo.

**Verified:**

- **Migration:** `db:migrate` created `memories` with the checks, FK and index. Re-running it is a no-op.
- **Env:** a 5-byte key and a non-base64 key are both rejected at import with a clear message.
- **Seed:**
  - An unknown email → exit 1 with "Sign up … first".
  - Jane's fresh account is seeded.
  - A second run refuses.
- **Ciphertext only:** every `content_encrypted` value starts with `v1:`. A whole-row text search (`m::text ilike …`) for seeded phrases finds 0 rows.
- **Page (curl with a session):**
  - Jane's list renders decrypted content.
  - Filters work alone and combined.
  - Bogus params are ignored (200).
  - Page 2 shows "Newer" only; page 9 shows "This page is empty"; `source=app` shows "No memories match these filters".
  - A second account's list shows "No memories yet".
- **Actions (raw `Next-Action` POSTs, the way the client sends them):**
  - B's `updateMemoryAction` and `deleteMemoryAction` with Jane's memory id → "no longer exists" / `ok:false`, and Jane's row is unchanged (same ciphertext hash, `updated_at`).
  - With no session → 307 to `/sign-in`, row unchanged.
  - Jane's own update → `ok:true`, re-encrypted. Her delete → `ok:true`, row gone.
  - B's own create with a `+05:30` offset was stored as the correct UTC instant and didn't appear in Jane's list.
  - Invalid input → all four field errors.
- **Logs:** the dev log contains no memory content and no errors.
- **Checks:**
  - next-devtools MCP `get_compilation_issues`: none.
  - Lint, typecheck, tests, format and build pass.
  - The build shows `/dashboard/memories` as partially prerendered (◐).
- **Not verified by the agent:** the browser walk-through (dialogs, selects, toasts, hydration). `browser_eval` needs the global `agent-browser` install that this project's tooling rules exclude, so it's for the user.

**Gotchas for later phases:**

- **The key is the data.** Losing or changing `MEMORY_ENCRYPTION_KEY` makes every memory unreadable: `decryptField` throws, and the list page errors. Restart `bun dev` after setting it, since env is validated at startup. Rotation needs a `v2` key plus a re-encrypt job (backlog).
- **Scripts use repositories, not services or middlewares.** Repositories never read the session, so they run under `bun --conditions=react-server`; `require-user.middleware` imports `next/navigation`, which crashes there (React's server build has no `createContext`). The seed writes rows with `encryptField` + `db` in one transaction with `--reset`; `reindex` uses `listAllMemories`.
- **The seed bypasses the services, so nothing it writes is indexed.** Run `bun run reindex` after seeding.
- **Changing the taxonomy needs a migration.** The check constraints inline the lists. Edit `memory-taxonomy.ts`, then `db:generate`, which picks up the changed checks.
- **The form submits through `onSubmit` + `startTransition(dispatch)`, not `<form action>`.** This keeps React from resetting the fields on a validation error, so nothing has to be echoed back. The cost is no no-JS fallback, which is fine since the dialog needs JS anyway.
- **Dates:**
  - The form turns the `datetime-local` value into an ISO instant in the browser.
  - `LocalDateTime` renders UTC on the server and the viewer's local time after hydration (`useSyncExternalStore`).
  - Reuse it wherever a timestamp is shown.
- **Base UI Select:**
  - `items` accepts a plain `Record`, so `CATEGORY_LABELS` / `SENSITIVITY_LABELS` can be passed straight in.
  - `SelectValue` takes a `placeholder`.
  - `name` adds a hidden input to the form; with nothing chosen it submits `""`.
- **Testing actions by hand:**
  - Action ids are in `.next/dev/server/app/<route>/page/server-reference-manifest.json`, or come from the MCP `get_server_action_by_id`.
  - A `(state, formData)` action takes multipart fields named `_1_<field>` plus `0=["$undefined","$K1"]`.
  - A plain-args action takes `text/plain` `["<arg>"]`.
  - Send `Origin` and `Accept: text/x-component`.
- **The edit dialog gets the whole `MemoryDTO`,** so decrypted content is in the owner's RSC payload. That's expected (it's on screen anyway), but never pass DTOs to pages other people can see.
