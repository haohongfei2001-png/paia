# PAIA v0.11.1 — Round 4 AI Presentation migration bookkeeping

Status: **verified repair stacked on the current P0 branch; not merged to `main` and not deployed to the daily Chrome profile**.

Base: combined Round 2 + Round 3 P0 branch `p0/thought-library-cold-reload-round2` at `2e1f3c82b86e1dcdfc0f732d7e9d1e403c110f28`.

## Problem

The historical AI Presentation productization migration used one global v1 marker. If a Topic had an existing legacy AI Presentation cache but lacked a valid `activeLayoutGeneration` when that marker was first written, the migration skipped that Topic and still marked the whole migration complete. A later safe recovery of the Topic layout therefore could not cause its legacy cache/fence bookkeeping to run.

## Change

Round 4 replaces the one-shot bookkeeping with a resumable v2 marker:

- existing v1 markers are scanned once and upgraded;
- only unresolved Topics that **actually own an AI Presentation cache** become pending migration work;
- unresolved Topics without an AI cache do not keep migration globally incomplete;
- pending Topics are revisited on later migration calls;
- once a pending Topic has a valid active layout, its legacy cache is marked stale/current-schema-incompatible exactly as before and its source-indexed purge fence is created;
- a missing Topic/cache is retired from pending work rather than recreated;
- a completed v2 marker is stable and avoids repeated migration writes in the same store instance.

The marker stores only opaque pending Topic IDs and aggregate migration state. It does not copy user text.

## Safety boundaries

This round does not:

- infer or repair `activeLayoutGeneration`;
- create, rename, merge or delete Topics;
- modify Source, Input, Thought body, provenance, user edits, tombstones or `user_removed` state;
- run Organizer or make provider requests as a migration mechanism;
- change the physical IndexedDB schema version;
- deploy anything to the user's daily Chrome profile.

Round 2 remains responsible for Topic compatibility inference. Round 4 only ensures that AI Presentation migration bookkeeping can resume after such a Topic later becomes safely readable.

## Verification

Authoritative GitHub Actions run: `34612709374`.
Verified candidate commit: `f4ee86f` (`P0 Round 4: make AI presentation migration resumable`).

Targeted migration + related regressions:

- **125/125 passed**;
- **0 failed, 0 skipped**;
- includes 4 new Round 4 migration tests plus AI Presentation, AI productization, cold-reload compatibility, Thought M1/M2, Backup and Memory safety suites.

Static/package checks:

- `npm run check`: **6487 package guardrails across 139 runtime resources**;
- `npm run build:release`: passed;
- emitted release guard: **147 files**.

The temporary write-capable verification workflow and staged patch were deleted by the verified commit and are not part of the final Round 4 diff.

## New regression cases

1. A legacy v1 global marker plus unresolved cached Topic becomes v2 incomplete; after a valid layout appears, the exact pending Topic is migrated and the marker completes.
2. An unresolved Topic with no AI Presentation cache does not create permanent pending migration work.
3. An incomplete v2 marker remains stable while unresolved, revisits its pending Topic after layout recovery, then becomes stable when complete.
4. A missing pending Topic/cache is retired without resurrection.

## Remaining release gate

This round does not remove the real-data gate in `V0111_REAL_DATA_GATE.md`. Development can continue on stacked branches, but the combined P0 repair must not be merged to `main` or deployed to the daily Chrome profile until the long-lived real database has either been read-only inspected or an explicit decision is made to accept that residual deployment risk.
