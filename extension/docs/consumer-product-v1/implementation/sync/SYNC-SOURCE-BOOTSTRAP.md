# SYNC01 optional initial Source bootstrap — local implementation receipt

Implementation based on independently reviewed design `23d6fe4f9a54db57d9208fa6f71bd1dac1e945d4` (runtime base coordinated 0.30 `1700f9bf432cecd7597adcadb4a1a2b98e2678e6`). This slice is separate from the frozen 0.30 candidate. Default binding is null; no worker/provider/account/permission/schema/CI/version activation.

## Implemented scope

One actual initial ChatGPT capture, new Source/new conversation, no existing parent or human edits. A constructor-injected SourceBootstrapJournal is consumed by the existing capture owner; shared pure initial formation is also used by ordinary capture/defaultBlock. It captures actual control/restore/namespace and counters, derives the exact baseline via the existing revision planner, validates the six-member closure, and commits canonical/index/initial conservative filter rows and seven protocol operations in one transaction. No global clock/UUID changes, post-write baseline repair, or copied recipient canonical fixture.

Each Source/time ledger/document/Input/state/baseline member is a required `sourceBootstrapMember` v1 operation; the complete `sourceBootstrapCommit` v1 seals exact member IDs/digests/dataset/device. Protocol remains 1; old Source codec is unchanged. Actual one-operation publications/segments prove the frozen historical reader refuses **every** cut, including members before the descriptor. Payload still obeys existing text/codec/batch/segment limits; six-member count is not a payload capacity claim.

The explicit complete receiver validates Source identity/digest, initial document/Input values, exact baseline, and the initial Source time ledger/arbitration. Those time checks establish internal consistency, not provider-signed authenticity. A same-transaction private Core capability permits only the complete new family; generic receive, applyPending and checkpoint materialization refuse it. Source/current consent/exclusions/tombstones/restore/namespace are rechecked. Canonical/index writes and receipts/frontiers are atomic with remote origin and no echo. Verification after existing document/index refresh checks the actual canonical closure.

Only local physical record/document/block/Input-delta/history counters are allocated anew. The immutable wire baseline ID/at/windowStartedAt/before/after remain exact; local history sequence/list tuples are remapped. Real A capture→publication/decode→empty B→A Working edit→B Working edit→A and the B-first-edit branch both pass using existing Working journal/receiver; no fabricated Working head/history proof is created by bootstrap.

Exact acknowledged remote replay is qualified by current receipt, Source/baseline presence and deletion/restore/namespace fences; it does not overwrite later legitimate Working edits. A new capture request after an already committed capture is **refused**, not reconciled as an ACK. Capture DTO has no durable operation ID; this slice makes no cross-process capture caller retry promise. Durable outbox publication and complete remote replay retain their real operation identities.

Unsupported enrich/multi-message/existing-conversation/mixed initial scope refuses without half writes. This is not full new-device recovery, official import, Source enrichment, arbitrary checkpoint activation, account sync, or default production availability. Existing initial remote rows keep conservative unknown local filtering; no classifier/AI/Keep authority is imported.

## Evidence and retained failures

- Actual pre-implementation owner negative: `/tmp/source-bootstrap-before.log`, canonical capture succeeded with 0 portable operations while 7 were required. This was a product gap, not a fixture failure.
- First real chain 4/4: `/tmp/source-bootstrap-first-chain.log`; subsequent 13 boundary cases passed in `/tmp/source-bootstrap-boundaries.log`.
- `/tmp/source-bootstrap-owner-final.log` retains three intermediate failures: deleted-source replay passed undefined to canonical equality (fixed by explicit presence rejection), an initially incorrect generic error-code expectation (now exact typed bootstrap code), and enrichment fixture's illegal title field (fixed to the actual allowed DTO). No production assertion/timeout weakened.
- Current complete owning file: all 24 owning cases PASS as part of `/tmp/source-bootstrap-final-related.log` (the earlier isolated 24/24 log predates the final timeChanged assertion). Default-null capture/enrich, all-store rollback, first-await restore/namespace/permission, immutable Source deletion replay, member mixing and malformed descriptor/field typed rejection covered.
- Full related units: 376/376 PASS, 0 fail/skip/cancel, 3.869426208s in `/tmp/source-bootstrap-final-related.log`: every `browser-native-sync-*.test.mjs`, full capture-foundation/ia-foundation/enrichment files, and native compiler guard. Package guard: 12971 checks / 390 runtime resources PASS `/tmp/source-bootstrap-final-package.log`.
- Diagnostic dirty-tree native: original new wholefile source/release 2/2 PASS, 13.711321708s `/tmp/source-bootstrap-native-first.log`; each variant 19 actual-owner cases (the frozen old-reader filesystem case stays in Node) plus a true worker stop/restart, exact baseline/Source replay and no echo. Thirteen runtime hashes matched the then-current files and between variants. The subsequent ledger qualification and producer diagnostics changes mean this diagnostic PASS is not reused as current-runtime browser acceptance. Whole network ledger including paused-before-stop: 0 HTTP / 0 attempted network. These first receipts identify **base HEAD/tree plus the explicit dirty runtime hashes**, not a pristine base-commit result; preserved under `extension/work/qa-bns-source-bootstrap/diagnostic-dirty/`.
- The module is imported into an isolated synthetic test extension worker. This is real worker IndexedDB and lifetime evidence, **not production worker registration**. Node retains the actual published operations to re-supply after the restart; this is replay against persistent recipient rows, not offline transport recovery or a persisted complete body inbox.
- Additional actual checkpoint→stage refuses the required bootstrap family and activation remains NOT_READY with live canonical unchanged. A deliberately altered existing refresh owner is caught by exact post-write verification and rolls back the whole closure.
- `/tmp/source-bootstrap-time-ledger-before.log` retains a real missing-rejection defect: a resealed ledger could alter createTime while keeping its response candidate/Source unchanged. The new initial-codec qualification now binds those fields exactly and rejects fabricated empty/historical-conflict ledgers; actual initial DOM/response conflict and blocked evidence remain accepted, preserving unknown time.
- `/tmp/source-bootstrap-diagnostics-before.log` retains a bound-producer gap (missing ingestion diagnostics). The existing saveControl owner now receives the same single-capture success fields in the canonical/outbox transaction; the real applySourceTime boolean is returned, including unknown-time first observations. Remote receipt materialization never reports a local capture scan.
- Independent reviewer found a real initial-order gap: resealed Source conversationOrder could differ from pageOrder while all shared initial document/Input formation remained identical. `/tmp/source-bootstrap-order-before.log` preserves Missing rejection; the required initial codec now enforces positive pageOrder and exact conversationOrder equality. The existing closure case contains that negative, without changing the final 23 native names. `/tmp/source-bootstrap-order-after.log` contains 24/24 owning PASS.
- Independent reviewer also found producer-shape gaps. `/tmp/source-bootstrap-capture-shape-before.log` records five complete, rehashed and resealed impossible captures accepted (empty/oversize body, oversize title/order, invalid message ID). The new codec now calls the existing validateCapture purely for shape/limits, preserving the actual canonical URL/title, including a positive actual `/g/.../c/...` capture; it grants no authority. Every negative now refuses with all stores unchanged.
- Final independent review **APPROVED** by root_finish: actual complete owner+compiler 25/25 PASS, 1508.902375ms, `/tmp/source-bootstrap-independent-closure.log`; diff check PASS. This closes the actual order and capture-shape gaps without changing the final 23 native case names or 13 dependency paths.
- Final committed-runtime native is pending this checkpoint. One source/release wholefile run will bind receipts to the immutable runtime HEAD/tree; the diagnostic 19-case result remains historical and is not final acceptance.

## Exact current source bytes

| File | SHA-256 |
|---|---|
| `core/indexed-store.js` | `99b5c54ba7ad2f4e32771cfd7443c42975e72843a61f02922f2586a19bb81303` |
| `core/ia-store.js` | `bad554697e4059d08c6c702f6aa641144b37a7ad7d00cff78846539947141eda` |
| `core/source-initial.js` | `9b7328b5f38aeacda4233eaa20cf40cccbebcca3fcca0a339f4e9ba7b5e175f8` |
| `core/browser-native-sync/core.js` | `d305c53eaa302682ecf0408a163ebe809382da91eb6180b7264f8613e334723c` |
| `core/browser-native-sync/codecs.js` | `f319ef3d8834fa184d719f185c14c5e5921f3dc52cc186de14d144d8ad4fb05c` |
| `core/browser-native-sync/source-bootstrap-codec.js` | `875cedf28ddf6559c73510b5e1d40101b9f0b1f8f099c0175acdf32125e46bfb` |
| `core/browser-native-sync/source-bootstrap-plan.js` | `9bb2770752f4899340d229d3a2de3f72fdbf767a9e7ea2bee6ef4aea603b2f06` |
| `core/browser-native-sync/source-bootstrap-journal.js` | `fdc94ed658e7c93db13476fae0e4813868d8cb40a0c4cf7d418cff6ac7f3d308` |
| `core/browser-native-sync/source-bootstrap-receive.js` | `abcd1c0bd0f87747e98d7f612030aac31285a48a8cc7c89fe62c96856ddaea9d` |
| `core/browser-native-sync/input-working-journal.js` | `10f01b48f1a1258aac14f71fa7fa033b765829949849908bdc88e3623196c562` |
| `core/browser-native-sync/input-working-commit.js` | `cfd7f982152c9e4bd0fb2475b95743cc3d8395f21e7810e57d649b9353419714` |
| `core/browser-native-sync/filter-intent-journal.js` | `9815a25b606780421719b94afa464f9eb81d3ed163ba85c424d4f8f38ce2fea1` |
| `core/smart-filter-store.js` | `a5bbd952bf46c053925108a39a1734ecf865d9245530d44e6a39e90bd8444565` |
| `tests/browser-native-sync-source-bootstrap.test.mjs` | `e882895fb0b46ba506810645c0bb305b1208cceac0d5a0983c92275340570837` |
| `tests/native-sync/source-bootstrap-fixture.mjs` | `e7f91862e42b70cfbe517bf99048870e8d7bd5ac53637f0e0ec4969e3df3ab38` |
| `tests/native-sync/source-bootstrap-fixture.test.mjs` | `e4890dcc940dfb1ec8c2a21ea6a227817ba3ea5634e2a55f8923831836ff8d87` |
| `tests/native-sync/source-bootstrap-chrome.test.mjs` | `40637bd15d7dfccbfb4bd546760c3ec91f2817038994290a60998a7902117942` |
