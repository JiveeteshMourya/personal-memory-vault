# Phase 16 — User Control Center & Data Ownership

> **Status:** ⬜ Not started · **Depends on:** 04 (memories), 05 (apps), 06 (grants), 07 (audit), 10 (index) · **Unlocks:** —

## Goal

The owner sees their whole vault at a glance and **owns** their data. They can:

- shut off all app access instantly
- export everything
- delete everything

## Coupling boundary

- **Owns:** the `/dashboard` overview page, `src/data/ownership.ts` (export and delete orchestration), and the data-controls section in settings.
- **Uses only contracts** from Phases 04–07 and 10. Deletion goes through each module's own delete functions, or explicit cascades; it never reaches into another phase's tables ad hoc.

## Decisions to make with the user (at phase start)

- **Export format:** a single JSON file (recommended), or a ZIP of JSON + CSV.
- **"Revoke all":** grants only, or grants **and** API keys (recommended: both, with a clear confirm).
- **Account deletion:** immediate (MVP), with a typed confirmation.

## Skills / plugins to look for

`dataviz` (already available) if the overview gets charts.

## In scope (MVP slice)

- `/dashboard` overview:
  - memory counts by category and by source
  - connected apps with a grant summary
  - the last 10 access events
  - pending access requests (if Phase 14 is done)
  - quick links
- **Revoke all access:** revokes every grant and every API key, recorded in the audit log.
- **Export:** a Server Action or route that streams a JSON download of:
  - the profile
  - memories (decrypted)
  - apps (no key hashes)
  - grants
  - the access log
- **Delete all memories:** deletes them from Postgres and the user's Pinecone namespace.
- **Delete account:** removes all memories, inputs, apps, keys, grants, events and requests, the Pinecone namespace, and the Better Auth user. Signs out.

## Out of scope → hardening backlog

- Encrypted export, scheduled deletion with a grace period (seeded). Import.

## Contract provided

`exportUserData(userId)` and `deleteUserData(userId, { account: boolean })` in `@/data/ownership`.

## Deliverables

The overview page, the ownership DAL, the settings and data-controls UI, the actions.

## Acceptance criteria & verification

- [ ] The overview reflects the seeded Jane data correctly.
- [ ] After "Revoke all", every app call returns 401/403.
- [ ] The export contains all of the user's data and no other user's data.
- [ ] After account deletion, nothing remains in Postgres or Pinecone for that user, and the user can't sign in.
- [ ] Lint, typecheck, tests and format pass.

## Outcome & handoff notes

_To be filled when the phase is complete._
