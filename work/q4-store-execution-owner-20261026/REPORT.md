# 0.55.16 — original recovery execution ownership and source inventory

## Preserved failure and finding
Base: published 0.55.15 main `d4d45db78a2e0f9b72102d4e27ce8f3171d456ab`, tree `cfa4cdf6bae2218bfd4d5b38cf89d3334ff0266d` (local equivalent `fcf4edd6bcd4619d9a7b710890b70e0424bbf472`). Maintenance job **121422534607** failed the unchanged `services/ai-gateway/tests/maintenance-source-processing.test.mjs:57` case, **actual cold worker source registry with processing null consumes saved explicit Settings ON and one paid child**, with BNS_GROUP_RESOURCE_LIMIT at Repository.transaction:509 → IndexedStore:104. Original log SHA256: `845602d241e33e1d8fe53b99ceddf18d0b72c7eb45b7c19948049f69a76a4cc4`.

One isolated, observation-only diagnostic invocation of that exact case passed **1/1** without recording a first refusal. It did **not** reproduce or explain the CI failure. No automatic retry or capacity conclusion follows from that pass.

A separately authorized deterministic control then proved a concrete ownership defect in the base source: after the original maintenance Store task and native transaction had completed, an independently queued poll entered its own prelude while the maintenance action was still delivering its result. Repository's shared window attributed that independent pending acquisition to maintenance. Returning the maintenance action failed both promises with BNS. The control failed once, with 11 original native gets and 30.936951 ms case duration; no quota was exhausted or guard changed. The gate was released and both promises settled. **This confirms the new scope-ownership defect, not the first underlying cause of the recorded CI failure.**

## Repair and accounting boundary
Sixteen runtime files carry the complete original owner chain. The original Store creates a private execution identity covering initialization, control prelude and callback. Synchronous original-owner admission attaches the existing ticket only to that queued execution, not to unrelated tasks that happen to run during the outer asynchronous window. Direct maintenance Repository reads explicitly join that same ticket even while an independent Store execution is awaiting acquisition. Fake/copied tickets and explicit null cannot opt out of the ledger; the read-only execution projection is frozen.

Foundation, Thought initialization/binding/evidence, Topic formation/processing/retrieval/candidates, and Context maintenance/lineage/scope plus the two original Context capture callers propagate the ticket without replacing their semantic or qualification work. The original outer window, failed/pending checks, native settlement/abort/unwind, first deadline and cumulative physical accounting remain. Limits stay **4096 references /2 MiB /30 seconds**, and production configuration stays NULL. No permission, grant, provider entitlement, UNKNOWN clearing, retry, unmetered maintenance fallback or Sync runtime feature was added.

Three test-only source-inventory files separately include the newly reachable original `background/maintenance-processing-commands.js` in the exact before/served/after closure. Existing byte equality, changed-byte rejection, unlisted-path refusal, source/release comparison and native assertions remain. This is not new native execution evidence.

## Separate local receipts — not a combined full suite
- Initial diagnostic: **1 PASS**, 3581.578518 ms; no reproduction, no production diagnostic hooks retained.
- Base deterministic ownership control: **1 FAIL**, exit 1, 322.133634 ms total. Its exact original source is retained as non-discoverable `before-control-source.txt` (SHA256 `0ee64bb977cf1e5e963fed987cf846ec178487ffab6ce40aadc5663a5fbfad3b`).
- Fixed owner source `e8723176a8e89efbd6e4857c8c9afbc88e9eed03`: one selected invocation, **2 PASS**, exit 0, 3457.427498 ms. Both deterministic promises fulfill; the independent poll's actual scope has no maintenance ticket. The original queued prelude/body and overlapping direct maintenance read share the original ticket. A fixed 12-reference arithmetic control proves all ten prelude gets plus both maintenance reads were debited, while the poll was not; the first deadline is not renewed. The unchanged original cold-worker case passes its one synthetic paid-child and Settings assertions.
- Inventory source `fb2ce9ac18b12437e1001261e5ae856ea6598615`: its independent single invocation passed **24/24**, exit 0, 1555.205256 ms. Original related CI failures remain jobs **121422534511** and **121422557927**. The three inventory test files were integrated unchanged after owner validation.

Owner command, from repository root:

```
node --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='^(?:Q4 original recovery window cannot adopt an unrelated queued Store prelude|actual cold worker source registry with processing null consumes saved explicit Settings ON and one paid child)$' extension/tests/q4-recovery-store-execution-binding.test.mjs services/ai-gateway/tests/maintenance-source-processing.test.mjs
```

Inventory command, from `extension/`:

```
node --test --test-concurrency=1 --test-reporter=tap tests/human-current-native-source-inventory.test.mjs
```

The before/after control sources differ only to wire the new original admission/scope observation and add direct-read, fake-ticket and exact-accounting controls; `control-source-delta.patch` preserves that distinction. The two runs are not claimed to use an identical test file. Raw logs and SOURCE-MANIFEST bind each evidence identity separately.

Local Node was **v24.19.0**, versus CI's Node 22 target. The cold-worker fixture used existing local **pg 8.23.1** dependencies and synthetic IndexedDB/SQL/HTTPS, with no installation or external provider call. No old suite, signed-four replay, browser/native run, cloud workflow retry or additional review was performed. Tested owner and inventory bytes are unchanged in the assembled candidate; version metadata and these receipts were added afterward. This is not exact-main CI qualification, installation, service activation, complete Sync or completion of the seven plans. Publication remains subject to approval and existing automatic checks.
