# PAIA AI Usage Cost Model

Model version: **AIU-COST-1.0**. Prices checked **2026-10-07**. Currency: USD.
Status: **CALCULATED_SCENARIOS / NOT_OBSERVED_USER_COST / NO_PAID_CALLS_RUN**.

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
