# Demo Runbook

How to start, reset and present the Personal Memory Vault with the `gen-ai-apps-hub` apps on this PC. The vault runs on `:3000`, the hub on `:3001`, and Postgres and the Qdrant index in Docker. OpenAI is the only hosted service, so the PC needs internet access.

## Once, before the day

- **Vault:** `.env.local` is filled in (see `.env.example`). The `OPENAI_API_KEY` must be valid.
- **Hub:** `../gen-ai-apps-hub/.env.local` has `VAULT_URL=http://localhost:3000`, `OPENAI_API_KEY` and `OPENAI_MODEL`. Its `VAULT_KEY_*` values are filled in live during the demo.
- **Jane's account:** with the vault running, sign up at `http://localhost:3000/sign-up` as `jane@example.com`. A fresh database (after `docker compose down -v`) needs this again.
- **Rehearse** the whole flow once, then [reset](#reset).

## Preflight (5 minutes before)

- Docker Desktop is running.
- Ports 3000, 3001, 5432 and 6333 are free. Close any old `bun dev` windows.

## Cold start

From `personal-memory-vault`:

```bash
docker compose up -d       # Postgres 17 and Qdrant
docker compose ps          # wait until postgres shows "healthy"
bun run db:migrate         # a no-op when the database is up to date
bun dev                    # http://localhost:3000
```

In a second terminal, from `gen-ai-apps-hub`:

```bash
bun dev                    # http://localhost:3001
```

Check that `curl http://localhost:3000/api/v1/health` returns `{"status":"ok","db":"ok"}`.

The Qdrant index persists in its Docker volume, so it doesn't need rebuilding after a restart. Run `bun run reindex` only after seeding.

## Reset

Starts the demo from a clean vault that holds Jane's memories and nothing else:

```bash
bun run seed:jane --reset  # deletes Jane's memories, apps and access log, keeps her account
bun run reindex            # rebuilds the search index (about 10 s)
```

- `--reset` deletes the apps too, with their keys, grants, sources and consent requests. Every `VAULT_KEY_*` in the hub stops working, which is expected: you register the apps again live.
- The seed adds about 60 of Jane's own memories, across all 16 topics and all 4 tiers. Among them are clearly sensitive ones: an asthma diagnosis and knee tendinitis (`protected`), credit-card and student-loan debt (`protected`), and tension with her partner Alex (`private`).

## Demo flow (about 10 minutes)

Use the hub's plan (`gen-ai-apps-hub/docs/hub-plan.md`, "Default apps") for which app writes and reads which topics.

1. **Overview** (`/dashboard`):
   - What the vault holds: the counts by topic, and the tier bar.
   - Memories are encrypted at rest. The labels drive every decision.
2. **Register the apps** (`/dashboard/apps` → **Register app**, once per hub app):
   - Copy each key; it's shown once. Paste it into the hub's `.env.local` as that app's `VAULT_KEY_*`.
   - Restart the hub (`Ctrl+C`, then `bun dev`).
   - Point out that a key only proves who the app is: it can't read or save anything yet.
3. **Grant** (`/dashboard/permissions`, pick an app):
   - Set **Read** and **Save** per topic, each with a tier cap.
   - Under **Reads data from**, switch on the sources it may read: Your entries, and the apps whose data it should see.
   - Point out: everything starts off; read and write are separate; a cap allows its tier and those below it.
4. **A hub app writes:** tell one app something (say, a bad night's sleep and a sore knee).
   - Its write receipt shows what was stored and what was withheld. For example, a health fact is withheld when the app may not save health.
   - The new memories appear on **Memories**, labelled with that app.
5. **Context from another app:** ask a second app something related.
   - Its "Context from vault" panel shows a projection of at most 100 characters, plus the categories and tiers it drew on. App names never appear.
   - It knows the fact without ever being told it.
   - Protected memories (the diagnosis, the debts) never appear under a `personal` cap.
6. **Untick a source:** on Permissions, switch the first app off under the second app's **Reads data from**. Ask again: that data is gone from the answer.
7. **Consent request:**
   - In an app that lacks a grant, its 403 offers **Request access**.
   - In the vault, the request waits at the top of **Permissions**, and on the Overview. Show **Deny** (nothing changes), or **Review**: narrow the topics, lower the tier, pick the sources for a read, then **Approve**.
   - The app's next request works within what was approved. Approving never lowers access an app already has.
8. **Access log** (`/dashboard/access-log`):
   - Every save, retract, context request and consent request, with its purpose or reason.
   - Expand a context request to see exactly which memories were disclosed.

## Fallback: the Playground

If the hub misbehaves, use `/dashboard/playground`. Pick an app and ask a question. It runs the same pipeline as `POST /api/v1/context` (logged as a Playground test), and shows the disclosed memories with their tier and source.

The other API calls work from a terminal with an app's key:

```bash
KEY=pmv_...   # from Register app

curl -X POST http://localhost:3000/api/v1/memories -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"Slept 5 hours and my knee was sore after the run.","provenance":"user_stated"}'

curl -X POST http://localhost:3000/api/v1/consent-requests -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation":"read","categories":["health"],"maxSensitivity":"personal","reason":"Plan workouts around injuries."}'

curl http://localhost:3000/api/v1/permissions -H "Authorization: Bearer $KEY"
```

## Troubleshooting

| Symptom                                         | Fix                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `502 processing_failed`                         | OpenAI hiccuped (seen during testing). Retry once.                                                       |
| `502 processing_failed` on every write and read | Qdrant isn't running. `docker compose up -d`, then check `curl http://127.0.0.1:6333/readyz`.            |
| `403 read_denied` although read grants are set  | No source is switched on under **Reads data from**.                                                      |
| `401 unauthorized` from the hub                 | The key was replaced, or the vault was reset. Paste the new key and restart the hub.                     |
| 500 "… is not a function" after pulling changes | A long-running `bun dev` kept stale modules. Restart it.                                                 |
| Postgres isn't healthy                          | Check Docker Desktop, then `docker compose restart`.                                                     |
| The Overview shows an empty vault               | You're signed in as a different account, or seeded another email. Seed with `bun run seed:jane [email]`. |
| "already has memories" from the seed            | Add `--reset`.                                                                                           |

## Shutting down

`Ctrl+C` both dev servers, then `docker compose stop`. The data persists. `docker compose down -v` deletes the database and the index, and then you need `bun run db:migrate`, the sign-up, the seed and `bun run reindex` again.
