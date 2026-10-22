# Sync owning Node preflight: eight failures, minimum harness repair

Independent successor branch: `codex/sync-preflight-followup-20261022`, based on `b492a7df57cc89cb538fb28376a991785828c157`. Fix commit: **`9c7175b5732b58ca630024d0e3ca09a0a71c17bb`**, tree `40cfd0f8144b92a453e20b12a3719df559ac6888`. The fix is independently cherry-pickable: only three test/harness files change. PR313 stays at `22bd30f19b3d5ecb8074b334d7e3ae019f6bbb7e`; no runtime, workflow, version, PR312, Draft state or main change. Dot owns the acceptance candidate update and independent review.

## Original cloud failure identity

[Full run 39735101169, attempt 1 / job 119679193202](https://github.com/haohongfei2001-png/paia/actions/runs/39735101169/job/119679193202) tested the PR merge **`c80110db807248ff997aecc5094234c92439fc20`**, tree `5a32d74a5480fa052481d8887975284debe6f9f0`, not the bare PR head. Its parents combine head22bd30f1 with base4349189451821db1e408a669cee5b64b140844f6. Node was **22.23.3** on Ubuntu.

First original command: **735 tests, 727 pass, 8 fail, 0 skip**. Shell exit1 prevented the second configuration command. The receipt correctly remained `INCOMPLETE` with configuration log missing, and the receipt verifier failed accordingly. This second failed workflow step is a consequence, not another test/runtime defect. The dependent Sync native storage job was skipped; it has no passing native evidence from this run.

[Original node.log](evidence/sync-preflight-20261022/cloud-original-node.tap.gz) is preserved in lossless gzip form, reconstructed byte-for-byte by removing only GitHub's per-line timestamp transport prefix from the decoded job log. Its **284892 bytes** and SHA256 **`2619e8d856b39da66e12847bd36e7ffd852b632570953a89a66b29a51fef274b`** exactly match the [original workflow receipt](evidence/sync-preflight-20261022/cloud-original-receipt.json). [Original artifact12407161109](https://github.com/haohongfei2001-png/paia/actions/runs/39735101169/artifacts/12407161109) remains separately identified. No original failure is relabelled PASS.

## Diagnosis of all eight failures

| Cloud case | Original file / failure | Cause and minimal correction |
| --- | --- | --- |
| 629 | human-branch-witness-fixture: complete runtime inventory | Frozen witness inventory predates the static original-owner split and Organize dependency additions. Recompute the actual root closure and save the exact sorted set: 233 → 260 files, +31/-4. |
| 663 | retention-dispatch: lazy barrier/shared task | VM fails during original Repository helper initialization, before the test body reaches the barrier assertions. |
| 664 | retention-dispatch: no task for non-native cleanup | Same missing VM platform constructor. |
| 665 | retention-dispatch: setup/cleanup failure closes ports and forbids retry | Same missing VM platform constructor. |
| 666 | retention-dispatch: preserve primary error when cleanup fails | Same missing VM platform constructor. |
| 667 | retention-dispatch: final cap assertion/no awaited success window | Same missing VM platform constructor. |
| 670 | retention-fixture: complete runtime/proof inventories | Frozen retention runtime inventory predates those imports: 341 → 348, +10/-3. Proof inventory remains exactly23, unchanged. |
| 672 | retention-receipt: reject malformed/non-native/body-bearing receipts | The initial valid sample fails the exact-key check because fresh runtime hashes include the new dependencies while the frozen expected inventory does not. After inventory correction, the original negative mutations execute and still reject. |

The five VM failures are specifically `globalThis.AbortSignal === undefined` in the isolated VM. The original verified attachment added the Repository's capture of `AbortSignal.prototype.aborted` (`idb-repository.js:58`) for original Organize cancellation. The sliced helper now includes that initialization, but the fixture still supplied only Event/EventTarget/MessagePort/MessageChannel/IDBTransaction. The correction supplies **Node's real AbortSignal constructor**, preserving its actual accessor/internal-slot checks; no stub, optional fallback, swallowed error or production guard change is added. This cause is distinct from the later five-class module split.

The inventory changes cover the actual static/literal imports, including `*-owner.js` and Organize action/processing modules. Former façade files are removed only where they are no longer reachable from that inventory's roots. Retention still includes thought-store/store façades when its broader roots reach them. No runtime files are deleted. Independent closure recomputation and exact equality assertions are unchanged; expected values are not dynamically set to the receipt's own claims. The [complete set delta](evidence/sync-preflight-20261022/inventory-delta.json) lists every addition/removal.

These are reproduced **test loading/evidence inventory regressions**, not evidence of a Sync runtime algorithm failure. This conclusion is confined to these eight failures. It does not certify every effect of the preceding runtime refactor or claim actual native retention passed.

## Verification and preserved assertions

On the unchanged successor baseline, the four owning files reproduce **10/18 pass, the same8 failures**. After only the three-file correction they pass **18/18**. Next, execute both complete original preflight command argument lists with their unchanged globs, defaults and tests: **735/735** and **132/132**, all zero fail/skip. Separate preflight receipt contracts pass **11/11**. These counts overlap; do not sum them into a distinct test total. No entire project Full or browser suite was repeated.

Actual local runtime: **Node22.23.4**, macOS; the patch version/OS differs from cloud22.23.3/Ubuntu and is recorded rather than claimed identical. Existing exact dependencies were reused. [Commands, hashes, before/after TAP and machine receipt](evidence/sync-preflight-20261022/receipt.json) are committed. The original workflow command hashes are verified by `originalNodeCommands`; only tee destinations were redirected into this task's evidence directory. Workflow commands and CI receipt requirements are unchanged.

Self-check established that the dispatch test's bytes outside the constructor injection/comment are identical, including every assertion. The tests still check lazy allocation, shared one-shot task, all six setup/cleanup failures, reachable-port closure, no retry, primary-error precedence, held charge on unproved drain, and final cancel/control/scope/repository refusal with no later await. Original receipt checks still reject missing/duplicate/skipped/non-native/body-bearing rows, wrong hashes, network activity, altered scope/identity and incomplete ledgers. No timeouts, bounds or assertions are removed. `git diff --check` passes.

## Delivery boundary

Cherry-pick the three-file fix only when dot selects the next acceptance candidate; this branch does not push into PR313. The separate evidence commit records results but adds no runtime behavior. Independent review and exact updated-candidate Full/Sync native storage remain pending. Do not infer native PASS from the now-passing Node preflight or issue a fake PASS receipt for the original failed run. No cloud retry/deployment, paid service, credential or permission change was performed.

The earlier detached-promotion STALE_BASE investigation remains independently unresolved; these eight failures have different, directly reproduced causes and do not close that issue.
