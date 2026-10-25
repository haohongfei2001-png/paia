# Capture recovery live hold owner — 2026-10-25

Base: b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac. Only background/capture-recovery.js and its original capture-recovery.test.mjs change. This is an independently reviewable local owner candidate; no worker consumer or global selection gate is wired.

## Original gap and change

The original per-tab pending Map did not cover repairAll waiting for isolation or its tab query. No original intake gate prevented a later probe or packaged-world executeScript after a global preparation began. The original owner now tracks its accepted repair and repairAll promises and captures an admission serial. A synchronous hold closes intake first and advances that serial before it awaits the actual task set. At each later await boundary the old task refuses the next query/get/probe/world dispatch. An already-issued executeScript promise remains tracked until actual settlement; nothing cancels Chrome or claims that its side effects did not occur.

Held original eligible events or explicit repair calls are not admitted and invalidate the live receipt. They do not create a replay queue. Unsupported events still do nothing. Interrupted already-accepted work returns {status:'interrupted',reason:'application_selection_hold'}; newly rejected intake returns {status:'not-admitted',reason:'application_selection_hold'}. Neither is an injection-success or Chrome-cancellation acknowledgement. Ordinary unheld calls retain the original behavior and successful return shape. Any original accepted-task rejection observed during a hold invalidates it; the private original error is retained with that acquisition, never promoted to settled-safe proof.

The acquisition has one fixed 30000ms timer; no phase refresh. On timeout/failure the intake gate remains closed and original unresolved promises remain tracked. The rejected Error identity is kept privately for explicit release; it is never a held/fence token. Copies, equivalent errors and duplicate release fail. Explicit release permits future original eligible events/repair calls; it does not cancel outstanding scripts or certify quietness. Their old admission serial remains invalid even after release, so late completion cannot dispatch later worlds. A new hold must still drain that old physical promise.

All original host restrictions, exact probed documentId pinning, manifest script/world selection, same-origin top-frame health-only probe, bounded startup grace and ordinary single-flight forced update handling remain. No listener/site/permission/reading expansion, reload, forced tab stop, new automatic injection, persistent metadata or data schema is added.

## Actual synthetic verification

- New hold-contract baseline against unchanged owner: 14 selected tests, 1 pass and 13 fail (missing owner methods), 63.455292ms. Full before.log retained. The passing original withheld-permission case matched the name filter incidentally.
- Initial four whole owning files: 28/28, exit0, 68.101542ms. This preceded the parent refinement requiring timeout to stay held until explicit release; initial candidate source and result/log are retained, not called final evidence.
- Final four whole owning files after retained-failure refinement: **30/30**, exit0, 53.736584ms; no fail/cancelled/skip/todo. Full after-retained-failure.log and exact command/exit receipt retained.
- Actual Node22.23.3/macOS arm64. API/Chrome responses and deadline passage are synthetic; no browser, native capture, network, cloud CI, Full, install, build or deployment. Timer testing uses the original Node mock timer API to advance the fixed 30000ms boundary without changing the production budget.
- Controls cover pending probe, partial packaged-world dispatch, isolation and repairAll query wait, startup grace, all five eligible event sources, timeout→explicit release→still-pending second hold, late completion, executor identity replacement, accepted script rejection and request during acquisition. The full pre-existing owning behavior, CI wiring and frozen capture bytes also passed.
- git diff --check passed. source-vector.json binds before/after hashes and unchanged worker/selection/UI/content/manifest boundaries. No runtime test dependencies were installed.

## Minimal root integration interface (not implemented here)

Retain the exact return value at the existing service-worker install site, e.g. const captureRecovery = installCaptureRecovery(chrome, ready). If capabilities are absent the function still returns undefined; missing owner is NOT proof of quietness. Pin this original instance/method identities rather than accepting caller DTOs or copied callback objects.

Returned frozen owner adds:

- applicationSelectionSourceIs(originalChrome): captured scripting/tabs/runtime objects and relevant original method identity.
- holdForApplicationSelection(): closes intake synchronously; resolves private token only after all accepted work settles without invalidation; rejects original Error on failure, while retaining hold.
- applicationSelectionHeld(token): private successful token, same source/admission, valid acquisition, no accepted pending tasks.
- fenceApplicationSelection(token): final synchronous live predicate wrapped in async; rejected exact token invalidates its state.
- releaseApplicationSelection(tokenOrOriginalFailure): accepts only that successful acquisition token or the exact Error rejected by its failed acquisition. A failed Error is never accepted by held/fence. Release is idempotent by refusal after the first call and does not resume/replay tasks.

Root should begin this hold in the same synchronous admission-closing phase as other owners, before the shared drain, and record both successful tokens and exact rejected Error objects for explicit cleanup. If another owner fails, await/release late successful capture holds too; if capture acquisition fails, releaseApplicationSelection(theExactCaughtError) is necessary to reopen its intake. A mere string/code cannot release it. Do not pass raw failure objects through public RPC as capabilities.

This token is live capture-owner evidence only. It is not host/editor freeze, cold historical settlement, permission to switch generation or evidence of global quiescence. Root must retain selection hard gates and existing UNKNOWN requirements until the complete consumer is separately reviewed. The worker source was not edited. Parent owns combined review, coherent versioning and any later authorized acceptance.
