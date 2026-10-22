# Browser4 promotion preview: original search work before the baseline

Task: PR313 comment6337500885. Exact failed merge/base `8715c310c9dbd8a366defe3e4f360c56908edc26`, PR head `7afb39930d53d3478062a3202b369f99f2aaa0ca`, main parent `4349189451821db1e408a669cee5b64b140844f6`. Separate successor `codex/promotion-preview-settlement-followup-20261022`; fix `6df133da3e132482f696ffe09aa49fff0d8ab9ed`. No acceptance branch changes.

## Diagnosis and retained failure

[Full39752524162](https://github.com/haohongfei2001-png/paia/actions/runs/39752524162), Browser4 job119736387662 is CANCELLED, but its original log contains **two real assertion failures**, Source and release first promotion case. Each then stops its parent fixture; these parent errors are cascades, not separate runtime regressions. Later cases were not reached in those original fixtures. Cancellation does not erase the failures or qualify other cancelled shards.

Original artifact12415491290 is18972282 bytes, verified SHA256 `8606ecefe9a43aed98e0e89786b7b5a4f0721d2db4756da901f4f1f8dc211c6c`. Original log and four original JSON files are retained under [evidence](evidence/promotion-preview-20261022/receipt.json), including their byte hashes. Original RPC traces show proposal/prepare/cancel success, no confirm. Both raw baseline/post database snapshots were **not** exported by the original fixture; the Node assertion formatter elides context. Do not claim an exhaustive historic write trace from the available text.

The visible delta is an existing manual Entry search queue item removed, eight exact search postings inserted, and that Entry's `indexedSearchVersion:0:0:active:0` set. `core/library-search.js::searchBatch` performs precisely these writes. `libraryStatus` counts dependency invalidations and purge cleanup, **not** pending search work. The old browser admission predicate therefore could admit an unfinished search baseline. `GET_LIBRARY_FOUNDATION_STATUS` also lets the original worker scheduler continue its existing work after the response; no test-owned drain is necessary.

The new deterministic original-owner regression creates the same manual text, proves the old two status counts are zero while one search task remains, proves real `ManualSectionPromotionService.prepare/cancel` preserves all37 stores and SDK exactly, then invokes the original search batch. Its complete expected snapshot accounts for exactly the queue removal, all eight cloud token hashes, and indexed version; every other table/field and SDK is still compared. This confirms the fixture admission defect and an exact explanation for the visible historical delta. It does not prove absence of every unexported historic side effect. No runtime defect was established, so none is patched.

## Minimal change

- `tests/topic-section-promotion-chrome-e2e.test.mjs`: before the existing no-write baseline, retain the original status request and additionally wait for original search pending count zero and rebuild complete; record only those counts/booleans. All six cases per variant,37-store/SDK comparisons,180s parent/14s polling limits and identity/network assertions remain.
- `tests/harness/promotion-search-settlement.mjs`: self-contained native readonly IDB count and rebuild-marker reader; no bodies, writes, drains, queue mutation, request replay or runtime RPC. Refuse a missing database before opening; abort unexpected upgrade.
- `tests/topic-promotion-search-settlement.test.mjs`: original-owner delta, full snapshot preservation, unfinished-rebuild and missing-database regressions. No surrogate promotion/search implementation.

No runtime, manifest, package/version, policy, schema, provider, budget,4096/2MiB/30s boundary, workflow or CI configuration changed. No permissions, external data, paid calls or production resources were added. The readonly fixture probe does not confer product authority.

## Actual checks and limits

Node22.23.4, Python3.12.14, Playwright1.63.0, local Chrome155.0.8059.85, existing headless harness, temporary synthetic profiles, zero external/extension requests. Exact package dependencies remain unchanged.

- Initial owner regression1/1 and owning UI+regression18/18 passed. Package audit21218/607 passed at that first test revision; runtime resources are byte-identical in the final patch. It is a static check, not installed qualification.
- Initial native Source/release14/14 passed in18.096s. Then the readonly probe's missing-database behavior was strengthened. Its new negative test initially failed1/2 because fake IndexedDB retains a version0 catalogue entry after abort; that failure is retained as `owner-final.log`. Prechecking the catalogue avoids opening an absent database; final targeted regression2/2 passed. No assertion was deleted or softened.
- Final frozen-file Source/release14/14 passed in18.065s, including full original37-store/SDK comparisons, native confirm, compound undo, stale-Working refusal, API-absent WindowClient and forged identity rejection. Original source/release vectors and both final receipts retained; every final tracked source hash matches fix commit6df133da. Both executions occurred before commit with baseline HEAD plus the documented patch; do not call this post-commit CI. The final rerun was justified by the probe change, not a repeat to cover the old failure.
- Static review: diff confined to three test files; no fields excluded, original assertions/timeouts intact, no owner suspension/override, no compound write replay. Independent review remains dot's responsibility. No Full, complete Browser4 shard, Linux reproduction, whole-project acceptance, installed/live service test or merge was performed.

At item start/end all25 current PR Conversation comments were read without author filtering; last was6337570137, no new instruction. Dot owns exact integration and complete acceptance. Search historical MEMORY_STALE and older STALE_BASE retain their separately reported UNKNOWN status.
