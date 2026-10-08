# AI-COST-02 — pure calculation candidate

Scope: AI_USAGE_ARCHITECTURE sections 2, 10, 11 and 15 (AIU-QWEN-1.0).
This slice adds pure helpers only. It neither replaces AI-COST-01 nor closes 02.
No caller imports these modules into worker/provider/storage/UI in this batch.

- `ratebook.js` validates exact preverified route/tariff dimensions, input-length
  bands and freshness; uses fixed integer microcurrency arithmetic with upward
  rounding and one CNY-to-USD adverse-bound conversion. Request-bound quotes
  assume the highest admitted input-category rate, not speculative cache hits.
- `usage-normalization.js` consumes a neutral adapter DTO. Cache read/create are
  disjoint input portions; reasoning is already included in completion. Missing
  final usage remains unknown, never zero or permission to release a reservation.
  These are not claimed raw Qwen response keys or qualified streaming parsing.
- `admission-policy.js` consumes already verified service facts and usage that
  includes in-flight/unknown reservations. It checks the canonical separate
  feature/result/attempt/token/spend ceilings plus user/global brakes. Valid local
  and authorized exact-cache reads need no financial admission. Its only remote
  positive result is `eligible_for_atomic_reservation`; `dispatchAllowed` is
  always false. It does not mutate usage, apply time resets or reserve funds.

The `verified`/`verifiedServiceFacts` inputs are explicit trusted-service seams,
not cryptographic proof or a browser Pro flag. A future trusted service must
verify principal/entitlement, consent and route qualification, establish real
rolling windows/cadence/concurrency, bind the quote to the actual request and
perform atomic cross-device reservation. Maintenance cadence, result-slot
ownership and already pending attempts must be attested there. No signature
verification, subscription backend, second ledger, scheduler, SDK, credential,
remote call, implicit retry, settlement/refund or append-only adjustment system
is implemented here. Late bills and missing final usage still need that service.

All tariff and FX fixtures are conspicuously synthetic. No current provider
price, exchange rate, account region, actual tokenizer accuracy or financial
qualification is claimed. Real API profile/parameter/usage-shape and bounded-token
qualification remains pending. The documented Qwen completion overshoot headroom
is checked within the existing output cap; `max_tokens` alone supplies no proof.

Validation: complete new owning files plus unchanged AI-COST-01 foundation and
bounded organizer owning files are selected. An earlier selector mistakenly
included `historical-budget.test.mjs`, which tests ChatGPT history response sizes,
not financial budgets: five cases failed at sandbox Chrome launch (SIGABRT),
while the 68 relevant cases passed. That failed log is retained; it is neither
native evidence nor hidden by reclassifying a cancelled/skipped result as PASS.
The corrected selection contains no browser or provider execution. Production
behavior, native/hosted admission and real billing acceptance remain unqualified.

Final corrected local selection: 69/69 pass (15 new pure-policy checks, 46
AI-COST-01 owning checks and 8 bounded-organizer owning checks), zero failures,
skips or cancellations. The separate `root_finish` reviewer completed the
independent review and ran the 15 new owning checks successfully. The subsequent
`settings_review` pass was a re-review by the original author and does not count
as another independent review or expand the 69-case validation scope.

Integration, native/hosted admission, full certification and paid-service/billing
qualification remain pending. The independent review certifies neither production
activation nor those outstanding boundaries.

## Fixture-backed atomic reservation follow-up

Base caee2bd709a0463fc731bef13089cdefd13c4ebb; local working-tree evidence,
not an exact-head hosted or production financial certificate.

`FixtureAtomicReservation` reuses `quoteRequestBound` and `evaluateAdmission`.
An injected shared transaction reads usage, checks all existing policy ceilings
and stores the bounded request/quote reservation in one commit. Missing authority
verifier/clock/transaction fails closed; the verifier must bind the exact request.
Operation replay is idempotent across reconstructed instances, job/child identity
cannot be rebound, and transaction abort rolls back both occupation and clock
watermark. Both already-reserved and new siblings are refused behind a dispatched
or unknown child. No method grants dispatch: every returned receipt explicitly
sets dispatchAllowed=false; lifecycle recording is simulated evidence only.

All unresolved reservations count against day and month envelopes regardless of
age. This proves conservative unknown retention across windows, NOT complete
rolling-window/calendar entitlement accounting. Only cancellation before dispatch
releases occupation; its immutable child identity cannot be reminted. No settlement,
NOT_ACCEPTED proof release, paid retry, bill reconciliation, quota expiry, cadence,
interactive concurrency scheduler, signed entitlement or production adapter is
implemented. The bounded 10,000-row snapshot refuses further reservations when
full; no history is silently pruned. Scalable service storage/retention remains
unqualified. This module does not create a store, schema or feature-specific ledger.

The tests supply a visibly synthetic transaction implementation that serializes
all principals and atomically publishes a copied snapshot. Reconstruction shares
that fixture state; it is not a real process restart, IndexedDB durability test,
cross-device backend, clock attestation or signature validation. The eventual
trusted service must supply those guarantees before any financial activation.
No shared data owner, foundation module, worker, UI, Sync, CI or network is changed.
The existing local/cache policy remains available when financial admission fails.

Validation: 13 new owning cases plus all existing AI-COST-02 and AI-COST-01
foundation tests: 74/74 PASS, zero failures/skips/cancellations, 1.433 seconds.
Command: `node --test --test-concurrency=1 tests/ai-cost-02-*.test.mjs tests/cpv1-ai-cost-01-foundation.test.mjs`.
Local log: task workspace `work/ai-cost-02-atomic-regression.log`.
An initial file-creation command used a duplicated extension/ path and failed
before creating the new test. Its subsequent 15 old-policy passes were not new
module evidence; corrected owning selection first passed27/27, then74/74 after
the reserved-sibling regression. No failed assertion was weakened or hidden.
Independent review of this follow-up is pending. AI-COST-02 remains incomplete;
paid/model/identity/billing, native service integration and exact-head hosted
acceptance are still open.

### Settings combination and candidate unit scheduling

Exact10546bcf reconciles current Settings main a733ae5. Independent review verified all300 prior browser routes against actual main, all9 AI runtime files unchanged from c24128ab, and46/46 foundation checks. Related AI/partition files41/41 passed. The unchanged complete AI-COST-01 native source/release file2/2 passed6.24s using explicit Playwright1.63.0, with HEAD and recorded bytes unchanged and an isolated audited release. This remains page/IndexedDB synthetic evidence, not worker termination or paid/cloud acceptance.

Candidate37709124549 failed the retained10k history performance case at its original240-second limit while running four unit workers. The history test and production owners are unchanged from Settings main. Candidate unit execution now uses one worker within its existing15-minute job budget; no file selection, assertion or timeout changes. Independent YAML/environment review and17 complete CI/routing checks passed. The failed old run remains FAIL; a new exact-head complete suite must establish whether the unchanged budget is met.


## Fixture settlement contract follow-up (independent review pending)

Base2b3ba9148cabe9c016f201dc9bc011d72e3576b3, independent worktree
ai-cost-settlement. This extends only FixtureAtomicReservation and its owning
unit tests; no worker/store/schema/CI/model/entitlement adapter is connected.

Settlement is a separate injected verification boundary binding the exact
immutable request and metadata-only evidence. A missing verifier, incomplete
usage, operation/receipt rebinding, nonmatching tariff or contradictory final
receipt fails without changing occupation. Identical receipts are idempotent
across concurrent/reconstructed instances. UNKNOWN retains its full reservation
across windows; it is neither zero usage nor proof of nonbilling. Final fees or
tokens above the original reservation fail with SETTLEMENT_OVER_BOUND and retain
the existing dispatched/unknown occupation. No implicit replacement dispatch is
possible; every returned receipt still says dispatchAllowed=false.

Reservation retains its qualified tariff/FX snapshot. Final complete normalized
usage is priced against that snapshot, never a later tariff. USD arithmetic must
match exactly. For non-USD, actual USD billing conversion is an explicit verified
receipt fact bounded by the conservative original FX quote, not a claim that the
reservation FX estimate is an actual bill. No real provider receipt parser or
signature validation is supplied. Older fixture rows lacking the tariff snapshot
remain held rather than guessing settlement prices.

Billed FAILED outcomes retain actual spend and physical attempt occupancy but do
not consume an effective result. VALIDATED children retain a provisional job slot.
COMMITTED requires independently verified complete-scope evidence: all planned
children, exact operation/receipt pairs, and previously settled VALIDATED siblings;
a failed/missing child cannot be presented as a complete result. Result quota is
charged once per logical job, independently from each child's financial spend.
Token/attempt accounting remains conservatively bounded by admitted requests;
rolling expiry, NOT_ACCEPTED retry proof, reconciliation of over-bound invoices,
production financial storage and actual service signatures remain unimplemented.

Tests were written before implementation: the nine initial owning cases failed
with missing settle API, preserved in work-settlement-negative.log. An initial
command used the wrong test path and found no file; it is not negative-test
coverage. After implementation and four additional negative/accounting cases,
all AI-COST-02 files plus the full AI-COST-01 foundation passed87/87, zero
fail/skip/cancel,1716.166334ms. There are13 new settlement cases, including missing
verifier, partial usage, excessive/mismatched fees, duplicate/conflicting/cross-
operation receipts, asynchronous caller mutation, transaction abort, unknown
across31days, complete child-set binding, failed sibling, result cap and retained
spend. Log: work-settlement-final.log. Existing unchanged83-pass intermediate
results are not the final complete selection. Final comment-only correction
clarifies that rolling expiry, not settlement, remains absent.

No browser or paid/cloud call was needed or performed. This proves a serialized
synthetic transaction contract, not real durable service restart, signed billing,
production cross-device admission or whole AI-COST-02 completion. Independent
review and later exact candidate integration remain pending.

Independent review follow-up: a new actual-service regression reproduced a
terminal quota defect (work-settlement-cancelled-sibling-negative.log): filtering
cancelled rows before examining logical-job completion left a billed FAILED
child plus cancelled sibling holding a result slot forever. Result occupancy
now examines the complete principal/feature sibling collection. Financial,
physical-attempt and token accounting still exclude pre-dispatch cancellations.
The regression confirms three such failed jobs admit a new job while billed
spend remains budget-constrained. UNKNOWN with a cancelled sibling still holds
its provisional slot; all-VALIDATED without COMMITTED also holds a provisional
slot and reports zero effective results.

The first combined rerun exposed test-fixture aliasing: the existing asynchronous
caller-mutation test mutated a shared usage object. Evidence fixtures now clone
that object per receipt. The failure remains recorded in
work-settlement-cancelled-sibling-fixed.log (87 pass/1 fail); it was not a product
usage-normalization relaxation. The intermediate corrected selection passed88.
Final complete command:
`node --test --test-concurrency=1 extension/tests/ai-cost-02-*.test.mjs extension/tests/cpv1-ai-cost-01-foundation.test.mjs`
passed89/89, zero fail/skip/cancel,1825.243083ms, including15 settlement cases
(work-settlement-review-final.log). Earlier87/88 counts are superseded, not
rewritten. Production service integration and final independent re-review remain
pending; this evidence remains synthetic and does not authorize dispatch.

Second independent review requested actual first-settlement financial coverage.
The old changed-ratebook test was accurately renamed: it tested a conflicting
already-settled receipt, not changing the current tariff. Four new service cases
now reserve with a CNY tariff/FX snapshot, then change the current verifier facts
(and separately expire them) before first settlement. Both the original pricing
snapshot and FX have expired at actual settlement time; the original qualified
reservation-time snapshot still prices incurred usage. Verified actual USD429
for CNY3000 is distinct from the conservative quote ceiling USD500. Wrong FX
version, fees above total reservation and fees above the actual-usage quote
ceiling reject with identical persisted rows. USD never undergoes an available
CNY FX conversion. A verifier that substitutes evidence while preserving request
identity also rejects without mutation.

The full AI-COST-02/foundation command above now passes93/93, zero fail/skip/
cancel,1594.843958ms (work-settlement-pricing-proof.log), including19 settlement
cases. The unchanged owning admission-route file additionally passes1/1 via
`node --test extension/tests/ai-cost-current-browser-admission.test.mjs`
(work-settlement-admission-route.log). No production changes were required by
these cases, and no browser was repeated. Injected synthetic tariff, billing and
FX attestations are not signed provider receipts, current real pricing, actual
invoice reconciliation, production storage or dispatch authorization.

Final independent review: the coordinator and a separate reviewer accepted the
quota sibling correction and additional first-settlement pricing proof above.
This closes independent review of this bounded fixture-only slice (93 owning/
foundation cases plus1 admission-route case), not subsequent main integration or
any production service/whole AI-COST-02 gate. Earlier pending notes describe the
historical review state and remain preserved.

### Current-main combination 2026-10-08

Settlement feature5fc3b318 was independently reviewed. Section-main merge1bdf0677 passed105 complete related checks and AI-COST-01 source/release headless2/2 (Playwright1.63,398 bound files unchanged during run). This covers page IndexedDB and reload fencing, not worker termination or real provider service. Sync-main c168b131 merged at a2b391d1 without conflicts; AI runtime, AI01 native/harness, worker and backup bytes are unchanged versus1bdf. Additional AI/CI/Sync combination66/66 PASS. Independent CI review retains every304 baseline routing assignment and all77 complete browser files. Current remote candidate checks remain required; no production settlement adapter or paid model activation is claimed.
