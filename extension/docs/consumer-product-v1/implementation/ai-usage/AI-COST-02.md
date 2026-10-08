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
