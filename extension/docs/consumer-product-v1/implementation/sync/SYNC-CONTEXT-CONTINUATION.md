# SYNC manual Context incremental validation

Local candidate from `0e7bb4e44d4e1b7d0b30366504379196e1ac773f`. Scope: existing optional Info/Rules/Now materializers only. No worker injection, account, cloud, schema, permission, CI or version change; no full canonical restore claim.

## Defect and owner contract

The actual ContextCardsService can legitimately edit one Item more than 128 times. The old receiver rechecked the entire chain on every arrival and refused revision129 even after successfully materializing each preceding revision. The new actual 130-change/receive unit failed with `BNS_CONTEXT_ANCESTRY_LIMIT` before the fix (`/tmp/context-continuation-before.log`).

After successful canonical materialization, the same transaction records the existing Core materialized-owner proof and a namespace-local `contextValidation` companion identifying its exact revision and strict local restore epoch. Only a single matching previous head, the exact current local Item/value/revision and matching epoch allow that verified operation to stop subsequent bounded suffix validation. Each new transition still passes the existing delete/restore/type/revision checks. The 128 bound is unchanged. Proof failure or write failure rolls back canonical state and protocol effects together.

`readRestoreEpoch` is extracted from the existing Prompt journal validation without changing JournalRestoreFence's changed/unbound behavior. An initial remote materialization under a nonnull epoch establishes its own Context proof; it does not manufacture a previously bound journal epoch or relax the old UNBOUND guard. Stage/checkpoint namespaces cannot borrow a live namespace proof, and long previously unmaterialized chains still refuse.

A second actual counterexample exposed an overstrict first implementation: receive A → journaled local B edit → remote descendant could leave a valid but older proof. `/tmp/context-continuation-local-before.log` records the failure. Such an older proof now supplies no shortcut: the existing full bounded chain and exact previousVersions/local owner checks decide acceptance. Structural/epoch invalidity still refuses. A long local-only chain without a new exact materialized anchor remains conservatively bounded; this batch does not promise universal history compaction or long-chain checkpoint restoration.

The old test that expected already-materialized revision129 to fail was replaced by stronger unknown-chain admission evidence: 128 protocol-only revisions with no canonical materialization do not provide an anchor, and revision129 still rejects atomically. Existing manual edit, restore, purge and invalid lineage protections remain.

## Verification

- Five complete related owning files **86/86 PASS**, `/tmp/context-continuation-unit-all-final.log`: context-info, context-manual, restore-epoch, checkpoints, prompt. Includes actual130, exact proof/local/epoch failures, first nonnull epoch, new namespace, failed proof-write rollback, invalid soft delete and bidirectional journaled local/remote edit.
- Complete existing Context native source/release **2/2 PASS**, 22.762326417 seconds, `/tmp/context-continuation-native-final.log`. Each retains all **68 owner matrix cases**, original two worker restarts and zero-network ledger. A third real worker restart separates 129 consecutive actual service-write/receive transitions for each Info/Rules/Now card from successful revision130. All three lifetimes transitions are checked by existing lifecycle and complete network-ledger oracles. Release remains private temporary output; original120s per-case budget unchanged.
- Earlier native2/2 `/tmp/context-continuation-native.log` predates the bidirectional fallback and is historical only. Earlier three obsolete129 assertions failed in `/tmp/context-continuation-related-first.log`; they were replaced by the exact unmaterialized-chain protection above, not removed without coverage.
- Package guard result before the final fallback: 12319 checks across372 resources; final rerun recorded separately below.
- Independent reviewer `settings_finish` confirmed the stale-proof counterexample and the safe full-chain fallback contract. Initial independent71 tests were before the added final cases; final review is separate from that earlier count.

## Exact final code/test bytes

Native ran on the base HEAD plus these dirty bytes, not an exact-main release. Source/release receipt production hashes bind the actual runtime modules; CI must be updated by its sole owner to require the new third `continuationRestart` alongside the existing two. The current native matrix remains68, not60.

```text
05149a4b9b75ec2cc77bb7cdd976d82557af9026eadb70be1041853fe86362b1  core/browser-native-sync/context-journal.js
8ccee2f24202fda5d485afce0935a39ce3483e029c221d84065709e28aead57a  core/browser-native-sync/prompt-journal.js
d13d6abc58332c09bb53751e59fadc384980826cbdea92f3925312b7707b6ff9  tests/browser-native-sync-context-info.test.mjs
b0b8d91e87c54ff6c9cb04e399115acf803e2aea752a5ab646373de64e7f2e33  tests/browser-native-sync-context-manual.test.mjs
1dff417c8328302686302ed3d96e3062b8da85f0dd3c814cc0f8acfcd57a5c37  tests/native-sync/context-info-chrome.test.mjs
fa8f7e6eed180d087e6f8eb2333470d30474f9be4db1e161d8f146f3378d667b  tests/native-sync/context-info-worker-fixture.mjs
```

Final package rerun: **12319 / 372 PASS**, `/tmp/context-continuation-package-final.log`. All six listed byte hashes verified unchanged after the final native run. `settings_finish` final read-only review approved the fallback, actual bidirectional case and proof/epoch boundaries; no additional browser execution. This is a local checkpoint pending coordinated CI integration and exact release/main gates.
