# Phase 15 — Simulated Apps & Jane Demo

> **Status:** ⬜ Not started · **Depends on:** 08 (ingest), 11 (inputs), 13 (projection) · **Unlocks:** —

## Goal

Demonstrate the whole concept from the objective's "Jane" example. Three simulated apps (**Fitness**, **Food**, **Journal**) behave like real external clients:

- They write through the public API.
- The Journal app requests context and shows an AI insight.
- Jane, the owner, sees and controls all of it in her dashboard.

## Coupling boundary

- **Owns:** the `/demo/*` routes, `src/app/demo/**`, the `bun run demo:setup` script, and the demo walkthrough page.
- **Rule:** demo apps call the **public HTTP API** with their own API keys, exactly as an external app would. **No imports from `src/data/*`.** That keeps the demo honest.

## Decisions to make with the user (at phase start)

- **Where demo app keys live:**
  - env vars set by `demo:setup` (recommended)
  - a demo-only config table
- **Demo UX:**
  - three separate mini-app pages (recommended)
  - one combined simulator page
- **Demo access:** public `/demo`, or requires sign-in as Jane.

## Skills / plugins to look for

None expected. The installed frontend skills apply.

## In scope (MVP slice)

- `bun run demo:setup` (idempotent). It creates or resets:
  - user **Jane**
  - the 3 connected apps and their keys
  - grants:
    - Fitness: write `activity`, `sleep`
    - Food: write `diet`
    - Journal: write `mood`, `personal`; read `activity`, `sleep`, `diet`, `mood`
  - seed history (reuses `seed:jane` data)
  - the index backfill
- `/demo/fitness`: log a workout or a sleep entry, via `POST /api/v1/memories`.
- `/demo/food`: log a meal, via `POST /api/v1/memories`.
- `/demo/journal`:
  - Write an entry, via `POST /api/v1/inputs`.
  - Ask "Are my activity and diet affecting my mood?" via `POST /api/v1/context` (projection), and show the insight and the disclosure.
- Each demo page shows its API calls (request and response) in a collapsible panel, for transparency.
- `/demo` walkthrough page: the scenario steps with links, including "open Jane's Access Log" and "revoke the Journal app's diet access, then ask again".

## Out of scope → hardening backlog

- Separately deployable demo apps, multi-user demos.

## Contract provided

`bun run demo:setup`, plus the demo routes. Nothing else depends on this phase.

## Deliverables

The setup script, the three demo app pages, the walkthrough page, a README "Run the demo" section.

## Acceptance criteria & verification

- [ ] From an empty DB: `bun run demo:setup` followed by the walkthrough works end to end in the browser, with no errors reported by the `next-devtools` MCP.
- [ ] Revoking the Journal app's `diet` read grant immediately removes diet from its next insight.
- [ ] The Access Log shows every demo call, with purposes.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
