# AI-COST-03 — original Context metadata preflight and Source-field projection

Scoped privacy repair after the separately archived P1 and Pro Filter owner checkpoints, 2026-10-18. This receipt does not retroactively relabel those checkpoints or close the separate Maintenance qualification-field audit.

## Actual failures and repair

A broader original-owner regression run found four genuine failures: off_scope, input_deny, topic_never and tombstone each rejected the operation only after two Input/Source body-row acquisitions. The added selectedMaterialSnapshot ran before the original lineage metadata-only preflight. Its later rejection and final fence did not repair that acquisition-order violation. `/tmp/paia-p1-context-preflight-4-red.tap` preserves all four failures, SHA-256 `ab38edc4ca8c475363a8bcb72a0116c6fc85dc6093fff99d174abad7f17d8bd2`.

The original Context owner now runs readContextProcessingPreflight for every requested Topic against the original admission before taking the extra exact material snapshot. All phases share the original branded work budget, exact database, signal and synchronous processing-currentness predicate. The snapshot still precedes hashing. Its read fences the admitted authority, and captureContextEvidence requires that same authority, so no later read refreshes a raced baseline. Original full qualification, final Source/Working/Item/epoch checks, private expected-after capability and joined ACK fence remain intact. No extra Input is selected, no grant is inferred, and no crypto is added inside a write transaction.

Four additional actual getter failures established that both the existing-Context helper and original Context writer serialized legacy Source note/editedText while constructing their added private snapshots. These fields are not the current Input's independently selected note. `/tmp/paia-p1-qualified-fields-12-red.tap` preserves these four failures together with eight other still-open qualification-field failures; SHA-256 `f7e2365df2813aa94cc6e4a0f46e8147d1b2a0427c5bbd0f3270a0426f4a66ac`.

Both snapshots now retain only Source id and originalText. Exact Source identity and restrictive facts remain in the separately captured original recordIndex, Input state, tombstones and restrictions. They no longer enumerate, serialize or clone legacy Source note, editedText or conversation-title fields. Positive source tests retain actual one-call dispatch, and direct-owner tests retain successful real owner results. Original final Source-text mutation tests remain present.

## Exact bounded evidence

Four complete files passed together: the original `cpv1-ctx4-05-maintenance.test.mjs`, existing-Context helper and session suites, and new `ai-maintenance-source-field-projection.test.mjs`. Result: **188/188 PASS**, 33,082.923411 ms, zero failed/cancelled/skipped/todo. Log `/tmp/paia-p1-source-preflight-owner-suite.tap`, SHA-256 `2488640996a7c5f7fca218c31fcff67fce60f6fcb2f8efcf1580a2a12776e10e`. Full core inventories before/after compare equal, each SHA-256 `39afd762ad85f18fd0f3d35fcc67680a573e91ee5d51fe9f5b2fd8cdcc1b14a9`.

Frozen changed-source SHA-256:

- `extension/core/context-maintenance.js`: `a63b8f936635afa023ac76917b52abcb186a166b963d2c6dcae746f74f9de7ed`
- `extension/core/ai-usage/maintenance-existing-context.js`: `7f737cbfc7d905acf3d2af9314216f90773f5899b312268a7f6b418d79e536b2`
- `extension/tests/ai-maintenance-source-field-projection.test.mjs`: `35dea3e0bd07d1c6c453d62d17bc8ccde3565f6552bfc0e70e823befbea64c18`

The earlier complete original Context file also passed 100/100 after the preflight repair; its log was initially named `/tmp/paia-p1-context-preflight-51-green.tap` from a stale estimated count. The actual terminal count is 100, not 51. The final coherent 188-case combination above is the owning evidence.

## Remaining authorization work

Eight actual getter cases remain open at this checkpoint: fresh/existing ordinary Input.note, old whole-Input Entry title/note, and pre-payload restored-Entry/Placement title/note. Original authored/bound/structural qualification also validates bounded historical journal text before child payload permission. The successor must obtain an independent exact qualification-field/history grant from the original processing owner, based on metadata-only identity closure, before those readers run. It cannot call a real text/history reader metadata-only, silently treat denied fields as empty, grant whole journals or widen a pre-job grant into a later child. Post-Topic newly created mirrors need separate exact qualification authorization linked to the real committed/ACKed original publication. No such grant implementation or completeness claim is included here.

These are synthetic Node/fake-IndexedDB tests. Native successor, live-provider/semantic quality, production lifecycle, visual and full acceptance remain separate. No installation, network/provider activation, credentials, deployment or new Sync occurred.
