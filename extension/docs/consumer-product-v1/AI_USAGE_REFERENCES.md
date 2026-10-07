# AI Usage Reference and Evidence Manifest

Review date: **2026-10-07**. Purpose: source-grounded design/planning/cost analysis only.

**Qwen scoped review: AIU-QWEN-1.0, 2026-10-08, sections 6–8.** Sections 1–5 retain the original adoption's source record; they are not a fresh Drive read or a new verification of the older non-Qwen prices. Current Qwen price/API facts use only official Alibaba documentation. Current implementation facts are pinned separately below.

## 1. Source priority and two pinned reads

The latest explicit owner instruction controls its stated scope. Current GitHub supplies implementation facts; scoped canonical documents control product meaning. Connected Google Drive's latest visible matching **PAIA设计想法**, modified **2026-06-22T17:42:00Z**, was read as private design intent. Its body and document identifier are not mirrored publicly. It supports reliable data first, selective/batched intelligence, thought ownership, local prompt reuse, freshness-based tiers and quiet UX; later owner decisions prevail.

Initial repository source: `haohongfei2001-png/paia` main **4a3cb4e663d8ae745f8385c5c854d5b060e26309**, tree **a4270eb95b848c5406b7efd6e881e2dbaafd3727**, the Browser-Native Sync documentation adoption. Before publication, a fresh branch read found PR #189 merged as **0a438ccc67bb88d686d2939fa03027f09234d4ef**, tree **b0598ae3f5cf273438dc6740e5a2cf2bf2494797**. The final documentation is based on that new tree, not a force reset to the initial read.

The intervening comparison adds Context 0.15 local editing, Topic choices, lineage/read/maintenance owners, tests and implementation records. It does not modify the five canonical Authority/Status/Master/Settings predecessor files, whose original blob snapshots therefore remain exact. All upstream runtime/workflows/tests/version/records remain unchanged by this documentation.

## 2. Canonical documents consulted

Under `extension/docs/consumer-product-v1/`, current/relevant sections were read: PRODUCT_INTENT_CONTRACT, TECHNICAL_PLAN, MASTER_PLAN, STATUS, AUTHORITY, UX_CONTRACT; TOPIC_ARCHITECTURE and PLAN; THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY; AI_CONTEXT_CARDS_V2_PLAN and ADOPTION; implementation/context-cards/CTX4-01; PROMPT_REUSE_SURFACE and PROMPT_REUSE_STAGE_3A; SETTINGS_CONSUMER_V2_ADOPTION and PLAN, including their BNS routing. Also read extension/AGENTS.md, SMART_FILTER.md, LIGHT_FILTER_COVERAGE.md and ORGANIZER_MECHANICS.md.

A separately named PROMPT_REUSE_STAGE_3B.md did not resolve at the initial main; no new definition is attributed to that nonexistent file. Long historical acceptance tails are not retested by reading current plan sections. Current source facts prevail over older status descriptions, including the initial Info-only Context observation.

## 3. Implementation reads

| Inspected path under extension/ | Evidence and limit |
|---|---|
| core/organizer/contracts.js | Neutral provider/credential interfaces and empty production registry at initial read, unchanged by intervening comparison |
| core/organizer/budget.js | Local count/byte reservations and usage receipts with monetary:null, unchanged by intervening comparison |
| core/organizer/deepseek.js | Historical metadata/pure validators, no credential/transport |
| core/feature-availability.js | Explicit refusal of retired paid/provider commands |
| core/dual-view.js | Revision-token checkpoints and current full input-state/body scan behavior |
| core/organizer/ai-presentation.js | Evidence/revision/derivative/candidate and cross-Topic acknowledgement foundations |
| core/smart-filter.js | Deterministic Light v2, no runtime classifier provider, whole-input preservation gates |
| core/context-cards.js at initial read | Manual Info-only baseline, blob 5af0fae7a1ee20d525586cb6ac057f0712b9be32; historical after PR #189 |
| core/context-cards.js at fresh main | Blob 8d2bbfb38294818c37cbde6420facbd27ba70245: Info/Rules/Now manual capability, conditional qualified Inputs Topic choices, automatic:false, external:false, protected automatic-lineage compatibility |
| core/context-maintenance.js at fresh main | Inspected structural constructor-only verifier and operation/lineage/revocation/receipt flow. Default-denied, no runtime instance, extractor, provider, background job or worker route; new AI orchestration must reuse rather than bypass this owner |
| core/context-read.js at fresh main | Blob bb4f0cab0e8839a33d6f4d9672277a6919e14c5f: bounded domain read/evidence boundary, trusted injected connection verifier, no installed live transport/connection or persistent cache |
| core/memory/service.js | Retained privacy/revoke controls, retired profile/build/share generation |
| core/archive-query.js | Local paged and lexical query behavior |
| ui/settings-preferences.js | Shared acknowledged preference read/write/normalizer and current unavailable-service copy |

The fresh comparison additionally identifies Context lineage/Topic scope/access and local UI owners plus four new Context implementation records. Their existence and integration are preserved; this is not an exhaustive review of every newly merged line or a new certification of that runtime. Relevant service ranges and declared capability flags were inspected. Repository keyword search was incomplete, so absence claims are tied to concrete owners, not zero search hits. Existing ledgers, receipts and dormant Context services are explicitly recognized.

## 4. Current official price evidence

Checked and rechecked on 2026-10-07:

1. [OpenAI API pricing](https://developers.openai.com/api/docs/pricing): Standard short-context Sol, Luna and Astra price vectors; actual long-context/processing modifiers require recheck at deployment.
2. [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing): paid Standard Gemini 2.5 Flash, Flash-Lite and Pro; output/thinking tokens and separate caching charges.
3. [Claude platform pricing](https://platform.claude.com/docs/en/about-claude/pricing): Sonnet 5.5, Haiku 4.5 and Opus 5.5 Standard rates and provider-specific caching/tokenization distinctions.

Exact vectors, scope and arithmetic are in AI_USAGE_COST_MODEL.md. A price page proves published rates, not PAIA model fidelity, latency, user preference, selected-region availability or legal/privacy qualification. No promotional credits, provider free tier, Batch/Flex discount or assumed provider prompt-cache savings are used in the base forecast. Remote embedding is not adopted; its official tariff must be fetched when evaluated rather than invented here.

## 5. Performed work and nonclaims

Performed: connector source reads, fresh-main comparison and reconciliation, scope/conflict analysis, synthetic parameter arithmetic, dependency design and documentation integration. No production JS/CSS/HTML, schema, tests, manifest, credentials, entitlement, paid model, subscription, user data, cloud setup, deployment or release is changed by this task. The upstream Context runtime merge is another task's work and is not attributed to this design.

Workload distributions and the P99-style persona are hypotheses, not measured user behavior. Fixed style examples are synthetic, not real writing or model benchmark output. No blind author review, real-provider qualification, financial reconciliation or new production visual validation ran here. Existing upstream certification/failed-run records remain evidence for their exact scope; this documentation does not independently certify them.

The style benchmark's approximate zero-event confidence bound is a calculation: `1 - 0.05**(1/n)` after n independent zero-failure opportunities. Approximately 3,000 independent opportunities approach a 0.1% one-sided upper bound at 95%; correlated variants do not count as independent population evidence. Human-protection adversarial tests and subjective voice ratings are additional, different evidence.

The adoption manifest preserves exact predecessor blobs. Current routing documents incorporate nonconflicting baseline requirements and direct all AI quotas to the single Architecture contract. Private source bodies and old evidence are not deleted or copied into a public analysis corpus.

## 6. Qwen official source register — reviewed 2026-10-08

Only official Alibaba/Model Studio/Bailian sources below establish Qwen price/API observations. A web page can change; the future production ratebook needs a verified effective date, exact account-market currency, model/API/region capability and expiry. A reference table is not a live billing guarantee. No API endpoint below was invoked with credentials.

| Ref | Official source | Relevant observation / limit |
|---|---|---|
| Q01 | [qwen3.8-max model page](https://help.aliyun.com/zh/model-studio/qwen3-8-max) | API ID and fixed 0902 snapshot/2026-09-02 alias, context/capabilities, CNY regional prices, main/snapshot Batch differences and throughput |
| Q02 | [qwen3.8-flash model page](https://help.aliyun.com/zh/model-studio/qwen3-8-flash) | Current low-cost candidate ID, CNY tariffs, structured output/cache and region-specific capabilities; model page says Batch unsupported |
| Q03 | [qwen3.7-plus model page](https://help.aliyun.com/zh/model-studio/qwen3-7-plus) | Intermediate challenger, <=256k Beijing 2/8 CNY tariff, length tiers and regional capability differences |
| Q04 | [International qwen3.8-max page](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max) | Separate international-account USD tariffs; not an FX conversion of the mainland table |
| Q05 | [OpenAI-compatible Chat Completions](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions) and [model-list metadata](https://help.aliyun.com/zh/model-studio/list-models) | Request/usage/schema profile, total versus final-only output cap, thinking controls and future metadata verification interface; not a paid or authenticated API test |
| Q06 | [Deep thinking](https://help.aliyun.com/zh/model-studio/deep-thinking/) | Billable thinking tokens, usage breakdown, explicit mode/budget controls and streaming final-usage handling |
| Q07 | [Structured output](https://help.aliyun.com/zh/model-studio/qwen-structured-output) | JSON Schema/JSON Object support and implementation limits; provider examples do not authorize uncapped output or paid repair in PAIA |
| Q08 | [Context cache](https://help.aliyun.com/zh/model-studio/context-cache) | Implicit versus explicit caching, 1024-token conditions, five-minute explicit TTL, prefix matching, account/model isolation and token accounting |
| Q09 | [OpenAI-compatible Batch File](https://help.aliyun.com/en/model-studio/batch-interfaces-compatible-with-openai) | File/batch IDs, custom IDs, polling/cancel, 24–336h completion window, successful-row pricing and failed-row/cancellation distinctions |
| Q10 | [Batch Chat](https://help.aliyun.com/en/model-studio/openai-compatible-batch-chat) | Synchronous queued variant, up-to-one-hour timeout, Standard list-pricing distinction from temporary promotions and known terminal failure rules |
| Q11 | [Regions, deployment scope and endpoints](https://help.aliyun.com/zh/model-studio/regions) | Storage/endpoint region differs from inference deployment scope; workspace-specific domains; legacy domain feature-freeze and endpoint timeout details |
| Q12 | [Dynamic quota management](https://help.aliyun.com/zh/model-studio/quota-management) | Account/model shared capacity, spend-tier TPM and snapshot distinction; actual console quota remains required |
| Q13 | [Streaming](https://help.aliyun.com/zh/model-studio/stream) | SSE, usage and interruption billing based on provider-generated tokens, not merely bytes delivered to the client |
| Q14 | [Model telemetry](https://help.aliyun.com/zh/model-studio/model-telemetry/) | Default request-audit metadata and optional full inference/body logs; request ID correlation is not exactly-once billing proof |
| Q15 | [Bill query and cost management](https://help.aliyun.com/zh/model-studio/bill-query-and-cost-management) | Billing/usage timing and financial reconciliation; delayed dashboards cannot enforce atomic admission |
| Q16 | [Privacy notice](https://help.aliyun.com/zh/model-studio/privacy-notice) and [Model Studio service agreement](https://terms.alicdn.com/legal-agreement/terms/common_platform_service/20230728213935489/20230728213935489.html) | No-training commitments do not imply zero retention; necessary retention/backup and cross-border responsibilities require actual account/region qualification |

### 6.1 Model and tariff observations

Q01 lists `qwen3.8-max` and the fixed `qwen3.8-max-0902` / `qwen3.8-max-2026-09-02`. It reports 1,000,000 context tokens, maximum input 991,808 or 983,616 in thinking mode, maximum final output 131,072 and maximum thinking chain 262,144, subject to API parameter combinations. Those provider maxima never expand PAIA's smaller job budgets. Structured output, function calling and cache availability do not grant tools or new data access.

Beijing main/snapshot Standard text is CNY 12 input / 36 output per million tokens; implicit-cache input 1.5, explicit create/read 15/1. Main-alias Batch File is 6/18, whereas the snapshot page says Batch unsupported. Singapore international's CNY view is 14.988/44.965; inspected global Frankfurt/Virginia/Tokyo CNY rows show 12/36. Q04 instead lists native international USD 2/6 for Singapore and 1.65/4.951 for Beijing/global entries. Select the actual commercial account tariff, not an inferred FX ratio or the cheapest displayed currency.

Q02's Beijing Flash Standard text is CNY 0.8/2.7, implicit input 0.1, explicit create/read 1.25/0.1. Singapore CNY is 1.094/3.427. Q03's Beijing Plus short-input tariff is 2/8, implicit 0.4, explicit create/read 2.5/0.2; long-input and region-specific tariffs differ. Actual token counts, thinking, snapshot support and invoice categories require live qualification; no latency or quality is established by these observations.

Q12 lists Beijing main Max/Flash dynamic TPM tiers at 5M/10M/20M for increasing monthly spend bands, and Beijing Max-0902 at 1.5M across the listed bands. Q01's global main rows list 30,000 RPM/5M TPM, while global snapshot rows list 30,000 RPM/150k TPM. These are distinct scopes and cannot be collapsed into one universal Max quota. Published RPM/TPM is not a per-principal concurrency guarantee; actual account/workspace limits must be measured and respected.

### 6.2 Billing and API observations that constrain implementation

The documented Chat Completions `max_tokens` controls final text, while `max_completion_tokens` includes reasoning and may exceed its requested number by up to 10 tokens. The selected model/API must be qualified with headroom inside PAIA's unchanged cap. Low reasoning effort maps to 4,096 thinking tokens; it cannot stand in for the maintenance/Assist total envelope. Explicit thinking settings are required instead of default xhigh behavior. Reasoning is counted inside completion usage; cache read/create are input subsets in the initial compatible API profile. Avoid double-counting and missing final usage.

Implicit caching is automatic and not disableable in the documented interface; a 1,024-token matching-prefix opportunity does not guarantee a hit. Explicit cache uses a five-minute lifetime reset by a hit, at most four marks and bounded backwards block matching. The provider isolation described is account/model, not PAIA consumer identity. Tenant-safe request composition and actual private-data retention need qualification. Optional full inference logs remain off; only required metadata is used for costs. PAIA's zero-call result cache is a different layer.

Batch File and Batch Chat are not interchangeable. File's 24–336-hour window cannot establish normal periodic/hourly freshness; Chat can wait up to an hour and its list price is not automatically 50% off. Successful File rows can remain billable after cancellation, while documented failed-row rules apply only to that API. A canceled stream can have generated billable tokens the client did not receive. A client timeout, absent usage or 5xx does not establish a free synchronous request.

Default audit metadata can expose request IDs, model, tokens, timing and outcome without full Prompt/Response logging. This aids correlation, but the inspected public documentation did not establish a general synchronous idempotency-key or replay-without-rebilling guarantee. Batch custom IDs correlate rows, not globally deduplicated submissions. Actual financial-center/invoice reconciliation is distinct from request audit and delayed dashboards. Unknown outcomes retain reservations under AIU.

### 6.3 Region, retention and unresolved official discrepancies

Use Q11's workspace-specific regional domain profile for new integration planning. Its legacy DashScope feature-freeze date is 2026-09-30; existing-domain compatibility is not proof that new Qwen features work there. A region describes endpoint/storage location and deployment scope describes inference reach. The Max 3.8 Virginia listing is global; it does not establish US-only processing. Likewise a global Frankfurt route does not establish EU-only inference. No silent cross-region fallback or consumer consent inference is permitted.

The privacy notice and service agreement include necessary call-data retention, shortest-needed processing and backup/deletion exceptions; no universal numeric raw-call retention period or PAIA zero-retention agreement was established. Selected account market, service terms, appropriate commercial authorization, billing and country/data-transfer requirements are launch gates, not resolved by naming a regional endpoint. No account, resource or subscription was created to test them.

| Unresolved point | Evidence / required handling |
|---|---|
| Flash Batch support | Q02 says unsupported while generic Q09/Q10 lists include it. Keep that Batch route disabled until exact API/model/workspace qualification; no baseline discount |
| Flash explicit-cache creation rate | Specific Q02 shows 1.25 while generic 125%-of-0.8 guidance would imply 1.0. Use the specific conservative tariff and verify actual SKU before activation; baseline excludes explicit cache |
| Plus Tokyo currency/rate presentation | Inspected table values differ markedly from other CNY scopes and resemble another currency view. Do not silently correct, normalize or use them without actual account tariff confirmation |
| Snapshot capacity / Batch | Main-alias capability is not inherited; Q01/Q12 distinguish regional snapshot TPM and unsupported Batch |
| Sync API idempotency and unknown failures | Request IDs are correlation evidence only; retain unknown reservations and do not assume free retries |
| Country-only Max3.8 / exact retention | Reviewed pages do not establish a generally usable US-only Max3.8 route or zero/numeric retention guarantee; affected routes remain gated |

## 7. Fresh repository read for the Qwen amendment

Pinned main: **8c7561166e6fd617455e05ce19b1c65582b85692**, tree **9139fde803de116d4df433aef4774bc3a751f426**. Its merge message identifies Topic04 mechanics at 0.18.0 after Topic02/03 and calls for exact coherent-main verification. Current STATUS records Topic-01 completion and selects Topic-02; this documentation preserves that current routing and does not infer stage completion from a merge alone.

All six AIU documents were reread, with relevant current Product Intent, Technical/Master/Status/Authority, Topic architecture/plan, Context Cards v2, Prompt/Stage 3A/AI Assist and Smart Filter contracts, plus current AGENTS. Specific fresh implementation evidence includes neutral `core/organizer/contracts.js` (blob `00b21259b9ac0d852d0f2b3df3ab567ffe129f4d`), byte/count `core/organizer/budget.js` (`f44cf3b410faffd326c7525f1815a004b2c7cb01`) and constructor-only `core/context-maintenance.js` (`5646fdbe7891b8195b03592f6ed9af4beee620f8`). The first has an empty production registry; the second retains monetary:null; the last provides guarded domain maintenance rather than a live provider runner. These are bounded source observations, not a whole-repository negative proof.

The fresh comparison against the prior AIU main identifies additional Topic retrieval/candidate/formation/promotion modules and their tests/implementation records. Preserve those current owners and evidence; do not treat older AIU descriptions as a requirement to rebuild them. No runtime, manifest, schema, test or implementation-receipt file is changed by the Qwen amendment. Prior sources and old snapshots are retained; current scope is recorded in ADOPTION section 7 rather than rewriting history.

## 8. Qwen calculation and acceptance boundary

COST_MODEL section 11 uses only official tariffs above and the original explicit workload tuples for scenarios A/B. Scenario C and cache/Batch/thinking/route/FX changes are separately labeled sensitivities. The Python calculations ran locally with synthetic numeric inputs; no real Qwen request, actual user archive, provider bill, blind review or production latency measurement was obtained.

The CNY view does not create a second quota contract. Architecture retains USD normalized financial authority with explicit signed FX; the F=7 example and 6/7/8 sensitivity are assumptions, not fetched current exchange rates. No financial/commercial margin, price advantage at an actual settlement rate, country launch or quality qualification is asserted. All Qwen route statuses remain CANDIDATE / NOT_QUALIFIED, and all AI-COST outcomes remain planned under the existing one-queue rules.
