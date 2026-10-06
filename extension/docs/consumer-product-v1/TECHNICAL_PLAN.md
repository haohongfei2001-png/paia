# Technical Restructuring Plan — PAIA Consumer Product v1

Product semantics are fixed by current owner authority; implementation is replaceable where justified. [TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md) PT-1.0 controls Topic identity/formation; [TOPIC_ARCHITECTURE_PLAN.md](TOPIC_ARCHITECTURE_PLAN.md) owns its gaps and delivery details. [AI_CONTEXT_CARDS_V2_PLAN.md](AI_CONTEXT_CARDS_V2_PLAN.md) controls Context Items/access. [STATUS.md](STATUS.md) alone selects execution. This documentation adoption changes no runtime, schema, provider, tests or installed data.

## 1. Target responsibility model

```text
Provider / first-party source adapter or explicit user write
 -> trusted admission: identity, role, consent, idempotency, time, deletion fences
 -> transactional Source + Working Input / independent Thought + human decisions
 -> bounded change cursor / receipt
 -> one Personal Topic identity and human-constraint owner
 -> replaceable automatic organization / search / AI reading projections
 -> trusted policy and revision-checked commit of allowed fields/edges only
 -> one Library query/edit model and existing UI router
 -> authorized Context Items / Personal Topic retrieval
 -> trusted connection/revocation/content gate
 -> read-only external response, only when actually enabled
```

This is a responsibility model, not a requirement for separate databases. No retired Context Builder/export path is reactivated. Internal organization and external read permissions are distinct. Capturing and saving do not wait for AI classification.

## 2. KEEP

Keep stable Source/message/Conversation and Topic identities; immutable source evidence versus Working Input; existing Thought evidence/body binding subject to B-01; single Entry body and multi-Placement; Sections/default Sections; rename/redirects; field protection and human include/exclude/keep-separate intent; revisions/CAS; deletion/tombstone anti-resurrection; provider adapters; trusted worker/caller validation; useful lexical/candidate retrieval; protected AI derivative output; current Context release revalidation and Passport metadata; strict import and existing-file Backup decoder/hash/graph checks; existing privacy tests and truthful failures.

No UX/Organizer rewrite may weaken these. Reuse current services before introducing a new owner or schema. Historical broad AI-writing code is not permission to modify human facts.

## 3. REFACTOR

### 3.1 Capture and source lifecycle

Keep verified evidence channels; drive observation by meaningful route/DOM/visibility/reconnect changes with bounded compensation. Project membership/name changes can produce metadata events without duplicated Source/Conversation/body. Unknown, unassigned and last-known remain distinct. Temporary evidence loss does not invent moves. Detect stale content-script versions explicitly. Justify polling with measured idle resource cost. Absorb correct CPR-02 work rather than rewrite for style.

### 3.2 Worker tasks

Worker termination is normal. Import, supported index/recovery work and authorized AI tasks use bounded batches, durable checkpoint/receipt, idempotence, revision/generation checks and cancellation. No correctness-critical progress lives only in process memory. Long work cannot weaken scope gates or silently retry paid calls.

### 3.3 Domain command/query APIs

UI owns neither persistence nor provider/Passport policy. DTOs have version, operation ID, revision precondition, bounded payload and typed safe errors. Queries expose user concepts, not storage internals. Topic commands/read models share stable IDs, human constraints and current layout; there is no parallel human/AI directory or external candidate API.

### 3.4 Editing

Preserve IME/grapheme/revision primitives and one EditorSession per editable body: current text, base revision, dirty/composition/selection, save/failure state and approved recoverable drafts. Navigation cannot overwrite the session by independently refetching content. Topic name/field/placement protection is distinct from body protection; renaming does not freeze all future memberships.

## 4. REPLACE ONLY JUSTIFIED IMPLEMENTATION

### 4.1 Consumer shell and page composition

Existing approved visual authority remains. Where implementation still has competing DOM/coordinator owners, converge on one AppShell/navigation/history owner, one route/state model, one owner per control, one focus/dialog stack and notification presenter, with shared components/tokens. Certify a replacement route before retiring its old orchestration; do not keep two persistent handlers for the same action.

Framework choice is secondary to Chrome MV3, IME, long-list behavior and current build constraints. Do not perform a framework rewrite or invent a new UI as part of Topic semantics. The Topic plan's later UI work adapts current readers, not another mock.

### 4.2 Supported restore and recovery at scale

The earlier backup-generation/streaming-export development path is cancelled by current consumer scope. Preserve supported existing-file restore, compatibility decoders and legitimate internal recovery. Necessary restore execution uses preflight, consistent generations, bounded staging, strict graph/hash/tombstone checks, atomic activation, non-empty restore/merge policy and a usable old library on failure. Supported browse/search and restore scales must not contradict each other. An internal migration recovery point is not authorization to recreate a user export/backup product.

### 4.3 Consumer update/distribution

Keep the developer updater as fallback. Normal consumer distribution requires verified packaging, extension identity preservation, schema preflight, unsaved-work protection, reconnect guidance, self-check and rollback where compatible. Do not define ordinary use as GitHub Desktop/manual scripts/chrome://extensions. No deployment/publication is performed by this documentation change.

## 5. DERIVED CAPABILITIES

### 5.1 Retrieval

Current lexical search is not semantic search. Add replaceable semantic/hybrid retrieval only against fixed evaluation tasks and measured need. Preserve lexical fallback, rebuildable indexes, no new personal-truth body store, revision/deletion/exclusion invalidation, real body/time/source/Topic locations and honest partial coverage. Evaluate paraphrase, fuzzy memory, negation, corrections and no-answer cases across relevant languages. Choose model/vector technology from quality/cost/resource evidence.

Personal Topic organization, retrieval and Context reuse must operate with no fixed taxonomy module/assets/service. Candidate lookup reuses existing names, aliases, boundaries and permitted historical evidence. Include dormant identities and redirected/renamed history; apply removed fences. Bounded shortlist omission is not proof of a new identity. Optional 18/144 semantic signals cannot hard-filter identity or content and require PT-12 downstream admission. A Lab classifier PASS is not integration approval. Taxonomy independence does not itself authorize an LLM or embeddings.

### 5.2 Dependency invalidation

Track revisions across Working Input, Thought evidence/binding, Topic/Section derived names/evidence, organization projection, AI reading output, search indexes and Context scope/manifests. Preserve generation evidence separately from current validity. Edits/deletion mark affected derivatives stale or remove them safely. Human facts survive rebuild, and paid recomputation is not automatically triggered. Purge cleans all relevant generations/history/caches and necessary source-derived naming without destroying independent human work outside the existing B-02 boundary.

### 5.3 Recovery drafts

Where failure testing requires it, use bounded protected local recovery drafts. They are not Source/history truth, have expiry, clear after commit and relevant permanent deletion/data clearing, and never live in host website storage.

### 5.4 Personal Prompt Reuse Surface

Retain the approved contracts PROMPT_REUSE_SURFACE.md and PROMPT_REUSE_STAGE_3A.md. This is local reuse over eligible Working Inputs and explicit template overrides, not another archive/Context store.

Stage 1/2 remain local, reply-blind and Provider-free. Provider adapters own composer discovery/insertion; generic arbitrary-site contenteditable injection is not a fallback. Trusted extension services own family queries/overrides; the host receives only selected text released by the user's action. Do not preload a personal prompt corpus into host DOM/storage. Shadow DOM is style isolation, not an authorization boundary; use an extension-controlled boundary whose exposure is tested.

Ordinary insertion never sends/submits; acknowledge only after composer verification, with no unknown-outcome retry. Preserve existing drafts, selection, IME and framework ownership; destructive replace is a separate explicit action. Family membership/ranking is rebuildable; durable user work is limited to actual template edits, pins/order, representative selection, hide/split corrections and safe geometry. Template editing never rewrites Source/Input and does not resolve Thought B-01/B-02. Any necessary new persistence satisfies the existing schema/migration/compatibility gate rather than adding a store just for ranking.

Stage 3A uses a provider-specific CurrentReplyAdapter for only the newly completed latest assistant reply in the current supported conversation, under its default-off authorization. Do not expand user-only capture into an assistant archive. Reply text is ephemeral: no Source/Working/Thought/Context/Backup/website/log body. NextActionDetector locally derives DIRECT_REPLY, CHOICE, REQUEST_USER_MATERIAL, PROMPT_FAMILY_MATCH or DEFER with zero Provider/model/network calls. Family matching consumes the existing eligible reuse service through a disposable bounded view, not another vector/body index or per-token full-library scan.

Direct suggestions are not persistent Prompt Families. Bind them to current tab/document/conversation/reply revision and authorization generation, revalidate at click, and reuse established provider insertion/read-back/no-send behavior without accepting arbitrary strings as trusted families. Render under the extension-controlled boundary; do not expose full prompts or reply evidence to host scripts. Disable/revoke invalidates reply reader, in-flight work and late candidates. Stage 3B remote/model generation remains separately gated by B-04-3B. Topic adoption changes none of this.

### 5.5 Personal Topic identity and formation

PT-1.0 defines behavior; TOPIC_ARCHITECTURE_PLAN.md supplies the implementation gap mapping and stage acceptance. Required internal responsibilities, preferably in existing domain owners:

- Stable Personal Topic identity, scope/alias history, lifecycle and redirects, independent of names, human/AI origin, source Project and System Catalog.
- Durable field/edge human intent including negative membership and cross-path keep-separate; conservative legacy authorship.
- Eligible bounded identity retrieval covering active/dormant/renamed/merged identities and removed suppression, followed by a current-version duplicate/constraint recheck before creation.
- Identity-first policy with explicit-object versus independent repeated-subject evidence, six-part admission, useful Section formation and per-additional-Placement value.
- Hidden candidate evidence/lifecycle and ordinary unassigned state, not formal catch-all Topics or a user inbox.
- Trusted commit that rechecks source, processing scope, human constraints, lifecycle, layout and CAS after inference; stale/cancelled results cannot alter the library.

Human facts and AI projection can be separate records internally, but the read model resolves one stable identity set and one Library. No source/body copy per layer. No automatic writes to human facts; only scoped unprotected AI fields/edges and eligible new automatic placements. Renaming/takeover keeps ID; reconstructing a projection cannot reconstruct a removed identity under a synonym. Section promotion creates a new Topic only after explicit user confirmation and moves needed Placements without body duplication. related_to/part_of and Topic graph are not MVP dependencies.

## 6. AI Organize versus Topic Organizer

Topic Organizer performs PT identity/formation/placement. Topic-local AI Organize renders a derivative interpretation over the same traceable evidence. Its prose grouping cannot create recursive durable hierarchy, replace human structure or become a second Library. Reuse versioned candidate/projection and protected-output mechanics without reviving candidate approval management.

Requests remain bounded by authorized relevant evidence, incremental changes and stable revision fingerprints. Processing service, entitlement, budget and cancellation must be real before enabling generation; cached reads do not call a Provider and there are no hidden paid retries. Existing saved AI content/version history remains intact. Schema/structure, evidence validity and semantic fidelity are separate validation layers; the third needs independent task evaluation, not reference validation alone.

## 7. AI Context and Passport

Cards v2 supersedes the old compiler-only/Builder/package workflow. Info/Rules/Now own small independent editable Items; Inputs owns access to stable Personal Topic identities. Do not clone the Archive/Thought corpus or maintain an independent Topic directory. New identities start externally closed, including promoted identities.

At every trusted directory/search/read/continuation/cache/release boundary, enforce current global/category/connection/Topic eligibility plus stronger source/content/legacy restrictions. Ordinary Topic off and independent Item state remain distinct. Organization/alias/rename/dormancy/merge/extra membership or optional semantic signals cannot authorize reading or union grants. Shared Entries deduplicate by stable ID after eligibility checks. Changes invalidate affected current scope/revision tokens; a redirect is not permission inheritance.

Whole requested eligible Topic contents must reach their real end or declare precise incompleteness. Excerpt-only Thought content does not authorize a hidden Archive tail. External retrieval has no Archive fallback or arbitrary Source/Conversation/Project permission. Preserve attribution, uncertainty and chronology. Passport remains trusted authorization/revocation metadata, not another body store or consumer console; restore cannot re-enable access.

## 8. Connector and internal processing

The first real Context connector is read-only: list/query authorized Personal Topics/Items, read by stable permitted reference, bounded paging/rate/size, exact scope/revision checks, revocation and minimal body-free audit. No full-library upload for remote filtering. Historical text and Rules cannot change permissions.

Internal Topic formation processing is separately authorized and uses typed changes through the trusted policy/commit path. A read-only external client cannot call it as a write bypass. Future external write/organize proposals require distinct explicit permission and current validation; no third party writes storage directly. Client/transport and paid processing are separate dependencies, not a reason to restore BYO transport or weaken authorization.

## 9. Import and source expansion

Keep provider-neutral Source ownership and provider-specific adapters. Official import support requires a current real export passing preflight, role/time/branch handling, dedupe, interruption, preservation of human edits, tombstones and recoverability. Each live provider is a vertical integration, not a registry entry. Mutable sources define source revisions explicitly. Topic migration/reimport cannot duplicate identity or fabricate independent evidence from duplicate source events.

## 10. Sync / cloud / mobile

B-03 must be resolved before production cloud Sync. Preserve account/device trust, appropriate encryption/key lifecycle, stable identity, revision/conflict behavior, offline replay, tombstone propagation, revoke/loss and recovery. No plaintext-content authority is delegated to a coordination service without an explicit decision. MyWrite uses first-party stable creation IDs/current time, not an impersonated AI message. Voice requires explicit microphone/transcription permissions. None is activated by Topic planning.

## 11. Migration contract

Schema, identity or canonical-body representation changes require the existing Migration Receipt, not another process:

- from/to runtime and schema;
- local entity counts and safe hashes;
- identity/alias/redirect mappings and exact unknown-state handling;
- Source/Working/Thought body and revision/provenance preservation;
- unknown-time preservation;
- human name/Section/order/pin/keep/include/exclude/keep-separate/no-recreation preservation;
- source tombstone and all-generation deletion fences;
- authorization delta, including no automatic grants/permission union;
- existing-file compatibility and supported recovery point;
- bounded staging, interruption injection, idempotent resume and atomic activation;
- rollback that respects later human work and permanent deletion;
- limitations and unsupported cases.

Real private text/identifying evidence stays local. Public tests are synthetic/sanitized. Do not start a destructive real-data migration without a proven supported recovery point. In the current docs-only task no migration runs.

Legacy catch-all containers are not deleted by name. Migrate only proven unprotected system-generated placeholders under a reviewed plan; preserve manually authored or ambiguous structure. Candidate expiration cannot erase Source/Entry content, and old saved AI-presentation candidates are not hidden Topic candidates. Do not globally rename/recluster existing personal work to make it fit the new contract.

## 12. Technical non-goals

No vector database before retrieval evidence; no whole-library cloud shortcut; no Source rewrite during UI migration; no model per provider; no remote arbitrary executable adapter; no historical-prompt authorization; no body store per view; no recursive Topic/Section or invisible relation tree; no candidate inbox; no second AI Library; no required 18/144 taxonomy. Replace obsolete tests only with equivalent or stronger product/trust coverage, never to get a green build. Runtime tests and paid/downstream evaluation are future work, not claimed by documentation.
