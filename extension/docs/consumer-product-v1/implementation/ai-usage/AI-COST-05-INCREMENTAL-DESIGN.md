# AI-COST-05 local incremental Organize design

Status: **DESIGN FOR INDEPENDENT REVIEW — NOT IMPLEMENTED**.
Baseline: `150f981ae4228ff3d49bed0dd167a284f5227476` (0.30 local combination).
This document proposes one working feature-owner lifecycle, not another read-only qualification adapter. No runtime, worker, provider, UI, schema or permission is changed by this document.

## Authority and actual starting point

`AI_USAGE_PLAN.md` §7 and `AI_USAGE_ARCHITECTURE.md` §7 require current traceable evidence, affected chunks plus necessary neighbors, human protection, explicit refresh and at most four children. The 200+5 example is an acceptance workload, not a global threshold. AIU-QWEN selects candidate model families; it does not authorize or qualify a paid route.

Actual owners:

- `core/organizer/ai-presentation.js`: `topicSnapshot`, `topicState`, cache snapshot, current status, legacy request planning, candidate creation and human adoption/history. Current `planRequest` selects at most `min(8,maxInputs)` changed Entries and includes the entire prior eight-field presentation. It has no block/span manifest.
- `core/organizer/ai-contract.js`: schema 1 eight fields, root/field evidence limit 100. `presentationContent` explicitly projects those fields and root refs.
- `core/organizer/ai-candidate.js`: candidate schema 2 has a strict proposal whitelist; adoption validates current evidence, candidate identity and presentation revision, and preserves human ownership. Adding metadata without updating this owner would silently lose or reject it.
- `core/ai-usage/foundation.js`: exact child metadata dispatch, authority/current checks, style binding, unknown-attempt fences and same-transaction `committers.organize`. Default production construction has no usable authority/organize committer. Dispatch intentionally does not assemble bodies.
- Worker status/edit paths consume saved presentations. Legacy runners receive unavailable provider/credentials. Old scope still names DeepSeek and must not be reactivated or relabeled.
- `ui/ai-presentation.js` reads existing eight-field values. It has no approved new chunk-tree renderer.

## Proposed single owner lifecycle

An internal `LocalOrganizeSession` belongs to the existing aiPresentation domain. It receives the existing store/foundation and explicit trusted configuration; public request options cannot supply authority, model qualification or profile. Its actual callable lifecycle is `prepare -> assemble -> accept -> existing adoption`, exercised through real local/fixture providers only. This is a production module with an internal consumer, not a worker activation or a live model route.

1. **prepare(topicId, explicitStyle)** reads canonical Topic, current Entries/placements/Sections, saved projection, protection state, gate/policy, restore epoch and existing style in one transaction. It computes an exact scope fingerprint and a bounded plan. A private session handle binds this snapshot, foundation job/child IDs and explicit intent. No repository handle, body or internal source identifiers enter the public status DTO. Foundation planning remains the sole job/coverage owner.
2. **assemble(handle, childId)** rereads current qualifications before assembling bodies. It uses the actual child coverage after locally resolved units are removed, preserving the whole-job current check. It selects changed/affected evidence and demonstrably required unchanged neighbors from the validated old manifest, at real Section boundaries. Unaffected blocks are retained locally, not resent wholesale. Body material is ephemeral and remains feature-owned; foundation dispatch still transmits its exact bounded metadata. No second job store/ledger or public authority token is created.
3. **accept(handle, childId, response)** validates the response against that exact assembled request, then places only the validated local result into the private session state bound to job/child/intent. It cannot borrow another job's result or infer a successful response from an ACK. The existing outcome-verification contract must succeed before committing.
4. **organize committer(t, coverage)** is installed only by this feature session. Inside the existing foundation transaction it revalidates scope, current child coverage, source spans, epoch, existing presentation revision and human protection; it writes the versioned candidate and domain checkpoint together with the existing coverage/usage receipt. Missing private result, changed evidence, a failed write or incomplete child closure aborts the transaction. The same candidate is not rewritten on a replayed committed receipt.
5. **adopt** continues through the current typed `editAIPresentation` operation, exact candidate key/revision, journal and receipt. Partial adopted/kept fields retain their correct provenance and protections. The existing reader receives the eight-field projection. Candidate creation is not reported as human adoption or provider-quality acceptance.

The candidate must not appear complete after only one of several children. Child validation may be held privately until the complete planned closure is available; a final domain transaction validates/commits that closure. The precise foundation API needed to acknowledge multiple completed children atomically must be reviewed before implementation: its existing `commitFacet` handles one child per transaction. Do not emulate full atomicity by sequentially publishing a partial candidate. A smallest first implementation may require a single child and explicitly defer larger scopes until this narrow same-transaction facility is added, while retaining the canonical maximum of four, not redefining it as one.

Private state is bounded and disposable. A restart or lost session cannot regenerate/re-dispatch an unknown paid attempt. Durable existing job/outcome receipts determine recovery; an unavailable private response is an honest blocked/deferred local outcome. Persisting response bodies or introducing another queue is outside this design.

## Versioned compatibility and eight-field projection

Do not change schema 1's limit or reinterpret its saved bytes. Introduce an explicitly versioned derivative contract only if approved for implementation; proposed current-presentation version 2 / candidate version 3 must be independently validated against migration/history readers before adoption. Version numbers here are design proposals, not claimed existing formats.

The new manifest is attached to the same saved derivative/candidate row, not a new database or canonical truth store. It contains stable local block IDs, field/list-position projection mapping, exact contributing Entry identities/revisions, real Section anchors/order, coverage and source-span references. Original mode span offsets refer to the current Entry text in explicit UTF-16 code units, with validated character boundaries and exact slicing; never infer literal spans from legacy summarized prose. Balanced/concise generated text remains locally evidence-validated but is not falsely certified semantically faithful by string checks.

The manifest and projected text must describe one accepted version. Stable block IDs are manifest metadata; they do not create durable Sections or new UI. The eight fields retain their existing readable shapes and text/list size limits. Original source spans render to those existing fields locally. If a faithful result cannot fit those limits, defer or require an explicitly selected smaller scope; do not truncate or invent a new renderer.

Legacy rows remain readable through their existing owner. They have no exact span manifest and cannot be auto-stamped as Qwen, balanced or reusable. Missing/invalid structure justifies bounded full recomputation or defer. New-version readers accept old data; old schema readers must fail closed on new-version semantics, rather than silently treating a partial projection as complete. Candidate keys, presentation/history serialization, public projection and adoption all need the same explicit version handling. Old human edits/recovery records remain usable.

The existing 100-ref schema 1 limit remains unchanged. In the new contract, **total manifest refs and sent child coverage are different bounds**. A validated existing 200-Entry projection plus five changes can retain 200 refs locally while planning five changed units and necessary neighbors. Metadata stays bounded (reuse the existing 256 KiB qualification ceiling unless a separately reviewed contract changes it); current Topic/scanning bounds and body/request byte limits remain explicit. Foundation currently also caps a job's coverage at 100: do not silently expand it. A fresh 205-Entry full job is not justified by the incremental example and must defer/scope down until an explicit bounded coverage-contract evolution is approved. Up to four children is an aggregate ceiling, never four independent quotas or four unbounded requests.

Human-modified fields cannot become automatically reusable/replaceable. Adoption of selected fields must merge matching manifest provenance for only those fields, keep protected field provenance, and invalidate exact qualification when manual edits lack a newly validated binding. Removed, filtered, purged or unauthorized evidence cannot leak through a saved manifest or response; legal stale reading remains governed by the existing reader.

## Proposed implementation ownership

One author owns the complete local closure:

- `core/organizer/ai-presentation.js`: transaction snapshot and domain candidate/adoption integration.
- New `core/organizer/local-organize-session.js`: real private lifecycle and bounded assembly consumer.
- `core/organizer/ai-contract.js`, `ai-candidate.js`: explicit version validation/projection, spans and protection-preserving adoption.
- Necessary existing migration/history serialization functions only after auditing their exact whitelist/version behavior; no bulk relabeling of legacy data.
- A narrowly reviewed `AIUsageFoundation` transaction composition extension only if required for complete multi-child publication; keep its authority/financial/unknown semantics.
- Actual owner unit tests, existing AI native fixture and receipt. Coordinator retains CI/version ownership.

No Source/Input/Topic canonical writer, Settings entry, worker RPC, credential owner, paid provider, chunk UI or second store is included. This scope is larger than a single qualification helper; it should not begin until these ownership boundaries and compatibility choices are approved.

## Acceptance and delivery boundary

Use actual store, foundation, candidate/adoption and reader-status owners with a clearly synthetic local provider/authority:

- Current 200 + 5 workload: unchanged blocks/field content retained exactly; only five changed units and explicitly necessary neighbors assembled. Added evidence must not acknowledge unrelated unresolved units. No hard-coded 200/5 behavior.
- At most four bounded children and aggregate preflight; limit/partial/unknown outcomes do not silently narrow coverage or publish an incomplete candidate. Original mode cannot summarize to fit.
- Unicode combining sequences, surrogate boundaries, moved/changed/deleted evidence, source eligibility, Section changes, restore/gate/policy changes, style/profile A-B-A and human edits are revalidated at assembly and commit.
- Held response after human edit/revocation, duplicate accept, transaction abort, lost ACK and restart preserve original/protected data and avoid reminted attempts. Candidate/adoption/history/coverage/receipt remain coherently bound.
- Old version rows and saved human work remain readable/recoverable; malformed new manifests fail closed. New projection round-trips through existing reader fields without new controls.
- Whole relevant units and actual source/release IndexedDB native journeys; no model/network call. Local syntactic/reference tests do not establish Qwen semantic quality, financial entitlement, actual cache hits at a live service or release gate completion.

This document is an implementation proposal. No new adapter, local lifecycle, version or 200+5 delivery is claimed complete.

## Approved first implementation boundary

Root independently reviewed this design against `ai-contract`, `ai-candidate` and `AIUsageFoundation` and approved a **single-child local lifecycle** first. Keep schema 1, its 100-evidence cap, all eight-field text/list limits and existing candidate compatibility. More than one child must explicitly defer; the canonical up-to-four-child capability and complete versioned 200+5 manifest remain unimplemented requirements. Do not implement the proposed new schema versions in this slice.

Authorized files: ai-presentation owner, new local-organize-session, necessary ai-contract literal-span validation, existing candidate's narrow transaction entry, owning/native tests and receipt. Any necessary Foundation transaction API change first needs a concrete reviewed diff; authority/current/unknown/coverage must not weaken. The real path must be prepare → assemble → local/fixture response validation → existing Foundation transaction candidate + coverage → current adoption/history/status. Worker and unavailable provider stay unchanged. No Source, Settings, CI, version or paid-service activation.
