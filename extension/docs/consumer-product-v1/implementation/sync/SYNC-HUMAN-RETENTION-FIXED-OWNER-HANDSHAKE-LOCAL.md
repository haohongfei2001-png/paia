# Human retention fixed owner handshake — local component

## Scope and implementation

Base: `04ff88b8080f3fcc083f5226f99bfd1516858f7c` (minimum active Transaction data-method guard). Code commit: `2672525a01508803290ae31295ba9cbf30695c7f`, tree `64cb9c91f7b84864ca7901259715022b34f25eba`.

Design: external `work/RETENTION_FIXED_OWNER_HANDSHAKE_DESIGN_20261009.md`, SHA-256 `840ae7f1893d61d4cfe5bacb1b5ec6e4808a3f6f6d9708523c1dac9d0d03ca74`; Root and independent design approvals preceded implementation. This is a private active-phase component, not the outstanding positive-effect / closing-readback implementation.

Plan previously delegated validation-phase authority to replaceable public `core.requireHumanRetentionTransaction`. Plan now imports and invokes the fixed `requireHumanRetentionOwnerPhase` binding from the original Core module. The existing sole proof WeakMap is module-private, with its previous creation, phase transitions and cleanup unchanged. The exported assertion returns only `undefined` or an error; it cannot mint, reveal or alter proofs. The public method delegates for compatibility. The assertion preserves original exact Core / wrapper / retention / group / Repository / database / namespace / readwrite / validate checks, explicitly requires native scope, and calls the original active Transaction data-method guard.

Core and Plan already imported one another. Only a named binding on that existing edge was added; the assertion is invoked inside the Plan function after module initialization. No top-level call, registration callback, constructor property trust, new module, raw reader or row export was added.

## Preserved owners and fixtures

Repository runtime is byte-identical to the base: `core/idb-repository.js` SHA-256 `eec1aa35e435a799b1ead08d0c01faab55cd7ed7c3faa12727cabdd87cfca698`. Core's ordinary `get` and `put` lines are byte-identical. Static module-edge inventories of both changed owners are unchanged.

Both original native fixture files retain exact bytes and their 27 cases:

- `tests/native-sync/fixtures/retention-original/human-sibling-retention.source.mjs`: `178acc01ccf8ef2c4cf86a9e1a2692859a3b83419dddaafedfd07d52de32fa42`.
- `tests/native-sync/fixtures/retention-original/human-retention-repository-owner.source.mjs`: `801c2ac3efdb7deee7c8da55605d281a3efc2efb6f0fa518ceed99c0062f6224`.

The fourth existing dispatch VM test now extracts the actual unique lexical map declaration from Core source. It still extracts the original retention method and original Repository helper / Transaction owner, and retains all three original error / cleanup / close assertions. There is no replacement map initializer or new authorization stub. Its other three cases are unchanged.

## New tests and evidence limits

`tests/native-sync/retention-owner-phase-contract.test.mjs` contains three cases:

1. Isolated execution of the exact original assertion, original public delegate, original Repository helpers and exact map declaration checks validate acceptance and opening / apply / closing / absent refusal with the same fixture group identity.
2. That isolated predicate refuses mismatched exact identities, alias / Proxy / cloned handle, active data-method mutation, settled scope, nonnative scope and readonly scope.
3. Actual imported Core / Plan and actual synthetic nonnative Repository construct a real claimed Plan. Replacing the public method with a no-op cannot bypass the fixed Plan check in an unrelated transaction; it refuses before dependent reads and never invokes that public replacement. Original handle cleanup runs.

The isolated predicate deliberately supplies its own VM record and is **not native authority or commit evidence**. The imported Plan test uses nonnative IndexedDB only for refusal. It makes no claim that a wrong or unavailable group proves the real opening phase, and adds no production proof accessor. Real native success / duplicate / fault cases remain a required later verification on this new runtime.

## Executed local checks

Node version: `v22.23.3`. The following seven complete files ran together with unchanged defaults:

```
tests/native-sync/retention-owner-phase-contract.test.mjs
tests/native-sync/retention-dispatch-contract.test.mjs
tests/retention-data-method-provenance.test.mjs
tests/human-retention-nonnative-refusal.test.mjs
tests/browser-native-sync-core.test.mjs
tests/browser-native-sync-human-library-group.test.mjs
tests/browser-native-sync-human-library-journal.test.mjs
```

Result: **68/68 PASS**, zero failure / skipped / cancelled, 2116.589167 ms. Log `/tmp/retention-fixed-owner-node.log`, SHA-256 `b8aca7fad5b07616e0f5c2a5d9fa54123de39662ecf43ff07b862db891990c4a`. These ran on the exact four code/test file bytes then committed as `2672525a`; no change to those files followed the run.

Earlier exploratory two-file run: 7/7 PASS, 224.820334 ms; retained `/tmp/retention-owner-phase-initial.log`, SHA-256 `03f1c1960fc3ff8f5559829cf2ae3c96252e4f9bc2c48333625db35b27eff313`. One subsequently removed unused test helper changes that test's bytes; this earlier run is not current exact-file evidence and is not added to the 68 count.

One standard generated-release build: 436 files, 13886 package checks over 412 runtime resources, product guard PASS, version `0.42.0`, reused `false`. Log `/tmp/retention-fixed-owner-build.log`, SHA-256 `a2989560070d2142354e5b07a2d884bbb1d35ed26db433c6adeeed4169c15de1`. No package, manifest, CI or version edit.

Both actual source and generated-release Core / Plan modules imported successfully under Node22, with the fixed export, public delegate and Plan entry available. Log `/tmp/retention-fixed-owner-import.log`, SHA-256 `79d34f8d21a7f8b9422bfabe4270e58f7f3ffa3b2fddc330708200aeebe3d1bd`. This proves ESM initialization, not a browser journey.

Static source preservation report `/tmp/retention-fixed-owner-static-check.json`, SHA-256 `0785ddab0fd9b9c43b9e3dbed31989f73d26310e30915b7b75ca08442ad96a6e` records unchanged Repository, both original fixtures, ordinary Core methods and import edges.

## Current status

Code and local checks complete; independent code review pending. **No new native/browser run, Full CI, merge, installed delivery or user-visible capability is claimed.** Broader persisted-effect completeness, closing-phase semantic verification and pre-native-clone allocation bounds remain unresolved and are not waived by this component. No cloud, provider, account, paid call, canonical body writer or permission change was added.

## Subsequent independent review and bounded native evidence

This section supersedes only the preceding pending-review / no-native-run status. It does not supersede the outstanding effect, closing or resource boundaries.

Independent finite CODE/EVIDENCE review of frozen `5065b3d6d2eb09887ef869fe8ac046754b95e5d9` / tree `e60e358cbd249e495dc2d0ed00bacf5c38fff56a`: **APPROVE**, no actionable finding within this active-phase component. Report `/tmp/RETENTION_FIXED_OWNER_HANDSHAKE_CODE_REVIEW_20261009.md`, SHA-256 `ec6b4f47edb4c7db1509272b53f5f4f4e541e96d846077115640b4bdfadcc1a3`. The reviewer independently ran the same seven complete Node22 files: **68/68 PASS**, zero failure / skipped / cancelled / todo, 1870.184125 ms; log `/tmp/retention-fixed-owner-independent-node22.log`, SHA-256 `b35e30a715bc8c6a9e5dd73169f000db49a0ae1b9df679ba9a6a3210e009cbd9`.

Root reviewed and executed the external source-only script `work/retention-fixed-owner-native-probe-20261009.mjs`, SHA-256 `29ab070e11f1444acf5426a0cb06174aa49c3d4cf25f4cc28dcff94d9a3aae2a`, against the same frozen `5065b3d6` identity. First launch failed before any case: `Chrome CDP port did not become ready`, **0 cases executed**, not a test pass. That startup failure remains in `work/RETENTION_FIXED_OWNER_NATIVE_STARTUP_FAILURE_20261009`; log SHA-256 `306a460f7f09b72debefa584c7a67058a0f65eed093b66475cf0d1b7a865d520`, JSON SHA-256 `aa14de78f614b6ebb1f55d5f7458eb70e11563d29fe4fd5bc9eccf725520f5b4`.

After the approved isolated headless execution environment correction, the unchanged script on the unchanged source passed **3/3 cases, 57 assertions** in real Chrome `154.0.8037.99`:

| Source-only case | Result |
| --- | --- |
| Original retention case 0: first complete sibling, canonical-write / echo protection and write-free exact retry | 27 assertions PASS |
| Genuine claimed Plan in unrelated genuine native transaction with no-op public phase method; subsequent genuine retention and exact duplicate under the same no-op | 22 assertions PASS; unrelated call refused before dependent reads / writes; reads `0`, writes `0`, public calls `0`; successful retention has all 4 receipts; duplicate leaves durable snapshot unchanged |
| Original archived method-suppression scenario, retained byte-for-byte | 8 assertions PASS; required `BNS_HUMAN_RETENTION_REQUIRED`, no success result, intercepted writes `0`, all 4 incoming receipts absent |

Fresh source proof before and after matched exactly: **187 runtime hashes, 23 proof hashes**, same HEAD / tree. Copied runtime bytes and the explicitly supplemented generated fixture hashes also matched. The complete opened/final network ledger recorded **0 network attempts and 0 HTTP requests**. Only temporary generated test fixtures received the supplemental cases; original source / native fixture files were unchanged.

Successful immutable artifact directory: `work/RETENTION_FIXED_OWNER_NATIVE_AFTER_20261009`. Log `/tmp/retention-fixed-owner-native-5065.log`, SHA-256 `f3838f5574aa63ba754468d3eb899ea119893d86033a1d832162fc248388e3c4`; JSON `/tmp/retention-fixed-owner-native-5065.json`, SHA-256 `813fd73aed0408d5f9f4955d2f7265831b9935ea2116da93be819a3da5924202`.

This is a **three-case source-only supplement**, not a rerun of all 27 original cases, not source-plus-release native certification, not Full CI, and not a merge or installed delivery. Complete persisted-effect verification, closing-phase semantic verification and pre-native-clone allocation bounds remain unresolved. Later Core method-integrity proposals or counterexamples are separate work; this receipt does not certify them.
