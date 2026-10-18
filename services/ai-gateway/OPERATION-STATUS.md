# Integrated development evidence — 2026-10-18

Final successor `2f6be74c` received independent CLEAN review, including 13 additional adversarial probes and the original 99-case combination. Exact integrated `5616179266a1f3208b8b53f97860360f962bdd84` / run 39107430717 attempt 1 passes 19/19 actual PostgreSQL 17.11 cases and 33/33 Node22 status protocol cases, zero failures/skips. Artifact 12129266052 SHA256 `44ddccab7ac21bacbe0bbae5eb0365ff720d88644953c347c82943a33e1136c4` was verified and all 19 cases read. Real locks/RLS/competing recovery and explicit SQL-clock-result rollback controls are qualified as synthetic development evidence only; no live provider/service is activated. Earlier writer-local NOT_RUN and initial review failures below are retained.

# Authenticated operation status and conservative accounting recovery

Implementation candidate, 2026-10-18. Base: `cd51cff307d9d29c6c134c54d8533bbb405d6183`.
Owner contract: AI_USAGE_PLAN section 4 (AI-COST-02), conservative unknown-outcome reconciliation, no reminted paid attempt and no unsupported refund.

## Entry and exact request

`POST /api/operation-status` accepts only `{action:'query', request, principalToken, entitlementToken}`. `request` is the original complete 14-field immutable reservation request. The existing strict metadata reader limits bytes, depth, members, chunks and duration; decoded duplicates, bodies, evidence, prices, action overrides and configuration fields are rejected before configuration or SQL. No token is placed in SQL or output.

The actual Node API and lifecycle are default-off. `PAIA_OPERATION_STATUS_ENABLED=true` and the original qualified reservation configuration/enablement must both exist. Import reads no environment or credentials and opens no socket. The original ledger runtime role is used, never an evidence publisher role. No service/role/key/allowance/provider is installed or enabled by this change.

## Response contract

All outcomes have `financialAuthority:false`, `dispatchAllowed:false`, `retryAllowed:false`.

A successful query has `decision:'queried'`, original `operationId` and `jobId`, original `state`, `financialOutcome`, `providerEvidenceRecorded`, final read-observation database-clock `observedAt`, and `reservation`.

For an existing row it additionally returns only original metadata: `reservedAt`, `reservationMicros`, `window`, `heldSpendMicros`, `settledSpendMicros`, `financialSettlement`, `unknownReceipt`, `resultResolution`, and `effectiveResults`. Unknown/absent receipts are null. Financial settlement is the original immutable receipt, including its bounded usage and pricing identifiers; no response body is available. `VALIDATED` financial success does not create a domain `COMMITTED` result. Only already-recorded original domain metadata is reported.

For the original `RESERVED` row, and only when no provider event is recorded, `reservation` is the exact bounded original row projection: `{request,state,reservedAt,window,reservationMicros,quote,pricing}`. It is a historical qualification input, not a dispatch lease. The stored quote/ratebook/time are not refreshed. Any recorded provider event suppresses this view to null even if the ledger row still says RESERVED. All other states also have `reservation:null`.

A missing original row returns `state:'NOT_FOUND'`, `financialOutcome:'UNKNOWN'`, `providerEvidenceRecorded:null`, `reservation:null`. It has no invented zero cost, new reservation or retry permission. Absence of a row/event never proves no physical consumption. Existing RESERVED/DISPATCHED/OUTCOME_UNKNOWN holds stay UNKNOWN and retain their full original amount unless independent immutable financial evidence qualifies settlement. Existing genuine CANCELLED_BEFORE_DISPATCH metadata is returned unchanged and must have no provider events.

Denied identity maps to `AUTHORIZATION`; missing or unsafe authority/configuration stays closed. Any lost COMMIT acknowledgement, including a read-only transaction, returns only `decision:'outcome_unknown'`, `reason:'COMMIT_OUTCOME_UNKNOWN'` and the three false flags. A later independently authenticated query may establish the durable original state. Nothing automatically repeats the query or paid operation.

## One owner and transaction

No existing runtime, ledger schema, original owner, deployment routing or shared workflow is changed. PostgresLedgerStorage acquires the original global singleton FOR UPDATE, then the fixed guard locks control, current principal security and immutable events. The pinned profile/configuration and both current signed proofs bind the same principal/library/exact request. RLS, non-owner/non-superuser and no authority/event mutation privileges are checked in every transaction.

Short content grants, route/ratebook expiry and disabled new spending cannot cancel already consumed historical cost. They are not used to grant new content access. Current principal/entitlement security, generations, pinned key revocation and proof expiry remain mandatory. The locked security snapshot is reverified against the final database clock; this is point-in-time authorization, not a promise of instant revocation across the network after COMMIT.

If and only if the original row is DISPATCHED or OUTCOME_UNKNOWN and its canonical immutable server SETTLEMENT event exists, the same transaction composes the existing ProviderAccountingGuard and original BudgetWindowReservation.settle. Its independent DISPATCHED evidence, exact request, historical pricing, normalized usage, caps and non-COMMITTED outcome remain mandatory. Neither client financial state nor a client receipt can request a refund or settlement. RESERVED and cancelled rows are never promoted to dispatched by query.

The existing accounting guard supplies its final DB-clock/publication bound. The outer guard intersects it with verified current identity validity. Commit uncertainty stays unknown. A subsequent SETTLED query checks its original immutable receipt and makes no ledger write. Other pure status queries do not update lastNow, windows, reservations, children or result counts. No provider/cancel/reserve API is called by status.

## Verification and boundaries

- Original-owner RED: synthetic actual provider runner produced immutable usage while the original settlement write was blocked. Revoking the short content grant made reserve-as-query return `deny` instead of the required `queried`. The test failed with `deny !== queried` before the new implementation; it now passes through the actual status service and original settlement owner.
- Initial freeze `0c31cec6ba1f0453d5fd13173102bf458402bc72`, local Node v24.19.0: 30/30 new protocol/HTTP/bootstrap cases passed. They cover concurrent service instances, unknown missing evidence, nonentry, exact metadata, two possible lost-COMMIT outcomes, current identity/rebound, final expiry/rollback, unsafe role, immutable event corruption, data/body boundaries, domain/financial separation, lock order and configured actual default-off API source. The initial HTTP fixture assumed a 700-micro bound but its original default fixture was 7000; that test expectation was corrected to the original row's amount. No production limit changed.
- Initial freeze focused combined run: 96/96 passed, zero failures/skips/cancellations. Included the 30 new cases plus original PostgreSQL storage protocol, reservation service, provider-settlement and result-service tests. These are deterministic SQL/transport protocol simulations; synthetic provider traffic is in-process only and real provider calls are zero.
- Independent review of the initial freeze found a blocking intra-transaction clock regression: initial lock t, accounting lock t, read t+1000, publication t+500 incorrectly settled; a second probe found accounting t+1000 followed by read t+500 could also be accepted. Both original failures remain evidence. The successor tracks every observed DB-clock sample in its new guard, including accounting.lock, and refuses any later regression before publication. Three owning regression cases cover all adjacent boundaries; the existing accounting/storage owners are unchanged.
- Successor local verification: 33/33 new cases and 99/99 final focused combined cases pass, zero failures/skips/cancellations. The author also reran both independent reviewer probe files successfully; independent final approval remains pending until the reviewer rechecks the frozen successor. `observedAt` denotes the final read sample; recovery separately performs its later guarded publication clock check. Three explicit SQL clock-result fault-injection cases were added to real-PG source, without claiming that a physical CI clock regressed.
- The separate 19-case `operation-status-postgres-live.test.mjs` and explicit `run-operation-status-postgres-tests.mjs` source cover actual RLS/role/lock serialization, exact financial recovery, revocation ordering, final DB-clock expiry, nonentry, and both lost ACK meanings. Syntax checks pass. Local runner refuses unconfigured use with NOT_RUN and exit 2. Real PostgreSQL is NOT_RUN locally; only the existing dedicated CI disposable loopback database may supply that evidence.
- `git diff --check` and new runtime/test syntax checks pass. No Full/heavy suite, remote mutation, actual service activation, deployment, live billing, installation or release qualification ran. Independent review and integration-owned static routing remain separate pending gates at this freeze.

## Integration-owned static additions

Add `api/operation-status.mjs` to the existing Vercel function/source graph. Its extension includeFiles set is identical to `api/results.mjs` / `api/reservations.mjs`:

`../../extension/{package.json,core/constants.js,core/dedupe.js,core/ai-usage/{admission-policy,atomic-reservation,budget-window-policy,budget-window-reservation,contracts,ratebook,result-finalization,usage-normalization}.js}`

The service-local static graph also includes the new operation-status entry, service and bootstrap; existing `result-declaration.mjs`, `provider-settlement.mjs`, request-entry, signed identity, Postgres authority/storage and deployment runtime/config are reused. The integration owner owns Vercel/source-check/workflow edits. Client transport and session wiring are independently owned and are not claimed implemented here.
