# Personal Topic Architecture — development and gap plan

Workstream: CPV1-TOPIC inside PAIA Consumer Product v1. Product authority: [TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md), PT-1.0, owner-approved 2026-10-07. This file specifies work; [STATUS.md](STATUS.md) alone selects the next task. [Adoption](TOPIC_ARCHITECTURE_ADOPTION.md) records the exact baseline and superseded clauses.

State at adoption: product contract approved; runtime work NOT_STARTED_BY_THIS_TASK; migration NOT_EXECUTED; model/downstream evaluation NOT_RUN; production certification NOT_CLAIMED. No code, tests, schemas, provider configuration or real data are changed by adoption.

Final visual integration, 2026-10-07: [THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md), TL-PT1-UI-1.0, now controls Thought presentation. [References and evidence limits](THOUGHT_LIBRARY_PT1_VISUAL_REFERENCES.md) identify the owner-provided private artifacts. This update details TOPIC-05.1 through 05.8 in section 7; it creates no second workstream and leaves TOPIC-01 as the sole next pointer in STATUS. Visual adoption is not implementation or production visual acceptance.

## 1. Baseline and reusable assets

PAIA main at architecture adoption: `73f07b3dbe42fdb66f89500efa87513c2da96239`; tree `8f543e4833af81689008cde8f0d0052f435390e2`.
Semantic Lab main: `0ec6d9748cb88422d20a1e02c8d2047343f8bf96`.
Both branch heads were freshly read for that documentation task. Code statements below describe inspected source, not the user's installed database or a new runtime test.

Final-visual documentation integration reads PAIA `0093c81300b8dff80b0cf00c4f2cad6130840030`, tree `20fc912862258992ff1485e85412ad9c78ac1a81`. It preserves the original architecture audit above. PR175's Archive change and bounded historical Topic return-position deferral do not certify the new Root or waive replacement return-position coverage.

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
| G14 | Fresh ui/topic-workspace-presentation.js: TopicWorkspacePresentation, topicPresentationFacts; prior UX T1/T2/T5 | Presenter still moves topic-original-tabs and builds year/coverage navigation. Final default is durable Section prose, and Root's adopted specification now uses named Section overview, not compact cue/recency. Reconcile existing owners and read contracts; this inspection is not a claim that every reusable Section primitive is absent. | TOPIC-05.1/05.2/05.4 |
| G15 | Owner-adopted visual contract V2/V3/V5/V6 and private overview | Stable slot/search restoration, Section-target writing, contextual move/promotion and ephemeral heading isolation require concrete current-contract acceptance. An overview image cannot prove these behaviors or complete 30/50/100/144 rendering. | TOPIC-05.2 through 05.8; closure TOPIC-06 |

No missing item is silently credited as complete because adjacent legacy tests passed. Detailed source/authority distinctions are in the adoption record. G01-G13 retain the architecture-adoption inspection scope; G14-G15 identify this later visual integration and its evidence boundary.

## 3. Ordered delivery slices

These are dependent outcomes, not parallel product directions or a requirement for one PR per row. Use one writer for shared identity/storage boundaries. Each implementation request starts from fresh main and preserves current service/privacy restrictions.

| Slice | Deliverable | Dependencies and completion boundary |
|---|---|---|
| CPV1-TOPIC-01 | Personal Topic identity + human-intent protection foundation in existing domain services, with narrow compatibility mapping and executable local contract tests | First; no LLM, taxonomy, new UI design or broad reorganization. Establish one identity and per-field/per-edge authority. |
| CPV1-TOPIC-02 | Bounded identity retrieval + hidden candidate/lifecycle and unassigned-state handling | 01. Include dormant, renamed, redirected and removed-fence behavior. No user candidate directory; retrieval coverage is measured. |
| CPV1-TOPIC-03 | Identity-first formation and Section/multi-placement policy, incremental trusted commit | 01/02. Explicit-object and emergent-subject paths; eligibility, evidence independence, human constraints, CAS, cancellation and retry safety. Fixture mechanics first; actual model activation separately gated. |
| CPV1-TOPIC-04 | Confirmed Section promotion and guarded structural reconciliation | 01/03. Stable new identity, no copied body, preserve manual layout and location/history mapping; no relation graph. |
| CPV1-TOPIC-05 | Adopted Topic/Section Root and continuous reader, scoped search, Section editing/writing, AI reading and Context compatibility | Relevant 01-04. Deliver 05.1-05.8 below using TL-PT1-UI-1.0; no new design, second Library or candidate UI. Coordinate retained CTX4-03/04. |
| CPV1-TOPIC-06 | Migration/reliability/performance and real downstream acceptance closure | Applicable earlier slices plus separately authorized service/data/client prerequisites. No synthetic-to-real promotion and no automatic Lab integration. |

All slices remain PLANNED at this documentation integration. Implementation is not started here. The prior next Context phase remains planned rather than cancelled; it is not a competing next-task pointer. Topic identity/authority comes before affected CTX4 Topic access integration. Other nonconflicting approved product lines and their failures/blocks remain preserved under current STATUS.

The display adds no new content layer: Topic identity, stable default/named Section identities, human order and Placement authority must be dependable before the consuming UI path is accepted. Stage 03 supplies actual organization, never pseudo-Sections inferred in UI. Stage 04 supplies promotion, not a requirement to wait for unrelated live services before all local reading checks. Section 7 specifies actual dependencies; STATUS still selects one next task, beginning at 01.

## 4. CPV1-TOPIC-01 — first bounded implementation contract

Outcome: existing Topics remain the same objects across AI creation metadata, human rename/takeover, include/exclude, keep-separate, remove/restore and redirected lookup; all future automatic paths consume one trusted identity/constraint contract.

Work scope:

- Audit the exact current identity, layout, protection and deletion owners; add only the minimum missing metadata and typed domain operations needed by PT-01/PT-07/PT-08. Select physical storage through the existing schema-change justification rules, not a second library/store of bodies.
- Preserve stable IDs and existing body binding. Store or derive nonconflicting alias/scope information with authorship and revision; do not invent historical aliases or human intent when evidence is missing.
- Make human protection field/edge-specific. A user move must durably protect inclusion and exclusion; keep-separate must be available to every identity decision and prevent indirect collapse. Removed identities retain a no-recreation fence.
- Define valid lifecycle transitions without activating automatic formation. Candidate is an internal type/state, never an ordinary user resource or external authorization target. Same stable ID survives human takeover and dormancy.
- Add conservative, bounded, restart-safe compatibility metadata mapping and tests. Do not sweep, rename, merge, demote or delete the user's existing Topics. No real user database migration/installation is authorized by this planning document.
- Include existing stable default/named Section identity, protected name/order and Placement edge behavior in the foundation's contract tests. Do not expand this into new UI, automatic formation or an alternate body-binding model. Final UI depends on this foundation but is not part of TOPIC-01 completion.

Acceptance: actual production domain functions, not a handwritten mirror, pass local tests for identity-preserving rename/takeover; new unprotected placement after rename; include/exclude persistence; user-fixed membership sets; keep-separate through aliases/redirects/third identities; removed identity no-recreation; restore protection; stale CAS and failed transaction preservation; single Entry body across placements; stable default Section and protected Section rename/order; conservative unknown legacy authorship; restart/idempotent mapping; zero provider/network and zero external permission expansion.

Record the source head, changed fields, compatibility choices and targeted results. This closes only the identity/authority foundation, not semantic formation, migration of real data, UI completion, live LLM quality or the whole workstream. Stop on data loss, unexpected schema/capability broadening, protection loss or permission expansion rather than weakening gates.

## 5. Migration and rollback requirements for later delivery

Before a storage/identity change, use the existing TECHNICAL_PLAN migration receipt and VERIFICATION release/migration checks. Preserve Source/Working/Thought body ownership, IDs, revisions, provenance, all layout generations, human name/order/pin/keep decisions, negative membership, merge redirects, source tombstones and permission fences. Default unknown authorship to protected. No user-data scan is performed in this documentation task.

Inspect legacy catch-all Topics by origin/evidence and manual edits, never by name alone. Only demonstrably system-generated unprotected placeholder membership can move into unassigned-state representation under a separately reviewed migration. Preserve manually named, edited or ambiguous containers; unresolved cases remain intact and are not forced into a user candidate inbox. Existing saved AI-presentation candidates are not Topic formation candidates and must not be silently deleted or promoted.

No eager global renaming/reclustering. Use bounded resumable metadata work, idempotent receipts, checked generations and atomic activation. Failure leaves the old usable view intact. Rollback may restore a structural state only after checking later human work and deletion fences; it cannot resurrect purged material or grants. Keep a supported recovery point without restoring the cancelled backup-generation product. New Topic IDs start externally closed; merge/promotion cannot union permissions.

## 6. Organizer execution and service boundaries

Use the existing trusted worker/domain write path, eligibility resolver, provenance and CAS. A provider receives only permitted bounded evidence and candidate descriptors, never a database writer. Internal processing scope, current user organization permission, external read access and payment entitlement are separate checks. A historical instruction is not live consent.

Plan only affected Inputs and identities; preserve context-only versus direct evidence. Capture, local reading/editing and lawful lexical retrieval remain available when organization is pending, deferred, offline or unavailable. Freeze automatic dispatch when scope/service/budget is unavailable; never restore retired BYO/direct transport or silently retry a paid request. Atomic commit revalidates identity, scope, lifecycle, source, human intent and revisions after inference.

A real LLM adapter is not chosen or connected here. The approved automatic behavior must later work within a real authorized service and budget without per-Topic approval. This is not an authorization for hidden recurring billing. Synthetic adapters remain isolated test machinery and cannot qualify real formation quality.

## 7. Final visual implementation — CPV1-TOPIC-05

[TL-PT1-UI-1.0](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md) supplies the single presentation contract. This section is its only implementation breakdown. 05.1-05.8 are internal deliverables of the existing TOPIC-05 slice, not eight new competing workstreams, mandatory PRs or Owner re-approval loops. End a coherent authorized batch with source and evidence; do not reopen Card/Grid or Topic architecture design.

Adapt the existing Thought root, Topic reader and ordinary editing to the one-library identity/read contract. Do not create human/AI directories, a root-wide AI approval manager, hidden-candidate counts, a candidate inbox, graph UI, recursive parent selectors or taxonomy folders. Preserve approved shell, accessibility, IME, dirty drafts, navigation/reading anchors and failure recovery. Confirmed promotion uses the existing ordinary action/confirmation language rather than a new management product.

Cards v2 retains its approved four-card design and independent Context Items. Its My Inputs references the same Personal Topic IDs. The numbers 20/50/144 in its scale examples are synthetic list-size scenarios, NOT a requirement to instantiate the 144 System Topics. New Topic identities remain off; same-ID rename cannot change access; removal, redirect, promotion and shared Entry behavior must be tested against existing stronger denials. External Topic reads reach the real eligible end or state the exact incompleteness; never open Archive as a fallback.

### 7.1 TOPIC-05.1 — Unified Thought read model

Dependencies: the applicable 01/02 identity and human-constraint contract, existing Section/Entry/Placement services, and 03 organization contract for generated structures. Reuse these owners; UI does not scan and join raw stores, invent Sections or hold a second normalized body store.

Deliver a bounded query model carrying stable Topic/Section/Entry IDs, named/default distinction, human-protected order, metadata-only placements, body-owner/revision references, real source/time/coverage and separately typed AI reading structure. Root requests bounded named-Section overview; opening a Topic requests continuation through its complete eligible content. Names are labels, not routing identity. Empty user-created named Sections and indefinitely untitled default Sections remain valid.

Acceptance: real domain query tests for zero/one/many/long named Sections; same-name distinct identities; rename without route break; single body across multi-placement; hidden candidates absent; removed/excluded targets absent where required; Unicode-safe cursors, explicit partial coverage and no entire-library body load just to draw Root. Context consumes the same Personal IDs through its existing scoped service, not this UI as an authorization shortcut.

### 7.2 TOPIC-05.2 — Stable Personal Topic Root

Dependencies: 05.1 plus shared shell/navigation/view-state services. Implement independent rectangular blocks with Topic title and bounded named Section overview. No normal recency/count/summary/Entry-preview template, shared table rules, masonry or taxonomy. Use plain Section anchors and title-only Topics when no named Section exists. Keep continuation and full-name access without changing stored text.

Define the stable slot/view-state owner explicitly within existing architecture. At the same viewport, ordinary Entry/Section updates, renames, search and AI toggles must not repack Root. New Topics use compatible holes or append. Delete produces blank space with no empty block or drop target. Responsive reflow preserves identity/order; returning to a prior viewport restores that address model. Readability/text enlargement may cause necessary reflow, not hidden clipping.

Acceptance: complete synthetic fixtures with 30/50/100/144 distinct Personal Topics; measured normal-scale page and actual count assertions; no/one/many Sections; long Chinese/mixed-script labels; delete/restore, add, rename and Section update sequences comparing unaffected bounding boxes/order; no false total-count cap; native hover/focus, selection without accidental navigation, keyboard Section/title reachability and identity-relative Back/Forward. One static screenshot does not close layout stability.

### 7.3 TOPIC-05.3 — In-place Root search

Dependencies: 05.1/05.2 and existing eligible lexical search. Cover Topic names, named Section names and Entry bodies beyond Root preview and current DOM. Reuse bounded indexed queries rather than a per-keystroke full-body scan.

Keep the grid fixed; Section matches emphasize the corresponding anchor, including temporary exposure of a normally omitted Section. Entry-only matches expose an exact bounded excerpt in the same block. Explicit result stepping opens the real Topic/Section/Entry offset; typing does not yank scroll. Clear/close restores previous Section overview, focus and identity-relative scroll. Partial indexing and stale/deleted targets are not "no results" or an excuse to resurrect content.

Acceptance: name-only, hidden-overview Section and unmounted-Entry matches; negation/Unicode-safe excerpt integrity; search/clear produces no permanent placement or body writes; exact target and query/Back restoration; no second result directory, provider call, permission expansion or Archive fallback. Semantic retrieval is not claimed from lexical matches.

### 7.4 TOPIC-05.4 — Continuous Topic/Section reader

Dependencies: 05.1 and existing editor/reader/search owners. Replace conflicting Content/Years composition with one page of durable Sections and actual Entries. Untitled default has no manufactured heading. Named Sections are unboxed prose headings, not cards, tabs or a tree. Empty manual Sections remain usable. Keep quiet reliable time and on-demand source/version evidence; unknown time remains unknown.

Read to the real end with bounded incremental rendering/windowing only where measured useful. Do not unmount a composing editor, active selection or unsaved body. Preserve saved prose width/size, exact text, paragraph structure, search offsets and source/Entry identity across repeated navigation. No broad rich-document rewrite or new body store is implied.

Acceptance: no named Sections, mixed default/named, empty manual Section, very long Section, thousands of Entries where the existing test scale applies, multi-paragraph and code/mixed-language content, unknown dates, additions while scrolled, continuation failure/retry, text selection across loaded boundaries, restoration by Entry/revision/offset. Native DOM and screenshots must prove no per-Entry timeline/card regression. Replace the specifically deferred legacy Topic return-position assertion with the new route's equivalent or stronger test, preserving all unrelated coverage.

### 7.5 TOPIC-05.5 — Contextual Section operations and promotion entry

Dependencies: 01 human field/edge authority, relevant 03 placement rules, 05.1/05.4; promotion additionally depends on TOPIC-04. Rename/create/reorder/move use existing trusted commands and revision-checked transactions. An inline rename does not change identity or mark unrelated fields protected. A move records both destination inclusion and old-location exclusion; reorder and undo preserve human intent. No permanent admin sidebar or ubiquitous drag handles. Provide non-drag keyboard/touch controls and explicit whole-Entry versus selected-span scope.

Attach the confirmed promotion flow only when TOPIC-04 is ready. It displays the actual affected placements and preserves body/provenance/location history. It does not redirect the whole parent Topic, duplicate entries automatically or inherit external access. Cancelling is side-effect free.

Acceptance: reload, organizer rerun, concurrent edit, failure, undo/restore and model/index rebuild cannot undo protected Section/name/order/membership. Default destination remains available without becoming a named "Unclassified" Section. Promotion tests cover stale proposal, cancel, idempotent commit, source deletion, new-ID-closed, old Section anchors and preserved negative intent. No hidden candidate becomes a UI approval queue.

### 7.6 TOPIC-05.6 — Section-aware Add Thought and direct writing

Dependencies: existing safe write/editor lifecycle, 01 protections, 05.1/05.4 and applicable 05.5 insertion commands. Resolve an explicitly active Section by identity; otherwise use the stable default Section. Do not guess from a stale scroll position. A lightweight destination choice may clarify context without making classification a prerequisite to saving.

Writing appears as continued prose. Enter adds a paragraph, not sends. Use correct first-party creation identity/current time. Preserve caret, IME, selection, draft, version and truthful durable save acknowledgement. A header action and an in-content action use one writing owner, not duplicate composers. Root-level writing can remain lawfully unassigned rather than generating a catch-all Topic.

Acceptance: explicit Section/default fallback, removed or renamed destination during editing, reload/navigation, IME, storage failure/retry, duplicate-click/idempotence, correct creation time and unchanged Source facts. Unsupported B-01/B-02 effects remain separately gated; no silent reverse write or copy is used to make the UI appear complete.

### 7.7 TOPIC-05.7 — AI reading presentation over durable Sections

Dependencies: 05.1/05.4, protected derivative/revision services and relevant 03 organization boundaries. Saved valid projection read/toggle is local. New generation needs the separately implemented real service, processing authorization, entitlement and bounded budget; fixtures never imply those are ready.

OFF and ON preserve the same durable Topic/Section identities and Entry body owners. ON can reorder derivative reading, reversibly fold exact repeats and use small ephemeral headings. Those headings are not new Sections and never enter Root overview or Context authorization directories. Durable Section formation is a separate trusted Organizer operation governed by PT-05/PT-07, not a side effect of the reading toggle. Protect user-edited projection fields separately from Entry bodies.

Acceptance: compare durable Section IDs/names/order and body hashes before/after toggle and heading edit; no durable writes from a reading-only action. Verify no forced headings for simple content; near-repeats retain negation/conditions/uncertainty; folded originals remain accessible with source/time. Revision changes, revocation, source deletion and cancelled/late outputs preserve current content; no silent paid retry or Candidate/Compare/Adopt UI. New/unprocessed material remains visible with honest coverage. IME/selection/dirty state postpone visual reflow, and OFF restores an Entry-relative anchor. Semantic fidelity/live quality need separate authorized evidence, not schema validation alone.

### 7.8 TOPIC-05.8 — Responsive, accessibility and visual convergence

Dependencies: applicable completed 05.1-05.7 behavior; representative unavailable-service/error states are tested honestly. Consume the approved visual direction and current shared tokens; do not create new root layouts, fonts, navigation or an independent dark palette. Calibrate block/Section typography and finite overview capacity at real viewport sizes, recording the actual used values and fallback fonts. An overview image is not a CSS measurement sheet.

Acceptance includes actual 30/50/100/144 fixtures, desktop/compact/tablet/phone, light/dark, zero/many/long Sections, empty slot, full-content search and result return, no/one/many Section readers, Section actions/writing, unknown time, save/conflict failure, AI saved/unavailable/processing/stale states and promotion when ready. Verify native focus order/return, heading semantics, 32/44px applicable targets, text enlargement, 320 CSS px reflow, reduced motion, long Chinese/mixed-script labels and retained reading preferences. No clipped focus, inaccessible continuation or false generated/saved success.

Use existing VERIFICATION.md, native browser/release evidence and source-head mapping. Static screenshots support visual review but not interaction, semantic quality, installed-version confirmation or full product certification. Preserve the old route until the replacement's relevant data/edit/privacy/return behavior is certified. Overall production visual closure belongs to TOPIC-06; record any missing owner-reference/state evidence exactly rather than inventing it.

### 7.9 Stage-05 delivery and dependency discipline

Use the order 05.1 -> 05.2/05.4 -> their consuming search/actions/writing -> AI presentation -> combined convergence, with one shared writer where owners overlap. This is dependency detail inside TOPIC-05, not additional next-task pointers. Do not schedule blanket concurrent writes to the same navigation/editor/domain layer.

A missing live model, client or promotion dependency blocks its affected behavior only; it does not invalidate safe local reading/search/edit acceptance after their prerequisites. Conversely, local screenshots and synthetic mechanics cannot close real-service, semantic, migration or production acceptance. STATUS remains the only authority for when each coherent batch starts.

## 8. Verification matrix

Apply existing VERIFICATION.md and DEFERRED_FINAL_GATES.md; do not create a parallel certification system. At implementation, use current package scripts and exact production code paths.

- Formation: distinct but semantically similar projects; clear new object on first sufficient evidence; incidental named entity; repeated independent subject; duplicate/revision/import evidence not double-counted; sparse or ambiguous history; incomplete candidate retrieval; same-name different identity; aliases and dormancy; concurrent first creation.
- Organization: transient Topic/Section rejection without losing substantive decisions; default Section longevity; manual unusual labels; meaningful Section recurrence; multi-idea splitting versus one shared Entry; second-placement value; promotion by identity rather than count; no implicit tree or graph dependency.
- Human authority: rename, move, membership exclusion, fixed set, keep-separate, pin/keep/restore, third-identity merge bypass, model/index rebuild and import replay. No automatic reversal of explicit human intent.
- Safety/recovery: stale provider reply, worker kill, rollback, storage failure, revoked scope, deletion during inference, all-generation purge, authorization non-expansion and private text absent from public logs/fixtures.
- Product: exactly one Library and identity after takeover, zero candidate approvals, existing saved work intact, root without fixed parents, complete current-scope retrieval, shared Entry dedupe, no Archive fallback and no false success.
- Scale/quality: bounded work, latency/memory/idle cost on declared hardware; held-out chronological downstream organization/retrieval/Context tasks and correction/identity-error accounting. Engineering tests, semantic quality, real client and production visual acceptance are separate verdicts.
- Final Thought presentation: section 7's native Root/reader/action/state matrix, stable identity-relative navigation, Section-aware search/writing and zero durable-Section mutation from AI reading headings. Do not call a labeled representative image a complete cardinality or behavior test.

No arbitrary Topic-count minimization target; do not improve precision by making all meaningful content unassigned. Do not turn evaluation into default Product Signals collection. Real personal data, processing and costs require explicit authorized evaluation scope.

## 9. Optional Lab admission experiment

No taxonomy is the required production baseline. Any later optional Lab proposal must compare no taxonomy, 18-Domain signals and 144-Topic signals on the same downstream tasks with comparable model/history/permissions and budgets. Report human correction count, duplicates, wrong merges, identity errors, retrieval misses/noise, Context relevance, latency, cost and human-intent/permission violations. Separate classification capability from downstream utility; predeclare meaningful gain and critical regressions. Lack of benefit keeps the module outside production. This plan neither executes that experiment nor changes the Lab research queue or its full-144 standards.

## 10. Scope lock

This integration adopts the reviewed final design and plans its implementation; it creates no new design alternatives. No code, Organizer implementation, LLM/provider calls, Semantic Lab integration, paid evaluation, real-data migration, release, second Library, candidate inbox, 144-topic directory or graph expansion is performed by this documentation task. B-01/B-02/B-03/B-04-3B/B-05 and real-service/client/device gates remain unresolved where applicable. Unrelated Context/Prompt Reuse decisions are retained. The next task is selected only in STATUS.md.
