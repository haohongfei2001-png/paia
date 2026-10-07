# PAIA AI Usage — Dependency-Ordered Development Plan

Plan: **AIU-PLAN-1.0**, 2026-10-07. Status: **PLANNED / NO_RUNTIME_WORK_STARTED**.
Product/entitlement authority: [AI_USAGE_ARCHITECTURE.md](AI_USAGE_ARCHITECTURE.md). Transformation: [STYLE](AI_ORGANIZE_STYLE_CONTRACT.md). Adoption and supersession: [ADOPTION](AI_USAGE_ADOPTION.md). STATUS alone selects execution.

## 1. Execution rule

Preserve the current CPV1-TOPIC-01 exact-main verification closure and all approved non-AI work. This plan adds a dependency graph, not a second scheduler or a blanket authorization to implement. When the AI lane is selected, its unique first task is AI-COST-01. No real provider or paid test follows merely from merging this documentation.

Prefer the existing domain owners and stores: OrganizerProvider/CredentialProvider, BudgetPolicy/BudgetLedger, organizerJobs/work items/organizerUsage/operationReceipts, Entry/Input revision and source gateways, Topic identity/constraints, AI presentation/candidate/checkpoint owners, ContextCardsService, Smart Filter, existing Prompt surface and shared preference normalization/acknowledgement. Introduce physical stores only after a justified bounded schema decision preserving all existing invariants; never add a second copy of the Archive or another preference/entitlement contract.

Definitions, receipt schemas, failure semantics and benchmark fixtures are specified early. Telemetry is instrumented from the first slice; quality is not postponed until the final cost-acceptance task.

## 2. Dependency graph and integration ownership

`AI-COST-01 -> AI-COST-02 -> AI-COST-03 -> AI-COST-04`

`AI-COST-02 -> AI-COST-05`

`AI-COST-02 -> AI-COST-06`

`implemented enabled facets 01–06 + actual service/quality prerequisites -> AI-COST-07`

Default execution order is 01, 02, 03, 04, 05, 06, 07 under one selected writer. The graph allows a separately authorized independent slice without making 05 wait artificially for every filter improvement.

Cross-plan dependencies:

| Existing plan owner | Relationship |
|---|---|
| TOPIC-01 identity/human intent | Foundation prerequisite; keep current verification closure rather than reimplementing it |
| TOPIC identity retrieval and formation slices | Consumed by AI-COST-03; forming an identity requires their actual qualified policies, not just a model response |
| Context Cards v2 manual Item/lifecycle/protection and automatic-maintenance slices | Preserve CTX4 ownership/phase gates. Shared remote extraction consumes AI-COST-03; a missing card capability remains unavailable, not faked |
| Thought visual authority / TOPIC-05.7 AI reading | Consumes AI-COST-05 derivative/cache/style contract; no new reader or durable Section owner |
| Settings Consumer v2 SET2-01 and SET2-05 | Existing preference/row integration and final production UI acceptance consume the STYLE amendment; final row inventory comes from current Settings adoption |
| Prompt Reuse Stage 1/2 and Stage 3A | Keep local pathways, insertion/no-send and independent reply consent. AI-COST-06 adds only the separate AI Assist intent path |
| Browser-Native Sync | Adds the style preference through BNS's consumer preference codec; device jobs/caches/grants/credentials do not travel. Canonical human work remains preserved |
| Existing verification/deferred gates | Remain the only certification framework; do not build a parallel dashboard or count synthetic checks as live quality |

A shared output facet can remain unavailable while another runs only if UI and receipts honestly declare the supported scope. Do not advertise complete Topic/Context/AI Filter maintenance before the respective owner has implemented and qualified it.

## 3. AI-COST-01 — Semantic Delta / Job / Receipt foundation

**Dependencies:** actual stable identity/revision/human-fence foundations; current queue selection. **Scope:** local deterministic implementation and tests only.

Define three job types, immutable logical and child operation identity, meaningful semantic fingerprints, per-facet coverage/acknowledgement, cancellation/consent epochs, single-flight, body-free reservation/outcome receipt schema and a provider-neutral execution boundary. Audit `planDelta` and replace repeated full-body scans for scheduling with bounded indexed dirty work, reusing canonical revisions/journals. Do not acknowledge holes by maximum sequence.

Read/set contracts without copying private bodies into a new queue store. Existing source and current Working Input resolution remain the only source-body gateway. Multi-device semantic identity is defined independently from transport delivery. Domain owners still validate every mutation.

Acceptance: capture precedes optional AI work; 100 captures create no mandatory provider requests; repeated same revision/Sync delivery/navigation produces no new semantic work; rapid edits coalesce; create/delete before dispatch cancels work; partial Topic and failed Context acknowledgements remain distinct; duplicate evidence does not inflate Topic formation; human edits/removals revoke stale work; restart/unknown operation never remints a paid attempt; no production network. Add body-free counters for skipped-no-delta, local-resolved, cache intent and physical attempt.

Deliverable: one reviewed local contract/owner integration and deterministic regression evidence, with all paid gates still closed. This is the first new AI task, not “connect a model”.

## 4. AI-COST-02 — Budget Manager / entitlement / quota / cache admission

**Dependencies:** 01. **Scope:** unified admission and trusted-service contract, fixture-backed integration first; no subscription backend or unapproved paid activation.

Extend existing budget/usage ownership to effective result quota, physical attempts, complete input/output token bounds, ratebook version, feature envelopes, user rolling caps and global atomic reservations. Define the optional AI service principal and signed entitlement boundary without a PAIA username/password or content-cloud product. Local test tier flags must be visibly fixtures, never a production Pro proof. Preserve retired BYO/direct transport refusal.

Cache and current authorization are evaluated before a new paid reservation. Define one logical operation across devices and one child attempt identity. Disable SDK implicit retries. Implement conservative unknown-outcome reconciliation and distinct effective-quota/spend settlement. Design evidence in the ratebook must include pricing tier/region/tokenizer and enforceable billable output limits.

Acceptance: exact cache hits cost zero; separate Organize/Maintenance/Assist quotas cannot borrow from each other; a token/$ limit can stop a request even below call count; concurrent devices cannot double-reserve; timezone/clock/restart cannot refill quota; failure/unknown outcomes do not falsely refund billable spend; no paid repair/fallback loop; an unset global allowance disables remote admission; all local and cached-core actions remain usable after every budget-stop variant. Simulate forged entitlement and gateway unavailability.

A minimal trusted AI admission/gateway implementation is a prerequisite to production paid work, but commercial identity/payment provider selection and actual subscription services remain separately gated. Do not claim that client-only unit tests certify real billing enforcement.

## 5. AI-COST-03 — Unified Personal AI Maintenance

**Dependencies:** 01/02, relevant Topic identity/retrieval/formation and Context Item/protection/processing-consent owners. **Scope:** one bounded orchestrator, not separate feature pipelines.

Implement Free/Pro delta-gated eligibility, sleep/resume coalescing, no catch-up call storms, bounded backlog and priority for fresh meaningful content. Build one minimal multi-facet request over authorized current delta and relevant existing Topic/Section/Context state. The new purpose-scoped multi-conversation DTO must explicitly replace, not silently bypass, any legacy one-conversation restriction and retain independent evidence provenance/current eligibility. Bound input/output and at most two physical children/cycle under AIU.

Validate Topic routing, hidden formation evidence, Section candidates and ADD/UPDATE/REMOVE_CANDIDATE/NO_CHANGE Context operations separately. Same evidence arriving repeatedly does not rerun DEFER without a changed reason. Info/Rules require stricter qualification than routing; Now carries actual validity/temporal status. Preserve human-edited/manual Items and semantic removal fences. No entire-profile regeneration or external permission expansion.

Acceptance: representative 37-Input delta is locally reduced and batched into the bounded cycle, not three full payloads for Topic/Context/filter; no-delta windows make zero requests; Pro uses at most the admitted hourly cycle rather than per-change dispatch; Topic/Context quality thresholds match tiers; duplicate/alias/dormant/keep-separate/removal cases hold; quote/hypothetical/history uncertainty cases pass; one failed facet does not redo already committed facets or acknowledge unprocessed evidence; long backlog remains honest and core capture never waits.

Use fixtures until the selected route and service pass their real activation gates. Passing a response schema is not proof of Topic/Context quality.

## 6. AI-COST-04 — Pro ambiguous AI Filter facet

**Dependencies:** 03 and current local Smart Filter/reading snapshot/search owners.

Retain Light deterministic preprocessing and its human/attachment/reference guards for both tiers. Add an opt-in Pro facet only for unresolved unprotected candidates with enough permitted user-context evidence. It uses maintenance requests and receipts; no per-Input Provider call or remote assistant-history read is introduced. Expand decision-policy versions explicitly only after false-positive evidence, not by disabling the old grammar safety validator.

Acceptance: all high-confidence/local cases stay zero-cost; human keep/edit/restore cannot be hidden by any model confidence; ambiguous/insufficient returns keep; search can find filtered text; late decisions do not alter the active editing/reading snapshot; filtering never deletes Input or removes existing Thoughts; filter OFF and downgrade behavior are correct; a missing filter facet does not create an extra immediate call. Report important-content false positives, precision, coverage and sample size separately; a high filter rate is not a success criterion.

## 7. AI-COST-05 — Organize cache / incremental refresh / three styles

**Dependencies:** 02, existing evidence/projection/candidate owners and approved Thought reading/preference integration. Maintenance can be developed independently; no dependency on a separate paid filter pipeline.

Implement semantic cache keys and authorized reads, style preference enum/revision, scope manifests, source-span rendering, patch-level refresh, bounded full recomputation and user-edited derivative protection. Use the existing Settings preference owner; add only the one STYLE selection row and no Topic segmented control. Missing legacy style defaults without a bulk rewrite. Integrate BNS preference representation under its own plan, not by synchronizing transient requests or reactivating consent.

Acceptance: same cached Topic reopened/toggled 20 times makes zero requests; a 200+5 Entry test sends only affected evidence/necessary neighbors by default; style change across a 40-Topic Library makes zero requests until one explicit Topic refresh; A->B->A can reuse valid A cache; model-version changes do not trigger full-library work; all three modes pass separate fixed/held-out fidelity tests; no Source/Working Input/human Thought mutation or durable Section creation; no uncertainty/chronology/voice loss; every generated block has current traceable sources; partial scope and unavailable evidence are honest; user edits survive refresh; failed/unknown output keeps usable old/original reading.

Test actual preference persistence, keyboard/focus, save failure, cross-window state, service-unavailable and quota-exhausted UX. Prior mock layouts are not production visual acceptance. Real model quality remains an explicit additional qualification, not inferred from deterministic fixtures.

## 8. AI-COST-06 — AI Orb lazy generation / entitlement

**Dependencies:** 02, approved Prompt surface/composer insertion and separate latest-reply access/remote-processing consent. Keep Stage 3A default-off/local behavior unchanged.

Reply completion records eligible fingerprint only. Ordinary Smart Orb card opens remain free. A deliberate current AI-suggestion activation checks cache, newest-reply generation, actually relevant Context dependencies and single-flight before requesting one bounded Assist result. Do not capture drafts, old assistant history or the entire profile. No hover prefetch in v1; a later measured opt-in experiment must reuse the same guardrails.

Acceptance: unviewed replies cost zero; ten activations on one valid fingerprint produce at most one result; irrelevant Context edits do not invalidate it; a genuinely relevant change can invalidate only its dependent suggestion; late/newer replies cannot receive stale inserted suggestions; revocation clears transient state; no auto-send; unavailable/failed/exhausted AI leaves saved local prompts usable; reply text never enters Archive/Thought/Context/backup/ordinary logs. Quota charges effective generations, not opens or clicks on a suggested prompt.

## 9. AI-COST-07 — Cost / quality / production budget acceptance

**Dependencies:** actual implemented and enabled 01–06 scope; trusted service/entitlement, privacy/region and provider qualification. Instrumentation and fixed fixtures already exist from earlier slices.

Recompute current official prices and route capability at test time. Replay the documented light/normal/heavy/tail workloads, cache/no-delta splits, 200+5 refresh, cross-device concurrency, time-zone boundaries, long output, timeout/5xx/unknown outcome and global-budget stop. Compare predicted and settled token/$ receipts; report error and uncommitted billable work. Confirm typical promised usage does not routinely hit hidden safety limits.

Run mode-separated blinded author review and Topic/Context/filter evaluations with actual denominators, independent held-out examples and confidence bounds. Synthetic mechanics tests and a private user's production outcome are different evidence. No zero-error population claims from a tiny synthetic set. Check incremental drift and body/evidence/privacy leakage alongside price.

A separately approved bounded model evaluation could start with an aggregate **$50 maximum** envelope for synthetic/consented evaluation, narrower per-run request/token limits and no unknown-outcome rebill. This is a proposed future ceiling, not current spending authorization. Actual provider setup, evaluation use of real personal data and commercial rollout each need their existing permission gates; no token or budget here enables them automatically.

Exit evidence: qualified route/version by job/style, actual financial reconciliation, no protected-data mutation, body-free telemetry audit, zero-cost core/browser traces, fair-use UX, real device/worker behaviors and exact-main/release certification through the existing framework. If a route fails fidelity, keep that paid capability off or defer; do not substitute a cheap inaccurate Free route. If economics fail, revise batching/model qualification/explicit commercial allowance before sales, not invisible user-data quality.

## 10. Rollout and rollback

Default all new remote execution flags off. Implement/verify local contracts and fake-provider orchestration first. Enable only independently qualified service/job facets with explicit end-user processing consent and signed entitlement. Owner design adoption is not that consent. Do not silently re-enable retired settings or stored credentials during upgrade/restore.

Rollback disables new paid admission and revokes new transient execution leases without deleting originals, human organization, manual Context, existing legally readable organized results or preferences. Stop unknown/billed operations through receipts; do not clear the ledger to make a test pass. Existing BNS and recovery compatibility gates protect canonical user work. No app version or runtime change occurs in the present documentation-only task.

## 11. Completion taxonomy

DESIGN_ADOPTED, IMPLEMENTED_LOCAL, FIXTURE_VERIFIED, REAL_PROVIDER_QUALIFIED, FINANCIALLY_RECONCILED, PRODUCTION_VERIFIED and OWNER_VISUAL_ACCEPTED are separate statuses. No earlier status implies a later one. This plan currently reaches only DESIGN_ADOPTED with calculated synthetic workload estimates. Current next execution remains whatever STATUS selects; the first task in this new AI lane is AI-COST-01.
