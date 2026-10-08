# AI-COST-05 V2 retained scope after semantic style return — audit/design

Base ede7111a (future 0.34 integration). Read-only runtime audit; only this document and its executable audit are new. No runtime implementation authorization or gate completion is implied.

## Current implemented and external boundaries

AI-COST-05 already has three-style preferences, legacy authorized cache reads, private single-child local generation/adoption/cache reentry, immutable V2 accepted bytes and bounded incremental blocks, and two–four-child atomic closure. Do not redo those slices. The new atomic kind deliberately does not mint exact-cache or financial domain evidence; this audit does not propose widening those boundaries.

AI-COST-06 has dormant Assist intent qualification and independent existing Stage3A local Next/Family behavior. Its receipt explicitly lacks a real reply-lease/remote-processing resolver, reply-only empty dependency support, result delivery and model route. There is no current Prompt→AIUsage Assist consumer to safely enable by a small presentation patch. Do not turn local Next consent into remote processing consent or replace the default local path.

AI-COST-07's real Qwen regional capability, signed entitlement/pricing/financial reconciliation, mode-separated blinded fidelity and real production budgets remain external gates. The documented $50 evaluation ceiling is not spending authorization. No credentials or model calls were inspected or used.

## Confirmed local gap

`AI_ORGANIZE_STYLE_CONTRACT.md:81–85` requires semantic equality of style enum/policy rather than invalidation merely because a preference counter changes away and back. `AI_USAGE_PLAN.md` AI-COST-05 accepts A→B→A valid reuse and affected-only incremental processing.

The legacy `qualifyOrganizeCache` compares semantic style and already has a passing A/B/A test. In contrast, `ai-presentation.js` supplies V2 control as JSON `[gateEpoch, restoreEpoch, fullReadAIStyleObject, sourcePolicy]`. `planIncrementalV2` compares the entire persisted string; the style object's revision/explicit preference provenance changes on A→B→A. Even a newly prepared, fully reauthorized local session cannot resume retained V2 content in the same final style.

`tests/audits/ai-v2-semantic-style-gap.mjs` uses actual create/place, LocalOrganizeSession generation, candidate adoption and acknowledged preferences. Two expected-behavior tests both fail STALE_BASE at the control equality in `planIncrementalV2` on this exact baseline (`/tmp/ai-v2-semantic-style-gap.log`, 0/2, 505.339833 ms):

1. Two accepted Entries, Original→Concise→Original, no other change: new session should return NO_DELTA with zero new fixture calls; it rejects instead.
2. Twenty accepted Entries, the same roundtrip, five real new Entries: new session should assemble exactly those five; it rejects before assembly.

This does not prove paid quality or production cache-exact capability. The first outcome is non-authorizing NO_DELTA; the second is a newly qualified ordinary local request under all existing execution fences. The accepted old output is still readable, so this is a blocked safe incremental continuation, not observed data loss.

## Smallest compatible implementation proposal

Sole runtime file initially `core/organizer/ai-incremental-v2.js`, using an internal strict comparison of the existing control representation; no schema, stored byte rewrite, cacheBinding, Foundation, worker, Settings writer, Source or UI change.

Decode both existing control strings with a bounded exact four-element shape. Require valid available known style objects, matching actual enum and restore epoch, and identical gate epoch, restore epoch and exact source-policy representation. Compare only style transformation semantics for retained-result reuse; preference revision and explicit/default provenance are not transformation differences. Malformed/unknown control, unknown enum, different profile, gate/restore/policy changes and currently different style still refuse. Do not parse arbitrary strings permissively or borrow metadata from the proposed response.

Keep the full currently captured style revision/epoch in LocalSession prepared proof, candidate source binding and Foundation `assertOrganizeStyle`; no in-flight request may survive A→B→A. A fresh session after returning to A can reuse unchanged blocks because its current execution authority is independently re-read. If there is a new delta, the newly accepted manifest uses current control, retaining old accepted block bytes/IDs/support exactly. An unchanged NO_DELTA read never writes updated qualification metadata.

Manual/protected-field rules stay unchanged. Actual manual fields remain indivisible and refuse generation; existing protected blocks cannot be recomputed from changed evidence under this patch. It does not implement a style B full recomputation, a historical cache store, protected-field override, exact-cache stamping for V2/multi-child, or model version migration.

## Required evidence and file ownership

Add the two actual owner cases to the existing V2 owning suite. Preserve the restore-epoch half of the existing combined style/restore refusal test, while replacing only its stale roundtrip expectation with the semantic contract. Add exact controls: A→B stays refused; unknown/malformed control stays refused; gate/restore/source-policy/profile changes refuse; old pre-roundtrip prepared handle fails despite ending at A; actual human edit remains protected; retained IDs/accepted bytes unchanged and only five payload Entries are sent. Include a default Balanced→other→Balanced case, since explicit preference provenance alone must not become a new transform identity.

Run whole V2, local session, multi-child, cache qualification/reentry and Foundation style regressions. After independent review, extend the existing original AI native file with one actual A/B/A retained-scope case and run its unchanged source/release whole file once. Keep all old 120-second cases/oracles; no new CI file. Owning scope: the single V2 runtime file, existing V2 tests, existing AI native and one receipt. If current-generation qualification requires changing shared owners instead, stop for a concrete interface review.

This is the recommended next small local batch. Paid/model/service gates remain separate; no additional engineering task is invented merely to parallelize them.
