# Phase 09 — Consent, Overview & Demo Readiness

> **Status:** ✅ Done · **Depends on:** 06, 07, 08 · **Unlocks:** the 2026-11-17 demo

## Goal

Apps can **ask** for access they don't have, and the owner approves or narrows the request in one click. The dashboard home shows the whole vault at a glance. The seed data and a runbook make the demo repeatable on this PC.

**Sprint mode:** no new libraries. Use Claude Code's built-in `dataviz` skill for the Overview charts.

## In scope

- **Consent:**
  - `consent_requests` table (`src/db/schema/consent.ts`):
    - columns: `user_id`, `app_id` (cascade), `operation`, `categories` text[], `max_sensitivity`, `reason_encrypted` (app-written free text, encrypted like the access log's purpose), `status` (`pending`\|`approved`\|`denied`), `created_at`, `decided_at`
  - **`POST /api/v1/consent-requests`**, per [public-api.md](../public-api.md), audited as `consent`
  - a pending-requests panel on `/dashboard/permissions`
  - **Approve** opens the request pre-filled. The owner can narrow the categories and the cap, and for reads pick the allowed **sources**. One transaction (`approveConsentRequest`) then writes the grants and sources: it only narrows the request, and never lowers a cap the app already holds. **Deny** records the decision and changes nothing else.
- **Overview `/dashboard`** (replaces the placeholder):
  - memory counts by category and by tier
  - connected apps
  - pending consent requests (linked)
  - the last 5 access events (linked to the access log)
- **Demo seed:** `scripts/seed-jane.ts` covers all 16 categories and every tier, with new-field values (provenance, importance, tags). It includes clearly `private` and `protected` memories (a diagnosis, debts, a relationship issue), so non-disclosure can be shown. It stays **app-agnostic**: apps are registered live in the UI during the demo. The seed ends by reminding you to run `bun run reindex`.
- **`docs/demo-runbook.md`:**
  - **Startup:** `docker compose up -d` (Postgres and Qdrant) → `bun dev` (vault :3000), then the hub on :3001. The Qdrant index persists in its Docker volume, so `bun run reindex` is needed only after reseeding.
  - **Reset:** re-seed
  - **Demo flow:** register apps → grant → hub apps write → context from another app → untick a source → consent request → access log
  - **Fallback:** the Playground, if the hub misbehaves
- Finalize `docs/public-api.md` (every endpoint live, status line updated).
- **Prune agent tooling:** remove the `shadcn` and `supabase-postgres-best-practices` skills (no vault UI or schema work remains), and update the index's tooling table and Decisions Log.

## Contract provided

- `POST /api/v1/consent-requests`, as documented.
- `bun run seed:jane [email] [--reset]` + `bun run reindex` give a repeatable demo vault.
- `@/data/consent`: low-level `createConsentRequest`; owner-scoped `listPendingConsentRequests`, `approveConsentRequest`, `denyConsentRequest`.
- Owner-scoped counts for the Overview: `getMemoryCounts` (`@/data/memories`), `getGrantCounts` (`@/data/grants`). `listAccessEvents(page, pageSize)`.

## Acceptance

- [x] An app files a consent request, it appears as pending, approving it grants access, and `GET /api/v1/permissions` reflects that. Denying it changes nothing.
- [x] The Overview shows correct counts after seeding.
- [x] Following the runbook from a cold start (containers down) gets to a working demo. Verified on the vault side; the hub steps await the hub build.
- [x] Lint, typecheck, format and build pass.

## Outcome & handoff notes

Done 2026-11-16.

- **Consent:**
  - The reason is stored encrypted (`reason_encrypted`).
  - Approval is one transaction: it can narrow a request, never widen it, and never lowers an existing cap.
  - Approval locks the apps before the request row (an app delete's order).
  - The access log hides the outcome badge on consent events, and labels the reason "Reason".
- **Shared code moved:**
  - access-event labels and `OutcomeBadge` → `@/components/access-event-summary`
  - the app monogram → `@/components/app-monogram`
  - `SENSITIVITY_CAP_LABELS` and `formatCategoryList` → `@/lib/memory-taxonomy`
  - `lockOwnedApps` is now exported from `@/data/grants`
- **Overview:** CSS only, following the `dataviz` skill:
  - topics as ranked bars
  - tiers as a tall segmented bar on a validated ordinal slate ramp (the `--tier-*` tokens in `globals.css`)
  - links into Memories, Permissions and the access log (`#event-<id>` anchors)
- **Seed:** 59 of Jane's own memories over all 16 topics and 4 tiers. `--reset` wipes her memories, apps and access log. It asserts its own coverage, so an edit can't silently drop a topic or tier.
- **Smoke script:** 37 checks; the new consent checks file one real pending request (deny it, or reset).
- **Verified** with a throwaway account, signed up over HTTP and deleted afterwards:
  - smoke 37/37
  - approve and deny through real Server Action POSTs: widening and repeat decisions refused; narrowed approval shown by `GET /permissions`; deny left it unchanged; a lower-tier approval didn't lower `activity`
  - Overview counts equal to SQL
  - reindex; a `protected` diagnosis withheld under a `personal` cap
  - a clean dev log and next-devtools check
- **Jane's account wasn't reseeded**, so her three existing apps stay. Run `bun run seed:jane --reset` and `bun run reindex` before the demo ([demo-runbook.md](../demo-runbook.md)).
- **The hub (`gen-ai-apps-hub`) is still boilerplate.** Its "Request access" button calls `POST /api/v1/consent-requests` as documented. Until it's built, the runbook's Playground and curl fallback covers the demo.
- **Agent tooling:** the `shadcn` and `supabase-postgres-best-practices` skills and `skills-lock.json` were removed. Only the `next-devtools` MCP remains.
