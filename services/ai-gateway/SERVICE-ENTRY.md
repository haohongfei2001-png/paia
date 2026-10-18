# Reservation service entry (source implementation, not a live gateway)

This slice implements a bounded Vercel Node Web Standard HTTP entry and composes
actual signed-identity verification, actual PostgreSQL authority-row locks, and
the existing `BudgetWindowReservation` / `AtomicReservationLedger`. It does not
change that sole financial accounting owner or the extension/domain owners.
There is no provider transport, issuer, subscription backend, permission bridge,
production resource, deployment, approved spending amount, or configured root.

The checked-in `api/reservations.mjs` exports `fetch(Request) -> Response` and is
closed with `SERVICE_UNCONFIGURED`. A separately reviewed service-owned deployment
module can create `createPostgresReservationService({pool, identityConfig,
profileId})` and pass that service to `createGatewayHandler({service})`. The pool
must use the approved least-privilege server identity and verified TLS. There is
no ambient DATABASE_URL, client configuration, dynamic JWKS, local signing key,
default region, default issuer, or default budget. No setup runs on import.
The entry requires Vercel's Node runtime, not its Edge runtime; no framework or
additional package is required by the Web Standard handler.

The default entry does NOT yet contain a deployment bootstrap that parses a
configuration file/environment, creates a TLS-qualified Pool, loads public
issuer keys/profile, or performs startup readiness. Supplying environment values
alone cannot enable it. Those source wiring steps, Vercel project-root/bundling
configuration and approved-resource setup are distinct remaining work. The
factory-to-PG composition is implemented and tested; the bootstrap is not.

## HTTP contract and limits

POST `/api/reservations`, with no query or fragment. Content-Type must be
`application/json` with optional UTF-8 charset; compressed bodies are refused.
The exact envelope is `action`, `request`, `principalToken`, `entitlementToken`.
Action is only `reserve` or `cancel`; request is the fourteen-field original
reservation metadata DTO documented in README. Both bound signed proofs are
required for Free and Pro. No model prompt, response, tier, facts, callback,
settlement, event, budget, URL, or configuration field is admitted.

The handler reads the actual body stream with a 24,576-byte cap, 512-chunk cap
and fixed five-second deadline. It validates declared length against actual
bytes, fatal UTF-8 decoding, duplicate decoded JSON names, well-formed Unicode,
exact object depth/field count, request shapes and token lengths. It never calls
unbounded `request.json()` / `request.text()`, accepts a pre-parsed object, or
logs a token, body, parser exception, database error, principal or connection.
Responses use no-store and bounded local error codes. HTTP does not expose the
service's internal `record` or `settle` methods. No CORS wildcard/cookie identity,
public issuer or signing endpoint is added. Extension connection/origin policy
and hosting log configuration remain deployment prerequisites.

All responses have `dispatchAllowed:false`, `financialAuthority:false` and
`retryAllowed:false`. An acknowledged reservation is a real ledger mutation when
configured; it is never a bearer capability to send a provider request. A prior
operation returns its actual existing state, including DISPATCHED/UNKNOWN; the
method's `reserved` envelope must not be interpreted as a new attempt.

## Required authority sources, deliberately absent by default

`002-service-authority.sql` contains schema only: no seed authority, grants,
roles, policies, active profile, permissive defaults, or production execution.
It is applied only by an approved migration owner after `001-budget-ledger.sql`.
Its metadata rows must be maintained by independently qualified owners:

- `service_control`: one current profile, exact hash of the service's pinned
  public identity configuration, generation, enable state, separately approved
  nonzero USD micro daily/monthly limits and expiry. A forecast or example
  spending amount cannot supply these limits.
- `principal_authority`: actual current principal/library security snapshot
  from the signed proof issuer/revocation owner, plus declared time zone. The
  original verifier's active/generation/key revocation and maximum 60-second
  snapshot age/lifetime rules remain. This is not a federated-login mapping.
- `route_authority`: exact route-version metadata, input/thinking qualification,
  original ratebook and FX record. The original ratebook/FX/token arithmetic
  remains authoritative; these are not facts copied from client JSON.
- `request_authority`: an exact complete original request, its canonical binding
  hash, current content/consent generation, authorization and at most 60-second
  validity interval. Only a qualified original-owner consent/content bridge can
  publish this grant. It must coordinate upstream revocation/current revisions
  with these actual service-authority rows. A cached extension assertion, a
  stale async read or an eventual-consistency mirror does not qualify. Such a
  bridge is NOT implemented here; without it there must be no authorized rows.
- `operation_evidence`: immutable body-free provider-runner/reconciler facts,
  bound to exact request hash and operation; settlement also binds the receipt
  ID and the original complete metadata evidence. Only an independently
  qualified server publisher may insert. There is no such provider publisher
  or provider transport in this slice. An arbitrary client or runner callback
  cannot supply these facts through the reservation service.

These tables are service authorization and evidence metadata, not copies of
Source/Working content, a content cloud, a second quota ledger, or a substitute
for original domain CAS. Their absence is a concrete dependency, not a synthetic
root manufactured to make production requests pass. The included fixtures are
clearly synthetic, isolated to tests and never loaded by the entry.

## Exact transaction / publication boundary

One checked-out PostgreSQL connection executes:

1. Original BEGIN/timeout/RLS/version checks and global fixed budget row
   `FOR UPDATE`, shared by every principal, instance and feature.
2. Fixed `FOR SHARE` locks on service-control, exact principal/library, route
   and original request grant, followed by the specific provider event if used.
   Missing/unqualified/expired rows deny. The adapter verifies effective RLS,
   non-owner/non-superuser/non-bypass role, and absence of runtime mutation
   privileges on authority-bearing columns and schema creation.
3. Actual RSA verification and full identity/request/consent/route/time binding
   over the locked owners, using a fresh PostgreSQL clock sample. The original
   accounting owner computes quotas, windows, unknown holds and the worst-case
   quote from the locked single snapshot; no external budget counters are used.
4. After all awaited owner work and serialization, another database clock read
   and complete signature/fact verification. A bounded publication interval
   ends at most one second later and before the original budget-window boundary.
   Complete verification also runs at the interval's last millisecond, covering
   proof/key/snapshot/grant/ratebook/FX expiry and age limits. No asynchronous
   authority callback follows that final check.
5. One conditional SQL UPDATE samples `clock_timestamp()` inside its MATERIALIZED
   CTE. It rejects time rollback or interval expiry and writes that exact DB
   publication timestamp as the original ledger's durable `lastNow`. All actual
   authority locks remain held through COMMIT/rollback. Revocations committed
   before acquisition are observed; revocations begun afterward serialize after
   this publication, rather than racing an unlocked cached generation.

The interval is only an internal SQL condition, never returned as capability.
COMMIT acknowledgement can arrive after the interval/proof expires; the receipt
still permits no dispatch. Every later lifecycle call reacquires the owners and
rechecks complete current proof/facts. Identity/route/consent revocation is not a
reason to release uncertain spend. Fresh authorized reconciliation remains
necessary where existing proofs/grants expire; there is no bypass for recovery.

A COMMIT failure is `outcome_unknown` even if the database committed. The
connection is discarded and the service does not rollback, refund, replay the
callback, remint an operation or send a replacement. A subsequent explicit
same-operation read/reservation follows original idempotence and current
qualification; it cannot reset a DISPATCHED or UNKNOWN hold.

## Cancel and server lifecycle evidence

Cancel calls original `record(CANCELLED_BEFORE_DISPATCH)` only with both proofs,
exact principal/request binding and current authorization. Original state rules
prevent releasing DISPATCHED/UNKNOWN/settled rows. Additionally, any existing
provider evidence prevents cancellation even if ledger reconciliation has not
yet recorded it. Evidence insertion has a mandatory INVOKER trigger acquiring
the same global ledger lock; cancel's absence check therefore has no concurrent
insert phantom. Evidence UPDATE/DELETE is rejected by its append-only trigger.

The private service `record(bundle, eventId)` and `settle(bundle, eventId)` look
up the exact independently published row under the same transaction. They call
the original record/settle mechanics, including receipt rebound, usage bounds,
retained UNKNOWN cost, original pricing, child completeness and result quota.
The HTTP caller cannot assert dispatch, nonbilling, provider usage or a committed
result. A future provider runner MUST record DISPATCHED successfully before any
physical send. An evidence row alone, a cancelled record, unknown COMMIT or a
successful reservation is never permission to send. No runner is implemented
or enabled here, and this slice claims no live provider or financial authority.

## Least privilege and publisher responsibilities

The runtime retains 001's narrowly scoped snapshot privileges. Authority tables
require SELECT and PostgreSQL's necessary UPDATE privilege on only `lock_anchor`
for `FOR SHARE`; this column is constrained to constant 1 and carries no
permission data. Role-specific SELECT and UPDATE-lock RLS policies must be
qualified. No INSERT/DELETE/TRUNCATE, schema CREATE, ownership, bypass, or UPDATE
of real authority columns is allowed. The adapter actively rejects those extra
privileges. This document does not grant or configure any role.

Qualified publishers are distinct from the gateway runtime. Multi-owner updates
must use fixed lock order: budget, control, principal, route, request, event.
The evidence INSERT trigger guarantees its budget-first ordering. Use original
operation identities and reviewed metadata publishers; do not install a public
write RPC, reuse Supabase anon/authenticated/service_role, or bypass denial with
an owner/service-role connection. Deployment must retain the exact constraints,
RLS, append-only/ledger-lock triggers and metadata-only publishers. Schema
changes require traffic coordination and fresh qualification, not hot disabling
of the safety guards. Secrets and body logs remain disabled outside this module
too; source code cannot certify hosting observability settings.

## Evidence and remaining verification

Initial RED: the new HTTP test failed with ERR_MODULE_NOT_FOUND for the actual
entry module. This proves missing implementation, not a prior production exploit.
Protocol tests use actual RSA signatures and a mocked pg connection. They cover
real handler parsing, fixed composition, unavailable trust/rows/budget, every
request binding, revocation, quote/quota/idempotence/rebound, final time/expiry,
unknown COMMIT, cancellation/evidence races and original lifecycle arithmetic.
They are not PostgreSQL concurrency/RLS evidence. Local focused execution on
2026-10-18 passed 93/93: 7 HTTP + 15 service-composition + 17 existing storage
protocol + 54 existing identity/preflight tests, with no failures/skips. A later
capture-mutation test initially exposed a protocol fixture retaining the caller's
request object as its simulated database row; the fixture now snapshots it like
real PostgreSQL JSON storage. That failure is not a production authority bug.

Run focused local protocols with:

`node --test services/ai-gateway/tests/request-entry.test.mjs services/ai-gateway/tests/reservation-service.test.mjs services/ai-gateway/tests/postgres-ledger.test.mjs extension/tests/ai-service-identity.test.mjs`

`node services/ai-gateway/tests/run-service-postgres-tests.mjs` requires the same
strict NEW disposable loopback database contract as POSTGRES.md and otherwise
exits 2 with NOT_RUN. It contains real independent-connection quota races,
revocation-before-lock, revocation blocked through publication, stale final
DB-time refusal, actual COMMIT plus lost acknowledgement, append-only bound
server events/settlement, cancel-vs-event insertion, and least privilege tests.
It runs separately from the original native suite and refuses existing schema.
No local real database or broad/full run was performed for this slice. Native
results, independent review, deployment, actual publisher/bridge/issuer/profile,
Qwen usage/retention/quality and commercial approval all remain separate gates.

Primary references: [Vercel Node Web Standard entry](https://vercel.com/docs/functions/runtimes/node-js),
[PostgreSQL locking](https://www.postgresql.org/docs/17/explicit-locking.html),
[PostgreSQL privileges](https://www.postgresql.org/docs/17/ddl-priv.html),
[PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
