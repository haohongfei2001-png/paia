# ANS-08 Completion Receipt — Continuous Topic Reader and edit-safe windowing

Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`.
Execution resumed: `ANS08-20260920-exec01`, bounded manager takeover 2026-09-21.
Execution start: `9e426b41fa61763e6507245b4a26a4600228c5b5`.
Manager refresh main: `1268ccbc660503b6b260d2ad7cc239aeb2372c57`.
Prior receipt: `receipts/ANS-07.md`.
Old candidate: `619bccd49abe0faa9e25304d20ce8cac049f8891`, PR35.
Manager publication: PR36 / `manager/ans08-closure-20260921`, merged at
`43eab8625d9915abefe6188a7ce6034c34555342`.
Final runtime/test candidate on main after the clock repair:
`0b26472f70525fde76c77f228c07dfdaf08821df`.

Certified main: `0b26472f70525fde76c77f228c07dfdaf08821df`.
Certified tree: `2e28bd00e95950264203064b88e05066a5553c5d`.
Main Certification: **PAIA Certification #428 / run 35554800048 / attempt 1 / success / head 0b26472f70525fde76c77f228c07dfdaf08821df**.
Certification completed: 2026-09-21T03:03:46Z.
Product-owner blocker: **NONE**.

PR36 was fast-forward merged at43eab86; the subsequent test-clock correction
was published directly on main under the same execution. Completion docs are
a separate commit; they do not alter the certified runtime/test content.

Local validation snapshot `ecf0e3260795b2fcb78dbf98cf4930abeefe6baf` has Git tree
`2e28bd00e95950264203064b88e05066a5553c5d`, exactly matching remote candidate.
Local history is an isolated archive snapshot; publication used the real remote
parent chain and never force-pushed local snapshot ancestry.

## Delivered behavior

- Topic time/section reading uses a body-free generation projection. Warm reads
  fetch at most40 descriptors; build batches are at most100. Canonical entry
  resolution still controls bodies, Source eligibility and revision checks.
- Topic reading is continuous and bidirectional, with stable-key deduplication,
  empty-page traversal, stale response/cursor fencing and explicit terminal state.
- Three40-row chunks form the clean DOM target. Dirty/saving/composition/selection/
  focused/referenced nodes are pinned and may exceed120; user work is never
  discarded to satisfy the clean DOM target.
- Active tracked revisions are checked in batches of at most100. Autosave and
  history writes stay bounded to40 entries; failures retain unsaved buffers.
- Deep section/entry anchors, reverse direction, sorting, Topic/root return,
  original/AI view anchors and late read-position results retain route identity.
- Section/entry adjacency uses the domain query instead of mounted DOM bounds.
- Source-sent time remains distinct from captured/created fallback; late source
  enrichment invalidates the derived projection without inventing source time.
- No manifest/host permission, new provider/capture, AI authorization, body truth
  ownership, Source/message identity, database store/version or frozen semantics
  changed. The index is rebuildable metadata, not a new canonical body store.

## Recovery and regression evidence

The original Current Browser and Full Suite jobs in35524255645 both failed only
on `bounded undo`. The test's final edit affected nodes[0], while the assertion
incorrectly selected nodes[99] because it had focus. Original failure reproduced
in an isolated real headless extension. No product Undo change was required.

The test now waits for completed successful save batches40/40/19 rather than
request dispatch. With another row focused, it asserts the precise saved pre-edit
body after global Undo and the exact saved body after Redo, plus unchanged other
row, Source SHA256 identity, reverse-edit off, pinned dirty/IME/caret/selection
and zero external/provider requests. Timeouts and gates were not weakened.

Historical `ux-r4-search-reuse-chrome-e2e` MEMORY_STALE was absent from the latest
failed run and did not reproduce in this manager's complete targeted file run.
No speculative runtime fix or stale-authorization bypass was made.

The intermediate candidate8ed Full Suite passed1200/1200. Current Browser first
hit the pre-existing ANS05 timeout (also seen in ANS07); isolated ANS05 passed,
and its one-job retry passed ANS05 but exposed the historical UX-R3 large-topic
DOM assertion of40. ANS08 VERIFICATION P06 defines a clean window of120 with
per-RPC pages40. The historical test now checks1..120 unique IDs, retaining its
exact100k Input/1000 document/300 Topic/5000 Thought fixture, RPC40, anchors,
Back/Forward and zero-network assertions. The isolated real-browser fixture
passes. Output directory creation no longer depends on earlier test cases.
No runtime behavior or timeout was changed for these certification repairs.

The first main run on43eab86 exposed two ANS06 unit failures after the fixed
2026-09-20T02:00 fixture exceeded the24-hour freshness ceiling. The unchanged
fixture reproduced4pass/2fail locally. Two projection tests now mock Date.now
within their test context to NOW+60s, matching explicit observation timestamps;
all six tests and the entire Unit1/4 shard pass. The explicit STALE and
CLOCK_ROLLBACK boundary tests remain unchanged. This is test clock isolation,
not a production cache lifetime extension. The new main commit supersedes the
incomplete43eab86 certification, which was cancelled by concurrency policy.

## Local evidence

- Focused projection/time/cursor suite:7/7 PASS, including520 entries/120 sections,
  invalidation, reverse large-payload chunks and original/AI anchor separation.
- Targeted real-extension browser:7/7 PASS (two ANS08 tests plus all five
  ux-r4-search-reuse tests).
- Continuous fixture:440/440 forward reachable, clean DOM120, upward rematerialized,
  loaded-return server reads0, deep section/sort/return anchors pass. Warm next
  samples p95~69.2ms; descriptor rows40 and warm build scans0. Synthetic fixture
  performance is not a general hardware performance guarantee.
- Edit fixture: tracked chunks≤100, successful save batches40/40/19,
  history batches1/1, IME caret7 preserved, Source digest equal before/after,
  external/extension network/DeepSeek calls0.
- `npm run check`:9146 guardrails across216 runtime resources PASS.
- `npm run build:release`:233 files; RELEASE_PRODUCT_GUARD_PASS.
- Built release: both ANS08 journeys2/2 PASS using the actual unpacked release
  directory and identical assertions; warm sample p95~56.7ms, network0.
- Actual viewport screenshots for both built-release journeys were opened and
  inspected: readable body/sections, visible focus and existing navigation.
  Synthetic profiles only; no logged-in user archive or visible Chrome window.

The authoritative CI environment runs the complete current suite, required
UI-refresh/browser/adapter/privacy/unit/build guards and macOS Secure Store.
Historical Browser Audit workflow jobs may be explicitly skipped by repository
policy; Full Suite's historical Browser coverage contract must pass. Those
skips must not be described as a separately executed historical suite.

## Boundaries

All required main gates succeeded. This receipt closes ANS08 and marks ANS09
READY, without starting or authorizing its execution. Real ChatGPT Project/order/deletion capabilities retain their prior
unverified/unavailable fallback boundary. No new live provider capability is
certified by synthetic tests.

## Certified file scope

Baseline main: `1268ccbc660503b6b260d2ad7cc239aeb2372c57`.
Certified runtime/test head: `0b26472f70525fde76c77f228c07dfdaf08821df`.
Local and remote tree: `2e28bd00e95950264203064b88e05066a5553c5d`.

- `extension/background/service-worker.js`
- `extension/core/import/library-integration.js`
- `extension/core/indexed-store.js`
- `extension/core/library-documents-store.js`
- `extension/core/organizer/store.js`
- `extension/core/organizer/topic-reading.js`
- `extension/core/thought-read-index.js`
- `extension/core/topic-ai-view-session.js`
- `extension/tests/ans-06-source-ordering.test.mjs`
- `extension/tests/ans-08-topic-continuous-chrome-e2e.test.mjs`
- `extension/tests/ans-08-topic-edit-preservation-chrome-e2e.test.mjs`
- `extension/tests/ans-08-topic-projection.test.mjs`
- `extension/tests/daily-v081-chrome-e2e.test.mjs`
- `extension/tests/reading-v081.test.mjs`
- `extension/tests/uir-03-ai-presentation-chrome-e2e.test.mjs`
- `extension/tests/ux-r3-thought-chrome-e2e.test.mjs`
- `extension/tests/ux-r5-on01.test.mjs`
- `extension/ui/archive.html`
- `extension/ui/continuous-topic-reader.js`
- `extension/ui/library-entry-editor.js`
- `extension/ui/thoughts-base.js`
- `extension/ui/thoughts.js`

## Exact-main required checks

- [Adapter and privacy contracts](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283703): success.
- [Current Browser Certification](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283833): success.
- [Unit 2/4](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283857): success.
- [macOS Secure Store Certification](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283863): success.
- [Unit 1/4](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283887): success.
- [Unit 4/4](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283891): success.
- [Unit 3/4](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283915): success.
- [Current release build and guards](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283938): success.
- [Full Suite Certification](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196283940): success.
- [Historical Browser Audit ${{ matrix.shard }}](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106196284472): skipped.
- [Certification gate](https://github.com/haohongfei2001-png/paia/actions/runs/35554800048/job/106200211128): success.

Exact-main Current Browser:61/61 PASS, zero failed/skipped. Full Suite:1200/1200 PASS, zero failed/skipped; unit983, current browser61, adapter102, privacy54. Explicit UI Refresh closure gate passed. Package guardrails9146 across216 runtime resources and privacy/permission/network audit passed. Full-suite coverage audit:fullSuite=true, auditPassed=true, historicalBrowserFiles=76, inputDigest=88760604de3ebad25caaa42ec2a3fe12e64a0da2e045e839a997f4d4b5838d79. Historical Browser Audit jobs were explicitly skipped by workflow policy, not run separately.
