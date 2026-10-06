# Personal Topic Architecture — development and gap plan

Workstream: CPV1-TOPIC inside PAIA Consumer Product v1. Product authority: [TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md), PT-1.0, owner-approved 2026-10-07. This file specifies work; [STATUS.md](STATUS.md) alone selects the next task. [Adoption](TOPIC_ARCHITECTURE_ADOPTION.md) records the exact baseline and superseded clauses.

State at adoption: product contract approved; runtime work NOT_STARTED_BY_THIS_TASK; migration NOT_EXECUTED; model/downstream evaluation NOT_RUN; production certification NOT_CLAIMED. No code, tests, schemas, provider configuration or real data are changed by adoption.

## 1. Baseline and reusable assets

PAIA main: `73f07b3dbe42fdb66f89500efa87513c2da96239`; tree `8f543e4833af81689008cde8f0d0052f435390e2`.
Semantic Lab main: `0ec6d9748cb88422d20a1e02c8d2047343f8bf96`.
Both branch heads were freshly read for this documentation task. Code statements below describe inspected source, not the user's installed database or a new runtime test.

Keep stable Topic IDs, persisted default/named Sections, metadata-only Placements, shared Entry bodies, multi-membership, rename without ID change, merge redirects, field protection, include/exclude intent, keepTopicsSeparate, provenance, Source fences, revisions/CAS, existing candidate retrieval and low-durability/duplicate safeguards where correct. Reuse existing storage/read/commit services. Do not replace the entire Thought Library or add a body store per projection.

## 2. Source-grounded gap register

Paths below are relative to extension/. A gap is NOT an implemented fix. Recheck symbols against fresh main at implementation start.

| ID | Inspected implementation / contract | Gap against PT-1.0 | Planned owner |
|---|---|---|---|
| G01 | core/thought-store.js: createTopic, renameTopic, canonicalTopic; core/thought-schema.js: topics indexes | Stable ID, name and redirect already exist. Explicit object/subject scope, alias history and the complete lifecycle/identity lookup contract are not supplied by these constructors/indexes. Renamed is an identity history, not a sixth lifecycle. | TOPIC-01/02 |
| G02 | core/thought-store.js: placeEntryInTransaction; core/organizer/policy.js | Include/exclude intent and protections exist; placement currently marks topics/section/order together. Unify precise field/edge authority across user and automatic paths; prove rename does not freeze unrelated placement and an explicit exclusion survives reruns. Old broad AI/user-accept branches are not product authorization. | TOPIC-01/03 |
| G03 | core/organizer/topic-quality.js: keepTopicsSeparate, topicMergeSuggestions, stabilizeTopicProposal | Keep-separate currently filters merge suggestions, while proposal reuse has no equivalent constraint input in this module. Enforce identity constraints throughout resolution, aliasing, reuse, commit and indirect merges. | TOPIC-01/02 |
| G04 | core/organizer/topic-quality.js: rankTopicCandidates | Current lexical/name/summary/history ranking is reusable. It filters active rows and excludes redirects, then narrows 32 to 8; it is not the required dormant/old-name/redirect identity resolver or evidence of complete recall. No full-library scan on every keystroke; use bounded indexed lookup and final creation recheck. | TOPIC-02 |
| G05 | core/organizer/topic-quality.js: stabilizeTopicProposal, existingSectionForProposal | Name similarity/low-durability rules are not the six-part formation policy. Add identity-first decisions, explicit-object versus repeated-subject evidence, explainable boundaries, and mutable versioned thresholds. Do not hardcode three/two as product constants. | TOPIC-02/03 |
| G06 | core/organizer/original-simple.js: DEFAULT_TOPIC, materializeOriginalBatch | Uncertain/transient output can become a formal catch-all Topic. Replace future automatic catch-all creation with unassigned state. Existing containers must be handled by provenance/ownership, never destroyed merely because their name matches. | TOPIC-02/03 |
| G07 | core/organizer/topic-quality.js: isSectionWorthyFragment, topicRenameSuggestions | Automatically promoting update labels to Sections and fallback vague renames can evade quality goals. Require stable useful internal aspects; preserve default Section and manual labels. | TOPIC-03 |
| G08 | core/topic-governance.js and existing Topic/layout/redirect operations | Active/removed and merge mechanics are useful, but lifecycle transitions, durable no-recreation fences, candidate expiry and dormant reactivation need end-to-end specification/implementation. | TOPIC-01/02/03 |
| G09 | core/library-documents-store.js, core/library-layout.js; foundation placement contract | Preserve current single-body/multi-placement mechanics. Add safe Section promotion with explicit confirmation, provenance/location mapping, restart-safe staging and authorization non-expansion; do not infer support merely from existing merge. | TOPIC-04 |
| G10 | core/organizer/ai-presentation.js; AI_EXPERIENCE_MVP.md; PRODUCT_INTENT_CONTRACT.md previous sections 7/8 | Topic-local derivative presentation is not root Topic formation. One identity/organization read model must combine human facts and allowed AI edges without a second library or write-back into human facts. Existing saved presentation/candidate content is retained. | TOPIC-01/03/05 |
| G11 | AI_CONTEXT.md; AI_CONTEXT_CARDS_V2_PLAN.md; ARCHITECTURE.md search/body-binding sections | Cards v2 is approved but not implemented by its planning task. Bind its Topic list/search/full-read contract to Personal IDs; verify dedupe, alias/lifecycle transitions, new-ID closed defaults and restrictive permission reconciliation. No excerpt tail may be supplied through Archive fallback. | TOPIC-05 and retained CTX4 integration |
| G12 | Current consumer scope; README; retained provider code | Live AI service is not launched and retired direct transport is not a valid activation path. Future real formation requires an authorized service/processing scope and separate semantic-quality evidence; fixtures prove mechanics only. | TOPIC-03/06 |
| G13 | Lab Catalog, catalog architecture, README and ZMR STATUS | Lab full-144 research remains UNTESTED/NOT_QUALIFIED in the inspected current status and isolated from PAIA. Formal labels/profile expansions are not Personal identity. Add downstream optional-module admission, not automatic integration on classifier PASS. | TOPIC-06; integration remains unapproved |

No missing item is silently credited as complete because adjacent legacy tests passed. Detailed source/authority distinctions are in the adoption record.

## 3. Ordered delivery slices

These are dependent outcomes, not parallel product directions or a requirement for one PR per row. Use one writer for shared identity/storage boundaries. Each implementation request starts from fresh main and preserves current service/privacy restrictions.

| Slice | Deliverable | Dependencies and completion boundary |
|---|---|---|
| CPV1-TOPIC-01 | Personal Topic identity + human-intent protection foundation in existing domain services, with narrow compatibility mapping and executable local contract tests | First; no LLM, taxonomy, new UI design or broad reorganization. Establish one identity and per-field/per-edge authority. |
| CPV1-TOPIC-02 | Bounded identity retrieval + hidden candidate/lifecycle and unassigned-state handling | 01. Include dormant, renamed, redirected and removed-fence behavior. No user candidate directory; retrieval coverage is measured. |
| CPV1-TOPIC-03 | Identity-first formation and Section/multi-placement policy, incremental trusted commit | 01/02. Explicit-object and emergent-subject paths; eligibility, evidence independence, human constraints, CAS, cancellation and retry safety. Fixture mechanics first; actual model activation separately gated. |
| CPV1-TOPIC-04 | Confirmed Section promotion and guarded structural reconciliation | 01/03. Stable new identity, no copied body, preserve manual layout and redirects/history; no relation graph. |
| CPV1-TOPIC-05 | One-library read-path/UI adaptation and retrieval/Context compatibility | Relevant 01-04. Adapt existing approved shell/readers without redesign; candidates invisible; Personal Topic root; same ID after user takeover; coordinate with retained CTX4-03/04. |
| CPV1-TOPIC-06 | Migration/reliability/performance and real downstream acceptance closure | Applicable earlier slices plus separately authorized service/data/client prerequisites. No synthetic-to-real promotion and no automatic Lab integration. |

All slices are PLANNED at adoption. Implementation remains unstarted. The prior next Context phase remains planned rather than cancelled; it is not a competing next-task pointer. Topic identity/authority comes before affected CTX4 Topic access integration. Other nonconflicting approved product lines and their failures/blocks remain preserved under current STATUS.

## 4. CPV1-TOPIC-01 — first bounded implementation contract

Outcome: existing Topics remain the same objects across AI creation metadata, human rename/takeover, include/exclude, keep-separate, remove/restore and redirected lookup; all future automatic paths consume one trusted identity/constraint contract.

Work scope:

- Audit the exact current identity, layout, protection and deletion owners; add only the minimum missing metadata and typed domain operations needed by PT-01/PT-07/PT-08. Select physical storage through the existing schema-change justification rules, not a second library/store of bodies.
- Preserve stable IDs and existing body binding. Store or derive nonconflicting alias/scope information with authorship and revision; do not invent historical aliases or human intent when evidence is missing.
- Make human protection field/edge-specific. A user move must durably protect inclusion and exclusion; keep-separate must be available to every identity decision and prevent indirect collapse. Removed identities retain a no-recreation fence.
- Define valid lifecycle transitions without activating automatic formation. Candidate is an internal type/state, never an ordinary user resource or external authorization target. Same stable ID survives human takeover and dormancy.
- Add conservative, bounded, restart-safe compatibility metadata mapping and tests. Do not sweep, rename, merge, demote or delete the user's existing Topics. No real user database migration/installation is authorized by this planning document.

Acceptance: actual production domain functions, not a handwritten mirror, pass local tests for identity-preserving rename/takeover; new unprotected placement after rename; include/exclude persistence; user-fixed membership sets; keep-separate through aliases/redirects/third identities; removed identity no-recreation; restore protection; stale CAS and failed transaction preservation; single Entry body across placements; conservative unknown legacy authorship; restart/idempotent mapping; zero provider/network and zero external permission expansion.

Record the source head, changed fields, compatibility choices and targeted results. This closes only the identity/authority foundation, not semantic formation, migration of real data, UI completion, live LLM quality or the whole workstream. Stop on data loss, unexpected schema/capability broadening, protection loss or permission expansion rather than weakening gates.

## 5. Migration and rollback requirements for later delivery

Before a storage/identity change, use the existing TECHNICAL_PLAN migration receipt and VERIFICATION release/migration checks. Preserve Source/Working/Thought body ownership, IDs, revisions, provenance, all layout generations, human name/order/pin/keep decisions, negative membership, merge redirects, source tombstones and permission fences. Default unknown authorship to protected. No user-data scan is performed in this documentation task.

Inspect legacy catch-all Topics by origin/evidence and manual edits, never by name alone. Only demonstrably system-generated unprotected placeholder membership can move into unassigned-state representation under a separately reviewed migration. Preserve manually named, edited or ambiguous containers; unresolved cases remain intact and are not forced into a user candidate inbox. Existing saved AI-presentation candidates are not Topic formation candidates and must not be silently deleted or promoted.

No eager global renaming/reclustering. Use bounded resumable metadata work, idempotent receipts, checked generations and atomic activation. Failure leaves the old usable view intact. Rollback may restore a structural state only after checking later human work and deletion fences; it cannot resurrect purged material or grants. Keep a supported recovery point without restoring the cancelled backup-generation product. New Topic IDs start externally closed; merge/promotion cannot union permissions.

## 6. Organizer execution and service boundaries

Use the existing trusted worker/domain write path, eligibility resolver, provenance and CAS. A provider receives only permitted bounded evidence and candidate descriptors, never a database writer. Internal processing scope, current user organization permission, external read access and payment entitlement are separate checks. A historical instruction is not live consent.

Plan only affected Inputs and identities; preserve context-only versus direct evidence. Capture, local reading/editing and lawful lexical retrieval remain available when organization is pending, deferred, offline or unavailable. Freeze automatic dispatch when scope/service/budget is unavailable; never restore retired BYO/direct transport or silently retry a paid request. Atomic commit revalidates identity, scope, lifecycle, source, human intent and revisions after inference.

A real LLM adapter is not chosen or connected here. The approved automatic behavior must later work within a real authorized service and budget without per-Topic approval. This is not an authorization for hidden recurring billing. Synthetic adapters remain isolated test machinery and cannot qualify real formation quality.

## 7. UI and Context follow-through, not redesign

Adapt the existing Thought root, Topic reader and ordinary editing to the one-library identity/read contract. Do not create human/AI directories, a root-wide AI approval manager, hidden-candidate counts, a candidate inbox, graph UI, recursive parent selectors or taxonomy folders. Preserve current visual authority and accessibility, IME, dirty drafts, navigation/reading anchors and failure recovery. Confirmed promotion uses the existing ordinary action/confirmation language rather than a new management product.

Cards v2 retains its approved four-card design and independent Context Items. Its My Inputs references the same Personal Topic IDs. The numbers 20/50/144 in its scale examples are synthetic list-size scenarios, NOT a requirement to instantiate the 144 System Topics. New Topic identities remain off; same-ID rename cannot change access; removal, redirect, promotion and shared Entry behavior must be tested against existing stronger denials. External Topic reads reach the real eligible end or state the exact incompleteness; never open Archive as a fallback.

## 8. Verification matrix

Apply existing VERIFICATION.md and DEFERRED_FINAL_GATES.md; do not create a parallel certification system. At implementation, use current package scripts and exact production code paths.

- Formation: distinct but semantically similar projects; clear new object on first sufficient evidence; incidental named entity; repeated independent subject; duplicate/revision/import evidence not double-counted; sparse or ambiguous history; incomplete candidate retrieval; same-name different identity; aliases and dormancy; concurrent first creation.
- Organization: transient Topic/Section rejection without losing substantive decisions; default Section longevity; manual unusual labels; meaningful Section recurrence; multi-idea splitting versus one shared Entry; second-placement value; promotion by identity rather than count; no implicit tree or graph dependency.
- Human authority: rename, move, membership exclusion, fixed set, keep-separate, pin/keep/restore, third-identity merge bypass, model/index rebuild and import replay. No automatic reversal of explicit human intent.
- Safety/recovery: stale provider reply, worker kill, rollback, storage failure, revoked scope, deletion during inference, all-generation purge, authorization non-expansion and private text absent from public logs/fixtures.
- Product: exactly one Library and identity after takeover, zero candidate approvals, existing saved work intact, root without fixed parents, complete current-scope retrieval, shared Entry dedupe, no Archive fallback and no false success.
- Scale/quality: bounded work, latency/memory/idle cost on declared hardware; held-out chronological downstream organization/retrieval/Context tasks and correction/identity-error accounting. Engineering tests, semantic quality, real client and production visual acceptance are separate verdicts.

No arbitrary Topic-count minimization target; do not improve precision by making all meaningful content unassigned. Do not turn evaluation into default Product Signals collection. Real personal data, processing and costs require explicit authorized evaluation scope.

## 9. Optional Lab admission experiment

No taxonomy is the required production baseline. Any later optional Lab proposal must compare no taxonomy, 18-Domain signals and 144-Topic signals on the same downstream tasks with comparable model/history/permissions and budgets. Report human correction count, duplicates, wrong merges, identity errors, retrieval misses/noise, Context relevance, latency, cost and human-intent/permission violations. Separate classification capability from downstream utility; predeclare meaningful gain and critical regressions. Lack of benefit keeps the module outside production. This plan neither executes that experiment nor changes the Lab research queue or its full-144 standards.

## 10. Scope lock

No code, Organizer implementation, LLM/provider calls, Semantic Lab integration, paid evaluation, UI redesign, real-data migration, release, second Library, candidate inbox, 144-topic directory or graph expansion in this documentation task. B-01/B-02/B-03/B-04-3B/B-05 and real-service/client/device gates remain unresolved where applicable. Unrelated Context/Prompt Reuse decisions are retained. The next task is selected only in STATUS.md.
