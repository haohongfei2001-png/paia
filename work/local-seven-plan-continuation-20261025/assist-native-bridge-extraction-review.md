# Assist signed-service extraction and test bridge review

Read-only stable worktree review, base `815584c`, `assist-receipt-native-preparation`. No test/native/browser/network executed, no production file edited. Implementer was notified of findings during review. This is not approval of the still-changing native journey.

Exact reviewed SHA256:

- `extension/tests/harness/assist-receipt-native-service.mjs`: `ee01f6eed1b6cebb0b51b3956f0bbc5cace001bec42e00ff8aded71ce563a48f`
- `services/ai-gateway/tests/assist-client-fixture.mjs`: `7c07e436646945e8478ca04908ce8e79b44b6fc6204a739a6c7228894634441a`
- `services/ai-gateway/tests/assist-signed-service-fixture.mjs`: `5e863b2bba14037e34563fb57940feec75e09a9fb35a26e7733a1f5aa93c183d`
- `extension/tests/assist-receipt-native-service.test.mjs`: `690808b74dc3b7d8cb8481051f366c1c9d7f202720a7d2ef5eab5e59801a5721`

## Findings requiring correction or an explicit bounded scope

### P2 — New default unit test imports the service dependency graph

The helper's lazy import at line 20 prevents importing service code merely by loading the helper, but the new top-level `extension/tests/assist-receipt-native-service.test.mjs` calls `createAssistNativeService` in normal tests. `extension/scripts/test.mjs:16–19` discovers every top-level `.test.mjs`, and `test-groups.mjs` classifies this name as unit. Executing normal unit/full therefore imports `assist-signed-service-fixture` → original provider/client-declaration fixtures → static `pg` imports. A normal extension environment without service dependencies will fail. This violates the stated default-no-new-service-dependency boundary.

Move the service-bearing owning test to `services/ai-gateway/tests` for explicit execution, or split truly service-free relay/config tests from it. Do not solve this by hiding a default test through a router exception or silently installing pg in ordinary extension validation. Existing explicit native preparation may still dynamically import the service when deliberately invoked.

### P2 — Staged configuration does not inherit original fixture revocation

The extracted fixture preserves `live`, `revoke`, and `afterResponse({revoke})` at lines 46/54–55. The original client wrapper correctly uses `signed.isCurrentTokenizer()` for both resolveAuthority and tokenizer currentness. In contrast, the generated staged configuration at helper line 54 uses only runtime identity for those functions; its own `live` never changes and its onInvalidate listeners are never notified. Node `handle` checks a different bridge-live flag at line 32, not signed-service currentness.

Thus `afterResponse: ({revoke}) => revoke()` can invalidate the original signed fixture while the staged worker still reports authority/tokenizer current. The same hook in the original client fixture refuses continuation. This must be propagated through a fixture-bound invalidation protocol (with late response refusal and original worker notification), or the bridge must be explicitly constrained to a prospective service lifetime that rejects unsupported revocation controls and cannot claim their preservation. Do not count a configured native revocation test as equivalent until this difference is covered. No financial credentials or real account authority should be introduced.

### Transport boundary — Request abort is not carried across the bridge

Generated fetch serializes URL/method/headers/body only; `requestData` line 16 creates a Request with a new unrelated signal. Original declaration/result client transports use abort controllers, and original provider-entry passes `request.signal` to the runner. A worker abort cannot currently reach the Node-side original request. `service.dispose` refuses future/late replies but intentionally leaves the actual pending task tracked until settlement; it does not cancel it.

This is safe to retain as an explicit UNKNOWN/non-cancellation limitation of a bounded test bridge, but it cannot certify original HTTP-abort/deadline semantics. If the native mapping moves those lifecycle cases onto this bridge, a request-identity-bound cancellation path preserving actual pending work is necessary. Otherwise keep the original independent lifecycle controls on their original path and report that this new bridge does not verify cancellation propagation. Do not replace them with a local reply rejection and call it physical completion.

## Extraction and boundaries that are preserved

The service extraction itself keeps the original declaration/reservation/provider/result/status handlers, signed publisher-to-grant rows, original SQL simulator, manifest/schema/profile calculations, HTTPS completion stub, loss predicates and statusTransform behavior. The original client wrapper adds the same configuration object back to afterResponse; its closure is used only when a request happens after construction. Its revoke/restore/restoreAcks, provider counts and payload access now delegate to the same extracted state. No client-created insertion ACK or synthetic grant replaces original signed handlers.

The new bridge allows only four fixed operations, exact nonce/variant/lifetime and five fixed HTTPS paths, POST/JSON bounds. It returns actual serialized response/error rather than converting HTTP loss to success. The archive relay ignores all messages whose type is not the private test type, including real receipt messages. It requires the extension's exact worker URL, same extension ID and no tab, keeps original runtime/listener/forward identities, and refuses a late reply after disposal. These checks do not prove browser execution; they are synthetic transport contracts.

Staging creates a fresh temporary tree, changes only the configuration leaf and appended read-only worker observation, and records original/staged hashes plus original worker-prefix preservation. Production leaf/runtime remains untouched by this reviewed code. The observation exports rows and handle equivalence, not original owners or setters. It is broader than a count-only body-free projection (full synthetic rows are returned for canonical comparisons), so it is appropriate only in the explicitly synthetic isolated stage and must not be characterized as a real-data-safe general diagnostic API.

The new Node tests prove parser rejection and fixture profile/tokenizer transport, sender/nonce/dispose and message separation. They do not yet prove a full signed successful provider→result journey through the new bridge or any native browser receipt journey. Earlier service owning tests remain separate evidence. The design correctly leaves actual producer/iframe/receiver/ACK routing unchanged; that subsequent integration must be reviewed separately.

## Disposition

Do not integrate these four reviewed bytes as complete preparation until the default-dependency and signed-revocation findings are resolved or narrowed explicitly. Preserve current source/log snapshots, then validate only changed owning boundaries. No additional native or full-suite execution is requested by this review.


## Frozen follow-up — 6bad9106595e8ba2d7d4dd4bc8effb23bffee83f

Read-only follow-up found both P2 issues closed for the narrowed integratable five-path preparation. All five final source hashes and 24 evidence manifest entries match; the checkout is clean. Both original native owning files equal base 815584c bytes and the native draft exists only as HELD evidence.

The real service tests now reside in `services/ai-gateway/tests/assist-native-service-bridge.test.mjs`; the only new default extension test calls pure source-generation/projection/tiny stage functions, never createAssistNativeService. The helper retains its deferred service import. No router exception or default service install is added.

Bridge requireSigned checks the original extracted live state before admission and after each original operation settles. Its private dispatch translates only the original ASSIST_NATIVE_SERVICE_REVOKED code to an explicit revoked response. The authenticated relay carries that reason; generated configuration permanently closes its own live state and notifies original invalidation subscribers before refusing the result. Ordinary loss remains unavailable, not fabricated revocation. Pending real tasks remain tracked. This closes the demonstrated afterResponse revoke mismatch for the preparation, without claiming asynchronous out-of-band/native account revocation certification.

Read the final exact hook control: the original provider parser rejects an invalid request, then its actual response hook invokes revoke; bridge refuses the response, worker configuration becomes non-current/null-profile and later calls cannot reach service. This is 1/1, TAP 172.037958 ms, not a successful completion/provider journey. Preserve earlier 82/83 + targeted1/1, then 11/12 + diagnostic0/1 + exact hook1/1 separately. The failed attempted producer fixture hit STALE_BASE before HTTP and is not relabelled successful.

Request.signal propagation remains absent and explicitly documented. Default native service dependencies, actual selected Context, full old native assertion mapping and actual Chrome sender/transport remain unfinished. These are accurately HELD and do not block integrating the limited fixture extraction/pure helper preparation. They do block treating this package as a fixed native Assist journey. No further tests were executed by this reviewer and no native run is requested.
