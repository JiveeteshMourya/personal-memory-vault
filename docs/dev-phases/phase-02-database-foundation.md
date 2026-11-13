# Phase 02 — Database Foundation

> **Status:** ⬜ Not started · **Depends on:** 00 · **Unlocks:** 03, 04, 05 and every phase with tables

## Goal

Connect the app to Supabase PostgreSQL through an ORM, with a migration workflow, so that each feature phase can add and own its tables.

## Coupling boundary

- **Owns:** `src/lib/db.ts`, the ORM config, migration scripts, the DB health check.
- **Must not:** create feature tables. Each feature phase adds its own schema and migration.

## Decisions to make with the user (at phase start)

- **ORM:**
  - Prisma 7 + `@prisma/adapter-pg` _(past)_
  - Drizzle ORM
  - supabase-js (no ORM)
  - Recommended: ask. Prisma is familiar; Drizzle is lighter and SQL-first.
- **Driver:** `pg` / `postgres` (postgres.js). The Next server runs on Node unless `bun --bun` is used, so keep the driver Node-compatible.
- **Dev database:** **decided (user, 2026-11-14):** local Postgres in Docker via `docker-compose.yml` at the repo root (currently an empty placeholder). Hosted Supabase gets added later. Pick a Postgres image that matches Supabase's major version.
- **Connection strings:**
  - Local: `DATABASE_URL` and `DIRECT_URL` both point at the compose Postgres.
  - Hosted Supabase later: the pooler (transaction mode, port 6543) for the app, and the direct connection (5432) for migrations.
- **Supabase MCP server:** optional, project scope only.

## Skills / plugins to look for

- `supabase/agent-skills` (official): `supabase-postgres-best-practices`.
- The official skills of the chosen ORM, if any.

## In scope (MVP slice)

- `docker-compose.yml` with the local Postgres service (named volume, healthcheck), plus `.env.local` values pointing at it.
- `src/lib/db.ts`: one lazily created client, safe across dev hot reloads. Server-only.
- Schema location and migration commands in `package.json` (e.g. `db:generate`, `db:migrate`, `db:studio`).
- Env vars `DATABASE_URL` and `DIRECT_URL`, added to the env schema and `.env.example`.
- Extend `GET /api/v1/health` to include `db: "ok" | "error"` via a trivial query.
- A short "How a phase adds a table" section in the handoff notes: where the schema goes, how to generate and apply a migration, and how a DAL module imports `db`.

## Out of scope → hardening backlog

- RLS, pooling and timeout tuning, backup drills (already seeded).

## Contract provided

- `import { db } from "@/lib/db"` gives the ORM client. Import it **only** from `src/data/*` (the DAL) and scripts, never from components or route handlers directly.
- Migration commands, plus the rule: **tables are created only through migrations owned by the feature phase.**
- IDs are UUIDs; timestamps are `timestamptz`; every user-owned table has a `user_id` column (FK to the auth user table once Phase 03 exists).

## Deliverables

`src/lib/db.ts`, ORM config and schema folder, migration scripts, updated health route, env vars, handoff notes.

## Acceptance criteria & verification

- [ ] `docker compose up -d` starts Postgres, and a migration applies cleanly against it.
- [ ] `GET /api/v1/health` reports `db: "ok"`, and reports `"error"` with a bad URL.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
