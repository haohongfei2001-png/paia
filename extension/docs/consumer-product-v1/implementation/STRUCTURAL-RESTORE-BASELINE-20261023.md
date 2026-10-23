# Structural Context: actual owner-route baseline

2026-10-23. Baseline `0897127e67902141a43b94ea18f44998235a2fc5`.
This checkpoint adds two bounded synthetic regressions to the existing owning
file. It changes no runtime, schema, grants, budget, workflow or version.

## Supported movement, not a new mapper

The actual `placeEntry` operation moves one original Input-bound Entry between
Sections of the same Topic and writes `kind: placement`, `reason: place`,
`fieldMask: [membership, section, order]`. The existing session Placement
Context route commits through the original Context owner. The test checks the
actual before/after Section IDs, one provider fixture invocation, exact Context
ACK, independent Topic DEFER and unchanged human-owned tables. It does not
invent a Section structural journal for that move.

## Genuine title-restoration gap

The actual `restoreRevision` operation, selecting a prior rename's `before`
side, restores its title and writes `kind: section`, `reason: restore`, an
incremented revision, original before/after and a thought-library operation
receipt. The current structural mapper deliberately accepts only `rename`;
the corresponding Context obligation remains DEFERRED with no provider call or
ACK. The second regression captures that baseline. Its expected DEFER is an
honest current limitation, not the completion requirement for restoration.
When the finite restoration implementation lands, its positive expectation must
be updated while retaining forged/stale/unauthorized refusal controls.

The restore journal does not persist `restoreRevisionId` or `side`. Its receipt
stores a digest of the original request, not the request itself. A broad change
from `rename` to `[rename, restore]` would not establish which old title was
restored. A safe successor must prove the selected original restoration chain,
independent historical-title qualification and receipt binding before dispatch,
then retain the complete current/final fences. Asynchronous SHA-256 work must
not be added inside a live IndexedDB transaction merely because fake IndexedDB
passes. A two-phase qualified snapshot/hash/recheck or an original-owner witness
needs its own bounded design, schema/recovery review and subsequent native
validation. No history/body access expansion is established here.

## Checks actually executed

- Absolute existing Node `22.23.3`, macOS local fake IndexedDB; no installation.
- Two new tests alone: 2/2, exit0, TAP499.520834ms.
- Complete original owning file with those two additions: 74/74, exit0,
  TAP16942.317583ms, zero failures/cancellations/skips/todos.
- `git diff --check`: passed.

These are local correctness/evidence checks. No native browser, large seed,
release build, paid model, cloud CI, production data, source access or deployment
ran. The restoration implementation and its native qualification remain open.
