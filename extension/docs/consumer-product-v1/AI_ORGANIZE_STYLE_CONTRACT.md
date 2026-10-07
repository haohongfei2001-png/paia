# AI Organize Style / Voice / Ownership Contract

Contract: **AIOS-1.0**, adopted as a scoped owner-directed product decision on **2026-10-07**. Implementation and model qualification are **PLANNED / NOT_RUN**.

[AI_USAGE_ARCHITECTURE.md](AI_USAGE_ARCHITECTURE.md) is the only quota/budget authority. This document owns transformation, global preference semantics, evidence and style-specific acceptance. PT-1 identity, the Thought visual authority, Context Cards and existing human/source protections remain unchanged.

## 1. Consumer setting

In Settings Consumer v2 -> **AI 与提示词**, add one selection row:

**AI 整理方式　平衡整理**

The selection opens a simple accessible single-choice destination/dialog, with these exact v1 options:

| Consumer label | Supporting copy | Internal enum |
|---|---|---|
| 原话优先 | 尽量保留你的原句，只做重新组织。 | original |
| 平衡整理 · 默认 | 适度修剪、拼接和优化，让想法更连贯。 | balanced |
| 更加概括 | 提炼和压缩重复表达，突出主要思想。 | concise |

One quiet explanation: **只改变整理后的阅读方式，不修改你的原始内容。** Selection is available to Free and Pro without a style paywall. Default is balanced. This is a low-frequency global preference, not AI Organize ON/OFF and not a permanent three-way control in the Topic reader. V1 has no per-Topic override.

Balanced is default because simple reordering often leaves fragmented repeated context, while stronger abstraction can remove the user's characteristic expression. The middle policy permits useful editing without turning personal thought into a report. This is a product judgment to validate with authors, not a measured claim that all users prefer it.

Settings retains the existing six groups, shared shell, fonts, responsiveness, focus/IME/leave guard and preference ownership. The available target becomes 22 main rows: four switches, six selections, twelve destinations; the secondary Prompt position reset remains. “AI 与提示词” has three rows: AI 上下文, 下一句建议, AI 整理方式. No extra account, model, token or AI administration group is introduced. Existing private 20-row Settings and 21-row BNS reference evidence is not relabeled as a new 22-row visual PASS.

## 2. Shared ownership and voice invariants

All modes present the person's expression directly. Do not narrate about the user with “用户认为”, “作者认为”, “从这些内容可以看出”, “AI 总结如下” or “你的核心观点是”. Natural first person may remain when the original uses it; do not mechanically insert 我 into every sentence. Headings may organize expressed material, not diagnose its author.

Preserve stance, certainty, conditions, exceptions, reservations, intensity, characteristic language, contradictions and temporal scope. “我现在可能更倾向方案 C，但还没有完全想清楚” cannot become “我选择方案 C”. A pleasing sentence is not a justification for removing 可能、目前、我怀疑、也许 or 还没想清楚.

Keep historical changes explicit: an earlier A preference, later B inclination and eventual C decision are not “一直认为 C 最好”. Where dates are missing, preserve unknown timing rather than invent a chronology. Opposing statements can remain beside each other with their actual evidence/time; do not resolve them into a synthesized final belief. A quotation, third-party opinion or hypothetical stays attributed as such.

No mode adds an unexpressed claim, motive, emotion, diagnosis or conclusion. No mode converts the model's interpretation into a quotation. Every generated unit must be traceable to the original evidence. These invariants outrank compression, smoothness and style preference.

AI output remains a derivative reading projection. It never overwrites Source, Working Input, original/human Thought body, Topic identity, durable Sections, placement intent or permissions. Human facts and user-edited derivatives are protected. OFF and ON remain two readings of the same Library, not two content systems.

## 3. Transformation policies

### Original / 原话优先

Allowed: reorder within permitted human organization boundaries, group related original sentences, remove only genuine exact duplicates while retaining all evidence refs, split long paragraphs, and add very restrained descriptive headings. Prefer literal source-span blocks, so the renderer can reuse original text without paying to generate it again.

Do not improve tone, replace characteristic words with polished synonyms, stitch clauses into a new abstract assertion, or compress different expressions merely because they appear similar. Exact duplicate removal is not permission to collapse temporally different repeated statements or near-duplicates. Meaningful fragments, hesitations and opposing views remain.

Target feeling: **我的原话，被整理了。**

### Balanced / 平衡整理 — default

Allowed: trim redundancy, merge genuinely repeated expressions, stitch continuous ideas from related Inputs, repair oral fragments, lightly improve sentence flow, reduce repeated setup, and form natural paragraphs. Retain distinctive phrases when they carry voice or emphasis.

Changes must not strengthen commitment, delete conditions, make temporary beliefs timeless, conceal contradictions or adopt someone else's words as the user's position. “像我自己认真整理过” is the objective; an executive summary, psychology report or lecture is not.

Target feeling: **像我自己认真修剪、拼接、整理过。**

### Concise / 更加概括

Allowed: materially compress repeated expressions, combine supported related statements into higher-level points, foreground the main argument and omit nonessential repetition. Greater abstraction is allowed only while its meaning remains entailed by the cited evidence.

Preserve essential limits, uncertainty, changes and contradictions even when they cost words. Do not fill a missing logical step, infer a hidden motivation, or turn the final recorded decision into the user's eternal position. A short faithful result is preferable to an impressive invented synthesis; a longer faithful result is preferable to forced compression.

Target feeling: **是我的思想的精炼版本。**

Styles are not tied to model size or price. A cheap model unable to preserve meaning cannot serve Original merely because it rewrites less.

## 4. Evidence and derivative representation

Each generated block carries internal source Entry refs, relevant Input/evidence refs, exact revision fingerprints, expression-time evidence, style enum, style-contract version, generation/prompt/model version, coverage and ownership/protection state. Exact source-span blocks additionally retain valid offsets and literal-span hashes. Grouping/nearby context does not falsely claim every source supports every sentence.

The default UI need not show bracketed citation numbers. It must support “查看原文 / 回到原输入”, preserve readable original material and distinguish stale/partial coverage. For a block combining several Entries, the evidence action exposes all actual contributors, not only one convenient quote. Unsupported/orphaned generated blocks fail validation.

Human edits to a derivative are preserved as human work. New generation is a separate candidate/version respecting current protections; a preference change is not consent to overwrite those edits. No presentation heading creates or renames a durable Section. New generated chunks cannot move content across a human keep-separate or placement constraint.

On Source purge, deletion or a stronger access prohibition, affected generated text is locally masked/invalidated immediately. Quota exhaustion cannot leave impermissible cached content readable. Merely stale style/content is a different case: old output can remain readable with a truthful version/coverage state when the underlying evidence is still permitted.

## 5. Preference change, cache and incremental work

Persist the style through the existing acknowledged preference command/normalizer, with a meaningful revision and known enum. Missing legacy value defaults to balanced without rewriting existing output. Unknown newer values are retained safely by the compatibility layer and do not silently rewrite user preference or authorize generation. Failed writes retain the last acknowledged choice. Cross-window updates respect focus and unfinished editing.

Changing style changes a lightweight global preference revision only. No Topic scan, provider dispatch, hidden refresh or quota debit follows. Existing projections retain their recorded mode and remain readable. On a subsequent Topic visit, compare the selected mode to the projection's recorded mode locally. A quiet action can say **按新方式整理**; generic opening remains free. The user's explicit action refreshes only that Topic, under AIU admission. Returning to an earlier style can reuse its still-valid exact cache key without a new call.

Semantic cache identity is Topic/evidence/human-organization revisions + actual style enum + generation contract + qualified model/prompt version. Do not invalidate useful identical-style cache simply because a global counter changed and changed back. The preference revision records causality; the enum/policy fingerprint determines transformation equality.

For incremental refresh, regenerate only affected blocks and necessary neighbors, retaining untouched blocks and all sources. A style change can require wider recomputation for the requested Topic, but not for other Topics. A model-version rollout similarly does not launch a full-library refresh. Oversized scopes require explicit truthful partial scope or deferred processing, never hidden truncation or forced summary in Original mode. No entire profile or Library is sent merely to improve prose.

The consumer preference may travel through Browser-Native Sync. Transient jobs, response handoffs, device-local generated caches, remote-processing consents, entitlement credentials and live grants do not. Existing canonical user-kept/edited work follows BNS's human-work rules and is not reclassified as disposable cache.

## 6. Fixed synthetic acceptance example

The following is invented test material, not a private archive or an actual owner's writing. All variants receive the same Topic and evidence, with human organization held constant.

| Ref / date | Original Entry |
|---|---|
| E1 / Jan 12 | 我现在更倾向方案 A，因为改动少。但成本还没算清楚。 |
| E2 / Jan 13 | 先别动原始记录，这个底线不要碰。 |
| E3 / Mar 5 | 我开始觉得 B 更合理，扩展起来可能更顺。但这只是初步感觉。 |
| E4 / Mar 8 | 我还是担心 B 太复杂；另一方面，我又希望以后少返工。 |
| E5 / Jun 2 | 这次最终决定 C，只用于新的测试组，旧流程暂时不动。长期方案我还没有想清楚。 |
| E6 / Jun 4 | 会议记录里有人说“A 已经完全失败了”。这是他的评价，不是我的结论。 |
| E7 / Jun 5 | 原始记录不能改。这个底线别碰。 |
| E8 / time unknown | 可能还是 C 更适合这轮试验，不是所有场景。 |

### Acceptable Original example

**方案的变化**

1 月 12 日：我现在更倾向方案 A，因为改动少。但成本还没算清楚。 [E1]

3 月 5 日：我开始觉得 B 更合理，扩展起来可能更顺。但这只是初步感觉。 [E3]

3 月 8 日：我还是担心 B 太复杂；另一方面，我又希望以后少返工。 [E4]

6 月 2 日：这次最终决定 C，只用于新的测试组，旧流程暂时不动。长期方案我还没有想清楚。 [E5]

时间未记录：可能还是 C 更适合这轮试验，不是所有场景。 [E8]

**原始记录**

1 月 13 日：先别动原始记录，这个底线不要碰。 [E2]

6 月 5 日：原始记录不能改。这个底线别碰。 [E7]

**一条引述**

6 月 4 日：会议记录里有人说“A 已经完全失败了”。这是他的评价，不是我的结论。 [E6]

E2 and E7 are near-duplicates, not identical strings; this mode keeps both. Dates/headings are presentation metadata, not invented user quotations.

### Acceptable Balanced example

1 月我更倾向 A，因为改动少，但成本还没算清楚。到了 3 月，我开始觉得 B 更合理，扩展起来可能更顺；这只是初步感觉。我既担心它太复杂，又希望以后少返工。 [E1,E3,E4]

6 月这次最终决定 C，但只用于新的测试组，旧流程暂时不动，长期方案仍没想清楚。另有一条时间未记录的想法：C 可能更适合这轮试验，不是所有场景。 [E5,E8]

原始记录不能改，这个底线别碰。 [E2,E7]

“A 已经完全失败了”是会议记录里别人的评价，不是我的结论。 [E6]

### Acceptable Concise example

1 月偏向改动较少的 A，成本尚不清楚；3 月开始觉得 B 可能更利于扩展，但只是初步感觉，当时也担心复杂度、希望少返工。6 月最终选 C 用于新的测试组，旧流程不动，长期方案仍未想清楚。时间未明的一条想法也只说 C 可能适合这轮试验，而非所有场景。 [E1,E3,E4,E5,E8]

原始记录不能改。别人说“A 已经完全失败了”，不代表我的结论。 [E2,E7,E6]

These examples establish semantic boundaries, not the only allowed wording. The concise result remains relatively long because this input carries several nonoptional temporal/uncertainty constraints. Compression is never enforced by deleting them.

### Mandatory negative examples

Reject “我一直认为 C 最好” (invented continuity), “B 更利于扩展” without its qualification (certainty upgrade), “A 已经失败” as the user's claim (quotation ownership), “我害怕改变，所以选择 C” (invented motive), and “所有场景都采用 C” (scope expansion). Reject an AI report prefaced “从这些内容可以看出，用户的核心诉求是……”. Reject deleting the independent E4 tension merely to produce a single clean recommendation.

## 7. Benchmark and release acceptance

Freeze a versioned synthetic set before model selection: at least 24 Topics covering evolving positions, uncertain plans, contradictory wishes, quotes/hypotheticals, characteristic slang, sparse fragments, exact/near duplicates, mixed dates/unknown time, Chinese/English, human edits, removed evidence, cross-Section constraints and very large/incremental Topics. Add held-out Topics not used for prompt tuning. Keep data synthetic/sanitized unless an author separately consents.

Generate and review all three modes under the same evidence and route budget. Store source revisions, contract/model/prompt versions and actual receipts. Compare incremental output against an independently adjudicated full-evidence reference; do not assume patching cannot accumulate drift. Add a 200+5 Entry case, unrelated Context update, style A->B->A, concurrent refresh, deletion during dispatch, manual derivative edit and stale result cases. This documentation includes fixtures/specification only; no benchmark was run or passed here.

| Metric | Definition / acceptance policy |
|---|---|
| Semantic fidelity | Adjudicated stance/condition/intensity preservation; critical changes are release-blocking |
| Unsupported claim rate | Unsupported generated claims / adjudicated claims; zero observed critical unsupported claims required, with statistical bounds disclosed |
| Original-word retention | Original mode source spans must be exact except explicitly allowed presentation normalization; generated headings counted separately |
| Voice retention | Blind author/reviewer rating; no third-person AI-report framing; characteristic phrases checked |
| Uncertainty preservation | Every annotated certainty/condition qualifier preserved in meaning; no critical loss |
| Chronology preservation | Historical/current distinction and changes retained; no invented ordering for unknown dates |
| Evidence coverage | Every generated unit has valid contributing refs; intended/covered/excluded/unavailable material reported separately |
| Compression | Output/source text ratio tracked per language/mode, not a quality override; Original near 1 after exact dedupe, Balanced often 0.55–0.9, Concise often 0.25–0.6 are exploratory ranges, not forced targets |
| “This still feels like me” | Blind within-author comparison of modes, plus helpfulness/readability and over-editing ratings |

For blind review, remove model/style labels, randomize order, keep original evidence available, and ask which version resembles the author's own careful organization rather than an AI report. Use at least 30 independent author-Topic judgments per mode in an authorized pilot, report distribution and sample size rather than an invented universal preference. Initial target: at least 80% rate ownership/voice 4 or 5 out of 5, with no unresolved critical fidelity failure. This target is not achieved evidence.

A zero observed failure count is not a population zero claim. For example, approximately 3,000 independent adjudicated opportunities with zero failures are needed for an approximately 0.1% one-sided 95% upper bound; correlated variants do not count as independent. Human-edit/delete/revocation fences additionally require deterministic adversarial tests with zero violations. Do not pay a second LLM to grade every production generation by default; offline qualification, bounded deterministic validation and explicitly consented sampled review are separate from normal user inference.

## 8. Implementation ownership

AI-COST-01/02 establish semantic fingerprints, receipts and admission first. AI-COST-05 implements the three policies, projection cache/incremental coverage and Settings preference through existing owners. SET2-01 consumes the preference row; SET2-05 adds its actual production visual/keyboard/persistence/no-network tests. TOPIC-05.7 consumes the same derivative contract. BNS adds only the consumer preference codec under its own compatibility plan. No second preference store, second Topic reader, new durable Section family or automatic paid task is introduced by this document.
