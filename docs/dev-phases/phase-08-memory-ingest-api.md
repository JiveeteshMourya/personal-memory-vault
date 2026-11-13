# Phase 08 — Memory Ingest API

> **Status:** ⬜ Not started · **Depends on:** 04 (memories), 06 (policy), 07 (gateway) · **Unlocks:** 11, 15

## Goal

Connected apps can write **structured** information into the vault, but only into categories they hold a write grant for. Writing never implies reading.

## Coupling boundary

- **Owns:** `POST /api/v1/memories` and its section in `docs/public-api.md`.
- **Uses only contracts:** `requireApp`, `getActiveGrants`, `evaluateAccess`, `insertMemory`, `recordAccessEvent`.
- Unstructured input (journal text needing AI extraction) is **Phase 11**, not here.

## Decisions to make with the user (at phase start)

- **Sensitivity defaulting:** when the app omits `sensitivity`, recommended to default to the category's max allowed by the grant, or to `moderate`. Always reject a sensitivity above the grant's cap.
- **Single vs batch writes:** single (recommended for the MVP). Batch goes to the backlog.

## Skills / plugins to look for

None expected.

## In scope (MVP slice)

- `POST /api/v1/memories`
  - Body:
    - `content` (string, ≤ some sane max)
    - `category`
    - `sensitivity` (optional)
    - `occurredAt` (optional ISO)
  - Flow:
    1. `requireApp`, then validate the body.
    2. `evaluateAccess(write, [category])`.
    3. If denied: return 403 `forbidden` and record a `denied` event.
    4. If allowed: call `insertMemory(app.userId, …, { type: "app", appId })`, record an `allowed` event with the memory id, and return 201 `{ id }`.
- **App separation:** every memory carries `source_app_id`. The owner's Memories page shows a source badge and a filter. An app cannot read back what it wrote unless it also holds a read grant.
- Update `docs/public-api.md` with the request, response and error examples.

## Out of scope → hardening backlog

- Idempotency keys, batch ingest, payload limits and quotas (seeded).

## Contract provided

- `POST /api/v1/memories`:
  - request: `{ content, category, sensitivity?, occurredAt? }`
  - responses: `201 { id }`, `400`, `401`, `403`

## Deliverables

The route handler, its validation schema, and the public API doc update.

## Acceptance criteria & verification

- [ ] With a write grant on `activity`: `curl` returns 201, and the memory appears in the owner's UI with the app's source badge.
- [ ] Without a grant, or with only a **read** grant: 403, plus a `denied` access event.
- [ ] A sensitivity above the grant cap returns 403.
- [ ] Invalid bodies return 400 with field details.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
