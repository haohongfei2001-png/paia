# AI-COST-03 — bounded original Context Topic selection

Date: 2026-10-18. Independent local module based on `cbc07bd6e8bfb81e5926e3839ab1236da27b2e59`.

## Scope and original contract

The ordinary service adapter currently requires exactly one eligible Topic membership per Input. A legitimate additional Placement can make that set contain two Topics. Original Context lineage permits one Item to cite different Inputs in different Topics, but `contextEvidenceKey = ['input', inputId]` remains unique: one Input must not be duplicated under both Topics.

This leaf adds only `extension/core/ai-usage/maintenance-context-topic-selection.js`, its same-name focused tests, and this receipt. It does not modify the service adapter, LocalMaintenanceSession, TopicFormation, Context maintenance, permission owners, manifests, persistence, or version. Shared integration remains separately owned and unclaimed here.

## Integration seam

- `readMaintenanceContextMemberships(store, transaction, inputId)` returns a bounded, body-free membership projection. It counts all candidate dependency/placement ranges before reading Entry values, which can contain bodies. At most 100 dependencies, 100 total memberships, and eight Topics are admitted. Exact current Input, complete original Input-bound Entry, active placement/layout, Topic and Section facts are required.
- `selectMaintenanceContextTopic(memberships, {inputId, topicId})` is pure data selection. An explicit Topic must be among current qualified candidates. Array ordering never selects the Topic. This function is not authentication and may select either legal candidate when explicitly asked.
- `readMaintenanceContextTopicSelection(store, {input, read, assertSelection, scopeBudget})` requires the original guarded readonly callback and a synchronous `assertSelection(transaction, inputId)` returning exactly one Topic ID. It checks original processing preflight, full Context scope/shared-Entry restrictions, current Input identity/revision/removal/text digest, and repeats exact membership/current-owner checks after hashing. Hash work shares the original scope budget. No `independentContext` write, initialization, processing resolver, provider call, or persistent owner is introduced.

`input` is the existing private sent Input snapshot: `inputId`, `revision`, `removalSequence`, `sourceRecordIds`, `sourceIdentityTokens`, and `digest`. The wrapper returns `{topicId, scope}`.

The shared session must populate the fresh selection only from its actual original Topic result after the exact domain transaction and facet ACK settle, bound to the original job, child, operation, Input closure and current original receipt. Missing/unknown ACK, a different child, a clone/model JSON result, or stale owner state must not install that selection. Existing Items instead use the exact original registered handle/reference and per-Input provenance Topic after its original currentness assertion. The callback is an interface to that existing private owner, not a new authentication framework. Ordinary JSON, a root-read freshness token, or `result.topicIds` alone is never proof.

Original processing permission and final Context transaction/CAS/settlement guards remain mandatory. Source wiring and genuine session-binding adversarial certification are not established by these module tests.

## Local evidence

Final command:

`node --test extension/tests/maintenance-context-topic-selection.test.mjs extension/tests/ai-maintenance-existing-transition.test.mjs extension/tests/context-maintenance-no-change.test.mjs extension/tests/ai-maintenance-topic-wire.test.mjs`

Result: **124/124 PASS**, zero failures/cancellations/skips/todos, 4208.107465 ms. This comprises 47 new focused selection tests and 77 unchanged original owner tests. Final log: local execution `/tmp/paia-context-topic-selection-final.log`.

The new cases use the actual Store and original TopicFormation/Context owners with synthetic data and fake IndexedDB. They cover legitimate additional membership; exact existing Item provenance spanning two Inputs/two Topics; same-Input evidence uniqueness; explicit no-write checks; missing/unknown/wrong owner selection; guarded original receipt drift; human exclusion; layout/Topic/Section/Entry/placement/Input revision drift; shared-Entry legacy restrictions; complete bounds before material values; changed Input digest/source identity; and database replacement. Callback clone/forgery cases test the required private-owner boundary via a fixture implementation. They do not independently authenticate the shared source's callback, which is not wired in this leaf.

The first focused execution was **42 PASS / 5 FAIL**, 3649.046738 ms. Five negative fixture callbacks threw plain Error objects, which the actual repository correctly normalized to `STORAGE_FAILED`; the assertions expected `STALE_BASE`. Replacing only those fixture errors with the existing `contracts.fail('STALE_BASE')`/ArchiveError path produced 47/47 PASS. Production rejection behavior and assertion requirements were not weakened. The original failed log remains `/tmp/paia-context-topic-selection-tests.log`.

`node --check` for both added JavaScript files and `git diff --check` pass.

No Full, PostgreSQL, native/browser, paid/live/provider, installation, deployment, remote write, or whole-product acceptance was run or claimed. Source integration, independent review of that combined source path, and broader acceptance remain separate.
