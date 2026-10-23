# Explicit phased Human generation task

Status: finite 65-group consumer implemented and locally verified; 129-group and cold partial-application recovery remain engineering work. This is a new opt-in task, not a budget reset inside the old checkpoint API. It does not select the application database or enable Sync.

## Evidence and exact scope

The preserved original-owner baseline has 65 create groups / 195 operations / 391 checkpoint items: authentication succeeds and the first original Human application rejects `BNS_GROUP_RESOURCE_LIMIT` before any Entry exists. With 129 create groups / 387 operations / 775 items, original authentication rejects at 192 stored items, with zero canonical Entries. These are synthetic correctness inventories, not the earlier 100,000-Input performance seed.

The first phased profile accepts only a complete source-free Human Entry creation graph. It uses the original authenticated checkpoint iterator and original graph compiler. It does not grant Entry edits, Source-backed data, mixed owners, old bodies, cross-Topic reads, or existing-active migration.

## Budget contract

Every physical transaction keeps the original private 4,096-reference / 2 MiB / 30-second ceiling. The new logical task additionally fixes logical payload at 2 MiB and unique graph references at 4,096. Cumulative data work is limited to 16 MiB of transport, decoding, validation and canonical execution, and 120 seconds of active phase time. User pauses between phases are not active time. These are not claims of a whole-process CPU deadline.

Before each data phase, a separate durable body-free transaction reserves its maximum bytes/time. Successful completion settles once, using fixed transport measurements and an immutable numeric receipt captured only after the original repository callback, finalizers, terminal fences and commit. A lost completion response or process crash never gets a refund: an explicit cold continuation burns the original reservation and follows the durable cursor. Creating a new instance cannot replace task identity, sourceBase, manifest or accumulated use.

Body-free ledger reserve/settle transactions remain independently bounded by the original transaction ceilings and are counted separately from data work. There are at most 4,096 tickets and at most one reserve plus one settle per phase; a cold burn is one additional explicit transaction. No retry loop or automatic re-execution is provided.

## Required closure before publication

1. Bind the task to the original authenticated manifest, target identity and begin-time sourceBase. Never recapture a newer source as the accepted baseline.
2. Persist each authenticated page with its exact chain, cursor and page receipt in one transaction. Check the full original transport topology, duplicate references, item count and chain.
3. Compile the whole logical graph once with the original compiler; keep duplicate/parent/head/frontier and complete-group checks. Page-local validity is insufficient.
4. Prepare each application using the original private Human plan and allocation. Its expected before/after rows, mapping, history and operation receipt must come from that plan, not from a post-write snapshot.
5. Final page proofs must cover every expected canonical/protocol row exactly once, reject extras, bind the same graph and durable task, and remain invalidated by any permitted intervening writer.
6. The fixed publication owner alone may consume the final private qualification. Generic metadata sealing, an arbitrary callback, or caller-provided digest cannot substitute for it. Existing-active negative-intent migration remains rejected.

The milestones below distinguish the implemented 65-group complete consumer from the retained 129-group refusal and unimplemented cold partial-application continuation.

## Implemented consumer and result (2026-10-23)

The explicit consumer now authenticates bounded immutable pages, persists their cursor/hash receipts, compiles the complete graph with the original compiler, and applies each source-free Human Entry through the original private plan, allocation, journal and owner. Expected Entry/history/operation-receipt/protocol/queue rows come from the original pre-write plan. The fixed publication operation closes every expected canonical/protocol/checkpoint row and the negative space of every native store in one native transaction. Only the original derived `aiu:delta:` metadata interval is excluded; it is not treated as canonical content. Generic sealing cannot produce this qualification or write the task ledger.

The final same-transaction task settlement consumes the entire prepaid publication ticket conservatively, with no refund. Gate seal and the fixed `original-phased-human` graph qualification commit with that task settlement; a late mutation rolls all three back. Registry publication then uses the existing recoverable multi-database protocol. It is not a cross-database atomic transaction, and it does not switch the extension's default factory or chrome.local state.

The delivered active-library owner baseline is the exact four-file content from `0b6d7c74`, recorded locally in `b6bfe7bb` solely to make the feature delta reviewable. Do not cherry-pick that baseline again. The feature extends the existing active-store qualification list only for the new fixed graph kind; it does not grant the generic metadata seal an active writer.

### Observed milestone, before final record-only settlement adjustment

The first nine-file owning batch was **185/185**, 27,425.083 ms. Its actual 65-group path included full native sealing, reserve/recover, reopening the same database with the same original local bootstrap, reading all 65 Entries, refusing a cold unbound write, explicitly binding the original published store, and creating a new Entry through its original owner. This is synthetic fake-IndexedDB correctness evidence, not native Chrome or Linux capacity evidence.

| 65-group phase | Charged data bytes | Observed active time |
| --- | ---: | ---: |
| Authentication | 3,409,279 | 115 ms |
| Complete graph validation | 3,018,875 | 161 ms |
| 65 original owner steps | 8,051,498 | 1,875 ms |
| Final publication ticket | 2,097,152 conservatively spent | 30,000 ms conservatively spent |
| Total task ledger | 16,576,804 | 32,151 ms ledger charge |

The actual final native transaction used **1,926 request references, 1,983,978 metered bytes, and 584.214 ms**; final preparation additionally encoded 4,206 bytes of newly built receipt metadata. Earlier phase reference counts were not collected as a combined counter, so no total-reference figure is inferred. Every native transaction still enforced its original reference ceiling. The 30-second publication ledger charge is a conservative reservation, not observed execution time.

The first final 65-group seal failed under the unchanged native byte limit because preparation unnecessarily re-encoded the entire already-authenticated expected graph solely to charge that encoding. Removing that actual redundant encoding—not removing native durable reads—allowed publication to fit. Both logs remain. The final proof still rereads every durable checkpoint item/page, expected canonical row, receipt and protocol row. Private in-process graph reuse never substitutes for those reads.

### Failure evidence and limits

All original 65/129 baseline refusals remain in `work/canonical-generation-human-scale-20261023/baseline.jsonl`. Intermediate transport/validation/large receipt failures remain separate. The 129-group path now authenticates and validates completely, then reaches 32 applied Entries before its next owner transaction refuses the cumulative 16 MiB task budget. The actual 185-test batch recorded 16,684,799 charged bytes after the 32nd settled owner step; the next reservation remains prepaid after refusal. No generation is published and no failed transaction is counted as an applied Entry. This is **not** a passing 129-group recovery.

Seven real backend late-mutation controls cover a checkpoint item, page, graph validation receipt, canonical Entry, owner receipt, sequence counter and extra metadata row. They mutate inside the real sealing native transaction and verify complete physical rollback, an unchanged pending task, no qualification and an unchanged empty active registry. Additional controls cover a forged proof, an actual independently published active source replacing the begin-time sourceBase, and overlapping live authentication that must not be mistaken for a crashed reservation.

The first cold writer check used a new empty chrome.local test adapter and correctly failed the original migration identity check. The corrected check reuses the original local adapter, preserving its genuine bootstrap identity; it does not invent or alter a migration marker. Both logs remain.

This bounded slice still has explicit remaining work:

- A fresh process cannot yet rebuild the original private pre-write expectation map after partially applied Human groups. Such continuation stays closed; it cannot reset the task or mint a new proof. Authentication-page cold continuation is implemented and tested separately.
- The 129-group path remains over the cumulative task budget. Repeated original preparation and inventory reads need a true incremental qualification, with a durable exact owner witness and final complete closure. Raising the task budget is not part of this package.
- New phased task/validation/owner receipts are not accepted by the older checkpoint-copy retirement consumer. Retirement remains rejected for this graph kind until an exact dedicated cleanup owner is implemented.
- Existing-active replacement, mixed profiles, Source-backed Human data, edits, default service-worker selection, production Sync and real-account data are outside this finite consumer. Their old guards remain.
- No native browser, cloud CI, Full, deployment, paid call or 100,000-Input seed was run for this package.

## Final frozen local verification

The final same nine-file owning batch is **187/187**, no failures, cancellations, skips or todos, **28,080.241042 ms**, Node **22.23.3**, synthetic fake IndexedDB. It includes the successful final ticket full settlement (`burned: 0`), the instance-getter zero-evaluation control and refusal to rebuild/reset a task after owner application. The earlier 185 batch and all failing runs remain separate.

Final 65-group totals: authentication **3,409,279 B / 127 ms**; validation **3,018,875 B / 159 ms**; original owners **8,048,996 B / 1,842 ms**; final ticket conservatively **2,097,152 B / 30,000 ms**. Total **16,574,302 B**, **32,128 ms charged**, **94 tickets**. Actual final native work: **1,926 references / 1,983,979 B / 478.1625 ms**, plus **4,206 B** newly encoded preparation metadata. Final original source-free cold writer succeeds after actual publication and binding.

See `owning-final.tap`, `source-vector.json`, `SHA256SUMS` and the preserved earlier logs under `work/canonical-generation-human-scale-20261023/`. No status label is used in place of the actual native terminal read checks or the original owner assertions.
