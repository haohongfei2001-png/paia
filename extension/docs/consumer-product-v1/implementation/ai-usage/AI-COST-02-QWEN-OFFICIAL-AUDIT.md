# AI-COST-02 Qwen official-source audit — 2026-10-09

Status: DOCUMENT_OBSERVATIONS / SYNTHETIC_FIXTURE_PREPARATION. No API was called;
no account, console credential or paid resource was inspected. Read-only public
technical references were checked for the proposed usage contract at base707dd125.
The previous Q01–Q16 audit remains historical evidence, not overwritten.

| Ref | Official page checked | Observation scope |
|---|---|---|
| U01 | [Compatible Chat API](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions), updated Sep28 | Regional workspace paths; request/usage and streaming fields; completion/stop semantics; total-output bound and up-to-ten-token variation |
| U02 | [Context Cache](https://www.alibabacloud.com/help/en/model-studio/context-cache), updated Oct08 | Compatible direct creation/read detail paths and input partitions; implicit/explicit distinction |
| U03 | [Regions and endpoints](https://www.alibabacloud.com/help/en/model-studio/regions) | Region-specific model/key/endpoint; deployment scope distinct from endpoint region |
| U04 | [Structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output), updated Sep28 | Schema profile and exact model lists; generic table and specific list are not fully aligned |
| U05 | [Qwen3.8-Max model](https://help.aliyun.com/en/model-studio/qwen3-8-max) | Main versus0902/2026-09-02 snapshot; supported regional scope and capability distinction |
| U06 | [Qwen3.8-Flash model](https://help.aliyun.com/en/model-studio/qwen3-8-flash) | Exact model regional/deployment entries; Batch remains unsupported in inspected specific entries |
| U07 | [Data Retention Policy](https://www.alibabacloud.com/help/en/model-studio/data-retention-policy), updated Oct01 | Current standard-retention and conditional enterprise ZDR policy; not an account approval |
| U08 | [Shared-domain maintenance notice](https://www.alibabacloud.com/en/notice/product_change_noticemodel_studio_dashscope_shared_domain_entering_maintenance_mode_88a), Sep21 | Shared DashScope domain enters maintenance Sep30; no new features, existing service continues |

## Confirmed documentation facts used for the proposal

U01 reports whole prompt/completion/total token counts; reasoning detail is an
output subset. Normal responses include usage; streaming's usage-bearing last
chunk has empty choices with include_usage enabled. Null intermediate usage is
expected. The total-completion request parameter covers reasoning plus answer;
the documented tolerance is ten tokens. These are published shapes/bounds, not
proof that a chosen commercial route returns them reliably.

U02's compatible examples read cached and created tokens directly beneath
prompt_tokens_details and subtract both from whole prompt tokens for uncached
input. Implicit caching is automatic and has no guaranteed hit or retention
interval; explicit markers are a separate opt-in mechanism. Baseline reservations
therefore cannot assume a discounted provider cache hit. No cache warm-up or
cross-principal private-prefix pooling is introduced by this contract.

U03/U08 support binding workspace, region and deployment separately rather than
assuming a shared endpoint or regional key applies everywhere. Existing domain
compatibility does not qualify the newer API/model profile. U05 identifies the
Max0902 snapshot separately; U06 includes both global and US scope Flash entries.
This does not establish a country-only Max route, latency, invoice tariff or
the owner's account capability. Candidates remain NOT_QUALIFIED.

U04's detailed schema-model list includes the relevant new Max/Flash and Plus
series, while a short comparison table still describes narrower support. Use
the exact model/API regional qualification gate; do not claim the table conflict
is resolved by this audit. PAIA also retains deterministic evidence/schema
validation; vendor examples suggesting a second paid JSON repair are not adopted.

## Newly found retention evidence and its limits

U07 now describes standard inference prompt/response retention up to30days,
subject to legal/security exceptions. Conditional ZDR applies to eligible
international enterprise customers and approved workspaces/models; it is not
enabled merely by using a non-mainland endpoint. The covered text series include
Max3.8, Plus3.7 and Flash3.8 onward. A ZDR workspace calling an uncovered model
can fall back to standard retention rather than being blocked by the provider.

The policy includes a default encrypted transient window up to24hours, metadata
outside the ZDR promise and excluded stateful/asynchronous paths. ZDR is not
literally zero bytes of transient processing or a blanket all-path promise.
This new public policy narrows the older REFERENCES observation that no numeric
retention/ZDR profile was established in that earlier review; it does not supply
actual account approval, negotiated terms, console configuration, tenant cache
isolation or PAIA processing consent. The proposed private qualification resolver
must fail closed on missing/incompatible evidence, not trust a workspace label.

## Unresolved interpretation and acceptance gates

1. U01's rendered creation-detail description mentions a cache_creation object;
   U02's executable compatible examples use a direct creation counter. The
   proposed initial shape supports the direct example only under its exact
   profile. Nested-only/double/conflicting shapes are not auto-normalized.
2. Optional/missing details cannot certify zero cache/reasoning. Per-model/API
   absence semantics require actual qualification; missing final usage remains
   UNKNOWN and reservation held.
3. Generic schema/Batch/cache support does not override specific model/region
   entries. Batch/explicit cache are outside the initial allowlist; current
   historical Flash Batch/rate discrepancies remain preserved.
4. Public request IDs, return fields and SDK behavior do not prove exactly-once
   billing, a replay guarantee, correct tokenizer/bounds, signed entitlement or
   restart-safe admission. No live paid shape, invoice or financial reconciliation
   is claimed. Unverified behavior must not silently release unknown occupation.

## Author evidence and review state

The accompanying corpus/audit checks invented fixture shape bookkeeping and
existing neutral normalization only. Parser implementation, private qualification
registry, service durability, native/hosted admission, actual privacy qualification
and real Qwen quality/billing remain NOT_RUN. No remote source text or real user
body is saved as an acceptance artifact. Coordinator review is pending.

Author command:
`node extension/tests/audits/qwen-usage-contract-fixtures.mjs`.
Actual result:37 fixture cases (27 normal,10 stream), containing7 KNOWN,
12 UNKNOWN and18 INVALID expected future decisions;7 positive neutral oracles
and3 negative neutral oracles checked against unchanged normalizeUsage, plus
its null/UNKNOWN result. `/tmp/qwen-usage-contract-fixture-integrity.log` exited0.
These counts describe fixture integrity, not37 passing raw-parser tests.
No full unit/native/hosted suite was repeated for this non-runtime preparation.
