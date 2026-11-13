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
- [ ] [P00] With invalid env, a self-hosted `next start` logs the error but keeps the process alive, answering 500 — a process supervisor won't restart or alert — have P17 rely on the `/api/v1/health` check, or `process.exit(1)` from `register()` on the Node runtime.
- [ ] [P00] `validation_error` details use `z.flattenError`, which only reports top-level fields — nested request bodies get vague errors — switch to `z.treeifyError` when an endpoint takes nested input.

## P01 — UI Shell & Design System

- [ ] [P01] No full accessibility audit — excludes keyboard and screen-reader users — run `web-design-guidelines` and an a11y review on every page.
- [ ] [P01] Motion and visual polish — the UI feels unfinished — add a pass after the core features land.
- [ ] [P01] The Atkinson fonts have no size-matched fallback (next/font has no metrics for them) — a small layout shift while the web font loads — self-host with `next/font/local` and hand-tuned `size-adjust`/`ascent-override` on the fallback.
- [ ] [P01] `theme-color` follows the OS scheme, not the in-app theme choice — browser chrome can mismatch the page after a manual switch — update the meta tag in `setTheme`.
- [ ] [P01] The sticky dashboard header can cover a focused element when tabbing back up a long page — keyboard users lose the focus ring — set `scroll-padding-top` on `html` to the header height once pages get long.
- [ ] [P01] The vault lens tab isn't reflected in the URL — a specific app's view can't be deep-linked — sync it to a search param if the landing page ever needs it.

## P02 — Database Foundation

- [ ] [P02] No Supabase Row Level Security — if DB credentials leak, all rows are exposed — enable RLS with deny-all for the anon and authenticated roles, since the app uses a server-side role.
- [ ] [P02] Connection pooling and timeouts untuned — connection exhaustion under load — tune the pooler mode, pool size and statement timeouts.
- [ ] [P02] No backup/restore drill — data loss — document and test Supabase backups.

## P03 — User Authentication

- [ ] [P03] No email verification or password reset — account takeover and lockouts — enable Better Auth email flows with a mail provider.
- [ ] [P03] No 2FA — weak protection for the most sensitive data a user has — Better Auth two-factor plugin.
- [ ] [P03] No login lockout or throttling — credential stuffing — rate limit plus lockout.

## P04 — Memory Store

- [ ] [P04] One app-wide encryption key — a single key leak exposes every user — per-user data keys (envelope encryption).
- [ ] [P04] No key rotation — a compromised key can't be retired — key-version prefix already exists; add a re-encrypt job.
- [ ] [P04] Key lives in an env var — weak key custody — move it to a KMS or secrets manager.
- [ ] [P04] Hard delete only — accidental loss — soft delete with a short restore window.

## P05 — Connected Apps & API Keys

- [ ] [P05] No key rotation grace period — rotating a key breaks the app immediately — overlap window with two active keys.
- [ ] [P05] Keys never expire — long-lived credential risk — optional expiry plus reminders.

## P06 — Permission & Policy Engine

- [ ] [P06] Grants aren't bound to a purpose — an app can reuse access for any stated purpose — purpose-bound grants (see also P14).
- [ ] [P06] No grant history — can't answer "who had access when" — append-only grant change log.

## P07 — Context Gateway Core & Audit Log

- [ ] [P07] Audit log is not tamper-evident — a DB-level attacker can rewrite history — hash-chain the events.
- [ ] [P07] No alerting on unusual denials or access spikes — silent abuse — threshold alerts surfaced in the dashboard.

## P08 — Memory Ingest API

- [ ] [P08] No idempotency keys — duplicate memories when an app retries — `Idempotency-Key` header with a stored response.
- [ ] [P08] No payload size limits or per-app quotas — storage and cost abuse — body size cap and per-app daily quota.

## P09 — AI Provider Layer

- [ ] [P09] No retries or fallback provider — provider outages break the pipelines — retry with backoff, plus an optional fallback model.
- [ ] [P09] No token and cost tracking — surprise bills — log usage per call (without content).

## P10 — Semantic Memory Index

- [ ] [P10] Embeddings are derived from sensitive plaintext and stored in a third-party index — embedding-inversion risk — review the threat; consider self-hosted embeddings/pgvector for the most sensitive tiers.
- [ ] [P10] Index can drift from Postgres if a sync call fails — stale or missing results — periodic reconcile job.

## P11 — Extraction & Classification Pipeline

- [ ] [P11] No prompt-injection hardening — app-supplied text could steer extraction or classification — input delimiting, an output schema check and a sensitivity floor for suspicious input.
- [ ] [P11] No dedupe or merge of extracted memories — duplicate facts — similarity check before insert.
- [ ] [P11] No relationship graph between memories — weaker synthesis — relationship extraction step.
- [ ] [P11] No retries or dead-letter for failed inputs — silent loss — retry policy plus a failed-inputs view.

## P12 — Context Request API

- [ ] [P12] No defense against query enumeration (many narrow queries reconstructing a category) — gradual exfiltration within granted scope — per-app query budgets and anomaly detection.
- [ ] [P12] No per-sensitivity result caps — over-disclosure — cap items returned per sensitivity level.

## P13 — Context Projection & Synthesis

- [ ] [P13] No leakage evals — the projection may include more than the purpose needs — eval set with privacy assertions.
- [ ] [P13] No output redaction pass — PII may slip through the summaries — PII scrubber on the projection output.

## P14 — Consent Requests & Short-lived Capabilities

- [ ] [P14] No notifications for new access requests — the owner may never see them — email or push notification.
- [ ] [P14] No revocation list for capability tokens (they rely on a short TTL) — a stolen token stays valid until expiry — denylist check on use.

## P16 — User Control Center & Data Ownership

- [ ] [P16] Export file is plaintext JSON — sensitive data at rest on the user's device — optional password-encrypted export.
- [ ] [P16] Account deletion is immediate — no recovery from accidents — scheduled deletion with a grace period.

## P17 — Deployment

- [ ] [P17] No monitoring, uptime checks or alerts — outages go unnoticed — error tracking and uptime monitor.
- [ ] [P17] No preview environments — changes are only tested locally — per-PR preview deploys with a separate DB.
