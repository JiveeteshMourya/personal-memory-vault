# Phase 12 — Context Request API

> **Status:** ⬜ Not started · **Depends on:** 06 (policy), 07 (gateway), 10 (semantic search) · **Unlocks:** 13

## Goal

A connected app asks the vault for context for a **stated purpose**, and gets back **only authorized, relevant memories**. Authorization happens **before** retrieval, so out-of-scope data is never fetched.

## Coupling boundary

- **Owns:** `POST /api/v1/context` (raw mode), `src/lib/context/retrieve-authorized-context.ts`, and its section in `docs/public-api.md`.
- **Uses only contracts:** `requireApp`, `getActiveGrants`, `evaluateAccess`, `semanticSearch`, `getMemoriesByIds`, `recordAccessEvent`.
- Projection and synthesis by AI is **Phase 13**. This phase returns authorized snippets as they are.

## Decisions to make with the user (at phase start)

- **Default and max `limit`:** suggested 10 and 25.
- **Minimum relevance score cutoff:** suggested to start without one, and tune it with Jane's data.
- **Owner attribution:** whether the response includes `sourceApp` names (recommended: category only, no source app, for minimal disclosure).

## Skills / plugins to look for

None expected.

## In scope (MVP slice)

- `retrieveAuthorizedContext({ app, purpose, query, categories?, limit })` returns `{ items, allowedCategories, deniedCategories }`:
  1. Load the grants and run `evaluateAccess(read, categories)`.
  2. If nothing is allowed, throw `ApiError(403)`.
  3. Run `semanticSearch` with `scopes` built from the allowed categories and their sensitivity caps.
  4. Load and decrypt with `getMemoriesByIds`.
  5. **Re-check** each item's category and sensitivity against the decision. This is cheap belt-and-braces; drop and log any mismatch.
  6. Return DTOs: `{ id, category, content, occurredAt }`.
- `POST /api/v1/context`:
  - Body `{ purpose (required), query, categories?, limit? }`.
  - Returns `200 { purpose, items, deniedCategories }`.
  - Records exactly one `read` event with `memory_ids`, and the `partial` / `allowed` / `denied` decision.
- Update `docs/public-api.md`.

## Out of scope → hardening backlog

- Query-enumeration defense, per-sensitivity result caps (seeded). Pagination, caching.

## Contract provided

- `retrieveAuthorizedContext(input)` from `@/lib/context/retrieve-authorized-context`. **This is the only path by which memories flow to an app or to the projection LLM.**
- `POST /api/v1/context`, request `{ purpose, query, categories?, limit? }`. Phase 13 adds `mode`.

## Deliverables

The retrieval module (+ a test with mocked search, and a mismatch check), the route handler, the API doc update.

## Acceptance criteria & verification

- [ ] Journal app with read grants on `sleep`, `activity` and `diet`: the query "what might be affecting my mood" returns only those categories.
- [ ] A query that mentions money never returns `finance` memories without a finance grant.
- [ ] No read grants: 403, plus a `denied` event.
- [ ] The Access Log shows the purpose and the exact memory ids disclosed.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
