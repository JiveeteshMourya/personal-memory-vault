# Phase 04 — Memory Store

> **Status:** ✅ Done · **Depends on:** 02 (db), 03 (auth) · **Unlocks:** 06, 08, 10, 16

## Goal

The vault owner can store, view, edit, delete and filter personal memories. Memory content is **encrypted at the application level** before it reaches the database.

## Coupling boundary

- **Owns:** `src/lib/crypto.ts`, `src/lib/memory-taxonomy.ts`, the `memories` table and migration, `src/data/memories.ts`, the `/dashboard/memories` page and its Server Actions, the Jane seed script.
- **Must not:** know about permissions, connected-app auth or AI. `source_app_id` is just a nullable column; Phase 05 owns its FK to `connected_apps`.
- **Later changes by other phases:** Phase 10 adds index-sync calls to this DAL's write functions. Phase 11 reuses `insertMemory`.

## Decisions (made with the user, 2026-11-15)

- **Encryption:** Node `crypto` AES-256-GCM, no dependency. libsodium was not picked.
- **Key:** a single `MEMORY_ENCRYPTION_KEY` (32 bytes, base64) for the MVP. The ciphertext is prefixed with a key version (`v1:`).
- **Category taxonomy:** a fixed list: `activity`, `sleep`, `diet`, `mood`, `health`, `work`, `social`, `finance`, `relationships`, `personal`. User-defined categories were not picked.
- **Sensitivity levels (ordered):** `low` < `moderate` < `high` < `restricted`.
- **Memories table UI:** the plain shadcn table, with filtering and pagination on the server through URL search params. TanStack Table was not picked.
- **Agent's picks:**
  - Offset pagination (`?page=N`, 20 per page).
  - The native `datetime-local` input, so no date-picker dependency.
  - shadcn's `alert-dialog` for the delete confirmation.

## Skills / plugins

- None added. `supabase-postgres-best-practices` (installed in Phase 02) was loaded before designing the table. Its rules shaped the schema: text + check constraints for enums, `timestamptz`, the FK index, composite index order. Drizzle has no official skill.
- Bundled Next.js guides read: `server-actions.md`, `01-getting-started/07-mutating-data.md`, `forms.md`, and the `searchParams` + Cache Components parts of `08-caching.md` and `03-layouts-and-pages.md`.

## In scope (MVP slice)

- `src/lib/crypto.ts`:
  - `encryptField(plaintext)` returns `"v1:<iv>:<tag>:<ciphertext>"`; `decryptField(value)` reverses it.
  - Unit tests: round trip, tampered ciphertext fails, wrong key fails.
- `src/lib/memory-taxonomy.ts`: the `MEMORY_CATEGORIES` and `SENSITIVITY_LEVELS` constants, types, a `sensitivityRank()` helper, and display labels.
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
- `bun run seed:jane [email]`: 32 realistic memories for "Jane" across activity, sleep, diet and mood, plus a few health, finance and relationships entries (these test privacy later).
- Env var: `MEMORY_ENCRYPTION_KEY`.

## Out of scope → hardening backlog

- Per-user keys, key rotation, KMS, soft delete (seeded). Content search arrives in Phase 10.
- This phase added:
  - AAD binding of ciphertext to its row
  - keyset pagination
  - app-sourced seed data
  - server-side local time
  - the 2,000-character cap

## Contract provided

- **Crypto:** `encryptField` / `decryptField` from `@/lib/crypto` (server-only).
  - `decryptField` throws on a malformed value, an unknown version, tampering or the wrong key.
  - Its errors never include the value.
- **Taxonomy:** from `@/lib/memory-taxonomy`, with no imports (safe in client components and schema files):
  - `MEMORY_CATEGORIES`, `SENSITIVITY_LEVELS` (ordered low → restricted)
  - `MemoryCategory`, `Sensitivity`
  - `sensitivityRank(level)`, from 0 (low) to 3 (restricted)
  - `CATEGORY_LABELS`, `SENSITIVITY_LABELS` (sentence case, for UIs)
- **Types and functions** from `@/data/memories`:
  - **`MemorySource`** `= { type: "user" } | { type: "app"; appId: string | null }`. `appId` is null once the app that wrote the memory is deleted (Phase 05: `ON DELETE SET NULL`); the memory stays the owner's.
  - **`MemoryDTO`** `= { id, content, category, sensitivity, source: MemorySource, occurredAt: Date, createdAt: Date }`
  - **`MemoryInput`** `= { content, category, sensitivity, occurredAt?: Date }`. `occurredAt` defaults to now.
  - **Owner-scoped:**
    - `listMemories(filters?: { category?, sensitivity?, source?: "user" | "app", page? })` returns `{ memories, page, hasNextPage }`, newest `occurredAt` first, `MEMORY_PAGE_SIZE` (20) per page.
    - `getMemory(id)` returns `MemoryDTO | null`.
    - `createMemory(input)`
    - `updateMemory(id, input)` returns `MemoryDTO | null`. It replaces content, category, sensitivity and date; the source never changes.
    - `deleteMemory(id)` returns `boolean`.
    - Someone else's id behaves exactly like a missing one.
  - **Low-level (not session-checked; the caller must have authorized the access):**
    - `insertMemory(userId, input, source)` returns `MemoryDTO`. `source` is `{ type: "user" } | { type: "app"; appId: string }` (never a null app id).
    - `getMemoriesByIds(userId, ids)` returns `MemoryDTO[]` **in the order of `ids`**, so a relevance ranking survives. Ids that are missing or belong to someone else are left out.
- **Schema:** `memories` and `MEMORY_SOURCE_TYPES` from `@/db/schema`.

## Deliverables

Crypto module + tests, taxonomy module, `memories` migration, memories DAL, Memories page + actions, seed script, env var.

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
- **Crypto (`src/lib/crypto.ts`):**
  - AES-256-GCM with a random 12-byte IV per call and the 16-byte auth tag.
  - Each part is base64, joined as `v1:<iv>:<tag>:<ciphertext>`.
  - The key is decoded once at import.
- **Schema (`src/db/schema/memories.ts`, `drizzle/0002_memories.sql`):**
  - The columns above, with a cascading FK to `users`.
  - Check constraints for category and sensitivity. Their value lists are inlined from the taxonomy module through `sql.raw`.
  - `memories_source_check`: `user` ⇒ no app id; `app` ⇒ an app id. It also rejects any other `source_type`.
  - One index, `memories_user_id_occurred_at_idx` on `(user_id, occurred_at desc, id desc)`. It serves the FK and the list's filter and order.
- **DAL (`src/data/memories.ts`):**
  - Every owner function starts with `requireUser()` and filters by `user_id` in the same `where` as the id, so there's no read-then-check.
  - Selects and `returning` use an explicit column set without `user_id`.
  - `toDTO` decrypts. Only ciphertext ever reaches Drizzle, so a `DrizzleQueryError`'s params can't leak plaintext.
- **Actions (`memories/actions.ts`):**
  - `createMemoryAction` and `updateMemoryAction` (`useActionState`-shaped), and `deleteMemoryAction(id)`.
  - zod checks: content trimmed and 1–2,000 chars, enums, an ISO datetime with offset, and `z.uuid()` ids.
  - A malformed, missing or foreign id → "This memory no longer exists." / `{ ok: false }`.
  - Success → `revalidatePath("/dashboard/memories")`.
  - Nothing echoes the content back.
- **Page:**
  - `page.tsx` is the static shell: the header with "New memory", plus `<Suspense fallback={<MemoryListSkeleton/>}>`.
  - `MemoryList` (a server component) parses `searchParams` with zod, dropping invalid values, then calls `listMemories`.
  - It renders the filters, the table (columns fold into the content cell below `md`), Newer/Older links, and three empty states (none yet, no match, page out of range).
- **Client components (`_components/`):**
  - `MemoryFilters`: Base UI Selects → `router.replace` in a transition, with `useOptimistic`. The list dims via `group-has-data-pending/list`.
  - `MemoryForm`: used by `NewMemoryButton` and the edit dialog in `MemoryRowActions`.
  - `MemoryRowActions`: edit, and delete through an `AlertDialog`.
  - `LocalDateTime`.
  - Badges: a neutral category badge; sensitivity escalating through the `withheld` slate, with a lock on "restricted".
- **Seed (`scripts/seed-jane.ts`, `bun run seed:jane [email]`, default `jane@example.com`):**
  - Needs an existing account with no memories. It refuses otherwise and exits with 1.
  - Writes 32 memories dated across the last two weeks in one batched insert. All are owner-sourced (apps don't exist yet).
  - Finance and relationships are `high`/`restricted`.
- **Tests (local, git-ignored):** 60 pass (30 new).
  - **Crypto:** round trip, a fresh IV, the format, tampered iv/tag/ciphertext, wrong key, malformed values and versions.
  - **Taxonomy:** rank order and labels.
  - **DAL:** a recording fake of Drizzle, with `where` params rendered through `PgDialect`. Owner scoping, ciphertext-only inserts, the DTO shape, no DB call without a session, pagination, and the order of `getMemoriesByIds`.
  - **Actions:** field errors, trimming and date conversion, the uuid check, not-found, revalidation, no content echo.

**Verified:**

- **Migration:** `db:migrate` created `memories` with the checks, FK and index. Re-running it is a no-op.
- **Env:** a 5-byte key and a non-base64 key are both rejected at import with a clear message.
- **Seed:**
  - An unknown email → exit 1 with "Sign up … first".
  - Jane's fresh account → 32 rows.
  - A second run refuses.
- **Ciphertext only:** every `content_encrypted` value starts with `v1:`. A whole-row text search (`m::text ilike …`) for seeded phrases finds 0 rows.
- **Page (curl with a session):**
  - Jane's list renders decrypted content.
  - Filters work alone and combined (`finance` + `restricted` shows only the credit-card memory).
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
- **Probe data:** the second probe account was deleted. `jane@example.com` (password `probe-password-123`) is left, freshly seeded, for the browser check. Delete it when you're done:
  ```sql
  delete from users where email = 'jane@example.com'
  ```

**Gotchas for later phases:**

- **The key is the data.** Losing or changing `MEMORY_ENCRYPTION_KEY` makes every memory unreadable: `decryptField` throws, and the list page errors. Restart `bun dev` after setting it, since env is validated at startup. Rotation needs a `v2` key plus a re-encrypt job (backlog).
- **Scripts can't import `@/data/memories`.**
  - It imports `@/data/auth` → `next/navigation`, which crashes under `bun --conditions=react-server` (React's server build has no `createContext`).
  - Scripts use `encryptField` + `db` directly, as the seed does.
  - The same applies to any DAL module that imports `@/data/auth`.
- **Phase 10 hook points:**
  - `createMemory` goes through `insertMemory`, so index on `insertMemory`, `updateMemory` and `deleteMemory`.
  - `deleteMemory` returns only a boolean; it has the id already.
  - The seed bypasses the DAL: re-index Jane through Phase 10's backfill, or re-seed after Phase 10 adds a hook.
- **Phase 05 (done):** `source_app_id` now has its FK to `connected_apps` (`ON DELETE SET NULL`) and `memories_source_app_id_idx`. `memories_source_check` now allows `source_type = 'app'` with a null app id (an app that was deleted). New memories still name their writer: `insertMemory`'s `source` is `{ type: "user" } | { type: "app"; appId: string }`.
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
