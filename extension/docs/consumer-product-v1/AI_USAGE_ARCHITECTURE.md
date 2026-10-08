# PAIA AI Usage / Cost / Quality Architecture

Contract: **AIU-1.0**. Decision date: **2026-10-07**.
Status: **OWNER_DIRECTED_DESIGN_ADOPTED / IMPLEMENTATION_PLANNED**.
This document is the single normative owner of AI job admission, Free/Pro entitlement, quotas and initial safety budgets. Numbers elsewhere are calculations or references, not competing entitlement contracts. Model/provider choices are qualification candidates, not validated production capabilities. This adoption authorizes no paid execution.

**Scoped amendment AIU-QWEN-1.0, 2026-10-08:** Qwen is the primary production candidate family; `qwen3.8-max` is the core high-quality candidate. Section 15 owns the provider-neutral route, ratebook and currency refinement. Sections 2 and 10 retain all entitlement and safety ceilings; AIOS-1.0 and all domain/Settings/Sync contracts are unchanged. Candidate selection is not model qualification or permission to activate a provider.

Read [ADOPTION](AI_USAGE_ADOPTION.md) for source facts and exact supersession, [PLAN](AI_USAGE_PLAN.md) for dependencies, [COST MODEL](AI_USAGE_COST_MODEL.md) for reproducible assumptions, [STYLE](AI_ORGANIZE_STYLE_CONTRACT.md) for transformation/ownership and [REFERENCES](AI_USAGE_REFERENCES.md) for evidence.

## 1. Product boundary and capability audit

PAIA must work as a reliable personal data system without a generative model. A captured Input is not a billable event. Remote inference is justified by interpretation or valuable new generation, not by a feature name, a page view or a storage operation. Batching reduces request overhead; it does not make unlimited meaningful text free. Token load, backlog and coverage must remain honest.

The four classifications are NO_MODEL, LOCAL / DETERMINISTIC, CHEAP_REMOTE and QUALITY_REMOTE. LOCAL means ordinary rules/indexing unless an explicitly admitted on-device model is identified; it must not be advertised as a semantic model merely because it is local.

### 1.1 Operations with zero PAIA remote LLM inference

All rows below are fully available to Free and Pro. Network/storage/hosting costs can exist, particularly for Sync and external retrieval; zero LLM cost is not a claim of zero infrastructure cost.

| Capability | Class and reason | Trigger/input scope | Persisted output; cache/incremental policy | Remote LLM cost/risk |
|---|---|---|---|---|
| Capture, dedupe, Source handling, import | NO_MODEL / deterministic identity and validation | Accepted user text and supported source metadata; never one model dispatch per Input | Canonical Source/Working Input; identity dedupe and resumable import | Zero |
| Input Archive, revision, deletion, restore | NO_MODEL / transactional data operations | Explicit operation on authorized entities | Original invariants, history, tombstones and human intent | Zero; deletion/invalidation never waits for an AI budget |
| Browser-Native Sync | NO_MODEL / revision and intent transport | Canonical changes and authorized personal-cloud binding | BNS entities; idempotent application; delivery is not new semantic evidence | Zero |
| Permissions, authorization, external read scopes | NO_MODEL / trusted policy evaluation | Current subject, grants, entities and revocation epoch | Permission facts and required body-free receipts | Zero |
| Topic/Section UI, manual naming, order and placement | NO_MODEL / human-owned operations | Human command and current stable identity | Durable human organization; may invalidate affected AI coverage locally | Zero for the operation; later meaningful maintenance is separately admitted |
| Settings, appearance and organize-style selection | NO_MODEL | Acknowledged preference change | Existing preference owner; style is lazy-invalidating, not a rebuild command | Zero |
| Smart Filter | LOCAL / DETERMINISTIC | Whole eligible Input plus existing safe metadata | Versioned visibility decision; local incremental evaluation and keep protections | Zero, unlimited ordinary use |
| Prompt Families, frequency, pin, manual order, edit/hide/split, local ranking | LOCAL / DETERMINISTIC | User's saved/eligible personal prompts and human constraints | Prompt-owned family/manual state; exact/approved local similarity only | Zero; remote clustering is not a hidden default |
| Prompt insertion and ordinary Smart Orb | NO_MODEL / local UI and composer integration | Explicit selection of existing prompt | No historical body rewrite; insertion never sends | Zero, unlimited |
| Approved Stage 3A local next-action detector | LOCAL / DETERMINISTIC | Default-off, newly completed latest reply under its existing ephemeral consent | Bounded transient candidate; no durable assistant reply | Zero; DEFER is valid |
| Lexical search, navigation, opening/closing, hover, scroll, reading | LOCAL / DETERMINISTIC or NO_MODEL | Authorized query/read and current indices | Local indices/read state; reads never call a generator | Zero |
| Reading existing organized projections / Context Items | NO_MODEL | Currently readable evidence and stored result | Cache/read model; stale label where appropriate | Zero, including after quota exhaustion |
| External AI Context retrieval | NO_MODEL / authorization + search + evidence + read | Allowed Context and eligible allowed Thought Topics; complete honest paging | No new PAIA generation and no whole-profile construction during a read | Zero PAIA inference; the external AI does its own reasoning |

No ordinary search request calls an LLM to rewrite a query, rerank generatively, summarize results or rebuild Context. Future semantic retrieval starts with lexical/hybrid evaluation, then qualified local embeddings or low-cost embedding APIs. Embedding is not generative inference. Browser v1's initial remote embedding allowance and cost are zero because no remote embedding dependency is adopted here. Voice and other future modalities require a separate contract and budget.

### 1.2 The only browser-v1 remote job families

| Capability/output facet | Class / justification | Frequency and minimum input scope | Persistence/cache/incrementality | Tier difference and cost risk |
|---|---|---|---|---|
| Personal Topic routing | CHEAP_REMOTE after local rules/retrieval cannot settle meaning | Shared maintenance cycle; eligible delta + bounded existing identity shortlist + human fences | Validated placement/organization metadata and evidence; revision-keyed reuse | Same qualification threshold; Pro fresher. Repeated full-corpus transmission is prohibited |
| New Topic formation evidence | CHEAP_REMOTE within the same job, not a separate classifier call | Independent accumulated evidence, existing/dormant/alias checks | Hidden evidence/candidate state; durable identity only after PT-1 admission | Same threshold; a faster clock does not manufacture independence |
| Section organization candidates | CHEAP_REMOTE within maintenance | Changed material and relevant real Section/placement constraints | Scoped candidates/projections; never presentation headings promoted into durable Sections | Same safeguards and freshness distinction |
| Info / Rules / Now maintenance | CHEAP_REMOTE only if its stricter benchmark passes; otherwise a qualified higher route within the same orchestration | Same authorized delta, relevant existing Items and removal/edit fences | Scoped operations, evidence, uncertainty and validity; no full-profile rewrite | Same quality floor; no cheap-but-wrong Free profile. Output verbosity is bounded |
| Pro ambiguous AI Filter | CHEAP_REMOTE, a facet of maintenance | Only unprotected ambiguous candidates with sufficient allowed user-context evidence | Reversible versioned visibility decisions, not deletion | Pro opt-in; marginal tokens in existing calls, not a fourth pipeline |
| AI Organize | QUALITY_REMOTE | Explicit Topic refresh or first intentional generation; previous valid projection + changed Entries + necessary neighbor evidence | Evidence-linked derivative chunks and coverage manifest; application cache and incremental patching | Free small allowance; Pro high allowance. Long output/full refresh is the main cost risk |
| AI Assist / AI Orb | CHEAP_REMOTE low-latency qualified route; higher route only if admitted before dispatch | Explicit AI-suggestion intent; current eligible completed reply, bounded relevant Context and optionally relevant already-sent user Input | Transient result cache and body-free receipt; no assistant reply archive | Free experience allowance; Pro high allowance. Reply-completion loops are prohibited |

A shared cycle can contain one or a few bounded physical requests. Combining facets does not authorize combining incompatible privacy scopes. A facet lacking processing permission is omitted, not silently authorized by another facet. There is no separate paid pass merely to classify an Input already included in a maintenance batch.

## 2. Final v1 entitlement — normative

| Capability | Free | Pro |
|---|---|---|
| Archive / Thought core / manual Context / lawful recovery | Complete | Complete |
| Smart Filter and Smart Orb / Prompt Reuse | Unlimited ordinary local use | Unlimited ordinary local use |
| AI Maintenance: Topic + Context | Up to 3 eligible windows per day | Fastest once per hour; delta-gated |
| Durable Topic formation / Context quality | Same admission standard and qualified route policy | Same admission standard and qualified route policy |
| AI Filter | No remote AI Filter in v1; Smart Filter remains complete | Opt-in ambiguous-case facet of maintenance |
| AI Organize | 3 effective refreshes per day | High allowance; 100 effective refreshes/day hard anti-runaway cap |
| AI Organize style | All three modes | All three modes |
| AI Assist / real AI Orb | 3 effective generations per day | High allowance; 100 effective generations/day hard anti-runaway cap |
| Existing output reading and ordinary external authorized retrieval | Never consumes generation quota | Never consumes generation quota |

Consumer wording is “定期自动更新” versus “更及时更新”, and “高额度 AI 整理 / AI 建议”, not a guarantee of unbounded generation. The Pro cap is a safety ceiling, not a promise to process 100 arbitrarily large Topics every day. Token and monetary limits apply too. Do not market literal unlimited usage while hiding an ordinary binding cost limit. Fair-use constraints must be accessible before any future commercial launch, without a permanent quota dashboard.

An effective refresh is one newly validated result committed and made available for one explicitly requested scope. A batch of several suggestion alternatives is one AI Assist result. Clicks, opens, cached reads, local NO_CHANGE, failed requests and rereading do not consume effective-result quota. A logical refresh may use several bounded child requests; their attempts and spend are counted separately. Partial output is not sold as a complete Topic refresh. A deliberately selected partial scope can be one refresh only when the user requested that scope.

There is no transfer between the three feature quotas. Upgrade does not grant processing consent, and downgrade does not delete content or old results. A local tier flag is never financial authority.

## 3. Semantic Delta and acknowledgement

Semantic Delta is a versioned, body-free description of work eligibility, resolved to current authorized bodies only just before a bounded dispatch. Minimum fields: library identity, entity identity/type, meaningful revision/fingerprint, cause, affected Topic/Section/Context references, evidence lineage, relevant human-intent revision and removal/permission epoch. A schema proposal is not an instruction to add a second content store.

Eligible causes are new substantive eligible Input, genuine Working Input body change, independent human Thought creation/change, relevant restoration/removal, structural human Topic/Section actions that change the affected interpretation, and necessary Context corrections. Deletion, permission revocation and human protections take effect locally immediately; only the remaining interpretation work may wait.

Ineligible causes include capture duplicates, replay/import of the same entity revision, Sync delivery to another device, page open/read/search/hover/scroll/navigation, cosmetics, status polling and Organize ON/OFF. Organize style changes invalidate presentation preference only; they do not enqueue general maintenance or entire-library generation.

Coalesce multiple edits to the latest eligible version; collapse create-then-delete before dispatch; do not count duplicate/alias/derivative copies as independent evidence. A human correction may change only protection metadata and need no model call. Use existing revisions, journals and indexed dirty work rather than repeatedly scanning and resolving all Input bodies as `planDelta` currently can.

Maintain acknowledgement per evidence revision and output facet. Topic success must not acknowledge a failed Context facet; a partially covered Topic must not acknowledge an Input still pending in another Topic. Retain holes and incomplete scopes. Advance only the successfully committed subset in the same transaction as its result/receipt. Never use maximum seen sequence as proof that all earlier work succeeded. NO_CHANGE can acknowledge the checked subset; DEFER records its evidence and retry condition, not a fresh billable retry on every window.

A new device imports canonical state without producing a new semantic event for an already known revision. Paid admission additionally deduplicates the logical job key across devices using the trusted service principal/library identity. Device-local queues and leases are not synchronized as content.

## 4. Maintenance cycle and freshness

Recommended Free policy is **three approximately eight-hour eligibility windows**, not three mandatory model calls. Compare an idealized continuously available browser and uniformly arriving meaningful changes:

| Windows/day | Mean wait to next window | Maximum nominal gap | Judgment |
|---|---:|---:|---|
| 1 | 12 h | 24 h | Lowest repeated overhead, but yesterday-like Topic/Context freshness is easy to notice |
| 2 | 6 h | 12 h | Acceptable compromise, still a long gap during active use |
| 3 | 4 h | 8 h | Recommended: periodic intelligence remains perceptible without realtime semantics |

These are scheduling calculations, not measured latency promises. Actual execution needs an available device, processing consent, service availability, meaningful delta and budget. A closed/suspended browser is not an always-running server agent. At the next available eligible opportunity, coalesce backlog once; never replay missed windows as a series of paid calls. A no-delta window costs zero model tokens. Windows are not banked.

Pro applies the same pipeline with a minimum one-hour interval between admitted maintenance cycles. Thirty changes in that hour become one accumulated cycle, subject to bounded partitioning. “Fastest hourly” is not “every hour regardless of activity”. No-delta, local-resolved and unchanged-DEFER batches do not dispatch.

The service supplies stable day/window identifiers and next-eligibility time. Daily entitlements follow the principal's declared time zone, with server-side monotonic/rolling-window checks against clock rollback, DST and repeated zone changes. Changing devices or time zones cannot replenish quota. Sleep/resume cannot create a second cycle for the same window. Processing timestamps describe actual completion, not a scheduled alarm.

Cycle: collect eligible delta -> locally validate/dedupe/protect -> retrieve existing relevant identities/Items -> remove already resolved facets -> reserve one bounded job -> emit typed Topic/Section/Context/filter operations -> independently validate each facet -> recheck current revisions/permissions -> atomically commit valid subsets -> acknowledge exact coverage. Initial bound: at most two physical requests per cycle, not unlimited fan-out. Excess work stays queued with honest coverage. Cold import/backfill is resumable, lower priority than current meaningful changes, and is not a separate unrestricted billing entitlement.

## 5. Topic formation and Context correctness

PT-1.0 remains the identity authority. Reuse active, dormant, renamed and redirected Topics before proposing a new identity. Shortlist omission is not proof of absence. Require a stable subject/object boundary, useful future return scope, independent evidence when recurrence is necessary, duplicate/alias checks, and no conflict with human keep-separate/removed-topic fences. Ordinary new Input does not directly create a Topic. Three messages, three revisions or three windows are not a formation rule. The existing PT-1 explicit-object path remains valid for genuinely sufficient substantive evidence; this contract does not impose an artificial minimum count on it.

Human rename/takeover retains identity. Human-owned Topic, Section, placement and body fields are not AI writable. Formation never opens external access. AI-generated derivative evidence does not become independent evidence for further formation. A removed identity cannot be recreated under a synonym. Free and Pro use identical formation gates; only the opportunity to evaluate new evidence differs.

Info, Rules and Now are the three maintained content cards; Inputs remains the fourth card containing Topic-access references, not another profile body. Maintenance returns ADD, UPDATE, REMOVE_CANDIDATE or NO_CHANGE with item refs, expected revision, evidence, temporal scope and uncertainty. Prefer omission to an unsupported stable personal fact or rule. A quotation, hypothetical exercise or another person's claim is not a fact about the user. Historical information is not current state by default.

An AI-maintained unprotected Now item may be updated more promptly when explicit current evidence warrants it. Expiry can mark an item stale locally; expiry alone need not call a model. Manual Items and human-edited fields stay protected. Human removals create durable semantic/identity fences, not just text-match suppression. AI cannot resurrect a paraphrase of a removed item. Automatic cleanup may invalidate an unsafe derived candidate, but cannot delete a protected manual Item or silently resolve B-02. Context processing consent is distinct from external-read permission; neither silently enables the other.

## 6. Smart Filter and Pro AI Filter

Keep current local preservation guards and whole-input high-confidence decisions. Only unprotected unresolved candidates are eligible for the Pro facet, using sufficient authorized user-text neighbors. It may not read assistant history merely to decide whether a short Input matters. When evidence is insufficient, KEEP/DEFER wins.

AI Filter is separately opted in through the existing filter-owned detail/permission path; it adds no new primary Settings row. Filter OFF means no automatic filter hiding. Upgrade alone never enables remote processing. Human edits, explicit keep, restore, attachments/reference protection and removal fences outrank model output. A new remotely judged decision policy requires its own version and false-positive acceptance; simply removing the old grammar-only validation guard is not acceptable.

Decisions are reversible visibility metadata, not deletion, Topic eviction, Context deletion or a new external authorization rule. Preserve search discovery and reading-session snapshots: a late result must not make text disappear while the user edits, focuses or reads the current page. On remote entitlement loss, AI-only hiding is not newly applied; current Free behavior is governed by Smart Filter, while explicit human keep remains. Do not generate a separate remote call when only the filter facet is missing; join the next permitted cycle or keep visible.

## 7. AI Organize: reading is free; generation is deliberate

One Thought Library and the same Entries remain underneath OFF and ON. Source, Working Input, original/human Thought body, durable Section identity, Topic permissions and human organization facts are unchanged by generation. Heading text is derivative presentation, never a Section creation command.

Application cache key includes stable Topic identity, meaningful Topic content revision, organization/evidence fingerprint, human-protection revision, organize-style enum, generation-contract version and qualified model/prompt version. Security/authorization and removal checks are additionally mandatory on every read/commit. Model metadata changing does not trigger a library-wide rebuild.

Opening a cached projection, toggling OFF/ON, rereading or changing page never calls a model. First intentional ON with no projection can offer one explicit generation action after its actual scope/availability is known. A stale or different-style projection remains readable when its evidence is still legally readable, with a quiet current-scope update action. A generic navigation event cannot spend quota. A style change is a legitimate new transformation request only when the user deliberately refreshes that Topic; no background sweep follows it.

Incremental refresh uses affected generated chunks + changed Entry evidence + necessary unchanged neighbors and a bounded structural manifest. Unchanged chunks stay intact; all contributing refs remain traceable. A wider recompute is justified by missing/invalid previous structure, a meaningful large structural change or an explicit new style request, never by convenience. With 200 Entries plus five new ones, default work is the five and affected neighbors, not a fresh 205-Entry prompt.

Large Topics are partitioned at real Section/evidence boundaries. One logical refresh has at most four bounded child requests in v1; preflight the aggregate. If faithful processing cannot fit, offer a clearly selected smaller scope or defer, while preserving original reading. Do not silently truncate, force the original-word mode to summarize, or present partial coverage as complete. In the original-word mode, source-span references plus grouping instructions can render unchanged text locally instead of paying to re-emit every original token.

Local validation checks references, revision fingerprints, literal spans where required, allowed operations, uncertainty/chronology constraints and schema. It does not prove full semantic fidelity; separate qualified model evaluation is required. Protected user edits to a derivative are preserved as user work, not overwritten by refresh or preference changes. Any new generated version must respect that ownership and the existing recovery/version contract.

## 8. AI Assist / AI Orb: explicit lazy generation

Smart Orb, its existing Prompt Families and approved Stage 3A detector remain unlimited and provider-free. Opening the ordinary Prompt Reuse card must not cause a remote request just because an AI section exists nearby.

For real AI suggestions, the newly completed eligible latest reply only establishes a fingerprint/generation. Completion itself does not dispatch. V1 uses a deliberate “本轮 AI 建议” activation or equivalent keyboard action; check the exact result cache and single-flight registry before admission. Remote reply processing has its own explicit default-off consent, independent from capture, Stage 3A and external Context access. It never scans earlier replies or drafts.

The request contains only the bounded current reply, relevant allowed personal Context and necessary already-sent user input. No full conversation, old reply backlog, full profile, tools, browsing or auto-send is added. A reply beyond a safely interpretable bound leads to honest DEFER or a clearly limited scope, not a silently context-free invented recommendation. The assistant reply is untrusted evidence, not a command to broaden access or spend.

Cache key: site/conversation generation + latest reply fingerprint + only actually relevant Context/evidence revisions + assist-contract/model/prompt version. An unrelated Context edit does not invalidate it. Same key opened ten times yields at most one paid result. Concurrent opens attach to the same job. A newer reply invalidates the old suggestion and late insertion, not the stable prompt list. Losing transient state on a restart does not authorize processing a historical reply again.

Show cached suggestions immediately; otherwise retain the usable local prompts and a quiet pending state. Hover prefetch is not enabled in v1. A later separately measured opt-in experiment may use sustained intent (for example 500 ms), the same admission/receipt and one request per key; casual hover remains free. Cancel before dispatch releases reservation; cancel after dispatch follows outcome reconciliation. Speculative calls cannot consume the Free experience allowance invisibly.

## 9. Unified orchestration and service boundary

Features submit typed intents, never call `provider.generate()` or an adapter directly. Pipeline:

`intent -> current processing authorization -> entitlement -> meaningful scope/delta -> exact cache/single-flight -> window/cooldown -> result quota -> request/token limits -> feature/user/global monetary reservation -> qualified model route -> dispatch -> receipt -> validate -> current-state CAS -> commit/acknowledge`.

Keep authorization ahead of returning sensitive cached content. Cache lookup never requires a provider call. Reserve and enforce at the trusted financial service, not only in extension memory. Reuse existing OrganizerProvider/CredentialProvider, BudgetPolicy/BudgetLedger, organizerJobs/organizerUsage and operationReceipts concepts; evolve their contracts into the three job families rather than creating three competing ledgers. Existing bytes-only controls and `monetary:null` are not financial enforcement.

The extension/domain owners remain the authority for user content and protected writes. The optional AI gateway owns provider secrets, signed entitlements, account-wide operation dedupe, reservations, ratebook and financial receipts. It is not a PAIA content-sync cloud or a username/password account product. Core local use and BNS require no PAIA account. Remote AI needs a verifiable pseudonymous entitlement principal, obtained through an explicitly authorized federated identity/purchase proof flow; browser login, an email label or a Drive token does not prove Pro. Storage-provider credentials never become AI-service credentials. Actual identity/payment provider selection and production activation remain B-05 gates; no subscription backend is built by this design.

A local installation ID cannot guarantee cross-device quota or abuse resistance. Before trusted entitlement/admission exists, production remote generation remains unavailable rather than pretending that local counters enforce billing. Processing permission, service entitlement, personal-cloud binding and external-AI read permission are four separate capabilities.

## 10. Initial budget policy — normative safety parameters

These are initial internal guardrails to qualify before launch, not current user entitlements or permission to spend. All input limits include instructions, schema, retrieved evidence and context; all output limits include billable reasoning as applicable. Adapter preflight uses the actual tokenizer/rate tier and rejects unknown prices or unenforceable output bounds.

| Bound | Maintenance | AI Organize | AI Assist |
|---|---:|---:|---:|
| Max input tokens / physical request | 12,000 | 16,000 | 4,000 |
| Max billable output tokens / physical request | 2,000 | 6,000 | 600 |
| Max child requests / logical job | 2 | 4 | 1 |
| Physical attempts/day, Free | 6 | 12 | 3 |
| Physical attempts/day, Pro | 48 | 200 | 100 |
| Aggregate daily input/output token ceilings, Free | 72k / 12k | 192k / 72k | 12k / 1.8k |
| Aggregate daily input/output token ceilings, Pro | 576k / 96k | 1.6M / 600k | 400k / 60k |

Effective-result limits remain section 2. Attempts include dispatched failures/unknown outcomes; bounded child calls are planned work, not retries. Every applicable limit must pass, so a 100-result limit does not promise 400 large child calls. Initial single-flight: one maintenance job/principal-library, one organize job/Topic, at most two interactive jobs/principal, and finite global provider concurrency. A different cache key cannot evade daily/monetary protection.

| USD safety envelope | Free | Pro |
|---|---:|---:|
| Maintenance, rolling 24 h / 30 d | 0.10 / 2.00 | 0.50 / 6.00 |
| Organize, rolling 24 h / 30 d | 0.38 / 9.00 | 2.20 / 20.00 |
| Assist, rolling 24 h / 30 d | 0.02 / 1.00 | 0.30 / 4.00 |
| Total user, rolling 24 h / 30 d | 0.50 / 12.00 | 3.00 / 30.00 |

Feature budgets are separate; Organize cannot silently borrow the maintenance reserve or Assist allowance. The total is an additional brake. At the reference rates, three normal full Organize refreshes/day fit the Free Organize envelope; abnormally large scopes can hit scope/spend bounds earlier. Explain a genuine bound at the affected action, never disguise it as model failure. A monthly safety stop must state its actual next reset, not falsely promise tomorrow.

Before production, an operator must set a nonzero approved global monthly and daily amount. Unset means remote admission disabled. Reserve worst-case bounded cost atomically before dispatch, including all in-flight and unknown-outcome reservations. A planning envelope is up to 1.5 times the workload forecast, capped by the operator's actual authorization; it is not automatic authorization. Alert internally at 70/85/95%; stop speculative work first, then delay nonurgent maintenance with truthful freshness, and refuse new paid admission at the hard limit. Do not lower a durable quality floor to stay under budget. Existing reads/local work remain available.

Ratebook changes, provider/region fees and reconciliation must not retroactively erase actual spend. The cost model excludes tax and ordinary hosting; those need separate commercial budgets. A provider dashboard limit alone is insufficient for per-user control.

## 11. Receipts, failures and retries

Use one immutable logical job key plus unique child operation IDs. Bind principal/library, intent, scope fingerprint, contract/route versions, consent epoch and parent reservation. Receipt states: PLANNED -> RESERVED -> DISPATCHED -> RESPONSE_RECORDED -> VALIDATED -> COMMITTED -> SETTLED; terminal alternatives include CANCELLED_BEFORE_DISPATCH, REJECTED, OUTCOME_UNKNOWN and EXPIRED_UNCOMMITTED. Result quota and provider spend are distinct quantities.

A known pre-dispatch failure releases its reservation. One bounded transport retry is permitted only with proof that no provider request was accepted, the same logical child identity and fresh admission. A timeout, 5xx, channel interruption, restart or cancellation after dispatch is not proof of nonbilling. Query operation/provider receipts where supported; retain unknown spend reservation and do not immediately dispatch a replacement. Never mint a new requestId simply to get around an unknown state. Provider SDK automatic retries must be disabled or explicitly integrated into this policy.

Schema/fidelity failure after a billed response does not trigger an automatic paid repair, fallback or model upgrade. Revalidate/repair deterministic formatting locally when unambiguous, otherwise keep old output and offer a deliberate later retry with visible status and fresh budget. Such a retry is a new authorized attempt, not a hidden one. Effective-result quota is not charged for failure; while outcome is unresolved, a provisional slot prevents racing duplicates. Financial attempt/spend counters are never refunded without evidence.

Commit only against current entity revisions, protections, scope and cancellation fence. Late or superseded responses cannot overwrite newer user work. Deletion/revocation locally removes or masks impermissible generated fragments immediately, without paid cleanup. Quota exhaustion cannot leave impermissible generated fragments readable. Stale-but-still-authorized reading differs from legally unreadable/deleted evidence.

No prompt-body logs. If crash recovery requires a response handoff, use only an explicitly approved short-lived encrypted response object (maximum 15 minutes), scoped to the same operation/principal and not synchronized or used for analytics. This is a future service retention decision requiring qualification, not a claim about provider retention. Expiry yields an honest uncommitted outcome, not an automatic rebill.

## 12. Model routing and quality

Maintenance targets a stable, structured small/mid model; Organize targets demonstrated semantic/writing fidelity; Assist targets low latency with sufficient contextual correctness. Under AIU-QWEN-1.0, section 15 selects Qwen as the primary candidate family: Flash first for routine maintenance/assist, Max first for Organize and high-risk semantic decisions. The former Gemini maintenance/assist and Sol/Sonnet quality-class vectors remain dated comparison scenarios in COST_MODEL, not competing primary production routes. No named model has passed PAIA qualification merely by appearing in a price list.

Free and Pro cannot select different durable correctness floors. If the maintenance model fails Info/Rules qualification, qualify a stronger shared route, omit/defer that facet, or reduce frequency; never write cheaper unsupported facts for Free. Fallback is selected before a first dispatch from qualified available routes that fit the reservation. After a possibly billed failure, section 11 controls; there is no silent paid fallback. When no qualified affordable route exists, keep original/manual/cached functionality.

Style is a transformation policy, not a model-size selector. Original-word preservation can be demanding; summary mode is not permission for hallucination. Do not infer model quality or latency from a price list.

Release gates include routing correctness, needless/duplicate/missed formation and human corrections; unsupported Context facts/current-state errors and removed-item resurrection; AI Filter important-content hiding; and the separate Organize metrics/benchmark in STYLE. Proposed initial measurable gates: zero observed human-protection/revocation/resurrection violations; routing correctness at least 95% on adjudicated eligible held-out cases with DEFER/coverage reported; duplicate Topic formation at most 1%; unnecessary formation at most 2%. Context unsupported stable facts and high-risk filter false positives target at most 0.1%, with sample size and confidence bounds reported. Zero failures in a tiny synthetic sample does not prove those population rates. If evidence is insufficient, qualification remains pending rather than silently lowering the gate. Real owner-style ratings require opt-in authors, not invented “user approval”.

## 13. Telemetry and user experience

Collect job type/tier, model and contract/rate versions, billable token categories, latency, result-cache hit, skipped-no-delta/local-resolved, incremental/full scope, child count, bounded estimated/settled cost and success/error/outcome state. Use pseudonymous service principal and keyed opaque operation fingerprints. Do not upload raw Input, Topic title, assistant reply, Context body or prompt/response text merely for cost analysis; hashes exposed publicly are not anonymization.

Initial operational receipt retention: 30 days for body-free detailed usage, 90 days for content-free aggregates; unresolved financial receipts may require a separately disclosed longer retention. Actual statutory billing retention is not decided here. Access is restricted; exclude service tokens and source identifiers from ordinary logs. Keep this separate from retired Product Signals/user-facing diagnostics. User research/private benchmark participation is separately consented.

Normal UI never displays maintenance “2/3” or Pro “73/100”, tokens or dollars. Free interactive capability may say “今天还有 1 次 AI 整理” or “今天的 AI 建议已用完；常用提示词仍可使用”. Pro exceptional use may say “今天的 AI 整理使用量较高，将在下一周期恢复”, with an accurate reset when opened. Backlog says “自动整理将在下次更新；新内容已保存”, not “全部已整理”. Errors retain old results and original reading.

Quota exhaustion, unavailable provider or a global safety stop cannot disable capture, manual Topic/Section work, editing, search, Smart Filter, Smart Orb, manual Context, authorized ordinary retrieval or already saved organized reading. No upgrade modal blocks those paths.

## 14. Sync and execution boundary

The global organize-style enum/revision is a consumer preference under the existing preference owner and future BNS codec. No per-Topic override in v1. Sync does not activate processing consent, Pro entitlement, external grants, transient jobs, response handoffs, caches or provider secrets. Existing canonical user-kept/edited work follows its own BNS preservation contract; calling an object a cache cannot delete that human work. Cross-device replay must not spend twice for an already processed revision.

The seven AI-COST outcomes are integrated into the one Consumer Product queue in PLAN/MASTER. This design starts no runtime writer and does not change STATUS's current non-AI task. All real provider, region, commercial, privacy, device and production-quality gates remain required.

## 15. Qwen-primary scoped route and accounting amendment — AIU-QWEN-1.0

Official observations below are scoped to the sources and review date in REFERENCES Q01–Q16. They are not evidence of a successful live request. COST_MODEL section 11 owns the arithmetic, PLAN section 12 owns qualification delivery. Only this Architecture owns normalized accounting and admission policy.

### 15.1 Provider-neutral routing, not Qwen domain objects

The boundary remains `Feature -> AI Job -> Budget / Model Router -> Provider Adapter -> Qwen`. Keep the three existing jobs and PAIA-owned schemas, evidence, caches, usage receipts and domain commit services. Do not create QwenTopicDecision, QwenContextItem, a Qwen body store, separate Topic/Context/filter provider systems or direct feature calls. Provider identifiers belong only in adapter/route/receipt metadata. A provider replacement must not require a Topic, Context, Organize, Assist or entitlement redesign.

| Work | First qualification candidate | Routing rule before dispatch |
|---|---|---|
| Routine maintenance routing, ordinary Section candidates and obvious NO_CHANGE | `qwen3.8-flash`, non-thinking | Local resolution first; use remote only when meaningful authorized delta remains and the facet's quality floor passes |
| Difficult new Topic identity/formation; high-risk Info/Rules interpretation | `qwen3.8-max` | Prefer direct Max when risk is known before inference; missing evidence or protected intent still requires DEFER, not a stronger-model override |
| AI Organize, all three styles | `qwen3.8-max` | Primary high-fidelity candidate for original, balanced and concise alike; qualification includes incremental and full scopes |
| Pro ambiguous AI Filter | Qualified Flash in the maintenance batch | KEEP/DEFER when uncertain; do not add a Max call merely to hide another Input |
| AI Assist | Qualified `qwen3.8-flash`, non-thinking | One short lazy request; no default Max for Pro and no remote hover prefetch |
| Intermediate challenger | `qwen3.7-plus` | Evaluate when Flash misses a facet's quality floor; not an automatic extra stage in every request |

The official Max model ID is `qwen3.8-max`; the listed fixed candidate is `qwen3.8-max-0902`, also named `qwen3.8-max-2026-09-02`. Prefer a qualified snapshot for reproducible Organize evidence. The main alias and snapshot have different Batch/throughput capabilities even when text prices match. Flash's inspected page lists `qwen3.8-flash`; do not invent a fixed snapshot. A rolling alias needs route-version monitoring and fresh regression qualification when its behavior changes.

Qualification is specific to job/facet, style, model/version, region/deployment scope, API profile, thinking policy, prompt/schema and privacy profile. A cheap model's routing PASS does not qualify Info/Rules. Free and Pro use the same admissibility threshold and qualified route policy. A failed quality gate keeps the facet off or deferred; it is not grounds to lower Free quality or silently change entitlements.

### 15.2 Selective adjudication without hidden retries

Do not force a cheap-then-Max chain. The baseline cost comparison routes 10% of maintenance requests directly to Max and 90% to Flash; that is a disclosed calculation parameter, not a fixed runtime escalation quota or empirical risk rate. Upfront risk routing preserves the original physical-request count.

A two-stage semantic adjudication is allowed only for a valid, successfully received structured first-stage result that explicitly leaves a supported high-value question unresolved. The route policy must predeclare the condition, reserve both bounded children, retain the original evidence and record the second child as an additional billable adjudication. Recheck scope and current human fences before it. The first model's text is not substitute evidence. This is an amendment permitting a planned semantic substep, not an exception to section 11's failure policy.

At most two maintenance children remain available for both partitioning and adjudication combined. If both are already used for necessary partitioning, there is no third call: defer the unresolved facet until a permitted cycle or changed evidence. The Free high-tail baseline already uses 168 requests across 84 cycles; it has no spare same-cycle child capacity. No extra Assist child is adopted. Do not consume Organize result quota for maintenance adjudication.

Timeout, 5xx, unknown outcome, malformed schema, invalid evidence or failed fidelity are not semantic escalation triggers. Preserve section 11's no-hidden-paid-repair/fallback rule. Missing independent evidence, an uncertain quote/current-state distinction, a removed Topic/Item fence or human keep-separate is not resolved by paying Max to guess. Use DEFER/KEEP and a recorded reconsideration condition.

Calibrate risk/abstention on independent held-out tasks: accepted precision, coverage, error severity, calibration and paired direct-Max comparison. Self-reported confidence alone is never commit authority. Measure incremental correctness gain per extra cost, not just agreement between two models. On the same 5k-input/800-output scope, the dated Beijing prices give Flash ¥0.00616 versus Max ¥0.0888: a cascade costs `0.00616 + p*0.0888`. Its price-only break-even is p < 93.06%; that is not a quality threshold. For a request already known to require Max, direct Max avoids the redundant first charge. Production eligibility still requires demonstrable utility and all child/token/budget limits.

### 15.3 Adapter profile, reasoning and bounded structured output

Use an allowlisted server-side Chat Completions profile initially. The trusted admission service owns Alibaba/DashScope credentials, entitlement proof, ratebook, financial reservations and billing reconciliation; no Alibaba AccessKey, DashScope API Key or Model Studio secret enters the browser extension. Existing Source/Working/Topic/Context owners retain content and mutation authority. This service is not an Archive backend or PAIA content-sync cloud.

Map the neutral schema to the documented `response_format` JSON Schema profile, including strict field/enum/array bounds and explicit additional-property policy. JSON syntax compliance does not establish evidence validity or semantic fidelity. Keep local validation and domain CAS. Tool calling, search, agent loops and provider-managed conversation memory are disabled; their availability is not a PAIA requirement. Use one answer, not multiple paid alternatives by default. SDK automatic retries must be disabled or routed through the existing immutable operation policy.

Routine maintenance and Assist explicitly disable thinking. Organize and high-risk Max qualification compare non-thinking with tightly bounded thinking; the winning policy is quality/cost evidence, not a style label. On the inspected API, `max_tokens` limits only final text, while `max_completion_tokens` covers final plus reasoning tokens. Reasoning is billable output and is already included in completion-token totals; do not add the reasoning subset twice.

Qwen documentation warns that total generation may exceed `max_completion_tokens` by up to 10 tokens. Configure at least that much headroom inside section 10's existing billed-output cap, and reserve the full cap. Prove the actual selected API/model combination respects the bound before activation; stop a route on observed violations. Input preflight also needs measured tokenizer/protocol overhead headroom, not characters/4 or the nominal content length alone. A 1M provider context window does not increase PAIA's 12k/16k/4k input limits.

Do not inherit thinking defaults. The documented low reasoning effort maps to 4,096 thinking tokens, already larger than the entire maintenance/Assist output envelopes; low is not equivalent to cheap. `reasoning_effort` and `thinking_budget` are mutually exclusive controls, and total output must still fit the job cap with room for a valid answer. For stateless PAIA jobs, send no old reasoning history and explicitly avoid retained-thinking continuation. Truncation or absent final usage remains an invalid/unknown outcome, not an automatic repair call.

Stream only a provisional derivative into the existing pending presentation; no protected commit occurs until final validation. Missing final usage, client disconnect and cancellation after dispatch are not evidence of nonbilling. A provider response/request ID enables correlation but does not prove idempotent billing or exactly-once execution. No public synchronous replay/idempotency guarantee was established in this review. Keep gateway single-flight, durable operation records, conservative unknown reservations and provider reconciliation.

### 15.4 One normalized cost ledger and a versioned Qwen ratebook

Retain **USD as the only authoritative normalized financial ledger**, and all section 10 USD ceilings unchanged. CNY is the primary Qwen reporting/input-price view, not a second wallet, independently resettable allowance or competing budget. Native-currency amounts and usage are receipt components of the same operation. Exact amounts use fixed precision; reserve upward, settle actual supported usage, append adjustments rather than rewriting history.

The ratebook key includes provider, exact model/alias-resolution version, region, deployment scope, account market, API/profile, service tier, native currency, tokenizer and pricing version. Values include standard input, implicit cached input, explicit cache create/read, final/reasoning output treatment, Batch variant/rates, relevant length thresholds, effective date, official source, last verification, expiry and qualifications. Billing categories must match the API: for the initial OpenAI-compatible profile, cached and cache-created tokens are portions of total input, and reasoning is a portion of completion output. Do not charge those subsets twice. Do not infer international USD prices by converting the mainland price table when the account has its own official tariff.

For a CNY invoice and a USD ledger, a signed treasury-approved FX record specifies F = CNY per USD, timestamp, validity, settlement source and an adverse reservation bound. Use a fresh record (initial maximum age 24 hours), preferably a locked settlement quote. A planning example uses F/1.05 to reserve a 5% adverse movement buffer; an unhedged 5% buffer is not a guarantee against larger movement. Final settlement uses the agreed realized-rate policy, retaining both versions and any adjustment. FX changes do not reset usage or release unknown reservations. Unknown/stale prices or FX, uncertain currency and unenforceable token bounds deny new paid admission. Check current official pricing/model metadata at activation and at least daily in the future service; an expired ratebook never silently authorizes calls.

COST_MODEL uses F=7 only as a clearly hypothetical budget-comparison example, with 6/7/8 sensitivity, not a claimed current exchange rate. It creates no live FX source, treasury account or charge. Recommended-route modeled usage fits the existing monthly envelopes over that sensitivity; all-Max/stress workloads can hit feature budgets earlier. This is expected safety containment, not grounds for a hidden entitlement reduction. An actual pilot must verify intra-day reservations and normal-use interruptions before sales. Any necessary consumer allowance change requires a separate owner decision.

### 15.5 Provider cache and Batch are conditional optimizations

PAIA's existing result cache remains first: a valid repeated read makes no model request. Baseline Qwen forecasts assume no provider cache hit. Official implicit caching is automatic, cannot currently be disabled through the documented interface, needs a sufficiently long matching prefix, and does not guarantee a hit or a retention interval. The official isolation boundary is the Alibaba account/model, not each PAIA consumer. Before private processing, qualify a tenant-isolated request-prefix strategy and the disclosed retention profile. Shared public instructions/schema may be reusable; do not pool private Topic/Context prefixes between principals, log private prompt bodies, pad short prompts or issue warming/keepalive calls.

Explicit cache is a separate optional profile: the documented five-minute lifetime, write cost, prefix/block matching and model-specific prices can make it unsuitable for hourly/eight-hour revisits. No automatic persistent full-Topic cache is adopted. A generic cache-rate formula does not override a conflicting model-specific tariff; use conservative reservation and confirm the actual SKU. Cache-hit sensitivity in COST_MODEL is a fraction of input tokens, not an application-read hit rate or a guaranteed total-cost discount.

Provider Batch File is not PAIA's ordinary local batching. The inspected File API allows a 24–336-hour completion window and generally prices successful work at half Standard. It is suitable only for separately authorized offline qualification or low-priority historical backlog with explicit delay/retention handling. Do not use it for current Pro hourly maintenance, interactive Organize or Assist; do not delay Free's normal periodic maintenance into a next-day product. Batch Chat can queue for up to an hour and has Standard list pricing; temporary discounts are not a baseline. It is not the v1 default either.

The Max Beijing main alias supports Batch on its model page; its fixed snapshot and inspected international/global routes do not. Flash's model-specific page says Batch unsupported while generic Batch APIs list it: support is unresolved, so the Flash Batch route stays disabled until exact workspace/model qualification. Do not borrow alias capability or pricing for a snapshot. Polling a known batch ID is retrieval; submitting another batch after an unknown response is potentially another bill. Failed-row/nonbilling rules documented for a particular Batch API do not establish general synchronous timeout semantics.

### 15.6 Region, security and launch qualification

Qwen is primary only where the exact regional profile satisfies PAIA's user consent, contractual/data-residency and quality requirements. A service region describes endpoint/storage, while deployment scope describes where inference can run. Singapore international and Virginia/Frankfurt global are not automatic country-only processing guarantees. The reviewed Max 3.8 Virginia entry is global, not proof of US-only inference. A US-only requirement without a qualified matching route leaves that capability unavailable; it must not silently fail over to Beijing or another region.

For new integrations, evaluate the official workspace-specific endpoint pattern `{WorkspaceId}.{region}.maas.aliyuncs.com/compatible-mode/v1`; bind credentials and job principal to the approved workspace/region. The documented legacy DashScope endpoint feature-freeze date is 2026-09-30. Endpoint availability and long server timeouts are not PAIA latency SLAs. Measure actual regional p50/p95/p99 and account-wide throughput. Dynamic TPM limits and displayed RPM are not a concurrent-job allowance; the gateway enforces its own bounded concurrency and shares the real provider-account capacity across tenants/workspaces.

No-training statements do not mean zero retention. The privacy notice and service agreement preserve necessary call-data processing/retention and backup exceptions. Numeric raw-call retention, deletion confirmation, transfer obligations and selected-region terms must be resolved for the actual commercial account before private data egress. Keep optional full inference/body logging off; use minimum metadata for reconciliation. Default request audit metadata is not an authoritative bill or a real-time budget lock. Actual invoice/payment-center records reconcile the financial ledger.

This amendment creates no Alibaba resource, account, key, subscription, endpoint connection, paid evaluation or user-data processing. All route entries remain CANDIDATE / NOT_QUALIFIED. Seven-stage delivery is unchanged, with scoped Qwen acceptance in PLAN; the unique first AI task remains AI-COST-01 under current STATUS selection.
