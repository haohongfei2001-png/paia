# TOPIC-05.8 saved AI control labels — local partial candidate

Base `0fe9a54fa3ace5a7f4071ed2939e4af7fc7024e3` plus reviewed P2 `33a6f41f` cherry-picked as `dc4d6b34`. No version, CI, schema, provider or shared data change. Not main/installed delivery or complete TOPIC-05.8 acceptance.

The current fields-only saved-AI disclosure had hardcoded Chinese product labels and no live language refresh. It now uses the existing Thought copy owner for its summary, product headings and field aria-labels. Explicit product-label markers are updated on the existing preferences event. User-authored AI fields, Entry bodies and their DOM nodes are not translated or replaced. The AbortController removes the language listener with the editor. Historical legacy editor presentation remains outside this localized slice.

P2 integration keeps its real legacy evidence-editor coverage: the existing native test mounts an actual AIReadingEditor in historical mode over the synthetic saved row, then uses the real worker EDIT_LIBRARY_BATCH and actual refreshEvidence. Its firstChild/Range/body assertions and revision+1 check remain. It does not pretend that the normal fields-only reader owns legacy excerpts; no duplicate body editor is added to production.

Evidence:

- Four complete owner test files, 20/20 PASS, `/tmp/topic-locale-units.log`.
- Complete existing UIR03 saved-AI native file: source/release 8/8 PASS, 66.286 s, no skip/cancel, `/tmp/topic-locale-native.log`. All previous safety, editing, history, bounded-reading, exact Section projection and anchor assertions remain. New checks cover actual summary Enter/Space open/close with focus retained, 320 px target height >=44, zh→en→zh during composition retaining the exact field/firstChild/text and unchanged durable saved row.
- Static package guard 12349 / 373 runtime resources PASS, `/tmp/topic-locale-package.log`.
- No extra browser run was used for independent review. Current desktop coarse-pointer measurements, tablet/200% matrix and legacy-area complete localization remain outside this local evidence. Existing shared CSS was not changed.

Stable verified bytes:

| File | SHA-256 |
|---|---|
| ui/ai-presentation.js | badf4b5913af49732dab59b361250026d3de2637466996060bc988caa6a6c35d |
| ui/thought-copy.js | 0f60820b004382fbc8b6405f7c90f55c0fffbb8a14801cff720496d5b564e184 |
| tests/uir-03-ai-presentation-chrome-e2e.test.mjs | cfc9ed7127467b7b30ca88a8c03163acd6ad2ff2bef0d21fce18add20a295463 |

Independent final review passed (settings_finish): runtime label/aria-only scope, legacy actual-owner fixture and all three recorded hashes verified; independent complete locale test 1/1 PASS, `/tmp/topic-locale-independent.log`. Earlier P2 and Section-prose receipts retain their original failures and per-version scope; this combined local result does not retroactively convert those failures into passes.
