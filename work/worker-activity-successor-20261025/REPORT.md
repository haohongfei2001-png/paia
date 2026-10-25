# Original worker activity identity and bounded drain preparation

2026-10-25. Independent local worktree `worker-activity-checkout`, branch `codex/local-worker-activity-20261025`, exact base b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac. Two runtime paths and one new focused test; no original admission or selection test edits. The actual worker path is `extension/background/service-worker.js`.

## Implemented scope

`createApplicationWorkerActivity.dispatch(callback)` creates and registers the single original accepted Promise before invoking the callback. It gives that invocation an opaque frozen control backed by a private WeakMap record: original factory, exact accepted Promise, original monotonic deadline and liveness. The entire original worker response/error chain is returned through dispatch; tracked children, notifications, local successors and other accepted requests remain visible.

An internal helper accepts only an original selection commands object privately bound to the same factory and its live invocation control. A factory accepts exactly one original selection owner; a copied owner, forged/missing/foreign/ended/reused control cannot exclude work. The helper excludes exactly that one accepted Promise, preventing a future admitted selection handler from waiting on itself. It does not exclude a prefix, a sender, other requests or every task started by that handler.

Ordinary `drain()` has no exclusion even if a caller supplies an extra argument. Both drains are bounded by a maximum 30-second limit. Production construction uses 30 seconds; tests exercise smaller constructor limits, invalid or enlarged limits are rejected. The control deadline starts at dispatch, not at a later drain call. Only one drain owns a factory at a time. A second request fails without releasing the first owner. Completion, failure or expiry invalidates the exclusion; timeout does not clear the real task set, cancel tasks, roll back writes or declare global quiet. Late settlement can release the actual task but cannot revive its expired control.

Promise constructor, resolve and then, Reflect.apply, monotonic clock and timers are captured. Captured functions are invoked through captured Reflect.apply rather than mutable `.call` properties. The original selection command handler receives the control through an internal third argument. It currently does not invoke the drain helper: existing activation/continue/restart protection gates are unchanged. No new public DTO field or action permission. This is bounded identity preparation, not activation implementation or an application quiet/host/provider receipt. A future admitted consumer still needs original source ingress holds and owner revalidation.

## Validation

Actual runtime: existing official Node 22.23.3; local synthetic tests only. No native browser, account, network, cloud, install, deployment, large fixture or push.

- `owning-first.log`: new 15-case file plus unchanged original application-worker-admission file, **25/25**, exit 0, 1296.186709 ms.
- Added strict single selection-owner binding and explicit missing-control refusal; final four-file owning combination **36/36**, exit 0, 3761.643584 ms, no failures/cancel/skip/todo. Files: new activity-control, original worker-admission, original selection-consumer and original selection-editor-safety.
- Coverage: callback-before-registration hazard; exact self exclusion; independent accepted request/child/broadcast waits; ordinary drain cannot exclude; private owner/control identity; owner collision; timeout preserves actual work; late settlement; original deadline not reset; remaining-owner and successor tails; captured Promise invocation despite own-call/resolve substitutions; synchronous/rejected handlers; invalid budget limits.
- Original three owning test files are byte-identical to base, recorded in `original-owning-byte-preservation.json`. All three changed/new JS files pass syntax; whitespace check passes. `source-vector.json` binds final source and original owning test files.

No failed test result occurred in this work package. Earlier Context successor evidence is a separate work package and is not imported. These synthetic and harness-worker tests do not count as real browser acceptance, provider qualification or overall seven-plan completion. Independent root review remains required before integration.
