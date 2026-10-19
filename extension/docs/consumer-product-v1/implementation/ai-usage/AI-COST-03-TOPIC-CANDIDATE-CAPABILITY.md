# Bounded Topic candidate metadata and original-owner capability checkpoint

2026-10-18. Limited local prerequisite, not production cross-window completion.

## Authority and boundary

AI_USAGE_PLAN §5 requires bounded current deltas plus relevant existing state and separately validated hidden formation evidence. TOPIC_ARCHITECTURE PT-03/PT-04/PT-08 require identity-before-creation, independent source contributions, hidden accumulation/expiry and no candidate inbox. TOPIC_ARCHITECTURE_PLAN_PRE_UI_2026-10-13 §§3–5 retain original stores, processing, provenance, CAS and constraints. A candidate is neither a Topic identity nor Context authorization.

Only the original `topic-candidates.js`, new `maintenance-topic-candidates.js`, their two focused tests and this receipt belong to this checkpoint. No Assist/UI, session, payload, mapper, TopicFormation, shared budget, Foundation, provider or Sync file is modified by this slice.

## Implemented finite contract

- One original-prefix metadata page, at most the original maintenance default 50 candidate rows. Its partial cursor and omissions are explicit. Page coverage never proves identity absence or semantic relevance.
- Full old plus newly selected Input union stays within the original Maintenance 20-Input and 20-Source payload ceilings. Historical evidence roles and selected fields are not rewritten. Incompatible or over-limit whole candidates are omitted, never partially represented as complete.
- Metadata selection reads candidate rows and Input-state metadata. Tests reject any attempt to access body-bearing blocks, records or Thoughts. It is not a processing permission.
- Original-owner capabilities bind the live Store/database, exact row/revision/boundary token and complete old evidence. They can cross instances only within that Store/database. New qualification requires the original independently granted opaque field reader. Forged, metadata-only, foreign, released, expired and refreshed-grant capabilities fail.
- Optional private `prepareRecord(request,{candidate})` and `prepareConsume(request,{candidate})` retain the frozen original boundary token. A caller cannot combine the capability with a fabricated boundary key. Legacy direct APIs remain unchanged by default.
- Original current-evidence/constraint/CAS checks still own writes. Candidate lifetime is not extended by accumulation. Revocation, release or expiry at the original put/delete boundary rolls back. Selected Input revision, candidate ABA and root changes invalidate metadata fences.

## Actual evidence

Command: `node --test extension/tests/ai-maintenance-topic-candidates.test.mjs extension/tests/ai-maintenance-topic-candidate-capability.test.mjs extension/tests/cpv1-topic-03-*.test.mjs`

Final checkpoint: **85/85 PASS**, zero skipped/todo/cancelled, 3383.609135 ms. All 806 inventoried core/test/service JavaScript files had identical hashes before and after that run. The original five TOPIC-03 suites retain same-name distinction, removed/keep-separate/human membership/rename/default Section, dormant/redirect, source contribution/reimport/duplicate, restore/cancellation/atomicity and retry assertions.

- Log `/tmp/paia-topic-candidates-85-freeze.tap`, SHA256 `5f06caea970175eb45cca2a39091f1f39ddb4237a6620ff3e8b73f03239a67cb`.
- Stability `/tmp/paia-topic-candidates-85-stability.json`, SHA256 `8621687c490077dab01f4c2e0e221c377e79b856ea025f84c23b2ef3b75fc60f`.
- Owner `a94d89ab8a575ac65005afa6c849d6479f5dd7893be67d419a69bbb8a6dc7d54`.
- Metadata helper `c723e97ad18edfd6345b9e95c88fab56efe1ec679bf32f435c1439d6b0a5e536`.
- Capability tests `d95ddb124bcc0d9b0be3094978a9712e137b1eec7a293ed0705c40b586abd1ab`.
- Metadata tests `ba64ffd2653bcf196cf84c8897ecde655a9386b07276a2317918b3d4889aeda2`.

Earlier 27-test development runs each had one failure in a new fixture: its grant closure captured the pre-append scope; after correction its retrieval coverage used different names than its record request. Both failures are retained. The third 27-test run and subsequent 42-test checkpoint passed. They are not described as production defects or replaced historical results.

## Open integration, not stubs or completion claims

This checkpoint exposes no helper content-capture API. Original request-wide read/hash budget integration was unavailable during this run; separate phase limits must not be portrayed as a shared budget. The independent owner has since supplied an API for the next slice, which requires new checks and a new exact snapshot.

Remaining: candidate-specific grant assembly and full old/current content capture; safe provider DTO/known-ref mapping; new-primary-only mutation scope without changing historical roles; source-owned session/payload wiring; original Topic publication expected candidate mutations; joined receipt/ACK/usage and ACK-loss end-to-end tests. No historical Input acquires Context/filter coverage through this prerequisite. It does not establish general relevance quality, candidate-driven production formation, dormant scheduling, keep/pin lifecycle completeness, native/live/provider acceptance or whole-programme completion.

## Paused capture successor — 2026-10-18 21:11 UTC

The separate successor now performs actual candidate-specific original field qualification and full old/current content capture. It uses the same branded metadata-to-read/hash work ledger supplied by the original qualification owner, preserves old evidence roles, exposes historical Input semantics and known candidate refs only, and validates exact frozen candidate/Input/Source state plus authentic owner publication chains. The original Source validator accounts its hashes; this helper does not duplicate those charges. Revocation, expiry and synchronous currentness failures release retained material and prevent body dereference at the original row boundary.

Latest targeted command: `node --test extension/tests/ai-maintenance-topic-candidate-capture.test.mjs extension/tests/ai-maintenance-topic-candidates.test.mjs extension/tests/ai-maintenance-topic-candidate-capability.test.mjs`. Actual terminal result: **54/54 PASS**, zero skipped/todo/cancelled, 3206.247046 ms. Log `/tmp/paia-topic-candidate-capture-freeze.tap`, SHA256 `d064a52c4e239e1311da83b49bd0fb57350d8931d467961e64dd2a1116445fbb`. Earlier capture run also passed 54/54; the final rerun includes only removal of an accidental no-op label in a new test. No claim of a coherent whole-tree 85-test rerun is made for this successor; the exact original 85 checkpoint above remains separately preserved.

This successor was stopped at the owner's direction to restore the approved automatic Assist experience. It adds the third focused capture test file. Production session/payload/response wiring, original candidate publication writes, new-primary-only mutation scope, cumulative real-work exhaustion, and joined receipt/ACK/usage/ACK-loss integration remain open. A metadata capability never grants body processing. No candidate path is currently assembled into production Maintenance by this slice.
