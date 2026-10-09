# AI-COST-02 — proposed Qwen route and raw-usage contract

Base `707dd125bb48d75aaad2cb89b4b98ddc66837bbb`; branch
`codex/qwen-usage-contract-design-20261009`. Status: DESIGN_PROPOSED,
official-document review and synthetic fixture preparation only. Coordinator
review is required before any parser/runtime change. No paid request, account,
credential, deployment, identity/payment provider or user-data upload occurred.

Authority: AI_USAGE_PLAN §4 and §12/AI-COST-02; AI_USAGE_ARCHITECTURE §9,
§15.3–15.4 and the unchanged AIU-QWEN-1.0 candidate policy. The current owner
authorization permits ordinary development, but creates no financial activation.
This document does not supersede those authorities or historical receipts.

## 1. Existing owners and the actual missing boundary

`core/ai-usage/usage-normalization.js` accepts the neutral six-integer DTO;
it is not a raw Qwen parser. `ratebook.js`, `admission-policy.js` and
`atomic-reservation.js` already provide independently reviewed fixture contracts.
Do not reimplement them. `FixtureAtomicReservation` always returns
`dispatchAllowed:false`; its injected verifier/transaction is not a production
signature, rolling-window service or durable cross-device enforcement.

`core/organizer/gateway.js` is InputProjectionGateway, an existing local content
projection owner, not the trusted financial service. The worker still installs
unavailable AI provider/credential owners. LocalOrganizeSession and private Assist
retain their current fixture/local authority and protected commit boundaries.

The missing local contract is exact qualified request/response interpretation,
including provider usage shapes and its binding to the existing neutral owners.
The future parser must be pure and unused by production until separately wired
through the qualified trusted service. A successful parse alone grants no spend,
entitlement, consent, domain write or effective result.

## 2. Qualification record and private authority

Proposed metadata record `QwenRouteQualificationV1` has a fixed schema and finite
enums; unknown fields/versions cannot be treated as qualified. Its registry key
and digest are metadata, not bearer authority. Required dimensions are:

| Part | Required binding |
|---|---|
| Service | Provider, approved service principal/audience, pseudonymous account/workspace binding, credential reference held only by the trusted service |
| Location | Account market, endpoint region, deployment scope, exact workspace host and fixed Chat Completions path; approved processing geography |
| Model | Exact request model, resolved snapshot or separately dated rolling-alias resolution, allowlisted response model identifiers; no suffix stripping or inherited capability |
| API | Text-only Chat Completions profile/version, usage-shape profile, structured schema version/digest, request parameter allowlist |
| Generation | Explicit thinking on/off; exactly one qualified bounded thinking control when on; decoder settings, total completion cap/headroom, enforceable tokenizer/protocol-overhead profile |
| Privacy | Actual approved account/workspace/model/path retention profile and version, full-body logging disabled, permitted tenant cache isolation; consent capability remains separate |
| Evidence | Official references and verification dates, exact qualification receipts, validity/revocation, quality qualification by job/facet/style, approved limits |
| Finance | Existing ratebook route identity, native tariff/category profile, signed FX policy where relevant; immutable reservation/operation/child identity |

Before dispatch a trusted service must resolve this record from its own registry,
verify its actual authorizations and validity, and bind the approved request digest,
principal, consent and parent reservation atomically. An extension request cannot
choose an endpoint/model/tier or set `verified:true` to replace that verification.
Missing, expired, contradictory or unsupported qualification is UNAVAILABLE
before dispatch. Changing a price/FX record does not rewrite an incurred bill.

This slice supplies no such registry/signature verifier/storage or operator
allowance. Synthetic records and shape fixtures are explicitly non-authoritative.
Endpoint naming is insufficient evidence of geographic inference or retention.
No country-only claim is inferred from a global deployment.

Proposed exact record inventory, for coordinator review before implementation:
`{version,id,semanticDigest,provider,principalBindingRef,accountMarket,
workspaceBindingRef,endpoint,model,apiProfileId,usageProfile,thinking,
tokenizerProfileId,decodingPolicyId,responseSchemaDigest,privacyProfileId,
qualityReceiptRefs,ratebookRoute,qualifiedLimits,validity,qualificationReceiptRefs}`.
All names are mandatory; values cannot contain credentials or raw bodies.
Endpoint is exactly `{host,region,deployment,path}`; model is exactly
`{requested,resolutionVersion,responseAllowlist}`. Host and workspace mapping come
from private registry policy, not general URL parsing. Lists are finite/bounded,
unique and cannot contain wildcard or regular-expression models. Finance reuses
the existing exact ROUTE_FIELDS, not a second route/currency representation.

The initial usage profile is exactly
`{version,shape,cacheMode,reasoningAbsence,creationAbsence,cachedAbsence}`:
version1, shape `compatible-direct-v1`, cacheMode `implicit` or
`explicit-fixture-only`, reasoningAbsence `reject` or
`qualified-zero-nonthinking`, creationAbsence `reject` or
`qualified-zero-no-markers`, cachedAbsence fixed `reject`.
The real initial request profile permits only implicit; explicit-fixture-only
documents mapping arithmetic and can never authorize a request. Null/absent
reasoning may use the qualified rule; null cached/creation counts remain UNKNOWN,
and the creation-zero rule applies only to absent fields, not explicit null.
Registry proof must establish the conditions behind any qualified absence rule;
an extension cannot pass this object as authority.

Thinking is exactly `{enabled,control,thinkingBudget,requestedMaxCompletionTokens,
overshootHeadroom}`. Control is `none` when disabled (thinkingBudget null) or the
initial proposal's `thinking_budget` when enabled (positive bounded integer);
no simultaneous reasoning_effort or inherited default. Exact control support
is a qualification gate. Validity binds verification/expiry/revocation and
qualifiedLimits binds existing job caps plus finite transport bounds. The pure
parser receives only its private minimal transport/shape binding, not the full
financial/service record. Formal runtime schema/validation remains unimplemented.

## 3. Request profile proposed for later narrow engineering

Use the workspace-specific regional `/compatible-mode/v1/chat/completions` path
only after qualification. No legacy/shared/trial endpoint fallback is inferred.
Preserve the same neutral job/facet interface and original minimal evidence owner.

Allow one text answer, strict JSON Schema with bounded arrays/strings/enums and
`additionalProperties:false`, explicit thinking policy, complete-output cap, and
`stream_options.include_usage:true` for streaming. Tool/search/agent/Responses
memory paths, multimodal content, old assistant/reasoning history, explicit cache
markers, Batch, hidden repair and SDK retries remain outside this initial profile.
Implicit provider caching cannot be assumed disabled; its privacy and metering
must be qualified even when explicit cache markers are absent.

The existing job output cap is C. The selected API must demonstrate the documented
completion bound including its overshoot: request maximum <= C - H, with H >= 10
and any larger measured qualified headroom. Reserve C, including reasoning; never
add reasoning twice or use `max_tokens` alone as a bound. Input tokenization covers
all protocol/schema/evidence overhead. No byte/character estimate certifies it.
An explicitly bounded thinking profile leaves room for a valid final answer;
the provider's low/default effort is not a PAIA budget policy. Unqualified control
combinations or observed cap violations disable affected admission pending review.

The allowlist describes a proposal, not proof that each candidate/region supports
it. Qualification must reconcile generic API/schema documents with exact model,
workspace and account capabilities before activation.

## 4. Proposed pure parsing boundary

Future input: immutable internally prepared transport binding, private qualified
usage profile, and either one raw JSON completion or an ordered sequence of
decoded SSE JSON frames plus transport terminal state. The binding is supplied
by the trusted transport owner, never reconstructed from raw response fields.
Byte framing/UTF-8/SSE decoding is a separate bounded transport responsibility;
required finite byte/frame/depth limits have no permissive default. This design
does not implement an SSE decoder or configure a production timeout.

Future output separates `usageState` (KNOWN / UNKNOWN / INVALID), the neutral DTO
when KNOWN, product output completeness, bounded reason codes and body-free
correlation metadata. All results have `financialAuthority:false` and
`dispatchAllowed:false`. Raw request/response/reasoning text, arbitrary provider
error strings and SDK debug objects never enter usage receipts or logs. Provider
IDs are bounded correlation only, not proof of idempotency or settled billing.

| Raw compatible path | Neutral field | Proposed interpretation |
|---|---|---|
| `usage.prompt_tokens` | `inputTokens` | Whole input, not uncached remainder |
| `usage.completion_tokens` | `completionTokens` | Whole output, including reasoning |
| `usage.total_tokens` | `totalTokens` | Must equal safe input + completion sum |
| `usage.completion_tokens_details.reasoning_tokens` | `reasoningTokens` | Subset; not another output charge |
| `usage.prompt_tokens_details.cached_tokens` | `cachedReadTokens` | Input subset; interpretation bound to qualified cache mode |
| `usage.prompt_tokens_details.cache_creation_input_tokens` | `cacheCreateTokens` | Direct-path form shown by official compatible cache examples; input subset |

All accepted counts are nonnegative safe integers with no coercion. Enforce the
existing neutral partition/subset invariants by calling normalizeUsage after
mapping. Optional text-token aliases are consistency checks, never additional
charges. Positive image/video/audio categories are unsupported by the text-only
profile. Unknown usage keys or contradictory detail aliases require a new reviewed
shape profile; do not discard a new billable category silently.

Absence has an explicit per-field qualification rule. Base counts missing/null
always yield UNKNOWN. Missing cached counts cannot silently mean zero while
implicit caching exists. Creation absent may map to zero only in an independently
qualified no-explicit-cache profile. Reasoning absent/null may map to zero only
when the exact profile has qualified non-thinking absence semantics. On a thinking
route missing reasoning detail remains UNKNOWN even if total output is known.
Explicit JSON zero is distinct from absence, null and a string containing zero.
The synthetic positive fixtures exercise these conditional shape rules; they do
not establish them for an actual commercial route.

The API parameter table's formatting around `cache_creation` and its example's
direct creation path must not prompt opportunistic fallback between layouts.
Nested-only creation, two conflicting paths and unqualified aliases yield UNKNOWN
or INVALID as specified in the corpus. Any future support needs exact profile
evidence and disjoint-category tests, not a guess based on SDK properties.

## 5. Streaming and outcome rules

Track one internally bound physical child. Each response frame must use its
allowlisted model/object and one stable bounded provider ID; a mismatch is INVALID
and cannot settle that child. Intermediate `usage:null` is normal. Usage-bearing
final frame must have empty choices, follow one index-0 finish frame, and precede
normal `[DONE]`/transport completion. Never sum intermediate/final totals.

The initial strict profile accepts exactly one authoritative final usage frame;
duplicate (even equal), conflicting or post-terminal usage frames are INVALID.
Do not call a generic API consumer's eager stop-on-finish a complete billing read.
If transport breaks, cancellation occurs, final usage/DONE is absent, a frame
bound is exceeded or an HTTP/error response lacks bound final usage, return
UNKNOWN with reservation held; a partially delivered answer is not nonbilling.
Provider error codes or successful HTTP status alone cannot release funds.

Keep usage and product validity separate: valid usage with `finish_reason:length`
is potentially billable KNOWN but the derivative is invalid/incomplete. Tool-call,
refusal or malformed domain output cannot be repaired with another paid request.
Even `stop` plus KNOWN usage requires existing response/evidence validation and
current domain CAS. Actual invoice settlement still requires the independent
trusted financial proof bound to the original reservation/tariff/FX snapshot.

UNKNOWN/INVALID retain occupation conservatively, record body-free reason and
halt automatic replacement/retry. Final valid counts above reservation or cap
must retain the observed metadata and original occupation, stop affected new
admission and enter reconciliation; never clamp, refund or create a second child.
This parser does not implement NOT_ACCEPTED proof, billing reconciliation or an
append-only adjustment store; reuse the existing contractual ownership.

## 6. Binding the existing three-field Organize cache profile

Do not widen validOrganizeCacheProfile or accept qualification fields from public
UI requests in this design. Proposed bridge: a private qualified registry resolves
a deterministic semantic digest from provider/model resolution, region/deployment,
API/usage profile, thinking/decoder/output policy, tokenizer, privacy/cache profile
and their versions. Use a bounded `modelVersion` such as `qr1:<digest>` alongside
the existing exact contractVersion and promptVersion; preserve profile bounds.

The digest is not a capability. A private trusted resolver must verify/revoke its
full record before remote use, and current principal/consent/style/evidence remain
independently checked by Foundation and LocalOrganizeSession. Do not infer a record
from a saved row, arbitrary string, response model or user-provided hash. Alias or
semantic/privacy profile change changes the digest; price/FX/time/expiry alone
remain financial/current-admission checks, not a reason to rewrite accepted text.

Legacy/synthetic rows remain governed by the original reader/protection owner.
No retrospective Qwen exact-cache grant, stored qualification rewrite, new cache
store or v3/multi-child eligibility expansion is authorized. With no private
qualified resolver, Qwen generation remains unavailable while legal saved/manual
reading remains usable. A later bridge needs owner review plus old-reader,
restore/ABA/profile-rebinding and current-cache authorization tests.

## 7. Fixture and engineering handoff

`tests/fixtures/qwen-usage-contract-v1.json` contains invented bodies, identities,
counts and explicit expected parser decisions. Positive layouts follow official
examples; adversarial mutations are PAIA-authored. They are not captured API
traffic, a billed receipt or a qualified model response.

Positive creation-counter fixtures specify category arithmetic for a hypothetical
qualified shape, not admission of explicit caching in the initial request
allowlist. Conditional absence fixtures carry an explicit hypothetical rule;
without independently proving that rule the same raw bytes remain UNKNOWN.

The audit checks fixture integrity and existing normalizeUsage expectations only.
It does not contain or verify a raw parser. A later narrowly approved pure parser
must implement the corpus, including absent/null distinctions, safe arithmetic,
stream termination and negative bindings. Follow with independent review; add
no caller, runtime activation, CI/version change or new shared store in that step.

Trusted-service engineering later needs separate real signatures, request-bound
entitlement/consent, one durable reservation/unknown lifecycle, restart and
cross-device replay/cadence/concurrency proofs. Production provider/retention/
tokenizer/region/financial/quality and end-user processing gates remain open.
The coordinator alone records integration and any newly authorized scope.

Official observations and unresolved issues are recorded separately in
[AI-COST-02-QWEN-OFFICIAL-AUDIT.md](AI-COST-02-QWEN-OFFICIAL-AUDIT.md).
