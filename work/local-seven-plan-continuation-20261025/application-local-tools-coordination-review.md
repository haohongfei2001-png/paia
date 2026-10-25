# Fixed local-tools coordinator — independent review

2026-10-25. Reviewed root's new `application-local-tools-coordination.js`, exact service-worker construction diff, synthetic actual-worker bridge change and new owning tests after local-tool P2 successor integration (`7046e45` then `039e78d`, original candidates `d9ee08a`/`9c0f971`). Read-only review; no tests/runtime modifications by reviewer. No blocking issue identified in this fixed composition.

## Verified composition

The factory hard-codes ImportHandler, BackupService and IntegrityChecker. It captures their original prototype methods and invokes them with captured Reflect.apply on original instances. A caller-provided sourceIs method or copied object cannot self-qualify: the original private-field methods and full original owner identities still run. Private WeakMap registration binds the returned frozen coordinator to its exact store/runtime and current original owner identities.

All three original hold calls are started synchronously in one map before the aggregate await. This closes their new admission while an already accepted validator, original transaction or SDK publication may still be draining. The coordinator does not remove tasks or manufacture settlement. A changed control cut, real disconnect/revocation or failed child current check rejects the composition.

One outer monotonic deadline covers acquisition and every fence. Each already-started owner promise is observed before wait completion. Late acquisition success is released once through the captured original method. Original failed Error capabilities are used only for that original failed hold's release. Cleanup is scoped by active===state, so old completion cannot clear a newer active record. Failure to release a known original lease permanently closes this coordinator instead of issuing a partial permit. Foreign/repeated release cannot clear the successful current token.

The service worker only constructs this coordinator from the original `imports/backups/integrity/store/chrome.runtime` after normal initialization. No RPC or production command consumes it, default generation configuration is unchanged, and global activation remains denied. The synthetic bridge exposes objects only in the copied test fixture; production adds no global export or debug route.

## Evidence

Root's recorded actual-worker synthetic file passed **5/5**, 835.790917 ms. Cases cover retained Backup/Integrity sessions, foreign store/runtime/copied owner refusal, all three admissions closing before validator settlement, changed control snapshot, and the genuine `official-export-session` disconnect path revoking the grant and invalidating the hold. The file explicitly verifies default generation selection remains unavailable. This is Node/fake IndexedDB/Chrome API simulation, not native browser acceptance.

The earlier local-tool candidate evidence remains separately attributed in `local-tools-warm-hold-review.md`. Any subsequent related whole-file combination is separate evidence, not implied by this review. Global host/legacy insertion closure, historical financial outcomes, editor completeness and existing-library activation are still outside this token's scope.

## Reviewed SHA256

- extension/background/application-local-tools-coordination.js: `a731ccf5975ada6529d4f5153c061904a775f7810b16aa1820fad4bd343a1cf1`
- extension/background/service-worker.js: `ba71400da9405c7a663a8f2ac6952e9e885042df83d6e8a63ddfb540333cfd72`
- extension/tests/harness/selection-admission-worker.mjs: `b843bdb3a94eb9be84328162119c3723b255ac5daebd6486d702b5f7c4818463`
- extension/tests/application-local-tools-coordination.test.mjs: `3bbb32cf1c80e8f9662e9ab45396b98f813b1f1dcd217be3511bbec5a90c8900`
