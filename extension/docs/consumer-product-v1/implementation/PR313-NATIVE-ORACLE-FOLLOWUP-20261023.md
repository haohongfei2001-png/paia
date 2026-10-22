# PR313 native abort and Browser3 oracle follow-up — 2026-10-23

Base: `44803422fe77aa7a0a3dae7c0ae466ae5daea082`; branch `codex/pr313-native-oracle-followup-20261023`; implementation `1a16d25e`. Acceptance remains `02144bccf5e0e0b6842aaa4e7c6958cedecdfde1`. Main was `1f3c826c0c49f9d8fd60156182883866971bb8c3` at the earlier read; the final post-push read found an external advance to `ebb25414d18f3b27270d67326bfcbd9cc46431e6`. This independent candidate was not rebased or integrated with that new main; its test evidence remains bound to the stated base. This line does not claim qualification against the newly advanced main.

This completes the A/B test-only follow-up coordinated by dot within the previously verified human authorization for original test repairs and controlled local reproduction. Only the original Browser3 test and an explicitly invoked evidence control implement changes. Production, shared harness, service fixture, workflow/router, versions, acceptance branch and main remain unchanged. Node/Entry repairs were neither changed nor rerun. No automation configuration was changed.

## A — observed qualified withdrawal, then exact expectation

The previous `fresh-action-legacy-code-negative.mjs` and its failures remain in the preceding evidence directory. A copy first retained its `STALE_BASE` equality while adding read-only observations at the original ACK put. The original put is invoked with the same receiver/arguments; its exact exception is rethrown. Native abort/complete listeners are attached to that object store's actual transaction. The repository wrapper forwards every call and rethrows the same rejection. No native transaction method, signal, grant, writer or error mapping is replaced.

Observed in both Source and Release:

1. One ACK hook, actual `IDBTransaction`, before revoke.
2. Original fixture `revoke()` returns, after invoking original session disposal/source invalidation.
3. Original put synchronously throws `TransactionInactiveError`, code0, no dbCategory property.
4. Original repository rejects `STORAGE_FAILED`, dbCategory `transaction_inactive`.
5. Same transaction emits trusted `abort` (`isTrusted:true`, exact event target, null transaction.error). No complete event.

The recorded outer-rejection/event-observer order is the observed order in this browser; it is not generalized to every revocation boundary. The mapping agrees with the original idb-repository22/427 and original selection-abort binding110–119. Only this fresh injection now asserts exactly `STORAGE_FAILED`; it does not accept a set of errors. The separate legacy dispose assertion remains exactly `STALE_BASE` and actually passes below.

All previous assertions remain: initial unprotected Current; first ACK write failure rolls back Current/marker/AI revisions/Current receipts/ACKs; explicit new action replays the same retained job without a third provider call; prior blocks remain,3refs/2generations and every generation/child receipt is COMMITTED; cached action has no physical call; revoked action hits ACK once, rolls back the same state, sizes `[2,1,1]`, physical calls3, no external/extension requests or harness/bridge errors. The explicit script remains outside default browser discovery and does not qualify the four service native suites.

One first Release execution returned OUTCOME_UNKNOWN before the revoke hook: ACK hits0, sizes `[2,1]`, physical2. Its cause remains UNKNOWN and its failing log is retained. A subsequent diagnostic execution added only body-free synthetic transport status/job-state observations; that run reached the hook and failed the retained old error-code equality after observing the full chain. There is no retry inside the test and no conversion of that first failure into success.

## B — protected oracle and independent original legacy owners

The original V2 initial adoption, V3 style candidate and real eight-field keep/adopt operation remain. The protected branch now asserts NO_DELTA/jobId:null/PROTECTED_FIELDS and illegal-run UNAVAILABLE; it does not interpret NO_DELTA as an update success or pretend ACK rollback occurred. Native whole-store snapshots are equal before/after prepare/run: human Current, revisions/journal, coverage, receipts and all other rows. Jobs2/attempts2/ACKs4 and provider2 remain unchanged; fault hook hits0; mixed styles remain original/concise and stale.

The executable requirements are inside the **same original Browser3 test**, with three independent native databases. Each uses the existing LocalOrganizeSession V3 and original editAIPresentation owner to create a base-none initial Current via its real idempotent adoption operation. This existing base-none path yields an unprotected row; the test asserts that precondition. It never clears protections, edits a row directly, fakes AI authorship, changes grants or adds RPC parameters. It does not borrow fresh-action outcomes to satisfy legacy expectations. No service/pg dependency is imported into the default test.

An exploratory attempt to run legacy imports directly in the fresh fixture's service worker failed six cases at the platform's dynamic-import prohibition. Its source and log remain. The final implementation uses the original page-based owner, as the original tests already do; no shared fixture, worker initialization, launcher or browser security option was changed to bypass that restriction.

### Original assertion coverage mapping

| Original requirement | Final executing oracle, each Source/Release |
| --- | --- |
| Native IndexedDB | Original protected branch and all three independent legacy cases assert native factory |
| Identical style-refresh currentView, eight changed fields | Original V2→V3 mixed path retained; independent style-ACK also asserts identical content and changed8 |
| Mixed original/concise, stale, real manual decisions | Original protected branch retains exact values and all-row invariance |
| ACK abort STORAGE_FAILED and Current rollback | Independent style-ACK injects once into an executable legacy handle, asserts rollback, replays same handle and adopts once idempotently |
| Original provider count guarantees | Protected branch `[2,2]`; style-ACK `[2,2]` (one seed, one refresh, zero replay provider); dispose `[2,1]`; delta `[2,1]`. The invalid monolithic `[2,2,2,1,1]` is replaced by these exact independent vectors, not removed without a replacement |
| Uniform style refresh | style-ACK committed adoption asserts concise and all generation/child receipts COMMITTED |
| Legacy dispose flag, STALE_BASE, rollback | Separate unprotected legacy Current plus one added input; one original ACK hook calls that original session.dispose; exact STALE_BASE and unchanged Current |
| Incremental blocks,3refs,2generations, receipt associations | Separate legacy delta preserves first two blocks byte-for-byte,3refs/2generations; all referenced jobs/child usage receipts COMMITTED with exact operationReceiptId |
| A-B-A, NO_DELTA, cacheExact false | Delta case changes original→concise→original through the original preference owner; no new provider, prepare NO_DELTA, all rows unchanged, exact-cache false |
| exactMultiCache entire matrix | Original phase is byte-identical and now executes: children2/3/4, styles original/balanced/concise, ack-hole/unknown/malformed proof controls, rejected adoption rollback, exact cache,20 reopenings each, zero writes, all attempts/receipts/ACK counts, completion dispose UNAVAILABLE / style STALE_BASE |
| All earlier original phases and network checks | Byte-identical prefix before styleV3 and suffix from exactMultiCache through final diagnostics/cleanup; executed by final two original main cases |

There are no remaining BLOCKED items in this A/B test mapping. This does not close full service qualification, Full acceptance, visual acceptance, cancellation causes or performance capacity.

## Executions and retained failures

| Evidence log | Result and scope |
| --- | --- |
| fresh-action-abort-chain-negative.log |0/2: Source observed chain then old STALE_BASE equality failed; Release OUTCOME_UNKNOWN before ACK (unknown cause) |
| fresh-action-abort-chain-diagnostic.log |0/1, Release only: added body-free diagnostic reached chain then old equality failed |
| protected-and-abort-first.log |6/6 intermediate batch: final fresh control2/2 + unchanged lifecycle2/2 + protected/exactMulti main2/2 before independent legacy cases were added. **Not final complete B qualification.** |
| legacy-owner-controls-first.log |0/6 exploratory worker-import failures; source retained as legacy-owner-worker-import-negative.mjs |
| legacy-owner-page-first.log |**2/2 final original Browser3 main cases**, Source25799.611ms/Release28469.090ms, total54417.757ms; all protected/independent legacy/exactMulti assertions executed. No fail/cancel/skip/todo. Lifecycle was name-filtered out in this final invocation; earlier unchanged lifecycle2/2 is separate evidence. |

Final A's Source/Release2/2 belongs to the intermediate combined invocation and is not relabeled as part of the final B invocation. No Node/Entry, full browser shard, CI, Full, live service/model, APT/font install or deployment was run. Tests used bundled Node24.19.0 and explicit Python3.12.14, the existing headless Playwright1.63.0/Chrome155.0.8059.85 environment and original temporary release builder. This is not Node22 CI qualification. Synthetic signed-service/SQL protocol fixtures are not live identity, entitlement or PostgreSQL evidence.

Historical cloud PR313 Full39860568299 remains failed/consumed; PR312's two opportunities remain exhausted. The old Browser3 failure, old fresh wrong-code negative, first new OUTCOME_UNKNOWN and worker-import failures are all retained, not replaced by green summaries. Original cloud writer, cancellations/Unit1 and capacity remain separate unknowns.

## Reviewable evidence

[evidence directory](evidence/pr313-native-oracle-followup-20261023/) includes the exact original Browser3 snapshot, intermediate tested snapshot, old-expectation/native-observation sources, failed worker-import source, five execution logs, four phase journals, exact test diff, source/static vector and SHA256SUMS. The static proof binds15 original runtime/harness/fixture/Node/Entry/version files to44803422, asserts unchanged earlier phases and full exactMultiCache suffix, and records the final test hash. The old delivery and evidence directory remain unchanged.

The one existing test diff is the only tracked change outside this new report/evidence directory. No newly green test is claimed to certify the frozen cloud head or to authorize another Full. Dot owns independent review and integration.
