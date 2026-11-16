# Phase 02 — Database Foundation

> **Status:** ✅ Done · **Depends on:** 00 · **Unlocks:** 03, 04, 05 and every phase with tables

## Goal

Connect the app to PostgreSQL, run locally in Docker, through an ORM, with a migration workflow, so that each feature phase can add and own its tables.

## Coupling boundary

- **Owns:** `src/server/lib/db.ts`, `drizzle.config.ts`, the models barrel `src/server/models/index.ts`, the migration scripts, `docker-compose.yml`, the DB health check (`src/server/services/health.service.ts`).
- **Must not:** create feature tables. Each feature phase adds its own model file, applied through a generated migration.

## Decisions (made with the user, 2026-11-14)

- **ORM:** Drizzle ORM 0.45 + drizzle-kit 0.31. The alternative was Prisma 7 + `@prisma/adapter-pg` _(past)_.
- **Driver:** postgres.js 3.4, pinned to v3 because v4 shipped on 2026-10-29, after Drizzle 0.45.
- **Database:** Postgres in Docker via `docker-compose.yml`, image `postgres:17-alpine`, bound to `127.0.0.1:5432`. Everything runs locally; nothing is hosted.
- **Connection string:** `DATABASE_URL` points at the compose Postgres. The app and `drizzle.config.ts` both read it.

## Skills / plugins

- `supabase-postgres-best-practices` from `supabase/agent-skills` (official), for schema and query work. It isn't installed now: re-add it under the index's Agent tooling rules before the next schema change.
- Drizzle has no official agent skill (only community ones), so none is installed.

## In scope (MVP slice)

- `docker-compose.yml` with the local Postgres service (named volume, healthcheck), plus `.env.local` values pointing at it.
- `src/server/lib/db.ts`: one lazily connecting client, safe across dev hot reloads. Server-only.
- `drizzle.config.ts`, the schema barrel `src/server/models/index.ts`, SQL migrations in `drizzle/`, and the `package.json` scripts `db:generate`, `db:migrate` and `db:studio`.
- `DATABASE_URL` in the env schema and `.env.example`.
- Extend `GET /api/v1/health` to include `db: "ok" | "error"` via a trivial query.
- A short "How a phase adds a table" section in the handoff notes: where the model goes, how to generate and apply a migration, and how its repository and service use it.

## Out of scope → hardening backlog

- RLS, pooling and timeout tuning, backup drills (already seeded). UUIDv7 keys and DB error redaction in logs (added by this phase).

## Contract provided

- `import { db } from "@/server/lib/db"` gives the Drizzle client (postgres.js driver). Import it **only** from repositories (`src/server/repository/*`) and scripts, never from services, controllers or components.
- Tables live in `src/server/models/<entity>.model.ts` and are re-exported from `src/server/models/index.ts`. Repositories import them from `@/server/models`.
- Migrations: `bun run db:generate --name <change>` writes SQL to `drizzle/`, and `bun run db:migrate` applies it. The rule: **tables change only through generated migrations** (never `drizzle-kit push`). `drizzle/0000_init.sql` is the baseline that creates every table; each schema change adds the next migration on top.
- IDs are UUIDs; timestamps are `timestamptz`; every user-owned table has a `user_id uuid` column, an FK to Phase 03's `users.id`. Column names are explicit snake_case.
- `import { checkDatabase } from "@/server/services/health.service"`: `() => Promise<"ok" | "error">`. It never throws.
- `GET /api/v1/health` returns `200 { status: "ok", db: "ok" }`, or `503 { status: "error", db: "error" }` when the database is unreachable.

## Deliverables

`docker-compose.yml`, `src/server/lib/db.ts`, `drizzle.config.ts`, the models barrel, migration scripts, `src/server/services/health.service.ts` and `src/server/repository/health.repository.ts`, the health controller's database check, env vars, handoff notes.

## Acceptance criteria & verification

- [x] `docker compose up -d` starts Postgres, and a migration applies cleanly against it.
- [x] `GET /api/v1/health` reports `db: "ok"`, and reports `"error"` with a bad URL.
- [x] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

Done 2026-11-14.

**Built:**

- **Libraries:** `drizzle-orm` 0.45.4, `postgres` 3.4.9, `drizzle-kit` 0.31.11 (dev). Bun blocks esbuild's postinstall (it isn't trusted), but drizzle-kit runs fine on esbuild's prebuilt `@esbuild/win32-x64` package, so `trustedDependencies` is unchanged.
- **Local DB:** `docker-compose.yml` runs `postgres:17-alpine` with database `memory_vault` and user/password `postgres`/`postgres` (dev only). The port is bound to `127.0.0.1:5432`, with the named volume `postgres_data` and a `pg_isready` healthcheck.
- **Client:** `src/server/lib/db.ts` exports `db = drizzle({ client, schema })`.
  - The postgres.js client connects lazily.
  - Outside production it is cached on `globalThis`, so dev reloads reuse one pool.
- **Schema and migrations:**
  - `drizzle.config.ts` reads `DATABASE_URL`. It loads `.env.local` itself with Node's `process.loadEnvFile`, because `bun run` doesn't pass `.env.local` on to drizzle-kit (which runs on Node).
  - `src/server/models/index.ts` is the barrel every model is re-exported from.
  - `drizzle/` holds the generated migrations, with `meta/` (snapshots and the journal) beside them. `0000_init.sql` is the baseline that creates every table.
  - `bunfig.toml` excludes `drizzle/` from `bun fmt`.
- **Env:** `DATABASE_URL` is validated as a `postgres://` or `postgresql://` URL. `test/setup.ts` supplies a placeholder so tests can import `env` without a database.
- **Health:** `checkDatabase` (`src/server/services/health.service.ts`) pings through `health.repository.ts`, and the health controller answers 200 or 503.
  - On failure it logs one `warn` with the driver error (Drizzle's `.cause`), not Drizzle's wrapper, whose message holds the SQL and params.
- **Logger:** `Error` values keep a string `code` (`ECONNREFUSED`, a Postgres SQLSTATE such as `28P01`), so a refused connection logs a useful line.
- **Tooling:** the `supabase-postgres-best-practices` skill, for the schema phases (pruned in Phase 09).
- **Tests:** 10 pass, including ones for `checkDatabase` (ok, and error with the cause logged without the query) and the health controller (200/503).

**Verified:**

- `docker compose up -d` brings the container up `healthy`.
- **Migration probe.** A throwaway `probe` table was created through `db:generate --name probe` and `db:migrate`:
  - The SQL used `uuid … DEFAULT gen_random_uuid()`, `timestamp with time zone` and the `user_id` index.
  - The table appeared in `\dt`, and the run was recorded in `drizzle.__drizzle_migrations`.
  - Then everything was reverted: the files, `drizzle/`, and the volume, via `docker compose down -v`. No table ships.
  - Re-running `db:migrate` is a no-op, and `db:generate` reports "No schema changes".
- **Health in dev and `next start`:** `200 {"status":"ok","db":"ok"}`.
- **Health with a bad URL:** `503 {"status":"error","db":"error"}`.
  - With a wrong port, it logged `code ECONNREFUSED`.
  - With a wrong password, it logged `PostgresError` with `code 28P01`.
- **Hot reload:** after 5 edits that re-ran `src/server/lib/db.ts`, `pg_stat_activity` still showed 1 connection.
- **Scripts:** a script importing `@/server/lib/db` ran an insert and a `db.query` findMany under `bun --conditions=react-server`. Without the flag, `server-only` throws.
- **Checks:** the next-devtools MCP `get_compilation_issues` returned none. Lint, typecheck, tests, format and build pass; the build shows `/api/v1/health` as dynamic (ƒ).

### How a phase adds a table

1. **Load the skill.** Re-add and load `supabase-postgres-best-practices` first. Its rules are already reflected below: snake_case, `text` over `varchar`, `timestamptz`, an index on every FK, and enums as `text` + a check constraint (the value list lives in `src/shared/constants/`).
2. **Create `src/server/models/<entity>.model.ts`.** Use relative imports only (drizzle-kit loads models outside Next.js). Example:

   ```ts
   import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
   import { users } from "./auth.model"; // Phase 03's table

   export const memories = pgTable(
     "memories",
     {
       id: uuid("id").primaryKey().defaultRandom(),
       userId: uuid("user_id") // users.id is a uuid
         .notNull()
         .references(() => users.id, { onDelete: "cascade" }),
       // …feature columns…
       createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
       updatedAt: timestamp("updated_at", { withTimezone: true })
         .notNull()
         .defaultNow()
         .$onUpdate(() => new Date()),
     },
     t => [index("memories_user_id_idx").on(t.userId)] // Postgres doesn't index FKs on its own
   );
   ```

3. **Re-export it.** Add `export * from "./<entity>.model";` to `src/server/models/index.ts`. Without that line, both drizzle-kit and `db.query` ignore the table.
4. **Generate and apply the migration.** Run `docker compose up -d`, then `bun run db:generate --name <change>`. Review `drizzle/NNNN_<change>.sql`, then run `bun run db:migrate`. Commit the model, the SQL and `drizzle/meta/` together.
5. **Write the repository (`src/server/repository/<entity>.repository.ts`).** It starts with `import "server-only"`, `import { db } from "@/server/lib/db"` and the table from `@/server/models`. Each function takes the owner's `userId`, filters every query by it, encrypts on write, and maps rows to DTOs (`src/shared/types/<entity>.types.ts`). It never reads the session.
6. **Write the service (`src/server/services/<entity>.service.ts`).** Owner-facing functions take `userId` first, and their callers (Server Actions and content components) get it from `requireUser()` (Phase 03). App-facing functions take the `AppIdentity` from `requireApp()` (Phase 06). Only services import repositories; ESLint enforces it.

**Gotchas for later phases:**

- **Restart `bun dev` after changing `DATABASE_URL`.** Next reloads `.env.local`, but the pool cached on `globalThis` keeps the old URL.
- **Scripts** (e.g. Phase 04's seed) that import `@/server/lib/db` or `@/server/lib/env` must run as `bun --conditions=react-server <file>`, or `server-only` throws. Bun loads `.env.local` for them itself.
- **drizzle-kit doesn't get env from `bun run`.** `drizzle.config.ts` loads `.env.local` itself. Without the file, set `DATABASE_URL` in the real environment.
- **DB errors:**
  - Drizzle wraps every failed query in `DrizzleQueryError` (exported from `drizzle-orm`). Its message contains the SQL **and the params**, and the driver error is in `.cause`.
  - When logging, log `.cause` (as `checkDatabase` does).
  - `errorResponse`'s generic 500 path logs the wrapper; that's in the backlog.
- **Never use `drizzle-kit push`.** There's deliberately no `db:push` script.
- **`db.query.<table>`** works for tables exported from the barrel. Relational `with:` queries also need `relations()` definitions in the model files.
- **postgres.js returns `timestamptz` as a JS `Date`**.
- **Tests:** mock the DB with `mock.module("@/server/lib/db", () => ({ db: { … } }))` before a dynamic `await import()` of the module under test.
