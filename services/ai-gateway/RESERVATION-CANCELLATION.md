# Cancellation development qualification

Frozen `c10282cad18d2a8bd39f70a9319e2d13192042d8` received independent CLEAN review with 162 scoped/owner/adversarial checks, zero skips. Exact `3ffa94b7961bdff04101d82a5f0be0c43667780c` [run 39110823940](https://github.com/haohongfei2001-png/paia/actions/runs/39110823940) now passes all 12 service PostgreSQL 17.11 cases, including the four added withdrawal, deleted declaration, concurrent principal revocation and provider-event serialization cases. Artifact 12129444487 is verified with SHA256 `296cf8ae811049b65d8212425bc81fd3de659db1a72f9f8145701bc8a764a8ae`. This is an actual disposable synthetic database, providerDispatch false, not hosted production activation.

Original run 39110525479 passed those same 12 database cases but failed an old bootstrap status-code assertion. The successor keeps expired signed identity at 403/AUTHORIZATION with an unchanged hold, and separately tests expired content plus valid identity through the real bootstrap. Its 30-case file passes; no runtime or financial condition changed. The initial NOT_RUN text below belongs to the frozen source checkpoint.

## Preserved preceding checkpoint

# Original unsent reservation cancellation

2026-10-18. A bounded correction to the original reservation endpoint and PostgreSQL authority owner. No new endpoint, ledger, identity mode, permission, credential, deployment or paid request.

## Preserved accounting and identity boundary

The original cancel action was incorrectly using the same current content declaration, route, tariff and new-spending allowance prerequisites as reserve. A client retires its declaration after an uncertain reserve acknowledgement, so the real status endpoint could return RESERVED while the original cancellation endpoint refused it. Renewing the withdrawn content grant is not a valid financial recovery.

Only the cancel branch now locks the original global ledger, service-control identity profile, current principal and existing provider-event evidence. Both original request-bound RS256 principal and entitlement proofs and their current service-owned security snapshots remain mandatory. Revoked identity, stale proof, another principal/library, rebound request, unsafe role, missing profile or changed identity configuration still refuses cancellation. This does not introduce a weaker principal-only identity verifier.

The original AtomicReservationLedger.record remains the sole financial writer. It must find the exact immutable original request and may change only RESERVED to CANCELLED_BEFORE_DISPATCH, or return the same already-cancelled state. Any provider event blocks cancellation, including an event not yet reconciled into the ledger. DISPATCHED, OUTCOME_UNKNOWN and SETTLED cannot be refunded by this path. The original global lock and event-insertion trigger prevent a provider event from racing the absence check. A later provider cannot use a cancelled reservation.

Content-grant withdrawal/expiry or deletion, retired route/tariff and a disabled/zero spending allowance do not authorize another request; they simply stop blocking cancellation of an original provably unsent reservation. No old content authority is recreated. The original financial request, reserved amount, tariff, window and operation history are retained. Current signed identity expiry, server DB time, durable clock watermark and the final SQL publication interval still fence the change. A lost COMMIT acknowledgement returns UNKNOWN without an automatic retry, invented refund or new operation.

## Development evidence and boundaries

The original deterministic protocol set genuinely failed 4 of 9 new cases before the correction. With this change, the 9 cancellation cases and 22 existing service/HTTP cases pass 31/31, zero failures or skips. They use real original signature, request parser, authority and ledger functions with synthetic SQL transport. They are not real PostgreSQL or live deployment evidence.

Four actual-PostgreSQL cases are added to the existing disposable development suite: withdrawn content plus disabled spending; deleted content/route rows; concurrent principal revocation; and concurrent provider-event insertion after content withdrawal. These new cases are NOT_RUN at this source checkpoint and require their exact development candidate. Existing independent-connection cases and privileges remain unchanged.

Client cold-start financial recovery is a separate original-Foundation slice. This correction supplies no client body, no recovered domain success and no new paid replay capability. Current service identity/entitlement validity remains required; absent or revoked identity is still an explicit refusal. Broader acceptance, production resources and actual paid activation remain unestablished.
