# Source / Working incremental receive into an existing device

2026-10-23. Base: `be57727a`. This is the complete finite nonempty-device package on the existing Source/Working typed owners; it is not all Sync, a cloud qualification, or a capacity fix.

## Delivered behavior

An existing qualified Source/Working device can receive a compatible complete checkpoint from another device while retaining its live namespace, local canonical data, queued outbox and local retry receipts. The union is compiled before writing by the original branded current Source/Working graph compiler. Same-Input forks, missing ancestry, partial groups, invalid sequence/dependency relations and stale staged local baselines are rejected. Different Inputs and independently appended Sources can progress in both directions. A new original conversation/document bootstrap is supported through its original owner too.

The actual writes still use `applyBootstrapApplication`, `applyAppendApplication` and `InputWorkingCommitReceiver.applyRestored`. The original `foundationWrite` begins its private work budget before its first query. Incoming canonical rows, Core protocol, exact per-operation receipts, a body-free transaction chronology and the checkpoint merge receipt commit in **one bounded transaction**. Failure rolls back that whole checkpoint merge. This differs from the earlier saved-work incremental path, which has durable per-step commits; this package does not change that path.

A restarted consumer or an explicit retry after a lost return resolves the original durable merge receipt without issuing another canonical write. The device can continue local Working edits, receive another compatible successor and export a newly qualified current cut to a cold third device. No existing device is cleared to simulate a cold restore.

## Qualification and data protection

The body-free timeline records original transaction grouping, original graph digests and exact referenced group identities. Current export reconstructs those groups using the original compiler and authenticates each merge receipt against actual typed operations; it does not invent UI history or treat wire allocation counters as the receiver's local physical allocation. Local wire chronology remains contiguous. Full canonical rows, derived indexes, Source/Input provenance, Working history, protocol receipts/frontiers/heads and unknown namespaces still pass the existing exact qualification.

The final result uses a private comparison bound to the original plan/scope and the just-validated raw snapshot for its terminal raw fence. The same-transaction result check preserves the **pre-write** ordinary metadata, local outbox, local operation receipts, prior invalidations and untouched filter rows. Only four local counters may change, each derived from the original replay. The original `syncArchiveYearIndex` is replayed over the original before metadata and verified index projections to predict legitimate disposable annual-index changes. This is not a prefix exemption. The selected staging namespace must retain every row except its exact predeclared restore state transition. The terminal fence preserves every canonical table count and exact row, all nonsemantic metadata and original predicted semantic/backup finalizer values.

Three real pre-seal negative tests showed why the pre-write preservation is required: after the original Working owner finished, deleting a queued local outbox or changing the suppression key or gate previously committed. All three original failures are retained; the corrected path rejects all three and rolls back all 37 tables. Tests that mutate only after the seal were insufficient to prove this boundary.

## Scope and limits

- Actual synthetic coverage: an existing device with four Sources across two documents and four Working owners; independent appends grow the combined device to six Sources; bidirectional next edits remain exportable. A separate case adds a third document. The new owning file has 22 cases.
- Original limits remain 128 typed operations, 96 canonical history rows, the private 4096-reference / 2 MiB / 30-second transaction budget and a maximum 128 chronology batches/receipt entries. A larger otherwise-valid graph can still exceed these bounds and must reject intact. No counter reset, data reduction, discarded assertion, timeout increase or budget exemption is used.
- Elapsed checks do not claim to cancel an arbitrary never-resolving JavaScript callback. Durable response loss is reconciled using the original receipt, not treated as rollback.
- This profile requires the exact Source/Working graph. Actual Topic formation, existing Topic/Section/placement graphs, saved/adopted Thought families, general Human/Context mixtures, general purge/retirement unions and unrelated populated datasets are not admitted by this package. No new Topic is formed here. Original unknown-copy and deny boundaries remain in place; root owns broader generation/purge integration.
- Only synthetic Node/fake-IndexedDB execution was performed here. No browser, build, install, real account, credentials, remote API, CI, Full or cloud execution. No native browser performance claim or Linux capacity guarantee follows from these timings.

## Evidence, with failures kept separately

- Original missing consumer: 0/1, `source-working-incremental-negative.log`.
- Initial implementation failures are retained as `first`, `second`, `third` and `fourth` logs: native physical-value metering, frozen cut ownership, async digest work inside the transaction, and the newly merged completion representation respectively. Fifth and semantic focused cases passed individually.
- First expanded controls: 13/14. The duplex case initially hit the existing private budget; repeated already-proven graph/scoping scans were removed and the exact validated result snapshot reused for the terminal fence. The terminal fence and thresholds were preserved. Subsequent diagnostic failures isolated incorrect inclusion of remote Working in local UI receipt expectations; only the actual local-device membership rule changed. Duplex then passed 1/1.
- Expanded controls: 18/18, 34548.065875 ms. That command's trailing search returned a nonzero shell status; its TAP result is not relabelled as a captured test exit 0. Additional new-document case: 1/1, exit 0, 2512.532042 ms.
- First 14-file aggregate: **132/133**, exit 1, 47616.932334 ms. Only the old qualification-cost test expecting three Working owners to be rejected failed. That obsolete assertion was replaced with the new bounded multi-Working contract while retaining all fake-plan, Source-only, accessor and cost assertions. Corrected file: 3/3, exit 0, 430.575833 ms.
- Independent review's real owner-return failures: **0/3**, `owner-return-negative.log`. First correction: **4/5**, because exact preservation initially also rejected a legitimate new annual index row. Original annual writer replay closed that compatibility difference. Corrected focused batch: **6/6**, exit 0, 12599.765709 ms.
- Final original 14-file aggregate after all changes: **136/136**, exit 0, no failures/cancellations/skips/todos, **64618.13975 ms**. All 22 new owning cases ran in it. `source-working-incremental-final.log` and `.exit` are the final evidence.

Node executable: `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`. Final command set `PYTHON=/opt/homebrew/opt/python@3.12/bin/python3.12`; these tests did not launch Python. The final command uses `--test --test-concurrency=1` and the files below:

```
source-working-incremental.test.mjs
source-working-portfolio.test.mjs
source-working-canonical.test.mjs
source-working-derived.test.mjs
source-working-default-meta.test.mjs
source-working-restored-successor.test.mjs
source-working-current-selection.test.mjs
source-working-fixed-preparation.test.mjs
source-working-owner-identity.test.mjs
source-working-qualification-cost.test.mjs
mixed-current-fixed-plan.test.mjs
browser-native-sync-group-checkpoint-plan.test.mjs
browser-native-sync-group-checkpoint-restore.test.mjs
browser-native-sync-saved-incremental.test.mjs
```

## Integration and next native milestone

Only six Sync runtime files and two owning tests belong to the code commit. No Core or codec registration changed. `human-library-plan.js` touches only Source/Working capture qualification/import/scratch; Human segmented ownership is unchanged. The shared protocol checker adds a default-false pure merged comparison flag; existing callers retain their original behavior.

**Do not merge this tree's entire `group-checkpoint.js`.** `source-working-incremental-coordinator.patch` contains exactly this package's import, populated-device dispatch and `mergeSourceWorking` method (plus comment placement). It is relative to the saved pre-package coordinator snapshot. Root must apply those precise changes to its newer generation/Human/Topic coordinator and preserve its other checks. The composite file hash is included only to identify the candidate actually tested, not to authorize wholesale replacement.

The new owning test uses the same fake-IDB factory, original LibraryDocumentsStore and static runtime imports as the previous Source/Working native bridge. Native adaptation needs only the existing original harness substitutions for test/assert/DB and cleanup registration. The 22 actual cases include original-owner wrappers and fault hooks; they must remain intact. Native Source/Release verification is centralized by root and remains NOT_RUN for this package.

Independent read-only review: plan_scope reviewed the initial frozen current graph/receipt/atomic design without rerunning tests. Acceptance identified the pre-seal baseline defect, then inspected its correction and found no remaining instance of that reported window. Review is finite to this package and does not certify the rest of Sync or native runtime.
