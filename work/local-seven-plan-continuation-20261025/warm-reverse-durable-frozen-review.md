# Frozen warm reverse durable WIP review

Disposition: **HELD / NOT INTEGRATABLE**. Exact commit `f19171d3c3f612c298fa3dd84e9d1a1f79934601`, base `54e15e911c297dd687d7162b7dcacb576c644c23`. Read-only independent source/evidence review; no test or browser execution. Four source hashes and all eighteen evidence hashes match. Working tree is clean.

## Confirmed narrow properties

- The new no-argument low-level method requires the original forward private owner/cut and never consumes a caller readiness token, target, generic issuer or global proof. Production rollback/RPC/global gates remain denied.
- One original A ticket is privately attached to fixed A/B/registry operations. Native transaction accounting uses that ticket's remaining resources, including fixed active-publication preparation reads. Ordinary ambient/explicit recovery mixed with selection remains rejected. A readonly nested preparation child must match the actual pending parent; child cleanup cannot clear the outer pending operation.
- `runReturn` now invokes captured Promise resolve/then through captured apply. Caller timeout invalidates and reports failure but does not clear the original busy/active-return ownership before the actual operation settles. Warm identity checks cover original owner/core/repository/factory/name/database/tails/SDK methods and fixed registry identity. Earlier mutable-source omissions were corrected before this freeze.
- The final synchronous pre-SDK check occurs after the actual full A/B comparisons and exact local control observation. The intended control uses current selected control, not old `p.before` grants. One original SDK invocation is attempted; no retry is present.
- The new minimum-completion check can refuse insufficient remaining capacity, without refunding, charging a second reserve, resetting the deadline or minting another ticket. It is explicitly only a lower bound.
- Cold unfinished `continueReturn` is read-only, reporting before/after/changed and `completionRequired: original-live-work`; it cannot call settleReturn or SDK set. Cold cancel always rejects, and inspect now reports cancelAvailable false. No persistent accounting exists to authorize replenishing the old write with a new ticket.
- A receipt put and exact reservation/marker removal are in the same final A transaction, after B terminal. Failure before that completion leaves the restrictive marker/reservation path in source rather than marking success. The final receipt key has ordinary put/delete/clear guards. This source observation is not a successful return demonstration.

## Integration blockers and evidence limits

1. The unchanged positive remains failing. The captured accounting run reached B terminal after SDK and exceeded the original 2 MiB budget: 2,104,221 bytes, 1,574 references, versus 2,097,152 bytes allowed. A terminal receipt/cold-open/legitimate A edit sequence is not delivered.
2. The newer pre-SDK lower-bound refusal does not reserve or prove sufficient capacity for all actual finalizers. Its one negative control passes and preserves intent/reservation and cold zero writes/SDK, but predates the last receipt guard reads. Do not call it final-byte whole safety validation or claim every possible post-SDK failure was directly observed.
3. Cold write recovery is deliberately absent. Intent can remain locked/incomplete after an unsuccessful operation. This is safer than silently creating a new ticket, but is a remaining functional gap, not a completed durable recovery protocol.
4. Three final-byte receipt-key controls use an explicitly invalid sentinel only to test key protection. They do not create or certify a genuine terminal receipt. The metadata consumer/portability integration is still absent; group-checkpoint-scope was not changed.
5. Existing V1 and shared IDB/active-publication owning regressions were not run on these changes. New marker/receipt guard reads alter ordinary transaction work; neither compatibility nor full cumulative accounting acceptance is established by syntax checks.
6. Exact historical application/publication source snapshots at each failed attempt and per-phase actual counters are unavailable, as the author explicitly records. The standalone forward calibration is not the failed reverse's observed cost table. Keep these facts UNKNOWN.

## Verified result separation

I read the actual original failed accounting output and failure-safety output. Baseline and all positive attempts remain 0/1 failures; the original positive test still expects returned/cold-open success and was not rewritten into a refusal test. Separate pre-dispatch refusal is 1/1; separate final receipt guards are 3/3; final parse checks are 4/4. No combined green conclusion or successful terminal recovery is justified. The report and BUDGET-AND-CONTINUATION.md accurately label the archive held and preserve these distinctions.

Do not merge/cherry-pick this WIP into the active application. Keep it as an isolated engineering archive while other independent local plan work continues. Any future successor must solve original whole-cut/finalization accounting and durable continuation without weakening CAS, restoring old permissions, creating an extra budget or calling known-subset host evidence global authority. This review does not authorize another positive run or a changed resource model.
