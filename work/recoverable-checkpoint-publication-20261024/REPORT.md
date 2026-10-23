# Recoverable checkpoint publication — 2026-10-24

Base: `8f1fc0f68f66c3c91c12e14e00f43d9e857fa1c1`. Branch: `codex/recoverable-checkpoint-publication-20261023`.

## Delivered behavior

A host-owned `RecoverableCheckpointPublication` now produces a recoverable original grouped checkpoint, rather than only publishing an operations segment. It constructs the original Google Drive appData or OneDrive appFolder adapter, uses the original grouped checkpoint compiler and original restore/discovery engine, and makes the final owner-scope manifest discoverable only after ordered immutable object publication and exact readback. The synthetic HTTP services implement the original adapters' HTTP contracts; no network function is used.

Both providers pass complete Source/Working and mixed Source/Working/Human/Topic/Placement/manual Prompt chains: A publishes, its repository closes, independent fresh B discovers solely from cloud objects with no A storage/factory/secret/in-memory task token, B restores and cold reopens, genuine Working/Human edits create a causal successor, and independent fresh C discovers/restores it. Exact readbacks include original Working text, Human body, Topic with receiver-secret-derived keyed name token, Placements and Prompt preference row. Receiver secrets are independent. The original group owning tests also retain Context and other admitted portfolio behavior; this does not claim every possible canonical archive is supported.

## Frozen host API

```js
import {RecoverableCheckpointPublication} from './checkpoint-publication.js';
const publisher = new RecoverableCheckpointPublication(core, {
  store,
  binding: {provider: 'google-drive-appdata', ...qualifiedOriginalProviderBinding},
  request: alreadyQualifiedHostRequest,
  isCurrent: combinedBinding => originalAccountAndGenerationStillCurrent(combinedBinding),
  timeoutMs: 30000
});
await publisher.status();
await publisher.prepare();
await publisher.publish();
publisher.pause();
publisher.resume();
publisher.close();
```

`provider` is `google-drive-appdata` or `onedrive-appfolder`. Google binding has subject/clientId/generation/scopes; OneDrive adds the original consumer tenantId. No credential/token is accepted in binding. The producer passes the combined binding (including provider) to `isCurrent`; that callback must validate the captured host account/generation, not an RPC DTO. Provider request receives its original stripped binding. The producer internally creates a distinct transport per action and closes it in finally; do not supply a preconstructed transport.

Status is idle/not-prepared, or `{state, taskId, ref, readiness, verified, objects}`. State is prepared/publishing/confirmed. Only confirmed has readiness `recoverable-checkpoint-confirmed`; other durable states report `checkpoint-publication-incomplete`. `prepare()` performs read-only discovery and local preparation plus durable receipt storage; it does not upload. A previous unfinished job is returned unchanged. `publish()` requires that same durable job and exact local cut. Calling prepare after confirmed creates a new explicit causal publication. Calling publish after confirmed verifies immutable references without duplicating uploads. There is no automatic retry, timer, auto-start, or caller transport slot. Lifecycle/worker/Settings are outside this commit and require explicit integration by their assigned owner. Default disabled lifecycle remains its responsibility; simply importing this module performs no IO.

## Durability, scope and request fences

The fixed original local journal is bound to dataset/device/database/namespace and complete provider binding, with body-free task/cut/refs/progress. Exact original get/set methods and control publication observation are required. One readback can settle a lost committed local set ACK; ambiguous writes do not get an automatic retry. The original local key stays exclusively quarantined until an outstanding original set actually settles, even when pause/deadline has returned to the caller.

Each object becomes attempting durably before dispatch. Cold unknown attempts and previously verified objects are GET-only; a missing object returns `BNS_CHECKPOINT_PUBLICATION_UNKNOWN`, never blind recreation. A lost OneDrive session-creation response remains blocked if no exact object exists. Account/generation or namespace changes refuse the old durable job; there is no automatic migration/reset.

Before every POST/PUT the producer reconstructs the exact original committed cut through a local capturing transport, then the provider checks work identity, account/generation, signal, budget and deadline plus an unforgeable private proof in the same synchronous frame as request dispatch. The proof comes from the original compiler result held in a WeakMap and binds the original Store queue tail/control token and method identities. A clone is not a capability. Paused old GET requests cannot borrow a new resumed action. Late async qualification after provider timeout/close cannot dispatch. No await exists between final assertion and host request invocation. Already dispatched requests cannot be retracted; their receipt is unknown and must be read back.

Only the original committed grouped compiler is opted into this dispatch proof. It refuses currentHuman/currentSourceWorking/currentMixed/sourcePurge projection flags in this path. Unsupported canonical owners or unjournaled content fail closed; there is no broad metadata whitelist, source deletion-body export, namespace wipe or acceptance based only on matching bytes. Supported source-only purge after preparation invalidates publication before first body write. This does not introduce portable negative checkpoints or cloud purge. Original provider sidecar records are consumed under the original group/protocol ownership rules; repeated preparation after actual adapter allocation/readback succeeds in the full chains.

A prior checkpoint is a parent only if its historical revisions are all present exactly in the prepared checkpoint. A different local Source cannot adopt a remote latest timestamp as causal proof. Current ordinary limits remain 4096 references / 2 MiB / 30 seconds. Discovery/pages/logical object reads and retained local objects are bounded; original provider HTTP budgets still apply. No special 8 MiB or scale-recovery budget is used. No performance or Linux capacity claim is made.

## Evidence, including all earlier failures

All log files below are retained; earlier passing rounds are not substituted for final source certification.

| Log | Result | Meaning |
| --- | --- | --- |
| first.log | 5/10 | Three OneDrive fake HTTP key-order fixture errors, original Filter purge guard rejection, invalid spaced foreign message identity. Original guards were retained; fixtures were corrected. |
| second.log | 10/10 | Both adapters' original complete chains, before later fence additions. |
| third.log | 23/23 | Added unknown/local receipt/control checks, before final dispatch fence. |
| dispatch-fix.log | 29/29 | Initial dispatch fence checks; predispatch GET initially selected earlier discovery read and old per-work adapter issue not yet closed. Not final proof. |
| fenced.log | 34/36 | Final runtime fences; two mixed readback assertions incorrectly expected A's keyed Topic token in B despite independent secrets. Runtime untouched by correction. |
| fence-targeted.log | 14/14 | Correct receiver-secret assertions plus final late-dispatch, purge, pause, original pending set, proof and old-work race checks. |
| final-owning.log | 157/157 | Final unchanged source, five owning files in one invocation; exit 0, no fail/cancel/skip/todo, TAP 9126.461792 ms. |

Final command uses the existing official isolated Node 22.23.3 binary:

```text
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test extension/tests/checkpoint-publication.test.mjs extension/tests/browser-native-sync-google-drive.test.mjs extension/tests/browser-native-sync-onedrive.test.mjs extension/tests/browser-native-sync-local-recovery.test.mjs extension/tests/browser-native-sync-group-checkpoint-restore.test.mjs
```

The final existing grouped owning file contains its old exact128 operations/129th admission boundary test. That small Node case was inadvertently included with the whole owning file and executed (one Source plus 121 small Prompt operations). It is NOT the earlier one-off 129-group Human recovery, did not load that data, and supplies no evidence for that failed/exhausted run. No additional repeat was made; parent was notified explicitly. New producer tests use one Source per fixture and small mixed owners.

`node --check` on both new native preparation files and `git diff --check` passed. A final static bridge review corrected the packaged helper import/copy (tests are excluded from the temporary extension); only the unexecuted bridge changed after the final Node batch. The prepared Source/Release native bridge uses original harness, exact source/runtime hashes, independent native DB reopen and network ledger checks, but was NOT EXECUTED. No browser, release build, cloud/CI, real account, credentials, model, deployment, scale seed or original 65/129-group recovery was run. Process-local late-write quarantine is tested with original local adapter promises; no unsupported cross-process crash durability claim is made.

## Integration and reuse

Eight source/preparation paths are listed with exact bytes in source-vector.json. Only group-checkpoint and the two original providers change existing production files; lifecycle/worker/Settings/Prompt are untouched. The provider optional dispatchQualification defaults to null; old users add no qualification IO. The new private compiler proof is opt-in with default false.

Independent reviewer recovery_completion read the final runtime and fence-targeted evidence and found no new specific blocker in this bounded producer. They did not execute tests or native bridge. Their review confirms unknown already-dispatched writes are not retractable, and cannot certify an entire product.

Reuse the final-owning.log for these exact bytes; do not repeat earlier diagnostic rounds or the old scale recovery. Follow-up integration must use explicit complete checkpoint preparation/publication, present truthful supported scope, and preserve unknown receipts. Native qualification and actual worker/Settings reachability remain later integration work, not claimed here.
