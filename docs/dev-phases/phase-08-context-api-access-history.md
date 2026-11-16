# Phase 08 — Context API, Access History & Playground

> **Status:** ✅ Done · **Depends on:** 06 (policy, audit), 07 (AI, index, memory fields) · **Unlocks:** 09, the hub apps

## Goal

A connected app asks a natural-language question with rich optional hints, and gets back a **projection of at most 100 characters**, written for its purpose. The projection is built **only** from memories it's allowed to see: authorization happens before retrieval. The owner sees every access, including exactly which memories were disclosed, and can try requests as any app in the Playground.

**Sprint mode:** no new libraries.

## In scope

- **`requestContext(identity, input, channel)`** in `src/data/context.ts` runs the read flow from [public-api.md](../public-api.md):
  1. `getAccessScope(…, "read")`. With no categories or no allowed sources, **403 `read_denied`**.
  2. The effective categories are the granted ones ∩ `categories` − `excludeCategories`. `withheldCategories` lists the requested categories that aren't granted, and nothing else.
  3. The sources are the allowed sources ∩ `origin` (`other_apps` drops this app; `this_app` keeps only it).
  4. **Search text:** the `query` (rewritten into a standalone query by one small LLM call when `conversation` is given), plus `keywords` and `entities`. Then `embed`.
  5. `searchMemoryIds(userId, { vector, scope, readerAppId, timeRange, topK })`, with the read scope narrowed to the effective categories and sources from steps 2–3. The index filters by the category caps, sources, visibility (`shared`, or the reader's own), expiry and `timeRange`, and returns `{ id, score }[]`. `topK` comes from `depth` (8/20/40), over-fetched ×2 for reranking. Hits below a minimum similarity are dropped as unrelated.
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
     - stay within `maxChars`, and report which memories the text draws on
     - **then enforce the character cap on the server**
  10. `recordAccess` with the disclosed memory ids (the ones the text draws on), the categories, the withheld count, and the encrypted query and purpose.
  11. Return `{ requestId, context, charCount, coverage, withheldCategories, sources? }`.
- **`POST /api/v1/context`:** `requireApp` → strict parse → `requestContext(…, "api")`.
- **`/dashboard/access-log`** (replaces the placeholder):
  - a paginated list: app, action, purpose and query (decrypted for the owner), outcome, categories, time
  - expanding a row shows the disclosed memories
- **`/dashboard/playground`** (replaces the placeholder):
  - pick an app, then fill in `query`, `purpose`, `task`, `origin`, `categories`, `maxChars` and `perspective`
  - a Server Action runs `requestContext(…, "playground")`
  - shows the context, the coverage, and the disclosed memories with their tier and source
  - this is the main verification tool for the pipeline
- Extend `scripts/smoke-api.sh` to cover the context endpoint.

## Contract provided

- **`POST /api/v1/context`**, as documented in [public-api.md](../public-api.md).
- `requestContext(identity, input, channel)` from `@/data/context` (Phase 09 doesn't need it; the hub uses only HTTP).
- The access log shows every `write`, `retract` and `context` event. Phase 09 adds `consent`.

## Acceptance

- [x] Walk-through (verified through the API, which runs the same `requestContext` as the Playground; the Playground UI itself awaits the user's browser check):
  - An app with read grants for activity, sleep and mood gets a relevant projection of 100 characters or fewer.
  - Untick that source, and the same query returns nothing from it.
  - A `protected` memory never appears under a `personal` cap.
- [x] `origin: "other_apps"` excludes the app's own writes. Naming `finance` without a grant shows `withheldCategories: ["finance"]`.
- [x] With no grants, the request gets 403. With nothing relevant, `context: ""`, and the log shows no projection call.
- [x] The access log lists the request with exactly the disclosed memories.
- [x] The smoke script passes. Lint, typecheck, format and build pass. The dev log has no memory content.

## Outcome & handoff notes

Done 2026-11-16.

- **Pivot (user, mid-phase): the projection is capped at 100 characters, not 100 words.** `maxWords`/`wordCount` became `maxChars` (20–100, default 100)/`charCount`. The model gets a word budget (`maxChars / 8`), because models count words better than characters. The server then keeps the whole sentences or bullet lines that fit, and only cuts inside a sentence (with "…") when even the first is too long. It counts UTF-16 units, so the cap holds however an app counts.
- **Disclosure = what the text draws on.** The projection uses Structured Outputs to return `{ context, usedMemories }`. The access log, `coverage` and `sources` list those memories. If the model names none, everything it saw is logged, so the log can over-report but never comes up empty. This replaces the planned "everything sent counts", which logged 19 memories for one 100-character sentence.
- **No AI calls before authorization.** A 403 comes before any AI call. A request whose `categories`/`excludeCategories`/`origin` leave nothing to search makes no AI call at all. Search hits below `MIN_SIMILARITY = 0.2` are dropped, so an unrelated query returns `""` with no projection. Measured: unrelated top score 0.14, relevant 0.26–0.53.
- **Contract:**
  - `requestContext(identity, request, channel)` returns `{ response, disclosed }`, where identity is `Pick<AppIdentity, "userId" | "appId" | "appName">` and defaults live in the DAL.
  - Also new: `listMemoriesByIds` (owner-scoped), `rewriteQuery` and `projectContext` in `@/lib/ai`, and `@/lib/context-options` (enums and labels, client-safe).
  - `@/lib/api-fields` holds the shared zod fields, moved out of the memories route.
  - `memory-badges` moved to `@/components`, and `SourceLabel` takes `appName`.
- **UI:** access-log rows are native `<details>`; the page preloads (and decrypts) the memories its 20 events reference. Playground runs are real requests, logged with channel `playground`.
- **Smoke script (31 checks):** the `VAULT_API_KEY` app now also needs read grants for activity and sleep (Personal), no finance read grant, and **only itself** under "Reads data from".
- **Verified** with real OpenAI and Pinecone:
  - smoke 31/31
  - relevant, irrelevant, bullets, second person, conversation rewrite, protected-under-personal, finance withheld, and unticking a source
  - access-log rows (ids, outcome, encrypted query and purpose)
  - a clean dev log and next-devtools check
  - lint, typecheck, format and build
- **Gotcha: the network to OpenAI and Pinecone was flaky this session.** There were two transient 502s, and Pinecone queries took up to 25 s. Retrying worked. Check connectivity before the demo.
- **Hub handoff:** `gen-ai-apps-hub` must send `maxChars` and read `charCount`. Expect about one or two facts per answer at 100 characters.
