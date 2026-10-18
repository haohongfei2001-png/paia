# AI-COST-03 — bounded Topic wire fragment

Date: 2026-10-18. Baseline: `cc16d0e0556bada72d403d57ef1030dce118af29`.

Status: **implemented isolated fragment; source-profile integration NOT_DONE**. This receipt covers only the new `core/ai-usage/maintenance-topic-wire.js` and its focused tests. The ordinary published Maintenance response schema, source response owner, local session, `TopicFormationService`, `evaluateTopicFormation`, provider configuration and all existing owners remain unchanged. This is not a live/installed capability or semantic-quality acceptance.

## Original purpose and boundaries

Implement the remaining PT-03/05/06 wire representation for existing/named Section assessments and independently useful additional Topic Placements, under AI_USAGE_PLAN section 5. Reuse original Input bodies, supplied canonical Topic identities, Section IDs and qualified Input-bound Entry descriptors. No new evidence, Source, permission, receipt, persistent entity or provider is introduced.

The decoder compares the Topic facet's exact sent Inputs, identities, Sections, constraints and optional Entries with the current view supplied by the original Formation owner. It does not inspect unrelated Context/Filter material. All citations become original `field: 'body'` citations with unchanged UTF-16 offsets. An optional Entry ID is emitted only if that Input-bound Entry was actually sent and the original `entrySpanSupported` accepts its cited span. Foreign/duplicate IDs, missing comparisons, stale material and closed-schema violations fail.

The decoder preserves claim reasons and citations; it does not decide formation, recurrence or membership. The unchanged policy still drops lexical/category/unsubstantiated additional placements, checks their exact Entry span, and controls named Section sufficiency. The unchanged final transaction still controls Source eligibility, current processing, identity constraints, human fixed/excluded membership, original Section/order and atomic writes. No decoded field is a grant.

## Wire and bounds

Exports:

- `MAINTENANCE_TOPIC_WIRE_SCHEMA`: closed Topic object fragment for a separately selected source profile.
- `MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS`: instructions for that fragment; do not combine with contradictory ordinary-route instructions requiring only a default Section and no extra placements.
- `validateMaintenanceTopicWire(value)`: bounded own-data schema validation.
- `decodeMaintenanceTopicWire(value, sentMaterial, currentFormationView)`: returns the original domain assessment, not an accepted result or commit receipt.

All schema object properties are required. `entryId: ''` means no existing Entry selection. Default/existing Sections require empty unused names/citations and neutral `unknown`/`none` reasons. Named Sections retain actual aspect/return reasons and evidence; unsupported or uncertain claims are not rewritten into approval.

The Section DTO uses flat `aspectReason`, `aspectCitations`, `returnReason`, `returnCitations`; `sectionRelations` is at Topic level. `additionalPlacements` is also at Topic level with `{entryIndex, topicId, reason, citations}`. The decoder restores Section relations and each Entry's original `additional: [{topicId, returnValue}]`. The index binds to that exact response Entry. No slot or model ID becomes a persistent identity.

Flattening is required by the existing complete-profile current-binding snapshot depth 16, which is stricter than the standalone schema depth 8. The final fragment is 7,083 JSON bytes; composing it into the current Filter response gives 8,291 bytes and complete compiler current-snapshot depth 16. No compiler, parser, schema-depth, byte or token ceiling changed. Wire bounds remain 100 Entries, 100 additional-placement assessments per response, at most 20 extras per Entry, 100 citations per claim, and the original 64-KiB/4,096-key response snapshot. Original admission still owns at most 20 Inputs per child, two children and 2,000 output tokens. Large assessments may remain unavailable under these original transport/token bounds; these limits are not new formation thresholds.

## Minimum shared-owner integration, still pending

Only the existing shared source writer should make these changes:

1. Define a separately selected response profile by substituting the exported fragment for that profile's `properties.topic`. Keep both existing ordinary schemas/instructions byte-compatible. Validate the complete selected profile through the actual qualified request owner, including the other independently owned facets.
2. Add that exact profile to the source response validator/profile allowlist. Select instructions consistent with this Topic fragment; keep the original job/child/receipt identity, no-retry and all Context/Filter instructions and validators.
3. At bind, retain only a bounded immutable Topic-facet snapshot of the original child material (`version`, `purpose`, `inputs`, optional `entries`, `identities`, `sections`, `constraints`). Qualify Entries through the original payload/session owners; merely accepting an `entries` key cannot authorize their processing.
4. In the Topic adapter, after authentic response/job/child/receipt and currentness checks, use `decodeMaintenanceTopicWire(value.topic, sentTopicMaterial, view)` only for the new profile. Return it in the existing `{binding, value}` wrapper. Continue routing ordinary-profile output through its unchanged mapping.
5. Keep original processing, revision/epoch, constraint, Source, human-membership, final transaction and exact coverage ACK checks. Add an actual source-session/profile integration test before calling this profile wired. No default-on configuration or provider activation follows from this fragment.

## Scoped evidence

Final local Node 24.19.0 run:

`node --test extension/tests/ai-maintenance-topic-wire.test.mjs extension/tests/cpv1-topic-03-formation.test.mjs extension/tests/cpv1-topic-03-organization.test.mjs extension/tests/cpv1-topic-03-adversarial.test.mjs extension/tests/cpv1-topic-03-lineage.test.mjs extension/tests/qwen-qualified-request.test.mjs`

**99/99 PASS**, zero failures, skips or cancellations; includes **33 new focused cases**. Synthetic/fake IndexedDB storage and synthetic local financial/tokenizer fixtures only. The complete new schema is bound by the actual qualified-request owner with the original two-child/2,000-token envelope; oversized full wire is refused before tokenizer/reservation reads. This is not real tokenizer/model/provider qualification.

Real original Formation commits cover existing human Section routing, justified named Section creation, same-Section reuse, default fallback for recurrence/ambiguity/negative claims, useful and non-useful extra placements, exact second-Entry index mapping, and actually sent existing Entry reuse without body duplication. Real final-owner refusals preserve human exclusion/fixed sets, Section/order, removed identities, keep-separate, current Input changes, Section revisions and revoked processing. Focused negatives cover foreign/duplicate/missing identities, citations, wrong-Topic Sections, borrowed equal-text Input spans, non-neutral unused fields, invented authority, hostile own-data inputs and per-Entry limits.

Earlier working-copy test iterations **18/29, 27/29 and 28/29 remained FAILED**. The first nested DTO hit the unchanged complete compiler `DATA_BOUND`; subsequent flattening corrected the proposed DTO, never the guard. Other early fixture failures used incomplete create responses/wrong test API or storage names and were corrected to actual original owner APIs. Those exploratory failures are not relabeled as passes.

Independent read-only review of the final module/tests is CLEAN: it independently reran all 33 focused tests, found no blocking issue or important blocking gap, and confirmed unchanged original schema/response/policy/final owners. Full, native/browser, real PostgreSQL, live-provider, semantic-quality, installation and broad acceptance are **NOT_RUN** for this isolated fragment. New Sync features remain paused; no provider, credentials, permission, workflow, global plan or version change is included.
