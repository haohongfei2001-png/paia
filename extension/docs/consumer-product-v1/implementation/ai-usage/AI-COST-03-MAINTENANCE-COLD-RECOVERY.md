# Original Maintenance cold financial recovery — scoped local candidate

2026-10-18. This successor starts at original RED commit `d14a556d5460df8829d39d3be1b4b4bd9e34b179` (parent `178831ef`). It completes the cold financial boundary left open by [the original Maintenance service path](AI-COST-03-MAINTENANCE-SERVICE-PATH.md), without changing the service ledger, budgets, worker scheduling, provider configuration or domain commit owners. The earlier receipt and its actual evidence remain historical facts.

## Original-owner behavior

- Foundation captures the original body-free preflight, fixed one/two-child set, request bindings, attempts, dispatch fences, library flight and exact partial coverage ACKs. Recovery handles and status/cancellation observations remain private capabilities. Clones, foreign owners/transports, swapped siblings, caller-array mutation and stale captures cannot write financial receipts.
- Every declared operation must have authentic known settlement or authentic cancellation of its original provably unsent reservation. A declared `NOT_FOUND`, dispatched/unknown outcome, missing receipt or lost cancellation ACK stays unresolved. A null following request counts as never declared only alongside its exact original `service-planned`, attempt-zero, `NOT_RESERVED` row, no financial request and no dispatch fence.
- Reconciliation writes the complete original sibling set atomically. Actual spend and receipt identities survive. Existing COMMITTED child rows and exact Topic/Context ACKs remain unchanged; a partial failed cycle keeps its committed coverage and domain evidence. Lost provider bodies are not recovered, replayed or represented as complete domain success.
- An already-issued cancelled domain event is preserved byte-for-byte, including its original child execution kind and null operation receipt. The original result-receipt validator accepts financial enrichment of a Maintenance service-planned child only with the same-transaction saved original marker, exact cancelled zero-attempt row, exact original domain child, full request binding and actual financial evidence. The generic other-job path is unchanged.
- Current principal, library, consent and enabled gate apply before metadata transport and at final reconciliation. Original repository write observations fence query/cancellation sends. Final transactional checks cover the original marker/job, financial rows, dispatches, partial ACKs, flight, repository identity and current session before committing.
- Recovery and pending result-ACK replay return one passive `RECOVERED` opportunity, with remaining work explicit. They cannot acquire material, qualify/tokenize a provider request, create a new declaration/reservation or start a provider. Result replay uses only the exact durable body-free original event; a later marker cannot invalidate its already-acknowledged historical subset.
- A later genuine opportunity may re-read actual domain state and derive a new immutable identity only from the exact saved original recovery closure. Foundation revalidates that proof, original result acknowledgement, principal/library/consent and contract/route in the planning transaction. The original server still decides actual cadence/admission. There is no random UUID, stale published declaration reuse, refund inference or quota reset.
- A fully financially closed historical marker may survive the handoff to a new, not-yet-declared plan. A cold restart resumes that same never-sent plan. Unresolved finance still requires its exact original active flight and cannot follow a replacement.

## Evidence and original failures

The original two actual signed-handler RED cases failed 0/2: a reserved ACK loss and a settled provider ACK loss both permanently blocked cold opportunities despite known service facts. `/tmp/paia-maintenance-cold-original-red-recheck.tap` retains the reproduced failures. The reservation case already had an immutable `CANCELLED_BEFORE_DISPATCH` domain event; its initial generic EXPIRED expectation was corrected to retain that exact event, not to weaken the financial recovery assertion.

The new final-preflight race control exposed an intermediate candidate overwriting a changed marker with its closure. The fix checks the original marker and job again before publishing either closure. Initial ACK/repository race fixture errors and a Context-hook index error were corrected without changing runtime thresholds or production authority. These intermediate runs are not final evidence.

Initial candidate `ec6cda466d3468219b864ef3ea080f062b7a9598` runtime/test command, repository root, local Node `v24.19.0`:

```sh
node --test \
 services/ai-gateway/tests/maintenance-client-recovery.test.mjs \
 services/ai-gateway/tests/maintenance-client-path.test.mjs \
 services/ai-gateway/tests/maintenance-cadence.test.mjs \
 services/ai-gateway/tests/maintenance-worker-entry.test.mjs \
 extension/tests/ai-cost-03-maintenance-session.test.mjs \
 extension/tests/ai-maintenance-mixed-phases.test.mjs \
 extension/tests/ai-filter-maintenance-session.test.mjs \
 extension/tests/ai-cost-02-client-domain-result.test.mjs \
 extension/tests/qwen-foundation-service-result.test.mjs \
 services/ai-gateway/tests/organize-client-recovery.test.mjs \
 services/ai-gateway/tests/assist-client-recovery.test.mjs \
 services/ai-gateway/tests/historical-client-recovery.test.mjs
```

Result: **407/407 PASS**, zero failures/cancellations/skips/todo, 26,550.222385 ms, `/tmp/paia-maintenance-cold-final.tap`. The 43 Maintenance recovery cases include original ACK losses, null/full siblings, genuine partial and COMMITTED domain truth, authentic missing/unknown holds, six invalid persisted-witness controls, ten final-transaction races, clone/foreign/swapped handles/evidence, result/cancellation ACK loss, concurrent cold sessions, exact lineage, actual later eight-hour signed-server admission, plan-to-declaration restart and later-marker historical acknowledgement. The remaining cases preserve the original worker/service and neighboring domain/recovery contracts. Earlier 82/82 and 322/322 runs overlap this final set and are not additive.

`git diff --check` and syntax checks pass. SQL and Qwen HTTPS remain the existing synthetic protocol fixtures; no actual database, private archive, credential or paid provider was accessed. The later-window fixture reconstructs fresh synthetic service identities/profile/authorization at real server time while preserving the original ledger and local store.

## Independent review correction: original repository identity

Independent review blocked `ec6cda4`: the private handle retained exact data but did not retain the capture-time repository identity. Replacing the repository or its database with byte-identical rows allowed a status/cancellation send or wrote the original observation into the replacement archive. The reviewer-authored six controls (repository/database × query/cancel/reconcile) are preserved unchanged at the start of `maintenance-cold-independent-negative.test.mjs`. They reproduced **0/6 PASS**, `/tmp/paia-maintenance-cold-identity-original-red.tap`; the earlier 407-test result did not cover this flaw and is not approval of that candidate.

The Maintenance handle now privately retains its original repository, database, IDB factory and name. Database identity comes from the existing repository-owned `requireRepositoryTransactionScope`, not a row, public clone or caller assertion. Capture is fenced against concurrent writes/identity changes. Query, cancellation and reconciliation reject a changed owner before entry, recheck the original authenticated transaction scope, and check again immediately before metadata transport or final transaction return. The original repository module and other recovery owners are unchanged.

Scoped final command (same local Node24, no broad rerun):

```sh
node --test \
 services/ai-gateway/tests/maintenance-cold-independent-negative.test.mjs \
 services/ai-gateway/tests/maintenance-client-recovery.test.mjs \
 services/ai-gateway/tests/maintenance-client-path.test.mjs \
 extension/tests/ai-cost-02-client-domain-result.test.mjs
```

**101/101 PASS**, zero failures/cancellations/skips/todo, 24,709.744166 ms. Log: `/tmp/paia-maintenance-cold-identity-final.tap`. This includes the original 43 recovery cases, all six unchanged independent negatives, six factory/name substitutions, and three final database/factory/name races proving full rollback and that restoring the genuine original owner permits the unconsumed original handle. Replacement cases send zero additional requests and change no replacement financial rows. `git diff --check` and both changed JavaScript syntax checks pass. Independent re-review remains required; these local results do not close the separate native/full acceptance boundary.

## Remaining boundary

Independent financial review and parent-only integration remain required. Combined Node22, broad native/browser/performance/visual/full acceptance and production activation are separate; no such pass is claimed here. Packaged service configuration remains null. No service resource, budget, dependency, permission, workflow, global status/version, deployment, installation, UI, Assist runtime or Sync functionality changed.
