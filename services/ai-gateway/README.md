# Signed AI identity and service admission preflight

For the separate source-level HTTP/atomic reservation composition, see
[SERVICE-ENTRY.md](SERVICE-ENTRY.md). Its checked-in Vercel entry is closed until
real issuer, current-authority publishers, configuration and deployment exist.
The actual source-only deployment bootstrap, strict runtime inputs and monorepo
build layout are documented in [BOOTSTRAP.md](BOOTSTRAP.md). The preflight
modules described below remain non-mutating.

Status: local Node implementation, with ephemeral synthetic-key tests. This is
not a deployed gateway, identity provider, payment/subscription backend, durable
financial authority, or permission to dispatch a model request. No extension
runtime imports these modules. No network operation or persistent storage is
implemented here. No identity/hosting vendor or live issuer has been selected by
this module.

The authoritative product boundary remains
[AI Usage Architecture §§9–10](../../extension/docs/consumer-product-v1/AI_USAGE_ARCHITECTURE.md#9-unified-orchestration-and-service-boundary)
and [AI-COST-02](../../extension/docs/consumer-product-v1/AI_USAGE_PLAN.md#4-ai-cost-02--budget-manager--entitlement--quota--cache-admission).
Local core and cache paths are unchanged and do not require these remote-only
proofs. A browser login, email address, storage token, installation identifier,
API key, or a client `tier` field cannot establish either Free or Pro entitlement.

## Entry points and trust boundary

`createSignedIdentityVerifier({config, clock, readSecurityState})` returns a
synchronous `verify({request, principalToken, entitlementToken})` function. It
performs actual RSA signature verification and throws a bounded
`IdentityVerificationError` on refusal. Absent or invalid configuration leaves
the verifier closed. No token, subject, raw parsing failure or upstream error is
logged or included in an error.

`createServiceAdmission({identityConfig, clock, readSecurityState,
readContentFacts, readRouteFacts, readBudgetFacts, readFactGenerations})` returns
`evaluate({request, principalToken, entitlementToken})`. It:

1. Captures a strict copy of the original reservation request and both tokens.
2. Cryptographically verifies both proofs against fixed service configuration.
3. Reads independently owned content, route and budget facts asynchronously.
4. In one synchronous segment, rereads current owner generations and rechecks
   both signatures, time, key revocation and principal/entitlement generations.
5. Checks exact request bindings, fact expiry and matching owner generations,
   calculates the quote using the original `quoteRequestBound`, then invokes
   the original `evaluateAdmission` with explicit qualified fields.

Only the service composition root may supply configuration, clock, readers or
facts. They are never arguments accepted from a browser/HTTP request. All
readers must be read-only; none may reserve, dispatch, sign a token, acquire
credentials, or fetch/return a body. Readers receive immutable request and
qualified identity metadata, never the raw tokens. Missing, throwing, stale,
mismatched or asynchronous *synchronous-snapshot* readers deny.

The final `clock`, `readSecurityState` and `readFactGenerations` callbacks must
read one service-owned coherent local security/control snapshot synchronously,
without side effects. Do not implement them as independent remote reads or
represent two sequential database fetches as a joint snapshot. Cache refresh,
revocation propagation and distributed consistency are future service-owner
responsibilities. State older than the configured bound is refused. The result
is a decision at the final observed server time, not an enduring capability.

All results contain `dispatchAllowed:false` and `financialAuthority:false`.
The best possible result is `eligible_for_atomic_reservation`. Evaluation is
non-mutating and repeated/concurrent evaluation is not a reservation receipt.
The existing `AtomicReservationLedger` / `BudgetWindowReservation` is still the
only accounting owner. A real durable transaction must revalidate identity,
content/route/control generations and budget at its atomic commit; this
preflight result must never be accepted as a substitute. This module adds no
second ledger, per-device quota or bypass of pending/unknown attempts.

## Narrow JWT profile v1

This is an application-specific JWT profile using existing JOSE primitives,
not a new JWT algorithm or an OAuth/OIDC flow. It does not accept generic upstream
ID tokens or arbitrary vendor JWTs. Future federated/purchase-proof integration
must explicitly map qualified upstream evidence into a stable pseudonymous
service principal and an independently qualified entitlement. It must not map
an unqualified upstream `sub` directly into an existing PAIA principal.

Both tokens use compact JWS: three canonical unpadded base64url segments, UTF-8
JSON, RS256 with RSA PKCS#1 v1.5/SHA-256, and a configured 2048–4096-bit RSA public
key with exponent 65537. Signature length must exactly match the key. Verification
uses Node's `crypto.verify` with explicitly fixed padding; no symmetric algorithm,
`none`, RSA-PSS, dynamic algorithm selection or client-provided key is accepted.

Header fields are exactly `alg`, `typ`, `kid`. `alg` is exactly `RS256`;
`typ` is respectively `paia-principal+jwt` or `paia-entitlement+jwt`.
`kid` indexes only that role's fixed allowlist, never a path or URL. `jku`, `x5u`,
embedded `jwk`/`x5c`, `crit`, `b64` and every other header field are refused.
Key aliases for duplicate public key material are refused within each role.
Principal and entitlement may not share public key material, even under
separate key IDs. Explicit types and different required claims prevent role
substitution.

Common required claims are exactly:

- `iss`, `aud`: exact case-sensitive configured strings; arrays are not accepted.
- `sub`: the canonical pseudonymous service principal ID.
- `iat`, `nbf`, `exp`: nonnegative integer NumericDate seconds.
- `jti`: bounded opaque token identifier; not logged or persisted here.
- `library_id`, `operation_id`: exact original request bindings.
- `request_hash`: SHA-256 hex of the complete original request, as below.
- `generation`: the current role-specific service generation for this principal
  (and, for entitlement, this principal/library pair).

The entitlement token additionally requires exactly `principal_issuer`, `tier`
and `entitlements`. `principal_issuer` matches the configured principal issuer;
`tier` is `free` or `pro`; `entitlements` is a nonempty, duplicate-free list of
allowed original job families (`AI_MAINTENANCE`, `AI_ORGANIZE`, `AI_ASSIST`) and
must contain this request's family. This never grants processing consent or
opts in the Pro filter. **Free also requires both proofs.**

`iat <= nbf < exp` and `iat <= now`, `nbf <= now < exp` are required, with no
clock-skew allowance in this profile. Maximum token age/lifetime is configured
between 1 and 300 seconds. Token issuance and expiration must fit its signing
key's validity window; an expired key or revoked key is refused. The supplied
server clock is in integer milliseconds and observed rollback is refused within
a verifier instance. Persistent rollback protection remains the original
durable accounting owner's responsibility.

The request has exactly the original reservation fields: `operationId`,
`jobId`, `principalId`, `libraryId`, `scopeFingerprint`, `contractVersion`,
`routeVersion`, `consentEpoch`, `jobType`, `childIndex`, `childCount`,
`inputTokens`, `outputCap`, `maxCompletionTokens`. Values are bounded strings
or nonnegative safe integers. `requestBindingHash` hashes their ascending-key
compact `JSON.stringify` representation encoded as UTF-8. This exact v1 binding
format is documented for the eventual issuer; it is not a general JSON
canonicalization standard. Both tokens bind all these values. A proof cannot
be moved to another operation, library, principal, consent epoch, scope, child,
route, token limit or job. Token replay is intentionally not treated as a new
operation; the original durable ledger must own operation/job deduplication.

Limits: 8,192 characters/token, 1,024 decoded header bytes, 4,096 decoded payload
bytes, at most 512 signature bytes, 16 configured keys/role, 20 JSON members and
3 flat string-array values. No nested object or nested array is accepted.
Duplicate member names, including escaped aliases, malformed JSON/UTF-8,
unpaired surrogate strings, unexpected claims, padded/noncanonical base64url,
unsupported structures and empty signatures fail closed.

## Service configuration and control snapshots

`identityConfig` contains exactly `principal`, `entitlement`,
`maxTokenAgeSeconds`, `maxSecurityStateAgeSeconds`. Each authority has exactly
`issuer`, `audience`, `keys`; each key has `kid`, `publicKeyPem`, `notBefore`,
`notAfter`, `revoked`. Public keys are SPKI PEM only; private keys are refused.
Key timestamps use NumericDate seconds. Configuration is compiled/captured on
factory creation, cannot be changed by mutating the supplied object, and has no
default issuer, audience or key. Rotation is an explicit service deployment
configuration change; this code fetches no keys.

`readSecurityState({principalId, libraryId})` returns exactly `principalId`,
`libraryId`, `observedAt`, `expiresAt`, `principalActive`, `entitlementActive`,
`principalGeneration`, `entitlementGeneration`, `revokedPrincipalKeys`,
`revokedEntitlementKeys`. IDs must match the authenticated request, both active
flags must be true, and generations must match their signed claims. The two
revocation arrays contain unique role-specific key IDs, at most 16 each. The
snapshot's validity/age is bounded by `maxSecurityStateAgeSeconds` (1–60
seconds). Snapshot timestamps use NumericDate seconds. Revocation is checked
on every verification, including final verification after asynchronous facts;
a previously created verifier handle cannot bypass it. A generation change can
revoke all previously issued tokens for that principal/entitlement.

All three fact readers return exact `request`, bounded `generation`, integer
`expiresAt` in **milliseconds**, and only their own fields:

- Content: `authorized`.
- Route: `routeQualified`, `thinkingBoundQualified`, `inputBoundQualified`,
  `route`, `book`, `fx` (`null` for the synthetic USD tests). Original ratebook
  validation and worst-case quote arithmetic remain authoritative.
- Budget: `usage`, `global`, `attemptState`, `ownsResultReservation`. `usage`
  and `global` are the original `evaluateAdmission` structures, including
  all current committed/in-flight/unknown counts and global used amounts.

`readFactGenerations({principalId, libraryId, operationId})` returns exactly
`content`, `route`, `budget`, matching the three fact generations at the final
snapshot. Neither facts nor request may supply or override `tier` or identity.
Budget facts are a read of original accounting, not caller-supplied counters.
The original policy's token, child, feature/user/global and pending-attempt
bounds still apply. A signed entitlement cannot set a nonzero global budget.

## Evidence and remaining gates

Test with Node 22+ (local evidence uses Node v24.19.0):

`node --test extension/tests/ai-service-identity.test.mjs`

The file is automatically selected as `unit` by the existing selector, with no
CI census, workflow or timeout edit. Synthetic ephemeral RSA keys exist only
in the test process. The tests exercise actual signature verification, role
separation, tampering, strict decoding, all request bindings, time/key/generation
revocation, asynchronous invalidation, original quote/admission, identity field
injection and denial without financial/dispatch authority.

Initial RED was missing actual service modules; subsequent implementation
corrected two test-fixture defects (mutation of the token issuer while testing
configuration capture, and missing original global-used counters). No existing
runtime production exploit is claimed by that initial RED. Broader product
acceptance, independent security review, deployment and live integration are
separate evidence. No paid route has been activated.

Before production: select/authorize real issuer and proof flow, map stable
pseudonymous principals, qualify key rotation/revocation ownership, deploy
consistent content/route/budget snapshot owners, implement and qualify original
durable atomic accounting/commit guards, set approved nonzero global budgets,
qualify real provider route/rate/usage receipts and transport, and perform the
remaining security/privacy/quality gates. Hosting code alone closes none of
these prerequisites.

## Primary standards

- [RFC 7515 §§3, 5 and 6](https://www.rfc-editor.org/rfc/rfc7515.html): compact
  JWS serialization and signature validation.
- [RFC 7518 §3.3](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.3): RS256.
- [RFC 7519 §4](https://www.rfc-editor.org/rfc/rfc7519.html#section-4): JWT claims,
  including NumericDate and distinct application claims.
- [RFC 8725 §3](https://www.rfc-editor.org/rfc/rfc8725.html#section-3): fixed
  algorithms, issuer/audience validation, explicit typing and separate rules.
