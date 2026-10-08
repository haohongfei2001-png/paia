# 0.26 metadata read ownership repair — review pending

Base a5034759b5409bcdc4e4eba6974414646bdbb507, PR210. Hosted Full 37799315598 failed: Browser7 passed35/36 but UX-R3 Reader → two Topics → edit/restore reported uncaught TOPIC_METADATA_CHANGED. Browser4 and macOS cancellation are not successful evidence. Prompt and Browser1/2/3/5/6 plus native Sync passed. Raw log is work/topic026-browser7-a503-failure.log in the coordinator workspace.

Two deterministic production-controller cases reproduce the same error at renderTopicReader's receiveQualified boundary when a newer metadata qualification supersedes a read during either metadata fetch or generation recheck. The old controller checked reader/window/navigation but not the metadata owner's current token. The repair checks that existing owner, disposal flag and exact qualification token after each async boundary, returning false for a retired read before it can validate or paint. It does not catch unrelated errors or change assertions for genuinely incoherent metadata, restore epochs, purge generations, or canonical editor data.

Evidence:
- /tmp/topic026-qualified-race-before2.log: two actual TOPIC_METADATA_CHANGED failures at line199 on pre-fix runtime. Earlier before.log contains a corrected fixture setup error, not the regression proof.
- /tmp/topic026-qualified-race-after.log: complete Section reader file90/90 PASS.
- /tmp/topic026-qualified-race-related.log: four complete related files123/123 PASS, 256.758ms, no skipped/cancelled.
- /tmp/topic026-metadata-race-diagnostic-final.log: unchanged-runtime whole UX-R3 file26/26 PASS294.955s. The hosted failure is intermittent; this does not erase it or prove its precise stack.
- /tmp/topic026-qualified-race-native-final.log: repaired-runtime whole UX-R3 file26/26 PASS281.249s including 100k Inputs /1000 documents /300 Topics /5000 Thoughts. No skips/cancellations, no increased timeout, no visible browser, no external account or model. Additive page-error stack logging leaves the original empty-error and zero-network assertions intact.
- Package guard12394 /374 resources PASS; diff-check PASS.

The coordinator authored this narrow repair after the independent review agents hit the account quota. Independent review and fresh hosted CI remain pending; no merge, deployment or release claim is made. These proofs do not establish that this was the only possible source of the original hosted exception.


## Final independent authority-loss correction

Independent reviewer root_finish reproduced two second-await negatives, then three first-await negatives: a newer heading read token could suppress an actual current-reader purge/restore/metadata-unavailable signal. `/tmp/topic-qualified-supersession-before.log` retains the first2 failures; `/tmp/topic-qualified-supersession-metadata-before.log` retains the follow-up2 pass/3 fail. These are real production-controller cases, not an exemption to the existing safety assertions.

The final implementation first checks current reader/window/navigation, then handles explicit destructive qualification signals by invalidating the reader and checking tracked entries, and only then retires the superseded metadata response. Ordinary retired responses cannot receive/paint, while current purge, unavailable and restore-epoch signals still fence bodies. Malformed ordinary rows are not fabricated into a purge signal; the original coherent metadata checks remain.

Final independent related files152/152 PASS9.659s plus external5/5 confirmation (overlapping the five migrated cases, not additional coverage), `/tmp/topic-qualified-final-independent.log`. Coordinator four-file selection128/128 PASS408ms. Final complete unchanged UX-R3 browser file26/26 PASS283.755s, no skipped/cancelled (`/tmp/topic-qualified-authority-native-final.log`), including the original100k case. The intermediate second-await-only browser run was intentionally stopped when first-await defects were discovered; `/tmp/topic-qualified-boundary-native.log` is interrupted, not successful evidence. Package12394/374 PASS and diff-check PASS.

Final runtime SHA256 b29fd996f058503a754efccef8f2339bff2ae4d5ecefd8efa97c894ea882655a, independently reviewed and frozen during final native verification. Remote main3d69b95f (PR213) was reconciled while running; its68 changed paths are website-only, zero extension or workflow changes, and the tested runtime/dependencies stayed unchanged. Earlier pending-review notes are historical; this final repair passed independent review. Hosted25eaa Full subsequently failed a separate Data & devices case; root_finish is diagnosing it. Neither its failed/cancelled jobs nor any earlier passing component prove final candidate certification.
