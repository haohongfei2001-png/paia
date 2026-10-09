# AI-COST-07 — frozen offline qualification preparation

Status: **DESIGN + CALIBRATION DATA + GAP AUDIT**. No evaluator runtime, model execution, independent held-out corpus, semantic reference, author review or quality qualification is delivered here. Ordinary implementation of a future offline evaluator needs the coordinator's review of this design and a separate bounded runtime assignment. Any live provider or consented author pilot retains the existing explicit authorization boundaries.

## Authority and exact base

Source base: `707dd125bb48d75aaad2cb89b4b98ddc66837bbb`. Canonical requirements are AI_USAGE_PLAN §9 and §12 AI-COST-05/06/07, AI_ORGANIZE_STYLE_CONTRACT (AIOS-1.0) §7, AI_USAGE_ARCHITECTURE §12/15, and the AIU-QWEN-1.0 amendment in AI_USAGE_REFERENCES. `tests/fixtures/ai-qwen-offline-v1/review-contract.json` freezes twelve actual canonical/runtime/benchmark owner SHA-256 values; its digest and the corpus bytes are in `freeze.json`.

Qwen primary Organize candidate remains the exact qualified `qwen3.8-max-0902` API/region profile, with alias resolution a separately recorded version. Flash non-thinking Assist and optional Flash/Plus challengers have separate qualification evidence. A route name or this corpus does not qualify a model. Same material and same billed output cap apply to all three styles; reasoning and final usage must remain separately recorded where supplied. The plan's proposed $50 pilot ceiling is a proposal, not spending authority. Nothing here creates credentials, accounts, transport, a model grader, production worker activation or CI/version changes.

## Actual gap

The current `topic-quality-round5-benchmark.mjs` has 21 deterministic Topic proposal-policy cases. The Context benchmark has 60 retrieval Topics and 240 queries; its held-out query wording is not an independently authored Organize held-out set or author preference review. Existing source-span, V3 manifest, protection, cache and session tests certify their stated local mechanics. They do not supply the required model-generated, three-style semantic/voice blind qualification package.

The audit directly calls the existing `validateIncrementalChild` codec: 24 controlled literal Original envelopes validate, and 24 modified Original statements fail. The same codec admits 48 controlled Balanced/Concise envelopes whose valid refs/spans accompany an added unsupported statement. This exposes the distinction between structural support and semantic fidelity. It is neither a model observation nor a change to production validation. Human semantic adjudication and the independent reference remain open gates.

## Frozen calibration data

`calibration.json` contains **24 invented Topics, 315 Entries**, and no private archives. `SYN-Axx` groups and `human:true` express synthetic fixture ownership; they are not real authors, ratings or consent. All semantic references, reviews and model runs are `NOT_RUN`. Every active Entry carries a whole-statement fidelity obligation; critical annotations carry exact UTF-16 offsets, literal text and complete-grapheme boundaries. Number substrings are quantity/date/identifier obligations, never proof that matching digits preserve meaning. Revisions, removal, Section and known/unknown time are explicit.

| Topics | Required challenge |
| --- | --- |
| 01–05 | evolving positions, conditional plans, unresolved contradictions, quoted attribution, hypothetical statements |
| 06–10 | characteristic voice/intensity, sparse fragments, exact/near duplicate distinction, unknown time, bilingual uncertainty |
| 11–13 | current human revision, removed evidence, human Section boundaries |
| 14 | 200 + 5: ten waves of 20 then five; one affected-scope child per wave |
| 15 | 60 Entries, three physical children of 20, one atomic logical closure |
| 16–18 | combining marks/emoji, unrelated and relevant Context drift as separate Assist scenarios |
| 19–24 | exact counts/time, emotion intensity, uncertain causality, chronology correction, in-flight deletion, protected derivative edit/Keep/manual override/style ABA/concurrency |

Topic 14's literal full projection is 3,074 UTF-16 units, within the current 4,000-unit `currentView` bound. This is a feasible fixture schedule, not a new output allowance or measured tokenizer budget. Topic 15 uses the existing maximum of four physical children, without inventing one unbounded job. Performance/token tails and genuinely long prose need separate qualified model cases; a large count alone does not establish them.

Twelve held-out Topics are **reserved, actual count zero**. Calibration is available for interface/prompt tuning. After corpus and contract freeze, another independent author must create a separate held-out file and split receipt; do not copy calibration text or claim independence merely because a random split has a different label. If held-out is subsequently consulted for tuning, retire its qualification status and freeze a new independent set. The synthetic set's 24 Topics do not satisfy the minimum of 30 independent human author-Topic judgments per mode.

## Reuse existing owners, no parallel generation pipeline

The proposed fixture adapter must create synthetic records through the actual OrganizerStore typed owners, create and place actual Topic/Section evidence, then set style through the real preference owner. It must not write candidate/job/manifest/provenance DTOs straight into IDB.

1. Construct the existing Foundation and `LocalOrganizeSession` with the explicit offline constructor configuration. Use `prepare({topicId, children, refreshStyle})`, actual canonical revisions and V3 scope proof. All three style variants receive the same authorized evidence, Section constraints, profile and policy budget; explicit refresh differs only as the existing contract allows.
2. A later authorized offline replay adapter may supply previously frozen synthetic output artifacts through the existing constructor's provider interface. It has no transport. `run(handle, provider)` remains the sole execution/validation/attempt/commit route. Each settled Topic/phase may use a fresh session instance to respect the existing private eight-handle bound; this is not permission to replay an unknown attempt or remint jobs from TTL expiry. A replay must not bypass usage identity, output bounds, source spans, invalid/unknown outcome or final protection checks. An intentionally unsupported replay is a codec/mechanics negative, not a model score.
3. Read back the actual job, physical children, validated candidate, scope/Entry revisions, generation manifest, decisions and field provenance. A candidate remains separate from explicit adoption. Use the existing adoption owner before exercising `editAIPresentation`, manual override or Keep; do not fabricate a protected saved presentation.
4. Record before/after canonical Entry and protected presentation digests. Human edit, removal, permission/revocation, stale scope, style ABA and concurrent result tests require actual owner mutations and actual refusal/no-resurrection observations. Unknown attempt/output must never become a fresh paid retry merely to complete a table.
5. Compare incremental results against a **separately adjudicated full-evidence reference** over the same eligible evidence and human organization. A model's full output is a candidate for adjudication, not automatic ground truth. Check every affected and retained field, source obligation, exclusion and manifest revision.

Topics 17/18 describe separate `LocalAssistSession` tests using current manual Context authority, not fictitious Context automatically added to Organize payloads. Use the existing private current-reply lease and Context revision/permission fence for these cases; no current-host capture or worker activation is implied. Full Source-driven Context dependency closure is not claimed by the manual Context scenario.

## Artifacts and receipt interface

`review-contract.json` gives the required field names and status vocabulary. A future artifact reader must reject absent, unknown, duplicated or cross-version identity fields before producing a score packet. Normalized evaluation statuses retain the exact owner state/error code separately, including NO_DELTA, CACHED, DEFER, budget/stale/cancelled refusal and unavailable scope. It must record unavailable evidence and preserve failed/unknown outcomes; do not substitute empty successful output.

Each generation receipt binds corpus/split digests, actual runtime commit and owner digests, AIOS/prompt/route/tokenizer versions, exact model ID and alias observation, provider API/region/thinking profile, complete input payload digest, exact Entry versions, logical job and child attempt receipts, outcome, proposal/candidate/decision/span/provenance digests, and protected before/after state. Usage must distinguish input, output including reasoning, cache read/write, native currency, ratebook and FX versions. Missing bill/rate reconciliation is unknown cost, not zero cost or profitability.

Output artifacts keep generated text with synthetic evidence only. Durable identity/digest metadata must never be treated as permission to upload real bodies. Actual model receipts are currently absent; do not populate their required fields with fixture job identifiers and present them as observed model execution.

Human review records require packet/output identity, opaque reviewer ID, reviewer kind, consent receipt, versioned scale, ratings, claim adjudications, unresolved critical items and timestamp. Only a separately authorized **human author** supplies ownership/helpfulness/overediting/voice preferences. An independent human semantic reviewer can adjudicate fidelity but cannot stand in as the author. Fixture designers, script defaults and LLM graders cannot manufacture human-author ratings. Synthetic topics have no real author; author acceptance requires an additional consented author-Topic pilot.

## Three-style blind review and scoring contract

Freeze random assignment seed commitment and private packet-to-style/model mapping before review. Expose original evidence, source revision, known/unknown time, exclusions/unavailable evidence and output; hide style/model/provider/route/price labels. Use paired review over all three variants with randomized order. Wording can reveal style, so report label blindness and assess leakage; never guarantee complete blindness. Semantic reference authors must not see provider identity while adjudicating.

| Metric | Full denominator and treatment |
| --- | --- |
| fidelity / unsupported claims | all generated assertions independently adjudicated; unresolved assertions remain explicit, with unsupported count and unresolved count separately |
| uncertainty / conditions / negation / attribution / quantity | all applicable frozen obligations, including non-keyword whole-statement meaning; missing or intensified qualifiers count against preservation |
| chronology | all applicable adjudicated temporal relationships, including unknown time and corrected prior statements; no invented precision |
| evidence coverage | intended, eligible, covered, exact-deduped, excluded, removed and unavailable Entry IDs/counts separately; refs alone do not establish semantic coverage |
| Original retention | every generated Original unit and its exact current-revision spans; separately report restrained headings and any explicitly authorized presentation normalization |
| compression | output/source text units per language and mode, alongside eligible evidence and exact dedupe; exploratory AIOS ranges are not pass thresholds |
| ownership / voice / helpfulness / overediting | all completed authorized human author-Topic judgments, per mode; refusals, missing review and unreviewed packets reported, never silently dropped |
| protection / concurrency / stale results | all predeclared adversarial owner cases and individual violation counts; critical human overwrite, revoked read or resurrection blocks qualification |

No newly invented acceptance threshold is introduced. Canonical targets remain routing ≥95%, duplicate formation ≤1%, needless formation ≤2%, unsupported Context/high-risk filtering ≤0.1%, and zero observed critical violations. Routing/duplicate/filter metrics require their own eligible independently adjudicated opportunity sets; do not reuse a 24-Topic style corpus as their population denominator. The author pilot requires ≥30 independent author-Topic judgments per mode, with initial ownership/voice 4–5 target ≥80% and no unresolved critical fidelity failure. These are targets, not achieved results.

Freeze sampling unit and clustering before collection. Three correlated style variants, repeated trials, characters, evidence refs, fields and many judgments from one author do not create independent Topics. Report paired comparisons and author/Topic clusters. For a genuinely independent zero-event sample, the illustrative one-sided 95% bound is `1 - 0.05^(1/n)`; n=24 gives about 11.7%, while n=3,000 gives about 0.0998%. Those are mathematical illustrations, not observed safety rates. Unknown independence yields `NO_POPULATION_CLAIM`; inadequate samples stay pending. Nonzero-event intervals and clustered author estimates must be predeclared and independently reviewed before implementing the reporter.

## Bounded next implementation request

After independent design approval, request a separate assignment for: offline actual-owner fixture loading; strict frozen artifact reading without network; deterministic blind packet formatting with a private assignment map; manual human receipt validation; and explicit denominator/confidence reporting. Keep generic statistical helpers separate from claimed product scores. No transport, provider dispatch, automatic LLM grader, domain migration, author consent automation, CI workflow or production activation belongs to that assignment.

Still required before AI-COST-07 qualification: independently authored held-out freeze; independent semantic full-evidence references; actual authorized exact-model/API/region outputs and usage reconciliation; supported workloads/tails/failure/defer/cache/unknown cases; real consented human author blind judgments; enough independent opportunities for claimed error bounds; protected owner and real-effect gates; final reviewed exact-head integration. This preparation does not close any of those gates.
