# TOPIC-05.4 current Section return-position repair

Local candidate; no merged/installed or overall TOPIC-06 claim. Base `e7490f1d2a4371fe5c755442623b82c2ed806e2f`, tree `560bcc755de0243ee12ff835406381996360f0d0`, already contains the reviewed Split B projection extraction. At the initial code freeze, the old ANS08 child remained unchanged and skipped, never PASS. Its separately authorized current-route migration is recorded below.

Frozen code `745bfd910df0fe41f4bf9fbc1b6d2b145bb99ce1`, tree `7176340781a400a1baaa89149d84348a51cb7e26` contains the four runtime files and two new tests. This subsequent receipt changes documentation only.

## Required behavior and proven failures

`TOPIC_ARCHITECTURE_PLAN.md:131` expressly requires Entry/revision/offset restoration and a current-route equivalent or stronger replacement of the historical deferred return-position check. Durable Sections replace obsolete Content/Years composition, not reading continuation. PT1 visual authority:59 and its reference manifest:50 retain that boundary.

The new synthetic headless file first proved ordinary Entry/revision/offset open and same-session return, but cold reload moved offset160 from y140.19 to y432.19 despite remaining scroll capacity. The actual scroll trace shows original `TopicController.restorePosition` corrected by +291.75, then `archive.navigate` overwrote it with scrollTo(0,0), followed by the original reader's prefix/window compensation. The qualified-before log remains `work/topic-return-position-qualified-before-20261009.log`, SHA256 `b29e6a4a2a00b1813e05253f1ba6462bcc2afeea80ed14adbc6440e4455a1ac3`.

A second genuine failure remained after the archive-only repair: saved revision2/body/offset160 were identical before and after reopening, but the text moved y140.19 → y170.19 while Entry row top stayed -16.56. The refreshed human-edit binding status adds a header above the same body; the existing row-only session anchor cannot preserve text position through that header change. Before/after DTO/DOM diagnostics remain `work/topic-return-position-saved-layout-diagnostic-20261009.log`, SHA256 `3eb7a75f7294815914e7fbc8341725ba90fe3ee4483136b66252828987efbace`.

Initial CDP launch failures occurred before product assertions. Two early fixture failures incorrectly assumed creation acknowledgements carried full Entry DTOs; the corrected fixture uses the original `s.entry` owner. A no-change retry input did not clear the original editor's failed state; the corrected fixture makes a genuine subsequent edit, retaining the old results. Those failures were not waived or represented as product passes.

## Minimal existing-owner repair

- `ui/archive.js` leaves an opened Topic's scroll to the existing Topic owner; ordinary Root/null, Archive and Reader scroll paths keep their previous branch.
- Existing Entry anchors may carry optional body-free `text:{revision,offset,top}`. Capture uses the current editor's acknowledged row, only in original reading when clean/not-saving/not-IME and DOM text exactly equals its acknowledged body. No draft/body text enters the anchor.
- `ContinuousTopicReader.snapshot` and `TopicAIViewSession` whitelist and independently copy only those three optional fields. Old `{id,top}` and Section anchors remain fallback-compatible. No durable schema/history/body store is added.
- After existing window/render qualification, text correction requires the fresh current editor ACK row, same Entry revision, exact DOM/body equality, in-range UTF16 offset and a measurable Range. Missing/mismatched evidence uses the original row fallback; old reader-item revisions never authenticate text correction. Existing intent/serial/view/input-epoch guards remain.
- A successful leave captures the latest acknowledged position while its editor still exists, before disposal. Failed save/IME does not become a saved-text anchor. A late durable-position response cannot replace a newer valid session position/sort; no forced use of old durable location is introduced.

Only four runtime owners and two new owning files change. Source, canonical body/Entry/placement facts, Settings, permissions, sync/storage and original browser assertions remain unchanged.

## Exact local verification

Node22.23.3; isolated headless Chrome with synthetic data, zero external/extension/provider requests and no user profile/window/account. No browser timeout was extended or position assertion relaxed.

- Complete five Node owning/relevant files: **163/163 PASS**, zero skipped/cancelled. Files: `topic-text-anchor.test.mjs`, `ans-08-topic-projection.test.mjs`, `cpv1-topic-05-2-root-section-anchor.test.mjs`, `cpv1-topic-05-4-section-reader.test.mjs`, `topic-workspace-presentation.test.mjs`. External final log `work/topic-return-position-text-units-final-20261009.log`, SHA256 `b4edeabad59b3b4570429b17af32101ea793aec5283b87e0aba8bdb1a362b5c5`, records the exact run.
- Single actual combination of the new native file and all three original files (`ans-07-library-root`, `ans-08-topic-continuous`, `ans-08-topic-edit-preservation`): **6 PASS / 0 FAIL / 1 historical deferred child SKIP**, 55.5073s; SHA256 `6bacdea7004208925244c87a9253b95ca93c24d179c6d5728da075147f3c1a77`. The skip is explicitly excluded from acceptance. An earlier command misspelled the Root filename and only ran the other files; that incomplete result stays preserved and is not called a four-file pass.
- The new full three-case file was then rerun after strengthening the native-wheel assertion to require actual movement: **3/3 PASS**, zero skipped/cancelled, 7.0024s; log `work/topic-return-position-new-file-final-20261009.log`, SHA256 `5a3195bcefc7c527e9e06ef257cb22e7ff64039063f4e8217925778e22244603`. Runtime and original three files are byte-identical to the successful combination. This covers exact Entry/revision/offset on current named Sections, Root reopen/cold reload, actual failed native put and IME departure refusal, acknowledged edit/header change, canonical removed-anchor fallback, and a real wheel while an actual stale durable position/sort response is held and delivered.
- Original combination new-case timings: 1.7761s saved return; 3.0239s unsaved/saved return; 1.3711s nearby return. Current full file totals 7.0024s. This supports one ordinary browser shard, not a new broad matrix.
- Release build: **439 files**, v0.43.1, external log SHA256 `c0114d57fc8a457f09b09c8b9307074117bc3d21ead982ab6b6e96c7b3700aa9`; no release browser or installed confirmation is claimed by this build alone.

Runtime SHA256: archive `65dca27443e49e483df22e12bbc97f9b9b9cd4f8a58363d668d96deb4206cdc2`; Topic workspace `1cda918917b6c612fc221d16829abcf5ea96cd7db81200cf651e55d93e7f0899`; continuous reader `9f966c9a5606b3f605f0fe6d79c0e5862b3d6c3b12800fc858cc5d91d49812d6`; AI view session `3baf55dab7d0e5d42c2938681169774458b37e1e41cba47c036fd1499160f34f`. New browser SHA256 `f1edd653ee18f88c653d38a36f3d4618052ff10774a7a00b7723c6ddafc5e8b9` is updated by the final stronger wheel assertion; the final log binds that final file. The new unit file includes an additional actual-owner successful/failed leave test after the initial 162-case run; final163 is authoritative.

Independent review, historical-child migration, exact integrated gate and eventual delivery remain Root-owned. Keep prior failed/skip records and distinguish those stages.

## Preserved historical assertion now runs on the current route

After Root's independent finite CODE approval (`work/TOPIC_RETURN_745B_ROOT_CODE_REVIEW_20261009.md`), Root authorized an independent test-only migration. Commit `03434e4f28c6ddb96c7b8a04742b39b822411a3e`, tree `b5c85e676834ebbfe2be444f48f8195197125ac5`, removes the old child's skip, updates its current-route name/history comment, and replaces the two stale deferred evidence labels with the actual `beforeBack.id` and empty deferred list. The original 30-second `eventually` return-anchor assertion, all other assertions and budgets are unchanged.

The complete original file with the child enabled actually passed **2/2**, zero skipped/cancelled, 9.0504s. Log `work/topic-return-position-original-child-migration-20261009.log`, SHA256 `9645451a2b909a3635d929f10de78fbbb690da22fca5e8ca609ba855baedf5f9`. The evidence-label-only corrections occurred after that run; Root's final integrated combination will cover the exact final file. Runtime and original assertion bytes did not change. Past skip/failure receipts stay historical rather than retroactively becoming passes.

Thus the original return-Entry assertion remains in its original browser owner, now on durable Sections, and the three new current-route cases supply stronger revision/character-offset, cold reload, saved/unsaved/IME, removed-target and late-response/user-scroll evidence under `TOPIC_ARCHITECTURE_PLAN.md:131`. Peer review and exact integrated/release/delivery gates remain separate; this local result does not certify all of TOPIC-05.4/06.
