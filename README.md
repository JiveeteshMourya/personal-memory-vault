# Personal Memory Vault

A privacy-preserving AI memory engine. Connected AI apps write memories to the vault and request
context from it; the vault shares only what the user has authorized, for the stated purpose. See
[docs/main-project-objective.md](docs/main-project-objective.md).

## Prerequisites

- [Bun](https://bun.sh) 1.4
- [Docker](https://www.docker.com/) (for the local Postgres and the Qdrant semantic index)
- An [OpenAI](https://platform.openai.com) API key

## Setup

```bash
bun install
docker compose up -d         # Postgres 17 on localhost:5432, Qdrant on localhost:6333
cp .env.example .env.local   # then fill in the values (the DB URLs already match compose)
bun run db:migrate           # apply the migrations
bun dev                      # http://localhost:3000
```

## Commands

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `bun dev`              | Start the dev server (Turbopack)                                    |
| `bun run build`        | Production build                                                    |
| `bun start`            | Serve the production build                                          |
| `bun run test`         | Run the local tests, each file isolated (`*.test.ts`, git-ignored)  |
| `bun run lint`         | ESLint                                                              |
| `bun run typecheck`    | Generate Next.js route types, then `tsc --noEmit`                   |
| `bun run format`       | Format with `bun fmt` (settings in `bunfig.toml`)                   |
| `bun run format:check` | Check formatting without writing                                    |
| `bun run db:generate`  | Generate a SQL migration from the schema (`--name <change>`)        |
| `bun run db:migrate`   | Apply pending migrations (uses `DIRECT_URL`)                        |
| `bun run db:studio`    | Browse the database in Drizzle Studio                               |
| `bun run seed:jane`    | Seed ~60 demo memories (`[email] [--reset]`; `--reset` wipes first) |
| `bun run reindex`      | Rebuild the semantic index from Postgres (after seeding)            |

Health check: `GET /api/v1/health` returns `200 { "status": "ok", "db": "ok" }`, or `503` with
`"error"` when the database is unreachable.

## Running the demo

[docs/demo-runbook.md](docs/demo-runbook.md) covers the cold start, the reset, the demo flow with
the `gen-ai-apps-hub` apps, the Playground fallback and troubleshooting.

## Working on the project

- Start with [docs/dev-phases/phase-index.md](docs/dev-phases/phase-index.md): the build is split
  into phases, with a session protocol, conventions and a Decisions Log.
- Agent and contributor rules are in [AGENTS.md](AGENTS.md).
