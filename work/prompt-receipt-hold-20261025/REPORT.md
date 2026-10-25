# Prompt insertion receipt warm hold — 2026-10-25

Base: 027bc2f7fddd076b420fcf4179b7851fec9c0e53. This independent local successor changes only the original PromptInsertionReceipts owner and adds one synthetic owning test file. No worker/coordinator, content-script protocol, receipt schema, provider, activation gate, UI, version, workflow or resource ceiling is changed. Parent owns independent review and composition.

## Capability and invariants

The private original owner now closes new admission synchronously, retains and drains original pending work, and returns an opaque warm hold only after its bounded readonly ledger/gate/restore-epoch/generation snapshot contains no pending receipt. Original store, repository, database, database ID, API object, tabs/runtime objects and captured get/send methods must remain identical. The exact class prototype and captured prototype methods are checked; an instance shadow or replaced API is not accepted. Original SDK and producer source calls use captured Reflect.apply. Task observation uses captured native Promise methods and observes the actual operation rather than replaceable finally/race return values.

The complete register/resolve/action/ACK/reconcile/qualify operation is enrolled before its first await, including binding and original transactions. The rotation owner keeps its original synchronous mutual-exclusion flag; it is not enrolled into the same set it drains. Readonly pressure retirement excludes only the exact private task for that admission, never another live continuation. An admission awaiting its native read must recheck the hold before creating an action. Already-created but not-issued actions become invalid at hold entry. If their pending row has been committed, the original not_dispatched owner attempts its original terminal update. No physical insert may begin after hold. Already-issued transports retain original settlement and exact ACK logic; hold does not falsely invalidate their identity to force a pass. Later native QUALIFY admission is refused while held; no new provider/editor action is granted.

ACK and reconciliation may settle during an acquiring hold and are fully tracked. Once ready or failed, new ACK/reconciliation requests refuse without deleting claims. Unknown outcomes and rejected/unobservable registered publication continuations remain UNKNOWN even after the task set empties. A source timeout is not task completion: actual underlying promises remain enrolled. Failed/timed-out acquisition retains its admission block until release using the exact original failure Error object. Successful token release and failed-error release never replay an action, clear pending claims, grant a fresh budget or change the receipt epoch.

API for the parent coordinator:
- applicationSelectionSourceIs(store, api = privateOriginalApi)
- holdForApplicationSelection()
- applicationSelectionHeld(token)
- fenceApplicationSelection(token)
- releaseApplicationSelection(token)
- releaseFailedApplicationSelection(originalError)

The acquisition uses one original private work ticket and at most 30 seconds. Repeated fences share that same cumulative ticket/deadline. Original 4096 references / 2 MiB and dispatch/reconciliation budgets remain. Fences compare the original receipt ledger, gate, restore epoch and generation without repairing them. Scope is solely this warm owner: inspect still reports legacyCoverageUnknown=true and productionActivation=false. This cannot prove cold historical insertion silence, other workers, provider termination, global quiescence, existing-library activation or complete product acceptance.

## Validation, with all attempts retained

All execution used existing isolated Node22.23.3, macOS arm64 and synthetic SDK/fake IndexedDB. No native browser, external network, account, provider, cloud CI, build, large seed, 129-group recovery, install or deployment occurred. Existing pg8.23.1 was temporarily linked from the already-installed PAIA dependency directory and the newly created symlink was removed afterward; nothing was installed.

- focused-first.log: 12/12, 30525.495125 ms. The initial timeout test enabled fake timers after starting dispatch and left an original real wait timer; this is fixture overhead, not a product performance claim.
- focused-second.log: 13/15, two failures retained. A broad global Promise replacement reached the original repository outside this owner and was correctly refused. The timeout fixture incorrectly expected success after advancing the original operation deadline, then failed teardown. No repository guard was weakened.
- targeted-third.log: 2/3, the timeout expectation still failed; retained.
- timeout-fourth.log: corrected negative control 1/1. The timed-out dispatch must reject; pending remains until exact original ACK after release.
- owning-first.log: incomplete, exit1 after interrupting this owned invocation. Missing pg prevented the producer module from loading. Two original rotation tests failed because the initial wrapper had enrolled rotation into its own drain; this real implementation defect was corrected. The raw incomplete log has no aggregate pass. Source changed during that incomplete invocation, so it is not a final-source vector.
- rotation-and-sticky-fifth.log: 4/4 after fixing rotation self-drain and retaining rejected/unobservable continuation uncertainty.
- owning-final.log: **seven complete owning files, 222/222**, exit0, 46709.022 ms, zero failures/cancelled/skipped/todo. Exact file list and command are in commands.txt. Includes the unchanged original 501 synthetic cold-restart test; that is not a native or large recovery run.
- After that batch, the action admission's post-read hold recheck was added; admission-final.log is **4/4**, 386.336792 ms, including the new held-read case and existing pressure positive/negative cases.
- Internal initial/rotation Promise.resolve calls were then bound to the captured native function; captured-queue-final.log is **3/3**, 333.237833 ms.
- Final exact source: the complete new hold file is **19/19**, hold-final.log, exit0, 1203.221208 ms, no fail/cancel/skip/todo. The 222 aggregate predates those final narrow changes and is not relabeled a final 223 aggregate.
- Final owner syntax and source diff whitespace checks passed. source-vector.json binds the exact final owner/test and six unchanged original owning files. unchanged-boundaries.json records shared owners/gates/schema left untouched.

The new controls cover exact API/token/failure identity, genuine in-flight transport and native ACK/reconcile reads, failed/timeout hold blocking, pre-send not_dispatched, stale action admission, original ledger/gate/epoch/generation fences, late continuation registration, substituted SDK call/Promise race/finally, and sticky unknown. No test asserts that an empty task set means a provider or kernel process ended.

All earlier failures remain alongside the successful attempts. No push or integration is performed by this package. Independent review and parent combined validation remain required before integration; native and historical acceptance statuses are unchanged.
