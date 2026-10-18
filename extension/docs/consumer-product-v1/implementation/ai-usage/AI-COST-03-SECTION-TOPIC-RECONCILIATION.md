# AI-COST-03 — Existing Section rename Topic reconciliation

Local implementation candidate, 2026-10-18. Base: `cfa375a53db7381e1f576f55c097ceaa3b8d808f`. This finite slice implements AI_USAGE_ARCHITECTURE §§3–5 and AI_USAGE_PLAN §5 through the existing Maintenance, structural mapping and TopicFormation owners. It is not full AI-COST-03, native, main, installed, provider-quality or whole-programme acceptance.

## Independent-review correction — containing Topic name

The initial candidate `ffa5fe5ae91970e16c566acf4120aa393e85d789`, tree `03bd7c701240a4fb8fad59a112cfb199697e7462`, was **BLOCKED** by independent review. Three injected same-revision changes to the containing Topic name, staged after the original reuse receipt, exact Topic ACK or NO_CHANGE counter, incorrectly produced COMMITTED with both ACKs. The review probe set passed 20/23; the three failures remain original evidence (log SHA256 `efc2386c2d189ceb6762560bf897c2cde2cc6fd9e65f170a6ba7e6b538c14d68`). Its earlier scoped green results below do not close this defect.

The successor retains the assessment-dependent Topic name from the already authorized sent material in a bounded session-only snapshot. Each original structural fence compares that name on the mapper's existing Topic read, including after receipt/ACK/accounting in the same transaction. There is no new database read, later hash/read window, DTO/proof field, durable store, grant or authority. It refuses refresh of an existing snapshot and clears it everywhere the structural material is cleared. Original title/member/source/journal and processing checks remain.

The three regressions were added to the original staged-drift matrix: unchanged candidate 0/3 RED, corrected owner 3/3 GREEN. The final corrected run passes **203/203**, zero failures/cancellations/skips/todos, in 12327.677864 ms on local Node24: new Section owner 59, unchanged original Topic/Section Context 121, and unchanged independent probes 23. The independent fixture's imports were retargeted to the corrected worktree; probe assertions were unchanged. The focused 3-case GREEN is included in 203, not additional coverage. Syntax and diff checks pass. The prior 137-case service/batch result below remains evidence of the pre-review snapshot and was not relabelled as a successor rerun.

Successor changed code/test SHA256s:
- `core/ai-usage/local-maintenance-session.js`: `72dc407d622ede32cfa7e435fbfb31737f9e493b8fb698d608ed3d16a2d5af93`
- `tests/ai-cost-03-section-topic-reconciliation.test.mjs`: `e19410ba4ba644974fd3d061b0adba2fd022a25c224b616431844176c596e2bf`

All other runtime hashes below are unchanged. Independent review of this successor is still pending; no remote integration or broad acceptance is claimed.

## Observed gap and bounded behavior

On the unchanged base, a genuine human Section rename with complete protected Input-backed members and an explicitly capable same-Topic/existing-Section assessment produced one Context ACK while its Topic facet remained DEFERRED. The new original-owner fixture was RED: 0/1 passed, expected two exact Section-facet ACKs, observed one.

The same route capability now admits one qualified renamed Topic **or Section** per opportunity. Section qualification still uses the original genuine human rename journal/receipt, exact title field protection, active original Topic/layout, complete 1–16 Input-backed membership, original Entry and placement intent/revisions, source availability and independent processing grant. No mapper, content store, durable schema or authority was replaced.

The reconciliation guard requires the exact containing Topic, its current name and revision, the exact active existing Section and current title/revision, all current member Entries, full-body evidence and same-identity relation. Default/named substitution, another existing sibling Section, missing or duplicate members, ambiguous/distinct identities and additional membership cannot ACK. TopicFormation must return checked reuse with no created Entry/candidate; the exact Section Topic unit commits as NO_CHANGE. Human titles, bodies, identities, membership and order remain byte-for-byte unchanged.

The existing final transaction rechecks structural membership, original journal/field/source facts and authority after publication, receipt, exact ACK and accounting writes. The bounded DTO admits exact Section topic/context coverage, including a Topic-only reconsideration after Context was already acknowledged; all existing field/member proof and byte budgets remain. No synthetic Context unit is added to make that request pass.

Old Topic DEFER is reconsidered only on a genuinely different route with fresh qualification and unchanged evidence, and records `HUMAN_SECTION_RECONCILIATION_V1`. Same-route DEFER, original jobs/physical attempts and prior acknowledged subsets remain unchanged. Excess dirty work retains the original scan boundary and honest partial status.

## Pre-review scoped local verification

Local Node `v24.19.0`; synthetic data, original production functions and repository harness. These are development checks, not supported Node22 deployment qualification.

- New `ai-cost-03-section-topic-reconciliation.test.mjs`: 56/56 PASS, zero failure/cancellation/skip/todo; 9109.661151 ms.
- New Section plus unchanged `ai-cost-03-structural-topic-reconciliation.test.mjs` and `ai-cost-03-structural-context.test.mjs`: final 177/177 PASS, zero failure/cancellation/skip/todo; 12808.234378 ms. Includes 18 staged receipt/ACK/counter drift rollbacks, exact named/default Section reuse, two-member closure, independent grants, wrong existing sibling, held rename/membership removal/revocation, unknown/no replay, rollback/local retry, no effective result for Topic-only NO_CHANGE, same-route retention and changed-route exact history.
- Unchanged `ai-cost-03-maintenance-batch.test.mjs`, `ai-maintenance-payload.test.mjs`, `services/ai-gateway/tests/maintenance-client-path.test.mjs` and `maintenance-client-recovery.test.mjs`: 137/137 PASS, zero failure/cancellation/skip/todo; 25243.524590 ms. These synthetic signed-service path/recovery cases preserve original committed child/job identities, financial holds, cold no-body/no-replay and exact later opportunity semantics. They do not run PostgreSQL or call a live provider.
- Syntax checks of all five changed runtime files and the new test, plus `git diff --check`: PASS.

The 56-case result is a subset of the 177-case result; counts are not additive unique coverage.

Retained intermediate failures: the first extended Section run passed 41/43 and found the separate DTO Context-only restriction, now minimally corrected; the first named-member subset passed 12/13 because its test cursor included a randomly ordered unrelated placement and correctly returned PARTIAL. The test now explicitly selects the Section scan boundary; production partial accounting is unchanged and separately tested. The first service command passed the 59 extension cases but failed both service files at module loading because this fresh worktree lacked `pg`; reusing already-installed exact `pg` 8.23.1 produced the final result above. No dependency version, assertion threshold, timeout or shared existing fixture was changed.

## Pre-review tested runtime/test SHA256

- `core/ai-usage/foundation.js`: `066b85bd9c73c395f2461debf75fd78466246b041a150a2c06e59eb6856c03b1`
- `core/ai-usage/local-maintenance-session.js`: `23eb3b6f3fff5d7ffc9447ea18e22b6d90d2ec3743741eabb2ec2b32ef9de009`
- `core/ai-usage/maintenance-batch.js`: `63a6af102b85204f5b28b26f3d6e911af14b783b7b4c197584d792cadc1401ee`
- `core/ai-usage/maintenance-payload.js`: `094b38f4c9616c1ec772cbce9f786d26e2f82c890dfb2483ce2703d1c17abba9`
- `core/ai-usage/structural-topic-reconciliation.js`: `be7431136566810ecdfea16f3dd7d19631d8e1d7fc10a275db4747933d345506`
- `tests/ai-cost-03-section-topic-reconciliation.test.mjs`: `de0f5be20c0a2a0bfc2bdb4419eae094b04a00cd04df3f178fae16dda093f42a`

## Remaining boundaries

Independent review and coherent integration remain pending. Version/build identity stays with the coherent integration owner. No global plan/status/workflow, service configuration/adapter, provider/resource activation, paid operation, permission, remote integration, deployment or paused Sync feature changed. Broad Full/browser/native/visual/performance/whole-PostgreSQL campaigns remain NOT_RUN/deferred. Other unsupported structural semantics remain pending rather than manufactured success; real semantic quality, available production resources and external activation retain their original gates.
