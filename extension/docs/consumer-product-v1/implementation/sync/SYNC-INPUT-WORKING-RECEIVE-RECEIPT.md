# Optional Input Working receive receipt gate

Base `89b96511`. Test-only strict evidence validation; no production/runtime, workflow, route, shared validator, timeout, version, schema or activation change.

`assertInputWorkingReceiveReceipt(receipt,{head,tree,variant})` and fixed `INPUT_WORKING_RECEIVE_CASES` / `INPUT_WORKING_RECEIVE_PATHS` are exported from `tests/native-sync/input-working-receive-receipt.mjs`. The whole source/release native owner calls the same validator after its original durable restart, network and cross-variant evidence assertions. Original 240000ms budget and 17 actual owner cases remain. Shared lifecycle/network helpers are imported unchanged.

The validator requires exact expected commit/tree/variant; schema/result/scope; explicit disabled production/fullRecovery and enabled module remoteMaterializer; the 17 ordered case names; exact seven runtime paths with SHA-256 values; numeric browser version; real distinct worker lifetimes with closed transaction at restart; complete pre-stop/paused/restarted/final network ledger and exact paused evidence. CI must additionally compare the two validated variants' case lists, hashes and browser versions. A well-formed differing hash cannot be identified by a single receipt in isolation; the pair comparison is intentionally separate and has a negative test.

## Validation

- Full new receipt owner plus unchanged shared harness contract: **15/15 PASS**, 0 skip/cancel, 489.626291ms (`/tmp/receive-receipt-owner.log`). Eight new cases cover identity, capability flags, fixed inventory/hash set, lifecycle, erased evidence, earlier-lifetime denied requests, pair mismatch, and original whole-native validator wiring.
- Actual prior source and release receipts independently passed the new validator with their actual recorded HEAD `7b638b81c1b20efd79814f2a520db477a2c6832d` and tree `c3d8359a24ac6dfe46c240340568c3078f81d40c`; both 17 cases / seven hashes / Chrome154.0.8037.98. Cross-variant names/hashes/browser equal. `/tmp/receive-receipt-real-artifacts.log`. This is validation of old byte-bound artifacts, **not a new HEAD native run**.
- Native file syntax and diff check passed. No browser rerun. Root owns workflow registration and will run the eventual coherent candidate native batch.

Root independent review approved exact 17 names/order, seven hash keys, identity/flags and full lifecycle/network ledger; independent two whole files **15/15 PASS**, 581.74ms (`/tmp/029-receive-receipt-independent.log`). Root will additionally bind all seven runtime hashes to current checkout bytes in CI; workflow changes are outside this commit.

## Files
- `tests/native-sync/input-working-receive-receipt.mjs`: `2912204f5639fed858b1dd871b97fa43b9306f55f56de1bd0414df72bdfdc228`
- `tests/native-sync/input-working-receive-receipt.test.mjs`: `74da3ac0e7ec13f1378994c0e2efc49826c6cd26bfb503a41007cfeaffef116d`
- `tests/native-sync/input-working-receive-chrome.test.mjs`: `a2325c4de22b4ea9e88200685a380de540acfd64cd3a907ccdf1182880590b7a`
