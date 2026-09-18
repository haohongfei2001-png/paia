# ANS-01 Completion Receipt — Reader controls & quiet surfaces

## Identity

- Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- Round: `ANS-01`
- Execution: `ANS01-20260918-1845`
- Canonical start main: `1ed8720b9dee14d810fa43b64c5413b9aaab560e`
- Claim/status commit: `bc802860030b2b6c658a7c054dd7d58607749ba9`
- Implementation commit: `7947c869ccffcbda9d2a0a77fdafbb498b4eb0d5`
- CI synchronization fix: `91941891ecb4002690312959677e9975f590c0c1`
- Certified exact-head tree: `main@91941891ecb4002690312959677e9975f590c0c1`
- Final PAIA Certification: run `35360097931` / #362 / attempt 1 / **success**
- Certification completed: 2026-09-18T15:28:54Z
- Product-owner blocker: **NONE**

This receipt closes only ANS-01. It does not authorize or claim ANS-02 implementation.

## Delivered behavior

ANS-01 implements the package-defined R1/R2/R3/R9 surface changes without changing durable content ownership or capture semantics:

1. Archive root no longer produces the duplicate `#archive-select-materials` launcher. Internal material selection remains reachable from the existing Material Tray / AI Context flow.
2. Reader no longer auto-decorates each Input with a persistent `.core-loop-reuse` “加入本次材料” button. Exact whole-Input reuse remains in the existing Input more menu, and selected-text reuse remains in the Reader selection toolbar.
3. Topic whole-selection is no longer a persistent `#topic-material-select` toolbar control. The same bounded `selectTopicMaterials()` action is exposed from the existing topic menu; its fixed-revision semantics, confirmation and >200-item fail-closed guard remain.
4. Input order is one `#input-time-toggle` control backed by the existing `inputReadingSort` preference. Default asc, persisted desc, anchor restore and failed-save rollback remain part of the same Reader view-state path. This is not Window/Project ordering.
5. Input source time is visible without hover at a subordinate text size. Existing `sourceSentAt` / unknown-time semantics are unchanged; `capturedAt` is not substituted as source send time.
6. ANS browser tests are classified as current browser E2E and enforced by the existing coverage guard.

Retained capabilities were exercised rather than removed: Input more-menu reuse, native selected-text reuse, Material Tray internal Archive search, Topic whole selection, version/source paths, Reader editing/IME/anchor behavior, Capture Foundation time semantics, and existing current-browser journeys.

## Actual changed files

Compared with the ANS-01 claim checkpoint `bc802860…`, the certified head changes only the following ANS-01 runtime/test surfaces:

- `extension/ui/archive.html`
- `extension/ui/archive.js`
- `extension/ui/core-loop.css`
- `extension/ui/core-loop.js`
- `extension/ui/reader.css`
- `extension/ui/thought-copy.js`
- `extension/ui/thoughts-base.js`
- `extension/ui/ux-r1-shell-coordinator.js`
- `extension/scripts/test-groups.mjs`
- `extension/scripts/check-ui-refresh-ci.mjs`
- `extension/tests/ans-01-reader-surfaces-chrome-e2e.test.mjs`
- affected current regression tests for Round 4.8/4.9, UIR-02, UIS-04, UX-R2 and UX-R4 interaction entry points.

There is no schema migration, new object store, Source identity change, provider permission expansion, capture-scope change, AI authorization change, new network request, or ANS-02 source-structure implementation.

## Failed-run recovery and fix

The first published implementation head `7947c869…` ran PAIA Certification `35355933206`, which failed only the first ANS focused browser case in both Full Suite and Current Browser. The remote logs showed the exact failure:

> `The input did not match the regular expression /排序偏好尚未保存/. Input: ''`

The product rollback path had already restored the old preference/anchor and then emitted the failure message. The test, however, first waited for `inputReadingSort==='asc'` and the toggle to be asc. Those conditions were already true before the synthetic failed write completed, so a fast CI runner could advance to the message assertion before the async catch rendered it.

Commit `91941891…` fixes only that synchronization: the test now waits for the completed rollback message first, then independently asserts persisted asc, rendered asc, `aria-pressed=false`, and the original Reader ordering/anchor. No product behavior, timeout, security check or acceptance criterion was weakened.

The exact-head rerun passed both ANS focused cases and every required certification job.

## Exact-head certification evidence

PAIA Certification run `35360097931` is bound to `head_sha=91941891ecb4002690312959677e9975f590c0c1` and completed with `conclusion=success`.

Required jobs:

| Job | Result |
|---|---|
| Adapter and privacy contracts | success |
| Current release build and guards | success |
| Unit 1/4 | success |
| Unit 2/4 | success |
| Unit 3/4 | success |
| Unit 4/4 | success |
| Current Browser Certification | success |
| Full Suite Certification | success |
| macOS Secure Store Certification | success |
| Certification gate | success |

Current Browser Certification reported:

- coverage guard: `CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=11 uir=10 ans=1`
- browser E2E: **52 / 52 pass, 0 fail**
- ANS-01 Reader surfaces / order / time / rollback case: PASS
- ANS-01 Topic menu / bounded whole-selection case: PASS

Full Suite Certification reported:

- **1133 / 1133 pass, 0 fail, 0 skipped**
- unit: 926 pass
- browser E2E: 52 pass
- formal full-suite receipt: `fullSuite=true auditPassed=true`
- historical browser files remain a separate audit set: 76
- input digest: `0b735c88c68d02d46953b72de17594f6bfe7c9b2dc1c762964768415511e9c9c`

The release artifact for the certified SHA was also produced by the successful “Current release build and guards” job.

## Acceptance coverage

ANS-01 closes the round-owned scenarios V03/V04/V05/V06/V22/V23:

- V03: one Input asc/desc toggle; persisted state and rollback are verified.
- V04: source time is visible without hover and remains lower-emphasis than Input body.
- V05: no persistent per-Input `.core-loop-reuse`; retained menu/selection reuse remains.
- V06: duplicate Archive/Topic surfaces are removed while trusted material paths remain.
- V22: Capture Foundation source-time meaning is preserved.
- V23: dirty/IME/save failure, selection, version/source and reading-anchor regressions remain covered by the current suite.

The focused browser fixture exercised light/dark responsive paths at 1440, 1024, 390 and 320 widths plus keyboard and 200% zoom assertions. The original execution also inspected its synthetic screenshots before publication; those local images are supplemental only and are not used as the canonical completion fact. Canonical completion is the exact-head GitHub certification above.

## Migration, privacy and rollback

- Migration effect: none.
- Existing `inputReadingSort=desc` users are not reset.
- Source records, Working Input bodies, Thought bodies, revisions, provenance, tombstones and material references keep their existing owners.
- No external/provider request is introduced by ANS-01.
- Rollback, if ever required, is a presentation/test rollback only; no user-data reversal is required.

## Handoff

ANS-01 is complete at certified code head `91941891ecb4002690312959677e9975f590c0c1`.
Canonical STATUS may now mark ANS-01 COMPLETE and ANS-02 READY. This execution must stop after publishing and remotely reading back those completion documents; it must not implement ANS-02.
