# Retained Input Working tails — local follow-up

Parent `17def613728d6c63c3fe563a228cab297f0e506e`. This follows its independently reviewed two-Input implementation and preserves its original 117/117 result as earlier evidence; those 117 cases were not rerun.

## Runtime

Only the newly added count restriction in `sourceUnionPublicationGroups` is removed. A pure Working tail may revisit any retained original Input if every unchanged proof and limit succeeds. The original per-Input history/body/filter reconstruction, shared global descriptor/revision/delta/epoch order, authenticated Source ancestry, graph parents, complete canonical/physical/protocol cuts and final publication fences are untouched. Mixed newly added Source/Human/Context tails remain refused. No new owner, API, activation capability, or caller change.

Existing limits remain authoritative: ordinary 4096 references / 2 MiB / 30 seconds, original 128-operation graph limit and per-Input history/retirement rules. This is no promise of arbitrary-scale completion.

## New semantic controls

- A→B→A with same-window coalescing: A retains its original history ID/sequence even though intervening B advanced the global revision counter. Three global delta/epoch events remain exact.
- A→B→A with a fresh allocated history row: A's final row consumes the true next shared global revision sequence and retains the earlier A and B histories.
- A→B→C: each of the three retained Inputs is edited once. The underlying remote ancestry still consists of the original two sibling Source heads and their common ancestor; this does not admit a third incomparable head.

All three use real original owners over local synthetic fake IndexedDB/transport: original edit, cold publisher reopen, confirmed original publication, fresh installation recovery and another cold reopen. Assertions retain immutable Source, exact Working bodies and complete history, filters, source times, original sourceCut, unedited Input where applicable, exact event Input order and counters.

The former three count-only negatives are replaced with actual original data/protocol violations: three-Input unjournaled Source mismatch (`BNS_GROUP_CANONICAL_UNREPRESENTED`), three-Input global delta mismatch (`BNS_SOURCE_UNION_CONTINUATION_INVALID`), and cross-Input typed-operation parent tampering (`BNS_OPERATION_DIGEST`). The parent control proves original operation integrity rejects tampering; it does NOT claim a graph-semantic test with a recomputed valid digest. All original no-provider-write and exact-table-preservation assertions remain. The nine prior exact-code mutation controls are unchanged. Old source/expectations are retained in the three `before-*.txt` files.

## Actual execution, separately reported

Independent static review accepted the four-file scope before execution. Exact commands, inputs, hashes and results accompany this report.

1. One name-filtered combination of the three new positives and three changed negatives: **4/6**, exit 1; TAP `3634.64475 ms`, wall `3776.6483339946717 ms`, source unchanged. The three-Input positive and all three negatives passed. The two A→B→A cases had already confirmed publication, then failed constructing the new cold receiver because the new fixture's device ID concatenated a `+` character from its case name. The original constructor correctly returned `BNS_IDENTITY_INVALID`. Original source/log are preserved in `input-*`, `focused.log`, `result.json`; this was not a runtime or budget failure.
2. Sole correction: the test receiver ID replaces `+` with `_`; no runtime, identity validator, payload, scale, timeout or assertion changes. Only those two affected cases reran: **2/2**, exit 0; TAP `2573.711166 ms`, wall `2716.9208750128746 ms`, source unchanged. `corrected-*` retain command/source/result/log. No 6/6 or combined 117 claim is made.

Node `22.23.3`, local macOS; no browser/native/CI/cloud/account/network/build/install/push/deployment. If a positive had reached a resource limit, the test would explicitly skip later positives rather than repeat them or count refusal as support; no such budget failure occurred. No skipped/cancelled/todo in either actual run.

## Remaining boundaries

This slice removes an unnecessary local count gate, not global current-library selection restrictions. Mixed append/Working tails, additional incomparable heads, larger resource-bound graphs, retirement bundles, real provider permission and browser/native acceptance remain separately unqualified. Root owns exact local integration; spent external execution allowances are not renewed.
