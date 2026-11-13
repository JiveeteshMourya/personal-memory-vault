# Phase 10 — Semantic Memory Index

> **Status:** ⬜ Not started · **Depends on:** 04 (memories), 09 (embeddings) · **Unlocks:** 11, 12, 16

## Goal

Make memories searchable by meaning, within strict **per-user** boundaries and **category / sensitivity filters** that are applied inside the vector query itself.

## Coupling boundary

- **Owns:** `src/lib/pinecone.ts`, `src/data/memory-index.ts`, the index setup and backfill scripts, the semantic search box on the Memories page.
- **Only change to Phase 04 code:** add non-blocking `indexMemory` / `removeMemoryFromIndex` calls (via `after()`) to the memories DAL's create, update, delete and `insertMemory` paths.
- **Returns memory ids, not content.** Callers load and decrypt from Postgres.

## Decisions to make with the user (at phase start)

- **Pinecone index:** serverless, cloud and region, metric `cosine`, and the dimension from Phase 09 (or integrated inference).
- **Isolation:** one namespace per user (recommended).
- **Vector metadata (no content):** `category`, `sensitivityRank` (int), `sourceAppId`, `occurredAt` (epoch).
- **Sync mode:** inline `after()` (recommended for the MVP) / a background job.

## Skills / plugins to look for

- The **official Pinecone Claude Code plugin**, installed in project scope, or `pinecone-io/skills` via `bunx skills add … --copy`.
- Already installed: `vercel-react-best-practices` (for the search UI).

## In scope (MVP slice)

- `src/lib/pinecone.ts`: lazy client. `bun run index:setup` creates the index if it is missing.
- `src/data/memory-index.ts` (server-only):
  - `indexMemory({ id, userId, content, category, sensitivity, sourceAppId, occurredAt })`, which embeds the content and upserts the vector with metadata
  - `removeMemoryFromIndex(userId, id)`
  - `semanticSearch({ userId, query, scopes: [{ category, maxSensitivityRank }], topK })`, which returns `[{ memoryId, score }]`
  - `scopes` is turned into a Pinecone metadata filter (`$or` of category ∧ rank ≤ max), so **out-of-scope vectors are never retrieved**.
- `bun run index:backfill`: indexes every existing memory (e.g. after `seed:jane`).
- An owner-side semantic search box on `/dashboard/memories` (all scopes allowed for the owner).
- Env: `PINECONE_API_KEY`, `PINECONE_INDEX`.

## Out of scope → hardening backlog

- Embedding-inversion review, index/DB reconcile job (seeded). Hybrid search, re-indexing when the model changes.

## Contract provided

- `semanticSearch({ userId, query, scopes, topK })` returns `{ memoryId, score }[]`, with filters enforced in the query.
- `indexMemory`, `removeMemoryFromIndex`.
- Vector id equals the memory id. The namespace equals the user id.

## Deliverables

The Pinecone client and setup script, the index DAL, the hooks in the memories DAL, the backfill script, the owner search box, env vars.

## Acceptance criteria & verification

- [ ] After `seed:jane` + `index:backfill`, the search "how have I been sleeping" returns sleep memories first.
- [ ] A `scopes` limited to `activity` never returns diet or finance memories (check in a test or script).
- [ ] Creating, editing and deleting a memory in the UI is reflected in search results.
- [ ] No memory content is stored in Pinecone metadata.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
