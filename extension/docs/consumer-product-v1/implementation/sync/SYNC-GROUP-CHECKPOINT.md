# SYNC grouped checkpoint bounded local implementation

Candidate based on design commit `fc04cfa5`, base `e7c279ae`. This receipt binds the uncommitted bytes below, not a pristine HEAD runtime. Independent final review and real IndexedDB source/release validation are pending; no production registration, provider, account, worker binding, schema or permission change.

## Implemented boundary

The explicit `grouped:{store}` checkpoint path inventories actual canonical data and admits only complete supported Source bootstrap/append, Input Working, separate Source Keep, manual Prompt/Context and desired preferences. Unsupported or unjournaled canonical data blocks construction; nonempty target blocks activation. A standalone Keep and Working on the same Input remains subject to the original owner conflict rules; this batch does not promise every mixed portfolio. AI/Thought/Topic/Section full recovery is unsupported.

The required `ownerScope` manifest extension is rejected by the real frozen old reader. All retained operations and ancestors count toward 128 unique operations / 4 MiB. Both temporary namespaces count actual encoded metadata toward two existing 4 MiB envelopes. No TTL or unseen truncation. Exact canonical inventory proves the selected scope only, not remote device completeness or signed provider truth.

Verified checkpoint items are persisted in an inventory namespace without canonical ACKs. Activation replays complete causal groups into a fresh namespace using the existing domain writers. One transaction verifies canonical scope, original live authority, graph and storage bounds, then publishes the active namespace and outcome. No Source/body writer is duplicated. Only owner-defined local history sequence mapping and restore fences differ. No-op ACK is bound to the completed restore and epoch, and preserves subsequent legitimate edits. Bounded cleanup retains the active replay and outcome.

Grouped tail reconciliation requires a same-dataset successor manifest whose parents name the prior manifest, full canonical scope proof, retained prior revisions, exact added operations and unchanged live/stage authority. The legacy Prompt-only API remains unchanged.

Producer proof is not inferred from canonical similarity: current exact revisions, all committed receipts and sequence identities, and the complete final head set are checked in the same transaction. Published outbox rows need not remain.

## Evidence and preserved failures

- Initial real journey: `/tmp/group-checkpoint-restore-before.log`, refused by old per-row Source path.
- Producer receipt negative: `/tmp/group-checkpoint-receipt-before.log`, actual `Missing expected rejection` after deleting a real committed receipt. Fixed; `/tmp/group-checkpoint-receipt-after.log` complete 16/16 passed. An earlier parser-only attempt was corrected before this actual negative and is not product evidence.
- Complete current Sync unit glob plus native fixture compiler: `/tmp/group-checkpoint-all-sync-final.log`, **388/388 PASS**, zero failed/skipped/cancelled, 7.661158291 s. Command: `node --test extension/tests/browser-native-sync-*.test.mjs extension/tests/native-sync/group-checkpoint-fixture.test.mjs`.
- Frozen exact old-reader closure: 39 files, 330522 bytes, per-file SHA and original blobs at `tests/fixtures/group-checkpoint-old-reader/manifest.json`; tests require neither historic git objects nor network.
- Scope/size/cleanup and original Source/Working/Keep/manual owner regression are included above. Original failed fixture attempts remain `/tmp/group-checkpoint-scope-first.log`, `/tmp/group-checkpoint-portfolio-first.log`, `/tmp/group-checkpoint-restore-second.log`; these are not asserted as production defects.
- Fake IndexedDB exact-128 activation measured 113.7992 ms, 2646 reads / 1160 writes in the focused run; this is instrumentation, **not browser performance or a capture SLO**.
- Native runner is prepared with the unchanged planned 240 s budget, all 20 owner cases, original runtime hashes, actual two worker restarts and full network ledger. It has **not been run**. Transport objects are re-supplied by the synthetic host after restart; this is not offline body recovery from metadata.
- `git diff --check` passed. Final package guard 13325/399 passed on these bytes: `/tmp/group-checkpoint-package-final.log`.

## Exact candidate source bytes

- `core/browser-native-sync/checkpoints.js` `106d25e7aced7a0a1da06b5b2166e48fed3833858bb98425437c866b2321d783`
- `core/browser-native-sync/filter-intent-journal.js` `1f88f091eb3038d49f1fddc417d5250c8fd882b8e94e4347fa634ae1f7bdf342`
- `core/browser-native-sync/input-working-commit.js` `605e040600e331b88707d09979fc1306dcd6d5aefbeceff9313b12da06ab1ba0`
- `core/browser-native-sync/source-append-receive.js` `6467d92d3f58867a8cfb7310bcf274a85fefd324f60e18a4250b18e17a3b6ac6`
- `core/browser-native-sync/source-bootstrap-receive.js` `746335aff261833e4e6da777618dd80f9f90b41193a91c1cdf0275cc0b1ff301`
- `core/browser-native-sync/group-checkpoint-plan.js` `526f18e933ff5b7a199041f6122da1695d17277304b0d308bb2b44185b12dc04`
- `core/browser-native-sync/group-checkpoint-scope.js` `c54318660138fb7fd176ff40da8586c40cf5e2a32122cdc3e5da5d605395a5df`
- `core/browser-native-sync/group-checkpoint.js` `aa9d310ed0c57c6cecbb5575ab4dd14845c13c140f97ec9ec18bbd23fec25c51`
- `tests/browser-native-sync-group-checkpoint-plan.test.mjs` `5280350e3433718688f79dc985318357f89006b25860ea71d992e8d42fcdc8de`
- `tests/browser-native-sync-group-checkpoint-restore.test.mjs` `a49829da6c8aea7ee006c9fa4e5f5351377121f589d60392fe53af4eda4526eb`
- `tests/browser-native-sync-group-checkpoint-old-reader.test.mjs` `f3dffad04fcce8860a568b8ae3a913d8fceba66a1d48d2df510824b3bc73bd6b`
- `tests/native-sync/group-checkpoint-fixture.mjs` `61be877c86127425615083f51006da6970b0bfb27001fec34cfdae13f6013cab`
- `tests/native-sync/group-checkpoint-fixture.test.mjs` `a46169e31225d42e25405c9fa45fc1700566e2dd34b14ea17ebcedf6e22f6b02`
- `tests/native-sync/group-checkpoint-chrome.test.mjs` `2add6fdece7095187af614be555606115787e19c31e56f30b35f9e06d2e05526`

## Final publication await review correction

Root identified that the final transport await was followed only by authority validation. Actual `updateDocument`, unbound manual Prompt and Context changes already reject through generation (`/tmp/group-checkpoint-post-put-owner-before.log`, 3/3 before fix); this is not claimed as a reproduced domain-write bug. A protocol receipt deletion during that exact await did reproduce missing rejection (`/tmp/group-checkpoint-post-put-proof-before.log`). Direct document transaction also rejected `BNS_SNAPSHOT_CHANGED`; its initially over-specific expected code was diagnostic, not evidence of stale acceptance. Final same-transaction validation now repeats both exact committed plan and canonical scope after transport completion. The initial document probe had a wrong snapshot fixture path (`/tmp/group-checkpoint-post-put-before.log`), corrected before the real owner probe.

Current runtime complete related regression: `/tmp/group-checkpoint-post-put-final.log`, 392/392 PASS, zero skipped/cancelled, 6.242298834 s. The final test-only cleanup was then verified by the complete restore+compiler files, 21/21 PASS `/tmp/group-checkpoint-post-put-owner-final.log` (20 owner cases + compiler). Final package guard is `/tmp/group-checkpoint-post-put-package.log`. No native run yet; budget unchanged.

## Independent review

Root and root_finish approved the final candidate. Independent four whole files: 32/32 PASS, 3998.698125 ms, `/tmp/group-checkpoint-independent-fixed.log`; all 14 receipt hashes and 39 frozen reader original Git bytes verified. Final transport fence and preserved negative verified. Approval is code/unit scope; native remains pending until the exact committed run.

## Native first attempt and fixture correction

Exact `aa33e0cc` source/release both failed before domain execution at the original 30 s consent visibility precondition (`/tmp/group-checkpoint-native-committed.log`). Generated-module `node --check` identified duplicate `const canonical`: the shared assertion bridge and owning test's canonical-row snapshot helper collided. No recovery case had run. Only the new compiler's owner-local helper name is isolated as `groupCanonicalRows`; actual case names, all assertions, runtime imports, consent and 240 s budgets are retained. A first broad identifier replacement also changed a test-title string and was rejected by the existing exact-name guard; it was narrowed to the declaration and await-call syntax. Actual generated-module syntax plus full compiler guard now pass 1/1 (`/tmp/group-checkpoint-compiler-fixed-final.log`). Production modules unchanged. Final exact-commit native remains pending.

## Exact committed native result

Tested HEAD `e16086cb73dc6c0331085532ef08912c4f1212bd`, tree `9f584242c380ca024df27cceba140313d25a3189`: complete headless source/release **2/2 PASS**, 21.585159584 s, `/tmp/group-checkpoint-native-fixture-fixed.log`. Each variant completed the exact same 20 cases and 29 production-file hashes, two actual worker restarts, strict complete paused/lifetime network ledger, zero network attempts and HTTP requests. Generation module repair was independently approved by Root before this run. The original failed run remains evidence of the fixture defect, not a passed restore run.

Real IndexedDB 128-operation activation: source 150.4 ms, release 155.4 ms, each 2646 reads / 1160 writes. This synthetic local measurement is not a device-independent latency guarantee. Transport objects are held by the synthetic host and re-provided after restart; no offline metadata-body restoration or production worker registration is claimed. Source/release code was identical; no cloud/account/provider was enabled.

- `extension/work/qa-bns-group-checkpoint/source.json` SHA256 `02e98d75823324e89d5271cfc04cabe1344613f70378250338bb27e6860aabdc`
- `extension/work/qa-bns-group-checkpoint/release.json` SHA256 `52f3cb9c31f3ae7af0495936c9bbc92c127adc23614cec376bee0874da4accfc`
