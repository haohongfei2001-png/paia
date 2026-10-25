# Original local tools warm hold — independent review

2026-10-25. Read-only review of frozen local candidate `d9ee08a` in `local-tools-warm-hold`, based on `bf7e5cb`. Reviewed four owner files, the new private helper, new controls and recorded logs. Reviewer did not run tests or edit runtime.

## Findings requiring correction

### P2 — fence waiting is not bounded while the original store queue is blocked

`extension/core/local-tool-selection-hold.js:37` awaits `snapshot(h)` directly. Snapshot first enqueues through captured `store.run` (line 22); the original repository work-ticket check only runs once that queued callback is entered. Consequently an unrelated pending queue operation can keep the fence promise pending indefinitely, even after the original hold's 30-second deadline. `held()` correctly becomes false after expiry, but that does not settle an in-flight coordinator wait. Acquisition has a timeout race; fence currently does not.

Use the same original `h.deadline` for a bounded wait around the original snapshot, attach its rejection observer before any expiry check that may throw, and invalidate only that original hold on failure. Do not renew the ticket/deadline. Keep the late original queue/transaction observed until actual settlement, with no false cancellation or completion. Add a narrow acquired-token → blocked original store queue → fence deadline → late queue settlement control, including a newer hold if released/reacquired.

### P2 — a real Import disconnect can no longer revoke its authorization grant while held

`extension/core/import/ledger.js:236` now runs `#selection.admit()` before `revokeOwner` deletes grants. Original `ImportHandler.disconnect` calls this method, and the real `service-worker.js:184` disconnect callback catches and suppresses its failure. During a hold, actual page disconnection therefore leaves its existing grant in memory; explicit hold release makes it usable again despite the original revocation event. The current new test asserts this refusal/preservation, so a green run does not establish the previous authorization revocation behavior.

Do not treat the real disconnect as an optional new business mutation or silently postpone it. Revoke the original owner's grants immediately, invalidate any affected original warm hold, and keep already-issued tasks accurately tracked. Exact failed/token release may reopen intake for genuinely new authorized requests, but must not revive the disconnected grant or replay work. Keep normal user pause/cancel semantics separate. Add original-handler disconnect during acquisition/held state and verify grants remain revoked after release, with no stale token becoming current.

## Verified properties and boundaries

The helper itself is exported and accepts an `original` callback; it must remain restriction-only machinery, never an authenticating global owner. In this candidate it is privately stored in each exact original class. Class methods access private fields, compare exact original prototype/method vectors and captured store/repository/database/SDK bindings, and reject foreign tokens. A caller-created helper does not install its token in an original instance. Future root composition should invoke captured original class methods on the original instance, not trust a DTO's self-reported `sourceIs` method.

Every wrapped public asynchronous entry adds its actual pending promise before invoking the body. Settlement removes only that task. Private nested Backup restore/preview/validation/settings paths and Integrity page/scan retain the outer task instead of re-entering public admission and rejecting their own accepted work. New entry while held fails before execution; admitted queued writes check the captured serial at transaction entry. Already-entered transaction/SDK work settles normally, and the helper waits for actual operation continuation.

Backup's issued SDK publication cannot become a successful proof merely by timeout: pending task remains, and blocked marker cleanup leaves the original recovery marker. Acquisition refuses pending recovery-settings and local-control reservations; Import refuses every durable nonterminal task rather than clearing tasks/grants to manufacture quiet. The revocation finding above is the exception requiring correction.

The same original recovery work ticket is reused for snapshots and repeated fences. The 4096-reference/2 MiB budget is not replenished per fence. Cumulative budget and foreign-release controls exercise these boundaries. Snapshot transactions are read-only. Integrity begin/page/scan still use only read transactions, keep their static session/count state and add no Foundation initialization or repair writer.

This establishes only a proposed warm local-owner hold. It does not prove cold historical closure, external provider settlement, editor/host completeness or global generation selection authorization. No worker/coordinator activation change is present.

## Evidence read

- Original affected 15 whole files: **119/119**, 9843.145417 ms, zero fail/cancel/skip/todo.
- Later cumulative-budget/foreign-token additions: **2/2**, 310.257125 ms, runtime unchanged.
- Earlier 23/23, 13/13, 17/17 and issued-SDK 1/1 are separately retained.
- No final 121-case aggregate is claimed. Current controls do not cover the queued fence deadline; the grant-preservation control encodes the revocation regression and must change with the fix.

## Reviewed hashes

- extension/core/local-tool-selection-hold.js: `7110bc5bee68652c3dfd878ee1f084b0bfda6fb7a59fa03a0959ff7847984153`
- extension/core/import/ledger.js: `6c52b653a197165589d0d7bf4cfe35bcefe46508e45cf8131b12e4019120d7cd`
- extension/background/import-handler.js: `fa84692fcfe8085b66ca7e93b97b7ce508a3e48f0f982eaf64bc7a3f7f05b39a`
- extension/core/backup-service.js: `1f383e6b21c70988b21174667071e257108ddebb086b1bfa85d95db3170e7150`
- extension/core/integrity-checker.js: `cef9c6de5c65fe5c305a6bc2542d6cc2e8cfef6a8a10a45dd15226f54b5b0d51`
- extension/tests/local-tools-selection-hold.test.mjs: `3b5be67d5e9740d00b72a48683e6a373d381f8ccefe287ad635d3a241d8f4c69`

## Implementation follow-up (author response, not independent re-review)

Both P2 findings reproduced as 0/3 new controls on d9ee08a and corrected in successor `9c0f9714d8028b84b42e2bfc7b109d1cd4627172`. Fence uses the original deadline, observes actual queued/native probes through late settlement and drains them on reacquire. Genuine revokeOwner invalidates the hold and immediately revokes the original grants. Final minimum owning combination is 43/43; original wider 119/119 is not relabeled as successor execution. Full explanation, original failures and exact command: `local-tools-warm-hold/work/local-tools-warm-hold-20261025/REVIEW-FOLLOWUP.md`. Await root independent re-review.

## P2 successor review — both findings closed

Reviewed successor `9c0f9714d8028b84b42e2bfc7b109d1cd4627172` and its exact three-file implementation/test diff. Both findings above are closed; no further blocking issue identified in this local owner package.

The new bounded helper attaches an original snapshot observer before reading remaining time and uses the existing hold deadline for both acquire and fence. Timeout changes only the originating hold's validity; actual queued/native probe promises remain in a private set until real settlement. A later explicit release and new hold cannot bypass old pending probes, and old callbacks cannot clear the newer hold. The same repository work ticket continues across all proof reads.

Real Import revocation now invalidates the private admission serial/hold and synchronously deletes original-owner grants. It never requests new admission, so acquisition/held states cannot swallow disconnect revocation. Already-issued tasks remain tracked; old admitted work not yet at its transaction callback rejects on the changed serial even after release. Invalidating a warm proof is not a claim of task cancellation or provider settlement.

Evidence read and kept separate: three new controls on parent runtime **0/3**; initial correction **3/3**; pre-polish whole-file check **43/43**; final three whole files **43/43**, 787.002834 ms, zero fail/cancel/skip/todo. Old wider **119/119** belongs to the parent runtime and is not reattributed to this successor. No tests were run by reviewer.

Final changed-file SHA256:

- extension/core/local-tool-selection-hold.js: `648744cbe2a90552cba5834537d571014ca6f046274f569800b37984b4041695`
- extension/core/import/ledger.js: `ffda43c4b9f38870b3db197ea00127908ed1d9d8eaecfc01b3c343ce572e295a`
- extension/tests/local-tools-selection-hold.test.mjs: `2aab1a19c87e1e5ea703c158120bcb1fd2504f0b7fa402bda25a5d7941a5f0cc`
