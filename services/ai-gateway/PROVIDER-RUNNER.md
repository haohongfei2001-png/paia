# Source-only once-send provider boundary

This slice adds a durable claim/dispatch/send owner and a bounded Qwen response
path. It is **not installed by any HTTP or deployment entry**. Existing
reservation/declaration APIs, their schemas, bootstrap, deployment selector,
permissions and extension owners are unchanged. This is an intentionally bounded
follow-on, not completion of the operational provider gateway. No real provider,
credential, role grant, resource, deployment or private content was used.

## Original contracts and scope

- [Architecture §9–11](../../extension/docs/consumer-product-v1/AI_USAGE_ARCHITECTURE.md):
  original admission/financial owner, complete-input caps, atomic reservation,
  current authorization, durable child identity, conservative unknown holds.
- [Architecture §15.3–15.5](../../extension/docs/consumer-product-v1/AI_USAGE_ARCHITECTURE.md):
  service-owned allowlisted Chat Completions route, total billed-output bound,
  measured input/tokenizer overhead, actual final usage, no implied synchronous
  replay guarantee, exact qualified ratebook and currency.
- [Plan phases 1–2 and Qwen amendment](../../extension/docs/consumer-product-v1/AI_USAGE_PLAN.md):
  body-free receipt metadata, separate effective quota and spend, disabled SDK
  retries, existing quality floors and no production-network acceptance here.
- [Service entry, provider evidence boundary](SERVICE-ENTRY.md): a future runner
  must successfully record original `DISPATCHED` before physical send; reservation
  success and an evidence INSERT alone are insufficient.
- [Client declarations](CLIENT-DECLARATIONS.md): authenticated metadata binds
  exact request, body digest, authorization and child scope; it is not proof of
  provider profile, tokenizer, or domain truth.
- [PostgreSQL adapter](POSTGRES.md): one original ledger key, current locked
  authority and DB clock, acknowledgement loss is unknown, no external effect in
  `PostgresLedgerStorage.transact` callbacks, no automatic refund/replay.
- [Original request controls](../../extension/docs/consumer-product-v1/implementation/ai-usage/AI-COST-02-QWEN-REQUEST-CONTROLS.md),
  [usage contract](../../extension/docs/consumer-product-v1/implementation/ai-usage/AI-COST-02-QWEN-USAGE-CONTRACT.md)
  and original raw JSON/SSE decoders remain the request/usage contract. Synthetic
  profiles and their qualification flags remain synthetic.

## Implemented sequence

1. `provider-runner.mjs` refuses unless explicitly enabled with two distinct
   `pg.Pool` objects, identity/profile inputs, bounded manifest, explicit finite
   concurrency, current-profile callback, required tokenizer capability and
   explicit provider credential. Disabled/missing-tokenizer construction does
   not read the credential, connect to a database or initiate a request. There
   is no ambient environment, DSN, key, URL, model, region or budget fallback.
2. `provider-request.mjs` snapshots the bounded input. It binds the original
   signed reservation request, canonical declaration hash/generation,
   `payloadDigest == contentGeneration`, exact payload, child operation, original
   authorization ID and scope digest. It delegates envelope/tokenizer/profile
   validation to the original `createQwenQualifiedRequestOwner`; client claims
   never become provider or financial facts.
3. `postgres-provider-evidence.mjs` locks the original ledger and original
   service/principal/route/request authority. A separate least-privilege
   publisher validates the actual role/schema and authenticated declaration.
   It prepares a request against the original `RESERVED` row, checks the final
   DB-clock interval and appends a deterministic original `DISPATCHED` event.
   It does not mutate the financial snapshot. Failed/unknown commit gives no
   ticket. Durable occupied rows plus still-RESERVED rows with dispatch evidence
   enforce explicit concurrency; no independent monetary counter is introduced.
4. The runner calls **original** `createPostgresReservationService.record`.
   Only a known `recorded` / `DISPATCHED` result can reach send. Failed or unknown
   original commit means zero physical attempts. A read-back, restart or second
   instance cannot turn an old claim into authority to replay.
5. A private single-consumption ticket opens a separate read-only send fence.
   It locks the same ledger and current authority, verifies the actual original
   `DISPATCHED` row, reconstructs its reserved-row digest, compares the current
   route, exact declaration generation and sole claim event, and rechecks the
   DB interval plus a conservative monotonic elapsed-time bound. Original
   revocation locks remain held through synchronous physical initiation.
   The provider promise is boxed; the response is never awaited under these
   locks. This is outside the original financial transaction callback.
6. `provider-transport.mjs` calls Node HTTPS exactly once, with the original
   canonical envelope and explicit service-only credential. It permits only the
   pinned workspace/region Model Studio hostname and Chat Completions path,
   HTTPS/443, normal certificate validation and TLS >= 1.2. There is no SDK,
   redirect, fallback, proxy configuration or transport retry. Connection/header
   stalls have a 20-second deadline; the runner has a 30-second deadline.
7. `provider-response.mjs` bounds actual response bytes/chunks/deadline, UTF-8,
   media type, compression, content length, JSON/SSE syntax, actual EOF and
   terminal usage. It uses the original raw decoders and usage parser, then compares actual
   input/completion tokens to the exact original reservation request bounds
   as well as the product/profile caps, and checks the original bounded schema. Only parsed content is returned; reasoning,
   raw provider errors and request bodies are not logged or returned. Schema
   success is explicitly not domain validation or financial settlement.
8. Before exposing a derivative, original current authority, declaration,
   reserved-row/profile binding, original durable clock watermark and DB-clock
   interval are checked again. A late
   COMMIT acknowledgement cannot expose an expired derivative. The successful read-only COMMIT holding the final SHARE locks linearizes
   authorization. A revocation that commits afterward, even while its ACK is
   travelling, does not retract that already-authorized delivery. This does not
   remove the finite DB-interval check. The client/domain owner still requires
   its own current-revision/CAS/protected-write validation.

An abort/dispose/revoke before physical initiation can leave a committed
`DISPATCHED` row with **zero** physical attempts. The original hold remains;
this owner has no proof authorizing a refund. After initiation, HTTP failure,
unknown outcome, timeout, cancellation, missing usage or malformed data does not
cause a second physical attempt. The dedicated publisher can append an original
`OUTCOME_UNKNOWN` event and the original service records it when current
permissions/time still permit; otherwise the original `DISPATCHED` hold remains.
A lost send-fence COMMIT acknowledgement after initiation also retains unknown
spend without replay. Observed over-cap usage permanently stops this runner
instance; distributed affected-route revocation remains the existing trusted
route/control owner's responsibility, not a new grant to the event publisher.

## Publisher role separation

No production SQL migration or grant is added. At runtime the publisher must be
nonowner, nonsuperuser, non-BYPASSRLS, with forced RLS on the original six tables.
It may SELECT and use the existing lock-anchor UPDATE columns, and INSERT only
the existing `operation_evidence` fields. Effective inherited rights permitting
financial snapshot updates, request/route/control changes, prior evidence
updates/deletes, schema CREATE, DELETE/TRUNCATE/TRIGGER/REFERENCES are refused.
The reservation pool is a distinct original financial writer. Test-only
provisioning is confined to the guarded, new disposable PostgreSQL test database.

## Tokenizer qualification: precise remaining dependency

The original Architecture §10 (complete instructions, schema, evidence and
context) and §15.3 (measured tokenizer/protocol overhead headroom) require the
actual tokenizer and a justified complete-input bound. They **do not require
provider-bill-identical prediction**, disclosure of proprietary internal prompt
text, or exact equality between a conservative reservation and final usage.
A compliant future method can use the real model-matched tokenizer plus a
qualified conservative bound for the selected API's protocol/schema overhead,
reserve the resulting worst-case complete input and output, then independently
settle actual qualified provider usage through the original owner. Larger
headroom can reduce usable context and increase holds; it cannot silently raise
product caps, lower quality floors, change models or consume extra authorization.

This commit has no qualified tokenizer implementation or service registry.
`tokenize` is a required trusted source capability, not an HTTP parameter. It
must return the original request-digest/profile/tokenizer/qualification bindings,
content-token count, measured protocol-overhead bound, input total and expiry.
The manifest must bind the original profile, route/ratebook dimensions, wire
instructions/schema, tokenizer reference, limits and validity. Hashes and
`route_authority` booleans do not establish qualification. All test capabilities
and manifests say `SYNTHETIC`; outputs retain `qualification:NOT_ESTABLISHED`,
`sourceKind:SERVER_SOURCE_INJECTED_TOKENIZER`, and false authority/retry flags.

Read-only official reference review found the open-model byte-BPE implementations
and public model/tokenizer discussion at
[Qwen-Agent tokenization_qwen.py](https://github.com/QwenLM/Qwen-Agent/blob/main/qwen_agent/utils/tokenization_qwen.py)
and [Qwen tokenization note](https://github.com/QwenLM/Qwen/blob/main/tokenization_note.md).
Those references alone do not establish a complete-wire conservative bound for
this plan's exact hosted Max/Flash route, schema mode and API profile. No matching
qualified implementation/measurement receipt is installed in the source tree.
This is a concrete missing input/implementation, not a claim that the recipe
cannot exist or a new requirement for an exact proprietary billing template.
The existing official-audit/provider qualification work remains authoritative;
no guessed tokenizer, characters/4 recipe, default model or downloaded code was
substituted. Operational source wiring awaits that reviewed registry/capability
and the already required real identity, route, privacy, tariff, output-bound,
budget/resource and credential prerequisites. Paid activation remains separate.

## Local evidence and limits

Base: `3f8376eedddde1a1ea07a295d19e632486ac552d`. All new production code is in
this directory; original ledger/declaration/extension production files are
unchanged. Real RED evidence was captured before the fixes: current route
rebinding after original `DISPATCHED` acknowledgement incorrectly sent the old
profile; delayed result-revalidation COMMIT acknowledgement incorrectly exposed
an expired derivative. Current-route/original-row binding and conservative
monotonic interval checks fixed those tests. Initial missing-module RED was also
captured. The clock-rollback probe already passed and is not claimed as RED.

Deterministic protocol tests use the original ledger/service/identity code and
mocked PostgreSQL protocol/HTTPS. They prove source branches, not real database
locking, live TLS/network, a qualified provider or financial/operational launch.
Fixtures contain fake content, fake keys, fake identity and explicitly synthetic
profile/tokenizer facts. They cover default-off/no secret read, one send, exact
bindings, role refusal, pending-claim concurrency, failed/lost commits,
acknowledgement delay/disposal, revocation/expiry/route changes, retained holds,
no replay/refund, response bounds, SSE termination and suppressed late results.

`tests/provider-postgres-live.test.mjs` supplies ten real-PostgreSQL cases with
separate roles/connections and real lock barriers, always intercepted HTTPS and
synthetic qualification. **Not run in this slice.** The strict launcher
`node services/ai-gateway/tests/run-provider-postgres-tests.mjs` requires an
explicit new disposable numeric-loopback `paia_ledger_test_*` database and opt-in;
without them it exits 2 with NOT_RUN. No ambient/production DSN fallback exists.
Independent review, real-PG execution for this new boundary, final-candidate
broad acceptance, deployment wiring and actual provider qualification are
UNVERIFIED. No full/browser/remote validation or financial activation is claimed.

Initial local results (2026-10-18, predecessor 2171a138):

- 29 new deterministic tests pass; targeted original ledger, reservation,
  declaration/entry, identity and Qwen regressions bring the selected run to
  **235/235 passing**, with no skips (11.85 seconds). This is not Full acceptance.
- All new `.mjs` files pass `node --check`; unchanged deployment graph reports
  `SOURCE_GRAPH_OK`; whitespace check passes.
- New real-PG launcher preflight reports NOT_RUN / exit 2 with no configuration.
- Full logs remain in `/tmp/paia-provider-runner-evidence/` in the execution
  workspace: `05-real-red-route-expiry.tap`, `06-binding-expiry-green.tap`,
  `07-decoder-adversarial.tap`, `08-pg-not-run.log`,
  `09-all-provider-protocol.tap` (27 earlier cases),
  `10-clock-rollback-probe.tap` (already passing), and
  `11-targeted-regression.tap` (predecessor 235 cases, including 29 new cases).
  These passing predecessor tests did not cover the two defects below and are
  not qualification of the predecessor or this successor.


## Independent-review repairs

The predecessor was independently **BLOCKED** on two real counterexamples:

1. A final authorization time inside the grant validity but before the original
   durable `snapshot.lastNow` incorrectly exposed a derivative. Revalidation now
   compares the locked current authority time to that original watermark before
   checking the bound. The new case reserves at t0, dispatches at t0 + 5000 ms,
   then checks at t0 + 4000 ms; the original hold remains and no derivative exits.
2. Actual input above the request's reserved input but below the profile's
   product limit incorrectly looked safe. The response owner now mirrors the
   original atomic ledger's input/output token ceilings from the exact bound
   reservation, without modifying the shared decoder/compiler or arithmetic.
   It routes overruns through existing unknown/runner-stop handling. Tests prove
   input 100 succeeds, input 101 fails for JSON and SSE, the 700-microusd original
   hold is unchanged, no derivative exits, cancellation cannot refund it and the
   same runner cannot send again. Actual usage is never clamped or repriced.

`14-independent-blocks-red.tap` records both failures before the production fix;
`15-independent-blocks-green.tap` records both repaired cases and the explicit
post-COMMIT revocation linearization case passing. That third case is not a
repaired defect: final SHARE-lock read-only COMMIT authorizes delivery; subsequent
revocation cannot retroactively retract it. Client/domain CAS still decides use.
Two corresponding real-PG source cases were added, bringing that source suite to
10; it remains NOT_RUN. No API, registry, tokenizer recipe, production permission,
financial schema or activation scope changed.

Successor local evidence (2026-10-18):

- `node --test --test-reporter=tap services/ai-gateway/tests/provider-evidence.test.mjs services/ai-gateway/tests/provider-runner.test.mjs services/ai-gateway/tests/provider-response.test.mjs`
  passes **32/32**, no skips, in 1.99 seconds. Log:
  `/tmp/paia-provider-runner-evidence/16-successor-provider-tests.tap`.
- `node --test --test-reporter=tap extension/tests/ai-cost-02-atomic-reservation.test.mjs`
  passes **13/13**, no skips. Log:
  `/tmp/paia-provider-runner-evidence/17-original-ledger-regression.tap`.
- Changed JavaScript syntax and whitespace checks pass. The strict PG command
  remains `node services/ai-gateway/tests/run-provider-postgres-tests.mjs`; its
  explicit disposable-database prerequisites above still apply. These 10 PG
  source cases have not been executed. No Full, browser, live-provider or remote
  run occurred. Independent successor review remains pending.
