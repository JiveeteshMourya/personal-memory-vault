# Phase 07 — Context Gateway Core & Audit Log

> **Status:** ⬜ Not started · **Depends on:** 05 (app auth), 06 (grants) · **Unlocks:** 08, 12, 14

## Goal

Give connected apps one consistent entry point: authenticated app identity inside route handlers, standard error responses, and an **audit trail of every app access**. The owner can browse that trail.

## Coupling boundary

- **Owns:**
  - `src/lib/gateway.ts`
  - the `access_events` table and `src/data/access-events.ts`
  - `GET /api/v1/gateway/whoami`
  - the `/dashboard/access-log` page
  - `docs/public-api.md`
- **Must not:** implement the read or write endpoints. Those are Phases 08 and 12.

## Decisions to make with the user (at phase start)

- **Audit retention:** keep everything for the MVP.
- **Audit content:** recommended ids, categories, purpose and decision only. **Never memory content.**

## Skills / plugins to look for

None expected.

## In scope (MVP slice)

- `src/lib/gateway.ts`: `requireApp(request): Promise<AppIdentity>`. It uses `authenticateApp` and throws `ApiError(401, "unauthorized", …)` otherwise. Handlers call it at the top inside their `try` (standard Next.js; no wrapper framework).
- `access_events` table:
  - `id`, `user_id`, `app_id`
  - `operation` (`auth` | `read` | `write` | `request`)
  - `purpose`
  - `requested_categories`, `allowed_categories`
  - `decision` (`allowed` | `partial` | `denied`)
  - `memory_ids` (array, nullable), `created_at`
- `src/data/access-events.ts`:
  - `recordAccessEvent(event)`, low-level and fire-and-forget via `after()`
  - owner-scoped `listAccessEvents(filters)`, filtered by app, decision and date
- `GET /api/v1/gateway/whoami`: returns the app's name and its active grants summary (categories × operations). Records an `auth` event.
- `/dashboard/access-log`: a table of events (time, app, operation, purpose, decision, categories, memory count) with filters.
- `docs/public-api.md`: auth header, error shape, and `whoami`. Later API phases append their endpoints.

## Out of scope → hardening backlog

- Rate limiting, tamper-evident logs, alerting (seeded).

## Contract provided

- `requireApp(request)` from `@/lib/gateway`, returning `AppIdentity`. Phase 14 may extend it with a capability scope.
- `recordAccessEvent(event)` and the `AccessEvent` shape from `@/data/access-events`.
- **Rule:** every `/api/v1` endpoint that touches vault data records exactly one access event per request.
- `docs/public-api.md` is the living public API reference.

## Deliverables

`gateway.ts`, migration, access-events DAL, the `whoami` route, the Access Log page, `docs/public-api.md`.

## Acceptance criteria & verification

- [ ] `curl -H "Authorization: Bearer <key>" /api/v1/gateway/whoami` returns 200 with the app name and grants.
- [ ] A missing, invalid or revoked key returns 401 with the standard error body.
- [ ] Every call appears in the Access Log, and no memory content is stored.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
