# Saved and Human mixed-library cold recovery — 2026-10-23

Base: `73439a7ec04e8c84a63f49def0b2e4241d59da5c`. This is a finite local SYNC-01 implementation, with no provider, permissions, scheduler, account, worker registration or runtime installation change.

## Actual consuming result

The new owning file uses original production owners with synthetic data and fake-indexeddb. A creates a source-free Human Entry through `HumanLibrarySyncJournal`, captures one immutable Source through `SourceBootstrapJournal`, generates an original AI Entry with a synthetic generator and explicitly edits/protects it, then publishes the existing strict Saved bootstrap. The original grouped builder exports the complete graph. Fresh B restores both original owners atomically, edits Saved through the original `SavedWorkSyncJournal` with the same request replayed without a second write, exports again, and fresh C restores the resulting graph without remote echo. A second complete scenario edits both the Human and Saved Entries on B before C recovery. Body/title/note, origin, protections, retained original history and Source ownership remain represented; physical history sequences use the original local replay allocation.

This is **not** an arbitrary mixed-library restore. The admitted combination is one original Source bootstrap, source-free Human `entry` / `entry-edit` groups, and the existing Saved bootstrap/successor family. Actual end-to-end scenarios have one Human and one Saved Entry. Topic/Section/placement, Source-linked Human, append/Working, multiple Source, unknown/pruned initial Saved ancestry, broader AI origins and existing mixed-B incremental receive are not qualified by this package. Unsupported structural graphs and existing mixed-B incremental receive explicitly refuse without mutation. Existing larger pure-Saved profiles retain their prior assertions.

## Ownership and safety

- The original complete compiler remains authoritative. It admits only the finite Human family and retains existing Human-before-Source/Saved dependency order. Cross-family Entry/history/operation/allocation collisions are checked. Internal Human identity uses a private Symbol per entity, not caller-controlled string labels.
- `originalHumanSavedApplicationWitness` requires the actual original private Human application, exact Store/Core/Plan and cold mode. It exports the **pre-write** original named-owner inventory, physical mapping intent and search queue intent. A copied cap or different plan is rejected. It grants no writer, generic expected-row override or processing authority.
- Saved preparation still requires an actually empty destination. Its intervening Human counts and allocator state come only from that original planned witness. Original Source and Saved writers still execute. It rejects conflicting original/local creation allocation; it does not rewrite creation identity to force a restore.
- Both original scope validators retain exact row checks for their own partition. Only the corresponding private, same-scope authenticated partition IDs are excluded from the other validator; combined total Thought/provenance/dependency counts and all other original canonical tables remain closed. Unrepresented Human rows refuse export.
- Final native-request fences compare precomputed Human rows/history/operation receipts/search queue, complete protocol mappings, Saved rows and Source qualification. Aggregate counts close insertion/deletion/same-count replacement. Tests inject actual backend requests after the original backup finalizer and require every table to roll back.
- Existing 4096-reference / 2 MiB / 30-second transaction limits are unchanged. The original private meter is used; resetting public diagnostics cannot avoid it. Retained Human witness bytes are added to the existing Saved 2 MiB preparation envelope. No core/repository/codec budget implementation changed.
- The original Human library scope and Saved-only default paths are unchanged when no counterpart partition exists. No package, routing, native harness, background, UI or main/acceptance branch changes are included.

## Integration

The implementation commit contains three runtime files (`saved-work-bootstrap.js`, `human-library-group.js`, `human-library-scope.js`), the new complete owning file, and evidence. Two additional shared changes were **actually applied during testing** but are supplied as narrow patches rather than committing shared source:

1. `saved-human-compiler.patch`: only the Saved family block of `group-checkpoint-plan.js`; preserves the concurrent `prepareOriginalCurrentMixedSubset` / chronology work.
2. `saved-human-coordinator.patch`: pass the actual `humanApplication` to `prepareSavedWorkGroupApplication` in the existing cold activation path.

Apply both patches to the integrated candidate. No `group-checkpoint-scope.js` edit is needed: its existing two owner calls already compose this finite profile. `SOURCE-SHA256.json` records all five tested runtime files and six test files. Shared patch working copies remain intentionally modified in this isolated tree; do not reset another task to apply them.

## Verification and failure ledger

Runtime: official isolated Node v22.23.3, macOS arm64; no native browser, build, cloud, downloaded dependency, real model or real user content was used.

- `baseline.tap`: original candidate 0/1, actual complete mixed graph rejected `BNS_SAVED_WORK_UNSUPPORTED`.
- `first.tap`: first mixed consumer 1/1.
- `search-fence.tap`: 0/1 after this implementation incorrectly predicted a Saved bootstrap search queue. Original bootstrap writes no such queue; the implementation now derives the final queue from the original Human owner only. `search-fence-corrected.tap`: 1/1. No original owner was changed to fit the expectation.
- `controls-first.tap`: 14/15. The Source test mistakenly wrote `records.originalText` on the storage wrapper, not `records.value.originalText`. That did not change the original Source body. Corrected actual body mutation in `source-tail-baseline.tap`: 1/1 refusal/rollback, with no runtime relaxation.
- `controls-second.tap`: 17/18. New private-cap test incorrectly prepared Human restore with an unfixed Core namespace; the original guard rejected before the intended assertion. Corrected original replay namespace in `cap-corrected.tap`: 1/1.
- `owning-final.tap/json`: seven whole files, **157/158**, exit 1, TAP 86353.326875 ms, source unchanged. The only failure is old `mixed-nonempty-recovery` owner-return stage-cursor rejection, with no Saved in that case. Root reports independent correction in `e7584cf9` / `736031b6` and corresponding mixed36/native8 evidence. This package did not rerun or incorporate that independent correction and does not relabel 157/158.
- `identity-negative.tap`: real 0/1 exposed this new compiler's temporary string owner label: a valid caller entity text `human:<id>` could impersonate that internal label when borrowing the Human creation allocation. Replacing labels with private Symbols yields `identity-fixed.tap` 1/1 exact `BNS_SAVED_WORK_COLLISION`. Both original logs remain.
- `owning-stable.tap/json`: final runtime, six whole related files, **123/123**, exit 0, no fail/cancel/skip/todo, TAP **45500.883292 ms**. Source vector unchanged before/after. Includes all 19 new cases plus existing Saved group/successor/multiple/incremental and original Human group files. The separate 157/158 wider result remains visible.

The new 19 cases cover actual A→B→C, both original edit owners, duplicate request/activation, copied cap, foreign plan, cross-family identity collision, unrepresented Human, structural refusal, existing-B refusal, whole-transaction ACK failure/retry, eight actual backend tail mutations and private-budget exhaustion. These are local Node correctness observations, not native IDB, multi-device live-provider, Linux capacity or full product acceptance.

## Remaining implementation / acceptance

A subsequent finite existing-B consumer can retain the exact current Human partition while applying only incoming Saved successors through original saved receive. It needs original pre-write Human physical/mapping expectations and whole-table closure threaded into `sealSavedWorkCurrentScope`; simply adding Human to `mergeSaved.allowed` is insufficient. New Human incoming operations, Topic/Section/placement, nonempty conflicts, mixed search-indexed derivatives, general creation allocation chronology and broader Source portfolios remain separate actual-owner work. Default Sync activation, personal identity grants, real provider/account qualification and whole-product release remain outside this local package.
