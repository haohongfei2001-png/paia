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
