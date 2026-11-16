# Hardening Backlog

Phases are built agile: the simplest working slice, with no known bugs. This file collects what was **deliberately deferred**: edge cases, defense-in-depth, scale and polish. The user works through it later.

**Format:** `- [ ] [Pxx] item — risk if left — suggested fix`

Each phase appends its items under its own heading, and checks items off (`[x]`) when they're resolved. The seed items below were identified during planning. Phases add to them as they discover more.

## Cross-cutting

- [ ] [ALL] No CI pipeline — regressions slip in unnoticed — GitHub Actions running lint, typecheck and format:check on every PR (test files are git-ignored, so tests run locally only).
- [ ] [ALL] No security headers or CSP — XSS and clickjacking surface — add headers in `next.config.ts` (see `content-security-policy.md` in the bundled docs).
- [ ] [ALL] No rate limiting on `/api/v1/*` or the auth routes — brute force, scraping and cost abuse — per-key and per-IP limits (e.g. Upstash or Postgres token bucket).
- [ ] [ALL] Dependency vulnerability checks — vulnerable transitive deps — `bun audit` (or equivalent) in CI, plus Renovate/Dependabot.
- [ ] [ALL] Structured logging and request ids — hard to trace incidents — request-id propagation and JSON logs.

## P00 — Project Foundation

- [ ] [P00] No pre-commit hooks — unformatted or broken commits — lefthook/husky running format and lint on staged files.
- [ ] [P00] Unhandled-error logs include the error `message` and `stack` — a third-party error message (e.g. a DB error quoting a value) could echo user data into logs — redact messages from known sources or log only `name` plus a fingerprint for them.
- [ ] [P00] With invalid env, a self-hosted `next start` logs the error but keeps the process alive, answering 500 — a process supervisor won't restart or alert — if it's ever deployed, rely on the `/api/v1/health` check, or `process.exit(1)` from `register()` on the Node runtime.
- [x] [P00] `validation_error` details use `z.flattenError`, which only reports top-level fields — nested request bodies get vague errors — switch to `z.treeifyError` when an endpoint takes nested input. Resolved in P06.

## P01 — UI Shell & Design System

- [ ] [P01] No full accessibility audit — excludes keyboard and screen-reader users — run a WCAG 2.1 AA audit (keyboard, screen reader, contrast) on every page.
- [ ] [P01] Motion and visual polish — the UI feels unfinished — add a pass after the core features land.
- [ ] [P01] The Atkinson fonts have no size-matched fallback (next/font has no metrics for them) — a small layout shift while the web font loads — self-host with `next/font/local` and hand-tuned `size-adjust`/`ascent-override` on the fallback.
- [ ] [P01] `theme-color` follows the OS scheme, not the in-app theme choice — browser chrome can mismatch the page after a manual switch — update the meta tag in `setTheme`.
- [ ] [P01] The sticky dashboard header can cover a focused element when tabbing back up a long page — keyboard users lose the focus ring — set `scroll-padding-top` on `html` to the header height once pages get long.
- [ ] [P01] The vault lens tab isn't reflected in the URL — a specific app's view can't be deep-linked — sync it to a search param if the landing page ever needs it.

## P02 — Database Foundation

- [ ] [P02] No Supabase Row Level Security — if DB credentials leak, all rows are exposed — enable RLS with deny-all for the anon and authenticated roles, since the app uses a server-side role.
- [ ] [P02] Connection pooling and timeouts untuned — connection exhaustion under load; with postgres.js's default 30s `connect_timeout`, the health check hangs about 30s when the DB host is unreachable (not refused) — tune the pooler mode, pool size, `connect_timeout` and statement timeouts.
- [ ] [P02] No backup/restore drill — data loss — document and test Supabase backups.
- [ ] [P02] Drizzle's `DrizzleQueryError` message embeds the SQL and its params, and `errorResponse`'s generic 500 path logs that message — row values (ids, ciphertext, metadata) can land in logs — in `errorResponse`, log a `DrizzleQueryError`'s `.cause` (name + SQLSTATE `code`) instead of the wrapper. Relates to the P00 item on third-party error messages.
- [ ] [P02] Primary keys use random UUIDv4 (`gen_random_uuid()`) — index fragmentation on large tables (the Supabase skill's `schema-primary-keys` rule) — switch to time-ordered UUIDv7 (native `uuidv7()` on Postgres 18, or generated in the app) if a table grows large.

## P03 — User Authentication

- [ ] [P03] No email verification or password reset — account takeover and lockouts — enable Better Auth email flows with a mail provider.
- [ ] [P03] No 2FA — weak protection for the most sensitive data a user has — Better Auth two-factor plugin.
- [ ] [P03] No login lockout or throttling. Better Auth's built-in rate limiter only covers direct `/api/auth/*` HTTP calls; the app's Server Actions call `auth.api` server-side, which it skips — credential stuffing — throttle per IP and per email in the sign-in/sign-up actions (or route the forms through the HTTP endpoints), plus lockout.
- [ ] [P03] Sign-up says "An account with this email already exists" — anyone can check whether an email has a vault (enumeration) — once email verification exists, answer sign-up the same way either way and send the "you already have an account" notice by email.
- [ ] [P03] No return to the page you came from: the proxy and `requireUser` always send you to `/sign-in`, and sign-in always lands on `/dashboard` — a deep link (e.g. a consent request from P09) loses its target — pass a validated same-origin `next` path through the redirect and the sign-in action.
- [ ] [P03] A stale or revoked session cookie isn't cleared until the next sign-in or sign-out (RSCs can't set cookies) — harmless, since every request rechecks the session, but the proxy keeps letting that browser through to a redirect — clear it in a Route Handler or Server Action when `requireUser` finds no session.
- [ ] [P03] `sessions` stores each sign-in's IP address and user agent (Better Auth defaults) — more personal data at rest than the MVP uses — keep it for a future "active sessions" view, or turn off with `advanced.ipAddress.disableIpTracking`.
- [ ] [P03] Session cookies get the `Secure` flag only when `BETTER_AUTH_URL` is https — a misconfigured production URL would send the cookie over plain HTTP — set `advanced.useSecureCookies: true` in production (if deployed) and check `BETTER_AUTH_URL` there.

## P04 — Memory Store

- [ ] [P04] One app-wide encryption key — a single key leak exposes every user — per-user data keys (envelope encryption).
- [ ] [P04] No key rotation — a compromised key can't be retired — key-version prefix already exists; add a re-encrypt job.
- [ ] [P04] Key lives in an env var — weak key custody — move it to a KMS or secrets manager.
- [ ] [P04] Hard delete only — accidental loss — soft delete with a short restore window.
- [ ] [P04] Ciphertext isn't bound to its row (no AAD) — someone with database write access could swap encrypted content between rows or owners undetected — pass the owner and memory ids as GCM additional authenticated data (changes the `encryptField` contract).
- [ ] [P04] Offset pagination — deep pages scan every skipped row, and inserts or deletes shift items between pages — keyset pagination on `(occurred_at, id)` (skill rule `data-pagination`).
- [x] [P04] Seeded memories are all owner-sourced — the demo can't show app provenance — resolved by design: the hub apps write live during the demo (Phase 09 runbook).
- [ ] [P04] Dates render in UTC on the server and switch to local time on hydration — a brief flicker; without JS they stay UTC — keep a timezone preference (cookie) and format on the server.
- [ ] [P04] Owner-entered memories are capped at 2,000 characters — a long note typed in the dashboard is rejected (apps aren't affected: Phase 07's free-text endpoint splits up to 8,000 characters into atomic memories) — add an "extract from text" option for the owner, using Phase 07's extraction.

## P05 — Connected Apps & API Keys

- [ ] [P05] No key rotation grace period — rotating a key breaks the app immediately — overlap window with two active keys.
- [ ] [P05] Keys never expire — long-lived credential risk — optional expiry plus reminders.
- [ ] [P05] `last_used_at` is written on every authenticated request — a busy app turns every read into a write — only update when the stored value is older than a minute (`where last_used_at < now() - interval '1 minute'`).
- [ ] [P05] One key belongs to one vault owner — an external app serving many people can't connect each person's vault — an OAuth-style "connect your vault" flow that issues a per-user key or token.
- [ ] [P05] Apps are hard-deleted — only the `app_name` snapshot in audit events (P06) remembers the app, and its memories become unshareable orphans — soft-delete apps (`deleted_at`, keys revoked) and hide them from the list.
- [ ] [P05] Apps can't be renamed or have their description edited — a typo means delete and re-register, which changes the app id — an edit dialog backed by `updateApp`.
- [ ] [P05] Keys aren't bound to a calling origin or IP — a leaked key works from anywhere — optional allowed-IP list per app, or request signing.

## P06 — Taxonomy, Permissions, Gateway & Audit

- [ ] [P06] Grants aren't bound to a purpose (purpose is only logged) — an app can reuse access for any stated purpose — purpose-bound grants.
- [ ] [P06] No grant history (revoking deletes the row) — can't answer "who had access when" — append-only grant change log.
- [ ] [P06] Audit log is not tamper-evident — a DB-level attacker can rewrite history — hash-chain the events.
- [ ] [P06] No alerting on unusual denials or access spikes — silent abuse — threshold alerts surfaced in the dashboard.
- [ ] [P06] `access_events` has no retention — the log grows forever and keeps encrypted queries indefinitely — a retention window (e.g. 90 days) with a scheduled purge.
- [ ] [P06] Permission changes save instantly with no undo — a misclick grants access at once — an undo action in the toast, or a review-and-save step for widening changes.

## P07 — AI Ingest, Retract & Semantic Index

- [ ] [P07] No per-app quotas (only body-size limits) — storage and AI-cost abuse — per-app daily write quota.
- [ ] [P07] No retries or fallback provider — an OpenAI outage fails writes with 502 — retry with backoff, plus an optional fallback model.
- [ ] [P07] No token and cost tracking — surprise bills — log usage per call (without content).
- [x] [P07] Pinecone Local is in-memory — vectors vanish on every container restart until `bun run reindex` — a persistent vector store (Pinecone cloud or pgvector), or reindex automatically on startup when the index is empty. Resolved in P07: Pinecone Local reached end-of-life (2026-10-07), so the vault uses Pinecone serverless (free Starter plan), which persists.
- [ ] [P07] Embeddings are derived from sensitive plaintext — embedding-inversion risk if the index leaks — review the threat; consider per-tier indexes or keeping `protected` memories out of the vector index.
- [ ] [P07] The index can drift from Postgres if a sync call fails — stale or missing results — periodic reconcile job.
- [ ] [P07] Prompt-injection hardening is prompt-only — app-supplied text could steer extraction or classification — input delimiting, a sensitivity floor for suspicious input, and an output check.
- [ ] [P07] No relationship graph between memories — weaker synthesis — relationship extraction step.
- [ ] [P07] `session_id` and `external_id` are stored in plaintext — app-chosen ids could carry personal data — store HMACs instead.
- [ ] [P07] Duplicate detection checks for an existing `externalId` before extraction — two concurrent requests with the same `externalId` can both store — record the `externalId` up front in a small unique `(app_id, external_id)` table, or take an advisory lock per id.
- [ ] [P07] An input whose memories were all withheld leaves no row with its `externalId` — re-sending it runs extraction again (and is withheld again) — remember processed `externalId`s separately from memories.
- [ ] [P07] Redaction of credentials and card, account or ID numbers is prompt-only — a missed number gets stored (encrypted) — a regex backstop for card numbers (Luhn), IBANs and common key formats before insert.
- [ ] [P07] A failed index removal (owner delete, retract) or a deleted app leaves stale vectors until `bun run reindex` — embeddings of deleted content linger in Pinecone (never served: rows are re-fetched and re-checked) — retry removals in the background, and drop an app's vectors when it's deleted.
- [ ] [P07] Vectors and their labels are hosted by Pinecone in AWS `us-east-1` — derived data leaves the device, and the free plan picks the region — a self-hosted or in-region vector store for production.
- [ ] [P07] An owner's create, edit or delete waits for the embedding and index calls — a slow AI provider slows the dashboard — sync in `after()` or a queue once latency matters.

## P08 — Context API, Access History & Playground

- [ ] [P08] No defense against query enumeration (many narrow queries reconstructing a category) — gradual exfiltration within granted scope — per-app query budgets and anomaly detection.
- [ ] [P08] No per-tier result caps — over-disclosure — cap the memories used per tier.
- [ ] [P08] No leakage evals — the projection may include more than the purpose needs — an eval set with privacy assertions.
- [ ] [P08] No output redaction pass — PII may slip through the projection — a PII scrubber on the output.
- [ ] [P08] "Disclosed" memories come from the model's own `usedMemories` citations — a fact used but not cited is missing from the access log — check citations against the text (or fall back to everything sent) in a leakage eval.
- [ ] [P08] `MIN_SIMILARITY = 0.2` was set from a handful of queries on one seed — real queries may cut relevant memories or let unrelated ones through — calibrate on a labelled query set, maybe per depth.
- [ ] [P08] The model often writes past the 100-character cap, so the server drops whole sentences — useful facts can be lost — one "shorten" retry when the output is over the cap, or rank facts before writing.
- [ ] [P08] The access log preloads and decrypts every memory its 20 events reference (up to ~800) — slow pages as the log grows — load a row's memories on expand.
- [ ] [P08] The projection prompt says never to name apps, but a memory's own text can mention an app or service — an app could learn which other apps the owner uses — strip known app names from memory text before projecting.
- [ ] [P08] Memories and the app's query and purpose go to OpenAI for projection (with `store: false`) — authorized data still leaves the device — a local model for projection in production.

## P09 — Consent, Overview & Demo Readiness

- [ ] [P09] No notifications for new consent requests — the owner may never see them — email or push notification.
- [ ] [P09] No dedupe or rate limit on consent requests — an app can flood the owner's pending list — one pending request per app and operation (merge new categories in), plus a per-app daily cap.
- [ ] [P09] Pending consent requests never expire — a stale request can be approved weeks later — expire pending requests after e.g. 30 days.
- [ ] [P09] An approval doesn't record what it actually granted (only `approved`) — narrowed approvals can't be audited later — store the approved categories, cap and sources on the request (or in the grant history from P06).
- [ ] [P09] An approved request can't be undone as a unit — the owner must find and remove each grant in the matrix — a "revoke this approval" action, built on that record.
- [ ] [P09] The app isn't told the outcome of its request — it must poll `GET /permissions` — a status endpoint (`GET /consent-requests/:id`) or a webhook.
- [ ] [P09] The Overview's tier bar has no table view or custom tooltip (counts are in the legend and in each block's accessible name and `title`) — a weaker read for screen-reader and keyboard users than a table — add a visually hidden table, or a toggle to a table view.

## Sprint cut (2026-11-15)

Work dropped from the plan to make the 2026-11-17 demo. See the Pivot Log in the index.

- [ ] [CUT] Deployment (hosted Supabase, a hosting platform, production env) — the prototype only runs locally — deploy with RLS (P02), secure cookies (P03), env fail-fast (P00) and the `/api/v1/health` check.
- [ ] [CUT] Monitoring, uptime checks and preview environments — needed only once deployed — error tracking, an uptime monitor, per-PR previews with a separate DB.
- [ ] [CUT] Short-lived capability tokens — a leaked API key stays valid until revoked — exchange the key for a narrowly scoped, short-TTL token per purpose, with a revocation list.
- [ ] [CUT] Grant expiry — access lasts until the owner revokes it — optional `expires_at` (7 or 30 days) on grants and consent approvals.
- [ ] [CUT] Data export and account deletion — the owner can't take their data out or erase the vault in one step — an export (password-encrypted) and scheduled deletion with a grace period.
- [ ] [CUT] Semantic dedup on write — repeated syncs can store near-identical facts — a similarity check against the same source before insert.
- [ ] [CUT] A vault-wide sensitivity ceiling — the owner can't switch off a whole tier for every app at once — one owner setting that overrides every grant.
- [ ] [CUT] Owner feedback on disclosures — the owner can't flag "shouldn't have shared" from the access log — a flag action that removes that source from the app.
- [ ] [CUT] Full test coverage for Phases 06–09 — only the policy engine has unit tests — DAL, route and action tests as in Phases 00–05.
