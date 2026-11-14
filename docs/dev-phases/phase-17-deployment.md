# Phase 17 — Deployment

> **Status:** ⬜ Not started · **Depends on:** all phases the user wants live · **Unlocks:** —

## Goal

Run the prototype on the internet with production configuration, so the Jane demo can be shown from a public URL.

## Coupling boundary

- **Owns:** hosting config, production env and secrets setup, the deploy docs, the smoke-test checklist.
- **Must not:** change feature behavior. Any fix found during deployment is made natively in the owning phase's code, and noted in that phase's handoff notes.

## Decisions to make with the user (at phase start)

- **Host:**
  - Vercel (recommended for Next.js)
  - Railway or Fly.io (Bun runtime)
  - another host
- **Production data:**
  - a separate Supabase project and Pinecone index (recommended)
  - the same free-tier projects with separate schemas or namespaces
- **Domain:** the default host subdomain, or a custom domain.
- **Migrations on deploy:** `bun run db:migrate` with `DIRECT_URL` set to the production direct connection, run manually (MVP) or as a build step.

## Skills / plugins to look for

- `deploy-to-vercel` and `vercel-cli-with-tokens` from `vercel-labs/agent-skills` (official), if Vercel is chosen. Project scope.
- The chosen host's official skill/plugin otherwise.

## In scope (MVP slice)

- Production env vars, documented against `.env.example`.
- Better Auth production URL and trusted origins.
- Production DB migrations applied, Pinecone index created, `demo:setup` run if the demo should be live.
- A smoke-test checklist:
  - health
  - sign-up
  - the Memories CRUD flow
  - an app key working via `curl`
  - the demo walkthrough
- A README "Deploy" section.

## Out of scope → hardening backlog

- Monitoring and alerts, preview environments (seeded). CI/CD automation, backups (P02).

## Contract provided

A public URL, plus documented deploy steps.

## Deliverables

Host config (if any), the README deploy section, the completed smoke-test checklist in the handoff notes.

## Acceptance criteria & verification

- [ ] Every smoke-test item passes on the production URL.
- [ ] No secrets are committed. `.env.example` is complete.

## Outcome & handoff notes

_To be filled when the phase is complete._
