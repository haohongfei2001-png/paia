# SYNC-01 existing-Source Keep intent optional owner

Base `19f45dfc058c23522102df08b49982586524bd39`. This is explicit local injection only. No worker wiring, cloud/account/provider, schema, permission, CI or version changes. It is not Source creation, canonical restore, complete writer coverage or activation readiness.

## Implemented scope

`FilterIntentSyncJournal` binds the actual `SmartFilterStore.keepInput()` transaction to canonical intent and outbox together. Default null preserves the original owner. Only SHA-256 Source identity, `keep:true`, reason `restored_from_filter`, and exact ISO timestamp are admitted. Older supported-codec tables reject required filterIntent coverage; unknown reasons, false intent and legacy keys are rejected, not normalized. Input/Source body and removal state are not copied into operation payloads or rewritten.

Qualification is bounded to 16 Source keys, at most 16 snapshots per key and at most 1 Mi UTF-16 code units of Source body per key. Existing record/index identity, Source and snapshot tombstones, actual source digests, namespace and restore epoch are verified before use. Crypto runs outside IndexedDB transactions. Verified Source bodies remain transient for exact commit comparison and are discarded when Keep settles; no body proof is persisted, logged or uploaded. Commit also checks the precise Input provenance and mapped Source keys, not just Input ID or generation. Source/Working changes through the repository advance its existing backup-data-generation; same-generation raw mutation controls additionally prove the exact identity/body comparison.

Incoming operations require already-local qualified Sources and existing parents; missing ancestry is rejected, not queued or treated as restored. The same Core retains conflicting heads without overwriting local protection. Existing unmanaged local intent refuses overwrite. Duplicate arrival does not write canonical intent again. Existing repository generation advances only on actual canonical change; qualified search snapshots reject the earlier generation. Cross-page filter diagnostics now checks that same existing generation so an external receive cannot produce mixed totals. No new generation counter is introduced.

Bound edit/restore protection, legacy-intent migration and Source purge paths not yet carrying their own prepared journal are explicitly refused atomically. The `purge()` gate covers the real LibraryFoundationStore inheritance path, whose beforeSourcePurge overrides the parent hook. This temporary optional-foundation restriction is not a finished consumer deletion/editing design. Default-null paths retain original B-02 human protection and ordinary unprotected purge behavior. No deletion policy is replaced.

## Evidence and limitations

- `/tmp/filter-intent-before.log`: actual Keep saves intent without any bound portable head, FAIL before implementation.
- `/tmp/filter-intent-binding-negative.log`: two negative controls in a separate temporary source copy remove only the exact provenance/body checks, reproducing same-generation acceptance; both fail. This is a controlled regression comparison, not normal user mutation. Original working tree stayed frozen.
- `/tmp/filter-intent-owner.log` preserves initial 14 PASS / 4 FAIL: duplicate canonical rewrite, inherited purge bypass, unchanged capture not exercising legacy migration, and existing B-02 human purge protection. Implementation fixed the first two; fixtures now use actual changeRecord migration and retain B-02 rejection.
- `/tmp/filter-intent-related-final.log`: 101/101 PASS across complete Keep, smart-filter, BNS Core, ContextDesired, qualified-search and harness-owner files. Keep contributes 23 cases.
- `/tmp/filter-intent-native-first.log`: 2 parent failures retained. Original and new owner assertions ran, but strict ledger correctly rejected the additional seventh restart until its lifecycle was declared.
- `/tmp/filter-intent-native-final.log`: existing complete storage source/release file PASS, 32/32 Node cases, 19.669 seconds. Each variant retains all 15 original storage cases and 12 Prompt-conflict checks, adds the same 23 actual IndexedDB Keep checks, and preserves the previous six restarts plus one actual Keep durability restart. New three runtime hashes and case names match across variants. Source/Working snapshots, abort rollback, same-generation mutation controls, qualified search invalidation and actual filterDiagnostics effect run in native IndexedDB, not fake storage.
- Current source/release receipts are `work/qa-bns-native-storage/{source,release}.json`. All network isolation and lifecycle assertions remain enabled; native harness uses isolated profiles and release directories, explicit headless mode.
- `/tmp/filter-intent-package.log`: 12487 package guardrails, 377 runtime resources PASS. Syntax/diff checks PASS.
- Independent reviewer settings_finish ran initial complete 21 cases and reviewed the final two generation/diagnostics cases. Parent independently reviewed exact Source-binding risks. No repeated browser run was requested by reviewers.

The native receipt validator retains explicit historical compatibility by default; the current native caller passes `requiredFilterIntent:true`, requiring all three new fields. Whole harness-contract tests prove missing restart/cases/hashes cannot pass this current mode. The completed actual artifacts were revalidated after this receipt-only strengthening; no production behavior changed and no browser rerun was needed. Integration owner must pass `requiredFilterIntent:true` and require the new restart, 23-case and three-hash fields explicitly in current CI and compare both variants; this author did not edit workflows. No full canonical recovery or installed user version is claimed.

## Exact reviewed files

- `core/smart-filter-store.js` SHA-256 `fa7a274683f2e3e72271ee2729b30ec01d0c2b4758d549e183b139b358e5927d`
- `core/browser-native-sync/codecs.js` SHA-256 `bd1c20b9b7085d53f1cf814b3aa93e75f6af320f336c66681a25715f2ce27a59`
- `core/browser-native-sync/filter-intent-journal.js` SHA-256 `ce1e1b60fd6920beb22a8186507d83843cbac050a3156a3f3aae4810ecfe000d`
- `tests/browser-native-sync-filter-intent.test.mjs` SHA-256 `7619f010d28b9183482ab474a499cee9d310115726f0edb3f5430ece121160a1`
- `tests/native-sync/filter-intent-fixture.mjs` SHA-256 `24fcce600b3183982fde8fdf06f900922568efba45a04423a328aa48382802aa`
- `tests/native-sync/storage-chrome.test.mjs` SHA-256 `ff67025cd1d65eeb9a9892fbc6ea23eb3f645719b1cfcc507d8d745a09705b20`
- `tests/native-sync/receipt.mjs` SHA-256 `239ae57f9a886afa535c9ab7b338033cb06ccfa25c2b91d3f9d7133c2c34db0b`
- `tests/native-sync/harness-contract.test.mjs` SHA-256 `873b0431aa1de4179429b0c6fd620036f9c8faedc6297b8a6efd4276fcd3b661`

Receipt-only final strengthening: `/tmp/filter-intent-receipt.log` 6/6 whole harness-contract PASS; both recorded actual native receipts PASS under `requiredFilterIntent:true`. The prior browser run used the same production bytes and complete owner matrix; only validator/caller strictness and its unit tests changed afterward.
