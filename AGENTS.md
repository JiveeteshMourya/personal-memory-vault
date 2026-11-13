<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- **Start here:** [docs/dev-phases/phase-index.md](docs/dev-phases/phase-index.md). Development is split into loosely coupled phases, one per fresh agent session. Follow the index's session protocol, its conventions (standard Next.js: Data Access Layer + Server Actions + Route Handlers), and the Decisions Log.
- **Ask before adding libraries.** At the start of each phase, ask the user which libraries/packages to use, then look for **official** skills/plugins for them. Install only with the user's permission, and only in **project scope** (`.claude/skills`, `.mcp.json`, project settings). Never install anything globally.
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
