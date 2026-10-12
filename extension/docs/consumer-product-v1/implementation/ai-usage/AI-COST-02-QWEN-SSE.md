# AI-COST-02 — bounded Qwen streaming bytes

Base: `07d90b715be8a1e0c707abc6a86d873436677b4c`. Ordinary local engineering slice under AI_USAGE_PLAN §4 and §12-02 and the existing QWEN-USAGE-CONTRACT §4. Root owns implementation; independent review is required before integration. This record does not close AI-COST-02 or enable a model/service.

## Implemented boundary

`createQwenSseUsageParser({binding,httpStatus})` extends the existing usage owner with `push(Uint8Array)` and `finish({transportComplete,cancelled})`. No network, SDK, worker entry, provider, account, credential, permission, storage writer, UI or billing authority is added. The existing decoded APIs and neutral normalization remain intact. Future trusted transport must supply the actual HTTP status and call finish at actual EOF/cancellation; these arguments are not remote origin or qualification proof.

The private decoder processes fatal UTF-8 across arbitrary byte boundaries, initial BOM, CR/LF/CRLF, comments and multiline SSE data. Only the wire `[DONE]` event can create the internal done marker. Missing/truncated, early/repeated or post-DONE data never becomes a valid complete usage receipt. Non-message SSE events refuse; id/retry/unknown fields have no reconnection behavior. Incomplete trailing events fail closed instead of being silently accepted as a financial completion.

Actual typed-array intrinsic size is charged before decoding; caller getters/subclasses cannot understate it. Shared buffers, proxies and non-byte views refuse. Existing validated byte/frame/depth/key/string ceilings apply without permissive defaults. Strict bounded JSON parsing rejects duplicate keys after escape decoding at every depth, malformed or non-finite values, and forged terminal JSON. These are bounded decoder allocations/work, not a claim to bound memory already allocated by a caller.

Decoded frames stay private until the existing parser returns its body-free outcome. Finish is idempotent with detached receipts; terminal error/cancel/finalize releases buffered state and disables further pushes. Synchronous reentry while finalizing yields a finite incomplete outcome. Output retains NOT_EVALUATED domain validity, NOT_ESTABLISHED qualification, financialAuthority:false, dispatchAllowed:false and held reservations. Observed over-cap token counts remain exact. No refund, retry, domain commit or effective-result quota is inferred.

Protocol references checked 2026-10-13: [WHATWG SSE parsing](https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation), [Alibaba Cloud Qwen streaming](https://www.alibabacloud.com/help/en/model-studio/stream). Fatal invalid UTF-8, duplicate-key refusal, finite resource ceilings and incomplete-tail refusal are PAIA's stricter usage-accounting profile, not general EventSource behavior. Fixtures are synthetic, not a live model qualification.

## Verification and retained failures

Five complete owning/related test files: **95 PASS, 0 fail/cancel/skip/todo** (156.062041ms on local Node). Covers all byte splits plus one-byte input, real UTF-8 boundaries, escaped duplicate keys, final-usage ordering, malformed/truncated/canceled/HTTP errors, independent resource ceilings, original neutral arithmetic/settlement, detached/sticky outcome, shadowed byte length and reentrant finalization. Existing decoded parser tests were not weakened or changed.

Static package: **15994 checks / 467 runtime resources PASS**. Official candidate build: **487 files**, release product guard PASS, version **0.44.0** for the new compatible capability. This is a candidate build, not a new installation. Source has no visible product/UI change.

Retain the first owning run's one failed extra-finish-field classification assertion; the finish metadata snapshot now admits bounded inspection before exact-key rejection. Independent review reproduced a shadowed byteLength admission defect and a reentrant null finish result; both are corrected and covered by production-owner regressions. Their before logs remain separate negative evidence.

An attempted local adapter-contract run produced **21 PASS / 27 FAIL** because its headless Chrome before-hook exited in the Mac sandbox. This is not adapter acceptance, not a product diagnosis and not waived. The unchanged adapter suite must pass in the existing cloud round-integration gate; no repeated local startup or relaxed browser assertions. Independent final code review APPROVED: complete owning file14/14 PASS (153.039333ms), including independent before/after reproductions of both defects; no remaining finite interface blocker. Privacy/security and development privacy/permission/network audits PASS. PR light integration and exact-main gates remain pending. This dormant parser changes no live UI/privacy/storage/financial admission, so full historical browser/mac certification is not selected for this ordinary round.

## Remaining engineering and gates

Normal raw JSON byte decoding, qualified request/route registry, trusted service/entitlement and financial binding remain distinct follow-ups to existing AI-COST-02. Real route/retention/model quality and billing evidence are not established by this decoder. Continue dependency-safe local engineering after integration; only separately gated actions remain unavailable. All seven Canonical scopes persist, SYNC new features stay paused and Pro owns PR #264/CI.
