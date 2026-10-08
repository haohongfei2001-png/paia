# AI-COST-05 retained V2 semantic style qualification

Base ede7111a; negative audit checkpoint 75bcdfa3. Runtime is limited to ai-incremental-v2.js; no Foundation, Source, UI, worker, schema, version, CI or provider activation. Independent review APPROVED; native results pending.

The actual current style contract (sections 5, lines 81–85) distinguishes transformation semantics from preference causality. Legacy cache qualification already did this. V2 persisted control included the entire style revision/explicit object, so returning from A through B to A prevented both NO_DELTA and a later affected-only refresh.

The retained-control comparison now strictly decodes both existing four-element tuples and validates exact known style keys, available state, revision/explicit/default relationship, gate/restore epochs and complete source-policy keys/types. The saved manifest, saved tuple, current tuple and current actual style must agree on the enum. Only preference revision and explicit/default provenance may differ for retained accepted bytes. Gate, restore, source policy and generation profile still must match exactly. Invalid/future/malformed metadata cannot become reusable. Accepted rows are not rewritten simply to relabel them.

Current prepared request proof, Foundation style binding and candidate source qualification are unchanged. A handle prepared before A/B/A still refuses after the roundtrip. A newly qualified same-style read may return non-authorizing NO_DELTA, or assemble the real new delta. This is not V2 cache-exact stamping, cross-restart response recovery, a historical cache store, human-field override or production Qwen qualification.

## Evidence

- Baseline actual create/place/LocalSession/candidate-adopt/preference owner audit: two expected-behavior failures, both STALE_BASE at retained-control equality; `/tmp/ai-v2-semantic-style-gap.log`, 0/2, 505.339833 ms. Fixed audit 2/2 in `/tmp/ai-v2-semantic-style-fixed.log`.
- Complete V2 owner now 29 cases. Added explicit Original and initially default Balanced roundtrips; NO_DELTA whole-store equality and zero repository writes; retained original block bytes/IDs and only five new payload Entries; old prepared handle zero-provider refusal; actual gate and memory policy changes; strict malformed-control matrix; model-profile and actual human-edit refusal.
- Existing combined different-style/restore refusal test keeps the restore assertion and now tests genuinely different current style. Its former A/B/A refusal contradicted the canonical semantic requirement; no unrelated assertion or timeout was removed.
- Six complete related files: 153/153 PASS, 5779.459584 ms, `/tmp/ai-v2-semantic-style-related.log`: V2, multi-child closure, local session, adoption cache, cache qualification and AI foundation. No skip/cancellation.
- Original native file remains two source/release cases with 120-second budgets and all earlier assertions. Existing 200+5 and 47+3 flows now perform an actual acknowledged style roundtrip immediately before the final delta; a new session must return NO_DELTA with unchanged full store snapshot and zero native put/delete/clear calls, then process only the existing final five/three Entries. Temporary instrumentation forwards every actual method unchanged and is restored in finally. Native not yet run.

Independent root_finish review: complete V2 owner 29/29 PASS, 3829.535 ms, `/tmp/ai-semantic-style-independent.log`. Runtime, actual owner tests and native additions approved. Package guard 13370 checks across 400 runtime resources passed.

## Scoped runtime/test bytes

- `core/organizer/ai-incremental-v2.js`: `20abb333a9513a54c97d0aa0fa9c77889ce141bf23d7a6d8e7491b7207f34086`
- `tests/ai-organize-incremental-v2.test.mjs`: `e641f509298616399e67582f3c85f16762c2f46da463728757d281c1e5d0efe1`
- `tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs`: `40787e60ab22039395be6ee3863ef3b233da6d9b66b77b1cd9f5ef344258ef36`
