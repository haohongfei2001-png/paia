# Assist / Next receipt-only native preparation: read-only audit

Frozen input **815584ccca9c037673c3cc04fc7d950a9fcd011b**. All source below read by `git show` at that commit; checkout subsequently advanced and was not treated as the frozen identity. No runtime/test changes and **no test, browser, native, build or cloud execution** in this audit.

## Confirmed Assist fixture mismatch

`extension/tests/harness/ai-assist-native.mjs:128–134` calls the manually created original `LocalAssistSession.insert` with a private controller. That controller sends text/binding/operationId through `__privateAssistInsert` (line 48), rebuilding only `qualify` and `isCurrent` using CDP. It supplies **no original `AssistPromptCommands` producer, issued action, `PromptInsertionReceipts` ledger, or `insertionMessage`**. Its top sender at line 61 even has the explicit synthetic document ID `synthetic-private-document`.

The real controller at `content/assist-result-runtime.js:14` consumes a receipt only when `insertionMessage.insertionReceipt` exists. This fixture instead reaches its legacy fallback at line 20. Strict adapter `adapter/chatgpt-composer.js:299–304` now refuses that exact path with `page_refresh_required`; it will not perform a native edit. Therefore original fixture line 141's inserted/verified assertion no longer has a valid positive route. Later IME/draft/uncertain cases can similarly stop at the receipt gate rather than exercise their intended boundary. This is an explicit source-chain diagnosis, **not a fresh native failure observation**.

The affected original consumer is `tests/harness/ai-cost-session-lifecycle-cases.mjs:15–27`, the original Source and release complete Organize/Assist lifecycle cases. Do not silently remove the Assist segment, change it to expect refresh, or use earlier green native results as current evidence. Its independent provider-deadline/session-UNKNOWN controls remain useful and must be retained; they do not require a physical insertion authority.

## Next has an existing correct route; do not rewrite it

Both `cpv1-12-next-prompt-chrome-e2e.test.mjs` and `ai-assist-automatic-r3-chrome-e2e.test.mjs` drive the actual private iframe click/worker flow. Worker lines 81/94 build one real receipt owner and inject it into the original Next producer. Next lines 212–219 issue its own presentation action; 225–235 dispatch through the original receipt owner. `content/prompt-next.js:79–90` passes the complete received message/lane into the original adapter and preserves its original last permission/family/currentness qualification. CDP in those files observes events, controls existing failure cases and sends IME input; it is not the missing bare production insertion bridge found in Assist.

`cpv1-09-prompt-insertion-chrome-e2e.test.mjs:24–29` already uses actual manual PREPARE's insertionAction then original INSERT. It is a useful native receipt-route precedent. No Next/manual fixture correction is proposed from this audit. Their current native qualification remains **NOT_RUN**.

## Existing equivalent components to reuse

- `prompt-insertion-producer-receipts.test.mjs` instantiates real manual/Next/Assist producers against one original store and receipt owner. The Assist service comes from the existing signed service fixture. It proves producer binding, PENDING-before-transport, invalidation and action identity locally. Its transport **constructs a synthetic ACK**, so it must not be transplanted as native evidence.
- `prompt-known-document-roundtrip.test.mjs` wires real receipt owner and real VM composer in both directions; REGISTER/QUALIFY/ACK/RECONCILE and holds are actual implementation calls. However it is VM-only and manually issues a manual capability/action for focused transport coverage, not a complete Assist producer. Reuse routing patterns only, not its manually issued success as Assist authority.
- `services/ai-gateway/tests/assist-client-fixture.mjs:42–78` already assembles real signed publishers, request/provider/result/status handlers and existing deterministic SQL simulator. Only external HTTPS model completion is synthetic. `createConfiguredAssistSession` creates the session from this original configuration; `AssistPromptCommands` captures that same session and original store at construction. Do not replace `commands.session` with the native fixture's manually supplied session (source binding then correctly fails).

## Smallest viable complete test preparation

The required positive is: **original configured Assist producer on the same native store → original automatic/result presentation → original issued action → original receipt ledger PENDING → actual top-document adapter → original ACK/reconcile → original durable terminal CAS**. Receiver/initiating document IDs must come from actual Chrome message/context metadata; the old synthetic sender cannot be promoted to native authority.

A bare CDP transport bridge cannot add this chain merely by attaching an envelope. It must not call issueAction with an unrelated producer, mutate producer views/activations/session, synthesize positive qualification/ACK, downgrade the adapter profile, or register a caller-supplied source verifier.

The viable preparation is a **dedicated test-only service-configuration bridge**, reusing the existing real signed service handlers and synthetic external completion. The original worker/Assist producer/content/receipt classes remain byte-identical. If the original null configuration must be replaced, do so only in an explicitly staged test snapshot through the existing configuration leaf; report that snapshot/config hash separately rather than claiming unmodified Source or a shipping configured service. The bridge must transport real signed declarations/results and preserve original client validation, not replace the issuer with a constant result. It may use a private test transport with no external network, but sender/nonce lifetime and exact original document metadata must be proved. The existing browser harness provides archive↔Node bindings but no ready-made service-worker configuration bridge: this is a concrete preparation dependency, not an external permission or funding blocker.

Construct the real `AssistPromptCommands` once with its original configured session/store. Drive original READY/automatic/result presentation, then original insertion action through the actual initiating iframe. Main pipeline assertions must still refer to the original producer-owned session and its real handle/result; do not cross-wire a different session handle to a fresh producer. Existing canonical-table/bodyfree/provider count/selected Context/timeout/revoke/condition/IME/draft/uncertain/no-replay/no-Send assertions remain. The eight independent late-provider controls may retain their original explicitly synthetic session setup because they assert zero insertion. Preserve the existing early unqualified-body and stale-result controls as negative assertions.

This is larger than a one-line fixture repair, but smaller and safer than changing production ingress. The exact bridge/read-only ownership review should occur before implementation. No native execution is included in this recommendation.

## Proposed ownership / files (not modified)

1. `extension/tests/harness/ai-assist-native.mjs`: replace only the main positive insertion assembly with original configured producer/receipt chain; retain all original assertions and independent failure/deadline cases.
2. New `extension/tests/harness/assist-receipt-native-service.mjs`: fixed test service handler/config transport and actual-message metadata bridge; no production registration API.
3. `extension/tests/harness/ai-cost-session-lifecycle-cases.mjs`: only if needed to stage the explicit test configuration for Source/release; preserve both complete cases and all Organize ownership. This is shared owning infrastructure and must be assigned before editing.
4. `extension/tests/ai-assist-native-loader.test.mjs` plus a new small fixture contract test if necessary: prove actual source loader/producer/handler chain and no fabricated ACK/profile. Existing deadline test unchanged.
5. If extracting rather than duplicating the signed server assembly is necessary: `services/ai-gateway/tests/assist-client-fixture.mjs` and one new service-side helper. This is an optional shared-test refactor requiring explicit root ownership, not permission to edit service production issuers.

No `adapter/chatgpt-composer.js`, worker, receipt owner, producer or service runtime change is indicated by this fixture mismatch. Do not broaden to Next. Future tests should use one meaningful scoped native milestone only after this preparation and independent source review; no already exhausted native/cloud/Full allowance is renewed here.

## Frozen blobs

| Path | Blob at 815584c |
| --- | --- |
| `extension/tests/harness/ai-assist-native.mjs` | `33857b16f01dc60291b45dafc0a8ec70036a6e07` |
| `extension/tests/harness/ai-cost-session-lifecycle-cases.mjs` | `7a4603ef9f28a60db8451813a798d2249e631a86` |
| `extension/tests/ai-assist-native-loader.test.mjs` | `d301230397bff3d765250bff1a56d6f5ef8cff08` |
| `extension/tests/ai-assist-native-deadline-fixture.test.mjs` | `20dcc02816cb7503ca8b6ea39140f9142aa9c5ca` |
| `extension/tests/cpv1-12-next-prompt-chrome-e2e.test.mjs` | `7934536f9c16ab51e6a4fad1ec44e9bf2af401d2` |
| `extension/tests/ai-assist-automatic-r3-chrome-e2e.test.mjs` | `8ba5dfc3b356ccea662ee7261a8b9bf4163fc11b` |
| `extension/tests/cpv1-09-prompt-insertion-chrome-e2e.test.mjs` | `2445ba6da49e067818641331b9bb7180404e1f50` |
| `extension/content/assist-result-runtime.js` | `b3479e596082173600753cef1c3f29784cd47a0b` |
| `extension/content/prompt-assist.js` | `59b634359944c0a21e1a4112b053c6379d54ddc1` |
| `extension/content/prompt-next.js` | `265af543a365f83e71af301fa7c1881da60a799f` |
| `extension/background/prompt-assist.js` | `f882e4f6d531b90d37d73b83419892eb505d4387` |
| `extension/background/prompt-next.js` | `d17ba70ad375815d4fb1754d96450de2d07e0559` |
| `extension/background/prompt-insertion-receipts.js` | `212eaa8d8ba68070508a7431c209c70f1a65d205` |
| `extension/background/service-worker.js` | `cf547802a432feb81386c5df6f1aa98225092dc4` |
| `extension/adapter/chatgpt-composer.js` | `651f2887b750874e4391ff0c2ba686cb45969e9b` |
| `extension/tests/prompt-insertion-producer-receipts.test.mjs` | `2050fd71103c5aefd9407696faaf28fe09823eb1` |
| `extension/tests/prompt-known-document-roundtrip.test.mjs` | `f9c0a45701342b7a5b68f43d2c7f3df2c5c4aedc` |
| `services/ai-gateway/tests/assist-client-fixture.mjs` | `612d0cf4efca1bcf0333d6789524168effa29f18` |
| `extension/core/ai-usage/configured-assist-session.js` | `8e67e97fdcf7c672db443749f2bb50764a6c46e5` |
