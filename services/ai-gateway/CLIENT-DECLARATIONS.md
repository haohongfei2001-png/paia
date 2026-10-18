# Authenticated client declaration bridge (source-only)

This route implements the client/domain-owner side of `AI_USAGE_ARCHITECTURE.md`
§9. It does not independently attest local body facts, mint login/processing
permission, dispatch to a provider, or change the single financial ledger.

## Existing owners and stages

The original `qwen-qualified-request.js` owner now has an explicit
`prepareDeclaration(input)` stage before financial reservation. It reuses the
same profile compiler, exact child/request binding, authorized payload hash,
wire/tokenizer check and synchronous coherent `readCurrentBinding` fence as
`bind`. Only its private WeakMap handle can call `publishDeclaration`; JSON
copies, caller booleans and full financial-bind handles cannot impersonate it.
The metadata leaves through a configured `client-declaration-transport.js`
capability. Its actual fetch call follows the last synchronous owner fence with
no intervening await. The result is checked again after the response.

`bind` and `revalidate` keep the original RESERVED row/quote/current-financial
checks. A declaration handle is never financial qualification or permission to
dispatch. Original domain-owner callbacks remain required: this source does not
install a processing grant or activate the dormant Qwen route in a session.

The original local owner must call `revokeDeclaration(handle)` at its mutation
or consent-revocation boundary. Local invalidation is synchronous before the
first network await. Profile `revoke` and `dispose` also invalidate associated
declarations. Every later publication/full-bind final fence checks current
local authority and terminal declaration state. A mutation during publication
invalidates the result and sends the same terminal revoke. Remote revocation
linearizes only when the service transaction commits; offline local changes
cannot instantly revoke already received server state. Remote grants are short
lived and never renewed by retries. No body is sent on this route.

## Exact protocol and existing schema

POST `/api/declarations`, JSON only, with exactly:

- `action`: `publish` or `revoke`
- `request`: the original 14-field reservation request, unchanged
- `principalToken`, `entitlementToken`: the existing independently verified,
  request-bound signed proofs
- `declaration`: exactly `version:1`, `requestHash`, `payloadDigest`,
  `scopeDigest`, `contentGeneration`, `consentEpoch`, `authorizationId`,
  `expiresAt`

Hashing uses SHA-256 over the existing canonical JSON representation. The
request hash covers all original 14 fields. The payload digest covers the
original authorized purpose payload. The scope digest covers child identity,
reservation request and original authorization ID. The Qwen producer's content
generation is its authorized payload digest. The job-level `scopeFingerprint`
remains unchanged, including across sibling children.

The existing `request_authority` row stores the exact request and
`generation = SHA256(canonical(declaration))`. No schema or extra ledger is
introduced. The first declaration for an operation is immutable; a conflicting
request/generation is rejected. A terminal revoked row can be inserted before
a delayed publish and defeats that publish. Duplicate publishes retain the
first issuance and expiry, never refresh them. A revoke preserves those times;
a preemptive revoke has zero-duration validity.

The publisher verifies the original two proofs against locked current
principal/security state. It serializes using the same singleton budget row,
then control/principal/operation rows. Its publication SQL reads the actual DB
clock and is guarded by freshly verified proof/key/security/control bounds.
An active declaration lasts at most 60 seconds and never beyond those bounds
or client declaration expiry. No success is returned before acknowledged
COMMIT. A lost COMMIT acknowledgement returns `outcome_unknown`; the client
owner caches that outcome and does not replay/remint it automatically.

The later provider runner MUST acquire the original financial/current authority
transaction and compare the supplied canonical declaration hash to that exact
row generation, then hash its exact authorized payload and compare it with
`declaration.payloadDigest`. It must preserve the original child/request,
profile/tokenizer and final local-owner binding. The digest is an authenticated
client statement, not evidence that the server independently observed local
content. This slice supplies no provider runner or provider acknowledgement.

## Separate default-off source configuration

`api/declarations.mjs` actually constructs the dedicated bootstrap. Its pool
lifecycle and strict configuration compiler are shared with the original
reservation bootstrap. Import/default-off reads no secret and opens no socket.
The declaration bootstrap reads only:

- `PAIA_DECLARATIONS_ENABLED` (exact `true` to enable)
- `PAIA_DECLARATIONS_CONFIG` (same reviewed strict JSON schema as reservations)
- `PAIA_DECLARATIONS_DB_PASSWORD`

There is no reservation-variable fallback, URL/PG environment fallback,
request-selected config, signing-key issuer or new credential. These variables
have NOT been configured. No role, credential, grant or resource was created.

The dedicated publisher must be non-owner/non-superuser/non-bypass-RLS with
FORCE RLS on all six tables. Its required effective privileges are SELECT,
budget `UPDATE(updated_at)` for the singleton lock, authority inert
`UPDATE(lock_anchor)` for row locks, request metadata INSERT and request
`UPDATE(authorized)` for terminal revoke. It rejects mutations to budgets,
identity, route, request generation/request/expiry or evidence. The existing
reservation role remains separate and read-only on content authority; its
budget snapshot write privilege makes it unsuitable for publication.

## Remaining boundaries and evidence

The original reservation HTTP entry still exposes only reserve/cancel. Cancel,
record and settle retain original current-identity/request-authority expiry
checks. Once expired/revoked, a late financial receipt may remain held under the
existing owner contract. This publisher never renews a declaration or changes
operation identity to release that hold. Dedicated financial reconciliation
remains a later owner task.

Focused synthetic tests use actual original owners, signed RSA proofs and pg
Pool composition with a no-network protocol transport. The source-only live
PostgreSQL cases are separate; local synthetic success is not real PostgreSQL,
live service, TLS deployment, provider, Full or installed-product qualification.
