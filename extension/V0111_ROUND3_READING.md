# v0.11.1 Round 3 — independent reading and pre-repair diagnostics

Status: **draft, not merged or deployed to the daily Chrome profile**.
Base: Round 2 commit `3ea54ba31247c1c67181cdc939604ccb3fdfa815`.
Branch: `p0/thought-library-ui-readonly-round3`.

## Reading boundary

Home lists and original Topic documents are core reads. AI Presentation status,
Original Organizer status, controls/preferences, bounded-workflow status,
credentials status and the unplaced-content badge must not be prerequisites for
those reads. Home renders first, then starts bounded optional reads. Each optional
RPC has its own deadline; one rejection cannot discard successful sibling results.
A hung RPC stops blocking the UI after the deadline, without reissuing the request.
This is a UI deadline, not cancellation of already dispatched worker work.

Optional completion may update controls and reconcile an already fetched Home page;
it does not refetch core content merely to refresh a badge. A route/attempt fence
prevents stale completion from publishing into another route. Initial persisted
reading preferences may trigger one corrective refresh, but never override a chosen
view/sort, composition or a dirty editor. Unplaced-content lookup is separate,
bounded and fenced. An unavailable status is not a zero-pending success and paid
controls remain disabled when the status preflight is incomplete.

AI content itself remains necessary when the user explicitly opens the AI view:
a failed AI read is not rendered as a successfully empty AI presentation. This
round does not loosen provider authorization, ledger or transaction checks.

## Failure meaning

A cold failure says that this page has not obtained its data and that this does not
prove deletion. A retained failure can refer to a prior snapshot only for the same
Topic/view/sort/cursor/query. A visible retry button reissues the current core read.
Only a successful current core read clears that failure; optional status success
cannot bless a failed core refresh. Existing DOM/editor content is not cleared as
a response to an optional failure. Approximate legacy counts are visibly labelled.

## Genuinely read-only pre-repair diagnostic

`development/inspect-library-readonly.js` is an explicit Console snippet for the
**existing PAIA extension page**, not a deployable extension replacement. It does
not import or initialize any Store/ArchiveRepository and sends no runtime messages.
In particular, Round 2 `libraryCompatibilityStatus()` is **not** this diagnostic:
that method calls `finishFoundation()` and can write compatibility metadata.

The snippet enumerates the existing `paia-archive` database, opens the exact observed
version, aborts every upgrade (including a create-after-enumeration race), and uses
one native **readonly** transaction. It reads only Topic/Section structural fields,
placement counts, two migration-marker states and actual Topic index keys. It does
not read Source/Input/Entry body stores or unrelated metadata. Native Topic/Section
cursors materialize their rows internally, but the diagnostic does not inspect or
retain name/title/summary/body fields. Transient IDs used for intersections never
appear in the result. It emits a single aggregate JSON report, does not copy,
upload, repair, rebuild, invoke AI or create migration markers, and closes its DB
connection. It has explicit row/time ceilings and reports incomplete inspection.

A Section in one generation is structural evidence, **not** proof that this is the
user's current intended layout. Diagnostic candidate counts must not be treated as
an authorization to repair. Migration-marker counters are historical snapshots,
not current integrity measurements. Actual index gap is reported separately.

The development directory is excluded from release assets. Running this snippet
on a real database requires access to the existing extension context; no real
user database has been inspected by this round's automated tests.

## Verification

Local Node: new helper/diagnostic tests 12/12 passed; directly related existing
regression tests 121/121 passed. The native browser is managed in the chat runtime
and denied localhost and unpacked-extension access; those attempts are **not**
browser passes. Browser tests are submitted to a separate GitHub-hosted isolated
runner. Final run evidence will be appended after actual results are available.

New browser tests distinguish (a) production UI with native DOM and synthetic RPC,
(b) native IndexedDB diagnostic fixtures and (c) installed extension/service-worker
fixtures. All fixtures are synthetic. None is real-user acceptance.

Earlier broad-unit failures must not be explained away: two fixtures require
historical SHAs unavailable in the imported remote; the 10,000-input timeout needs
a controlled baseline/head comparison before attributing or excluding regression.
This round does not claim a clean full-suite result.

## Still gated

No merge/deployment merely from synthetic passes. Real pre-repair structural
measurements are still missing. Ambiguous layouts remain intentionally unresolved.
Round 2 AI-productization migration bookkeeping for skipped unresolved Topics is a
separate storage follow-up, not silently changed in this UI/diagnostic patch.
