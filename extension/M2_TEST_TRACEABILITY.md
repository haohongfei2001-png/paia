# M2 acceptance traceability

Synthetic only. These tests never open the daily PAIA profile/database. The full suite also retains every M1 and earlier capture/Input/Source/filter/import test.

| User gate | Evidence |
|---|---|
| 1 Library Index | thought-m2.test: manual Index; thought-m2-e2e: manual Library document; duplicate-name safe byIndex keyset |
| 2 continuous Topic Document | visible Chrome Topic test + synthetic screenshots; no Entry card borders |
| 3 direct Entry edit | manual Library Chrome test; no Edit button |
| 4 autosave | editor-primitives debounce/max-wait; M2 Chrome save/retry; Input characterization |
| 5 IME | M2 Chrome composition pause/commit; workspace-e2e existing Input boundary |
| 6 Undo/Redo | M2 Chrome body Undo/Redo and cross-entry atomic Undo; new-write revision counters |
| 7 persistent revision | M2 core Topic/Section/Placement/merge restore tests; M1 body history tests |
| 8 field protection | changed-field CAS and user ownership assertions; full M1 per-field evidence tests |
| 9 multi-topic same Entry | visible Chrome edits from second Topic reflected in first |
| 10 no duplicated body | single thoughts count under 1/3/10 memberships, merge/revision tests; performance postings count |
| 11 Topic rename | visible Chrome + UUID assertions |
| 12 Topic merge | staged layout/cursor tests; visible Chrome survivor selection |
| 13 redirect | core merge and restore/redo, stable source/survivor IDs |
| 14 pin | core summary/pin restore; visible Chrome pin + Index |
| 15 Section CRUD/order/merge | core persistent empty/default and important revisions; visible Chrome operations |
| 16 Placement reorder | independent-topic rank test, important revision restore, visible Chrome |
| 17 negative membership | removal preserved through merge; explicit user re-add and operation receipt |
| 18 delete Entry | visible Chrome removed lifecycle + core search/read gates |
| 19 suppression | full M1 scope/HMAC/removal tests; M2 uses same removeEntry transaction |
| 20 restore | visible Chrome low-frequency management; core revision restores and counter checks |
| 21 purge fence | core pre-cleanup search gate and retained-field reindex; Chrome cache purge; M1 tombstone tests |
| 22 stale | Chrome upstream Input change leaves body, weak source-updated notice |
| 23 lazy provenance | Chrome request count zero before expansion, metadata after click; removed/unavailable versions core |
| 24 local search | Entry title/body, Chinese, Topic name, Section title; versioned postings and final text check |
| 25 rebuilding/in-progress | core pending/complete response; UI shows indexing/continued search instead of false empty |
| 26 pagination | core first40/next and invalid cursor after organization change; bounded transport |
| 27 long Entry | real Chrome 200KiB edit/read exact bytes; separate load instead of truncation |
| 28 large Topic | real Chrome 10k Topic first40/next; layout staging in batches of 100 |
| 29 multi-tab edit | real Chrome second page winning body write; core disjoint field CAS |
| 30 dirty field conflict | Chrome local draft retained; disjoint-field update and quota retry; atomic batch rejection |
| 31 Input editor regression | 7 characterization tests passed before extraction; rerun unchanged workspace/IA tests after extraction |
| 32 Source/Input/Smart Filter/History Completion | complete inherited suite; no rule, adapter, network or permission changes |

## Test reporting boundaries

`tests/thought-m2-performance.test.mjs` uses actual Chrome IndexedDB in temporary named synthetic databases. Its seed is a test-only direct store fixture. Production persistent writes remain in the service worker. Performance numbers are measured operations on this machine, not universal latency guarantees; setup and index rebuild costs are separate from first-page reading.

`tests/thought-m2-e2e.test.mjs` uses headful Chrome with a fresh temporary profile. Its source fixture is an explicitly deterministic internal data-model fixture, not an AI Provider. Screenshots contain invented titles/content only.

Session Undo is bounded and is not advertised as surviving reload; persistent Revision is the reload-safe mechanism. Layout revision restore checks current organization versions and refuses to discard subsequent organization work.

Additional final boundary coverage: independent writing before Topic selection; existing M1 default-section bootstrap; exact ordering across equal-rank groups; IME versus a remote field revision; IME cancellation on Source purge; cleared field revision fencing after cleanup; removed/restored provenance cannot become current again. These are asserted in `thought-m2.test.mjs` and `thought-m2-e2e.test.mjs`, with independent visible-Chrome confirmation in `outputs/v070-m2-editor-edge.json`.
