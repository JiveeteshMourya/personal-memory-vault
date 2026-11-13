# Phase 06 — Permission & Policy Engine

> **Status:** ⬜ Not started · **Depends on:** 04 (taxonomy), 05 (apps) · **Unlocks:** 07, 08, 12, 14

## Goal

The owner grants, denies and revokes each app's access by **operation** (read / write) and **category**, capped by a **maximum sensitivity**. A pure, default-deny policy engine makes every access decision.

## Coupling boundary

- **Owns:** the `app_grants` table, `src/lib/policy/evaluate-access.ts` (pure, no I/O), `src/data/grants.ts`, the `/dashboard/permissions` page.
- **Must not:** know about HTTP, retrieval or AI. The engine takes plain data and returns a decision, so it can be swapped or extended without touching its callers.
- **AI does not make authorization decisions** (from the objective).

## Decisions to make with the user (at phase start)

- **Grant granularity:** per category (recommended) / per category + source app.
- **Expiry:** an optional `expires_at` on a grant. The UI offers "never / 7 days / 30 days".
- **Purpose:**
  - Recommended: required on every request and logged (Phase 07), but **not** used in decisions in the MVP.
  - Purpose-bound grants are in the backlog and Phase 14.

## Skills / plugins to look for

None expected.

## In scope (MVP slice)

- `app_grants` table:
  - `id`, `user_id`, `app_id`
  - `operation` (`read` | `write`), `category`, `max_sensitivity`
  - `expires_at` (nullable), `created_at`, `revoked_at`
  - At most one active grant per (app, operation, category).
- `evaluateAccess({ grants, operation, requestedCategories, now })` returns an `AccessDecision`:
  - `allowed: [{ category, maxSensitivity }]` and `denied: [{ category, reason }]`
  - Default deny. Revoked or expired grants are ignored.
  - Read and write are independent.
  - `requestedCategories` empty means "everything this app may access for this operation".
- Thorough unit tests for `evaluateAccess`. This is the core privacy logic.
- `src/data/grants.ts`:
  - owner-scoped `listGrants(appId?)`, `setGrant(input)`, `revokeGrant(id)`, `revokeAllForApp(appId)`
  - low-level `getActiveGrants(userId, appId)` for the gateway
- `/dashboard/permissions`:
  - pick an app
  - a matrix of categories × {read, write} toggles, with a max-sensitivity select per enabled cell
  - a "revoke all" button for the app

## Out of scope → hardening backlog

- Purpose-bound grants, grant change history (seeded). Field-level and time-of-day rules.

## Contract provided

- `evaluateAccess(input): AccessDecision`, plus the `AccessDecision` and `GrantInput` types (from `@/lib/policy/evaluate-access`).
- `getActiveGrants(userId, appId)` (from `@/data/grants`).
- Semantics: the decision applies **before** any retrieval. Callers must restrict queries to `allowed` categories with sensitivity ≤ `maxSensitivity`.

## Deliverables

Migration, policy engine + tests, grants DAL, the Permissions page and actions.

## Acceptance criteria & verification

- [ ] Unit tests cover:
  - default deny
  - read and write independence
  - revoked grants
  - expired grants
  - the sensitivity cap
  - empty `requestedCategories`
  - mixed allowed and denied
- [ ] UI toggles persist, and "revoke all" clears every grant for the app.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
