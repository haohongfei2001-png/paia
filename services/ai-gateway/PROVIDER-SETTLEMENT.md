# Independent closure and actual PostgreSQL evidence — 2026-10-18

Exact f3ad9ad874b302594a1f995781b49959c542ab1a received independent CLEAN review, 150 scoped tests plus seven adversarial probes passing. Integrated 2aa9a6d2 / run 39104795518 attempt 1 now passes all 12 new real PostgreSQL settlement cases and the original ten provider cases, with synthetic HTTPS interception and zero real provider calls. Artifact 12127564944 SHA256 f97bf87858f79ec0549216d76e9bd288e173a24afd33fcd2db13e7972261d0a4 is verified. The separate original-ledger finalizeResult mechanics are integrated, but authentic client-domain reporting and PostgreSQL result-field storage remain successor implementation; schema success does not become effective-result success. Earlier NOT_RUN statements below retain their original pre-evidence scope.

## Preserved original slice records

# Source-only provider usage settlement

This bounded successor starts at `8c78923789737e7f3c08a3fb16b9666bc712fdaa`
(tree `dac05b331c715d4ddabaa72f4694fab93cb4611d`). It adds no HTTP route,
deployment wiring, schema, role grant, resource, credential, tokenizer recipe,
provider qualification or real network call. The previous once-send review and
real-PG evidence retain their exact predecessor identity. They are not evidence
that this settlement successor has passed real PostgreSQL or independent review.

## Original owners and contracts

- [Architecture §§9–11, 15.3–15.5](../../extension/docs/consumer-product-v1/AI_USAGE_ARCHITECTURE.md):
  one financial service, immutable child attempts, original conservative bound,
  actual final usage, no hidden replay, separate domain current-state/CAS proof,
  billed failures and unknown holds.
- [AI Usage plan](../../extension/docs/consumer-product-v1/AI_USAGE_PLAN.md):
  implement through the existing accounting owner; no paid activation or invented
  successful-result quota.
- [Original service](SERVICE-ENTRY.md), [PostgreSQL adapter](POSTGRES.md),
  [once-send owner](PROVIDER-RUNNER.md) and `reservation-service.mjs`:
  acknowledged original DISPATCHED precedes exactly one physical attempt;
  evidence INSERT is not a financial commit; unknown ACK never authorizes replay.
- Original `BudgetWindowReservation` / `AtomicReservationLedger.settle` remains
  the sole financial transition. No original extension production file changes.

## Implemented path

1. Original reservation, declaration, signed identity, provider/tokenizer
   binding, durable claim, acknowledged DISPATCHED and single-consumption send
   fence are retained. A non-USD reserved route is rejected before dispatch
   evidence or physical send. The original conservative CNY FX quote is not
   proof of actual billed USD conversion; unsupported conversion cannot silently
   start a paid request and knowingly leave settlement unimplemented.
2. Actual bounded JSON/SSE EOF parsing privately captures only known, complete,
   non-overbound normalized usage. The result association binds the exact
   server-owned material handle, identity digest and usage binding. Client
   objects/clones, another material handle and mutated public usage fields are
   not recognized. The private association stores metadata plus an opaque
   handle, never the request body, response body or provider reasoning.
3. Financial observation is distinct from derivative validity. A complete
   billed response with invalid derivative JSON/schema can settle FAILED while
   returning no derivative. Missing, malformed or overbound usage has no
   releasable financial evidence and retains the original full hold.
4. The dedicated least-privilege publisher checks its existing original six
   relations and role, the consumed/acknowledged send ticket, immutable dispatch
   event, exact original request/child, reserved-row digest, profile/usage binding,
   original pricing and token/monetary ceilings. It appends one deterministic
   `SETTLEMENT` event in the existing `operation_evidence` table. Original USD
   tariff arithmetic supplies the amount; no client amount or independent
   monetary counter exists. This INSERT does not write the financial snapshot.
5. `createPostgresProviderSettlementService` reads that immutable event under
   the original global ledger lock, then calls the original
   `BudgetWindowReservation.settle` inside that same storage transaction.
   Original receipt rebound, exact pricing, usage validation, amount ceilings,
   idempotence, rollback and unknown-COMMIT behavior remain authoritative.
6. Only acknowledged original SETTLED allows the normal response path to
   continue. Current derivative authority is revalidated afterward. Its final
   successful read-only SHARE-lock COMMIT remains the result-authorization
   linearization point. A subsequent committed revocation does not retroactively
   recall that authorized delivery; the consuming domain still applies its own
   current-revision/CAS/protected-write proof.

## Narrow historical financial authority

The ordinary `reservation-service.settle(bundle, eventId)` verifies current
signed content/declaration/route authority. Reusing that guard after a physical
response would discard accounting on content revocation or a short grant's
expiry. The new `ProviderAccountingGuard` is deliberately settlement-only:

- It requires the configured service profile/identity-root hash, original
  locked row in DISPATCHED / OUTCOME_UNKNOWN / SETTLED, exact immutable request
  hash and operation, original dispatch evidence, and the append-only usage
  receipt from the trusted provider publisher.
- It retains DB-clock and original durable watermark checks, actual guarded SQL
  publication, forced RLS and nonowner/nonsuperuser/non-BYPASSRLS requirements.
  Its financial reader cannot insert/update/delete authority or usage facts;
  inherited column-level INSERT rights are checked as well as table rights.
- It derives only settlement window metadata from the original reservation.
  Actual costs use the row's reserved tariff/FX identity and original price time;
  later route/pricing changes cannot reprice consumed usage.
- It does not reinterpret current disabled consent/entitlement/route, expiry or
  revoked content as permission to read/disclose content or make another call.
  Those conditions still block the derivative through the original guard.
- Historical financial evidence is not a short-lived content grant. Its stored
  expiry is the existing maximum safe metadata timestamp; original append-only
  retention remains. No expiry refunds money or permits replay. Missing evidence,
  wrong configured profile/root, unsafe roles or clock rollback fail closed.
- This private source API is never exposed through HTTP and cannot reserve,
  cancel, send, publish a domain result, or produce COMMITTED evidence.

A known failure publishing usage leaves the original hold. A lost publication
ACK leaves the hold and may leave a durable immutable event for independent
reconciliation. An unknown original financial COMMIT ACK returns
`reservation: ACKNOWLEDGEMENT_UNKNOWN`, no derivative and no claimed known
settlement; the database may contain either the hold or its genuine settlement.
Independent read-and-settle reconciliation is idempotent and performs zero
provider calls. Neither response suppression nor a failed/unknown ACK starts
another HTTPS request.

## Explicit result-finalization boundary

Normal schema-valid usage settles under the original `VALIDATED` state, with
`effectiveResults: 0`, `domainValidity: NOT_EVALUATED` and
`resultFinalization: PENDING_DOMAIN_PROOF`. This preserves the original provisional
result slot; it does not claim semantic validation, a committed result or quota
completion. A schema-invalid billed result settles FAILED and releases only the
failed result slot, retaining its physical attempt and actual spend.

The original owner makes SETTLED evidence immutable. A real probe of a legitimate
single-child VALIDATED -> COMMITTED transition throws `SETTLEMENT_CONFLICT` at
`atomic-reservation.js:83`. Its RED is preserved separately. The checked-in test
asserts that actual limitation; it is not a repaired closure test or product
completion claim. Settling every successful child VALIDATED therefore requires
an additional original-owner result-finalization operation before complete
operational delivery. That operation must preserve immutable spend/usage/receipt,
verify a trusted domain commit or failure, bind the exact complete child set,
retain missing/unknown children, charge effective quota at actual commit time,
and be idempotent and terminal. Its independent implementation/review and the
server domain-proof adapter are outside this slice. No second result counter,
forged COMMITTED proof, permanent-slot-debt completion claim or silent refund is
introduced here.

## Development evidence

All fixture content, signing material, credentials, manifests, routes and
qualification references are explicitly synthetic. HTTPS is intercepted in
runner tests. Deterministic PostgreSQL protocol fixtures are not real database
locking evidence. Existing pinned `pg` 8.23.1 was reused locally; no dependency,
package, CI workflow or timeout change is included.

Real REDs on unchanged production:

- `01-baseline-real-red.tap`: successful response and post-response content
  revocation both leave DISPATCHED instead of recording actual expenditure,
  **0/2 pass**. The initial settlement implementation fixes both.
- `04-original-finalization-real-red.tap`: original immutable VALIDATED settlement
  rejects subsequent legitimate result closure, **0/1 pass**. This original-owner
  boundary remains open as described above.

Additional retained development logs include the initial 32-case compatibility
run, whose five old assertions/transaction counters described the prior
no-settlement path, and an initial 149-case run with one test-fixture mutation
placed before the mock send-fence COMMIT overwrote it. The fixture now changes
the original row after that actual commit boundary; no production check or
assertion was weakened. Those failures are not relabeled as passing runs.

Final targeted command:

```sh
node --test --test-reporter=tap \
  services/ai-gateway/tests/provider-settlement.test.mjs \
  services/ai-gateway/tests/provider-evidence.test.mjs \
  services/ai-gateway/tests/provider-runner.test.mjs \
  services/ai-gateway/tests/provider-response.test.mjs \
  services/ai-gateway/tests/reservation-service.test.mjs \
  services/ai-gateway/tests/postgres-ledger.test.mjs \
  extension/tests/ai-cost-02-settlement.test.mjs \
  extension/tests/ai-cost-02-budget-window-reservation.test.mjs \
  extension/tests/ai-cost-02-atomic-reservation.test.mjs \
  extension/tests/ai-cost-02-usage-normalization.test.mjs
```

Final result: **150/150 passing**, no failures or skips, in 11.92 seconds. The
preceding 149-case run also passed; the final run adds disposal after complete
usage observation while accounting finishes. The final result is recorded in
`09-final-scoped-green.tap` in the execution
workspace's `/tmp/paia-provider-settlement-evidence/`. Changed `.mjs` syntax,
whitespace and the unchanged deployment graph check pass. These scoped checks do
not establish broad acceptance, real TLS/provider behavior or an operational
financial service.

New real-PG source: `tests/provider-settlement-postgres-live.test.mjs`, **12 cases**,
separate real roles/connections, original global-lock barriers, competing
reconciliation, publication/financial lost ACK, content revocation, malformed and
overbound usage, column-level publisher privilege refusal, and post-final-COMMIT
revocation. Existing ten provider real-PG cases retain their safety assertions;
expected success now includes actual settlement and the final-fence stage follows
usage publication. Neither suite has been executed on this successor.

```sh
node services/ai-gateway/tests/run-provider-settlement-postgres-tests.mjs
```

The new strict launcher refuses without an explicitly approved NEW numeric-
loopback `paia_ledger_test_*` database and `PAIA_LEDGER_TEST_DISPOSABLE=yes`.
Local preflight is **NOT_RUN / exit 2** (`06-disposable-pg-not-run.log`). No
production/ambient DSN fallback or real provider call exists. No actual database,
role, cloud resource, credential, remote write or deployment was performed here.

Remaining delivery gates: independent source review (especially historical
accounting versus content authority), actual disposable-PG execution on the
reviewed candidate, final result/domain-proof composition, reviewed HTTP/registry
wiring, qualified model/tokenizer/input bound, real identity/privacy/tariff/
output-bound/resource prerequisites, and separately authorized paid activation.
Broad/full/browser acceptance and installation remain deferred, not passed.
