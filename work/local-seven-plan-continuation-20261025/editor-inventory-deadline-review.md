# Editor inventory reservation and deadline — independent review

2026-10-25. Read-only review of current root runtime and original owning-test diff. No tests or runtime edits by reviewer. Existing baseline new controls0/2 retained; current three-file owning log reports28/28,1876.575125ms.

## Finding requiring correction

**P2 — an old asynchronous fence/timer can invalidate a newer freeze.** At application-editor-guard.js:69, the fence catch unconditionally calls global invalidate(). Sequence: acquire original token; begin a repeated fence whose getContexts is deferred; explicitly release the old token; acquire a new freeze; let old getContexts return. wait correctly rejects because the old state is no longer live, but the old fence catch then increments global generation and invalidates the new active freeze. This is a code-path finding; reviewer did not execute it.

The per-member PREPARE/CHECK timers at63/69 have the same unscoped invalidate callback. release at70 sets member.resolve/reject to null without canceling or settling the old member wait timers. An old callback can therefore fire after release and affect a new hold on the same member.

Scope invalidation to the original record r for asynchronous stage callbacks. Release must cancel/settle only r-owned waits and timers; old cleanup must not touch new member handlers. Keep already-issued inventory observed without calling it canceled or safe. Add narrow old-inventory late-settlement and old-timer controls, preserving new-hold identity and old rejection.

## Verified correct parts

The new record/active reservation happens synchronously before first inventory await, so blocksMutation denies that interval and a concurrent second freeze cannot overwrite the first. Inventory still requires the exact registered ready document set and valid sender membership. In PREPARE only previously registered unacknowledged members may flush; after ACK/fence mutation is blocked. No activation authority or new page permission is added.

One record deadline is assigned before initial inventory and reused by PREPARE waiting, CHECK waiting and inventory rechecks. checked denies expired tokens, so a later repeated fence cannot renew its30seconds. wait observes already-issued work and treats a late inventory result as a rejection. Initial freeze failure releases only its private token; the unresolved late inventory does not become proof.

The new current tests establish synchronous reservation and deadline expiry, but do not exercise the repeated-fence-release-new-freeze sequence described above. Whole28/28 is not evidence for that missing boundary. Global activation, host/background completeness and physical browser coverage remain out of scope.

## Initial reviewed hashes

- extension/background/application-editor-guard.js: 1c31841de08f97d7d6c05ef3034ed50affea9f5ee2d3a5c70caafdad91078b04
- extension/tests/application-editor-guard.test.mjs: a4727008b2f54c53c5a8d0519deb4b7d1d2400700da338e80896e1eb82beedb0

## Final correction review — finding closed

Re-read the final two-file diff and recorded execution logs after the owner-bound waiter correction. The P2 above is closed for this scoped change; no further blocking issue identified.

`invalidate(expected=active)` increments the global generation only when no record exists or the expected record is still the active one. A stale fence catch now passes its original `r`, so late inventory rejection invalidates only that old record. PREPARE/CHECK callbacks likewise carry their original record and each waiter settles once, removes itself from `r.waiters`, and clears its original timer. Explicit release rejects outstanding original-record waiters; it only clears member handler slots when `member.wait.owner===r`. Previously queued callbacks may still execute, but they cannot revoke the new record or settle its handlers.

The private active reservation before first inventory, original registered-page-only PREPARE flush window and one deadline across inventory/PREPARE/CHECK/recheck remain intact. Expired tokens never become valid again. Late inventory is observed until its actual settlement; timeout/release do not claim to cancel browser work. This does not prove all host/background writers are held and does not open global generation selection.

Added controls cover initial inventory timeout followed by a new freeze, repeated-fence inventory settling after old release and a new freeze, and already queued old deadline callbacks firing after a new freeze. Evidence remains separate: initial baseline controls **0/2**; first whole-file combination **28/28**; corrected three-whole-file combination **30/30**, 2078.129209 ms; subsequently added queued-timer targeted control **1/1**, 42.030083 ms. The separate late-settlement targeted result was **1/1**, 86.697083 ms. No final 31-test aggregate was run or claimed. Reviewer ran no tests.

Final reviewed SHA256:

- extension/background/application-editor-guard.js: `5e58c3383d234580c82a485a7275eae656c1e6c399453313b05ad39dced6810a`
- extension/tests/application-editor-guard.test.mjs: `7a25621b1a84a14156d2d46f0c5376d0458e8578e21c6e12437f6c2f9a46cee8`

## Final UI completion boundary — three-file review

The additional real UI path exposed a distinct late-completion failure: after the original page PREPARE times out and is released, the same page can successfully acknowledge a newer freeze. The old asynchronous prepare then used to send `DENIED` with its old nonce; the worker correctly rejects a foreign/stale message but consequently invalidates the current hold. Recorded `editor-late-page-baseline.log` preserves this **0/1** failure (82.183 ms).

Reviewed the narrow correction in `extension/ui/application-editor-guard.js`: after the original prepare settles, a disposed page, changed serial claim, or changed held nonce returns without sending any completion for that superseded request. A still-current claim with unavailable registration remains unsafe and sends DENIED. Current failed prepare/current checks still deny, original interaction invalidation still emits INVALIDATED, and disconnect while held still preserves the blocked draft. The change suppresses only stale completion publication; it does not treat an old save as canceled, saved or safe, and does not release the new page hold.

The new control uses the actual UI client together with the actual guard: delay the first prepare, expire it, acquire the second freeze, settle the first prepare, and require the second token and page freeze to remain valid. `editor-late-page-final.log` records **4/4** (56.538084 ms) including original disconnect, interaction and invalidation controls. This targeted result is separate from the prior 30/30 and queued-timer 1/1; no final three-file aggregate is claimed. No runtime or tests were executed by reviewer. No blocking issue remains in this three-file scoped review; global completeness and activation remain unqualified.

Final three-file SHA256 superseding the preceding two-file test hash:

- extension/background/application-editor-guard.js: `5e58c3383d234580c82a485a7275eae656c1e6c399453313b05ad39dced6810a`
- extension/ui/application-editor-guard.js: `a694b410e757ae7c75706377a3b59c87b1ce934dc1f03bc732533d0ff9d1df55`
- extension/tests/application-editor-guard.test.mjs: `c1415ec1ed9d7e8616d57a321d8d58a550c94b4bde17596022741e10b78b48de`
