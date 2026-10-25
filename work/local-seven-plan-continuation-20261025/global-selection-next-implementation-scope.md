# Current original-owner selection frontier — 2026-10-25

Read-only audit requested at root 30a99ca0b3b76b2c2fbc336700264cb2754f8c4e, containing a3359fd current-top inventory. Root advanced independently to 2733036f810715236e229994ae14bdc82ab2151a while this audit was read; no source or tests were changed or executed by this audit. The Source mixed candidate 7eabab1 remains HELD and untouched.

## Decision

There is a concrete next local implementation: **make the existing fixed transport coordinator actually consume the original current-top receipt driver, including its asynchronous original cleanup**. It replaces the old warm-receipt member in the existing three-member composition; it does not add a fourth member or declare global selection complete. Parent confirmed this three-member scope. No new browser permission, account, legacy migration, resource allowance, or product design is required.

A successful bounded current-top composition cannot yet authorize ACTIVATE or CONTINUE. Its missing initial document-universe/lifetime witness is a real absent input, not an implementation-complexity excuse. The new package still has an existing concrete consumer, `service-worker.js:126`, and improves that consumer rather than creating another free-standing readiness token.

## What is genuinely present now

- `prompt-insertion-receipts.js:244–279`: complete current top-tab metadata inventory, exact document enrollment, original receipt admission/drain and durable-ledger checks, exact document HOLD/FENCE, final inventory and original asynchronous RELEASE. The same private work is charged and deadline-bound. Extra known receivers cannot be silently dropped. This supersedes the old report saying no current-top inventory exists.
- `adapter/chatgpt-composer.js`: current constructor is receipt-only, bare birth insertion refuses, old Symbol constructors are not overwritten, pagehide retires the original document and final native entry checks retirement. Original HOLD requires receipt-only profile and terminal acknowledged insertions. This supersedes the old report saying the new constructor still allows bare legacy insertion.
- `application-worker-coordination.js`: actual fixed live source owners, including bounded Organize and default null Assist identity, close admission synchronously, then drain/fence under the original deadline. It is not an old placeholder.
- `capture-recovery.js`: actual original capture API identities and pending issued scripts are tracked through private holds. Timeout/release never proves Chrome-side cancellation.
- `application-local-tools-coordination.js`: actual Import/Backup/Integrity hold exists and is constructed at worker line125. It remains separate in the next package.
- `application-editor-guard.js:67–83`: current extension-page inventory, original port membership, PREPARE/FROZEN/CHECK, fixed deadline, late-result ownership and admission are already implemented.
- `sync-local-lifecycle.js:192–228`: actual accepted-task accounting, exact original reviewed-owner reservation, Context settlement requirement and conservative release. Reservation restricts the core owner; it is not activation authority.
- Core selection already has full private source/target raw cuts, same-review requalification, actual marker/control publication protocol and a captured-SDK lifetime guard. These should not be reimplemented.

## Actual next three-member composition

`service-worker.js:124–126 -> createApplicationTransportCoordination` currently contains:

1. original source coordinator;
2. original capture recovery;
3. `PromptInsertionReceipts.holdForApplicationSelection` (warm-only).

The original receipt prototype capture in `application-transport-coordination.js` must instead bind the existing current-top hold/current/fence/release/failed-release methods. Current-top already uses `#selectionHold` internally, so warm and current-top **cannot** be acquired as separate members. Doing so would double-acquire the same original gate.

The current coordinator's `releaseLease` compares the return value directly with `true`, and `cleanup` clears `active` before release completes. This is incompatible with current-top's genuine Promise-returning cleanup. Merely changing method names would prematurely reopen aggregate admission and misclassify an unfinished release as failure/completion.

### Minimum implementation contract

- Keep three fixed original members and their captured original methods/identities. No generic callback registration, caller boolean, substitute receipt, copied factory or runtime source.
- Every member's original hold starts before any aggregate drain await. Preserve the original source/capture scope.
- Keep one aggregate fixed 30-second lifetime for acquisition/fence/public bounded cleanup; do not renew on each member, fence, timeout or release. The current-top owner retains its original 4096/2MiB/30s work; this composition does not claim a new global cumulative resource certificate.
- Track every accepted original hold until its actual promise settles. Timeout can reject the caller, but cannot forget outstanding ownership or allow another aggregate acquisition.
- Release exactly each original successful lease once, including leases arriving after aggregate failure. Failed receipt/capture cleanup uses the exact original failure object only where that original contract allows it. No clone/error-string release.
- Keep aggregate exclusion while original acquire/release settlement remains outstanding. Async successful release reopens only after all original accepted attempts and cleanup results are known. False, throw, rejection, unobservable or timed-out cleanup never becomes quiet; close conservatively while still observing actual late work.
- Never interpret cancelling a timer/observer as physical work completion. Late old callbacks must not clear a later state's admission.
- Preserve original UNKNOWN, legacyCoverageUnknown, ledger and actual action state. No automatic refresh, page close, replay, new capture, grant, browser launch or new RPC.

### Ownership and tests

Implement only `extension/background/application-transport-coordination.js`, its original owning test plus a dedicated async/current-top test if useful, and a narrow extension of `extension/tests/harness/selection-admission-worker.mjs` for opt-in synthetic current-top metadata/message routing. Existing source/capture fixture defaults must stay unchanged. Worker constructor arguments do not change. Parent retains worker/shared integration ownership.

Necessary original-owner controls: complete actual worker + real receipt current-top hold/fence/release; original registration/profile and full inventory failure; copied/foreign source identities; synchronous admission closure of all three owners; delayed original document RELEASE blocks next hold; late original HOLD following failure is released exactly once; release false/reject/unknown and deadline preserve closed state; pending capture remains tracked; no replay/new script; no new global permission. Compare ledger rows and original ACTIVATE/CONTINUE/RESTART refusal. Synthetic browser metadata/transport is explicitly not native browser acceptance. Do not rerun previous owner-wide suites or spent native/CI experiments.

## Remaining global consumer gaps: exact chains

1. `application-selection-commands.js:22` rejects ACTIVATE/CONTINUE/RESTART. `present()` reports all activation flags false; the factory at worker line198 receives only isolation/ready/lifecycle/activity. It does not consume editors, transport or local tools. Production configuration returns null. An activity drain only observes actual accepted worker tasks and excludes its own dispatch; it is not a hold.
2. `sync-local-lifecycle.js:193` acquires `holdOriginalApplicationSelectionReview`; core `activate/requalify` intentionally reject while this restriction exists. No fixed consume-under-reservation interface exists. Releasing restriction then awaiting more work before ordinary `activate()` would open an admission gap. An eventual fixed one-way original-owner consumer must maintain restriction and check real global ownership at the final synchronous SDK dispatch; no arbitrary binder/readiness callback and no core-to-background import cycle.
3. Core `activate():144` and `finishSelection():255` enforce actual reviewed-cut/lifetime/SDK identity, but their guard explicitly is not a host proof. Cold `continueOriginalApplicationGenerationSelection` reopens durable markers and can continue the original dispatch protocol without a surviving warm holder. It therefore needs its own complete safe admission/settlement design; warm success cannot authorize cold continuation.
4. Requalification currently accepts only full raw equality (`requalify():113–139`). Genuine editor flush/Context close-ledger settlement can change the reviewed cut. Such changes must be caught and require a new explicit review or an independently specified exact original transition, never stripped metadata or unconditional reprepare. The next transport package will not weaken this.
5. All original holders must eventually be composed under one real overall action lifetime, excluding the selection request from its own activity drain. Local tools and extension pages remain separate. Partial subset leases are not an all-owner writer fence.

## Why “new bounded session, no legacy/UNKNOWN” is not yet an observed production shape

`PromptInsertionReceipts.inspect():64` always reports `legacyCoverageUnknown:true`; a newly created ledger at line66 also sets true. No API changes that to a trusted no-history fact. `#initializeBinding():65` binds database/restore epoch and prior ledger epoch, not all original browser document lifetimes. Current-top inventories only currently enumerable ChatGPT top documents, not every old resumable execution context. The startup event relay merely preserves change notifications; worker onInstalled stores update status and onStartup reconciles Sync/maintenance, neither supplies an original birth/universe witness.

Thus “all current pages are receipt-only and have no pending claims” is real evidence but does not prove that an older constructor in an unseen resumable document cannot resume an already accepted native edit. Seeing a fresh worker, absent/empty ledger, new runtime version, synthetic clean tab list or all current probes pass cannot fill that missing premise. Current pagehide prevents the new constructor's future resume; it cannot retroactively execute in an old constructor. Conversely this report does not claim an actual such old page exists in the user's browser: its absence is unproven.

A future usable global positive requires an original, trusted initial-universe/retirement contract that covers pre-upgrade/restorable contexts, or a separately authorized explicit environment boundary with that proven property. The existing manual-refresh decision permits refreshing observed old pages; it does not authorize forced browser reset, closing tabs, clearing unknown outcomes or treating refresh of current pages as complete lifetime coverage. This cannot be fabricated by a local fixture. Genuine historical UNKNOWN must retain original reconciliation semantics separately from physical quietness.

The recommended next transport package is therefore implementable now and has a real runtime consumer. Completion must be reported as current-top transport closure only. Global ACTIVATE/CONTINUE/RESTART, full lifetime coverage and native acceptance remain closed/unperformed.
