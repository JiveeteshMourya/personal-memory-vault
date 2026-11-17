# Phase 00 — Project Foundation

> **Status:** ✅ Done · **Depends on:** — · **Unlocks:** every phase

## Goal

Turn the create-next-app scaffold into the skeleton every later phase builds on. That means a validated environment, a logger, the shared error handling for `/api/v1` controllers, a test runner and a health endpoint. No product features.

## Coupling boundary

- **Owns:** `src/server/lib/env.ts`, `src/instrumentation.ts`, `src/server/lib/logger.ts`, `src/server/lib/api-error.ts`, `src/server/lib/api-response.ts`, `src/server/middlewares/error-handler.middleware.ts`, `GET /api/v1/health` (`src/server/controllers/health.controller.ts`), the test setup (`test/setup.ts` + `bunfig.toml [test]`), `.env.example`, the package scripts.
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

- `src/server/lib/env.ts`:
  - Parse `process.env` with a schema and export a typed `env`.
  - Fail fast with a readable message listing the missing or invalid vars.
  - Server-only.
- `src/instrumentation.ts`: `register()` imports `env`, so validation runs when the server starts, not on first use.
- `src/server/lib/logger.ts`: `logger.info/warn/error(message, meta?)`. **Never log memory content or secrets.**
- `src/server/lib/api-response.ts`: the `ApiResponse` class `(statusCode, data, message = "Success")`, a `Response` whose body is the envelope `{ statusCode, success: statusCode < 400, message, data }`. Controllers return it.
- `src/server/lib/api-error.ts`: the `ApiError` class `(statusCode, code, message = "Something went wrong", errors = [])` that services and middlewares throw. `errors` holds `{ path, message }` field errors.
- `src/server/middlewares/error-handler.middleware.ts`:
  - `errorResponse(error: unknown): Response` maps `ApiError`, validation errors (one `errors` entry per zod issue) and unknown errors to `{ statusCode, success: false, message, data: null, code, errors }`.
  - `withErrorHandler(controller)` wraps a controller so anything it throws goes through `errorResponse`.
  - Unknown errors are logged and returned as a generic 500.
  - Next.js control-flow errors (`connection()` during prerender, `notFound()`, `redirect()`) are rethrown, never mapped.
- `GET /api/v1/health`: `health.controller.ts` answers at request time, and `src/app/api/v1/health/route.ts` re-exports it.
- Test setup (a preload that stubs `server-only`) with example tests (`errorResponse` mapping, env parsing).
- `package.json` scripts: `typecheck` (`tsc --noEmit`) and `test`.
- `.env.example`, documenting every var the env schema reads, with the `.gitignore` exception.
- Replace the boilerplate: a minimal placeholder `page.tsx`. Remove the unused `public/*.svg` files.
- `README.md`: Bun commands (`bun install`, `bun dev`, `bun test`, …) and a pointer to `docs/dev-phases/phase-index.md`.

## Out of scope → hardening backlog

- Pre-commit hooks, CI, request ids, structured log shipping (already seeded in the backlog).

## Contract provided

- `import { env } from "@/server/lib/env"` gives typed, validated env (server-only). It is validated once at server start. **A new env var goes into the schema and into `.env.example`.**
- `import { logger } from "@/server/lib/logger"`: `logger.info/warn/error(message, meta?)`. Pass ids, counts and outcomes, never memory content or secrets. `Error` values in `meta` are logged as `{ name, message, code?, stack }` only. `code` is kept only when it's a string: a system code or Postgres SQLSTATE, never data.
- `import { ApiError } from "@/server/lib/api-error"`, `import { ApiResponse } from "@/server/lib/api-response"` and `import { withErrorHandler } from "@/server/middlewares/error-handler.middleware"`. Every controller is `export const getX = withErrorHandler(async request => …)`. That is safe around Next.js APIs that throw for control flow, because `errorResponse` rethrows them.
  - `new ApiResponse(statusCode, data, message?)` to answer; `new ApiError(statusCode, code, message, errors?)` to fail. Codes are snake_case strings (`unauthorized`, `forbidden`, `not_found`, …).
  - A thrown `ZodError` becomes `400 validation_error` with `details = z.treeifyError(error)`, a tree because request bodies nest. Controllers can `schema.parse(body)` and let it throw.
  - Anything else becomes a logged `500 internal_error` with the generic message `"Something went wrong"`.
- The response envelope `{ statusCode, success, message, data }`, and the error body `{ statusCode, success: false, message, data: null, code, errors }`. `errors` is `[]` when there are none.
- `GET /api/v1/health` answers at request time. With Phase 02's database check it returns `200 { status: "ok", db: "ok" }`, or `503` when the database is unreachable.
- `bun test` picks up `**/*.test.ts`. Test files are git-ignored: they stay local and are never committed. The tracked `test/setup.ts` preload stubs `server-only`, so server modules (services, repositories, `env`) can be imported in tests.

## Deliverables

`src/server/lib/env.ts` (+ test), `src/instrumentation.ts`, `src/server/lib/logger.ts`, `src/server/lib/api-error.ts`, `src/server/middlewares/error-handler.middleware.ts` (+ test), `src/server/controllers/health.controller.ts` and its `route.ts`, `test/setup.ts`, `.env.example`, updated `package.json` and `bunfig.toml`, `README.md`, `.gitignore`, a cleaned `src/app/page.tsx`.

## Acceptance criteria & verification

- [x] `bun dev` boots, and `GET /api/v1/health` returns 200 JSON (verify with the `next-devtools` MCP).
- [x] Removing a required env var stops startup with a clear message.
- [x] Throwing an `ApiError` in a handler returns the documented error body and status.
- [x] `bun run lint`, `bun run typecheck`, `bun test` and `bun run format:check` pass.

## Outcome & handoff notes

Done 2026-11-14.

**Built:**

- **Libraries:** zod 4.6.7, `server-only` and `@types/bun`.
- **Env:** the `env` schema, validated at startup by `src/instrumentation.ts`.
- **Errors and logging:** the console-based `logger`, `ApiError`, and `errorResponse` / `withErrorHandler`.
- **Health:** `GET /api/v1/health`.
- **Tests:** `bun test` with a `server-only` stub preload.
- **Scripts:** `typecheck` (`next typegen && tsc --noEmit`) and `test`.
- **Cleanup:** the placeholder home page, the `.env.example` + `.gitignore` exception, and the README. There is no `public/` folder: create it when an asset needs one.

**Verified:**

- **Health:** `curl` returns `200 {"status":"ok"}`. The next-devtools MCP shows the routes `/` and `/api/v1/health` and no compilation issues.
- **Missing required env var, dev:** `bun dev` prints `Invalid environment variables: ✖ … → at <VAR>` at boot and exits with code 1.
- **Missing required env var, production:** `next start` logs the same message ("Failed to prepare server") and answers every request with a bare 500. The process stays alive, which is in the backlog.
- **Error body:** a temporary `ApiError(418, …)` in the health route returned the documented body.

**Gotchas for later phases:**

- **Health stays dynamic via `await connection()`.** With Cache Components, a GET handler that touches no runtime data is prerendered at build. During that prerender `connection()` rejects on purpose. `errorResponse` calls `unstable_rethrow` first, so this (and `notFound()`/`redirect()`) passes through `withErrorHandler` instead of being logged as an "Unhandled API error".
- **Read bodies with `validateBody` (Phase 06).** It turns malformed JSON into a 400 `validation_error`. A bare `await request.json()` throws a `SyntaxError`, which would answer 500.
- **Env is validated only when imported.** `next build` doesn't run `register()`, so a build with missing env succeeds unless a prerendered module imports `env`.
- **`typecheck` regenerates route types** (`next typegen`), so it works on a fresh clone without running `bun dev` first.
- **Skills:** zod has no official agent skill (only third-party ones), so none was installed.
