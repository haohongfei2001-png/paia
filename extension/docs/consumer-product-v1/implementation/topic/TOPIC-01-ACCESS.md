# TOPIC-01 effective-access repair

Base: main `4de4e2257562f799babc524cd69310baa079b1cf`, preserving the Settings
Consumer v2 and Thought visual documentation. Compatible patch candidate:
`0.13.1`. State: IMPLEMENTED_CANDIDATE / INDEPENDENT_REVIEW_PASS /
FULL_CERTIFICATION_PENDING. No stage completion or installation is claimed.

## Confirmed negative evidence

The actual production `MemoryService.permittedPaths` initially returned zero
paths for one Entry placed in denied Topic A and allowed Topic B. The
`moveMembership(A → C)` operation succeeded with C still default-off. It removed
A's active veto, so B became a permitted path: zero to one, with permission rows
byte-identical and no grant for C. The reproduction imported no Topic04 code.
The reproduced `topic-intent.js` blob was
`62aca18f8b33cbd5b9a646cb65682666b03db0cf`, identical to the fresh main base.

This is a retained-authorization compatibility defect. Production Context
generation and new positive grant creation remain retired; the reproduction
uses synthetic retained permission rows and makes no external request. The
previous full candidate/main passes did not test this negative-witness loss.
They remain historical results and cannot close the reopened invariant.

## Bounded change

`core/memory/organization-guard.js` reads the existing permission owner's
validated Topic and Section rows in complete pages of at most 100. A saved
`denied`/`never` Topic rule in any profile, or an exclusion on the exact Section
being left, refuses the move with the existing `MEMORY_DENIED` error. Malformed
retained rows fail closed. Restrictions remain effective while external access
is off; default-off absence is not converted into an explicit denial.

The shared `placeEntryInTransaction` owner checks the current before/after
placement, so ordinary placement removal, Section relocation, membership moves
and placement-history restore all use the same transaction guard. Topic-container
removal checks active memberships before changing lifecycle. Same-Section edits,
rank changes and moves within a still-denied Topic remain valid when the existing
negative witness is preserved.

Topic/Section merge admission checks the memberships that would be lost before
any layout lock is published. Activation and layout Undo/Redo compare actual
current memberships with the proposed generation, using fresh permission rows.
A Section exclusion added during staging cancels that work before activation,
clears its locks and leaves the original canonical generation intact. The existing
layout-status interface reports this as paused so the UI exits its wait and the
user may retry. Staged rows stay inactive. Actual legacy snapshot projection and
production replace restore preserve the canonical memberships and exclusions.

The Memory path reader also checks active current-generation negative witnesses
before withholding positive paths for a layout lock. An omitted Topic in a caller's
positive read map is loaded only for this negative check; it never adds a positive
read path. Harmless order staging therefore cannot temporarily expose a shared
Entry through another allowed Topic.

Refusal leaves permission rows, identities, bodies and history unchanged. There
is no copied deny store, grant update, permission union, schema change, transport
activation or new data owner. A restriction can be changed separately through its
existing permission owner. Unrestricted moves retain their existing human intent
and atomic rollback. A still-present Entry exclusion or unrelated Topic denial is
preserved rather than converted into a blanket ban on organization.

The manifest/package versions and numeric version-name prefix agree at
`0.13.1`. No backup format/section/schema or admitted producer-minor change is
needed for this compatible patch. Context's separately coordinated new capability
retains its own subsequent version and verification obligations.

## Verification

- Owning access regressions: 36 passed, zero failed/skipped; together with the
  existing thought-m2 owner tests, 57 passed.
- Combined identity, restore, Memory/Context privacy and Topic unit regressions:
  180 passed, zero failed/skipped.
- Established serial privacy/security runner: 59 passed, zero failed/skipped;
  development privacy/permission/network audit passed.
- Source package guard: 9,927 checks across 294 runtime resources passed.
- Release package: 9,863 checks across 290 runtime resources passed; product
  guard passed with 314 files and synchronized `0.13.1` identity.

Tests exercise actual permission-policy/path functions and domain operations:
Topic denied/never, Section exclusion, another retained profile, valid permission
rows beyond the first 100, separate permission-owner revision, default-off safe
moves, unrelated/global Entry denials, late policy change, actual replace restore
and target-write rollback. Direct owner removal, Section moves, Topic removal,
merge admission, in-flight order locks, omitted positive maps, late staging
cancellation, generation activation and Undo/Redo are covered. Both cancelled
Topic/Section merges pass strict historical projection and actual production
replace restore. Assertions cover effective paths and data/permission snapshots.

An overbroad local affected-file command also selected the Chrome performance
file. That file could not load its historical machine-specific Playwright path;
no browser started and no performance result is claimed. The subsequent correctly
scoped unit command passed all 180 tests. Hosted browser certification remains
required; no test or gate was changed to hide this environment limitation.

Independent review cleared runtime/test commit
`5bf7cb6b58e5ab8c7e2b951d01d419baada81a55`, tree
`4d68debbffafb752b1307fb9925cafaf6b6ca89b`, with 57/57 independently repeated
owning/compatibility tests. Additional actual-owner probes covered tied Entry-order
staging and Undo/Redo with full and omitted Topic maps, plus a 103-placement Topic
removal whose excluded tail was reached on the second page and left canonical
data unchanged. Independent cancelled-layout snapshots also passed strict legacy
projection and production restore preview. Complete 100-row scans establish
coverage, not native transaction-latency or broad-scale SLO acceptance.

The earlier local historical-import timing failure and unavailable local Chromium
receipt remain unchanged; no timeout/assertion or gate is weakened and no unchanged
full local benchmark is repeated. Hosted full
exact-head/main certification is still required before this repair is integrated
and the scoped foundation can close. No user data, live service, external client,
paid processing, semantic quality or whole-product acceptance is inferred.
