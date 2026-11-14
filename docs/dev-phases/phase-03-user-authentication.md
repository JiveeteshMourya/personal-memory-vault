# Phase 03 — User Authentication

> **Status:** ⬜ Not started · **Depends on:** 01 (shell), 02 (db) · **Unlocks:** 04, 05 and every owner-facing feature

## Goal

The vault owner can sign up, sign in and sign out. The dashboard is only reachable when signed in. The rest of the app identifies the owner through one DAL function.

## Coupling boundary

- **Owns:** the Better Auth config, its tables (generated schema and migration), the auth pages, `src/proxy.ts`, `src/data/auth.ts`.
- **Must not:** let anything outside `src/lib/auth*.ts` and `src/data/auth.ts` import Better Auth directly.

## Decisions to make with the user (at phase start)

- **Auth library:** Better Auth _(given)_.
- **Sign-in methods:** email + password (recommended for the MVP) ± Google OAuth _(past)_.
- **DB adapter:** Better Auth's Drizzle adapter (Phase 02 uses Drizzle). Generate the auth tables into `src/db/schema/auth.ts`, re-export them from the barrel, and apply them with `db:generate` + `db:migrate` (see Phase 02's "How a phase adds a table").
- **User id type:** Better Auth's default `text` id, or UUIDs. Feature tables' `user_id` columns must match whichever is chosen.
- **Forms:** Server Actions + `useActionState` (recommended), or react-hook-form.

## Skills / plugins to look for

- `better-auth/skills` (official), e.g. `create-auth-skill` and `better-auth-best-practices`. Install with `bunx skills add better-auth/skills --skill <name> -a claude-code -y --copy`.
- Read the bundled `01-app/02-guides/authentication.md`.

## In scope (MVP slice)

- `src/lib/auth.ts` (server instance), `src/lib/auth-client.ts` (client helpers), and the auth route handler as Better Auth documents it (e.g. `src/app/api/auth/[...all]/route.ts`).
- Pages `/sign-in` and `/sign-up`, styled with the Phase 01 primitives. Sign-out in the shell's user menu.
- `src/proxy.ts`: an **optimistic** redirect of `/dashboard/*` to `/sign-in` when there is no session cookie, and of signed-in users away from the auth pages.
- `src/data/auth.ts`:
  - `getCurrentUser = cache(async () => UserDTO | null)`
  - `requireUser(): Promise<UserDTO>`, which redirects to `/sign-in` when there is no session
- Show the user's name and email in the shell header.
- Env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (+ OAuth vars if chosen).

## Out of scope → hardening backlog

- Email verification, password reset, 2FA, lockout (already seeded). Account deletion is Phase 16.

## Contract provided

- `import { getCurrentUser, requireUser } from "@/data/auth"`, with `UserDTO = { id, name, email }`.
- **`user.id` is the vault owner id.** Every feature table references it as `user_id`.
- Routes: `/sign-in`, `/sign-up`. `/dashboard/*` is protected.

## Deliverables

Auth config and migration, auth route handler, auth pages, `src/proxy.ts`, `src/data/auth.ts`, the shell user menu, env vars.

## Acceptance criteria & verification

- [ ] Sign up → you land on `/dashboard`. Sign out → `/dashboard` redirects to `/sign-in`.
- [ ] A Server Action or DAL call that needs a user fails without a session, even if the proxy is bypassed.
- [ ] Two accounts each see only their own name in the shell.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
