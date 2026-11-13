# Phase 14 — Consent Requests & Short-lived Capabilities

> **Status:** ⬜ Not started · **Depends on:** 06 (grants), 07 (gateway) · **Unlocks:** —

## Goal

1. **Consent:** an app can **ask** for access it doesn't have. The owner approves or denies the request in the dashboard, and an approval creates grants, optionally time-boxed.
2. **Capabilities:** an app can exchange its API key for a **short-lived, narrowly scoped capability token** for one purpose, which limits the damage if a token leaks.

> If this phase feels too large in its session, split it into 14a (consent) and 14b (capabilities), and record the split in the Pivot Log.

## Coupling boundary

- **Owns:** the `access_requests` table, the `/api/v1/access-requests` and `/api/v1/capabilities` routes, the `/dashboard/requests` page and its nav entry, and the capability verification in `src/lib/gateway.ts`.
- **Uses only contracts:** `setGrant` (Phase 06 DAL), `requireApp`, `recordAccessEvent`, `evaluateAccess`.

## Decisions to make with the user (at phase start)

- **Capability token format:**
  - Signed JWT via `jose` (recommended; stateless)
  - Opaque DB token
- **TTL:** suggested 15 minutes max, chosen by the app per request.
- **Approval options:** approve as requested / approve with a shorter expiry / deny.

## Skills / plugins to look for

None expected. If `jose` is used, check for official docs or skills.

## In scope (MVP slice)

**Consent**

- `access_requests` table:
  - `id`, `user_id`, `app_id`
  - `operation`, `categories[]`, `max_sensitivity`, `purpose`, `requested_duration`
  - `status` (`pending` | `approved` | `denied`), `decided_at`
- `POST /api/v1/access-requests`: returns `202 { id, status: "pending" }`.
- `GET /api/v1/access-requests/[id]`: returns the status, for the requesting app only.
- `/dashboard/requests`:
  - Pending list, with a badge count in the nav.
  - Approve calls `setGrant` for each category, with expiry. Deny records the decision.
  - Both are audited.

**Capabilities**

- `POST /api/v1/capabilities` (API-key auth):
  - Body `{ purpose, operation, categories, ttlSeconds }`.
  - Returns `{ token, expiresAt }`. The token's scope is the **intersection** of the request and the current grants.
- `requireApp` also accepts `Authorization: Bearer <capability>`:
  - It returns `AppIdentity` plus `capabilityScope`.
  - Downstream `evaluateAccess` input is narrowed to that scope.
  - An expired or invalid capability returns 401.

- Update `docs/public-api.md`.

## Out of scope → hardening backlog

- Owner notifications, a revocation list for capabilities (seeded). App webhooks on decision.

## Contract provided

- The endpoints above.
- `AppIdentity` gains an optional `capabilityScope: { purpose, operation, categories }`. Phases 08 and 12 must pass it to the narrowing step. Make that change natively in their handlers.

## Deliverables

Migration, the 4 route handlers, the Requests page and actions, the gateway capability support, the API doc update.

## Acceptance criteria & verification

- [ ] An app without access requests `sleep`. After the owner approves, `POST /api/v1/context` succeeds. After a denial, it returns 403.
- [ ] A capability scoped to `sleep` can't read `activity`, even when the app's grants allow it.
- [ ] An expired capability returns 401.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
