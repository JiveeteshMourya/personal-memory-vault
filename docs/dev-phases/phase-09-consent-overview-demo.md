# Phase 09 — Consent, Overview & Demo Readiness

> **Status:** ⬜ Not started · **Depends on:** 06, 07, 08 · **Unlocks:** the 2026-11-17 demo

## Goal

Apps can **ask** for access they don't have, and the owner approves or narrows the request in one click. The dashboard home shows the whole vault at a glance. The seed data and a runbook make the demo repeatable on this PC.

**Sprint mode:** no new libraries. Use Claude Code's built-in `dataviz` skill for the Overview charts.

## In scope

- **Consent:**
  - `consent_requests` table (`src/db/schema/consent.ts`):
    - columns: `user_id`, `app_id` (cascade), `operation`, `categories` text[], `max_sensitivity`, `reason`, `status` (`pending`\|`approved`\|`denied`), `created_at`, `decided_at`
  - **`POST /api/v1/consent-requests`**, per [public-api.md](../public-api.md), audited as `consent`
  - a pending-requests panel on `/dashboard/permissions`
  - **Approve** opens the request pre-filled. The owner can narrow the categories and the cap, and for reads pick the allowed **sources**. Then it calls `setGrant` and `setSourceAccess`. **Deny** records the decision.
- **Overview `/dashboard`** (replaces the placeholder):
  - memory counts by category and by tier
  - connected apps
  - pending consent requests (linked)
  - the last 5 access events (linked to the access log)
- **Demo seed:** `scripts/seed-jane.ts` covers all 16 categories and every tier, with new-field values (provenance, importance, tags). It includes clearly `private` and `protected` memories (a diagnosis, debts, a relationship issue), so non-disclosure can be shown. It stays **app-agnostic**: apps are registered live in the UI during the demo. The seed ends by reminding you to run `bun run reindex`.
- **`docs/demo-runbook.md`:**
  - **Startup:** `docker compose up -d` → `bun run reindex` → `bun dev` (vault :3000), then the hub on :3001
  - **Reset:** re-seed
  - **Demo flow:** register apps → grant → hub apps write → context from another app → untick a source → consent request → access log
  - **Fallback:** the Playground, if the hub misbehaves
- Finalize `docs/public-api.md` (every endpoint live, status line updated).
- **Prune agent tooling:** remove the `shadcn` and `supabase-postgres-best-practices` skills (no vault UI or schema work remains), and update the index's tooling table and Decisions Log.

## Contract provided

- `POST /api/v1/consent-requests`, as documented.
- `bun run seed:jane [email]` + `bun run reindex` give a repeatable demo vault.

## Acceptance

- [ ] An app files a consent request, it appears as pending, approving it grants access, and `GET /api/v1/permissions` reflects that. Denying it changes nothing.
- [ ] The Overview shows correct counts after seeding.
- [ ] Following the runbook from a cold start (containers down) gets to a working demo.
- [ ] Lint, typecheck, format and build pass.

## Outcome & handoff notes

_10 bullets or fewer, filled in at the end._
