# AI-COST-03: Full 301 Maintenance qualification repair

## Scope and original failure identity

This is a narrow successor to exact published head `3010918e713bc98308af8e2207c2f791ec90a0b6`, diagnosed in an isolated materialized copy rather than the later candidate-production working tree. Original CI `39175581389`, Unit 3, remains failed. Local reproduction on Node v24.19.0 of the exact original two Maintenance files is **157/167**, not a pass. CI used Node 22; this local repair does not establish a changed-head CI or native result.

The original ten local failures map as follows. Assertions of source/human bytes, call counts, coverage and ACKs are retained.

| Original failing test | Classification and repair |
| --- | --- |
| restored Input-bound Entry Topic and Context facets use exact Entry authority and original owners | Fixture observed every new local qualification as payload; observe the explicit payload purpose only. |
| restored Entry missing-entry-authority cannot ACK its Topic delta | Payload refusal now targets `ai-maintenance-payload`, retaining its scope defect and zero ACK. |
| restored Entry wrong-entry-revision cannot ACK its Topic delta | Same purpose-specific targeting, retaining exact wrong revision. |
| Entry mapping reconsideration missing-owner preserves unresolved obligations or rolls back | New pre-job qualification already rejects the missing owner; assert the genuine prepare rejection and unchanged original state. |
| remaining Entry Context-only coverage still requests Entry processing and material after Topic ACK | Fixture payload observation is purpose-specific; exact Entry authority remains required. |
| manual Placement Context uses original target and exact key without changing human placement | Fixture observes the actual payload receipt rather than the preceding local qualification. |
| manual Placement wrong-target processing scope cannot borrow Input authority | Preserve wrong-target payload refusal without dereferencing a nonexistent qualification placements field. |
| manual Placement missing-entry processing scope cannot borrow Input authority | Preserve missing Entry payload refusal at the intended phase. |
| mixed Input and authored Context share one final transaction: none | **Real runtime completeness regression:** an existing complete Input mirror had no independent local Entry field grant. |
| source topic-defer-add survives original assess fail-closed without false ACK or suppressing independent Context | **Same real runtime regression:** Context-only work still needs exact existing mirror qualification when Topic DEFERs. |

The separate original `ai-filter-field-grant.test.mjs` file passes all six tests locally on this same original tree. Its CI file-level failure is not attributed to this runtime change; dependency/Node-job diagnosis remains separate. No dependency install or stub was introduced here.

## Exact local-only grant closure

For each already-selected current child Input, the original dependency index `byInputTarget` selects bounded metadata candidates. Only an active `bodyBinding=input`, `provenanceType=input_original`, exact `workingInputId` Entry with complete body-only dependencies and a whole-body primary exact-excerpt proof is eligible. All dependency/provenance Input IDs remain inside the original current child selection, and all Source IDs remain inside those Inputs' original Source metadata. Non-mirrors are not granted by this route.

A new original processing-owner receipt explicitly grants that exact Entry ID/revision's `body`, `title`, and `note`. The frozen positive metadata proof includes the binding, lifecycle, source IDs, revision, `provenanceType`, complete dependencies and complete provenance. Every qualified text read rechecks this proof with the original cumulative work ledger and currentness/expiry/revocation. The original validators still run. Source retains its separate `originalText` field grant. Unknown nested content is not promoted to metadata.

This is additional **local qualification** permission, not model evidence. The remote payload, current Input set, Context/Filter coverage, candidate history and ACK units are unchanged. A following post-Topic local receipt carries prior exact selected Entry IDs, while the original private committed-publication chain remains required; it neither invents an Entry from a response nor refreshes the sent model baseline.

The new mirror proof does not freeze a second Topic root that would reject the original legitimate Topic writer's own changes. Original Domain before/expected-after and final fences continue to own Topic membership. A genuinely added ungranted Topic member is rejected with zero reads of its body/title/note, both before grant and between the actual grant and original prepareMaterial. The original Context final-facts capture includes the new mirror fields and metadata before its first mutation, and exact equality after ACK/usage/job rejects late drift in the joined transaction.

## Added evidence and preserved intermediate results

Nineteen new cases cover:

- Three independently refused Entry fields, with zero mirror text, zero physical calls and zero Context ACKs.
- Expiry, revocation and issuer-currentness loss after resolve, with the same zero-read boundary.
- Dependency, provenance, binding and provenance-type changes after the local grant, rejected before text.
- Late mirror note changes at Context ACK, usage and job writes, rolling back the original Context mutation and ACK while preserving one paid response.
- A real unselected human Entry joined to the mirror Topic before or after grant, with zero stranger-field reads and no Context ACK.
- An already-selected mirror is not rediscovered, while its exact independent three-field receipt remains mandatory: success plus separate body/title/note refusal controls.

A final self-check exposed a **new repair-proof defect**: without freezing `provenanceType`, an in-place change to that field could still commit. Its separate one-case RED is retained, followed by the explicit scalar projection/current comparison and GREEN. This is not relabeled as one of the original ten CI failures.

The initial new-negative fixture wrapper failed to reach the copied constructor resolver; its six failures are retained as fixture errors. The first stranger-member probe counted the human placement owner's own reads; its failed oracle is retained separately. The next probe attempted a nested mutation at the repository return boundary and was interrupted; the final probe uses the genuine next original prepareMaterial boundary. None of those preliminary harness failures is counted as an independently reproduced privacy defect.

## Validation

**Final successor: 402/402 passed**, zero failures, cancellations or skips, in 86,608.782701 ms on Node v24.19.0. This includes the whole original Section reconciliation suite, including both six-member positives. The 907-file core/test/service before-and-after inventory is byte-identical. Final log: `paia-pr301-maintenance-repaired-final-v3.tap`, SHA-256 `8debdc4debaa58c5a7f8480a4c949861564b757f79ebd33bda1ef04862b4dfe1`. The unchanged original two-child source cases also pass **2/2**, 19,767.931358 ms, in `paia-pr301-mirror-dedup-source-two-final.tap`. Final package check passes 19,761 guardrails across 566 runtime resources.

The preceding 279/279 snapshot remains preserved at its original identity; wider testing then exposed two six-member Section budget regressions and two 21-Input/two-child source regressions. The real Section trace proves redundant mirror proof scans exhausted the unchanged cumulative read limit. The successor skips mirror discovery only when that exact Entry was already selected in the original metadata closure and will receive the same independently granted body/title/note fields. Original mapping/Domain proofs still own its eligibility. No budget is increased or reset. The fresh missing-mirror path and all fifteen prior new controls remain intact. Four additional controls prove the deduplicated path still rejects any absent field. The original two source cases are rerun without changing their payload, two-call, exact ACK or cross-child-ref assertions.

The earlier 185/185, 91/91, 278/278 and 279/279 runs retain their earlier identities and are not added together as extra cases.

Exact final combined command:

```sh
node --test \
 extension/tests/ai-cost-03-maintenance-session.test.mjs \
 extension/tests/ai-cost-03-section-topic-reconciliation.test.mjs \
 extension/tests/ai-maintenance-owner-integration.test.mjs \
 extension/tests/ai-filter-field-grant.test.mjs \
 extension/tests/ai-maintenance-{qualification-capability,qualification-session,local-qualification-closure,mixed-qualification,post-topic-qualification}.test.mjs
```

The repair package contains the two runtime files, the original Maintenance test file with retained assertions, this receipt, a complete diff, original and repaired logs, and a SHA-256 inventory. No workflow, threshold, timeout, test skip, provider request, credentials, installation or deployment is included.

Remaining qualification is explicit: exact changed-head Node 22 Full/native CI, production/live-provider quality, the later candidate lane, strict Topic identity atomic revocation, edited/history sibling cases and the wider Maintenance semantic matrix are not closed by these local results. Existing Topic label access remains under the original identity-domain contract; this mirror grant does not claim to grant all Topic labels.
