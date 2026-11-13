# Phase 00 — Project Foundation

> **Status:** ✅ Done · **Depends on:** — · **Unlocks:** every phase

## Goal

Turn the create-next-app scaffold into the skeleton every later phase builds on. That means a validated environment, a logger, the shared error helpers for route handlers, a test runner and a health endpoint. No product features.

## Coupling boundary

- **Owns:** `src/lib/env.ts`, `src/instrumentation.ts`, `src/lib/logger.ts`, `src/lib/api-errors.ts`, `GET /api/v1/health`, the test setup (`test/setup.ts` + `bunfig.toml [test]`), `.env.example`, the package scripts.
- **Must not:** add a database, auth, or any visual design. Phase 01 owns the look; leave a plain placeholder home page.
- Create folders only when a file goes in them. The layout follows the **Conventions** table in [phase-index.md](phase-index.md).

## Decisions to make with the user (at phase start)

- **Validation:** zod 4 _(past)_ / valibot. Recommended: zod 4. It's used for env, Server Action input and route handler input.
- **Logger:**
  - winston _(past)_
  - pino
  - a thin `console` wrapper
  - Recommended: the thin wrapper now; swap later behind the same `logger` export.
- **Test runner:** `bun test` (built in) / Vitest. Recommended: `bun test`. Add Playwright only when a phase needs e2e.
- **Env var naming:** confirm `.env.local` for local secrets. `.env*` is already git-ignored; `.env.example` is committed via a `!.env.example` exception.

## Skills / plugins to look for

None expected. If zod is chosen, check whether zod publishes an official skill.

## In scope (MVP slice)

- `src/lib/env.ts`:
  - Parse `process.env` with a schema and export a typed `env`.
  - Fail fast with a readable message listing the missing or invalid vars.
  - Server-only.
- `src/instrumentation.ts`: `register()` imports `env`, so validation runs when the server starts, not on first use.
- `src/lib/logger.ts`: `logger.info/warn/error(message, meta?)`. **Never log memory content or secrets.**
- `src/lib/api-errors.ts`:
  - `ApiError` class `(status, code, message, details?)`.
  - `errorResponse(error: unknown): Response` maps `ApiError`, validation errors and unknown errors to `Response.json({ error: { code, message, details? } }, { status })`.
  - Unknown errors are logged and returned as a generic 500.
  - Next.js control-flow errors (`connection()` during prerender, `notFound()`, `redirect()`) are rethrown, never mapped.
- `src/app/api/v1/health/route.ts`: `GET` returns `{ status: "ok" }` at request time.
- Test setup (a preload that stubs `server-only`) with example tests (`errorResponse` mapping, env parsing).
- `package.json` scripts: `typecheck` (`tsc --noEmit`) and `test`.
- `.env.example` (empty for now; each phase appends its vars), with the `.gitignore` exception.
- Replace the boilerplate: a minimal placeholder `page.tsx`. Remove the unused `public/*.svg` files.
- `README.md`: Bun commands (`bun install`, `bun dev`, `bun test`, …) and a pointer to `docs/dev-phases/phase-index.md`.

## Out of scope → hardening backlog

- Pre-commit hooks, CI, request ids, structured log shipping (already seeded in the backlog).

## Contract provided

- `import { env } from "@/lib/env"` gives typed, validated env (server-only). It is validated once at server start. **Every later phase adds its vars to the schema and to `.env.example`.**
- `import { logger } from "@/lib/logger"`: `logger.info/warn/error(message, meta?)`. Pass ids, counts and outcomes, never memory content or secrets. `Error` values in `meta` are logged as `{ name, message, stack }` only.
- `import { ApiError, errorResponse } from "@/lib/api-errors"`. Every route handler wraps its body in `try { … } catch (e) { return errorResponse(e) }`. That is safe around Next.js APIs that throw for control flow, because `errorResponse` rethrows them.
  - `new ApiError(status, code, message, details?)`. Codes are snake_case strings (`unauthorized`, `forbidden`, `not_found`, …).
  - A thrown `ZodError` becomes `400 validation_error` with `details = z.flattenError(error)`. Handlers can `schema.parse(body)` and let it throw.
  - Anything else becomes a logged `500 internal_error` with the generic message `"Something went wrong"`.
- The error body shape `{ error: { code: string, message: string, details?: unknown } }`. `details` is omitted when absent.
- `GET /api/v1/health` returns `200 { status: "ok" }`. Phase 02 extends it with a DB check.
- `bun test` picks up `**/*.test.ts`. Test files are git-ignored: they stay local and are never committed. The tracked `test/setup.ts` preload stubs `server-only`, so server modules (DAL, `env`) can be imported in tests.

## Deliverables

`src/lib/env.ts` (+ test), `src/instrumentation.ts`, `src/lib/logger.ts`, `src/lib/api-errors.ts` (+ test), `src/app/api/v1/health/route.ts`, `test/setup.ts`, `.env.example`, updated `package.json` and `bunfig.toml`, `README.md`, `.gitignore`, a cleaned `src/app/page.tsx`.

## Acceptance criteria & verification

- [x] `bun dev` boots, and `GET /api/v1/health` returns 200 JSON (verify with the `next-devtools` MCP).
- [x] Removing a required env var stops startup with a clear message.
- [x] Throwing an `ApiError` in a handler returns the documented error body and status.
- [x] `bun run lint`, `bun run typecheck`, `bun test` and `bun run format:check` pass.

## Outcome & handoff notes

Done 2026-11-14.

**Built:**

- **Libraries:** zod 4.6.7, `server-only` and `@types/bun`.
- **Env:** `env` (seeded with `NODE_ENV` only; there are no secrets yet), validated at startup by `src/instrumentation.ts`.
- **Errors and logging:** the console-based `logger`, plus `ApiError` / `errorResponse`.
- **Health:** `GET /api/v1/health`.
- **Tests:** `bun test` with a `server-only` stub preload. There are 6 tests.
- **Scripts:** `typecheck` (`next typegen && tsc --noEmit`) and `test`.
- **Cleanup:** the placeholder home page, the `.env.example` + `.gitignore` exception, and the new README. The boilerplate `public/` SVGs were deleted, so `public/` no longer exists; recreate it when an asset needs it.

**Verified:**

- **Health:** `curl` returns `200 {"status":"ok"}`. The next-devtools MCP shows the routes `/` and `/api/v1/health` and no compilation issues.
- **Missing required env var, dev:** `bun dev` prints `Invalid environment variables: ✖ … → at <VAR>` at boot and exits with code 1.
- **Missing required env var, production:** `next start` logs the same message ("Failed to prepare server") and answers every request with a bare 500. The process stays alive, which is in the backlog.
- **Error body:** a temporary `ApiError(418, …)` in the health route returned the documented body.

**Gotchas for later phases:**

- **Health stays dynamic via `await connection()`.** With Cache Components, a GET handler that touches no runtime data is prerendered at build. During that prerender `connection()` rejects on purpose. `errorResponse` calls `unstable_rethrow` first, so this (and `notFound()`/`redirect()`) passes through the standard `try/catch`. Without it, every build logged a fake "Unhandled API error".
- **Invalid JSON is a 500 unless you catch it.** Validate route input with `schema.parse(...)` (a `ZodError` becomes a 400). `await request.json()` on a malformed body throws a `SyntaxError`, which would be a 500, so catch it and throw `ApiError(400, "invalid_json", …)` where bodies are parsed.
- **Env is validated only when imported.** `next build` doesn't run `register()`, so a build with missing env succeeds unless a prerendered module imports `env`.
- **`typecheck` regenerates route types** (`next typegen`), so it works on a fresh clone without running `bun dev` first.
- **Skills:** zod has no official agent skill (only third-party ones), so none was installed.
