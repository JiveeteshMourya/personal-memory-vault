# Development Phases — Index

This is the parent index for building **Personal Memory Vault** (see [main-project-objective.md](../main-project-objective.md)). Each phase is a self-contained, loosely coupled slice of the product. A phase is sized so that **one fresh agent session** can plan, build and verify it.

## Status

Legend: ⬜ Not started · 🟨 In progress · ✅ Done · 🔁 Redone (see [Pivot Log](#pivot-log))

| #   | Phase                                                                               | Status | Depends on |
| --- | ----------------------------------------------------------------------------------- | ------ | ---------- |
| 00  | [Project Foundation](phase-00-project-foundation.md)                                | ⬜     | —          |
| 01  | [UI Shell & Design System](phase-01-ui-shell-design-system.md)                      | ⬜     | 00         |
| 02  | [Database Foundation](phase-02-database-foundation.md)                              | ⬜     | 00         |
| 03  | [User Authentication](phase-03-user-authentication.md)                              | ⬜     | 01, 02     |
| 04  | [Memory Store](phase-04-memory-store.md)                                            | ⬜     | 02, 03     |
| 05  | [Connected Apps & API Keys](phase-05-connected-apps-registry.md)                    | ⬜     | 02, 03     |
| 06  | [Permission & Policy Engine](phase-06-permission-policy-engine.md)                  | ⬜     | 04, 05     |
| 07  | [Context Gateway Core & Audit Log](phase-07-context-gateway-core.md)                | ⬜     | 05, 06     |
| 08  | [Memory Ingest API](phase-08-memory-ingest-api.md)                                  | ⬜     | 04, 07     |
| 09  | [AI Provider Layer](phase-09-ai-provider-layer.md)                                  | ⬜     | 00         |
| 10  | [Semantic Memory Index](phase-10-semantic-memory-index.md)                          | ⬜     | 04, 09     |
| 11  | [Extraction & Classification Pipeline](phase-11-memory-extraction-pipeline.md)      | ⬜     | 08, 09, 10 |
| 12  | [Context Request API](phase-12-context-retrieval-api.md)                            | ⬜     | 06, 07, 10 |
| 13  | [Context Projection & Synthesis](phase-13-context-projection-synthesis.md)          | ⬜     | 09, 12     |
| 14  | [Consent Requests & Short-lived Capabilities](phase-14-consent-and-capabilities.md) | ⬜     | 06, 07     |
| 15  | [Simulated Apps & Jane Demo](phase-15-simulated-apps-demo.md)                       | ⬜     | 08, 11, 13 |
| 16  | [User Control Center & Data Ownership](phase-16-user-control-center.md)             | ⬜     | 04–07, 10  |
| 17  | [Deployment](phase-17-deployment.md)                                                | ⬜     | all        |

**Progress:** 0 / 18 done.

Other docs in this folder:

- [hardening-backlog.md](hardening-backlog.md): edge cases and hardening work deliberately deferred by each phase.
- [phase-template.md](phase-template.md): the template for any new or redone phase.

## Session protocol (every phase)

1. Start a **fresh agent session** for the phase.
2. Read these before doing anything else:
   - `AGENTS.md`
   - this index, including the [Decisions Log](#decisions-log)
   - [main-project-objective.md](../main-project-objective.md)
   - the phase doc
   - the **Outcome & handoff notes** of every phase it depends on
3. **Ask the user which libraries/packages to use.** The phase doc lists options, with the user's past picks marked. Install nothing before the answer.
4. Find **official** skills/plugins for the chosen libraries and install them only with the user's permission, in **project scope only**:
   - Skills: `bunx skills add <owner/repo> --skill <name> -a claude-code -y --copy`
   - Plugins: project scope
   - Never install anything globally. Read every installed `SKILL.md` before relying on it.
5. Read the relevant guides in `node_modules/next/dist/docs/` before writing Next.js code. This version differs from training data.
6. Plan in plan mode, get approval, then implement.
7. Verify against the phase's acceptance criteria. Use the `next-devtools` MCP for runtime checks (errors, routes, logs, compilation issues) while `bun dev` runs, plus manual checks in the browser.
8. Append anything deliberately skipped to [hardening-backlog.md](hardening-backlog.md).
9. Fill in the phase's **Outcome & handoff notes**, set its status here, update the progress count, and add rows to the [Decisions Log](#decisions-log).
10. Commit only when the user asks.

## Agile principles

- Build the **simplest end-to-end slice** that meets the phase goal: the happy path, input validation, and the auth/permission checks the feature needs.
- No speculative abstractions, config knobs or "future-proofing". A little duplication beats a premature helper.
- **Never leave a known bug in.** Rare edge cases, scale and performance work, and defense-in-depth go to the [hardening backlog](hardening-backlog.md) instead of being built now.
- Privacy invariants are **not** optional, even in an MVP:
  - default deny
  - authorize _before_ retrieval
  - encrypt memory content
  - never send unauthorized data to an app or an LLM
  - never log memory content
- **Edits must feel native.** A change to an existing feature reshapes it as if it had always been designed that way (see `AGENTS.md`).

## Loose-coupling rules

- A phase depends only on the **Contract provided** section of other phases, never on their internals.
- Each feature phase owns its tables (its own migration), its Data Access Layer module(s), its UI route(s) and its tests.
- If a phase is redone with a different approach, either keep its contract or record the migration in the [Pivot Log](#pivot-log) and update the affected phase docs.
- Phases can be reordered as long as their dependencies are met. Phase 09 (AI Provider Layer), for example, can be done any time after Phase 00.

## Conventions (standard Next.js practice)

The source of truth is the bundled docs in `node_modules/next/dist/docs/`, especially `01-app/02-guides/data-security.md` and `01-app/02-guides/authentication.md`.

| Concern              | Where                                                                                                  | Rule                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data Access Layer    | `src/data/<domain>.ts`                                                                                 | `import "server-only"`. The only code that touches the database or vector index. Performs authentication and authorization checks. Returns minimal **DTOs**, never raw rows. This is where the vault's privacy guarantees live. |
| Reads in UI          | Server Components (`page.tsx`, `layout.tsx`)                                                           | Call DAL functions directly.                                                                                                                                                                                                    |
| Mutations from UI    | Server Actions in `actions.ts` next to the route                                                       | `"use server"`. Validate input, call the DAL, `revalidatePath` / `updateTag`, and return only what the UI needs.                                                                                                                |
| External app API     | Route Handlers in `src/app/api/v1/**/route.ts`                                                         | Only for connected apps calling over HTTP. Validate input, call the DAL, return `Response.json(data, { status })`. Errors use `{ error: { code, message, details? } }` with standard status codes (400/401/403/404/409/500).    |
| Route protection     | `src/proxy.ts`                                                                                         | Optimistic redirects only. The real checks live in the DAL.                                                                                                                                                                     |
| Clients & infra      | `src/lib/`                                                                                             | Validated env (`env.ts`), db, auth, crypto, pinecone, `ai/`, and so on, as lazy singletons.                                                                                                                                     |
| UI components        | `src/components/ui/` (primitives), `src/components/` (shared), `src/app/**/_components/` (route-local) | Server Components by default; add `"use client"` only where interaction needs it.                                                                                                                                               |
| Shared domain types  | Co-located by default; `src/types/` only for types used across features                                | —                                                                                                                                                                                                                               |
| Naming               | Files and route segments in kebab-case; React components as PascalCase named exports                   | —                                                                                                                                                                                                                               |
| Formatting           | `bun run format`                                                                                       | Settings come from `bunfig.toml` (double quotes, semicolons, 2 spaces, width 100).                                                                                                                                              |
| Public API reference | `docs/public-api.md` (created in Phase 07)                                                             | Every phase that adds or changes an `/api/v1` endpoint updates it.                                                                                                                                                              |

Reference projects (read-only, never run) are listed in [reference-projects-for-familiar-code.md](../reference-projects-for-familiar-code.md). Use them for familiarity only. Where they differ from the conventions above, standard Next.js practice wins.

## Decisions Log

Record every library or approach decision here, so later sessions don't ask again.

| Phase | Decision                  | Choice                                                                                                                            | Notes                                                                                                                            |
| ----- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| —     | Runtime / package manager | Bun 1.4                                                                                                                           | Pre-set                                                                                                                          |
| —     | Framework                 | Next.js 16.4 App Router, Turbopack, `cacheComponents` + `partialPrefetching` on                                                   | Pre-set                                                                                                                          |
| —     | Styling                   | Tailwind CSS 4                                                                                                                    | Pre-set                                                                                                                          |
| —     | Formatter / linter        | `bun fmt` (`bunfig.toml`) + ESLint (`eslint-config-next`)                                                                         | Pre-set                                                                                                                          |
| —     | Structured storage        | Supabase PostgreSQL (free tier)                                                                                                   | From the objective                                                                                                               |
| —     | Semantic storage          | Pinecone (free tier)                                                                                                              | From the objective                                                                                                               |
| —     | Authentication            | Better Auth                                                                                                                       | User choice                                                                                                                      |
| —     | API / server structure    | Standard Next.js: DAL + Server Actions + Route Handlers                                                                           | User choice (2026-11-14)                                                                                                         |
| —     | Agent tooling             | Skills: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`. MCP: `next-devtools` (`.mcp.json`) | Project scope only; tracked in `skills-lock.json`. `next-dev-loop` was removed because it needs a global `agent-browser` install |

## Pivot Log

| Date | Phase | What changed | Why | Contract impact |
| ---- | ----- | ------------ | --- | --------------- |
|      |       |              |     |                 |
