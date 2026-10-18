# Independent closure and composed development evidence — 2026-10-18

Exact successor 122ddbf2282be417802d6d71ccc49043b27d96b0 received independent CLEAN review: unchanged original lifecycle probe and 100 focused checks pass. The integrated source graph now includes result-finalization for all three entries. Exact 2aa9a6d2 / run 39104795518 exercises the composed HTTP/result/accounting protocol set on Node22, 95/95 passing. This scoped set differs from the earlier 100-case command; neither is a real deployment or installed registry qualification. Original REDs and pre-review checkpoints below remain unchanged.

## Preserved original slice records

# Lifecycle review correction — 2026-10-18

Independent review of `41474acd9e78f7bcf5c92a03416e2f533910bb73` was
BLOCKED: a replacement waiting for the old Pools to drain could time out at
25 seconds and retire with no pools, then resume at 26 seconds and create a new
connection. Its cached empty retirement promise did not close that late Pool.
The original 95/95 tests below did not cover this sequence and do not erase the
review failure. The reviewer’s unchanged production-bootstrap/pg.Pool probe
observed clients 2 -> 3, only two clients ended, and close drained:false.
Original RED SHA256:
`fed922737cd9b640553e3bc758a6b86a419ff1a37f9b3eaddd1396cd189fb8e1`.

The minimal correction checks both failed and retired generation state after
awaiting prior retirement, before compiling configuration or constructing either
Pool. Retirement is terminal even before any pool exists. No timeout, retry,
financial owner or disposal policy changed. A new deterministic in-tree test
retains the original 25-second startup/35-second disposal budgets, releases the
old drain at 26 seconds, and asserts no late connection, readiness SQL or secret
resnapshot, plus disposal of exactly the two original clients and drained:true.
It first reproduced the same 3 != 2 failure (RED SHA256
`c22cf236171b8aa54ee402b70f338c9604f27d80dc21c028c012ae1818a4b953`).

The corrected five-file focused command recorded below passes 96/96 with zero
failures/cancellations/skips/todo in 5264.608953ms on Node v24.19.0. Log SHA256:
`d23a0052eb893bac0a18377adc7fa0dc209d07866724f85dee44763e3e1ff02c`.
The unchanged reviewer probe now observes clients 2 -> 2, both ended, and
close drained:true. These are synthetic protocol checks; independent rereview
and all original external qualification limits remain pending.

### Freshness after drain

The same pre-construction fence now rechecks the current installed capability
and deployment snapshot after the prior drain. Independent review identified
this adjacent stale-startup risk: disable, another credential rotation, or
source revocation during the wait must prevent even a readiness connection.
Three new deterministic cases first failed with clients 3 instead of 2; RED
SHA256 `b5e094837348558f109f50f2fabc4b3b0102fc105ef59fa95f71858d59252271`.
Retired/failed/closed generations short-circuit before resnapshotting secrets.

With both corrections, the same focused command passes 100/100 with zero
failures/cancellations/skips/todo in 5363.675359ms, Node v24.19.0. Log SHA256:
`e9aa5581dc0dfcdc8510fc906496589bfde37b88a732903b0b811c1848fff0a0`.
Source graph and diff checks pass. This supersedes the intermediate 96-test
state without discarding either RED; independent exact-successor rereview is
still required. All tests remain synthetic and no timeout/permission is raised.

## Preserved initial entry implementation receipt

# Default-off provider HTTP and deployment source

This successor wires the reviewed once-send runner into an actual Node Web
Standard `api/provider.mjs` entry. It is source implementation and synthetic
protocol evidence, not deployed service, provider/tokenizer qualification,
production billing evidence, or complete PAIA acceptance. Its base is
`8c78923789737e7f3c08a3fb16b9666bc712fdaa`. The preceding statements in
PROVIDER-RUNNER.md that no HTTP entry exists describe that earlier checkpoint;
the original runner, evidence publisher, financial ledger, request/response
owners and all extension owners remain unchanged by this slice.

## HTTP contract

POST `/api/provider`, without query/fragment, with `application/json` and
optional UTF-8 charset. Compression is refused. The exact five-field envelope
is `bundle`, `declaration`, `childIdentity`, `payload`, `stream`, as defined by
`provider-request.mjs`. Its original owner validates the signed-proof envelope,
exact child/request correspondence, declaration/content/scope hashes and zero
implicit retries. No client URL, model, registry, tokenizer, credential, provider
options, tier, callbacks or financial-authority flag is admitted.

The parser reads raw bytes with fatal UTF-8 decoding, at most 294,912 bytes,
512 chunks and a five-second read deadline. It refuses duplicate decoded names
at every object depth, malformed Unicode, nonfinite numbers and trailing data.
Depth is at most 16, combined object/array own members 4,096, nodes 8,192,
array length 4,096, and each canonical encoded string 131,072 bytes. The original
provider snapshot applies its own conservative bounds afterward. Chunk contents
are copied before the next read, including Buffer subclasses. Declared length
must match actual length. No unbounded `Request.json()`/`text()` or preparsed
client object is accepted. Invalid input finishes before deployment resolution,
secret reads, Pool construction or SQL.

A valid request invokes the selected original runner exactly once and forwards
its AbortSignal. Its existing claim, durable DISPATCHED transition, current
private send ticket, pinned HTTPS transport and response authority checks remain
the owners. `stream:true` selects the original provider SSE decoder; this HTTP
entry returns only the completed checked JSON derivative, not an unchecked
incremental stream. The domain owner still owns validation, current-revision CAS
and effective-result commit. The wrapper neither mints a reservation nor settles
money, retries, refunds, authorizes a result commit or changes returned financial
receipts. Later independently reviewed runner settlement can use the same
`run(input,{signal})`, `revoke`, `dispose` interface without a second HTTP writer.

Abort/rotation/revocation after a result suppresses its derivative. HTTP errors
and internal exceptions return bounded local codes, no body/key/DB error or
parser excerpt. All responses are no-store with nosniff; financialAuthority,
dispatchAllowed and retryAllowed remain false. No CORS wildcard, cookie identity,
public credential issuer or content log is added.

## Fixed server-owned installation and configuration

Import and construction read no deployment input, create no Pool and open no
socket. The API is default-off and imports the fixed bootstrap/registry; nothing
loads an environment-specified module, evaluates code, downloads code or accepts
an HTTP-supplied capability. `provider-deployment-registry.mjs` exports an EMPTY
installed registry. A reviewed source installation must statically import the
actual implementation and register its bounded immutable manifest, tokenizer,
identity and synchronous current-profile check. A registry constructor is a
server composition seam, not proof of qualification. It cannot promote the
original `NOT_ESTABLISHED` or synthetic structural profile flags.

The required service-owned environment names are:

- `PAIA_PROVIDER_ENABLED`: exactly `true`; otherwise PROVIDER_DISABLED without
  reading any other configuration or secret
- `PAIA_PROVIDER_CAPABILITY_ID`: an exact installed source capability; an absent
  entry returns PROVIDER_REGISTRY_UNAVAILABLE before reading any config/secret
- `PAIA_PROVIDER_MAX_CONCURRENT`: explicit integer string 1–16
- `PAIA_PROVIDER_RESERVATION_CONFIG`, `PAIA_PROVIDER_EVIDENCE_CONFIG`: each uses
  the existing version-1 deployment-config schema (`version`, `profileId`,
  `postgres`, `identityConfig`), including its original duplicate-name,
  public-key, privilege-target and verified-TLS validation
- `PAIA_PROVIDER_RESERVATION_DB_PASSWORD`, `PAIA_PROVIDER_EVIDENCE_DB_PASSWORD`:
  separate explicit credentials, with the original bounded password validation
- `PAIA_PROVIDER_CREDENTIAL`: explicit bounded provider credential; never sent
  to either database or returned to HTTP

The two configs must identify the same exact database host/port/name, CA,
service profile and public identity keys, with DIFFERENT database users. The
bootstrap creates two distinct fixed `pg.Pool` instances, never an ambient
DATABASE_URL/PG* fallback. Both retain verified TLS with hostname checking and
TLS >=1.2, bounded pool/query/connection limits and the fixed safe search path.
The original ledger's readiness check runs before construction of the runner;
original reservation/publisher transaction guards still verify actual privileges,
forced RLS, current rows, clocks, prices, declarations and durable claims. No
roles, grants, rows, resources or credentials are provisioned by this source.

## Lifecycle and interruption

At most 16 HTTP requests buffer/resolve/run per warm instance. Concurrent cold
requests share one initialization. Startup waiting is bounded to 25 seconds.
A failed generation cannot reconnect itself. Every original runner freshness
check also checks the current server configuration/capability; while operations
are active, a bounded 250ms polling interval observes disable, rotation or source
revocation even without another incoming request. Observation revokes the old
runner immediately and never initiates new work automatically.

Retirement first aborts active attempts, then drains original unknown-outcome
publication before ending both Pools. Replacement waits for that drain. A
35-second disposal uncertainty permanently blocks replacement in the instance;
shutdown reports drained:false rather than creating competing pools. `close()`
is idempotent and terminal. Late initialization cannot revive closed, failed,
disabled, rotated or aborted work. Original holds remain after cancellation,
unknown ACK, process/platform termination, or a zero-send DISPATCHED state.
There is no runtime reconnect/retry, refund, new operation identity or ledger
clear. The hosting 60-second ceiling can still terminate an operation; its
durable unknown/no-replay semantics remain required, not a completion guarantee.

## Precise remaining dependency

There is no installed real model-matched tokenizer/manifest with independently
measured conservative whole-wire overhead. A missing implementation explicitly
returns QUALIFIED_TOKENIZER_UNAVAILABLE. The original requirement is a justified
complete-input upper bound, not bill-identical prediction or a proprietary
billing-template disclosure. No characters/4 recipe, guessed model, synthetic
receipt or qualification boolean supplies that missing capability. An installed
valid capability goes through the actual production composition and original
runner; the entry does not ignore trusted installed values or always return a
stubbed denial.

Actual issuer/subscription integration, approved nonzero budgets, authority
publishers, account-specific credentials/region/retention/quality, deployed
least-privilege resources, qualified ratebook and financial reconciliation remain
separate requirements. This entry claims no CNY settlement qualification, enabled
paid service, real private-data egress, frontend provider activation or full
product delivery. Existing protection, deployment and owner gates remain.

## Scoped evidence, 2026-10-18

Initial RED: actual `api/provider.mjs` import failed ERR_MODULE_NOT_FOUND,
SHA256 `2d19269e684187f5e0961520e3db4cb69f88b6ba4a2945da38c81b34a2bfa18b`.
This proves a missing entry, not a prior production exploit. An intermediate
mutable-buffer test first used an eagerly mutating Web Stream, then isolated the
actual reader boundary; implementation now copies Uint8Array/Buffer backing
bytes. An import test initially blocked Node's own environment reads; it was
narrowed to the relevant deployment/credential fields. Those failures are retained
as development evidence, not silently relabelled passes.

Final scoped command:

`node --test services/ai-gateway/tests/provider-entry.test.mjs services/ai-gateway/tests/provider-deployment.test.mjs services/ai-gateway/tests/provider-runner.test.mjs services/ai-gateway/tests/deployment-bootstrap.test.mjs services/ai-gateway/tests/request-entry.test.mjs`

Result: 95/95 PASS, zero failures/cancellations/skips/todo, Node v24.19.0,
5327.928817ms. Log SHA256
`539ea306a665bc5ee035eff17048bee0f740698f52504ea81a7e70f4b023efbe`.
The 37 new entry/lifecycle assertions use production parser/config/registry,
actual pg.Pool instances and original runner/ledger functions, with synthetic
pg.Client/HTTPS transports and explicit socket refusal. They include exact byte,
string and depth boundary pairs, duplicate names, deep arrays, Unicode, abort,
rotation, concurrent initialization, no secret reads while off/registry absent,
no invalid-body config work, separate TLS roles, late startup, idle failure,
unknown DISPATCHED ACK, no replay, terminal close and uncertain disposal.

`node services/ai-gateway/check-deployment-source.mjs` PASS imports the actual
three API entries and their repository-relative owners, with the provider's
complete explicit Vercel include graph. Log SHA256
`0c6cf5bd386f1eb19733691257849d30e46b66c42696c5f6ec17bbd6ada44762`.
`git diff --check` PASS. Targeted syntax checks PASS.

No real database or network was used for this slice. Node22 deployment build,
new real-PG entry evidence, cloud/full suite, paid provider/tokenizer qualification,
independent code review, integration and installation are NOT_RUN here. The base's
separately running real PostgreSQL evidence retains its own identity and is not
claimed by these protocol tests. No workflow, extension/runtime version or global
planning document was changed.
