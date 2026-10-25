# Current-top transport composition — independent review

Initial read-only design review, 2026-10-25. Root checkout observed `2733036f810715236e229994ae14bdc82ab2151a`. No source edits or test/browser/native executions by reviewer. Final candidate review is pending the implementation freeze.

## Concrete existing mismatch

`application-transport-coordination.js` currently captures the receipt owner's old worker-only hold/current/fence/release methods. Its `releaseLease` immediately sets `released=true` and tests `invoke(...) === true`; `cleanup` clears `active` before cleanup. The new current-top receipt release returns a Promise and can wait for actual HOLD transport followed by exact document RELEASE. Merely replacing method names would reject every asynchronous cleanup and, more importantly, could make new admission race ahead of late physical HOLDs. This requires a state-machine cleanup change, not a boolean wrapper.

## Required observed-state and race contract

1. The fixed three participants remain original source coordination, capture recovery and original receipt instance. Capture the current-top five prototype methods once; exact class/store/repository/database/API and original factory predicates remain. No fourth independent known-document hold and no caller-supplied list/readiness guard.
2. All three original hold methods must still be invoked synchronously before the first aggregate await, including when one throws. Track each started attempt through its actual fulfillment/rejection, separately from the 30-second wrapper. An early source failure must not strand a later receipt HOLD or make a new coordinator attempt admissible.
3. Cleanup invalidates `ready/current` immediately but retains this state's ownership while any original hold result or release is unresolved. A successful hold arriving after failure/close/timeout gets a private lease and its matching original release exactly once. An owner rejection uses that owner's exact error for failed-release; an invented aggregate error is not proof.
4. Release success requires actual Promise settlement to literal true. Mark release-started before invocation, but do not mark release-confirmed until that result. Synchronous throw, rejection, false, unobservable thenable or expiration cannot mean released. Keep actual raw outcomes observed; timeout is not cancellation.
5. Release, close, hold-failure cleanup and fence-failure cleanup share an idempotent state-owned cleanup operation. Concurrent/repeated/foreign calls may not dispatch duplicate RELEASE, clear a later state, or turn an old false result into success. A rejected participant may not prevent remaining original participants from receiving their own cleanup.
6. A bounded wait on cleanup uses the original aggregate deadline, not a fresh 30 seconds per release/fence. Owners retain their own original work ticket/accounting. At deadline, public current/hold must remain closed/suspended even if late RELEASE eventually succeeds; later observation is cleanup evidence, not renewed qualification. No retry, fresh ticket or replacement owner to make it green.
7. Fences remain sequential original-owner fences with exact private state/identity checks before and after every await. A topology event, SDK identity mutation, close, or overlapping release while a fence waits invalidates the aggregate. The fence's late success cannot restore ready state or return true after cleanup started.
8. A successful current-top token can fail current after a topology event without an exact failed-error identity being recorded by the receipt. Cleanup must use its retained successful token in that case, not guess an error or fall back to old worker-only release.
9. The receipt owner precharges exact cleanup, waits for real HOLD settlement before RELEASE, retains pending real SDK work, and returns false for unknown/expired early enumeration. Composition must honor that false, not clear its holds itself. Read-only tab/FENCE late work may still settle; composition cannot relabel it kernel/global quiescence.
10. Promise observation uses captured original primitives and observes rejection even if a deadline has already expired. A local wrapper rejecting does not prove its underlying SDK task ended. Preserve original timeout/failure evidence in tests and documentation.

## Suggested meaningful controls for implementation (not run by reviewer)

- Successful three-owner hold/fence; actual receipt release held pending: aggregate current false immediately, new hold refuses, release completes only after exact ACK.
- Source/capture rejects while receipt inventory/HOLD is pending; receipt eventually resolves to a token; one RELEASE is sent and cleanup does not return early.
- Late receipt rejection with its exact error; failed-release result false and pending raw work keep aggregate non-reusable.
- Simultaneous close/release/fence rejection and a duplicate release: one physical release per original lease; foreign/replayed token cannot clear a new state.
- Same 30-second deadline reached during cleanup and then late true: public timeout stays restrictive and original promise remains observed.
- Topology change/current false after acquisition cleans by original successful token; no old worker-only fallback.
- Async release returns false/rejects/never settles; other participant releases still happen and no unhandled rejection or false success occurs.
- Original class/API/store mutation before/after awaited fence refuses; replacement instance or forged DTO cannot enter composition.

## Scope limit

Current-top is the observed nonempty supported ChatGPT top-document inventory at the captured process state. It is not global/cold/legacy closure. `legacyCoverageUnknown=true`, no production activation/global gate, no SDK mutation authority and no restoration of old consent remain unchanged. Async cleanup correctness alone does not qualify activation.

## Final frozen review

Pending implementation identity, complete diff and separated test evidence. This initial document is not final approval of a candidate.

## Initial implementation review — held pending two corrections

Read-only candidate: `current-top-transport`, base `2733036`, runtime SHA256 `e039b2f124cf5d0ffc0febee430beffc708373296e81e0da15154f485d2219e4`. No candidate tests had run at this review point. Fixed three-owner identity checks, same-turn hold admissions, exact late token/error release, original 30-second deadline, and opt-in real adapter VM / real worker receipt fixture were inspected. The fixture supplies synthetic browser metadata but does not synthesize successful HOLD/FENCE/RELEASE responses: those come from the actual adapter and receipt owner. This remains a synthetic integration check, not native browser evidence.

- **P2: untracked accepted fence.** `fence()` passes the original owner's returned Promise only to `wait()`, whereas `finishCleanup()` waits only for acquisitions and releases. If `release()` is called while a source/capture/receipt fence is still pending, releases can settle and clear `active` before that original fence. The old continuation subsequently refuses because the state is invalid, but cleanup has already reported success and a new hold can enter. Track the actual accepted fence Promise separately from its deadline wrapper; cleanup must retain ownership through actual settlement. No new fence may be invoked after cleanup begins. Root independently found the same issue.
- **P2: failed cleanup changes into successful close.** A release false/rejection sets closed, but `finishCleanup()` clears `active`; subsequent `close()` then returns true without any new release evidence. Preserve the exact final cleanup result/promise across repeated close calls. A terminal admission gate alone does not justify reporting failed physical cleanup as successful.

Both findings were sent to the implementation agent and root before execution. Final approval is withheld until the narrow successor and exact evidence are reviewed.

## Narrow static follow-up

Successor runtime SHA256 `5f8357c9cc34ab8dc6004a8d5dde6fa36f1e1967d39137ac79849311e3602b27`; new test SHA256 `5750bfedafa34d7ba023ee4069e0cba0df1eb6767a0e44de5c0da47a9793fc60`. Both P2 findings are closed in the inspected source: `fenceOriginal` increments before invocation and decrements only on the original returned Promise's settlement, and `finishCleanup` includes that counter; `lastCleanup` preserves the exact original cleanup outcome after active clears. Cleanup still invalidates admission immediately, never renews the deadline, and does not treat timeout as original settlement. Late fence completion cannot restore current.

The new test holds the real adapter FENCE response while the real RELEASE response has already returned; it asserts release remains pending and new admission refuses, then checks late fence rejection and exact cleanup. Existing false/reject controls now assert repeated close remains false. No synthetic successful receipt or fourth owner was added. No further static blocker found in this narrow successor. Implementation agent was told to proceed only with the already root-authorized owning combination; final execution/commit evidence remains pending. Reviewer ran no tests.

## Execution evidence follow-up (implementation execution only)

Read original `combined.log`/`combined-result.json` and corrected command/result/log. One complete three-file invocation (`application-transport-coordination.test.mjs`, `application-transport-current-top.test.mjs`, `application-worker-admission.test.mjs`) ran on Node 22.23.3/macOS arm64: **20/23**, exit 1, TAP 3263.736791 ms. No runtime source changed. Three newly added test expectations were corrected, then only those three ran: **3/3**, exit 0, TAP 645.061708 ms. This is not one complete 23/23 invocation.

The two failed RELEASE tests incorrectly expected all Prompt sources to re-hold even while the receipt correctly retained its UNKNOWN restriction. The corrected tests separately re-acquire original local-maintenance and capture owners, and explicitly require receipt `PROMPT_INSERTION_HELD`; aggregate remains closed and repeated close remains false. The pending FENCE correctly rejects with original receipt `OUTCOME_UNKNOWN`, rather than the test's expected aggregate code. Its pending-cleanup/no-new-admission and eventual release assertions remain. These corrections preserve the actual safety semantics instead of weakening runtime. Original failing source and logs are retained.

Final new-test SHA256 `8b68993d86b2e8a61f338374a93bc9e365f1d0b913e3be888982ca409c2d8114`; runtime remains `5f8357c9...`. Dependency cleanup receipt records only the owned symlink removed after verifying its exact preexisting PAIA dependency target, which remains intact. No reviewer execution, native browser validation or global activation qualification occurred. Final commit/manifest verification follows below when frozen.

## Final frozen conclusion

**No remaining blocker found for this narrow local candidate.** Exact commit `f16ac431b3719fd039dd1ca9fd637ba7bcd1da63`, parent `2733036f810715236e229994ae14bdc82ab2151a`; candidate worktree is clean and has not been pushed. All four final source files match the committed bytes and `source-vector.json`. All 19 evidence entries match the manifest; manifest SHA256 `ce793912bd6524b35b540e7bf18e8995fce84f1276d909a2cde8886adb162175`. An initial verifier command used the repository directory rather than the manifest-relative evidence directory and could not locate the files; correcting the read-only verification base verified all entries. This was not a source/test failure or re-execution.

Final four source SHA256 values:

- `extension/background/application-transport-coordination.js`: `5f8357c9cc34ab8dc6004a8d5dde6fa36f1e1967d39137ac79849311e3602b27`
- `extension/tests/application-transport-coordination.test.mjs`: `5df7b1406d028e45a6bc411a2c376c16656eb6280ba691dd24fde2d5d84ba26d`
- `extension/tests/application-transport-current-top.test.mjs`: `8b68993d86b2e8a61f338374a93bc9e365f1d0b913e3be888982ca409c2d8114`
- `extension/tests/harness/selection-admission-worker.mjs`: `832799537978f42c289a6be5d1d1b16ffd819edb5261268f3b623eaf7444f8c5`

The two static P2 findings and three test-expectation corrections are resolved at these exact bytes. Evidence remains **20/23 plus corrected 3/3**, ordinary local synthetic worker/adapter checks only. Receipt historical coverage remains UNKNOWN; no production/global selection activation is enabled or certified. This review authorizes no further execution quota, native/browser validation or deployment. Reviewer made no runtime edits and executed no tests. Review task complete; no new feature work opened.
