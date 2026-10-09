# AI-COST-04 — private read-only ambiguous Filter preflight

Base8a4337ae; isolated branch codex/ai-filter-private-preflight-20261009.
Coordinator authorized this new helper/tests/receipt only after reviewing the
private facet design. No existing SmartFilterStore, Foundation, Settings, Sync,
storage, worker/UI, CI, version, dependency or decision policy may change here.
This is not the later committer, a new maintenance runner or remote activation.

## Exact proposed API and finite private state

`new AmbiguousFilterPreflight(store,{resolvePermission,clock})` is internal-only.
Missing resolver/clock or a store without an already open, initialized actual
SmartFilterStore/Source/Input owner returns UNAVAILABLE. It must never call run,
finishFoundation, public inputEligibility, migrations or a write transaction.
The caller initializes existing owners separately; that initialization is not
counted as a read-only preflight result.

`prepare({candidates})` takes1–8 exact rows
`{inputId,expectedContentRevision,expectedEvaluationRevision,neighbors}`.
Each neighbor is exactly `{inputId,expectedContentRevision}`;1–2 are required
for an eligible candidate. At most2 unique neighbors across the entire call,
no duplicate candidate IDs, duplicate edges, candidate-as-neighbor, implicit
neighborhood scan, paging, assistant/history reader or external Context fallback.
All IDs are bounded opaque strings and revisions are nonnegative safe integers.

Initial limits: candidate text<=1024 UTF-16 units/4096 UTF-8 bytes; each neighbor
<=2048 UTF-16 units/4096 UTF-8 bytes; unique neighbor aggregate<=4096 bytes;
all retained candidate+neighbor bodies<=16KiB;8 live capabilities;5-minute maximum
private eligibility lifetime, checked lazily at each operation (no background
timer or promise of automatic memory collection). These are conservative local reader bounds, not tokenizer
proof, financial/maintenance allowance, promises of model context or permission
to enlarge the existing two-context/4096-byte owner boundary. Excess is refused,
not truncated. Clock rollback/invalid time fails closed and clears private state.

Returns frozen body-free metadata only: status, per-candidate eligibility/reason
and current Light classification, an opaque empty-object handle when a subset
is eligible, and financialAuthority:false/dispatchAllowed:false. No Source key,
URL, note, body, text digest, provider/operation/job identity or permission record
is public. Local Light decisions stay with their existing owner; this helper
does not make an already Light-filtered item visible or change its decision.

`revalidate(handle)` re-reads the exact originally requested bounded scope and current permission
in one original readonly transaction. It returns body-free CURRENT or STALE/
UNAVAILABLE metadata. Any relevant permission, gate/restore/policy, Input/source,
evaluation/protection, neighbor content/position change invalidates the whole
capability and discards its bodies; it cannot regenerate/ACK/retry anything.
`dispose()` synchronously revokes all handles and discards private bodies.
There is no public body extraction, provider execution or committer API in this
scope. Capabilities belong to one instance, are nontransferable and unpersisted.

## Permission source and no new read authority

Constructor-injected `resolvePermission(t,request)` is an internal trusted seam,
not a public boolean DTO. Exact request is `{purpose:'ai-filter-preflight',
candidateIds,neighborIds}`. Exact result is `{allowed,tier,optIn,processingConsent,
userInputIds,scope,epochs}`; scope is the exact candidateIds/neighborIds pair,
userInputIds is precisely their union, and epochs are exactly
`{entitlement,optIn,processing,userRead}` as bounded opaque version tokens.
Only allowed true, tier pro, optIn true and processingConsent true qualifies a
local read. Missing/false/unknown/rebound data refuses before reading Input bodies.
Tests provide explicit synthetic fixtures; this helper implements no signed
entitlement, real account verification or remote permission resolver.

The resolver must affirm purpose-scoped access to these *canonical user Input*
IDs, never infer user authorship from text, a UI label, Source URL or position.
The Source/Input typed family is the existing capture owner; no assistant family
is queried. Actual live capture provenance and end-user processing authorization
remain external qualification, not something a fixture boolean proves.
Capture enabled gate/consent epoch, verified active thought-library with zero
sealed items, and recovery-restore epoch are independently checked in the actual
transaction. Restore-marker absence is a distinct initial state; a present marker
requires a bounded nonempty opaque value. An unavailable owner revokes all private
handles; restoring readiness cannot revive them. Filter mode must
be Light with current exact FILTER_VERSIONS and policyEpoch; OFF cannot prepare.

## Existing original typed read and protection boundaries

Use original transaction-safe inputProjection(store,t,id), normalizePresence,
decideLight and SmartFilterStore.isFiltered. Public methods that open another
transaction are forbidden inside this readonly transaction. Source tombstone,
snapshot tombstone, original Source presence and Input removal/branch state are
read by inputProjection. Only explicitly selected IDs are read. The helper does
not mint evidenceFor tokens or alter any existing eligibility function.

Candidate admission requires one current original Source reference, original
unmerged/unnoted/unmodified Input, active Input state, untouched known authorship,
userEdited false/filterOverride none, expected content/evaluation revisions and
current exact filter versions. Any source Keep intent, edit/restore latch,
attachment/reference or missing/unverified presence keeps it ineligible. Both
attachment and reference must be verified absent. Only Light uncertainty reasons
context_insufficient/rule_no_match are initially admitted; locally resolved keep/
filter and unsupported/unknown grammar cases never acquire an AI capability.
This does not widen old grammar or implement a new policy.

Each explicitly permitted neighbor independently passes actual Input/source and
revision availability, presence qualification and current visibility. It is
nonempty user text, not assistant text or a generated Thought/Context. Same
document and inclusive anchor→candidate blockIndex span<=3 are checked through
the original factory/index. This positional test is not a collector or permission.
Human edits/Keep are candidate hiding protections; a currently visible edited
user neighbor can be context only if its exact current revision is explicitly
permitted. Restored/removed/changed neighbors invalidate existing capabilities.

Private proof stores only bounded selected bodies plus the actual current typed
metadata/source/filter/position/permission fences needed for exact revalidation.
No stale private body is returned publicly. Initialization/storage errors refuse
with finite reason codes; raw exceptions/body diagnostics are never emitted.
Every public result has no financial or dispatch authority and grants no FILTER.

## Actual-owner acceptance matrix before independent review

Use original capture/Filter/edit/Keep/exclude/restore/source-purge owners and
real IndexedDB transactions over synthetic data. Freeze every actual store and
local control bytes before/after each prepare/revalidation; every branch must
show no writes, no job/child/ACK, no human Keep mutation, and no Provider call.
Cover missing metadata/presence/source, edits/Keep/attachments/references, removed
and restored Input, permission revoke/OFF/tier/epoch ABA, neighbor stale/current
revision and positional/different-document violations, cold/no-init refusal,
scope forgery, finite text/neighbor/capability bounds, expiry/rollback/disposal,
instance/forged handle refusal, error redaction and body-free results.

This batch has no production caller or final in-transaction committer. A later
committer needs separate scope, original decisionSequence/filterMutation/
diagnostics/read-snapshot oracles, exact coverage/ACK rollback and independently
qualified new FILTER policy. AI KEEP must never call human keepInput/protect or
write filterOverride/filterIntents. No paid evaluation, credentials, real-user
upload, permission expansion, deployment or whole AI-COST-04 completion follows.
