# AI-COST-05 explicit different-style V2 refresh — audit and proposed boundary

Base fe0c63d0, including reviewed semantic A→B→A repair. Only this design and executable audit are new; runtime is unchanged. Future task, not part of frozen 0.34 or 0.34.1 delivery.

## Confirmed versus already implemented

STYLE contract 81–85 permits deliberate current-Topic refresh in a newly selected style; changing preference alone must not generate or scan Topics. Existing output keeps its recorded mode and remains readable when evidence is still permitted. STYLE 73 protects user edits and requires separate candidate/version adoption. Source purge/access denial remains immediate invalidation, not readable stale output.

Actual audit `tests/audits/ai-v2-style-refresh-gap.mjs` uses create/place, LocalOrganizeSession, real candidate adoption and actual acknowledged preference changes:

- Legacy v1: accepted Original → select Concise → new explicit local session can prepare/assemble one bounded current-Topic request. PASS.
- V2: the same workflow fails STALE_BASE at `planIncrementalV2`'s different-style comparison, before dispatch. Expected-behavior FAIL.
- V2 with an actually edited unprotected Entry: current ordinary delta planning still selects the one changed current body. PASS. Therefore do not claim all evidence changes are unsupported or replace the working incremental path.
- A separate pure candidate-constructor audit passes a valid synthetic V2 projection with the same accepted text but a new manifest style. `createAIPresentationCandidate` returns null because changedFields only compares visible field bytes. Expected-behavior FAIL. This is a real function result, not proof that a style-refresh producer or adoptable candidate already exists.

Initial actual workflow log `/tmp/ai-v2-style-refresh-gap.log`: 2 PASS / 1 FAIL. Extended audit `/tmp/ai-v2-style-refresh-full-audit.log`: 2 PASS / 2 FAIL. No network/model calls, runtime edits or assertions removed.

## Smallest proposed vertical slice

Add an explicit internal LocalOrganizeSession preparation intent for current-Topic style recomputation. It is not a public profile/permission parameter, a new UI entry or automatic action on preference changes. Default retained/delta reads keep their existing behavior. A different style alone cannot silently trigger work while merely checking status.

For the explicit intent, require current permitted complete Topic evidence and a recognized current V2 row, unchanged gate/restore/source policy and generation profile, and a genuinely different current style. Select the complete current scope, not unchanged retained blocks from a different transformation. Preserve current 100 whole-job / 20 physical / at most four child and byte bounds; an oversized Topic honestly defers before dispatch. Reuse the existing single/multi-child closure and all current prepared/authority fences. No new Foundation interface should be necessary.

A new proposal is independent of the accepted projection. Failed validation, unknown response and transaction failure leave the usable accepted old-style bytes unchanged. Manual fields remain indivisible; the first slice should conservatively refuse manual-edited rows rather than generate around them or clear protection. Existing automatically protected accepted fields are not overwritten by generation: only explicit adoption can replace them under their original protection semantics.

### Necessary candidate/adoption compatibility decision

Do not implement this as simply bypassing the planner's style comparison:

1. A semantically different style with identical field text still needs an explicitly adoptable candidate; otherwise the job can complete while the stored style never changes. Candidate changed-field/version semantics must include the style transition without misreporting a no-change domain result.
2. Existing V2 has one manifest style. `adoptIncrementalFields` combines kept old blocks and adopted proposal blocks, then writes the proposal style globally. For a cross-style partial adoption, this can falsely relabel retained old-style blocks. Current same-style partial adoption must remain unchanged.
3. There is no per-field/per-block style provenance in the current strict V2 decoder. Adding it would require a reviewed derivative-format compatibility evolution; it must not be slipped into unknown fields.

The initial all-Adopt/all-Keep proposal was rejected by independent review and Root. Existing per-field mixed adoption is a mandatory compatibility requirement, including different styles. No new UI restriction is approved.

### Proposed derivative envelope v3 / candidate schema4

Use a distinct `presentationVersion:3`, strict manifest `version:3`, and candidate `schemaVersion:4`. These are proposed derivative discriminators, not changes to the backup container or IndexedDB schema. Keep no legacy top-level eight-field values, so legacy readers cannot mistake the new envelope for a v1 presentation. V2 rows remain V2 on reads, normal edits and existing same-style operations; an explicit successful style-transition adoption is the only conversion in this slice.

The envelope keeps the exact eight-field `projection`, body-free top-level support union (maximum 1000 distinct Entry IDs), protections and existing revision/recovery fields. The new manifest has a strict bounded `fields` map covering all eight fields, including empty fields. Each field binds its actual style, immutable generation/profile/control provenance and ordered accepted blocks. Each block retains its exact support revision/scope and Original span revisions, plus accepted projection byte ranges. Generated provenance comes only from the internal qualified session; it is not provider-supplied metadata. V2 conversion records existing manifest profile/control as legacy provenance, without inventing a historical generation ID that V2 never stored. A strict discriminated legacy-provenance shape is necessary. New generation provenance uses the real committed job identity and the exact session generation binding; public requests cannot supply these as authority.

There is no global claim that a mixed row has one style/profile/control. Do not add a `mixed` preference value. The status retains the current requested style separately from the stored projection; new cache-exact remains unavailable. The new decoder enforces exact keys, all fields, unique blocks, byte-range reconstruction, support unions, valid style/profile/control provenance, accepted text limits and the existing manifest 256 KiB bound. Empty fields retain provenance and permit a real style-only transition despite zero blocks.

For a new style request, assemble the full permitted current scope using existing bounds and validate child responses under that requested style. Build a separate uniform-style proposal. Candidate changedFields includes visible byte differences OR semantic field provenance/style transitions, including byte-identical output. Digest/CAS binds the entire new proposal and provenance, not only its eight-field projection.

At adoption, an adopted field takes its complete new bytes/blocks/provenance; a kept field retains its complete prior bytes/blocks/provenance/protection. Never split a manually edited field into unprotected fragments. Existing automatically applied protection is not erased during planning. Explicit user decisions remain required for protected field replacement. For first implementation, preparation of manually edited rows can remain conservatively refused if that matches the existing owner; this does not disable mixed decisions on an otherwise legal candidate.

All Keep must preserve the existing accepted format and provenance and retire only the candidate. Mixed decisions create a truthful v3 row; full adoption creates uniform v3. Partial adoption must not advance the whole-Topic evidence checkpoint as if all new evidence was accepted; keep the existing stale/needsUpdate protection. No new exact-cache grant in this slice, including uniform v3. Future delta planning must inspect every retained field's own source/control qualification, not silently normalize mixed provenance to the current preference. Unsupported mixed incremental reuse defers before dispatch; a later explicit full recomputation remains possible through the same candidate owner.

## Continuous use and stable generation identity (review completion)

Uniform v3 is a supported incremental base, not a terminal migration output. After full adoption, a later same-style addition or unprotected evidence revision must use the existing affected-only selection, retain unchanged accepted blocks/provenance byte-for-byte, and dispatch only changed/new Inputs plus necessary original dependency neighbours. It preserves the 100 whole-job / 20 physical / four-child / byte bounds and existing 200+5 and 47+3 semantics. Planner dispatch must explicitly recognize v3 and compare the retained fields using the reviewed semantic style comparison: a legal preference A→B→A roundtrip alone is NO_DELTA, with zero writes/attempts; a genuinely different current style still requires explicit full recomputation. Old prepared handles remain strict and reject A→B→A revision changes. Changing evidence supporting a protected/manual field cannot erase or split that protection to make a delta pass.

Here uniform means all generated fields share the same semantic style/profile and compatible gate/restore/source policy; it does NOT require the same job identity, since a legitimate incremental row naturally contains blocks accepted from several generations. Retained block generation must survive later deltas. The v3 planner must therefore inspect block provenance as well as field provenance and reject contradictions. A field may contain several generation IDs but one recorded semantic style; manually edited fields remain indivisible and do not inherit fresh generated authority. Mixed-style rows may conservatively DEFER affected-only planning where semantics are unsupported, but the same explicit full-recompute path remains usable. This is not permission to make all v3 rows permanently STALE.

### Proposed exact stable metadata

Use a bounded manifest generation registry referenced by fields/blocks, avoiding repeated full receipts. A new generated record has exact keys `{kind, jobId, children, commitIdentity, style, profile, control}` where `kind:'local-committed-v1'`; `children` is the exact ordered job child set (one through four), each with exact `{childId, operationReceiptId, payloadDigest, validatedOutputDigest}`. `payloadDigest` is SHA-256 of the exact canonical final feature payload INCLUDING Foundation usage metadata actually passed to the local execute boundary; `validatedOutputDigest` hashes the accepted, validated child output before provenance attachment. Neither persists the request body or arbitrary provider response. `operationReceiptId` must equal the actual recorded Foundation receipt, not a new invented ACK.

`commitIdentity` is SHA-256 of a domain-separated canonical tuple `[domain, jobId, ordered child records, style, profile, control]`, explicitly excluding its own value and the final manifest digest to avoid a circular hash. The candidate manifest digest separately covers the complete resulting manifest, projection and provenance. The stable generation registry key is derived from this commitIdentity. It is NOT the private in-memory `#generation` session counter, a timestamp or a claim supplied by provider output. Strict decoder verifies digest shapes and internal references; only the trusted transaction owner can bind the actual local job/receipts. Stored provenance alone grants no fresh execution, consent or financial permission.

Payload/output digests are computed outside IndexedDB while the private session retains exact qualified payloads/validated outputs, then compared against that private immutable record during the existing candidate transaction. The same transaction verifies exact job/child/coverage and RESPONSE_RECORDED receipt identities and publishes candidate plus all ACK/COMMITTED updates. Callback ordering may see RESPONSE_RECORDED before Foundation settles; no extra early transaction labels the generation committed. Abort, final authority/dispose failure or ACK failure rolls the entire provenance/candidate back. Lost ACK replay uses the existing job and candidate identity, with zero provider resend. No new Foundation field or API is proposed; if existing callback visibility cannot prove these facts, stop and present the precise necessary change.

Converted old V2 fields use a separate strict legacy record `{kind:'accepted-v2', style, profile, control, acceptedDigest}`. acceptedDigest hashes the exact original accepted V2 projection/manifest bytes before conversion. It deliberately contains no fictional job, child or response receipt. It is provenance for retained accepted work, not an authorization or trusted-generation/cache credential. Registry membership is exactly the referenced set; unreferenced records are rejected/pruned by the qualified builder, bounded by existing blocks/fields and total manifest bytes. Subsequent user editing keeps the historical source record without pretending the new human text was generated.

Required actual-owner additions before delivery: full style-transition adoption→same-style +5 prepares only that delta and retains previous generations; unprotected revision selects only the affected closure; mixed retained fields retain old style and precise job provenance; preference roundtrip Original→Concise→Original permits unchanged NO_DELTA but rejects an old prepared handle; restore/policy/profile/permission changes reject reuse; real job/child or payload/receipt mismatch rejects before candidate publication; post-ACK-abort retry keeps identical provenance. Persist/reload proves stable metadata is independent of session lifetime, without claiming pending private output survives restart.

## Consumer compatibility and required closure

| Actual consumer | Necessary narrow change / invariant |
| --- | --- |
| ai-contract.js `isStoredAIPresentation` / `presentationContent` | Explicit v3 decoder dispatch and the same eight-field projection; v1/v2 validators remain strict. |
| new derivative v3 codec/planner | Exact manifest validation and field-wise provenance merge. Never dereference old span offsets against a newer Entry to reconstruct accepted bytes. |
| ai-candidate.js | Explicit schema4 validation/public projection/key; style-only changedFields; full digest and expected revision; mixed adoption retains old provenance. |
| ai-presentation.js / LocalOrganizeSession | Private explicit intent, same-transaction evidence/permission/style fences, committed generation binding, candidate publication via existing atomic closure. No public profile or provider enablement. |
| ai-presentation-migration.js | Recognize v3 without rewriting it into legacy metadata; no read-triggered V2 conversion. |
| ai-draft.js / metadata.js | Protected-field projection remains readable; purge detachment removes all v3 manifest/provenance/candidate metadata and clears unprotected fields under the existing owner. |
| thought-history.js / recovery-draft.js | Existing complete presentation history captures v3 losslessly; strict current eligibility/restore epoch fence applies on recovery. No historical generation authorizes fresh cache reuse. Check actual decoder delegation before adding any branch. |
| backup-service.js | New reader recognizes v3 only via strict presentation/candidate validators. Existing Topic/Entry references and source-derived restoration fences cover the exact support union. Old backup consumer must reject, not silently restore a partially decoded envelope. Backup container schema is unchanged. |
| source-purge-admission.js / OrganizerStore recovery authority | Keep <=1000 exact top-level refs compatible with existing discovery. Actual purge must discover new accepted and candidate support, mask/revoke immediately and preserve only already permitted manual recovery. No new Source owner or bypass. |
| cache qualification | v3 and mixed provenance remain non-exact; public style/metadata cannot mint cache permission. |

Required old-consumer audit: load immutable baseline modules from fe0c63d0, prove v3 and schema4 rejection by presentation, candidate and backup preflight; prove V2 remains accepted. Merely changing a version number does not prove new-format correctness. New-decoder positive/strict malformed cases belong to implementation validation. No producer may publish new rows before every current consumer in this table is covered.

## Exact proposed ownership

After coordinator and independent design approval: existing ai-incremental-v2 planner only for explicit delegation, a new strict derivative codec, ai-contract.js, local-organize-session.js, ai-presentation.js, ai-candidate.js, ai-presentation-migration.js and metadata.js. ai-draft/history/recovery/backup-service only if concrete consumer tests show delegation is insufficient; request exact added branches before writing. Tests/audit/receipt only otherwise. No Foundation, Source, IndexedStore, Sync, worker, Settings, CI, version or financial changes. This is a proposed file boundary, not runtime authorization.

## Required actual-owner acceptance

- Ordinary opening or changing preference: zero calls, unchanged accepted row. Explicit new-style request: exact current Topic only; a multi-Topic fixture proves no other jobs or Topic enumeration.
- Different Original/Balanced/Concise transitions, including byte-identical generated output; each old field mode retained until that field is explicitly adopted, history before/after truthful, same operation lost-ACK replay.
- All Keep preserves exact old content/style; mixed decisions preserve each kept field provenance and adopt each selected field provenance; old same-style partial decisions still work. Manual-edited row refuses, current protection flags never cleared to enable preparation.
- Full scope under one/four physical children; fifth/oversize predispatch defer, no hidden truncation. Existing 200+5 same-style incremental flow remains unchanged.
- Actual evidence change, Source purge, restore epoch, permission change, style A/B/A during response/candidate hold, concurrent user edit, and stale candidate identity refuse current commit/adoption with no unauthorized old/new read.
- Existing original native source/release file, unchanged budget and old assertions, once after independent code review.

This audit recommends addressing explicit different-style refresh first. Changed protected evidence and removal/recovery need separate original-owner qualification analysis; they are not automatically authorized regeneration. External Qwen fidelity, financial authority and production consent remain separate gates.

## Frozen discriminator audit result

Actual `git archive fe0c63d0 extension/core` into a uniquely owned temporary directory loads the baseline presentation/candidate decoder and its exact dependencies. One targeted audit PASS (247.733208 ms total), `/tmp/ai-v3-old-reader-discriminator-audit.log`: actual accepted V2 remains readable; proposed presentationVersion3 and candidate schema4 reject. This is discriminator compatibility evidence only, not proof of a valid new manifest, backup rejection, restore/purge closure or implemented style refresh. Those remain implementation acceptance gates. Temporary files are cleaned in finally. No runtime modified.
