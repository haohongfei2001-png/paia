# Original current-top transport composition — local candidate

Base: `2733036f810715236e229994ae14bdc82ab2151a`. Branch: `codex/local-current-top-transport-20261025`. This is a local-only continuation of the existing runtime consumer, not global activation, native browser acceptance or a published release.

## Scope and resulting behavior

Only the existing transport coordinator, its original owning test, one focused test file and opt-in synthetic worker fixture are changed. The worker constructor remains unchanged. Exactly three original members remain: live source coordinator, capture recovery, and current-top Prompt receipt owner. The last member replaces the warm-only receipt hold; its own original private holder includes receipt admission/drain/ledger. It is not acquired a second time as a fourth member. Local tools and extension editor holders remain separate.

All original acquisitions start before aggregate await. The fixed aggregate 30-second lifetime spans acquisition, fences and cleanup; it does not renew. Every original accepted acquisition, invoked fence and release is counted until its actual promise settles. Partial failure starts cleanup for all already-owned members; late successful leases are released exactly once and the exact original error is used only for the original failed-owner cleanup contract. Aggregate admission remains exclusive until all original acquisitions, fences and releases settle. False/rejected/unknown/timed-out cleanup closes conservatively. Deadline/observer cleanup is not physical cancellation. Release and close reuse one original cleanup promise; repeated close retains false or rejection instead of inventing success.

Current-top original RECEIVER_REGISTER, reconciliation, HOLD, FENCE and RELEASE are actually consumed. The opt-in fixture runs the unmodified real adapter in a VM and communicates with the actual service worker/receipt owner. Only browser metadata and message transport are synthetic. It does not manufacture ready tokens, native insertion receipts, successful ACKs or caller permission. Default fixture tab lookup and source/capture setup remain unavailable/unchanged. The fixture awaits asynchronous coordinator close before closing its own database.

## Pre-execution review corrections

Root/source reviewer identified that original in-flight fence promises must also remain counted while release occurs. The first draft is preserved as `transport-pre-fence-review.js.txt` (SHA e039b2f124cf5d0ffc0febee430beffc708373296e81e0da15154f485d2219e4). `fencesPending` is now installed before original invoke and decremented only on actual settlement. A real adapter FENCE delayed in its SDK response, concurrent successful RELEASE reply, and refused next acquisition prove this boundary. The source reviewer also required sticky cleanup results after active becomes null; repeated close now retains its original cleanup promise. These were static findings before execution, not failed tests.

The original timeout control was adapted before execution because capture and current-top use the same exact tabs.query request. It blocks the deliberately earlier capture request and waits for the actual adapter HOLD before recording the query count. Release still issues no new query. It does not broaden a runtime API or substitute a quiet result.

## Exact validation, separately reported

Node v22.23.3, macOS arm64. Only existing dependencies were reused: both service lockfiles SHA256 `bb5db079329901c8124ce14620444eae5a49a70d72069c7a9bf642421857bc0c`, original pg 8.23.1. The one newly created exact dependency symlink was verified and removed after terminal test completion; its existing target is untouched.

1. One authorized combination of three complete owning files: original transport 5, new transport 8, default worker admission 10 = **20/23**, exit 1, no cancel/skip/todo, TAP **3263.736791 ms**, wall **3302.072125 ms**. Input bytes and entire log retained. Source vector unchanged during execution.
2. Only the three failed new cases were corrected and rerun: **3/3**, exit 0, no cancel/skip/todo, TAP **645.061708 ms**, wall **677.778958 ms**. No runtime changes between the two executions; only assertions/independent-source proof in the new test changed. This is NOT a single 23/23 run.

The first two failures incorrectly equated successful release of original source ownership with eligibility for a new complete source hold. A failed document RELEASE correctly leaves the receipt owner restricted/UNKNOWN, so its Prompt source member cannot be re-qualified. Corrected cases prove independent local-maintenance and capture admission is released, assert exact `PROMPT_INSERTION_HELD` remains for receipts, aggregate reuse refuses, and repeated close remains false. The third case expected aggregate `GENERATION_WORKER_NOT_QUIET`; the actual delayed original receipt FENCE returns `OUTCOME_UNKNOWN`. The exact original code is now asserted without changing production mapping. All unchanged original/default cases passed in the first combination and were not repeated.

Covered new behavior includes delayed original RELEASE settlement; duplicate release/close promise identity; source acquisition failure with a successful late current-top lease and delayed cleanup; false/rejected release with other-owner cleanup; missing receipt-only profile; incomplete current-top inventory; topology invalidation released via the successful original token; and concurrent in-flight actual FENCE/release. Original invalid/copy/foreign-owner controls, capture admission invalidation, fixed deadline/pending capture, full current-top fence and continued global refusal remain.

## Boundaries and remaining work

`legacyCoverageUnknown` and original ledger state are preserved. Current top documents are not a complete historical/restorable document universe. No new startup/cold/birth certificate is inferred from an empty ledger, a new worker or matching profile. ACTIVATE/CONTINUE/RESTART stay closed and configuration remains null. The coordinator does not include local tools or extension editor holds, does not issue a global permit and does not consume Sync restriction as permission.

No native/browser, cloud CI, Full, build, downloads/install, real account/data/model, permission/configuration changes, deployment, push or merge occurred. Spent acceptance budgets remain spent. No runtime from the HELD mixed Source/Working candidate was included. Further global selection prerequisites are documented separately in `reviews/global-selection-next-implementation-scope.md` for the parent handoff to dot; this package does not reopen that feature line.

`command.json` and `corrected-command.json` retain exact invocations. `input/` contains all four first-combination source files; `input-vector.json` and `corrected-vector.json` separate the assertion correction. `source-vector.json` identifies final bytes; `SHA256SUMS` binds this report and all evidence except itself.
