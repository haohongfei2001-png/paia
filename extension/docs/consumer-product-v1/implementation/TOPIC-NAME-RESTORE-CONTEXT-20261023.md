# Topic name restoration: bounded current human interpretation

2026-10-23. Successor to Section restoration `8e247c6501e333babaeca233aad648d6895faae0`.

The actual original `restoreRevision` Topic-name result now qualifies the existing
Context mapping. It consumes the current explicit human-confirmed name, not a
historical target replay. Exact latest journal, before/after revisions,
`planHumanTopicRename` identity transition and `planHumanTopicField`, authorship,
protection, original receipt, complete bounded manual Input-mirror membership,
Source and processing fences remain required. Restore receipts additionally need
exact identity/schema/result, valid sequence/time and digest shape. The trusted
local owner receipt is not a new cryptographic proof over arbitrary storage.
No historical body read, persistent schema, writer, grant or Sync change is made.

Only the original validated rename receives an ephemeral positive Topic
reconciliation brand. Restorations and caller copies do not; the structural
wrapper retains that distinction. Setting `reconcileHumanNames=true` therefore
still leaves the restoration Topic facet deferred. Context grants and the
original atomic Context publication/ACK owner remain independent.

The real-owner positive test restores a previous rename's before-name, checks
journal/receipt and exact current material, commits Context once, acknowledges
only Context, and leaves all human-owned tables unchanged. Eighteen corruption
controls cover name, journal before/after/base/after revision, actor, mask,
operation, receipt namespace/schema/owner/result/digest/time/sequence, protection,
identity token and removed Source. Six boundary controls cover denied, wrong
field and expired grants, post-dispatch revoke/name drift, and ACK abort with
full rollback followed by replay without another provider call.

## Evidence

The new real-owner positive test against the original implementation failed
0/1 because the mapper returned null. This baseline is preserved. The two-file
owning run (`ai-cost-03-topic-context.test.mjs` and
`ai-cost-03-structural-topic-reconciliation.test.mjs`) was **158/159**, exit1,
TAP20475.042625ms, no cancel/skip/todo. Its sole failure was a new negative test
expecting a returned state after Source removal; the original foundation instead
rejects `prepare` earlier with `STALE_BASE`. Only that test assertion was corrected.
The final targeted source-removal test passed **1/1**, exit0,
TAP235.676083ms, no fail/cancel/skip/todo, with zero provider calls and ACKs.
These are separate runs, not a single all-green batch. The earlier Section350
batch was not repeated. `git diff --check` passed.

Node22.23.3, existing local fake IndexedDB; no install, browser, large seed,
real account/model/service, cloud run, build or deployment. Native Source/release
qualification remains an integration milestone.

Logs and SHA256:

- `work/topic-name-restore-20261023/baseline.log`: `949839c0ef41022811bca0265553a36c5ea2cf2e48fb800c8318da12d6ad50c6`
- `work/topic-name-restore-20261023/owning.log`: `573ed542c2287adc70fe35c7d282a89c96c8cbb11458a2276336f5ba02736a0a`
- `work/topic-name-restore-20261023/source-final.log`: `9c6738387f4680cd9d839c787b85c09162eb988fcd51c8f524b22bf01a9271ad`
