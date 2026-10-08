# SYNC-03 optional complete Input Working receive

Base: `7b638b81`; tests below bind the uncommitted candidate byte hashes, not pristine base HEAD. No CI admission, production registration, provider, cloud, account, permission, schema, object store, or wire protocol version change.

## Scope and contract

`InputWorkingSyncJournal.logicalCommits` remains false by default. Its existing default wire publication is unchanged. The internal snapshot now reads bounded body-free Source references; opt-in descriptors bind them. New required `inputWorkingMember` wrappers carry each strict original DTO and stable original-type/entity version chain; `inputWorkingCommit` binds all exact revision references, dataset, device, Input, document, and current Source ids/keys/content hashes. Real producer publication, existing segment packing, decoding, and the explicit receiver consume these values. Frozen old readers reject every one-member publication, including members arriving before the descriptor. No assumption about descriptor ordering or adjacent device sequence grants authority.

The explicit complete-bundle receiver is injected only in tests. Generic remote receive/applyPending and checkpoint staging cannot individually materialize or acknowledge these codecs. Missing or unsupported closure is rejected without canonical/protocol writes; this batch does not durably stage partial bundles or activate complete restore. Whole-bundle validation and the existing Source/permission/namespace/restore fence precede one transaction covering canonical Input/state/history/Keep, derived filterInputs, protocol operations/heads/receipts/frontiers, and local sequence mappings. No outbox echo. A failure after canonical writes rolls all stores back. Original local protect authorization and standalone Keep receiver remain unchanged.

Historical wire operations retain original identity/value/reason/time/sequence; only local sequence/list keys are remapped. Mapping is namespace-local, not a promise of global cross-device history order. The receiver requires the full current local history collection, continuous before/after chain, and exact current owner proof. Local wrapped commits update proof in the same transaction so receive→local edit→receive works in both directions. Old complete ACK replay after later accepted edits is idempotent and cannot revert data. Limits remain 96 history rows, 128 operations, existing byte bounds; retired/missing history, referenced Inputs, Source creation/purge, incomplete closure, legacy conflicting heads, and staged full recovery are unsupported or conservatively rejected.

## Evidence

- `node --test tests/browser-native-sync-*.test.mjs`: **291/291 PASS**, 0 skipped/cancelled, 3.259383875s; `/tmp/input-working-receive-all-sync-final-bytes.log`. Includes latest Source closure, producer proof, malformed descriptor, frozen old-reader bytes. New owner 18 cases.
- Root final independent review: **18/18 PASS**, 1.0239s, `/tmp/input-working-receive-root-independent.log`; all 11 receipt hashes matched, no blocker.
- Independent reviewer: **18/18 PASS**, 754.425ms, `/tmp/input-working-receive-independent.log`; complete closure/private transaction capability, generic rejection, source/history qualification, rollback and bidirectional proof reviewed.
- Five existing smart-filter / Working revision whole files: **38/38 PASS**, 754.390667ms; `/tmp/input-working-receive-domain-final.log`.
- `python3 scripts/check_package.py`: **12703 / 383 PASS**, `/tmp/input-working-receive-package-complete.log`; diff check passed.
- Full new native file `tests/native-sync/input-working-receive-chrome.test.mjs`: **2/2 PASS**, 11.511365291s, `/tmp/input-working-receive-native-complete.log`; Chrome 154.0.8037.98, Playwright 1.63.0, headless. Each source/release executes 17 actual owner cases in a real extension service worker/IndexedDB, then complete publication→decode→receive, real worker termination/restart, exact durable snapshot equality and duplicate replay. Native IDB factory, zero intercepted requests and zero HTTP requests; paused restart network ledger retained. Seven production hashes and case names equal across variants. Existing product worker is instrumented only in temporary test copies; this is explicit module integration, not product Sync enablement.
- Native receipts: `work/qa-bns-input-working-receive/source.json`, `release.json`. Their HEAD/tree describe the base; actual runtime binding is the hashes below.

The prior assertion that the Node-only old-reader fixture change left generated browser bytes unchanged was **incorrect**. The changed `import {mkdtemp,rm,readFile}` no longer matched the compiler's old `import {mkdtemp,rm}` prefix. The generated temporary service worker retained Node builtins and failed to load. Therefore the earlier 2/2 native pass cannot certify that subsequent fixture version. Final 291 unit tests did not detect this browser compilation gap. See the 0.29 correction below. The frozen dependency files remain exact old implementation bytes validated without Git history/network.

## Preserved failures

- `/tmp/input-working-receive-before.log`: missing real producer descriptor.
- `/tmp/input-working-receive-bidirectional-before.log`: local commit did not advance owner proof; legitimate return receive rejected OWNER_CHANGED.
- `/tmp/input-working-receive-source-before.log`: same Source id/key with changed valid content snapshot was accepted; descriptor Source references now close that gap.
- `/tmp/input-working-receive-native-first.log`: fixture copied sender database migration identity, so receiver reopen failed STORAGE_FAILED. Fixture now preserves the target database migration row; production initialization unchanged.
- `/tmp/input-working-receive-native-final.log`: added malformed-descriptor case raised exact native inventory to 17 while test still expected 16. Inventory corrected to 17, no dropped case or increased budget.

## Exact final bytes

- `core/browser-native-sync/core.js`: `13f5e819d3845501d265b30dc149521b59f6e3d03efda50116f63323e1239fc4`
- `core/browser-native-sync/codecs.js`: `c5cfb0b55afc8009efa43a1c9f7768db85a08f16db2c345255cc157214723f5c`
- `core/browser-native-sync/input-working-journal.js`: `10f01b48f1a1258aac14f71fa7fa033b765829949849908bdc88e3623196c562`
- `core/browser-native-sync/input-working-commit.js`: `075f1de0913c400c203ed3a6a3650fbf26d7cbf688bff01d98ca016254fdc12a`
- `core/browser-native-sync/filter-intent-journal.js`: `9815a25b606780421719b94afa464f9eb81d3ed163ba85c424d4f8f38ce2fea1`
- `core/ia-store.js`: `a364eb78fa10cba12511f57158d96920a7023b56c4abb7b27fae615a4fbb2833`
- `core/smart-filter-store.js`: `a5bbd952bf46c053925108a39a1734ecf865d9245530d44e6a39e90bd8444565`
- `tests/browser-native-sync-input-working-receive.test.mjs`: `9564fb77b99d6f855cb3ec77d4a070120b2b575032fac46f10e6ecfa245514fd`
- `tests/native-sync/input-working-receive-fixture.mjs`: `01fa378b8f64a7a0d188e9e8cf3f5ebb56a77f48690f46252d27c1bea32806d9`
- `tests/native-sync/input-working-receive-chrome.test.mjs`: `32f34464a2c024bf75f19dbdfacd1aeba5cc1e94f27fe051c4d67608b6b6b79d`
- `tests/fixtures/input-working-old-reader/manifest.json`: `c80a9c6b64ec4c979044a8738bf7f33c683739b6b8a940cc6afedafc6979b11d`

## 0.29 fixture compilation correction

Base `5cba4470`; no production module or consent/harness/timeout change. `/tmp/029-combination-native.log` preserves the coherent batch's 45/47 result: both receive variants failed while waiting for hidden `#consent-check`. All six Sync files used the same `startNative` configuration. Actual generated fixture inspection `/tmp/029-receive-node-import-before.log` showed the unremoved Node import. Two actual compiler guard negatives failed in `/tmp/029-receive-fixture-before.log`.

The private receive compiler now removes exactly the known Node-only import line once, and rejects changed import shapes. New whole-file tests prove there are no Node imports in the generated extension module, every original production import remains, the old-reader Node case is excluded, and matrix/durable receive commands and final malformed-source case remain. No shared harness is changed.

- Compiler + strict receipt whole files: **10/10 PASS**, 60.968208ms, `/tmp/029-receive-fixture-after.log`.
- Original complete source/release receive native: **2/2 PASS**, 12.38313825s, `/tmp/029-receive-consent-native.log`; unchanged consent wait, 240000ms budget, 17 owner cases, exact durable state and worker restart, complete network proof and strict receipt validator. Successful initial worker state/identity, 17-case module execution and restart demonstrate the original module-loading failure is closed; no separate blanket console-error audit is claimed.
- Current receipts are under `work/qa-bns-input-working-receive/{source,release}.json`, with actual base HEAD/tree plus production hashes. This is the candidate working-tree fixture correction, not pristine base native evidence.
- No browser rerun of unrelated 45 passed cases and no CI/workflow edits.

Correction bytes:
- `tests/native-sync/input-working-receive-fixture.mjs`: `179e32059815a532bcc42ade29eb41f53c63e4e4dd7ce8968e8db0a91307093f`
- `tests/native-sync/input-working-receive-fixture.test.mjs`: `6e1b01b2c032ea7ad898bfd256baa944144c7eb99c87d833f2b066f9ee117995`

Root independent correction review APPROVED: exact Node-only filtering and retained runtime imports; compiler + receipt whole files **10/10 PASS**, 51.61ms.
