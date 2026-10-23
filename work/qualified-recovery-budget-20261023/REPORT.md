# Fixed qualified Human recovery budget — local implementation and small controls

Base: `0264d726`. Runtime and dedicated small tests: `e8df6cfa`.
Isolated branch: `codex/qualified-recovery-budget-20261023`.
No original phased-stage owning file, 65/129 case, browser, build or cloud execution occurred in this package.

## Authority and historical evidence

The earlier `work/phased-work-accounting-20261023/BUDGET-PROPOSAL.md` remains the historical **unapproved proposal at its original writing time**. It is preserved unchanged. Subsequent direct human approval was reported by root in this task: permit this exact limited local implementation and one 129 cold local validation; ordinary 4096 references / 2 MiB / 30 seconds unchanged; fixed phased Human final closure and cold reconstruction may use a private task-bound 8 MiB envelope, with a new task budget of 64 MiB /120 seconds; old tasks receive no migration or refill. Root alone will execute the one large validation after source review and small safety controls. This package does not spend that execution.

The previous accidental original phased-file invocation and its expected-refusal 65/129 executions remain disclosed in `dcda2fc1` and `work/checkpoint-storage-v2-20261023/EXECUTION-CORRECTION.md`. No original TAP was deleted or relabeled. The present package is not evidence that those old failed tasks succeeded or became eligible for a fresh budget.

## Fixed admission and limits

- New explicit original-owner APIs: `stageQualifiedHumanCheckpoint`, `validateQualifiedHumanCheckpoint`, `revalidateQualifiedHumanCheckpoint`. The ordinary phased APIs continue to require v1.
- Both versions use the original single durable task key. New v2 start rejects **any** existing v1 row before burning or changing a pending reservation. Twelve raw-task DTO negative states cover staging/authenticated/validated/applying/verified/failed, each with and without pending work; their complete original rows remain unchanged.
- v2 is limited to authenticated source-free Human Entry creation: at most129 groups, exactly3 operations and2 members per group, at most387 operations /775 graph items. Original transport, payload2MiB and graph4096 limits remain. No arbitrary target, constructor option, scope DTO or callback can install an elevated envelope.
- Task v1 remains16MiB. v2 is64MiB; both retain120s cumulative active work,4096 tickets and30s per reservation. Ordinary authenticate/validate/owner/verify tickets remain at most2MiB. Only v2 `rehydrate` and `publication` tickets permit at most8MiB.
- The private original owner token, repository identity, original scope/prototype and immutable proof/task identity admit the two closure transactions. Numeric task rows and exported audit functions do not grant a transaction. Ordinary public8MiB registration, forged tokens, an original prepared owner used with another repository/fake scope, and generic callbacks are rejected.
- The repository's normal physical value limit remains2MiB even when the admitted aggregate closure budget is8MiB. Its reference and time limits remain4096/30s. The original marker/gate requests, callback requests, finalizers and raw fences still spend the same meter. Internal omitted limits preserve the already admitted private ceiling; explicit re-registration can only tighten and never reset spent work or clock.
- All old prepaid/burn semantics remain. An interrupted publication reservation remains fully spent; cold reconstruction retains the same taskId and adds newly measured work. Final publication deliberately charges its complete reserved envelope as before, including the30s reservation. This is not a refund mechanism.

## Before-owner exact reference schedule

During qualified validation, the original validate ticket pays for the encoded pure reference schedule. The planner enumerates keys from the authenticated original group/member/operation graph, original baseline metadata names, semantic keys, checkpoint items and **both page-copy kinds**. It does not read back canonical content as authority and does not replace any final row or count read.

`restore.preflight(proof)` returns a body-free numeric audit before the first owner: groups, operations, items, pages, rawPoints, storeCounts, fixedReferences and total references. It has no write capability. Cold validation reconstructs the schedule again. Final preparation independently compares the actual original-owner raw key set and actual store list to this schedule before admitting publication.

Exact successful publication schedule:

| Component | Requests |
| --- | ---: |
| Protection/gate admission |2|
| Publication gate read, qualification read/write, gate write |4|
| Owner task/state/gate/control reads, empty purge query, task write |6|
| Shadow protection/gate settlement reads |2|
| Purge count final fence |1|
| Publication gate/qualification final fences |2|
| Shadow protection/gate final fences |2|
| Every actual store count, including meta |actual store count|
| Every original canonical/protocol/semantic/checkpoint raw point |actual point count|

Thus total is `19 + actual stores + actual raw points`, and4096 remains a hard ceiling. These writes are only the original qualification/task/gate metadata, which do not cause navigation, semantic or backup-generation writes. The final raw closure remains authoritative; early audit is only a refusal check.

The1/2/3-group controls measured114/144/174 actual final references, exactly matching the pre-owner schedule. For the expected original129 single-source shape,775 items require25 pages rather than the one page in small controls; the two page kinds add48 references. The earlier3954 linear estimate omitted these and is not an admissible preflight. An arithmetic4002 estimate is also **not** substituted for the actual proof's schedule or native meter.

## Small local validation

Environment: actual Node22.23.3, macOS arm64, original fake-indexeddb owning fixtures. No browser/performance claim. The new fixture rejects any count outside1–3. The final dedicated file additionally exercises a real original v1 task, separate from the raw-task DTO controls.

1. `first.tap`: dedicated17 tests,5passed/12failed, exit1. The12 failures were a new test-fixture mistake calling nonexistent `stage.status()`, before those no-refill assertions executed. Corrected to read the existing original state row. All original output retained.
2. `second.tap`: dedicated19 + original storage-cold6 + original repository-gate27 =52/52, exit0; this precedes the exact before-owner planner.
3. `preflight.tap`: dedicated19/19, exit0, with the exact pre-owner planner.
4. `final-small.tap`: dedicated22 + original storage-cold6 + original repository-gate27 =55/55, exit0, including final raw drift/task identity/extra-row rejection.
5. `final-guarded-small.tap`: runtime code after the dedicated fixture's explicit≤3 guard,55/55, exit0; no fail/cancel/skip/todo,3574.2345ms.

6. `real-v1-final.tap`: final dedicated23/23, exit0,2755.288917ms. The added real1-group v1 path stages, validates, applies its original owner and reserves an original2MiB publication ticket. All three qualifiedv2 APIs refuse it. Whole target and registry database snapshots and exact ledger remain unchanged; the originalv1 final seal then succeeds with its same taskId and2MiB reservation. No raw task row is injected in this added case. The preceding12 DTO controls remain separately identified.

These are distinct invocations, not one accumulated all-green result. No command imports or executes `canonical-generation-phased-stage.test.mjs` and no name filter is used.

Final exact1/2/3 small observations (bytes):

|Groups|After validation|First owner|Cold revalidation|Cold rehydrate at cursor1|Final native bytes|Final actual refs|Final prepaid|Task total at verified|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|1|181545|141658|95534|79633|55510|114|8388608|8920331|
|2|266465|142186|135078|79609|87819|144|8388608|9204139|
|3|351260|142770|174551|79625|120135|174|8388608|9485392|

Small native-scope simulation confirms actual reads/charges and exact reference schedule, but these small closures themselves consume less than2MiB. Passing them alone does not prove that a129 closure fits8MiB, cumulative64MiB/120s, or browser/native performance. Root's one allowed original-scale check remains pending.

`open-existing-preserved.json` proves that the4703-byte ArchiveRepository constructor/openExisting/open region and279-byte original openExisting binding/export remain byte-for-byte equal to0264d726. Publication changes are confined to the private transaction authority helper and the original phased seal callsite; active selector and recovery publication flow are untouched.

## Native preparation only

`qualified-human-budget-chrome.test.mjs` prepares a Source/Release pair using the existing native harness and optional `PAIA_NATIVE_RELEASE_PATH`, real original constructors, real IndexedDB, network isolation and cleanup. `qualified-human-budget-fixture.mjs` has a static exact23-name allowlist, uniqueness check,65/129 name rejection and the original fixture's≤3 guard. All original case bodies are preserved except original constructor/factory adaptation. The common fake factory is replaced with isolated names in real IndexedDB; ordinary-repository controls use their own native database.

Registration was inspected only after stripping imports to inert registration functions. No case callback was invoked. Generated bridge syntax and owning native file syntax pass. `native-registration.json` and `native-preparation.json` explicitly record executedCallbacks0, browserExecutedfalse and buildExecutedfalse. Root will execute the combined small native milestone, then its unique129 validation; this package prepares no automatic new cloud workflow.

## Stop conditions for the root-owned scale validation

Before owners, require the actual proof's complete schedule≤4096; preserve parser2MiB/graph4096 and exact admitted profile. At any task, phase, scope, prototype, identity, freshness, raw-count/point,2MiB ordinary,8MiB closure,64MiB cumulative or120s active limit refusal: stop the candidate, retain its original task row/pending ticket and evidence, and report failure without migration/refill or another large retry. Keep the distinct fresh synthetic source/target used for this authorized run separate from all earlier failed generations. Success still does not authorize cloud Full or real account/service calls.

## Strict committed control accounting follow-up (2026-10-23)

The earlier tables and 23-case evidence above are historical evidence of the initial implementation, whose control transactions were only recorded diagnostically. They do not establish the strict cumulative budget. This follow-up includes committed graph-internal control work in the same 64 MiB / 120 s task ledger. It does not change the approved limits.

New v2 tasks have exact `controlSequence`, `controlBurned`, `controlPending` fields. Each original private control transaction settles a predecessor only from its exact process-local committed scope receipt, then atomically prepays its own 2 MiB / 30 s envelope. Task/state/gate admission reads occur inside that first control transaction. A missing receipt after a genuine cold reopen burns the previous envelope. Failed control attempts retain the durable prepaid debt and block further same-process refund; an explicit cold continuation burns it. Existing v1 tasks and earlier experimental v2 shapes are refused by the v2 entrypoints without migration, refill, or a second task key.

The predecessor receipt is locked while its successor is pending, so concurrent fixed registry reads cannot spend a receipt after its refund was calculated. Fixed source-base reads consume that target control envelope. The original graph compiler's suppression-key readonly transaction now has a v2-only phase window: genuine committed bytes enter the validation phase; its already-included phase wall time is not counted twice. Original Human preparation windows take precedence. v1 behavior remains unchanged.

The final original 8 MiB transaction settles the last control debt, writes the new task row, and checks that exact row among all original raw points and store counts. The final owner ticket remains conservatively fully charged at 8 MiB / 30 s, with both `pending` and `controlPending` null. There is no extra terminal settlement transaction. Exact final references remain 114 / 144 / 174 for the 1 / 2 / 3-group dedicated fixtures. No original-scale result is claimed.

Budget boundaries are explicit: original attach/Foundation/begin setup and later publication reserve/recover remain independent original bounded operations. An uncommitted admission refusal before a control plan, including a rolled-back first task creation, is independently limited by the original transaction cap; it cannot durably charge itself in its own rolled-back transaction. This is not a claim that every failed attempt, wall time, or all application I/O across process restarts is covered by the task's cumulative allowance. A failed successor with an existing receipt loses its refund and blocks same-process continuation. A cold lost-publication fixture burns both its 8 MiB / 30 s owner ticket and 2 MiB / 30 s control debt, then refuses further admission at the existing 120 s cumulative boundary. This refusal is retained, not repaired by raising limits.

### Exact local invocations

All commands used the same absolute official Node 22.23.3 path recorded in commands.txt. Dedicated fixture size remains hard-limited to 1–3 groups. These are separate invocations:

- `control-first.tap`: 15 / 23, 8 failed. New entry fence initially expected the pre-write gate revision; corrected to original `writeRevision + 1`.
- `control-second.tap`: 19 / 23, 4 failed. Three old assertions assumed final preparation added only 8 MiB despite newly charged control work. The fourth exposed the legitimate lost-publication dual-debt time refusal.
- `control-third.tap`: 23 / 23 after accurate assertions and preserving that refusal.
- `control-expanded.tap`: 27 passed, 3 cancelled, exit 1. Direct native abort inside a fixture's pending `put` left its fixture promise unresolved. Preserved at 32,891.965333 ms.
- `control-expanded-fixed.tap`: 30 / 30, controlled `AbortError` after the real put request lets the original repository perform abort/unwind.
- `control-review-fixed.tap`: 29 / 30. A refused registry read's finally initially masked `BNS_GROUP_RESOURCE_LIMIT` with `GENERATION_TASK_CHANGED`; fixed with an actual admission flag.
- `control-concurrency.tap`: 31 / 31 including real successor-pending concurrent registry refusal.
- `control-final.tap`: dedicated 32 / 32, 3,421.397084 ms.
- `control-owning-final.tap`: **65 small tests total**, exit 0, 4,122.365291 ms: dedicated qualified budget 32 + repository gate 27 + checkpoint manifest cold 6. This is a count of small tests, **not execution of a 65-group case**. Final change before this invocation confines compiler accounting to v2, retaining v1 behavior.

No invocation ran or imported `canonical-generation-phased-stage.test.mjs`, a 65/129-group probe, a browser, or a build. The dedicated tests include the original real consumed v1 path and twelve separately labelled raw DTO no-refill controls; actual ordinary 2 MiB write refusal; forged/wrong-repository scope rejection; first-stage self-prepayment; cumulative byte/time refusal before owner writes; failed successor and final transaction rollback; cold burn; concurrent receipt locking; and observed genuine compiler readonly work.

The Source/Release native bridge now has a static **32-name** allowlist and `packages.cases = 32`. Its constructor/factory adaptation and original test bodies are retained. Only inert registration and syntax checks ran; executed callbacks = 0, browser = false, build = false. The independent programme reviewer inspected source and found the two successful-path gaps closed; that review did not run tests. Root retains sole ownership of native integration and the one authorized 129-case execution.
