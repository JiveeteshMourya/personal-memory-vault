# Phase 08 — Context API, Access History & Playground

> **Status:** ⬜ Not started · **Depends on:** 06 (policy, audit), 07 (AI, index, memory fields) · **Unlocks:** 09, the hub apps

## Goal

A connected app asks a natural-language question with rich optional hints, and gets back a **projection of at most 100 words**, written for its purpose. The projection is built **only** from memories it's allowed to see: authorization happens before retrieval. The owner sees every access, including exactly which memories were disclosed, and can try requests as any app in the Playground.

**Sprint mode:** no new libraries.

## In scope

- **`requestContext(identity, input, channel)`** in `src/data/context.ts` runs the read flow from [public-api.md](../public-api.md):
  1. `getAccessScope(…, "read")`. With no categories or no allowed sources, **403 `read_denied`**.
  2. The effective categories are the granted ones ∩ `categories` − `excludeCategories`. `withheldCategories` lists the requested categories that aren't granted, and nothing else.
  3. The sources are the allowed sources ∩ `origin` (`other_apps` drops this app; `this_app` keeps only it).
  4. **Search text:** the `query` (rewritten into a standalone query by one small LLM call when `conversation` is given), plus `keywords` and `entities`. Then `embed`.
  5. `searchMemoryIds`, filtered by the category caps, sources, visibility and `timeRange`. `topK` comes from `depth` (8/20/40), over-fetched ×2 for reranking.
  6. `getMemoriesByIds`, then **re-check `canRead`** on every row and drop expired memories and those under `minConfidence`.
  7. **Rerank:** similarity, a recency weight (`recency`), importance and confidence. Keep the top `depth`.
  8. With nothing left, return `context: ""` **without any LLM call**.
  9. **Projection** (`projectContext` in `src/lib/ai.ts`):
     - use only the given memories
     - serve `purpose` and `task`
     - skip `knownFacts`
     - follow `format`, `perspective`, `language` and `timezone`
     - hedge low-confidence and inferred facts
     - never name source apps
     - stay within `maxWords`
     - **then enforce the word cap on the server**
  10. `recordAccess` with the disclosed memory ids, the categories, the withheld count, and the encrypted query and purpose.
  11. Return `{ requestId, context, wordCount, coverage, withheldCategories, sources? }`.
- **`POST /api/v1/context`:** `requireApp` → strict parse → `requestContext(…, "api")`.
- **`/dashboard/access-log`** (replaces the placeholder):
  - a paginated list: app, action, purpose and query (decrypted for the owner), outcome, categories, time
  - expanding a row shows the disclosed memories
- **`/dashboard/playground`** (replaces the placeholder):
  - pick an app, then fill in `query`, `purpose`, `task`, `origin`, `categories`, `maxWords` and `perspective`
  - a Server Action runs `requestContext(…, "playground")`
  - shows the context, the coverage, and the disclosed memories with their tier and source
  - this is the main verification tool for the pipeline
- Extend `scripts/smoke-api.sh` to cover the context endpoint.

## Contract provided

- **`POST /api/v1/context`**, as documented in [public-api.md](../public-api.md).
- `requestContext(identity, input, channel)` from `@/data/context` (Phase 09 doesn't need it; the hub uses only HTTP).
- The access log shows every `write`, `retract` and `context` event. Phase 09 adds `consent`.

## Acceptance

- [ ] Playground walk-through:
  - An app with read grants for activity, sleep and mood, sourced from another app, gets a relevant projection of 100 words or fewer.
  - Untick that source, and the same query returns nothing from it.
  - A `protected` memory never appears under a `personal` cap.
- [ ] `origin: "other_apps"` excludes the app's own writes. Naming `finance` without a grant shows `withheldCategories: ["finance"]`.
- [ ] With no grants, the request gets 403. With nothing relevant, `context: ""`, and the log shows no LLM call.
- [ ] The access log lists the request with exactly the disclosed memories.
- [ ] The smoke script passes. Lint, typecheck, format and build pass. The dev log has no memory content.

## Outcome & handoff notes

_10 bullets or fewer, filled in at the end._
