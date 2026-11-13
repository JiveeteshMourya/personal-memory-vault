# Phase 13 — Context Projection & Synthesis

> **Status:** ⬜ Not started · **Depends on:** 09 (AI), 12 (authorized retrieval) · **Unlocks:** 15

## Goal

Apps can receive a **minimized, purpose-specific projection** instead of raw memories. AI turns the authorized memories into the smallest useful representation for the stated purpose, and combines them across sources into insights. A **disclosure list** says exactly which memories were used.

## Coupling boundary

- **Owns:**
  - `src/lib/context/project-context.ts`
  - the projection prompt
  - the `mode` option on `POST /api/v1/context`
  - the `/dashboard/playground` page
- **Structural privacy guarantee:** `projectContext` accepts **only** the output of `retrieveAuthorizedContext` (Phase 12). The LLM never sees unauthorized memories.

## Decisions to make with the user (at phase start)

- **Default `mode`:** `projection` (recommended, minimal disclosure) or `raw`.
- **Projection schema** (suggested):
  - `{ summary, facts: [{ statement, category, basedOn: memoryId[] }], insights: [{ statement, categories[] }] }`
- **Owner preview:** whether Playground previews are recorded in the Access Log (recommended: yes, as `preview`, distinguishable from real app access).

## Skills / plugins to look for

- The AI SDK skill from Phase 09 (if installed).

## In scope (MVP slice)

- `projectContext({ purpose, query, authorized })` returns a `Projection`:
  - It calls `generateStructured` with a prompt that tells the model to:
    - answer only what the purpose needs
    - prefer aggregates and trends over verbatim details
    - never quote sensitive specifics
    - cite `basedOn` ids
  - It validates that every `basedOn` id belongs to `authorized.items`, and drops anything that doesn't.
- `POST /api/v1/context` gains `mode: "raw" | "projection"`:
  - projection response: `{ purpose, projection, disclosure: { memoryIds, categories }, deniedCategories }`
  - The audit event records `disclosure.memoryIds`.
- `/dashboard/playground`:
  - The owner picks an app, then enters a purpose and a query.
  - The page shows side by side: the authorized raw set, the projection, and the denied categories.
  - It uses the same functions as the API. It never calls the HTTP API from the server.
- Prompt in `src/lib/ai/prompts/project-context.ts`.
- Update `docs/public-api.md`.

## Out of scope → hardening backlog

- Leakage evals, output PII redaction (seeded). Caching projections, streaming.

## Contract provided

- `projectContext({ purpose, query, authorized })` returns a `Projection` (the schema above).
- `POST /api/v1/context` with `mode`, and the response shape above.

## Deliverables

The projection module + prompt, the route update, the Playground page, the API doc update.

## Acceptance criteria & verification

- [ ] Jane's journal-app scenario returns a projection that matches her data, e.g. "activity dropped this week, sleep averaging ~6h, irregular meals". Its `disclosure.memoryIds` are a subset of the authorized items.
- [ ] Jane's finance and relationship memories (present in the seed) never appear in projections without grants.
- [ ] The Playground shows the raw set and the projection side by side.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
