<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- **Start here:** [docs/dev-phases/phase-index.md](docs/dev-phases/phase-index.md). Development is split into loosely coupled phases, one per fresh agent session. Follow the index's session protocol, its conventions (layered: `src/server` models → repository → services, with middlewares and controllers; `src/client` features and components; `src/shared` constants, types and validators; `src/app` for routing only), and the Decisions Log.
- **Ask before adding libraries.** The libraries for the remaining phases are already decided in the index's Decisions Log ([Sprint mode](docs/dev-phases/phase-index.md#sprint-mode-until-the-2026-11-17-demo)). Ask the user before adding anything not listed there.
- **The vault is platform-agnostic.** It serves any GenAI app through [docs/public-api.md](docs/public-api.md), under the rules in [docs/classification-model.md](docs/classification-model.md). Never shape it around a specific connected app.
- **Keep agent tooling lean.** Every installed skill, plugin and MCP server costs context in every session, used or not. Follow the index's [Agent tooling](docs/dev-phases/phase-index.md#agent-tooling) rules:
  - Add one only when this phase's work needs it and nothing installed or bundled already covers it.
  - Official sources only, smallest unit: one skill rather than a plugin or a whole skill repo.
  - Ask the user first, and install in **project scope** only (`.claude/skills`, `.mcp.json`, project settings). Never install anything globally.
  - Remove it once no remaining phase needs it.
- **Work agile.** Build the simplest working slice. Don't over-engineer or chase rare edge cases, and never leave a known bug in. Record deferred edge cases and hardening work in [docs/dev-phases/hardening-backlog.md](docs/dev-phases/hardening-backlog.md).
- **Make edits feel native, not patched.** When asked to update or change code, implement it as if the feature had always been designed that way:
  - Reshape the surrounding code, names, types, data flow, UI and docs to fit.
  - Remove whatever the change makes obsolete.
  - Don't bolt on wrappers, flags, `v2`/`new` names, compatibility shims or "added X" comments.
  - If the change alters a phase's contract, update that phase doc (and the Pivot Log when the approach changes).
- **Privacy invariants are non-negotiable:**
  - default deny
  - authorize before retrieval
  - encrypt memory content
  - never send unauthorized data to an app or an LLM
  - never log memory content
- **Reference projects** listed in [docs/reference-projects-for-familiar-code.md](docs/reference-projects-for-familiar-code.md) are read-only. Read them for familiarity; never run, build or modify them.
