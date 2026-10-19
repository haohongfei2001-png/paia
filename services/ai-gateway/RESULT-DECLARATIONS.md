# Integrated development evidence — 2026-10-18

Reviewed source `2bdaed82` is integrated unchanged except the separately reviewed deployment inventory. Exact `5616179266a1f3208b8b53f97860360f962bdd84` / run 39107430717 attempt 1 passes all 10 actual PostgreSQL 17.11 domain-result cases, zero failures/skips; the combined Node22 result/client protocol set passes 63/63. Artifact 12129266052 SHA256 `44ddccab7ac21bacbe0bbae5eb0365ff720d88644953c347c82943a33e1136c4` and exact identity were verified. Original-role concurrency, immutable receipts, missing children/unknown holds, terminal conflict, revocation ordering and lost COMMIT ACK are exercised with synthetic data. No live provider call, deployment or live client activation occurred. Prior writer-local NOT_RUN statements below retain their original scope.

# Authenticated domain-result declaration bridge

This implements the bounded service half of AI_USAGE_ARCHITECTURE §11 and AI_USAGE_PLAN §4. The original `AtomicReservationLedger.finalizeResult`, `BudgetWindowReservation`, `PostgresLedgerStorage`, signed-identity profile and financial receipts remain the sole owners. There is no second ledger, SQL table, migration, new provider call, paid resource, role creation or deployment activation.

## Exact protocol and ownership

`POST /api/results` accepts `application/json` with exactly:

- `action: "finalize"`
- `request`: the unchanged original child-zero reservation request
- `principalToken`, `entitlementToken`: current signed tokens for that exact request
- `result`: `{receiptId, jobId, outcome, children}`
- `outcome`: `COMMITTED` or `FAILED`
- `children`: one to four `{operationId, receiptId}` entries, covering every existing financial child; null receipt only for a genuine `CANCELLED_BEFORE_DISPATCH` child

The JSON reader limits raw bytes to24,576, object members to40, child arrays to4 and object nesting to3. It refuses duplicate decoded property names, malformed Unicode, unexpected route/query/method/media/encoding, bodies, extra fields, client money/usage/state assertions, trusted booleans and callbacks before configuration/database access. Caller data is snapshotted before asynchronous work. No request/response/token/error body logging is added.

The client must create a stable body-free result receipt from its existing durable domain owner, after genuine transaction success or a terminal failure. The original Foundation's `commitAssistResult`, `commitHistoricalCandidates`, `commitOrganizeClosure` and `settleFacet` combine domain mutation/ACK, exact coverage, child outcome and aggregate job state in the same local transaction. `VALIDATED`, a schema-valid provider response, an arbitrary callback or an in-memory success flag is insufficient. Local `OUTCOME_UNKNOWN`, pending children or uncertain commit cannot assert a terminal result. Financial receipt IDs must come from genuine service financial settlements, never a local operation receipt reinterpreted as money evidence. Result receipt identity and ordered child evidence must remain unchanged across retries.

This protocol explicitly authenticates a **client-domain declaration**. The server knows current principal/security and its immutable financial facts; it cannot independently inspect a private local body or prove that the client's domain transaction occurred. Local-owner integration is separately implemented and reviewed. The service endpoint alone does not certify an end-to-end client/provider/domain route.

The success DTO is exactly `{decision:"finalized", operationId, jobId, receiptId, resultOutcome, effectiveResults, financialAuthority:false, dispatchAllowed:false, retryAllowed:false}`. The client must match all operation/job/receipt/outcome identities and the effective-result count before acknowledging its pending receipt. Denials use `{decision:"deny",reason,...three false flags}`. An uncertain COMMIT returns `decision:"outcome_unknown", reason:"COMMIT_OUTCOME_UNKNOWN"`; it never silently retries or invents a refund. A later explicit metadata-only replay of the unchanged receipt is idempotent and cannot send a provider request.

## Atomic publication and trust boundary

The actual source entry is `api/results.mjs`; `result-deployment-bootstrap.mjs` reuses the existing bounded deployment lifecycle and reservation runtime configuration. Both `PAIA_RESULTS_ENABLED=true` and the existing reservation configuration must be explicitly enabled. Import/default-off operation reads no credentials or opens any socket. No result publisher role is introduced. The original reservation runtime must remain unable to insert/change service authority or operation evidence. Its effective inherited privileges, RLS, FORCE RLS, ownership, superuser/bypass properties are checked inside every transaction.

The lock order is the original global budget singleton, control, current principal and each immutable financial event in child order. Relation locks protect the authority schema. The exact historical anchor request is matched, current pinned signatures and locked security state are verified, every settled child is matched to its original immutable server `SETTLEMENT` event including request hash and complete evidence, and cancelled children must have no provider event. Then the same original owner invokes `finalizeResult` through its distinct server-only verifier capability. HTTP cannot supply that capability.

The original owner remains final for complete job/principal/library/scope/contract/route/consent/child binding, known financial state, terminal conflict, unique receipt IDs and quota semantics. `COMMITTED` requires all planned children with known VALIDATED usage. `FAILED` can close a known failed/cancelled or partially uncreated job, but never pending/unknown financial occupation. Only child zero gains the additive result fields. Spend, tariff, usage, attempt state and original settlement bytes do not change.

Short content-grant expiry/revocation, old route/ratebook expiry and a stopped spending allowance do not erase actual financial history or an authenticated genuine historical result. They are not reinterpreted as permission to spend again. Current signed principal/entitlement/security remains mandatory. At final publication, the actual DB clock is re-read, current identity is verified through the bounded publication interval and original quota-window end, and the original SQL UPDATE independently checks that interval before COMMIT. Rollback/unknown acknowledgement retain the original operation and money.

## Serializer and lifecycle capacity repair

A deterministic original-function RED first called `BudgetWindowReservation.finalizeResult` through the actual `PostgresLedgerStorage` code after VALIDATED settlement. It failed with `BUDGET_SNAPSHOT_INVALID`: the existing exact serializer did not admit the newly reviewed `resultResolution` and `resultResolvedAt` fields. The fix adds only those exact bounded metadata fields. Existing SQL/schema version and legacy rows remain unchanged.

Admission now reserves future result-receipt bytes once per child-zero job, including after immutable financial settlement while the domain result is unresolved. Other children do not reserve a duplicate domain receipt. The existing near16MiB fixture retains4,000 historical jobs and the original capacity/unknown-money assertions; its settled historical seed is now genuinely finalized through the original owner. An equally sized unresolved4,000-job backlog remains a refusal control. No threshold, limit, test skip, timeout, pruning or tombstone deletion changes.

## Evidence boundary

The service-only deterministic tests exercise original functions, real `pg.Pool` types with explicitly synthetic SQL protocols, ephemeral signed issuers, actual handler/bootstrap, exact historical finance, idempotent/terminal-outcome semantics through the original owner, missing/extra/wrong child receipt, identity rebinding/revocation, content expiry, final DB-clock rejection, rollback/lost ACK, snapshot mutation, privileged-role refusal and metadata-only parsing. The final focused combination passes78/78 with zero failures/skips/cancellations on local Node24.19.0 (the deployment remains Node22.x; actual Node22 execution is NOT_RUN here). The source-graph check and git diff whitespace check pass. These are development source/protocol evidence, not actual PostgreSQL concurrency or production proof.

`tests/result-postgres-live.test.mjs` contains10 separate real-PostgreSQL cases for actual roles/RLS, current signed identity, finalizer concurrency, global/principal locks, original receipt immutability, unknown holds, terminal conflict, cross-principal rejection and lost COMMIT ACK. `tests/result-postgres-run.mjs` refuses all targets except a new explicitly named disposable numeric-loopback database with the existing safety flag. These cases were **NOT_RUN** for this writer; no schema, roles or database were created. Their source passed syntax checking. The parent will qualify them with combined development evidence.

Broad/full/browser/native/performance acceptance, installed extension behavior, live identity/entitlement/provider/tokenizer configuration, authentic service-to-local-domain transport, real deployment and actual user-data flows remain **NOT_RUN / separate prerequisites**. Nothing here claims whole-product completion or turns synthetic local evidence into production billing authority.
