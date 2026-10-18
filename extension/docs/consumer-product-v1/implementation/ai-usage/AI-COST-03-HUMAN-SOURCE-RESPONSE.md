# Human Context response mapping: isolated implementation checkpoint

2026-10-18. Base `39408c1f63dce382cd76758b468842a75b800428`.

This new module implements closed interpretation of already-authorized human
Maintenance material. It is not wired into a packaged source profile. The
existing source-policy final guard has a reproduced safety gap below. This
checkpoint is **NOT an integrated/safe-to-activate source route**, independent
review CLEAN, complete existing-Item support, live qualification, or acceptance.

## Owned files and API

- `core/ai-usage/maintenance-human-context-response.js`
- `tests/ai-maintenance-human-context-response.test.mjs`
- `tests/ai-maintenance-human-context-final-guard.regression.mjs`
- This receipt only. No existing session, Context, Topic, source client/schema,
  existing-Item helper, workflow, version, permission, Sync or Pro file changes.

`createMaintenanceHumanContextResponseMapper(store, {material, coverage, read,
isCurrent, existingContext = null, workBudget = null})` returns
`{decode(value, metadata), dispose()}`.

`material` and `coverage` are the source bind's saved, sent child packet.
`read` must be the original Foundation/session read callback. `isCurrent` must
synchronously revalidate that child's original processing receipt, revocation,
expiry and identity. `workBudget`, when supplied, is the original registered
Context budget. Reads use `contextScopeTransactionReader` and the existing
`readContextTopicScope`; the mapper creates no consent resolver or grant.
`metadata` is the original session's private Context adapter metadata.
`decode` returns existing `{operation, units, change}` groups. The source owner
still validates the authenticated job/child/receipt envelope and returns its
own `{binding, value}`. Concurrent identical interpretation is single-flight;
repeated interpretation retains command IDs, rejects changed response/metadata,
rechecks owner facts, and disposal invalidates and clears retained material.

The exported `MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA` is a Context-array
fragment, with all-required closed objects and no unions. Compose it in the
source-owned profile; do not relax the global parser. `coverageRefs` are `u0`,
`u1`, etc. in the **sent packet's context-coverage order**. They cover that child
exactly once. Model output cannot supply Input/Topic/Item/association/receipt or
permission IDs. Existing Item `ref` is resolved only by the original authentic
existing-Context WeakMap handle. `MAINTENANCE_HUMAN_CONTEXT_INSTRUCTIONS` describes
this finite interpretation, including exact field clears and negative intent.

## Implemented original-owner paths

The mapper checks exact sent fields/digests and private metadata against current
original authored, bound, placement and structural ownership. It composes:

- Source-free authored Entry body/title/note, including cleared selected fields
- Input-backed human Entry note/title plus separate current Input body evidence
- Exact human Placement target, membership operation, Section and order
- Genuine human Section-title change plus its complete original Input membership
- Genuine human Topic-name change plus its complete original Input membership

All paths use the existing Context commands, limits, processing verifier,
lineage capture, final domain transaction and ACK owner. No Item body is read
for model processing on the ADD path. Original Context-card metadata provides
negative-only overlapping lineage admission; this is not semantic equality or
a permanent prohibition on distinct future claims from the same Entry.

Ordinary Input routing and rich Topic formation are separate original source
owners. Human Context correction remains unavailable: copied payload proof JSON
is not accepted as the original private correction witness. UPDATE/NO_CHANGE
require an authentic existing-Item handle with exact sent records, available
state, revision/card and complete registered identity/field closure. The current
existing-Item helper only qualifies ordinary Input-backed Items. Thus authored,
bound and structural existing-Item qualification still needs actual original
helper/source work; these routes are not claimed complete by the schema enum.

## Seven prerequisites for source integration

1. Select and validate an explicit source-owned profile containing this fragment
   and instructions within the unchanged complete manifest depth 16 / schema
   depth 8, 20-Input, two-child and 2000-output-token envelopes.
2. Bind the exact sent material/coverage once; preserve original authenticated
   job/child/operation-receipt identity and reject changed responses.
3. Pass the original read/current callbacks and registered work budget; retain
   independent authored/bound/structural selected-field grants and Source
   closure. Never infer them from Input permission or JSON metadata.
4. Reuse the original session private metadata and final transactional checks.
   Preserve exact group coverage, human target, negative intent and ordering.
5. Close the original source-policy final negative-lineage guard below,
   including genuine Foundation ACK/usage/job settlement tails. A module import
   or mapper precheck alone is insufficient.
6. Keep existing Item bodies behind the original independently selected witness;
   extend that original helper for human-derived Item support before enabling
   those UPDATE/NO_CHANGE cases. No replacement external trust root is supplied.
7. Leave human Context correction pending until its original private witness
   is passed through an owner-owned interface with currentness/settlement fences.
   Do not mint proof from the sent correction DTO.

## Reproduced blocking final-guard gap

The current `ContextMaintenanceService` private `freshInputPolicy` applies
`hasContextInputLineage` before creating a random-ID ADD and again in its final
transaction/settlement fence. That helper explicitly excludes `humanEntry` and
`boundEntry`. A source-free authored Item that the human removed or corrected
can therefore be bypassed by a new random Item/association identity; late
same-lineage insertion is also not rejected by the source-policy fence.

Minimal shared-owner repair: within the existing private source policy, use all
original `contextEvidenceKey` identities, including authored/bound identities,
for these negative checks. Keep both original provenance and invalidation,
including protected/removed/invalidated Items. Only exclude the exact newly
staged Item after the existing full own-result comparison. Preserve ordinary
explicit callers' existing association contract and future separately qualified
claim differentiation. Do not turn this into a permanent same-Entry ban.

The separate `.regression.mjs` has five unchanged positive safety expectations:
two genuine original-owner removed/corrected cases and three authentic
source-policy post-owner settlement-fence checks with explicit synthetic tail
markers. **Those three markers are not evidence of actual Foundation
ACK/usage/job integration.** Shared-source integration must add/run those real
settlement paths. The file is deliberately outside normal `*.test.mjs` until
the owning repair is integrated, with no skip or inverted assertion.

## Verification at this checkpoint

- Node v24.19.0; synthetic, sanitized fake IndexedDB and transport only.
- New normal focused tests: **36/36 PASS**, including five actual original-session/Context positive paths,
  independent grant refusal, incomplete/foreign fields and refs, old operations,
  different Topic, late Input/human/structural edits, final transactional drift,
  closed full-manifest schema, missing correction witness and missing Item grant.
- Combined mapper/payload/authored-fields/bound-session/structural-owner focused
  run: **202/202 PASS**, zero failures, skips or cancellations. It includes the
  36 new tests; the totals overlap and are not added together.
- The original-guard regression run: **0 PASS / 5 FAIL**, faithfully reproduced
  on the unchanged base Context owner. Saved as a required integration blocker.
- No source-profile shipping claim, remote/Full/native/PostgreSQL/provider call,
  installation, permission expansion, paid action or final acceptance performed.
