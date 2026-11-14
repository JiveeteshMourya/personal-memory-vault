# Phase 02 — Database Foundation

> **Status:** ✅ Done · **Depends on:** 00 · **Unlocks:** 03, 04, 05 and every phase with tables

## Goal

Connect the app to Supabase PostgreSQL through an ORM, with a migration workflow, so that each feature phase can add and own its tables.

## Coupling boundary

- **Owns:** `src/lib/db.ts`, `drizzle.config.ts`, the schema barrel `src/db/schema/index.ts`, the migration scripts, `docker-compose.yml`, the DB health check (`src/data/health.ts`).
- **Must not:** create feature tables. Each feature phase adds its own schema file and migration.

## Decisions (made with the user, 2026-11-14)

- **ORM:** Drizzle ORM 0.45 + drizzle-kit 0.31. The alternatives were Prisma 7 + `@prisma/adapter-pg` _(past)_ and supabase-js.
- **Driver:** postgres.js 3.4, pinned to v3 because v4 shipped on 2026-10-29, after Drizzle 0.45. It is created with `prepare: false`, because Supabase's transaction pooler can't use prepared statements.
- **Dev database:** local Postgres in Docker via `docker-compose.yml`, image `postgres:17-alpine` (Supabase's platform default is Postgres 17), bound to `127.0.0.1:5432`. Hosted Supabase gets added later.
- **Connection strings:**
  - Local: `DATABASE_URL` and `DIRECT_URL` both point at the compose Postgres.
  - Hosted Supabase later: the pooler (transaction mode, port 6543) for the app, and the direct connection (5432) for migrations.
  - The app reads only `DATABASE_URL`; `DIRECT_URL` is read only by `drizzle.config.ts`.
- **Supabase MCP server:** in `.mcp.json` (project scope): remote HTTP with OAuth, `read_only=true`. Add `project_ref` once a hosted project exists.

## Skills / plugins

- `supabase-postgres-best-practices` from `supabase/agent-skills` (official), in `.claude/skills/`. Load it before any schema or query work.
- Drizzle has no official agent skill (only community ones), so none is installed.

## In scope (MVP slice)

- `docker-compose.yml` with the local Postgres service (named volume, healthcheck), plus `.env.local` values pointing at it.
- `src/lib/db.ts`: one lazily connecting client, safe across dev hot reloads. Server-only.
- `drizzle.config.ts`, the schema barrel `src/db/schema/index.ts`, SQL migrations in `drizzle/`, and the `package.json` scripts `db:generate`, `db:migrate` and `db:studio`.
- `DATABASE_URL` added to the env schema; `DATABASE_URL` and `DIRECT_URL` added to `.env.example`.
- Extend `GET /api/v1/health` to include `db: "ok" | "error"` via a trivial query.
- A short "How a phase adds a table" section in the handoff notes: where the schema goes, how to generate and apply a migration, and how a DAL module imports `db`.

## Out of scope → hardening backlog

- RLS, pooling and timeout tuning, backup drills (already seeded). UUIDv7 keys, a project-scoped Supabase MCP, and DB error redaction in logs (added by this phase).

## Contract provided

- `import { db } from "@/lib/db"` gives the Drizzle client (postgres.js driver). Import it **only** from `src/data/*` (the DAL) and scripts, never from components or route handlers directly.
- Tables live in `src/db/schema/<domain>.ts` and are re-exported from `src/db/schema/index.ts`. DAL modules import them from `@/db/schema`.
- Migrations: `bun run db:generate --name <change>` writes SQL to `drizzle/`, and `bun run db:migrate` applies it. The rule: **tables are created only through migrations owned by the feature phase** (never `drizzle-kit push`).
- IDs are UUIDs; timestamps are `timestamptz`; every user-owned table has a `user_id` column (FK to the auth user table once Phase 03 exists). Column names are explicit snake_case.
- `import { checkDatabase } from "@/data/health"`: `() => Promise<"ok" | "error">`. It never throws.
- `GET /api/v1/health` returns `200 { status: "ok", db: "ok" }`, or `503 { status: "error", db: "error" }` when the database is unreachable.

## Deliverables

`docker-compose.yml`, `src/lib/db.ts`, `drizzle.config.ts`, the schema barrel, migration scripts, `src/data/health.ts`, the updated health route, env vars, handoff notes.

## Acceptance criteria & verification

- [x] `docker compose up -d` starts Postgres, and a migration applies cleanly against it.
- [x] `GET /api/v1/health` reports `db: "ok"`, and reports `"error"` with a bad URL.
- [x] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

Done 2026-11-14.

**Built:**

- **Libraries:** `drizzle-orm` 0.45.4, `postgres` 3.4.9, `drizzle-kit` 0.31.11 (dev). Bun blocks esbuild's postinstall (it isn't trusted), but drizzle-kit runs fine on esbuild's prebuilt `@esbuild/win32-x64` package, so `trustedDependencies` is unchanged.
- **Local DB:** `docker-compose.yml` runs `postgres:17-alpine` with database `memory_vault` and user/password `postgres`/`postgres` (dev only). The port is bound to `127.0.0.1:5432`, with the named volume `postgres_data` and a `pg_isready` healthcheck.
- **Client:** `src/lib/db.ts` exports `db = drizzle({ client, schema })`.
  - The postgres.js client is created with `prepare: false` and connects lazily.
  - Outside production it is cached on `globalThis`, so dev reloads reuse one pool.
- **Schema and migrations:**
  - `drizzle.config.ts` reads `DIRECT_URL`. It loads `.env.local` itself with Node's `process.loadEnvFile`, because `bun run` doesn't pass `.env.local` on to drizzle-kit (which runs on Node).
  - `src/db/schema/index.ts` is the empty barrel.
  - `drizzle/0000_init.sql` is an intentionally empty baseline (a drizzle-kit `--custom` migration). It gives drizzle-kit a journal, so `bun run db:migrate` works on a fresh clone. Without it, drizzle-kit fails for lack of `meta/_journal.json`. Phase 03's first real migration will be `0001_…`.
  - `bunfig.toml` excludes `drizzle/` from `bun fmt`.
- **Env:** `DATABASE_URL` is validated as a `postgres://` or `postgresql://` URL. `test/setup.ts` supplies a placeholder so tests can import `env` without a database.
- **Health:** `src/data/health.ts` (`checkDatabase`) and the route return 200 or 503.
  - On failure it logs one `warn` with the driver error (Drizzle's `.cause`), not Drizzle's wrapper, whose message holds the SQL and params.
- **Logger:** `Error` values now also keep a string `code` (`ECONNREFUSED`, a Postgres SQLSTATE such as `28P01`). Before this, a refused connection logged an empty message. The Phase 00 contract is updated.
- **Tooling:** the `supabase-postgres-best-practices` skill, and the Supabase MCP in `.mcp.json`. The MCP is **not yet authenticated**; see the gotchas.
- **Tests:** 10 pass, including new ones for `checkDatabase` (ok, and error with the cause logged without the query) and the health route (200/503).

**Verified:**

- `docker compose up -d` brings the container up `healthy`.
- **Migration probe.** A throwaway `probe` table was created through `db:generate --name probe` and `db:migrate`:
  - The SQL used `uuid … DEFAULT gen_random_uuid()`, `timestamp with time zone` and the `user_id` index.
  - The table appeared in `\dt`, and the run was recorded in `drizzle.__drizzle_migrations`.
  - Then everything was reverted: the files, `drizzle/`, and the volume, via `docker compose down -v`. No table ships.
  - The empty `0000_init` baseline then applied on the fresh volume. Re-running `db:migrate` is a no-op, and `db:generate` reports "No schema changes".
- **Health in dev and `next start`:** `200 {"status":"ok","db":"ok"}`.
- **Health with a bad URL:** `503 {"status":"error","db":"error"}`.
  - With a wrong port, it logged `code ECONNREFUSED`.
  - With a wrong password, it logged `PostgresError` with `code 28P01`.
- **Hot reload:** after 5 edits that re-ran `src/lib/db.ts`, `pg_stat_activity` still showed 1 connection.
- **Scripts:** a script importing `@/lib/db` ran an insert and a `db.query` findMany under `bun --conditions=react-server`. Without the flag, `server-only` throws.
- **Checks:** the next-devtools MCP `get_compilation_issues` returned none. Lint, typecheck, tests, format and build pass; the build shows `/api/v1/health` as dynamic (ƒ).

### How a phase adds a table

1. **Load the skill.** Load `supabase-postgres-best-practices` first. Its rules are already reflected below: snake_case, `text` over `varchar`, `timestamptz`, an index on every FK, and enums as `text` + a check constraint.
2. **Create `src/db/schema/<domain>.ts`.** Use relative imports only, and import only `drizzle-orm`. Example:

   ```ts
   import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
   import { user } from "./auth"; // Phase 03's table

   export const memories = pgTable(
     "memories",
     {
       id: uuid("id").primaryKey().defaultRandom(),
       userId: text("user_id") // same type as the auth user id
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
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

3. **Re-export it.** Add `export * from "./<domain>";` to `src/db/schema/index.ts`. Without that line, both drizzle-kit and `db.query` ignore the table.
4. **Generate and apply the migration.** Run `docker compose up -d`, then `bun run db:generate --name <change>`. Review `drizzle/NNNN_<change>.sql`, then run `bun run db:migrate`. Commit the schema file, the SQL and `drizzle/meta/` together.
5. **Write the DAL module (`src/data/<domain>.ts`).** It starts with `import "server-only"`, `import { db } from "@/lib/db"` and `import { memories } from "@/db/schema"`. It filters every query by the owner's `userId` and returns DTOs, never rows.

**Gotchas for later phases:**

- **Restart `bun dev` after changing `DATABASE_URL`.** Next reloads `.env.local`, but the pool cached on `globalThis` keeps the old URL.
- **Scripts** (e.g. Phase 04's seed) that import `@/lib/db` or `@/lib/env` must run as `bun --conditions=react-server <file>`, or `server-only` throws. Bun loads `.env.local` for them itself.
- **drizzle-kit doesn't get env from `bun run`.** `drizzle.config.ts` loads `.env.local` itself. On CI or a deploy host, set `DIRECT_URL` in the real environment.
- **DB errors:**
  - Drizzle wraps every failed query in `DrizzleQueryError` (exported from `drizzle-orm`). Its message contains the SQL **and the params**, and the driver error is in `.cause`.
  - When logging, log `.cause` (as `checkDatabase` does).
  - `errorResponse`'s generic 500 path still logs the wrapper; that's in the backlog.
- **Never use `drizzle-kit push`.** There's deliberately no `db:push` script.
- **`db.query.<table>`** works for tables exported from the barrel. Relational `with:` queries also need `relations()` definitions in the schema files.
- **postgres.js returns `timestamptz` as a JS `Date`**.
- **Tests:** mock the DB with `mock.module("@/lib/db", () => ({ db: { … } }))` before a dynamic `await import()` of the module under test.
- **Supabase MCP:**
  - It needs a one-time OAuth sign-in: run `claude` in a regular terminal (not the IDE extension), then `/mcp` → supabase → Authenticate.
  - It is read-only and not yet scoped to a project. Append `&project_ref=<ref>` when the hosted project exists.
- **Hosted Supabase later:**
  - `DATABASE_URL` is the transaction pooler (port 6543); `prepare: false` is already set.
  - `DIRECT_URL` is the direct connection (port 5432). The direct host is IPv6-only unless you buy the IPv4 add-on; on an IPv4-only network, use the session pooler URL (pooler host, port 5432) instead.
