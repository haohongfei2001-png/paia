# PR313 contract repair and bounded native diagnostics — 2026-10-23

Base: `02144bccf5e0e0b6842aaa4e7c6958cedecdfde1`, tree `f2eac4e08a1707b78ffa7e1a2efbca6208e6396b`.
Branch: `codex/pr313-contract-native-followup-20261023`. Implementation commit: `712a5d1a` (four existing test files).

Scope follows the verified human authorization relayed by dot: repair the two old CI contract tests, add minimal diagnostics to the original browser tests and run corresponding controlled local reproductions; retain human protection and assertions, without production changes, acceptance-candidate updates or Full execution. The earlier PR proposals are 6352271666, 6352453732 and 6352528630. This is not a claim that Browser3 or Full is repaired.

## Delivered changes

Only four implementation paths, all existing tests:

- `sync-node-preflight-ci.test.mjs`: reverse exactly one approved current_browser Ubuntu24.04 runner/font block, then apply the original Sync normalization. Original `166fcd607396799510cc3ac947ab06d23496090d5a04939716d2302b0e982a78` baseline and both command hashes remain. Eleven mutation controls reject changed/duplicated font steps, state/key, runner, timeout, concurrency, filtering, aggregate and commands.
- `d5-full-browser-partition.test.mjs`: both original candidate-job inline APT requirements remain; current_browser instead requires the exact approved plan/state/private-copy/empty-key/install chain and pinned frozen helper bytes, both font packages and all resolver/download/install flags. Original glyph, artifact, 18-minute, routing and gate assertions remain. Negative mutations do not qualify.
- `topic-entry-section-move-chrome-e2e.test.mjs`: reuse the unchanged ANS07 observer for the sole original CONSENT request; admit the original seed only after its ACK. Body-free phase/run/commit counters retain the original failure. Diagnostics and cleanup cannot replace an earlier error. Original behavior block is byte-identical. Controlled Source/Release negative cases release the held real worker publication between the seed store's original fence reads: one seed attempt, rejection before business entry, no Topic/Entry fixture entities. Initializer writes are counted separately and are **not** called zero writes. Positive held controls prove zero seed attempts before ACK, then preserve all move/cancel/reading ACK/cold restore/history/revision/protection/English/narrow assertions. No extra CONSENT, sleeps or seed retries.
- `cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs`: diagnostics only in the original styleV3 precondition and failure journal. Every original assertion line and the failing second run remain. The independent service-fixture control is supplied as an explicit evidence script, not imported into the default browser root. Its `pg` dependency is therefore not silently added to the Full browser setup.

No runtime, shared harness, font helper, workflow, router, budget, production identity or version edits. No acceptance branch/main integration. Source/runtime/harness vectors and original assertion preservation checks are in `source-vector.json`.

## Results, kept separate

| Execution | Actual result |
| --- | --- |
| Original two Node contracts | 21/23; two expected old-contract failures |
| First combined Node invocation | Incomplete: one test passed, then shell function recursively invoked `python3` because PYTHON was not absolute. Only this owned local process was stopped; its log remains. |
| Corrected invocation, explicit Python; two contracts + original hosted setup | **144/144**, no failures/cancels/skips/todos |
| Original Browser3 owning file, before diagnostics | **2/4**, both original styleV3 variants failed UNAVAILABLE |
| Initial Browser8 controls + original behavior | **4/4** |
| First Browser3 diagnostic + provisional fresh controls | **2/6**: two original failures, two legacy-code parity failures; tested source snapshot retained |
| Final combined original Browser3 + Browser8 files | **6/8**: both lifecycle cases and all four Browser8 cases passed; two original Browser3 failures remain. No cancels/skips/todos. |
| Isolated genuine fresh-action legacy-code negative control | **0/2** at the deliberately retained STALE_BASE equality; all preceding commit/replay/rollback/block/generation/receipt/quiet-network assertions passed. Actual code STORAGE_FAILED in each variant. |

Baseline Node used local Node26.8.2; combined corrected Node and all native batches used bundled Node24.19.0, Python3.12.14, Playwright1.63.0, Chrome155.0.8059.85. This is not Node22 CI qualification. Original headless launcher and network exclusions were retained. Release staging used the original package builder; it is local fixture preparation, not installation or deployment. No real APT/sudo/font/network/service/model/paid execution, CI, Full or deploy was started. The signed-service fixture uses existing synthetic transport and SQL protocol simulators, not live PostgreSQL or real identity/entitlement service evidence.

## Browser3 direct local observation

Both final variant journals independently report:

- Exactly eight protected fields after the original real keep/adopt decisions.
- `handle = {state:NO_DELTA, jobIdPresent:false, blockedReason:PROTECTED_FIELDS}`.
- Jobs2/attempts2/ACKs4 before and after; provider calls2 before and after.
- ACK fault hook hits0, caught first-run error UNAVAILABLE, Current byte-equivalent to the mixed human-protected row.
- Original second run still throws UNAVAILABLE. No protected fields were cleared or relabeled as AI-authored.

This now proves the local precondition mismatch, rather than merely inferring it from source. It does not manufacture the missing historical cloud intermediate values. The old styleV3 summary and later exactMultiCache phase remain unexecuted, not passing. The diagnostic preserves the failure so this delivery cannot hide those unqualified assertions.

## Independent valid-owner control and its limit

`fresh-action-legacy-code-negative.mjs` explicitly reuses the unchanged `services/ai-gateway/tests/organize-native-fixture.mjs`. Real worker sender/action-source selection, signed synthetic service owners and native IndexedDB create an unprotected Current from two inputs. A new real action with one added input reaches the ACK hook and returns STORAGE_FAILED; Current, publication marker, AI revisions, Current receipts and ACKs equal their pre-action snapshots. A fresh explicit action replays the retained validated local CAS with the same job identities and **no third physical provider call**. It commits the original blocks plus one new block:3 evidence entries,2 generations; every referenced child has its original COMMITTED usage receipt. A cached action sends no provider call.

Another added input reaches the ACK hook once. The existing fixture's service invalidation calls the original runner's session.dispose and action-source.invalidate. Both variants preserve Current/marker/AI journal/receipt/ACK snapshots, sizes `[2,1,1]`, physical calls3, and zero external/extension network/errors. However the returned code is STORAGE_FAILED, not the legacy fixture's STALE_BASE. The control records this before the retained equality fails. It is a **different qualified revocation boundary**, not evidence that the original legacy dispose test passed, and not a demonstrated publication leak.

Source explains a plausible difference: session.dispose invalidates its original source; `idb-repository.js`110–119 binds original selection revocation to native transaction abort, and22–23/427 maps database errors to STORAGE_FAILED. Observed stack ends at427. Exact internal abort-event ordering was not instrumented; do not claim more than the snapshots and stack establish. No production error mapping was changed merely to satisfy the old code expectation.

## Remaining precise qualification proposal

Dot can review the Node and Entry changes independently. Browser3 still needs a test-precondition/qualification decision before claiming repair:

1. Keep original human mixed-style path as a separate protected-refusal oracle, including full ledger/journal/coverage snapshot invariants; never clear its protections.
2. Move the displaced style refresh, ACK rollback, dispose, incremental blocks/generations and exact-cache assertions to valid original-owner scenarios. The current public runner RPC has no refreshStyle argument; adding such an argument would be production/API scope expansion and is not part of this delivery. Do not silently inject it or migrate legacy/V2/profile paths.
3. Decide the exact qualified source-revocation error contract and prove its native abort ordering. Current evidence proves atomic refusal but not parity with legacy STALE_BASE. The local negative control is reviewable and must not be called 2/2 success.
4. Keep the later exactMultiCache assertions intact until separately qualified. The four existing service native suites are not certified by this small reproduction, and their default Full exclusion remains.

No new Full authorization exists. PR312 two opportunities remain exhausted; PR313 first Full39860568299 remains failed and consumed. Six browser cancellations, Unit1 shutdown and capacity remain separate from these local assertions and are not resolved by this patch. Original cloud Browser8 writer/field and cancellation causes remain UNKNOWN.

## Evidence

[evidence directory](evidence/pr313-contract-native-followup-20261023/) contains preserved initial/final logs, both original failure journals, body-free seed traces, original synthetic screenshots, the provisional tested source, isolated negative-control source, source vector and SHA256 manifest. The negative-control filename differs from its execution log's former `fresh-action-control.mjs` name only; bytes were preserved. No screenshots are claimed as human visual acceptance. All artifacts are synthetic or source metadata; no user archive/model bodies were accessed.
