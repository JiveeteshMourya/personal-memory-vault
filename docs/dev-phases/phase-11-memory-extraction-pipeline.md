# Phase 11 — Extraction & Classification Pipeline

> **Status:** ⬜ Not started · **Depends on:** 08 (write rules), 09 (AI), 10 (index) · **Unlocks:** 15

## Goal

Apps (and the owner) can submit **unstructured input**, such as a journal entry or a workout note. AI extracts atomic memories, classifies each one's **category and sensitivity**, and the vault stores and indexes them. The app's write grants still apply.

## Coupling boundary

- **Owns:** the `raw_inputs` table, `src/lib/pipeline/*`, `POST /api/v1/inputs`, `GET /api/v1/inputs/[id]`, the "Add from text" action on the Memories page, and the extraction prompt.
- **Uses only contracts:** `generateStructured`, `insertMemory`, `indexMemory` (through `insertMemory`'s hook), `evaluateAccess`, `getActiveGrants`, `recordAccessEvent`, `encryptField` / `decryptField`.
- **AI classifies; it does not authorize.** Extracted memories in categories the app can't write to are **dropped**, and the drop is audited.

## Decisions to make with the user (at phase start)

- **Background execution:**
  - Next `after()` (simplest; recommended for the MVP)
  - Inngest _(past)_
  - Supabase Queues
- **Extraction output schema:** `[{ content, category, sensitivity, occurredAt? }]`. Confirm the max items per input.
- **Trust in app hints:** whether an app may suggest a category or sensitivity (recommended: ignore hints in the MVP).

## Skills / plugins to look for

- If Inngest is chosen, the official Inngest skills/plugin (project scope).
- The AI SDK skill from Phase 09.

## In scope (MVP slice)

- `raw_inputs` table:
  - `id`, `user_id`, `app_id` (nullable for owner input)
  - `text_encrypted`
  - `status` (`pending` | `processed` | `failed`), `error`
  - `memory_count`, `created_at`
- `POST /api/v1/inputs`:
  - Body `{ text }`. Requires `requireApp` and at least one active write grant.
  - Stores the input encrypted, schedules processing, and returns `202 { id, status: "pending" }`.
- `GET /api/v1/inputs/[id]`: status and created memory count, for the owning app only.
- `src/lib/pipeline/process-input.ts`:
  1. Decrypt the input.
  2. Run `generateStructured` with the extraction + classification prompt.
  3. Validate categories and sensitivities against the taxonomy.
  4. For app inputs, filter by write grants.
  5. Call `insertMemory` for each item (source = app or user).
  6. Mark the input processed, or failed with the error.
  7. Audit the result (kept and dropped categories, no content).
- Owner path: an "Add from text" dialog on `/dashboard/memories` runs the same pipeline (no grant filter). Extracted memories show an "AI-classified" badge and stay editable (Phase 04 edit).
- Prompt in `src/lib/ai/prompts/extract-memories.ts`.
- Update `docs/public-api.md`.

## Out of scope → hardening backlog

- Prompt-injection hardening, dedupe and merge, relationship graph, retries and dead-letter (seeded).

## Contract provided

- `POST /api/v1/inputs` returns `202 { id, status }`. `GET /api/v1/inputs/[id]` returns `{ id, status, memoryCount, error? }`.
- `processInput(inputId)` in `src/lib/pipeline/process-input.ts`.
- The memories table gains a `classified_by` field (`user` | `app` | `ai`), or equivalent, in this phase's migration.

## Deliverables

Migration, the two routes, the pipeline module, the prompt, the owner dialog, the API doc update.

## Acceptance criteria & verification

- [ ] A journal-style paragraph produces several correctly categorized memories, visible in the UI and in search.
- [ ] An app with write grants only for `activity` + `sleep` submits text that also mentions money. No `finance` memory is created, and the drop is audited.
- [ ] An LLM or provider failure marks the input `failed`, with a readable error in the status endpoint.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
