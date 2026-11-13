# Phase 09 — AI Provider Layer

> **Status:** ⬜ Not started · **Depends on:** 00 · **Unlocks:** 10, 11, 13 · _Can be done any time after Phase 00._

## Goal

Route every AI call through one small module. It provides **typed structured generation** and **embeddings**, and the provider and model can be swapped through config.

## Coupling boundary

- **Owns:** `src/lib/ai/*`.
- **Must not:** read the database or make authorization decisions. Callers pass in data that is already authorized.

## Decisions to make with the user (at phase start)

- **LLM provider and model:** Anthropic Claude, OpenAI _(past)_, Groq _(past)_, Gemini, … Use the latest models of the chosen provider.
- **SDK:**
  - AI SDK v7 (`ai` + `@ai-sdk/<provider>`) _(past)_
  - the provider's own SDK
  - Recommended: AI SDK. It makes swapping providers easy.
- **Embeddings:**
  - OpenAI `text-embedding-3-small` (1536-d) _(past)_
  - Pinecone integrated inference (embedding happens inside Pinecone; affects Phase 10)
  - another provider
  - Decide here, and record the dimension.
- **Prompts:** TypeScript template functions in `src/lib/ai/prompts/` (recommended) / markdown files.

## Skills / plugins to look for

- The official Vercel **AI SDK** skill (from `vercel/vercel-plugin` / skills.sh), project scope.
- If the provider is Anthropic, the `claude-api` skill is already available.
- The chosen provider's official skill, if any.

## In scope (MVP slice)

- `src/lib/ai/ai-config.ts`: the model ids, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` and default temperatures, as documented constants.
- `src/lib/ai/generate-structured.ts`: `generateStructured<T>({ schema, system, prompt })` returns `Promise<T>`, validated against the schema.
- `src/lib/ai/embed.ts`: `embedTexts(texts: string[])` returns `Promise<number[][]>`, batched.
- `src/lib/ai/prompts/`: the folder and naming convention (no prompts yet; later phases add them).
- **Privacy rule (documented in the module header):** never log prompt or completion content. Only send data the caller has already authorized.
- `scripts/ai-smoke.ts`: one structured call and one embedding call.
- Env: provider API key(s), added to the env schema and `.env.example`.

## Out of scope → hardening backlog

- Retries and fallback provider, token and cost tracking (seeded). Streaming, caching, an eval harness.

## Contract provided

- `generateStructured`, `embedTexts`, `EMBEDDING_DIMENSIONS` (from `@/lib/ai/*`).
- Prompts live in `src/lib/ai/prompts/<name>.ts` and export a function that builds `{ system, prompt }`.

## Deliverables

The `src/lib/ai/*` modules, the smoke script, env vars, and the Decisions Log entries (provider, model, embedding model and dimension).

## Acceptance criteria & verification

- [ ] `bun scripts/ai-smoke.ts` prints a schema-valid object and vectors of length `EMBEDDING_DIMENSIONS`.
- [ ] A missing API key fails at env validation with a clear message.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
