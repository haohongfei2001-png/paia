# PAIA AI Usage Cost Model

Model version: **AIU-COST-1.0**. Prices checked **2026-10-07**. Currency: USD.
Status: **CALCULATED_SCENARIOS / NOT_OBSERVED_USER_COST / NO_PAID_CALLS_RUN**.

**Current primary view: Qwen CNY, AIU-QWEN-1.0, reviewed 2026-10-08, section 11 below.** Sections 1–10 retain the dated original USD reference, workload and arithmetic for comparison; their non-Qwen models are not competing primary production routes and their prices are not newly reverified by this amendment. The exact section 3 workload and section 9 tuples remain the comparison baseline. No entitlement changes follow from a different price vector.

[AI_USAGE_ARCHITECTURE.md](AI_USAGE_ARCHITECTURE.md) sections 2 and 10 alone define entitlement and initial safety limits. This document is a parameter model, not another quota contract, a provider qualification, a subscription price or permission to spend. No real user content or measured MAU distribution was used.

## 1. Official price inputs

Uncached standard text inference, USD per one million billable tokens:

| Official model/route | Input | Output | Use in this analysis |
|---|---:|---:|---|
| OpenAI GPT-6.1 Sol | 2.00 | 10.00 | Quality-class reference |
| OpenAI GPT-6 Luna | 0.10 | 0.50 | Low-cost candidate, only after qualification |
| OpenAI GPT-6 Astra | 10.00 | 50.00 | Expensive-route sensitivity, not a default |
| Google Gemini 2.5 Flash | 0.30 | 2.50 | Base maintenance / assist reference |
| Google Gemini 2.5 Flash-Lite | 0.10 | 0.40 | Lower-price sensitivity |
| Google Gemini 2.5 Pro | 1.25 | 10.00 | Alternative quality-class price, prompts <=200k |
| Anthropic Claude Sonnet 5.5 | 2.00 | 10.00 | Independent quality-class reference |
| Anthropic Claude Haiku 4.5 | 1.00 | 5.00 | Higher maintenance / assist price sensitivity |
| Anthropic Claude Opus 5.5 | 4.00 | 20.00 | Higher quality-route price sensitivity |

Sources: [OpenAI official pricing](https://developers.openai.com/api/docs/pricing), [Google official pricing](https://ai.google.dev/gemini-api/docs/pricing), [Anthropic official pricing](https://platform.claude.com/docs/en/about-claude/pricing). The OpenAI figures above use its short-context Standard tier. Qualification must confirm actual model availability, region, tokenizer, context-rate boundary and billable reasoning behavior at activation. A listed rate is not a guarantee that the model meets PAIA's fidelity or latency requirements.

The base case does not assume provider Batch/Flex discounts, free trial credits, regional discounts or provider prompt-cache hits. Provider caching can charge cache writes/storage and still invokes inference; it is distinct from PAIA's application-result cache, whose repeated reads incur no model request. Google output rates include thinking tokens; tokenizers differ across providers. Count actual billable tokens, not a universal characters/4 conversion. Commercial paid processing terms must cover Free PAIA users too; a free consumer tier does not imply permission to use a provider's differently governed free API tier.

## 2. Formula and accounting units

For a physical request:

`cost = (uncached_input * input_rate + cached_input * cached_rate + cache_writes * write_rate + billable_output * output_rate) / 1,000,000 + applicable_tool_or_storage_fees`.

This model sets provider cached-input, cache-write/storage and tool fees to zero by not using those facilities. Tools, grounding and browsing are disabled for these jobs. A no-delta skip, local rule decision or application cache hit has zero physical requests and zero model tokens.

Distinguish potential window, available eligibility check, meaningful admitted cycle, physical child request/attempt, effective committed result, local cache hit, no-delta skip, local-resolved skip, incremental generation and full scoped refresh. These are different counters. One cycle can use two bounded requests; a failed paid attempt can cost money without producing an effective result.

Base vectors:

- Maintenance/Assist: input 0.30, output 2.50 USD/MTok.
- Organize: input 2.00, output 10.00 USD/MTok, represented independently by Sol/Sonnet pricing.
- Incremental Organize: 4,000 input + 1,200 output -> **$0.02000**.
- Typical full scoped Organize: 16,000 input + 6,000 output -> **$0.09200**.
- Assist generation: 2,000 input + 300 output -> **$0.00135**.
- AI Filter marginal work in an existing maintenance request: 500 additional input + 200 additional output -> **$0.00065 per ambiguous batch**, not a new request.

A “full scoped refresh” is a typical bounded Topic/scope fitting one request, not an arbitrary entire historical Library. Larger Topics require more bounded children or a clearly selected partial scope. Original-word mode can often return grouping/source spans rather than re-emitting original prose; this potential saving is not assumed in the base average. No mode is assigned a cheaper model solely because of its label.

## 3. Explicit workload assumptions

Thirty-day month. “P99 scenario” is a synthetic high-use stress persona, not a measured 99th percentile. All distributions below are proposed planning assumptions, not analytics from this product.

| Tier/persona | Active days | Inputs/active day | Meaningful cycles/month | Physical maintenance requests | Mean maintenance input/output per request | Organize results | Full-refresh share | Assist results | Filter batches within maintenance |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| Free light | 8 | 5 | 4 | 4 | 3,000 / 400 | 2 | 50% | 2 | 0 |
| Free normal | 20 | 30 | 24 | 24 | 7,000 / 1,000 | 12 | 25% | 12 | 0 |
| Free heavy | 28 | 100 | 60 | 84 | 9,000 / 1,400 | 56 | 10% | 56 | 0 |
| Free P99 scenario | 30 | 300 | 84 | 168 | 12,000 / 1,800 | 90 | 10% | 90 | 0 |
| Pro light | 8 | 5 | 8 | 8 | 3,000 / 400 | 5 | 50% | 8 | 2 |
| Pro normal | 22 | 30 | 66 | 66 | 5,000 / 800 | 40 | 20% | 66 | 20 |
| Pro heavy | 28 | 100 | 168 | 200 | 8,000 / 1,200 | 180 | 15% | 336 | 80 |
| Pro P99 scenario | 30 | 300 | 300 | 450 | 11,000 / 1,600 | 500 | 10% | 900 | 250 |

Token assumptions include instruction/context overhead for maintenance, excluding the separately shown marginal filter tokens. Do not add a second whole maintenance cost for filtering. Fewer calls per Input are obtained by local eligibility, dedupe, accumulated evidence and batching; longer meaningful Inputs still increase cost or queue pressure. The model does not claim every 300-Input day fits regardless of length.

For reproducibility, a plausible window decomposition under the same workload is:

| Tier/persona | Potential active-day windows | Available checks | No-delta skips | Entirely local-resolved skips | Meaningful cycles | Unavailable opportunities |
|---|---:|---:|---:|---:|---:|---:|
| Free light | 24 | 12 | 6 | 2 | 4 | 12 |
| Free normal | 60 | 50 | 20 | 6 | 24 | 10 |
| Free heavy | 84 | 80 | 16 | 4 | 60 | 4 |
| Free P99 scenario | 90 | 90 | 4 | 2 | 84 | 0 |
| Pro light | 192 | 32 | 20 | 4 | 8 | 160 |
| Pro normal | 528 | 132 | 50 | 16 | 66 | 396 |
| Pro heavy | 672 | 224 | 40 | 16 | 168 | 448 |
| Pro P99 scenario | 720 | 360 | 50 | 10 | 300 | 360 |

Potential windows = active days times policy maximum. Available checks = no-delta + local-resolved + meaningful cycles. Unavailable opportunities are not replayed into paid calls. These counts model opportunity and do not assert a continuously running browser.

Application-cache assumption: five organized-reading opens per new Organize result (80% reads reuse an existing result), and 2.5 intentional AI-suggestion opens per new Assist result (60% reuse). Thus normal Free has 60 organized opens but only 12 new results, and normal Pro has 200 opens but only 40 new results. Ordinary Smart Orb opens and unviewed completed replies add no paid requests. The cost table already uses the post-cache generation counts; do not apply a second cache discount.

Incremental/full result counts are Organize results times `(1 - full_share)` and `full_share`. Fractional counts are expectations, not literal receipts. Normal Pro therefore has 32 incremental and eight typical full results, costing `32 * .020 + 8 * .092 = $1.376`.

## 4. Monthly cost by user scenario

| Tier/persona | Maintenance | Organize | Assist | AI Filter marginal | Embedding | Raw model cost | Planning cost incl. 15% reserve |
|---|---:|---:|---:|---:|---:|---:|---:|
| Free light | 0.00760 | 0.11200 | 0.00270 | 0 | 0 | 0.12230 | **0.14065** |
| Free normal | 0.11040 | 0.45600 | 0.01620 | 0 | 0 | 0.58260 | **0.66999** |
| Free heavy | 0.52080 | 1.52320 | 0.07560 | 0 | 0 | 2.11960 | **2.43754** |
| Free P99 scenario | 1.36080 | 2.44800 | 0.12150 | 0 | 0 | 3.93030 | **4.51985** |
| Pro light | 0.01520 | 0.28000 | 0.01080 | 0.00130 | 0 | 0.30730 | **0.35340** |
| Pro normal | 0.23100 | 1.37600 | 0.08910 | 0.01300 | 0 | 1.70910 | **1.96547** |
| Pro heavy | 1.08000 | 5.54400 | 0.45360 | 0.05200 | 0 | 7.12960 | **8.19904** |
| Pro P99 scenario | 3.28500 | 13.60000 | 1.21500 | 0.16250 | 0 | 18.26250 | **21.00188** |

The 15% is an explicit planning allowance for qualified-route variation, billable failures/unknown outcomes and modest token-estimation error. It is not a measured failure rate, a second user charge or a reason to retry. Tail events and service outages can exceed it; safety admission still uses bounded reservations. Taxes, hosting, identity, payment fees, support, sync storage and engineering are not included.

Weighted Free mix = 60% light, 32% normal, 7% heavy, 1% synthetic tail. Weighted Pro mix = 20%, 60%, 18%, 2%. Under these assumed distributions:

- **Free: $0.51461005 per MAU-month**, including reserve.
- **Pro: $3.14582270 per subscriber-month**, including reserve.

These mean estimates assume the modeled populations use paid AI at the stated rates. A Free MAU that never enables/uses remote AI or has no new work has model cost near zero. If only fraction `p` follows the modeled AI workload and the rest has no model use, Free cost is `p * 0.51461005`; at p=50%, it is about $0.2573. Likewise, inactive Pro subscriptions reduce the mean. Real MAU, conversion, use distribution and pricing are unknown and must replace these assumptions before a commercial margin claim.

Organize accounts for **76.9% of weighted Free raw inference cost and 78.7% of Pro** in this base case. It is the dominant optimization target: output length, full-refresh rate and incremental fidelity matter more than shaving tiny local-filter work. Heavy semantic ingestion can change that balance; report actual mix rather than hard-coding 80% as a permanent fact.

## 5. User-count scaling

Monthly USD, includes the same 15% model-cost reserve, excludes nonmodel costs:

| Population size | All Free at assumed Free mix | All Pro at assumed Pro mix | Illustrative 90% Free / 10% Pro |
|---|---:|---:|---:|
| 1,000 | 514.61 | 3,145.82 | **777.73** |
| 10,000 | 5,146.10 | 31,458.23 | **7,777.31** |
| 100,000 | 51,461.01 | 314,582.27 | **77,773.13** |

General formula: `monthly = N_free * C_free + N_pro * C_pro`. The 10% conversion share is an example, not a forecast. Variable uptake, retained-but-inactive users, language/token length and distribution tails can materially change these totals. A model cost of roughly $3.15 does not by itself justify a subscription price or prove profitability.

A service planning envelope may use 1.5 times forecast only within an independently approved operator budget. The corresponding illustrative 90/10 forecasts would suggest approximately $1.17k / $11.67k / $116.66k before nonmodel costs; these are not authorized budgets. Architecture admission remains disabled when the approved global amount is unset.

## 6. Free maintenance: why three windows

Compare identical daily meaningful content, not three independent uploads of the same corpus. Suppose a day has 6,000 semantic input tokens and 1,200 total output tokens, with per-actual-call overhead of 1,000 input and 150 output tokens. At the reference maintenance rates:

`daily cost(K) = $0.004800 + K * $0.000675`, where K is actual meaningful calls, not scheduled windows.

| Meaningful calls/day in this illustrative split | Cost over 20 active days | Nominal mean wait with evenly spaced windows |
|---|---:|---:|
| 1 | 0.10950 | 12 h |
| 2 | 0.12300 | 6 h |
| 3 | 0.13650 | 4 h |

In this controlled comparison, moving from one to three costs about $0.027/month extra, not three times the entire content cost. This is why three delta-gated opportunities are preferred. More windows can still waste context/output overhead if batches are too small; coalescing and strict delta checks remain necessary. Empty windows cost zero. Real delays also include device availability, service failure, budget and overflow; they are not a freshness SLA.

## 7. Why 100/day is not a sufficient safety budget

Ignoring all other controls, 100 typical incremental Organize results/day at $0.020 cost **$60/month**. One hundred typical full results/day at $0.092 cost **$276/month**. If each full logical result needs four such children, count-only permission could reach **$1,104/month**, even before maintenance/assist or a more expensive route. The physical-attempt and token limits reduce this exposure further, but do not replace a dollar reservation.

At the same one-child full workload, the $10/$50 premium price vector is five times the base quality vector. A price-based fallback can therefore dominate the bill. No such automatic fallback is assumed or authorized.

The Architecture's separate feature, rolling user and global caps are what contain heavy-tail exposure. The Pro rolling-30-day aggregate envelope is $30, with separate feature envelopes inside it; the reference synthetic tail at about $21 including reserve fits, but 100 full Topics/day does not. Normal UI should say high allowance, not promise infinite large-topic work. Repeated legitimate safety stops require product/cost-policy revision before wider sales, not a hidden degraded model or misleading error.

A dollar ceiling is only as trustworthy as server-side atomic reservation, bounded billable output, a current ratebook and reconciliation. Client counters, unknown provider pricing, asynchronous dashboard limits or cleared unknown-outcome reservations cannot prove a hard bound. Budget qualification must test these cases before activation.

## 8. Sensitivity and future embeddings

Hold token/workload assumptions constant solely to compare price vectors; actual providers may tokenize the same text differently and may not pass the same quality gate.

| Price scenario | Maintenance / Assist input-output | Organize input-output | Weighted Free | Weighted Pro |
|---|---|---|---:|---:|
| Lower-price qualified candidate | 0.10 / 0.40 | 1.25 / 10.00 | **0.36890** | **2.28420** |
| Base | 0.30 / 2.50 | 2.00 / 10.00 | **0.51461** | **3.14582** |
| Higher-price qualified candidate | 1.00 / 5.00 | 4.00 / 20.00 | **1.09995** | **6.68037** |

An across-the-board 30% token-count increase at base rates raises the means to about **$0.66899 Free / $4.08957 Pro**. This is a sensitivity parameter, not a claim of one universal tokenizer ratio. Doubling relevant generation output disproportionately affects Organize. Rising full-refresh share or lower-than-assumed result-cache reuse also increases cost; when measuring cache effects, hold user intent/read frequency constant rather than discounting already post-cache counts again.

Remote embeddings are not adopted in browser v1, hence zero in all base tables. A future embedding model needs `C_embed = (new_or_changed_document_tokens + uncached_query_tokens) * official_embedding_rate / 1M`, plus vector storage/operations if any. Cache by content revision/model version and invalidate removals locally. Re-embedding unchanged synced content or using a generator for every lexical query is prohibited. Qualification must compare lexical and local-embedding baselines first and fetch an official embedding rate at that time. No unverifiable embedding price is invented here.

## 9. Reproduction snippet

This code block is calculation documentation, not production runtime. Values are synthetic inputs. It reproduces the raw/per-persona/weighted results; window/cache decompositions above do not incur additional calls.

```python
R_M, R_O, R_A = (0.30, 2.50), (2.00, 10.00), (0.30, 2.50)
# name, M_calls, M_input, M_output, O_results, full_share, A_results, filter_batches, mix
FREE = [
    ('light', 4, 3000, 400, 2, .50, 2, 0, .60),
    ('normal', 24, 7000, 1000, 12, .25, 12, 0, .32),
    ('heavy', 84, 9000, 1400, 56, .10, 56, 0, .07),
    ('p99_scenario', 168, 12000, 1800, 90, .10, 90, 0, .01),
]
PRO = [
    ('light', 8, 3000, 400, 5, .50, 8, 2, .20),
    ('normal', 66, 5000, 800, 40, .20, 66, 20, .60),
    ('heavy', 200, 8000, 1200, 180, .15, 336, 80, .18),
    ('p99_scenario', 450, 11000, 1600, 500, .10, 900, 250, .02),
]
def cost(i, o, rate):
    assert i >= 0 and o >= 0 and min(rate) >= 0
    return (i * rate[0] + o * rate[1]) / 1_000_000

def evaluate(rows, rm=R_M, ro=R_O, ra=R_A):
    assert abs(sum(r[-1] for r in rows) - 1) < 1e-9
    mean = 0.0
    for name, mc, mi, mo, oc, f, ac, fc, weight in rows:
        m = mc * cost(mi, mo, rm)
        o = oc * ((1-f)*cost(4000, 1200, ro) + f*cost(16000, 6000, ro))
        a = ac * cost(2000, 300, ra)
        marginal_filter = fc * cost(500, 200, rm)
        raw = m + o + a + marginal_filter
        planned = raw * 1.15
        mean += planned * weight
        print(name, m, o, a, marginal_filter, raw, planned)
    return mean

cf, cp = evaluate(FREE), evaluate(PRO)
print('weighted', cf, cp)
for n in (1_000, 10_000, 100_000):
    print(n, n*cf, n*cp, n*(.9*cf + .1*cp))
```

## 10. Production budget acceptance

Instrument no-delta, local-resolved, unavailable, cache-hit and physical dispatch separately from the first implementation slice. Validate result quota against actual committed outcomes and reconcile every billed/unknown attempt. Report mean, p50/p95/p99 and maximum with denominators and sample sizes, not just cost per successful request. Track cost per active AI user as well as per MAU/subscriber.

Before commercial activation, replace workload assumptions with an authorized small pilot, confirm billable token categories and actual route quality, test the synthetic tail and adversarial concurrency, and verify that typical promised use is not routinely stopped by hidden safety limits. No real provider/financial/user-data validation occurred in this design task.

## 11. Qwen Primary Cost Profile — CNY / AIU-QWEN-1.0

### 11.1 Official price inputs and comparison scope

Reviewed 2026-10-08; official Alibaba sources Q01–Q16 are in [REFERENCES](AI_USAGE_REFERENCES.md). The primary calculation uses Beijing Standard text tariffs, CNY per million billable tokens, no promotion, free trial, provider cache or Batch discount. Provider API qualification and commercial account terms remain pending. All named routes are candidates, not production PASS.

| Candidate / billing scope | Input | Total billed output | Implicit cached input | Explicit create / read | Batch File input / output |
|---|---:|---:|---:|---|---|
| qwen3.8-max, Beijing main alias | 12 | 36 | 1.5 | 15 / 1 | 6 / 18, supported on model page |
| qwen3.8-max-0902 snapshot, Beijing | 12 | 36 | 1.5 | 15 / 1 | Not listed as supported; do not inherit main-alias Batch |
| qwen3.8-flash, Beijing | 0.8 | 2.7 | 0.1 | 1.25 / 0.1 on model-specific page | Conflicting official support lists; not admitted or discounted |
| qwen3.7-plus, Beijing, input <=256k | 2 | 8 | 0.4 | 2.5 / 0.2 | 1 / 4 where qualified |
| qwen3.8-max, Singapore international, CNY page | 14.988 | 44.965 | 1.874 | 18.736 / 1.274 | Not supported on model page |
| qwen3.8-flash, Singapore international, CNY page | 1.094 | 3.427 | 0.117 | 1.458 / 0.117 | Not assumed |

The Flash explicit-create price is intentionally transcribed from its specific page, not recomputed as 125% of 0.8. Resolve the conflict with generic cache guidance against the actual SKU before explicit-cache activation. The baseline never uses this price. Plus's long-context tier is irrelevant to the frozen bounded workloads, but a future ratebook must still retain length bands. The inspected Tokyo Plus currency/rate presentation needs confirmation and is not used here.

International-account Max prices are a different native USD tariff: Singapore 2/6 and Beijing/global entries 1.65/4.951 input/output on the international official page. These are not obtained by converting the table above. Use the actual account market, workspace, model, deployment scope and invoice currency; never select whichever public table is cheaper. A CNY scenario does not certify a worldwide rollout or US-only residency. The prior multi-vendor USD table remains historical comparison evidence.

All output counts below mean **total billable completion tokens including reasoning**, not only visible text. For non-thinking profiles this equals final generation; thinking consumes part of the same envelope. No hidden reasoning is free. The initial comparison holds the original token numbers constant so it isolates prices/routing; actual Qwen tokenization and quality under those limits must be measured. Source-span output savings in original mode are also not assumed.

### 11.2 Three scenarios and unchanged-baseline rule

**A — All Max:** original section 3 activity, window/cycle counts, physical requests, token lengths, refresh counts, incremental/full shares, Assist/filter counts, weights and application-cache assumptions; every billed task uses Max. This is an all-Max price comparator, not an absolute upper bound on arbitrary usage or an admitted production workload.

**B — Recommended routing:** the same original workload, with 90% of maintenance requests priced at Flash and 10% directly at Max; Organize uses Max; Assist uses Flash. Marginal filter tokens use the same maintenance mix and remain inside the existing requests. The 10% is a transparent risk-routing sensitivity assumption, not measured demand, a quota or evidence that Flash qualifies. No second-stage request is hidden in this baseline. The mixed maintenance vector is 1.92 input / 6.03 output CNY per million tokens.

**C — Max-heavy offered-load sensitivity, separate from A/B:** keep the original active days, Input counts, primary maintenance counts, Organize/Assist/filter result counts and population weights, but change only the stated stress variables: maintenance primary I/O doubles, with 50% directly Max and 50% Flash; 20% of the Flash first passes add one scoped Max adjudication using the original per-request I/O, so additional maintenance requests equal 0.1 times original N. Organize full-refresh share doubles, capped at 100%, and its I/O doubles. Assist I/O doubles with 20% Max. Filter marginal I/O doubles at the 50/50 primary mix, plus 0.1 times its original Max marginal cost for the extra adjudication. No cache/Batch discount.

C is **not an allowed-use forecast or a new entitlement**. Many doubled per-request scopes exceed the unchanged input/output/child limits; real admission must partition within the existing limits, defer or refuse. Any extra repeated prompts needed by repartitioning add cost beyond this simple token-volume stress. Therefore C illustrates margin pressure, not a mathematically absolute worst-case ceiling. All unknown/billed attempts remain reserved, and global/user/feature caps continue to bound admitted work. A/B also require within-day scheduling and tokenizer/overhead proof; monthly averages alone do not certify that every request fits.

### 11.3 Monthly CNY cost by persona

Columns M/O/A/F are maintenance, Organize, Assist and marginal AI Filter. Embedding is zero throughout, unchanged from v1. Raw is their sum; reserve is 15%; planned is raw plus reserve. Rounded presentation can differ slightly from sums of rounded cells; weights use unrounded values. The reserve is a planning allowance, not a measured failure rate, extra entitlement debit or substitute for worst-case admission reservation. Excludes taxes, gateway/hosting, payment/FX fees, support, storage and engineering.

**A — All Max, unchanged workload**

| Tier / persona | M | O | A | F | Raw | 15% reserve | Planned |
|---|---:|---:|---:|---:|---:|---:|---:|
| Free light | 0.20160 | 0.49920 | 0.06960 | 0 | 0.77040 | 0.11556 | 0.88596 |
| Free normal | 2.88000 | 2.04480 | 0.41760 | 0 | 5.34240 | 0.80136 | 6.14376 |
| Free heavy | 13.30560 | 6.88128 | 1.94880 | 0 | 22.13568 | 3.32035 | 25.45603 |
| Free synthetic tail | 35.07840 | 11.05920 | 3.13200 | 0 | 49.26960 | 7.39044 | 56.66004 |
| Pro light | 0.40320 | 1.24800 | 0.27840 | 0.02640 | 1.95600 | 0.29340 | 2.24940 |
| Pro normal | 5.86080 | 6.18240 | 2.29680 | 0.26400 | 14.60400 | 2.19060 | 16.79460 |
| Pro heavy | 27.84000 | 24.96960 | 11.69280 | 1.05600 | 65.55840 | 9.83376 | 75.39216 |
| Pro synthetic tail | 85.32000 | 61.44000 | 31.32000 | 3.30000 | 181.38000 | 27.20700 | 208.58700 |

**B — Recommended Qwen routing, unchanged workload**

| Tier / persona | M | O | A | F | Raw | 15% reserve | Planned |
|---|---:|---:|---:|---:|---:|---:|---:|
| Free light | 0.03269 | 0.49920 | 0.00482 | 0 | 0.53671 | 0.08051 | 0.61721 |
| Free normal | 0.46728 | 2.04480 | 0.02892 | 0 | 2.54100 | 0.38115 | 2.92215 |
| Free heavy | 2.16065 | 6.88128 | 0.13496 | 0 | 9.17689 | 1.37653 | 10.55342 |
| Free synthetic tail | 5.69419 | 11.05920 | 0.21690 | 0 | 16.97029 | 2.54554 | 19.51584 |
| Pro light | 0.06538 | 1.24800 | 0.01928 | 0.00433 | 1.33699 | 0.20055 | 1.53754 |
| Pro normal | 0.95198 | 6.18240 | 0.15906 | 0.04332 | 7.33676 | 1.10051 | 8.43728 |
| Pro heavy | 4.51920 | 24.96960 | 0.80976 | 0.17328 | 30.47184 | 4.57078 | 35.04262 |
| Pro synthetic tail | 13.84560 | 61.44000 | 2.16900 | 0.54150 | 77.99610 | 11.69942 | 89.69552 |

**C — Separate Max-heavy offered-load sensitivity, before admission stops**

| Tier / persona | M | O | A | F | Raw | 15% reserve | Planned |
|---|---:|---:|---:|---:|---:|---:|---:|
| Free light | 0.23568 | 1.63200 | 0.03555 | 0 | 1.90323 | 0.28548 | 2.18872 |
| Free normal | 3.36720 | 5.99040 | 0.21331 | 0 | 9.57091 | 1.43564 | 11.00655 |
| Free heavy | 15.55848 | 17.31072 | 0.99546 | 0 | 33.86466 | 5.07970 | 38.94435 |
| Free synthetic tail | 41.01552 | 27.82080 | 1.59984 | 0 | 70.43616 | 10.56542 | 81.00158 |
| Pro light | 0.47136 | 4.08000 | 0.14221 | 0.03092 | 4.72449 | 0.70867 | 5.43316 |
| Pro normal | 6.85344 | 17.43360 | 1.17322 | 0.30920 | 25.76946 | 3.86542 | 29.63487 |
| Pro heavy | 32.55200 | 67.04640 | 5.97274 | 1.23680 | 106.80794 | 16.02119 | 122.82913 |
| Pro synthetic tail | 99.75600 | 154.56000 | 15.99840 | 3.86500 | 274.17940 | 41.12691 | 315.30631 |

Using the unchanged Free 60/32/7/1% and Pro 20/60/18/2% weights:

| Scenario | Free CNY / MAU-month | Pro CNY / subscriber-month |
|---|---:|---:|
| A All Max | **4.84610184** | **28.26896880** |
| B Recommended | **2.239314362** | **13.471455580** |
| C Offered-load stress | **8.371446344** | **47.282925832** |

These are synthetic averages, not actual PAIA bills or measured p99. Users without remote-AI use/new work have approximately zero inference cost. If only fraction p has the modeled workload, multiply the relevant mean by p. The synthetic tail is not a statistical percentile estimate.

Under B, Organize is 79.4% of weighted Free raw inference cost and 82.7% of Pro, so incremental fidelity, fewer full refreshes and shorter necessary output remain the largest optimization opportunity. Under A, expensive routine maintenance changes that mix: Organize shares fall to about 36.7%/39.4%. Do not claim the same dominant cost feature regardless of routing.

### 11.4 Population scaling

Monthly CNY, same 15% planning reserve. All-Free/All-Pro use their respective weights; 90/10 is only an illustrative population split, not a conversion forecast. C is offered load before safety limits, not money authorized to spend.

| Scenario | Population | All Free | All Pro | 90% Free / 10% Pro |
|---|---:|---:|---:|---:|
| A | 1,000 | 4,846.10 | 28,268.97 | 7,188.39 |
| A | 10,000 | 48,461.02 | 282,689.69 | 71,883.89 |
| A | 100,000 | 484,610.18 | 2,826,896.88 | 718,838.85 |
| B | 1,000 | 2,239.31 | 13,471.46 | 3,362.53 |
| B | 10,000 | 22,393.14 | 134,714.56 | 33,625.28 |
| B | 100,000 | 223,931.44 | 1,347,145.56 | 336,252.85 |
| C | 1,000 | 8,371.45 | 47,282.93 | 12,262.59 |
| C | 10,000 | 83,714.46 | 472,829.26 | 122,625.94 |
| C | 100,000 | 837,144.63 | 4,728,292.58 | 1,226,259.43 |

Formula: `N_free*C_free + N_pro*C_pro`. Provider quotas are shared account capacity, not per-user entitlements. Even a good aggregate forecast does not establish that a selected snapshot's throughput or regional latency supports these populations; qualification must measure concurrency, queue delay and per-window bursts.

### 11.5 Organize unit economics and count-only failure

At Max Beijing 12/36, no cache, before reserve:

| Scope | Total billed I/O | CNY / logical refresh |
|---|---|---:|
| Typical incremental | 4,000 / 1,200 | **0.0912** |
| Typical full scoped | 16,000 / 6,000 | **0.4080** |
| Twice the typical full logical scope, split into four children | Aggregate 32,000 / 12,000; illustrative 8,000 / 3,000 each | **0.8160**, before any additional repeated-prefix overhead |
| Four children each at the existing full request bound | Aggregate 64,000 / 24,000; 16,000 / 6,000 each | **1.6320** |

Actual content plus repeated prompt/schema/context overhead must fit the aggregate and each child. Doubling every child to 32k/12k and still calling it four bounded children is invalid; it exceeds current limits and may require more children than v1 permits. A calculation is not permission to exceed the cap or truncate evidence.

Ignoring the other safety limits, 100 results/day for 30 days costs ¥273.60 for typical incremental, ¥1,224 for typical full, and ¥4,896 for four-full-child refreshes. The last case also exceeds the current Pro 200 physical attempts/day if performed 100 times daily. These deliberately count-only examples show why the 100-result ceiling is not a commercial promise. Token, child, attempt, feature/user/global money and concurrency admission still apply. Cheap model prices do not alter the frozen high-allowance wording or justify an infinite-size promise.

### 11.6 Cache, Batch, escalation and reasoning sensitivities

**Implicit provider cache, B only:** let h be the fraction of actual input tokens charged at the implicit-cache price, including the same proportion across modeled routes. No explicit-write discount/cost is included. Max input rate becomes `12*(1-h)+1.5*h`; Flash becomes `0.8*(1-h)+0.1*h`. Output price and post-application-cache result counts are unchanged.

| Input-token cache fraction h | Weighted Free / month | Weighted Pro / month | Incremental Organize | Full scoped Organize |
|---|---:|---:|---:|---:|
| 0% | 2.23931 | 13.47146 | 0.0912 | 0.4080 |
| 25% | 1.97757 | 11.91261 | 0.0807 | 0.3660 |
| 50% | 1.71583 | 10.35375 | 0.0702 | 0.3240 |
| 75% | 1.45409 | 8.79490 | 0.0597 | 0.2820 |

Monthly columns include reserve; unit columns do not. At 75%, modeled total savings are about 35.1% Free and 34.7% Pro, not 87.5% of the whole bill. h is not the number of requests that contain at least one cached token and is not the 80%/60% application-result reuse already included in section 3. Actual private/public prefix proportions, tenant isolation, expiry and model changes may make high h unattainable.

Explicit cache requires its own cost expression over disjoint uncached/create/read input categories plus output. The five-minute TTL means a Topic revisited hourly may pay writes again; do not assume amortization, warm caches with paid calls or cache the whole library. Batch File's potential 50% inference discount applies only to the qualified exact API/model/region and successful rows; no guaranteed freshness is provided. Normal maintenance/interactive forecasts take zero Batch savings. Batch Chat Standard list prices equal Standard synchronous prices in the inspected Max table; promotional discounts are excluded.

**Optional second-stage sensitivity, not B baseline:** add a scoped Max adjudication with half the original M input/output to 5% of original maintenance requests. With all other assumptions unchanged, extra weighted planned cost is ¥0.06683616 Free / ¥0.29654820 Pro, giving ¥2.30615052 / ¥13.76800378. This adds 0.05*N physical requests. It is only feasible where the existing cycle/child/day budget has room; the Free tail's two-child cycles cannot admit the extra same-window call. Otherwise defer, not enlarge the allowance. This tests successful-result adjudication, never hidden failed-call retries.

**Thinking sensitivity:** at unchanged B input counts, doubling all billed output raises weighted monthly costs to ¥3.28210 Free / ¥19.81674 Pro before the required admission stops. Alternatively, 1,000 extra Max reasoning tokens per Organize result add ¥0.408204 / ¥2.790360, yielding ¥2.64751836 / ¥16.26181558. The typical full result already uses the modeled total output cap, so such extra reasoning needs to share that cap or the job cannot be admitted unchanged. Never budget visible text only or add already-counted reasoning twice.

**Route/region sensitivities:** replacing Flash with Beijing Plus in B, without claiming equal quality, gives ¥2.56017416 / ¥15.30103060. Using the Singapore CNY prices in 11.1, no cache and otherwise identical B, gives ¥2.81354489 / ¥16.91924819. These are separate price-vector scenarios, not automatic cross-region fallbacks. A worldwide invoice must use its actual native tariff and approved FX profile.

### 11.7 Existing monetary protection and FX

Recommendation: keep the Architecture's existing USD feature/user ceilings; no allowance reduction or increase is justified by this calculation. Architecture section 15.4 defines the single normalized ledger and signed, fresh, adverse-bound FX reservation. CNY forecasts do not establish a second set of limits.

For illustration only, at F=7 CNY/USD, the existing total 24h/30d ceilings correspond to Free ¥3.50/¥84 and Pro ¥21/¥210. These are conversions, not new authoritative budgets and not a current exchange-rate claim. The B weighted means convert to approximately $0.31990 / $1.92449 at that hypothetical rate. At F=6 and F=8 they instead convert to $0.37322/$2.24524 and $0.27991/$1.68393. No actual spot-rate or profitability assertion follows.

Check every feature, not just the aggregate. At hypothetical F=6–8, B's largest modeled Pro monthly Organize cost including reserve is ¥70.656, below the existing $20 feature envelope even at F=6; maintenance plus marginal filter and Assist also fit their monthly feature ceilings. Free B tail likewise fits. This does not prove intra-day feasibility or provider qualification. At F=7, A's Free heavy/tail maintenance costs can exceed its $2 monthly maintenance envelope, and A's Pro tail maintenance/filter exceeds $6. C's Pro tail Organize including reserve is ¥177.744, above the $20 envelope at F=7. Those are expected stops in unsuitable workloads, not false errors or permission to lower quality.

Budget reservations use bounded actual candidate jobs, not the forecast's 15% reserve. An unsettled dispatched request remains reserved. Signed ratebook/FX expiry, live tariff changes and discrepancies must stop new affected admission pending reconciliation; resetting clocks/currency/model cannot refill quota. Global operator spending remains unset/unapproved by this task. Actual regional pilot costs and fair-use interruption frequency must be reviewed before making commercial commitments.

### 11.8 Reproduction extension

Run after section 9 in an ordinary local Python interpreter. It reuses the exact FREE/PRO tuples; A/B do not change their call/result/token assumptions. This is documentation arithmetic, not model invocation or production code.

```python
MX, FL = (12.0, 36.0), (0.8, 2.7)
def mix_rate(p, low, high):
    assert 0 <= p <= 1
    return tuple((1-p)*a + p*b for a, b in zip(low, high))

def qwen_row(row, scenario='B', h=0.0, mx=MX, fl=FL):
    name, n, i, o, org, f, assist, filt, weight = row
    assert 0 <= h <= 1
    # Cache sensitivity below is Beijing implicit-cache only.
    assert h == 0 or (mx == MX and fl == FL)
    mx = (mx[0]*(1-h) + 1.5*h, mx[1])
    fl = (fl[0]*(1-h) + 0.1*h, fl[1])
    if scenario == 'A':
        rm = ra = mx
        scale, extra_m, extra_f = 1, 0, 0
    elif scenario == 'B':
        rm, ra = mix_rate(.1, fl, mx), fl
        scale, extra_m, extra_f = 1, 0, 0
    elif scenario == 'C':
        rm, ra = mix_rate(.5, fl, mx), mix_rate(.2, fl, mx)
        scale, f = 2, min(1, 2*f)
        extra_m = .1*n*cost(i, o, mx)
        extra_f = .1*filt*cost(500, 200, mx)
    else:
        raise ValueError('Unknown scenario')
    m = n*cost(scale*i, scale*o, rm) + extra_m
    z = org*((1-f)*cost(scale*4000, scale*1200, mx)
             + f*cost(scale*16000, scale*6000, mx))
    a = assist*cost(scale*2000, scale*300, ra)
    g = filt*cost(scale*500, scale*200, rm) + extra_f
    raw = m+z+a+g
    return (name, m, z, a, g, raw, raw*.15, raw*1.15, weight)

def qwen_mean(rows, **options):
    return sum(qwen_row(r, **options)[7]*r[-1] for r in rows)

expected = {'A': (4.84610184, 28.2689688),
            'B': (2.239314362, 13.47145558),
            'C': (8.371446344, 47.282925832)}
for scenario in 'ABC':
    cf, cp = (qwen_mean(rows, scenario=scenario) for rows in (FREE, PRO))
    assert abs(cf-expected[scenario][0]) < 1e-7
    assert abs(cp-expected[scenario][1]) < 1e-7
    for tier, rows in [('Free', FREE), ('Pro', PRO)]:
        for row in rows:
            print(scenario, tier, qwen_row(row, scenario=scenario))
    for n in (1000, 10000, 100000):
        print(scenario, n, n*cf, n*cp, n*(.9*cf+.1*cp))
for h in (0, .25, .5, .75):
    print('cache input-token fraction', h,
          qwen_mean(FREE, h=h), qwen_mean(PRO, h=h))
print('Singapore CNY B',
      qwen_mean(FREE, mx=(14.988,44.965), fl=(1.094,3.427)),
      qwen_mean(PRO, mx=(14.988,44.965), fl=(1.094,3.427)))
```

The calculations were run locally on synthetic parameter tuples. No real Qwen API call, paid benchmark, live billing reconciliation, user-data processing or author blind review ran. Official published prices establish tariff inputs only; all routes remain unqualified until the existing quality/privacy/financial gates pass.
