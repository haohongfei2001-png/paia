# Human private grouped recovery: native verification

Test-only native bridge, based on runtime `5d18cc749f30e6032a9da998b5c07e94c175ed9d`. The source/release whole-file native run passed on the exact test commit recorded below; syntax checks alone are not browser acceptance. No production route, permission, CI, version, or runtime is changed by this batch.

The bridge preserves all ten original Human journal cases and four allocation-role cases, and executes the entire three-case original grouped recovery file plus the entire two-case request-order file: 19 distinct owning cases per variant. The generated MV3 worker uses static imports, real browser IndexedDB and the existing original owners. Original assertions and the 180-second whole-file budget remain unchanged. Synthetic immutable publication bytes are transport fixtures only.

In addition to the existing single-commit receiver restart proof, the bridge builds and activates a real empty-installation grouped checkpoint containing original Topic/default/named Section, Entry coalesced history and membership. It stops and restarts the actual worker, then requires exact equality of all captured stores, original canonical/history/placement checks, duplicate activation with zero writes and no echo outbox. Lifecycle and network ledger evidence includes both actual worker restarts.

## Current evidence

- Fixture, outer harness, and generated module syntax checks: PASS.
- Generated fixture: 19 test registrations; no fake-indexeddb reference; no dynamic import.
- Source/release whole-file headless native acceptance: **2/2 PASS**, 0 failure/skipped/cancelled, 25762.799041 ms. Source 12033.256792 ms; release 8735.767917 ms. `/tmp/human-group-native-source-release-first.log`.
- Runtime digest manifest: 27 files; adds required Human request, group and scope owners to the prior 24-file inventory.
- Exact source/release 27-file digest manifest and all 19 case names: PASS, exact equality.

## Scope

This is private local named-owner and bounded partial grouped recovery evidence. `productionActivation=false`, `fullRecovery=false`, `groupCheckpointImplemented=true`, `derivedProjectionRecovery=false`. Search completion/postings and read-index projection qualification, sibling conflict retention/resolution, real device/provider/account and formal full Sync acceptance are separate remaining gates. Existing failures remain in their original records; no skipped/cancelled run counts as PASS.

## Exact test bytes

- `tests/native-sync/human-library-fixture.mjs` SHA256 `6d36cd6ce6811dd3385d13a333011e985f4c198d6847edefbe9b790f0ec97c26`.
- `tests/native-sync/human-library-chrome.test.mjs` SHA256 `6916ff9ac3f7626e5af08dfb24d2efac544f4c3c469b533fc05ece880f78e4ed`.
- `tests/browser-native-sync-human-library-journal.test.mjs` SHA256 `37defd4282bfea879774a2a53f9adea6a2a12c0beb702f3af05180be7c05897c`.
- `tests/human-graph-allocation-portability.test.mjs` SHA256 `cef6f2df910a6a01d0eacaf4f5ccd217f45096684e03e488bee67865829d8441`.
- `tests/browser-native-sync-human-library-group.test.mjs` SHA256 `ade537ca7d2dd110c8de21e3cc30cc3b70d556b8d9813cf3ddfefbcbddd2088e`.
- `tests/human-graph-request-order.test.mjs` SHA256 `9286cccd3f02211ac38b87bb97b84fcfa920d4fec890c17308c08e0cb22f45b1`.

## Exact completed run

Test commit `906228950f279b853d1daca27be4b20f122fb1a3`, tree `21f33eb1ff49632bb0f2ea1ee3b51af3cc0b2f85`; Chrome `154.0.8037.99`, isolated headless MV3 with actual native IndexedDB. Runtime source is unchanged from `5d18cc749f30e6032a9da998b5c07e94c175ed9d`. Source and release each completed all 19 cases, followed by both durable worker restart journeys. Grouped restart asserted exactly two Sections, one coalesced Entry edit, revision 3, twelve original history rows, complete all-store preservation, duplicate activation with zero writes and no echo. Both worker lifetimes changed at each stop/restart and the original network ledger reported zero attempts / zero HTTP requests.

- `source` receipt `work/qa-bns-human-library/source.json` SHA256 `bc1c69ded1196555ff9197aafb602c9d4363ce8352f977d7ffd272145047abc2`.
- `release` receipt `work/qa-bns-human-library/release.json` SHA256 `a019b9c63817c08f98489e840527eb10b85091b753af7b9ea1d8846aa4da7be4`.
- Whole-file log SHA256 `e2379409d555eae76b9082406b2576efca4619e9124d01c021f0968cbf20818c`.

## Runtime source/release digest manifest

- `core/idb-repository.js` SHA256 `48c1ce41777821288db4d6c0ce5a99853346b206f1eb6ef6474e9d14b2ce1916`.
- `core/ia-store.js` SHA256 `87f5699dbcb631b2389e887aa5ae1deb0d1ebfbe31bf1324d1df73518f8d0e05`.
- `core/thought-store.js` SHA256 `fb34922dd891ab98ecf1077a2b051d840e59f1f321457a1009db77d887d22506`.
- `core/thought-model.js` SHA256 `a681211abf082dce6d05381841583247778ca4462963ffe458b4503629fd4fe6`.
- `core/thought-journal.js` SHA256 `0b83ada804f78435343891c659b932a789a14d9f58cad46a2339e5d82e7c8957`.
- `core/library-documents-store.js` SHA256 `922040b65f4604f8525bc11d7368916b67c6b6c29e2086a074f669584b57ac68`.
- `core/thought-organization.js` SHA256 `ad07eed287a9f08b17d369378d21aa1c490a426c49901b134c8bcc63fff5ec9b`.
- `core/topic-governance.js` SHA256 `6351726622884d9c839367dd1526ffb5fda2b49f65f0a7a1e64db61861317734`.
- `core/topic-identity.js` SHA256 `bddbc5036723b5001306890e66c4b5554b1b8ce621702e0ec2e4baa4c85945fc`.
- `core/topic-intent.js` SHA256 `eca9625982854849b5e0eb4db544ed3b4745ba4b2b67d0da787bc21d43375995`.
- `core/thought-read-index.js` SHA256 `8bbb46e17666006414157789aa1f7611e18209975f89d5320934ef57d64d0a97`.
- `core/library-search.js` SHA256 `44918b0615a63f1ea12dc05ff42b351906376799774fef76d89e9b3b1a45f737`.
- `core/browser-native-sync/core.js` SHA256 `e75e7667b08fbf763faf71bf1c8eb2743f87e97bf258f3602c721675c80cefff`.
- `core/browser-native-sync/codecs.js` SHA256 `caa10848667090c6c2cc73346fee70f8dff199b87b2916df3840d843b04bda63`.
- `core/browser-native-sync/human-library-plan.js` SHA256 `4313470f7c25f028dda2ea66568f9b5531c16f3cdbfdf47b5cb5bf1766e65afd`.
- `core/browser-native-sync/human-library-allocation.js` SHA256 `1b5584c0def8fc38241749dd3439085233aa732db5e672a6d08194512ac93d07`.
- `core/browser-native-sync/human-library-identity.js` SHA256 `9e25384e03ec6b0a467bb0b271215630af3313904b3eff4008bc99c4c8a0649d`.
- `core/browser-native-sync/human-library-codec.js` SHA256 `dbe128ee79d207d748e00ef5526aa9abe986f56b3111244a55cb2b1d13305cd3`.
- `core/browser-native-sync/human-library-journal.js` SHA256 `81594f5aff1a2e492fdc4786d068d0cbda8fcff18bcce0ee698b6569388380bc`.
- `core/browser-native-sync/human-library-request.js` SHA256 `ae308f91523137a084e9b3c13247ecc69aa3bc22b2ffce86c356f888da6f0f88`.
- `core/browser-native-sync/human-library-group.js` SHA256 `3fcbba60e0e51dbf8311575a4b44bf149d18c09c6a7693b241cab717b75d5e9c`.
- `core/browser-native-sync/human-library-scope.js` SHA256 `1f4c2128bf5fb6eb3158a4012cbcb6de372fb5338f1b49235c91a546ce1fa19b`.
- `core/browser-native-sync/publications.js` SHA256 `b77aa1985f3313f3a8b4e9a8c458bfcb94dd6a2d39a9942930f981f4d9963b49`.
- `core/browser-native-sync/segments.js` SHA256 `a0795c4d974f3a8526b3a5271c198743d02cd5cb317ba44f37defda1b5cf8369`.
- `core/browser-native-sync/group-checkpoint-plan.js` SHA256 `377191bc362272a9da28fe79314b0ef12d6c1efbedf9d589d375e32e2f7dd2f5`.
- `core/browser-native-sync/group-checkpoint-scope.js` SHA256 `6a062c890eb218f73397925b0b38e8ae7e296b4a0957204e1a44ed7d829f505a`.
- `core/browser-native-sync/group-checkpoint.js` SHA256 `096829280b4b1db2a5d371fa248360e13cb34c2488af16d743d9fd6e2acf7735`.

## Retained gates and failures

The original grouped canonical-wire attempt remains 1 PASS / 1 FAIL, and the former 107-case related run remains 106 PASS / 1 outdated unsupported-gap assertion FAIL in its owning records. The request-order correction and actual unjournaled-owner refusal retained their original assertions and failure records. This native bridge had no failed browser run or retry: its first source/release whole-file invocation passed. It does not retroactively relabel any older failure, and it does not constitute real-device/provider or complete Sync certification. Root independently approved the test-only diff before browser execution; the completed receipt remains subject to independent review.
