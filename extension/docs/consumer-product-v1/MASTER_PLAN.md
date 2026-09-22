# Master Development Plan — PAIA Consumer Product v1

This is the detailed construction sequence for PAIA Consumer Product v1.

The execution unit is a complete vertical slice. Each round below is a bounded construction/verification stage inside that slice. The manager may adjust file-level implementation details, but it may not skip round outcomes or silently change product intent.

## 0. Global sequencing rules

### 0.1 Activation

This plan is not active while CPR-02 owns a runtime writer.

After CPR-02 reaches a truthful terminal state and releases the writer:

1. re-read remote main;
2. preserve/absorb correct CPR-02 runtime and evidence;
3. reconcile this planning branch;
4. update routing docs so Consumer Product v1 becomes the active product/engineering queue;
5. set VS-01 / CPV1-01.0 READY.

Do not start CPR-03 or PRD-03 merely because they were next in the historical queue. Their useful reliability requirements are represented in VS-01/VS-02.

### 0.2 Default order

Core desktop candidate:

VS-01 → VS-02 → VS-04 → VS-03/VS-05 → VS-06

VS-03 may overlap VS-04/05 only when its data/Backup boundary has a separate writer and no schema conflict. However, any migration or scale assumption needed by VS-04/05 must wait for the relevant VS-03 safety gate.

Then:

VS-07 → VS-08 → VS-09 → VS-10 → VS-11 → VS-12

VS-09 phase 1 may be pulled earlier after VS-04 if it does not distract from the desktop core.

### 0.3 Round states

PLANNED → READY → IN_PROGRESS → VERIFYING → COMPLETE
or BLOCKED / FAIL.

A round only reaches COMPLETE when its own evidence is done. A slice only reaches COMPLETE when all required rounds and VERIFICATION.md evidence classes are complete.

---

# VS-01 — Safe open, update and recovery

## Outcome

The user can open an existing PAIA archive, safely update the product, continue capturing/editing, and recover ordinary failures without developer tools or repository knowledge.

## CPV1-01.0 — Baseline and lifecycle debt map

Goal:
- reconcile current main, CPR-02 result, PRD evidence, updater, Backup limits, save lifecycle and existing failure records.

Deliver:
- exact runtime SHA;
- current consumer update path map;
- current worker/page version handshake;
- current save acknowledgement semantics;
- current Backup/recovery capability table;
- no code changes unless needed to make the baseline observable.

Exit:
- every known lifecycle failure is classified as fixed, current defect, later VS dependency or unsupported;
- no duplicate historical work is started.

## CPV1-01.1 — Durable save acknowledgement and recovery boundary

Goal:
- make "saved" mean durably committed;
- define and implement recovery for ordinary interrupted editing.

Work:
- unify editor commit receipt;
- test pagehide/tab close/worker termination;
- add bounded local recovery draft only if real failure evidence requires it;
- never treat recovery draft as Source/history truth.

Exit:
- confirmed-saved text survives supported lifecycle tests;
- unsaved text is either recoverable or explicitly not claimed saved;
- no IME/selection regression.

## CPV1-01.2 — Extension/page version handshake and reconnect

Goal:
- remove silent post-update old-page failure.

Work:
- explicit runtime/content-script version handshake;
- stale-page detection;
- safe reinjection only where duplicate-instance risk is controlled;
- otherwise one clear "refresh this ChatGPT page" consumer action.

Exit:
- old tab, new tab, SPA navigation, tab discard/restore and update scenarios do not silently pretend capture is healthy.

## CPV1-01.3 — Consumer update flow

Goal:
- replace GitHub Desktop + script + chrome://extensions as normal use.

Work:
- validated release package/update path available within supported distribution constraints;
- preflight schema/build compatibility;
- protect dirty editing;
- update;
- reconnect pages;
- post-update health check;
- safe rollback when data compatibility permits.

Keep development updater as fallback.

Exit:
- user can follow product UI/instructions only;
- extension identity/local data are preserved.

## CPV1-01.4 — Recovery/degraded UX

Goal:
- implement UX S1/S3/S4/S7 as one coherent failure language.

Cover:
- capture disconnected;
- AI unavailable;
- index unavailable;
- save failure;
- storage pressure;
- stale page;
- update failure.

Exit:
- each state has one bounded next action;
- unaffected local archive remains usable;
- no internal runtime jargon in default UI.

## CPV1-01.5 — Backup protection for update/migration

Goal:
- establish a truthful pre-change protection path for current supported real libraries.

Work:
- identify what current Backup can actually recover;
- create/validate a current-version recovery point or local protected snapshot for the tested support range;
- do not claim the old 64 MiB/100k-entity limits cover a larger archive.

Exit:
- any following schema/runtime migration has a real recovery point for its declared support range.

## CPV1-01.6 — Real lifecycle certification

Journeys:
- existing archive open;
- update with old tab;
- new capture after update;
- Chrome restart;
- worker termination;
- page refresh/reconnect;
- recoverable edit interruption;
- update failure/rollback where applicable.

Exit:
- full applicable CI;
- current real browser evidence;
- user-level flow without DevTools;
- exact-main receipt.

---

# VS-02 — Source structure to world-class Reader

## Outcome

Normal ChatGPT use appears in the correct Project/Conversation structure and opens in a coherent, fast continuous Reader. Moving/renaming Project metadata does not duplicate content or lose position.

## CPV1-02.0 — Absorb CPR Project lifecycle work

Goal:
- take the terminal CPR-02 result as input.

Work:
- verify what PR #47/current CPR work actually merged/certified;
- retain correct route+matching-project evidence;
- retain unknown/unassigned/last-known semantics;
- carry unresolved real-site cases into this slice.

Exit:
- no second implementation of the same lifecycle problem;
- historical CPR status becomes evidence, not a competing queue.

## CPV1-02.1 — Single shell/state owner foundation

Goal:
- introduce the new AppShell/navigation state owner required by UX D0/A1–A3.

Work:
- define route state for source, Project, Conversation, search/sort/anchor;
- implement new shared shell/component primitives on the production path or gated replacement path;
- old coordinator remains only as temporary compatibility bridge.

Exit:
- one owner controls primary navigation and current container;
- no duplicated button proxy for newly migrated controls.

## CPV1-02.2 — Archive root rebuild

Implement:
- source scope;
- one search;
- collapsed Projects;
- unassigned versus unknown;
- compact Conversation rows with title/cue/time;
- overflow import/export;
- no default material tray/dashboard.

Use realistic long/dense synthetic library.

Exit:
- hierarchy, keyboard, narrow width and long-title states satisfy UX contract.

## CPV1-02.3 — Project/Conversation Navigator rebuild

Implement:
- selected row;
- stable collapse/scroll state;
- move/rename projection;
- last-known handling;
- source-deleted display;
- reliable sorting/fallback.

Exit:
- changing source metadata never changes logical Conversation identity or body;
- no duplicate relationship history spam.

## CPV1-02.4 — Conversation Reader rebuild

Implement:
- continuous document;
- quiet date/time;
- one sort toggle;
- one scoped search;
- contextual selection toolbar;
- low-noise overflow;
- new-expression indicator;
- edit-safe virtualization/windowing.

Exit:
- no "next part" dead end;
- selection/IME/dirty content stay stable during windowing and navigation.

## CPV1-02.5 — Remove migrated legacy UI ownership

Goal:
- prevent new shell from becoming one more overlay.

Work:
- delete/disable the old coordinator/CSS selectors for A1/A2/A3 after equivalent behavior is certified;
- retain domain services;
- update tests to the new production path with equal/stronger assertions.

Exit:
- no permanent dual handler for migrated routes/actions.

## CPV1-02.6 — Performance/accessibility hardening

Measure:
- 10k and 100k representative archive navigation/Reader;
- 120 Hz reference hardware;
- long Chinese/English text, code, emoji, long titles;
- idle multi-tab resource.

Verify:
- keyboard tree navigation;
- focus restoration;
- 200% text;
- 320 width;
- reduced motion.

## CPV1-02.7 — Real ChatGPT lifecycle acceptance

Current real-site journeys:
- Project A → Project B;
- Project → ordinary;
- ordinary → Project;
- Project rename;
- reload;
- away/back;
- temporary evidence loss;
- ordinary non-Project;
- supported custom GPT negative;
- new capture appears in correct location.

Exit:
- current live evidence + exact-main CI + UX review;
- user can find/open/switch/return without engineering steps.

---

# VS-03 — History import, export and recoverable large library

## Outcome

A real official history export can be imported, de-duplicated, read with honest time/role semantics, exported openly, and restored within the product's declared supported scale.

## CPV1-03.0 — Support-scale contract

Define:
- supported Input/Source/entity counts;
- size ranges;
- memory/disk budgets;
- supported historical Backup/import versions;
- no mismatch between "can browse" and "can recover".

Exit:
- explicit scale/SLO table; old limits retained honestly until replaced.

## CPV1-03.1 — Real official export verification

Use current real official ChatGPT export structure under private/local handling.

Verify:
- format recognition;
- roles;
- branches;
- times;
- attachments/unsupported cases;
- duplicate import;
- malformed/ambiguous negatives.

Claude or another provider only earns "supported" after its own real export verification.

## CPV1-03.2 — Import resumability and consumer preflight

Implement UX A8:
- choose;
- preflight;
- import;
- result/review.

Add:
- durable batch checkpoint;
- idempotent retry;
- interruption resume;
- exact duplicate detection;
- protected-edit/tombstone respect;
- storage preflight.

## CPV1-03.3 — Streaming/segmented Backup export

Replace current whole-library execution bottlenecks as needed.

Requirements:
- consistent snapshot;
- incremental output;
- full domain coverage;
- integrity;
- privacy explanation;
- no claim of encryption unless true.

## CPV1-03.4 — Staged restore and non-empty policy

Implement:
- validate before mutation;
- staging;
- graph/hash/tombstone checks;
- merge versus replace;
- atomic activation;
- safe failure preserving old library.

## CPV1-03.5 — Migration and failure injection

Inject:
- interrupted import;
- interrupted export;
- interrupted restore;
- space exhaustion;
- corrupted file;
- unsupported newer version;
- old backup containing content later deleted on this device.

Exit:
- no resurrection/corruption;
- actionable user recovery.

## CPV1-03.6 — Scale and real-library certification

Measure supported ranges and restore them end-to-end.

Exit:
- current-version Backup actually restores the declared supported library;
- repeated import produces zero logical duplicates;
- open export is understandable and complete for declared scope.

---

# VS-04 — Natural editing and fast lexical retrieval

## Outcome

Archive reading/editing/search/filtering feels like one document product. User work is protected without exposing binding/revision internals.

## CPV1-04.0 — Editor/query contract freeze

Define:
- one EditorSession API;
- revision preconditions;
- save/recovery states;
- current-scope query API;
- filter/delete distinction.

No user-visible changes required.

## CPV1-04.1 — Direct editor convergence

Implement UX A4:
- click/text edit;
- IME safe;
- autosave;
- quiet status;
- conflict compare;
- navigation leave guard;
- undo grouping.

Remove competing save owners for migrated content.

## CPV1-04.2 — Version/source inspector

Implement UX A5:
- Source;
- time evidence;
- working versus original;
- versions;
- relationships;
- restore-as-new-current.

Hide internal IDs by default.

## CPV1-04.3 — Lexical search convergence

Implement UX A6:
- one search per container;
- text + time/source/Project where supported;
- exact Reader positioning;
- partial-index state;
- request cancellation/stale response protection.

## CPV1-04.4 — Smart Filter convergence

Implement UX A7:
- default light;
- compare/show all;
- protected user restore/keep;
- search-including-filtered explicit;
- no coupling to deletion/AI permission.

## CPV1-04.5 — Delete/removal policy integration

Complete all uncontroversial distinctions:
- Topic removal;
- Archive removal;
- Source purge;
- AI exclusion.

B-02 blocks only mixed human-derivative permanent purge. Do not delay ordinary reversible removal.

## CPV1-04.6 — Editing/retrieval reliability matrix

Test:
- Chinese IME;
- long text;
- emoji/code;
- concurrent tab edit;
- worker termination;
- storage failure;
- filter rerun;
- search during edit;
- delete/reimport;
- undo after navigation.

## CPV1-04.7 — Consumer UX/performance closure

Realistic long-content visual audit plus 10k/100k lexical/search/scroll measurements.

Exit:
- no "edit mode" knowledge required;
- user can change → find changed content → copy/reuse → inspect history safely.

---

# VS-05 — Living Topics and AI Organize

## Outcome

Cross-conversation expression becomes readable long-term Topics with user additions, historical evidence and faithful AI organization.

## CPV1-05.0 — Resolve B-01 only if still needed

If B-01 is not already decided, present the two product meanings to owner and record the decision.

Do not ask owner for layout, component or algorithm choices.

## CPV1-05.1 — Thought root rebuild

Implement compact Topic scanning:
- one Thought search;
- source scope;
- no Recent Reading;
- no root AI Organize;
- dense long-title handling;
- stable back position.

## CPV1-05.2 — Topic original Reader

Implement UX T2/T5:
- original expression first;
- time/source role;
- long continuous reading;
- early/later/recent navigation without belief claims;
- one Topic search;
- Add Thought;
- AI Organize switch.

## CPV1-05.3 — Independent Thought and relation UX

Implement:
- new Thought;
- optional Topic;
- optional relation;
- real creation time;
- user-language relation inspector;
- B-01 semantics.

No internal Placement/Binding vocabulary in normal UI.

## CPV1-05.4 — AI Organize candidate pipeline

Refine:
- current Topic scope;
- incremental delta;
- affected-old-relation checks;
- candidate version;
- invalid/stale result rejection;
- protected edited output;
- compare/adopt/keep.

## CPV1-05.5 — Semantic fidelity evaluation

Build fixed evaluation cases covering:
- quotation versus belief;
- negation;
- uncertainty;
- correction;
- conflicting expressions;
- causal wording;
- emotional intensity;
- missing time.

Independent review first. Material distortion is blocking even if average score is high.

## CPV1-05.6 — AI Organize UX/motion convergence

Implement production transition and long-running state:
- original remains usable while running;
- no fake progress;
- restrained structure-change motion;
- reduced-motion behavior;
- long Topic performance.

## CPV1-05.7 — Thought end-to-end acceptance

Journey:
cross-Conversation Inputs → Topic → add new Thought → original/evolution → AI candidate → edit AI result → new source change → protected comparison/update.

Exit:
- human work never silently overwritten;
- Source remains traceable;
- user can understand Topic without engineering entities.

---

# VS-06 — Complete AI Context reuse

## Outcome

The user can take explicit Inputs/Conversations/whole Topics/multiple Topics, supplement with retrieval, review exactly what will leave PAIA, and copy/export/provide it under clear authorization.

## CPV1-06.0 — Context manifest/completeness contract

Freeze:
- explicit material manifest;
- revisions/spans;
- retrieval supplements;
- exclusions;
- budget/completeness;
- policy revision;
- release revalidation.

Explicit material may not be discarded by relevance ranking.

## CPV1-06.1 — AI Context workspace rebuild

Implement C1:
- primary navigation workspace;
- one-off task;
- preselected incoming material;
- select material;
- prepare Context;
- connections/permissions.

No requirement to create Profile first.

## CPV1-06.2 — Material selection

Implement C2:
- span/Input/Conversation/Topic/multiple Topics;
- accurate "all selected" semantics across pagination;
- fixed reviewed versions;
- upstream-change indicator;
- no permanent material tray on ordinary Archive.

## CPV1-06.3 — Authorized task retrieval/Profile

Implement C3/C4:
- retrieval within scope;
- Profile as reusable eligibility;
- explicit exclusions/never;
- Profile changes do not send data;
- lexical first; semantic only if VS-07 capability exists.

## CPV1-06.4 — Build/budget completeness

Implement C5:
- fixed material;
- optional retrieval;
- explicit over-budget options;
- split packages;
- no silent whole-Topic truncation.

## CPV1-06.5 — Review/edit/release

Implement C6/C7:
- readable exact preview;
- current-output edits/redactions;
- copy/export;
- connected AI only if a real connector exists;
- success based on actual action;
- uncertain acknowledgement handling.

## CPV1-06.6 — Passport UX and gate hardening

Implement C8:
- consumer/purpose/scope/operation/duration/revoke;
- restore does not reactivate grants;
- revocation affects future release;
- read/write distinction ready for later connector.

## CPV1-06.7 — Context security/reliability acceptance

Test:
- stale preview;
- deleted material;
- revoked/expired grant;
- explicit material larger than budget;
- unauthorized retrieval;
- historical prompt injection;
- edited output;
- copy/export exactness.

Exit:
- visible preview equals released body;
- no unauthorized material;
- explicit selection preserved.

---

# VS-07 — Semantic retrieval and longitudinal Revisit

## Outcome

The user can find old ideas without remembering exact wording, inspect real evidence over time, and re-enter useful old material without feed mechanics.

## CPV1-07.0 — Retrieval task/evaluation freeze

Define fixed lexical and semantic tasks before choosing production technology.

Include:
- Chinese paraphrase;
- fuzzy recollection;
- no shared keywords;
- negation;
- correction;
- quotation versus belief;
- no-answer;
- date/source constraints.

## CPV1-07.1 — Semantic/hybrid bake-off

Use reusable derived indexes. Compare candidate methods for quality/resource/cost. Do not promote independent lab results without production-environment compatibility.

## CPV1-07.2 — Production index/invalidation

Implement:
- rebuildable semantic index;
- incremental update;
- deletion/exclusion/revision invalidation;
- coverage/status;
- lexical fallback.

## CPV1-07.3 — Unified semantic search UX

Integrate into A6/C3/R3 without a new top-level "AI search" product.

## CPV1-07.4 — Longitudinal retrieval

Implement R2:
- real historical expressions;
- reliable/unknown time;
- compare evidence;
- no automatic belief-change claim.

## CPV1-07.5 — Revisit refinement

Implement R1:
- finite, explainable set;
- continue position;
- new meaningful material;
- optional older material;
- exclusions;
- no unread debt/infinite feed.

## CPV1-07.6 — Quality/performance acceptance

Blind/fixed retrieval evaluation + long-library latency + user-level "I remember the idea, not the wording" tasks.

---

# VS-08 — Real read-only AI connector

## Outcome

A supported external AI can query/read only authorized PAIA material; revocation actually prevents later reads.

## CPV1-08.0 — Resolve deployment gates

Resolve B-03 and B-05 only to the extent needed for the real connector deployment.

Verify current supported platform connector/API mechanism; do not assume a historical "GPT plugin" interface exists.

## CPV1-08.1 — Read-only connector contract

Define tools:
- list authorized Topics/material;
- query;
- get by ref;
- get task Context;
- permission self-check.

Bound rate/size/page.

## CPV1-08.2 — Trusted enforcement service

Implement consumer identity/purpose/scope/duration/revoke at the trusted boundary. Do not send full library remotely for filtering.

## CPV1-08.3 — Connector/Passport UX

Implement C9 read path and C8 connection state.

## CPV1-08.4 — Security/adversarial verification

Cover:
- revoked;
- expired;
- wrong consumer;
- wrong scope;
- malicious archived prompt;
- pagination;
- race during revoke;
- private logging.

## CPV1-08.5 — Real external AI acceptance

Run real supported AI:
Topic list → query → retrieve → revoke → same read fails.

Only after this may product copy say the external AI can directly read PAIA.

---

# VS-09 — Prompt reuse phases 1–2

## Outcome

Useful frequent/fixed prompts can be reused in PAIA and inserted/copied into a supported AI input without sending automatically.

## CPV1-09.0 — Candidate/usefulness contract

Define what qualifies as a useful prompt candidate so trivial control utterances do not dominate.

## CPV1-09.1 — PAIA prompt panel

Implement P1:
- frequent/fixed;
- search;
- copy;
- pin/remove/edit reusable template;
- source trace;
- template edit does not rewrite historical Input.

## CPV1-09.2 — GPT/AI-page insertion

Implement P2:
- supported input detection;
- append/replace with existing draft protection;
- fallback to clipboard when injection unavailable;
- no auto-send.

## CPV1-09.3 — Real-page reliability/UX

Test:
- empty draft;
- existing draft;
- Chinese IME;
- multiple tabs;
- provider DOM drift;
- keyboard accessibility;
- idle resource.

---

# VS-10 — Mobile MyWrite and voice

## Outcome

On phone, the user can immediately write or speak an idea, review it, save it into PAIA with real creation time, and later find/use it.

## CPV1-10.0 — Mobile client boundary

Choose the appropriate supported client architecture after validating:
- local persistence;
- authentication/sync dependency;
- voice;
- background/foreground lifecycle;
- shared domain contract.

Do not choose technology by fashion.

## CPV1-10.1 — MyWrite local-first write path

Implement M1:
- fast cold-start write;
- local save/recovery;
- optional Topic;
- real creation time;
- no forced AI call.

## CPV1-10.2 — Mobile Archive/Thought/Context access

Provide mobile-appropriate stacked access; do not shrink desktop three-column UI.

## CPV1-10.3 — Voice capture/transcription

Implement M2:
record → transcribe → review → save.

Resolve transcription service/privacy/fee only when needed. No background listening.

## CPV1-10.4 — Interruption/recovery

Test:
- lock screen;
- app background/kill;
- call/interruption;
- offline;
- microphone denied;
- transcription failure;
- text correction.

## CPV1-10.5 — Real device acceptance

Real iPhone/iPad supported-device evidence including large text/accessibility and startup latency.

---

# VS-11 — Multi-source and device continuity

## Outcome

MyWrite and additional supported sources/devices converge without losing edits, confusing author roles or resurrecting deleted material.

## CPV1-11.0 — B-03 final data residency/sync decision

Only now require the owner to freeze the production local/cloud relationship needed for Sync.

## CPV1-11.1 — Sync trust/key/account readiness

Finalize:
- device trust;
- key lifecycle;
- device revoke/loss;
- coordination service;
- content confidentiality under the chosen policy.

## CPV1-11.2 — Multi-device merge engine

Implement:
- stable identity;
- revision merge/conflict;
- offline replay;
- tombstone propagation;
- protected human work;
- conflict UX.

## CPV1-11.3 — First real second source

Choose one valuable real source and deliver full adapter:
intake → author/role/time/revision → Archive → Thought source scope → search → deletion/disconnect.

Do not claim "multi-source" from provider enum registration alone.

## CPV1-11.4 — Source filters and Topic continuity

Implement All / single-source views without duplicating Topic truth.

## CPV1-11.5 — Two-device failure/restore matrix

Test:
- concurrent edit;
- offline edit;
- deletion offline;
- old device reconnect;
- key recovery;
- device revoke;
- Backup/Sync interaction.

## CPV1-11.6 — Real continuity acceptance

Phone MyWrite → desktop find/edit → source-filtered Topic → offline conflict → resolved → delete → old device cannot resurrect.

---

# VS-12 — Authorized AI write proposals and reply-aware prompts

## Outcome

External AI can propose safe PAIA organization changes under separate permission, and an explicitly enabled prompt assistant can use allowed AI replies to suggest the next prompt without auto-sending.

## CPV1-12.0 — Resolve B-01/B-02/B-04 as required

B-04 must define:
- which AI reply can be read;
- local versus remote processing;
- retention;
- whether reply text becomes durable context evidence;
- disable/revoke behavior.

B-01/B-02 are required for any write/delete semantics they affect.

## CPV1-12.1 — Typed AI changeset contract

External AI can propose:
- Topic placement;
- organization structure;
- metadata/presentation edits allowed by product policy.

Proposal includes object IDs, base revisions, scope and rationale/evidence. No direct storage access.

## CPV1-12.2 — Review/commit path

Reuse ReviewDiff and trusted domain commands:
propose → validate → review/policy → commit → receipt.

Stale changes reject rather than overwrite.

## CPV1-12.3 — Reply-aware prompt assistant

Implement P3:
- explicit enable/pause;
- allowed current reply only per B-04;
- distinguish reused prompt versus generated suggestion;
- preserve draft;
- click inserts only;
- user sends.

## CPV1-12.4 — Privacy/security/adversarial tests

Cover:
- archive prompt injection;
- wrong write permission;
- revoke during proposal;
- stale revision;
- AI reply contains malicious instruction;
- hidden paid retry;
- disabled assistant continues reading;
- draft replacement.

## CPV1-12.5 — Real end-to-end acceptance

Real external AI proposal → review → safe commit/deny; real reply-aware prompt → insert → user manual send.

---

# Cross-slice management

## Status and receipts

For each round:
- `STATUS.md` holds only current queue state.
- `receipts/<ROUND>.md` holds immutable completion/failure evidence after the round.
- historical failed attempts remain linked but do not bloat current status.

## UI design convergence without standalone prototype

For each UI round:
1. implement production path;
2. run realistic synthetic dataset;
3. inspect all relevant viewport/state variants;
4. compare with UX_CONTRACT.md;
5. repair in the same round;
6. verify performance/accessibility;
7. only then close.

Do not postpone "polish" if hierarchy, density, navigation or state semantics are wrong. Minor aesthetic tuning can remain later; structural UX cannot.

## High-reasoning manager behavior

The manager should not create new planning packages for ordinary defects. It should:
- execute the current round;
- keep intent IDs and UX surfaces traceable;
- use Codex selectively for bounded coding;
- perform reviews itself where possible;
- continue within an authorized slice;
- stop only at real owner gates or slice completion.

This package exists so the product owner does not need to repeatedly answer "what next?".
