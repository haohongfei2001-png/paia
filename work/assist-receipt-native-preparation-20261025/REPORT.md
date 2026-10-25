# Assist signed service extraction and receipt-native preparation

Base: `815584ccca9c037673c3cc04fc7d950a9fcd011b`. This local candidate changes **five test/helper paths only**. It does not modify production runtime, the native owning files, the test router, workflow, lockfile or package dependencies. No browser/native/build/cloud/network/install/push was executed.

## Integratable subset

- `services/ai-gateway/tests/assist-signed-service-fixture.mjs`: exact original signed HTTP handler/service assembly extracted from `assist-client-fixture.mjs`. Original handler request parsing, real signed publisher/result/status envelopes and SQL protocol simulator remain. External completion remains synthetic. This is not a real PostgreSQL or paid-provider test.
- The original `assist-client-fixture.mjs` wrapper retains its store, API, Context selection, surface and producer. It delegates signed service callbacks and preserves its old callback shape, original loss and revoke controls.
- `extension/tests/harness/assist-receipt-native-service.mjs`: explicit test-only service bridge/staging utilities. Only creating the explicit service dynamically loads the service fixture. The default pure extension test does not call it. Exact service origin/paths/method/header/body, nonce/variant and original extension worker sender are checked; actual Prompt receipt messages are ignored, not proxied. Late tasks remain tracked after disposal. Generated configuration propagates **explicit original signed-service revocation** permanently and invokes invalidation listeners. Ordinary response loss remains distinct from revocation.
- Actual service-bearing bridge tests now live under `services/ai-gateway/tests/assist-native-service-bridge.test.mjs`, outside default extension scan. The extension default file `assist-receipt-native-bridge-contract.test.mjs` only exercises pure generated configuration, read-only projection and tiny fresh filesystem staging, without service/pg creation. No router exemption was added.
- Staging is an explicit helper only. It retains exact original worker bytes as a prefix and appends only read-only observations, preserving source files. It does not issue commands, receipts or action capabilities. The production configured leaf remains unchanged/null.

## Evidence, separate invocations

1. Original seven-file combination: **82/83**, exit 1, TAP 5109.991209 ms. All five original service owning files and the original native loader passed. The only failure was new VM test transport carrying a foreign-realm object into an exact-object envelope check. `combined-command.json`, original sources and full log are preserved.
2. Correct the test to perform JSON serialization as real Chrome messaging does: affected test only **1/1**, exit 0 (`vm-correction.log`). No old service owning rerun.
3. Review moved actual service checks outside extension default and added pure contracts plus a new attempted original-producer revocation fixture: **11/12**, exit 1, TAP 404.24125 ms. All eight moved bridge checks and all three pure contracts passed. New producer fixture stopped `STALE_BASE` before any HTTP/provider action; this is not successful signed lifecycle evidence.
4. The diagnostic rerun of that new fixture alone: **0/1**, exit 1, TAP 324.507291 ms. Confirmed `calls: []`, no provider. Preserved source and log. No production code changed to bypass the refusal.
5. Replace that mistaken fixture with a precisely scoped real signed **HTTP provider parser response hook**: **1/1**, exit 0, TAP 172.037958 ms. The original handler parses/rejects invalid `{}`; its actual `afterResponse` hook revokes the signed fixture. The bridge withholds the response, generated configuration becomes permanently invalid, and a later profile request is refused. Actual completion count is **0**; this validates revocation propagation, not a completed producer/provider flow. Original five owning files were not rerun.

These invocations must not be combined into one fabricated green aggregate. The final five-path source vector and command/log mapping are supplied. Reused already installed PAIA service dependencies match the original unchanged lockfile and 14 package versions (`existing-dependency-reuse.json`); no download/install occurred. Node 22.23.3 on macOS, ordinary synthetic tests only.

## HELD native preparation, not applied

`HELD-native-preparation.patch` and the two `.held.txt` snapshots preserve the separate attempted native wiring. Both tracked owning files were restored **byte-for-byte to this candidate's base**, after comparing saved original bytes against Git. Root must not apply this patch as completed browser repair.

The held draft sketches actual configured `AssistPromptCommands` and `PromptInsertionReceipts` in the same original worker/store, then actual private iframe RPC and native content controller. It uses an instrumented test stage, not a shipping release. It was **NOT_RUN**, is not fully mapped/qualified, and has the following explicit unfinished dependencies:

- Default browser runner has no qualified service dependency installation; applying the draft would introduce pg/service dependency to the default native path. No default native caller was changed.
- Request.signal/abort is not propagated across this bridge. Service disposal refuses new/late returned results but does not cancel the real pending service task. It cannot certify original deadline/abort lifecycle semantics. The eight old independent deadline/dispose/dismiss/revoke controls remain in the draft's old session layer.
- Actual selected-Context producer/receipt qualification is missing; generated configuration intentionally uses empty Context. The old synthetic-session Context negative controls cannot fill this gap.
- Full old-assertion mapping is incomplete, especially original session `replayed` semantics versus actual producer single-use behavior and final old lease revocation after newer actual replies. The draft is not ready for acceptance. No removed assertion is declared superseded by a weaker boolean.
- Actual Chrome worker sender metadata/relay identity, real frame transport, lifecycle cleanup and instrumented source/release stage have not been exercised. Stage tiny filesystem tests are not an extension build or browser test.

See `NATIVE-ASSERTION-MAPPING.md`. Preserve this patch as preparation evidence, not a runnable verified release or new authorization. No old native, large seed, 129-group recovery, cloud Full or paid-model allowance was consumed.
