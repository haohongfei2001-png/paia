# Original Source append after a bootstrap union — local successor

## Identity and scope

Base: `027bc2f` (full identity in `source-vector.json`). Branch: `codex/local-source-append-continuation-20261025`. Root delegated this bounded local continuation after reviewing `../reviews/source-next-slice-design.md`: existing conversation capture append, then original recoverable checkpoint publication, then a fresh synthetic installation. This is not Source text editing authority. Worktree: `/Users/hhf/Documents/GitHub/paia/work/final-development-takeover-20261025/source-append-continuation`.

Two runtime paths and one existing owning test changed. Capture, append journal/codec/receiver, repository transaction owner, ordinary restore, Working/Human/Context authorities, public DTOs and application selection gates are unchanged. No candidate bundle was merged. No cloud, browser, install, model, account, deployment or push was performed.

## Change and preserved proof

The prior publication-only union continuation admitted only bootstrap groups and assumed seven operations and one new document per group. It now also admits an original complete five-member plus descriptor append group. The original group planner still validates every append against its exact retained bootstrap revision/operation/document member and document identity. Previous union history remains bootstrap-only and is selected exclusively by the authenticated original receipt's three cuts.

Fresh local groups are ordered by descriptor sequence and must form one uninterrupted exact-device sequence across variable widths (7 for bootstrap, 6 for append). Every Source, source key, dedupe key and typed entity remains unique. Only a bootstrap claims a new conversation/document; append reuses the exact planner-proved existing anchor. Foreign-device additions, partial original groups, mixed owners and malformed protocol remain refused. This does not allow original Source byte changes or Working edits to pose as append.

Physical qualification reconstructs original record/input/state/history/filter rows and counters. Each Source increments records/blocks/history/delta once; only bootstrap increments the document allocator. The document values come from the original independently compiled group scope, which is also checked separately against the complete current store. Raw document allocation and known-time display rows are independently reconstructed from all exact Source groups, alongside recordIndex, blockIndex and per-Source sourceCounts. Original sourceCut stays unchanged.

The complete retained raw table cut, current graph, heads, sequence, receipts, queued outbox, original active namespace/fence, post-discovery and post-upload comparisons, causal parents, original stage cleanup and the SAME cumulative work tickets are retained. The budgets remain 4,096 references / 2 MiB / 30 seconds. No task reset or fallback projection bypass was added.

## Actual results, separately accounted

1. **Old baseline, new one-append positive: 0/1**, exit 1, TAP 690.532125 ms. Exact old runtime `027bc2f` in detached sibling worktree `source-append-baseline`, copied new owning test. It rejected at `requireSourceBootstrapUnionPublication` with `BNS_GROUP_OWNER_UNSUPPORTED`. `baseline-negative.log` and exact copied `baseline-selected-test.mjs` are retained. This was run once after the first implementation batch; it is not described as having preceded implementation.
2. **First implementation combined owning check: 89/92**, exit 1, TAP 39141.579542 ms, no cancel/skip/todo. All 79 retained old cases and 10 new cases passed. Three newly written broader publication positives hit `BNS_CHECKPOINT_PUBLICATION_LIMIT`. Runtime and tests at this failure are retained as `first-runtime.js`, `first-group-checkpoint.js`, `first-tests.mjs`, plus `first-owning.log`. The `first-group-checkpoint.js` copy was made after the run; its bytes remained unchanged since the first implementation and match the final runtime vector. No runtime change followed this failure.
3. **Changed/new five cases: 5/5**, exit 0, TAP 5873.458334 ms, no cancel/skip/todo (`followup-five.log`). Two added one-append cases prove exact capture → cold reopen → prepare/publish → new installation recovery → cold reopen, both for a retained ancestor conversation and a fresh local bootstrap conversation. Source bytes, Working baseline, document values, time ledger and state/history cardinality agree. Existing old Source rows are exact. The other three cases keep the original broader data counts and explicitly assert the unresolved cumulative limit instead of claiming publication succeeds.

These are **not a single 94/94 run**, not native browser results, not Linux/CI qualification, and not completion of all Sync or Source plans. The original append owning file was unchanged and passed in the first combined run. All other prior project failures stay in their earlier evidence; this successor does not overwrite or supersede them with an all-product pass.

## Resource boundary observed, not solved

The three broader scenarios remain present at their original new-test size:

- Three appends to the retained ancestor conversation (six total Sources): qualification and row-preservation checks pass; publish hits the cumulative limit after **3 synthetic transport writes**.
- A local bootstrap plus three appends to it (seven total Sources): qualification passes; publish hits the limit after **2 synthetic writes**.
- Interleaved append/bootstrap/append/bootstrap (seven total Sources): variable-width sequence qualifies; publish hits the limit after **2 synthetic writes**.

All three prepare successfully; the observed refusal is during `publish`. There is **no zero-write claim**, no automatic retry, and no assertion that uploaded objects or a remote head are absent. The original producer's error represents incomplete/unconfirmed completion, not rollback of immutable remote objects. The transport in these tests is an in-memory synthetic HTTP implementation, not a real account. The private byte/reference counters were not instrumented; the shared error code does not establish which counter was crossed. No exact 2 MiB root cause, performance benefit, restored capacity, larger-scale publish success, or native timing is claimed.

The original first failure expectations and data sizes are preserved. The follow-up separates the bounded supported one-append path from unresolved larger cumulative publication capacity; it does not shrink an existing product acceptance fixture or increase its budget. Future accounting/performance work requires its own exact design and evidence. An already activated union restore task also remains unable to silently retarget itself; the demonstrated receive path is a fresh installation, not a repaired continuation of that old task.

## Additional controls

New rejection checks preserve all current rows and perform no new synthetic publication writes for missing append member/descriptor, missing bootstrap receipt, missing append outbox, extra document allocation, changed document display, changed old Source, changed new Source, and real Working edit after append. Positive fixtures never manufacture journal rows. Negative fixtures deliberately corrupt state to assert refusal. Existing post-proof real append changes still invalidate the retained cut (passed in the first owning run). Single append lost-upload acknowledgement cold-resumes the exact durable task with no duplicate synthetic POST; recapture of the same identity remains refused with unchanged rows.

## Commands

All checks use the pre-existing official Node v22.23.3 on macOS arm64. Environment is recorded in `environment.json`. No dependency installation occurred.

```text
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test extension/tests/source-union-publication-continuation.test.mjs extension/tests/browser-native-sync-source-append.test.mjs
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test --test-name-pattern='single original append to ancestor publishes' ../source-append-baseline/extension/tests/source-union-publication-continuation.test.mjs
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test --test-name-pattern='three original appends|interleaved original groups|single original append' extension/tests/source-union-publication-continuation.test.mjs
```

`git diff --check` passed. No additional aggregate, native or cloud test was run. `source-vector.json` binds all three changed paths before/after; `implementation.diff` is the exact candidate change; `SHA256SUMS` covers this report and every evidence file except itself. Independent root review and any authorized later integration remain outstanding.
