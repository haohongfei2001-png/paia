# One qualified 129-group local recovery — FAIL

Executed once at `d1888a346e16c144aae2c1bd690f1c7ecb32726d` on 2026-10-23. The explicitly approved opportunity is **consumed**. Exit 1, wall 19,512.379834 ms. No retry, reload/replay of the large checkpoint, cloud run or subsequent large validation was performed.

## Completed before the failure

The original qualified Human path authenticated 129 groups / 387 operations / 775 items / 25 pages. Its preflight counted exactly 4002 references (3946 raw points + 37 store counts + 19 fixed), within the unchanged 4096-reference limit. After 64 original owners, the harness closed the target and registry and created new original owners against the same synthetic databases. It revalidated the same task and immutable checkpoint, burned the prior unreceipted control reservation, rehydrated 64 completed groups and completed the remaining 65.

The original complete raw final seal passed with 4002 references, 4,280,141 native bytes plus 8661 preparation bytes and 1265.6000000089407 ms measured native active work. The fixed publication reservation retained the full 8,388,608 bytes / 30,000 ms. No additional paged verification call was substituted for this full final seal.

The terminal v2 ledger is verified: 53,245,138 charged bytes / 71,700 charged ms, 210 tickets, pending null, controlSequence 553, controlBurned 1, controlPending null. These ledger totals include reservations/burns and are not wall time or measured disk costs. They remain below the approved 64 MiB / 120 s cumulative limits. The ordinary 2 MiB / 30 s budget was not raised.

The original registry publication committed and remains active in the captured terminal receipt. Before ordinary editing, executed assertions verified all 129 original semantic Entries, 129 original histories, and 129 unique task-bound phased receipts with valid digests. These successes do not turn the overall sequence into a pass.

## Failure and evidence limits

The next original `editEntry` call failed with `BNS_GROUP_RESOURCE_LIMIT`, mapped by `HumanLibrarySyncJournal.execute` at line 65. The underlying inner operation/cost cause is not yet established by this receipt. The harness stopped and captured terminal evidence; it did not retry. No `result.json` exists because the continuation threw.

A read-only comparison of captured terminal data against the saved originals confirms semantic Entries/history still match and operationReceipts remains 129. No complete immediately-before-edit table snapshot was exported, so this does **not** independently establish rollback of every table. Preserve this limitation rather than claim a whole-table negative proof.

`STARTED.json` intentionally preserves its original IN_PROGRESS record as the exclusive-start marker; `receipt.json` is the final FAIL outcome. Immutable checkpoint bytes/hashes, exact executed fixture, runtime vectors, owner/task progression observations (terminal ledger 210 tickets), terminal 37 tables, memory samples and error stack are retained. Memory samples cover the Node orchestration process only; browser/process peak is UNKNOWN.

## Environment and next work

Node 22.23.3, npm 10.9.9, Python 3.12.14, Playwright 1.63.0, Chrome 156.0.8078.47, macOS arm64; original headless/native harness with nativeFactory true and zero external network/HTTP requests. Runtime source vectors are unchanged. This is synthetic local evidence, not Linux capacity or complete Sync acceptance.

The preceding strict-budget milestone is separately 198/198 Node, one 674-file development build, Source/Release 4/4 native parents (32 qualified-budget and 22 positive/negative cases per variant), plus a separate three-group cold harness pass. See `../qualified-human-budget-final-20261023/REPORT.md`. None is a replacement for this failed 129 sequence.

Continue read-only diagnosis and small synthetic ordinary-edit safety tests under unchanged ordinary budgets. Application startup selection, selected-active mixed recovery and settled-debt retirement continue independently. Any additional 129-group execution requires a new specific decision after a concrete fix; none is authorized by this report.
