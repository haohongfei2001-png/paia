# Source-only Vercel/PostgreSQL bootstrap

The actual `api/reservations.mjs` now uses `createDeploymentGateway`, which reads
explicit server deployment configuration lazily, creates a verified-TLS
`pg.Pool`, runs the original storage readiness check and composes the original
`createPostgresReservationService` and bounded HTTP handler. It is usable source
wiring, rather than a permanently unconfigured export or a test-only factory.
The checked-in state remains off. No resource, credential, issuer, grant, budget,
subscription backend, provider transport or deployment is created by this change.

## Runtime input, supplied only after separate deployment review

Exactly three service-owned environment variables are consumed:

- `PAIA_RESERVATIONS_ENABLED`: only the exact string `true` enables bootstrap.
  Every other value is closed, without reading the config/password variables.
- `PAIA_RESERVATIONS_CONFIG`: bounded JSON, at most 65,536 UTF-8 bytes, containing
  exactly `version`, `profileId`, `postgres` and `identityConfig`. Version is `1`.
  No example file containing an issuer, key, live hostname or budget is supplied.
- `PAIA_RESERVATIONS_DB_PASSWORD`: a separately supplied runtime secret for the
  already-approved least-privilege server role. It must be a nonempty well-formed
  string of at most 1,024 characters without control characters. Never commit it,
  put it in the public JSON, send it from a browser, print it, or expose it in a
  public-prefixed environment variable. Credential provisioning/installation is
  an external authorized operation, not part of this source change.

`profileId` is the reviewed service profile identifier, at most 200 characters.
`postgres` has exactly these fields:

- `host`: exact lowercase reviewed DNS hostname. No URL, IP literal, socket,
  trailing dot, localhost/local/internal suffix or fallback target is admitted.
  The service owner must qualify the actual endpoint and DNS/network controls;
  parsing a hostname is not evidence that a resource exists or is approved.
- `port`: explicit integer 1–65535. No port or connection method is guessed.
- `database`: explicit database name, 1–63 ASCII letters/digits/underscore/hyphen,
  starting with a letter.
- `user`: explicit server role/pooler username, 1–128 letters/digits/underscore,
  dot or hyphen, starting with a letter. Known `postgres`, `anon`, `authenticated`
  and `service_role` identities, including their dot-suffixed forms, are refused.
  SQL still verifies actual role/RLS ownership and permissions on every request.
- `caPem`: either one reviewed CA certificate in PEM form (at most 16,384
  characters), or `null` to use Node's trusted CA store. A provider requiring its
  own CA must supply that approved public CA; never bypass verification.

`identityConfig` is the exact existing pinned RS256 public-key configuration in
[README.md](README.md): distinct `principal` and `entitlement` authorities with
issuer, audience and 1–16 unique public RSA keys each; `maxTokenAgeSeconds` in
1–300; `maxSecurityStateAgeSeconds` in 1–60. Each key has exactly `kid`,
`publicKeyPem`, `notBefore`, `notAfter`, `revoked`. Keys are 2048–4096-bit RSA,
exponent 65537, SPKI public PEM, with no cross-role fingerprint reuse. Times are
NumericDate seconds. This preliminary syntax/key check opens no socket; the
original verifier still performs every actual proof/time/revocation check using
the locked database clock and owners. Key configuration alone grants nothing.

Unknown fields, duplicate decoded JSON keys, malformed Unicode, excessive
depth/length, private keys, arbitrary pg options, URLs, JWKS readers and budgets
are refused before constructing a Pool. No `DATABASE_URL`, PG host/user/password,
PG SSL mode/options, request body, header, cookie, hostname or query parameter can
override the fixed explicit database target or trust configuration.

## Pool, shutdown and financial boundaries

One warm bootstrap owns at most one live Pool. Configuration initialization is
singleflight; concurrent calls share it. The actual pg.Pool has two connections,
5-second connection/checkout timeout, 10-second idle timeout, 5-second lock and
15-second statement/idle-transaction timeouts, 16-second client query timeout,
500-use/300-second client lifetime bounds and keepalive. Startup waiting is
limited to 25 seconds. At most 16 HTTP requests are buffered/processed per warm
bootstrap; excess traffic gets a bounded no-authority 503. Hosting-scale limits
and database/pooler capacity still require deployment qualification.

TLS always has `rejectUnauthorized:true`, the exact configured host as server
name, standard hostname verification and minimum TLS 1.2. The driver uses
explicit connection fields, PostgreSQL TLS negotiation, UTF-8 and fixed safe
startup options, never connection-string parsing that could replace TLS options.
The dependency remains exactly `pg@8.23.1`; no SDK has been added.

HTTP is parsed and bounded before configuration/Pool/SQL work. After asynchronous
initialization, the handler verifies the original service brand, a synchronous
current-generation check and the request abort signal immediately before the
original service method. It cannot accept a fake service from HTTP. Config
rotation disables the old selection and drains its Pool before creating another.
Readiness failures and idle errors stop that generation without automatic retry;
idle error details are neither logged nor returned. Recovery requires an explicit
configuration change or a fresh process, not a hot reconnect loop.

`closeReservationGateway()` is the explicit server-only shutdown API. It stops
new admissions, drains checked-out clients and is idempotent. Disposal waits at
most 35 seconds; an error/timeout blocks all replacements and reports
`{closed:true,drained:false}`. It does not force-refund or replay any transaction.
The hosting platform must retain normal lifecycle/draining guarantees; source
alone cannot guarantee an exit hook will run when a serverless process is killed.

Readiness checks the original storage schema/role contract, not active financial
authority. Every reservation/cancel still reads and locks actual current service,
principal, route and request rows, uses the original accounting owner, and passes
the original final database-time publication predicate. No grant/budget cache is
introduced. Existing transactions already inside their owner boundary may finish
while local config is disabled; coordinated authoritative DB revocation remains
the cross-instance stop. Unknown COMMIT, abrupt termination or expired authority
never permits automatic retry, dispatch, refund or deletion of unresolved holds.
Every response still says `financialAuthority:false`, `dispatchAllowed:false`
and `retryAllowed:false`, including a real acknowledged reservation.

## Vercel source layout and build settings

The source configuration is `services/ai-gateway/vercel.json`. For a separately
approved Vercel project, its Root Directory is `services/ai-gateway`, framework is
Other, and Node version is pinned by this package to **22.x**, never Edge. The
`.mjs` default `{fetch}` export is Vercel's supported Node Web Standard entry.
No framework, runtime plugin, project/region ID or deployment command is added.

The complete repository must be present. Enable Vercel's project option for
including source outside the Root Directory in the build. Original imports reach
`../../extension/core/ai-usage`; they must not be copied, replaced or reimplemented
inside the gateway. The explicit `includeFiles` glob includes the seven imported
AI accounting modules, their `core/constants.js` and `core/dedupe.js` helpers and
`extension/package.json`, retaining its ESM scope. Vercel's standard Node file
trace also follows the static imports and locked pg dependency. Installing only
`api/` or only this service directory is insufficient.

The source config uses `npm ci --ignore-scripts --no-audit --no-fund`, then
`npm run check:deployment-source`. That check imports the actual complete module
graph with no fetch or bootstrap work and verifies package/layout invariants.
Its `SOURCE_GRAPH_OK` is not a Vercel build, schema health or production receipt.
Only the deliberately empty `public/` directory is static output; service source,
test fixtures, schemas and configuration are not selected as public static files.
The one function has a 60-second hosting duration limit. A hosting timeout can
interrupt response delivery; it never converts an uncertain commit into failure
or grants a replacement attempt. No specific plan, paid tier or region is chosen.

Before deployment, qualify the actual Vercel build artifact: supported Node
runtime and fetch adaptation, exact relative owner modules and package scopes,
no test/schema/secret/static-source publication, no Edge conversion, proper
request streaming/cancellation and the selected database TLS/pooler behavior.
This task did not execute Vercel CLI, a remote build or a deployment.

## Remaining external dependencies

The existing Vercel/Supabase route is not evidence of a PAIA backend resource.
Activation still needs approved resources and endpoint/region/capacity, secure
credential installation, separately executed schemas 001/002 and narrowly
qualified runtime grants/RLS. The private schema must stay outside the Supabase
Data API. A chosen pooler must pin a backend for the complete BEGIN/COMMIT; no
named prepared statement or cross-transaction session state is required here.

It also needs the real principal/entitlement issuer and revocation owner, exact
public configuration hash/profile, independently approved nonzero budgets,
qualified route/ratebook/FX metadata, and the original-owner current consent and
content grant publisher. Those authority owners remain as specified in
[SERVICE-ENTRY.md](SERVICE-ENTRY.md). No synthetic fixtures are loaded by runtime.
The separately gated subscription backend/credential issuer, provider transport,
extension connection/origin policy, body-free hosting logs, production durability,
security/privacy, live provider/usage/quality and full product acceptance remain
unimplemented or unqualified by this slice.

## Focused evidence

Original RED: the new bootstrap test failed with `ERR_MODULE_NOT_FOUND` for
`deployment-bootstrap.mjs`; the preceding API export had no activation path.
This is evidence of missing source wiring, not a claimed production exploit.

The dedicated bootstrap file uses ephemeral synthetic issuers/rows and an
explicit synthetic pg.Client transport while retaining the actual pg.Pool,
entry, configuration, readiness, signatures, service and original SQL/accounting
owners. `Socket.connect` is trapped and observed zero. It covers real default
entry activation; invalid/off zero-network handling; hostile ambient connection
settings; TLS hostname verification; strict HTTP before any config/SQL; single
Pool/singleflight; readiness and DB final-guard negatives; rotation/revocation,
disable/abort/late-init/shutdown; bounded buffering/startup/disposal; sanitized
errors; unknown COMMIT retention; and missing-monorepo source refusal.

Run from the repository root with a deliberately empty/synthetic environment:

`env -i PATH=/usr/bin:/bin /absolute/path/to/node --test services/ai-gateway/tests/deployment-bootstrap.test.mjs services/ai-gateway/tests/request-entry.test.mjs services/ai-gateway/tests/reservation-service.test.mjs services/ai-gateway/tests/postgres-ledger.test.mjs extension/tests/ai-service-identity.test.mjs`

On 2026-10-18 the complete focused selection above passed **121/121**, zero
failures/skips/cancellations (28 bootstrap cases plus the preceding 93). The
source-graph check also passed. The final focused rerun took 14,568.922639 ms.
Local evidence uses Node **24.19.0**, not the separately pinned Node 22 deployment
target. Focused protocol tests do not establish real PostgreSQL
locking/RLS, native Vercel bundling, live credentials/TLS or production authority.
Exact-candidate Node 22/actual PostgreSQL evidence and independent review remain
separate gates. No broad/full suite or real database was run for this slice.

Primary references: [Vercel Node entry](https://vercel.com/docs/functions/runtimes/node-js),
[Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
[monorepo external sources](https://vercel.com/docs/monorepos/monorepo-faq),
[file tracing](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions),
[Vercel function configuration](https://vercel.com/docs/project-configuration/vercel-json),
[node-postgres TLS](https://node-postgres.com/features/ssl),
[Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres).
