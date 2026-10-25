# Warm reverse captured-owner read-only review — 2026-10-25

Base `5f0bab08e8812252c5abf0b49d3a7023d6ae0bf5`; independent branch `codex/local-warm-reverse-review-base5f-20261025`. Only the original application selection owner, its new focused synthetic test and this evidence directory change. No shared repository API, global gate, Settings, lifecycle, provider, harness, or actual rollback dispatch changes. Local-only; no push.

## Delivered

After a successful original forward select, the same live owner may explicitly call `prepareReverse()` to produce an opaque READ-ONLY observation token. Expected source/target full raw tables are derived only from its retained original prepared cut. The selected source marker, control reservation, digest/fences, target control revision and target canonical gate's exact three original writes are derived from the original record. No current marker is accepted as its own expected proof. No table or unknown row is filtered. Original complete registry root and control row also match.

`reverseReviewCurrent(token)` checks the original captured instances, tails, identities, lifetime, SDK get/set and private original write observations. `requalifyReverse(token)` reads and compares the complete raw source and target again, plus root and control. Both use the SAME private original ticket/deadline; the token is not a DTO, caller proof or capability for rollback, hold, dispatch or activation. Existing `rollback()` still always refuses with `GENERATION_REVERSE_INHERITANCE_REQUIRED`; no production caller or gate is connected.

**Scope limitation is tested, not hidden:** a real second target connection can edit after the final target read while original SDK get is pending. This invocation can return its old observation token and `reverseReviewCurrent` can be true, since the fence observes the captured repository instance only. Requalifying that exact token with full raw reads then refuses and preserves the edited data. This is neither global reverse readiness nor a database-wide lock. A future consumer would require genuine global holds and a distinct durable reverse protocol; neither exists in this slice.

## Budget and pending work

The one original source ticket accumulates 4096 references / 2 MiB / 30 seconds across initial preparation and every requalification. Source reads are metered by its original work window; every target row/result, registry/control result/key and comparison operand is charged to that same ticket. Target page requests/probes are conservatively charged as `1 + 2 * floor(rows/64)` per table, and all actual IDs are charged as a bound on probe-key bytes. Exact multiples of 64 overcount one reference. This is conservative logical work accounting, not measured native I/O or heap cost. Existing per-transaction limits remain.

The public call has a race using the remaining time of that same ticket. A deadline can reject the caller while the original SDK observation is unresolved, but busy and the original work window remain until the actual operation settles. Late fulfillment never creates a valid token. Close and original owner/SDK/write-observation changes are sticky. A fresh explicit `prepareReverse()` is allowed only after the old review is invalid and real pending work has settled; it is a distinct explicit local review, never an automatic requalification or retry. The timeout control verifies a second request remains busy before settlement, then a fresh explicit review is possible. Repeated same-token requalification reaches the shared budget and does not renew it.

## Evidence and retained failures

- New positive against original base: **0/1**, method absent (`baseline.log`).
- First positive implementation: **1/1** (`first-positive.log`).
- Independent review found an unbounded SDK wait by static inspection; prior implementation is retained as `pre-deadline-core.txt`. No invented runtime negative result is claimed for that finding.
- First complete new controls: **17/18**, exit 1 (`controls-first.log`). The same-owner attempted write test incorrectly expected later `GENERATION_SELECTION_PENDING`; the original active work/fence correctly rejected first with `STALE_BASE`. Early assertion failure also left its pending promise unobserved. Its exact test source is retained in `controls-first-test.txt`. The runtime was unchanged to correct this expectation; the test now observes rejection immediately and releases in finally.
- Corrected isolated write-observation control: **1/1**, exit 0 (`corrected-write-observation.log`).
- Final five whole files once: **63/63**, exit 0; 0 fail/cancel/skip/todo, TAP **17939.559084 ms** (`owning-final.log`, exact command in `result.json`). Source SHA256 checked unchanged before/after that run. The new file contributes 18 cases.

Final cases cover genuine forward selection, new/cold/unselected/UNKNOWN rejection, real target Working edit, raw source/target drift, exact gate/control/marker/root/local mismatches, copied/foreign token refusal, SDK replacement and close, same-ticket exhaustion, close during final SDK await, original write admission even on abort, other-connection limitation and full revalidation, and timed-out actual pending work.

Node 22.23.3, macOS arm64, synthetic fake-IDB only. No native/browser, cloud CI, Full, large-scale seed, install, build, account/model access, remote push, or actual reverse/rollback was run. No prior acceptance allowance was reused. This is not native/global/whole-product acceptance.
