# SYNC-01 optional existing-conversation Source append

Base: `c6492298` (031 candidate, not installed-version evidence). Design: `67ad80fb`. Implementation checkpoint: `ba2bcaee26c51450b465326f8ebb24a400f7ac26`, tree `d01c48a068e8d0696c1bb4ad4c8da7a182837687`; immutable runtime/test bytes tested below. Default journal null; no provider, worker registration, checkpoint activation, schema, permission, CI or version change. Not full recovery.

## Implemented local boundary

A real optional capture adds exactly one absent ChatGPT message to the same stable already-bootstrapped document. Five new required member wrappers and an exact descriptor bind new Source/time/Input/state/baseline to a fully committed initial anchor. Both local and remote anchor qualification require all seven initial revision/head/receipt/sequence proofs in the current namespace and actual canonical Source/baseline/time/document. Published outbox removal is allowed; an outbox-only or retained-history-only claim is insufficient. Original Source removal conservatively refuses even with another Input retaining the document.

The new Input is formed by the unchanged initial validator with only its verified document binding translated. A private baseline writer shared internally by initial/append capabilities preserves baseline IDs/times while remapping local history indices. The original initial capability remains required. No full document crosses the append wire; existing refreshDoc derives aggregate fields, and all other document fields are explicitly checked unchanged. Actual human updateDocument title, old Input note/history and bilateral Working updates are tested; no new document-note field or UI is introduced.

Distinct new Source keys append independently. Conflicting same identity, missing references, unsupported anchors and partial protocol proof refuse; no silent conflict winner. Full canonical+outbox or canonical+receipt/frontier commit is atomic. Generic remote/applyPending remains forbidden for the new family. Unknown local capture ACK is not reconciled by a new request: the duplicate request refuses, durable publication retains original operations, and remote exact replay preserves later Working changes. Restarts do not imply offline transport availability.

## Evidence so far

- Original actual second-capture negative: `/tmp/source-append-before.log`, BNS_SOURCE_BOOTSTRAP_UNAVAILABLE, retained.
- First implementation snapshot comparison failed on local `-0` derived index values (`/tmp/source-append-first.log`). Dedicated structural local snapshot comparison now preserves Object.is semantics; wire canonical restrictions are unchanged.
- Original bootstrap duplicate capture code regression retained in `/tmp/source-append-initial-regression.log`; original assertions preserved and original error restored.
- Intermediate boundary logs retained: `/tmp/source-append-own-expanded.log` (fixture incorrectly expected underlying injected error rather than existing STORAGE_FAILED wrapper); `/tmp/source-append-boundaries.log` / `-fixed.log` (random operation ordering fixture and wrong synthetic epoch/permission API). Corrected to actual owner paths, not treated as product race evidence.
- Current whole owning file:19/19; independent owner+compiler20/20 PASS2.5082s, `/tmp/source-append-independent-final.log`.
- Complete related whole files:396/396 PASS, 0fail/skip/cancel, `/tmp/source-append-related-final.log`,5.282532083s. Command: `node --test extension/tests/browser-native-sync-*.test.mjs extension/tests/capture-foundation.test.mjs extension/tests/ia-foundation.test.mjs extension/tests/enrichment.test.mjs extension/tests/native-sync/source-append-fixture.test.mjs`.
- Package:13187 guardrails/396 runtime resources PASS, `/tmp/source-append-package-final.log`.
- Native exact implementation HEAD:2/2 PASS,20.03544475s, `/tmp/source-append-native-committed.log`. Source7.593631833s/release7.4262025s; each18 actual-owner cases (the frozen-reader filesystem case stays Node) plus actual durable receiver worker restart and exact operation replay. Command under explicit PW1.63/headless: `node --test tests/native-sync/source-append-chrome.test.mjs`.

## Independent review

root_finish independently APPROVED the final code and actually ran whole owner+compiler20/20; Runtime/test diff whitespace check passed. The scoped staged check later noted existing trailing blank lines in the frozen reader’s source-structure-backup.js and source-structure-model.js; these remain byte-exact to their original Git blobs rather than being reformatted. No claim of an entirely warning-free frozen-fixture diff is made. Review found a real earliest-dispatch race: `/tmp/source-append-dispatch-before.log` recorded Missing expected rejection after the first read returned and a controlled valid namespace was swapped. The first transaction now captures authority and dispatch count together; the child uses the original authority, never a freshly rebound baseline. The negative now rejects with exact all-store preservation, and original bootstrap regression remains intact. The valid alternate namespace in this adversarial fixture is deliberately prepared protocol metadata; it is not proof of supported checkpoint activation.

## Actual old-reader evidence

`tests/fixtures/source-append-old-reader/manifest.json` freezes exact c649 Core/segments relative import closure:37 files,304473 bytes, each SHA256 and Git blob hash. Original package.json remains, no network or historical Git object needed at test execution. The actual old reader rejects every emitted new member and descriptor, including real one-operation publications of a70KB body crossing the64KB target. Required codec rejection is not simulated by deleting new registry keys. This proves local reader compatibility refusal, not account/provider compatibility.

## Byte binding before independent review

```json
{
  "core/indexed-store.js": "c9da0212e92fff0bdc053e240f3ef865ac8095d183432ebb9027c672153d21e0",
  "core/ia-store.js": "c17f415cca6008006a186420440c89d4aa6eacd3e91a9b200334cc201af37056",
  "core/source-initial.js": "9b7328b5f38aeacda4233eaa20cf40cccbebcca3fcca0a339f4e9ba7b5e175f8",
  "core/browser-native-sync/core.js": "244afcc1610a746fc2f7b8daa9e6a676d765952b2288b47ad91917bbac0812c1",
  "core/browser-native-sync/codecs.js": "7752dc55ba039a35e1171de0aa5dae09bf8e7bc146db078d75b43e0d13ce774d",
  "core/browser-native-sync/source-bootstrap-codec.js": "875cedf28ddf6559c73510b5e1d40101b9f0b1f8f099c0175acdf32125e46bfb",
  "core/browser-native-sync/source-bootstrap-plan.js": "9bb2770752f4899340d229d3a2de3f72fdbf767a9e7ea2bee6ef4aea603b2f06",
  "core/browser-native-sync/source-bootstrap-journal.js": "0c1501e90e153a4c6be872eb4966326a1be85220a0c7cc89f41980517b6bcef7",
  "core/browser-native-sync/source-bootstrap-receive.js": "abcd1c0bd0f87747e98d7f612030aac31285a48a8cc7c89fe62c96856ddaea9d",
  "core/browser-native-sync/source-append-codec.js": "f718119efe6f66e143664c3961eccbfe3a1dd7af38b5913611029f0f21af3b2d",
  "core/browser-native-sync/source-append-plan.js": "b61b700a8801d94694b894daedf24da8ee11cedca1ad28643ad1f85f2dfea105",
  "core/browser-native-sync/source-append-journal.js": "db96b0ece00813f166c50fecf2480ec31335c8a3e9e800a7576bccec68052543",
  "core/browser-native-sync/source-append-receive.js": "5482054225d9f1787f342cfd6cf8e8afaf65713a87235eb7e4c5b76a78d5f11d",
  "core/browser-native-sync/input-working-journal.js": "10f01b48f1a1258aac14f71fa7fa033b765829949849908bdc88e3623196c562",
  "core/browser-native-sync/input-working-commit.js": "cfd7f982152c9e4bd0fb2475b95743cc3d8395f21e7810e57d649b9353419714",
  "core/browser-native-sync/filter-intent-journal.js": "9815a25b606780421719b94afa464f9eb81d3ed163ba85c424d4f8f38ce2fea1",
  "core/smart-filter-store.js": "a5bbd952bf46c053925108a39a1734ecf865d9245530d44e6a39e90bd8444565",
  "tests/browser-native-sync-source-append.test.mjs": "373b5deeec45a411ee5203ce310f05be4675a127bcde83450e7fef4f074eccab",
  "tests/native-sync/source-append-fixture.mjs": "69c5d78d9968d282c7af85af07022b5735ffad10d4d846f4122933b8d85f56a0",
  "tests/native-sync/source-append-fixture.test.mjs": "8bc4eba663a582178916929891258ae280c324882c3665832399d2e4e2531407",
  "tests/native-sync/source-append-chrome.test.mjs": "f1b1a203d0caca325d1b50fd7756a11768959f5731b94dd5630c635c4dc9fbc0"
}
```

## Exact native artifacts and limits

Both receipts record the implementation HEAD/tree above, scope `optional-local-existing-ChatGPT-conversation-Source-append`, productionActivation=false, remoteMaterializer=true, fullRecovery=false. Each has the same18 names and17 runtime dependency hashes, all checked against this checkout. Every current dependency also matches the pre-native SHA block above. The receiver’s real service-worker lifetime changes, full network ledger includes the paused boundary and both lifetimes, and records zero attempts/HTTP requests.

The harness imports the explicit local receiver into a synthetic worker; no product worker registration is changed. The Node test controller keeps synthetic published operations and supplies them again after receiver restart; this is not offline/cloud transport recovery or a promise of public capture-request ACK reconstruction. Initial bootstrap and all existing native files remain unchanged; this run is the new complete append file, not the full product gate. Root owns later coherent integration/admission.

Artifact hashes:
```json
{
  "extension/work/qa-bns-source-append/source.json": "352fb8b2d021fca64477afdb49afc14c3c69b75c441244d6cc1ecea26a256cc2",
  "extension/work/qa-bns-source-append/release.json": "e72d0885c2b3aa1e69e79f4564552260d040f80f95a4009d94c9315420f9d5c1"
}
```
