# Phase NN — Title

> **Status:** ⬜ Not started · **Depends on:** contracts from phases … · **Unlocks:** phases …

Use this template for any new phase, or for a phase redone with a different approach. If you redo a phase, record it in the index's Pivot Log.

## Goal

One paragraph: what the owner or a connected app can do when this phase is done.

## Coupling boundary

- What this phase owns: its tables, modules and routes.
- What it must **not** touch.
- Which other phases' contracts it uses.

## Decisions to make with the user (at phase start)

Ask before installing anything. Mark the user's past picks as _(past)_ and suggest a default.

- **Area:** option A _(past)_ / option B / option C. Recommended: …

## Skills / plugins to look for

Usually "None expected." List a skill, plugin or MCP server only if this phase's work needs it and nothing installed or bundled covers it. Follow the index's [Agent tooling](phase-index.md#agent-tooling) rules: official only, the smallest unit (one skill over a plugin), project scope, and the user's permission first.

## In scope (MVP slice)

- …

## Out of scope → hardening backlog

When the phase completes, add these to [hardening-backlog.md](hardening-backlog.md) if they aren't already listed:

- …

## Contract provided

The interfaces other phases may rely on: function signatures, routes, request and response shapes, tables. Keep this stable. Change it only through the Pivot Log.

## Deliverables

- Files, routes, tables, scripts, docs.

## Acceptance criteria & verification

- [ ] Happy-path checks, run manually in the browser plus `next-devtools` MCP error and route checks.
- [ ] Unit tests for critical pure logic only.
- [ ] `bun run lint`, `bun run typecheck`, `bun run test` and `bun run format:check` pass.

## Outcome & handoff notes

_Filled in when the phase is complete:_

- what was built
- env vars added
- gotchas for the phases that follow

Fold any deviation into the sections above, so the doc describes what was built. Record a changed approach in the index's Pivot Log.
