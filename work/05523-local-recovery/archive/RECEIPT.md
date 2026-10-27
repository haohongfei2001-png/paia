# Archive navigator explicit read recovery — local frozen slice

- Candidate commit: `44b48fe80d6acbeb2bb32fd8ca98d2b17d8bb1ff`
- Candidate tree: `a1dfabbf47d948fea2f5a2142cee1a6bfdbd70a5`
- Base: `366188675da3fd7b440273ac41fc269bc8444bf4`, exact published 0.55.22-equivalent base supplied by root.
- Ownership: only `extension/ui/archive-navigator.js` and new `extension/tests/archive-navigator-read-retry.test.mjs`.

## Existing contract and original defect

Current canonical `INPUT_ARCHIVE_INTERACTION_CONTRACT.md` IAH-1.5 §§5–6 preserves bounded source-aware discovery/continuation, distinct failed/partial/empty states and honest error/recovery. `INPUT_ARCHIVE_HOME_PLAN.md` IAH-1.8 retains original navigation/reading owners and error/retry without losing current content. `VERIFICATION.md` requires original production functions and non-happy-path recovery evidence. No retired reader-search UI or new route/editor/persistence owner is introduced.

The original `ArchiveNavigator.readScope` retained a read error, rows and cursor, but `refresh` called the error "building" and scheduled another refresh at 40ms. Source-group failure painted "Loading source groups" rather than an error. Failed Conversation continuation hid the already loaded rows. Restore-depth's while-loop immediately requested the same failing cursor again without relinquishing the loop. No scope exposed Retry.

## Minimal implementation

- Park an errored scope at its original cursor until explicit Retry; genuine index-building retains its existing continuation path.
- Render a local Retry using existing navigator action styling for provider list, source groups and Conversation pages.
- Keep confirmed Conversation rows visible with a continuation failure; Retry sends the same cursor and repeated activation coalesces under original scope loading state.
- Break failed restored-depth continuation without dropping its original depth target; explicit retry resumes that obligation.
- Reuse the existing scope-map identity/current active state and selected-document identity so obsolete scope responses and retry callbacks do not replace current navigation.
- Existing deliberate invalidation/changed-generation requalification remains the original owner's behavior; no new failure persistence or schema.

## Observed evidence (Node v24.19.0)

1. `01-original-red.tap`: original source, new test — 7 tests, 1 pass, 6 fail, 0 skipped. The source-group, row-hiding and repeated restore-cursor failures are retained, not relabeled. The original test bytes are `01-original-red-test.mjs`.
2. `02-focused-after-fix.tap`: first fixed source — 7/7 pass, zero failure/cancel/skip/todo.
3. `03-final-focused.tap`: final source and test — 7/7 pass, zero failure/cancel/skip/todo. Final test adds an ordinary second refresh assertion to prove the error remains parked; no original assertion was removed or weakened.
4. `node --check` passed for the two final files. `git diff --check` passed before and after the local commit.

The focused file covers provider failure→Retry, group failure→Retry, retained rows/exact cursor and duplicate Retry, restored-depth failure/resumption, genuine index-building, and replaced-scope/inactive stale results. This is a small original-component DOM/message fixture, not native browser, actual storage, layout, accessibility or whole-Archive acceptance. No old suite, browser, cloud, CI, full build, provider/service, external publication or installation ran. NULL/default-off/global/UNKNOWN gates are untouched. Product-version integration is left to the parent coherent integration boundary.

## Final SHA-256

- Source: `bf0ae2efe376e0243f909d687a321333fdf15024a3670734cb4b9c9d0b527f5d`
- Test: `5e0f7acb1c6cd40b4444cce3b1e8954552ef3c5641df124fb9ca23e2b0748011`
- Original RED log: `3f3aed8917d3c77022f193bcd617e96aff291214ff8eb680392496ed343bc929`
- Final focused log: `04b752b9027e53132b12390d55c149619c2b4e971f15bb91990c5f4bda94cad9`
