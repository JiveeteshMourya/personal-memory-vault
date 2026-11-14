# Personal Memory Vault

A privacy-preserving AI memory engine. Connected AI apps write memories to the vault and request
context from it; the vault shares only what the user has authorized, for the stated purpose. See
[docs/main-project-objective.md](docs/main-project-objective.md).

## Prerequisites

- [Bun](https://bun.sh) 1.4
- [Docker](https://www.docker.com/) (for the local Postgres)

## Setup

```bash
bun install
docker compose up -d         # local Postgres 17 on localhost:5432
cp .env.example .env.local   # then fill in the values (the DB URLs already match compose)
bun run db:migrate           # apply the migrations
bun dev                      # http://localhost:3000
```

## Commands

| Command                | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `bun dev`              | Start the dev server (Turbopack)                             |
| `bun run build`        | Production build                                             |
| `bun start`            | Serve the production build                                   |
| `bun test`             | Run the local tests (`*.test.ts`, git-ignored)               |
| `bun run lint`         | ESLint                                                       |
| `bun run typecheck`    | Generate Next.js route types, then `tsc --noEmit`            |
| `bun run format`       | Format with `bun fmt` (settings in `bunfig.toml`)            |
| `bun run format:check` | Check formatting without writing                             |
| `bun run db:generate`  | Generate a SQL migration from the schema (`--name <change>`) |
| `bun run db:migrate`   | Apply pending migrations (uses `DIRECT_URL`)                 |
| `bun run db:studio`    | Browse the database in Drizzle Studio                        |

Health check: `GET /api/v1/health` returns `200 { "status": "ok", "db": "ok" }`, or `503` with
`"error"` when the database is unreachable.

## Working on the project

- Start with [docs/dev-phases/phase-index.md](docs/dev-phases/phase-index.md): the build is split
  into phases, with a session protocol, conventions and a Decisions Log.
- Agent and contributor rules are in [AGENTS.md](AGENTS.md).
