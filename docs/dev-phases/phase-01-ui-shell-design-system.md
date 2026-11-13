# Phase 01 — UI Shell & Design System

> **Status:** ⬜ Not started · **Depends on:** 00 · **Unlocks:** 03 and every phase with UI

## Goal

Set the visual language and app chrome:

- design tokens with light/dark theme
- component primitives
- a landing page that explains the vault
- the dashboard shell, with navigation to every future section as placeholder pages

The agent has full design freedom. The user will ask for edits.

## Coupling boundary

- **Owns:** `src/app/globals.css` tokens, `src/components/ui/*`, `src/components/layout/*`, the `/` landing page, and the `(dashboard)` route group's layout and placeholder pages.
- **Must not:** fetch data or add auth. The shell stays public until Phase 03 protects it. Placeholders show static empty states.

## Decisions to make with the user (at phase start)

- **Component library:**
  - shadcn/ui on Base UI _(past)_
  - shadcn/ui on Radix
  - hand-rolled Tailwind primitives
  - Recommended: shadcn/ui (Base UI).
- **Icons:** lucide-react _(past)_.
- **Theme switching:** next-themes _(past)_ / a small custom script.
- **Toasts:** sonner _(past)_.
- **Fonts:** keep Geist via `next/font`, or pick a more distinctive pairing.
- **Client data fetching (TanStack Query, _past_):** recommended **not** to add yet. Server Components plus Server Actions cover the MVP.

## Skills / plugins to look for

- shadcn's official skill / MCP (if shadcn is chosen).
- Already installed: `vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines`.
- Anthropic's `frontend-design`: if wanted, ask before enabling it in project scope.

## In scope (MVP slice)

- **Visual direction:** a calm, trustworthy "private vault" feel. Distinctive, not template-default.
- Tokens with Tailwind 4 `@theme` in `globals.css`, in light and dark.
- Only the primitives the shell and the next few phases need: Button, Input, Textarea, Select, Card, Badge, Dialog, Table, Tabs, DropdownMenu, Toast, Skeleton, EmptyState.
- Routes:
  - `/` is the landing page: product pitch, how it works (apps ⇄ vault), and a "Open dashboard" CTA.
  - `(dashboard)` layout: sidebar on desktop, drawer on mobile; header with a user-menu placeholder and a theme toggle.
  - Placeholder pages: `/dashboard` (overview), `/dashboard/memories`, `/dashboard/apps`, `/dashboard/permissions`, `/dashboard/access-log`, `/dashboard/playground`.
- Responsive down to a 360 px width.

## Out of scope → hardening backlog

- Full accessibility audit; animation and polish pass.

## Contract provided

- **Primitives:** `src/components/ui/*`.
- **Layout pieces:** `AppShell`, `PageHeader` and `EmptyState` from `src/components/layout/*`.
- **Dashboard route map** (above). Feature phases replace the placeholder content of their page. They do not restructure the shell.
- **Nav config:** a single array (e.g. `src/components/layout/nav-items.ts`). Later phases add entries there, e.g. "Requests" in Phase 14.

## Deliverables

Tokens, primitives, layout components, landing page, dashboard layout, six placeholder pages, theme toggle.

## Acceptance criteria & verification

- [ ] Every route renders in light and dark mode with no console or runtime errors (`next-devtools` MCP `get_errors`, plus a browser check).
- [ ] Navigation works on desktop and mobile widths.
- [ ] `web-design-guidelines` review of the shell has no high-severity findings.
- [ ] Lint, typecheck and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
