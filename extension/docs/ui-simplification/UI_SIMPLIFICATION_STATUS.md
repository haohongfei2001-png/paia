# PAIA UI Simplification v1 — Execution Status

Status file: **canonical execution state for UI Simplification v1**

Version: v1.1

Date: 2026-09-18

Repository: `haohongfei2001-png/paia`

Authoritative branch: `main`

Current round: **UIS-04 — READY**

Always resolve the live `main` HEAD before execution. Do not encode this file's own commit as a self-referential required HEAD.

## 1. Resume rule

The product owner's PAIA-context instruction **“继续开发”** authorizes exactly the single round marked `READY` below.

After that round is implemented, tested, committed, and recorded here:

- mark it `COMPLETE` (or `BLOCKED` with exact reason);
- mark the next round `READY` only if prerequisites are satisfied;
- stop execution;
- do not begin the next round until the product owner says **“继续开发”** again.

The complete fixed decisions and guardrails are in `README.md` in this directory.

## 2. Package bootstrap

### UIS-00 — Execution protocol and baseline cleanup

Status: **COMPLETE**

Purpose:

- establish repository-resident instructions so future development can resume from a short user command;
- make `main` the explicit source of truth for this work;
- retire stale active-branch instructions from the completed Chrome UI Refresh phase;
- define the approved information-architecture decisions without implementing later rounds early.

Bootstrap deliverables:

- `docs/ui-simplification/README.md` — active execution contract;
- this file — canonical current-round state;
- `AGENTS.md` — active overlay pointer and resume semantics;
- `docs/ui-refresh/UI_REFRESH_STATUS.md` — historical/merged correction.

Implementation rounds begin at UIS-01.

---

## 3. UIS-01 — Archive home and Archive action consolidation

Status: **COMPLETE**

### Objective

Make the Archive root materially quieter without changing archive data semantics.

### Required implementation

1. Remove the redundant visible Archive intro/title block from the Archive root when primary navigation already establishes that the user is in Archive.
2. Remove `按来源浏览 / Browse by source` and its sorting explanatory subtitle.
3. Keep the actual conversation/document list and its current ordering/data behavior.
4. Add or reuse one accessible Archive-root `···` menu.
5. Move the existing history-completion/import entry point into that menu.
6. Move existing Archive-root export entry point(s) into that menu while preserving their current export scope and payload semantics.
7. Do not move or rename Settings complete export / Backup / restore in a way that makes it look equivalent to current-scope Archive export.
8. Remove redundant visible buttons only after their actions remain reachable through the menu.
9. Preserve onboarding/empty-state access to history import when no archive exists; empty-state activation may still expose the necessary first-use action if hiding it would make activation impossible. The normal populated Archive root should use the consolidated menu.

### Primary source areas to inspect

- `ui/core-loop.js`
- `ui/ux-r1-shell-coordinator.js`
- `ui/archive.html`
- `ui/archive.js`
- `ui/ui-refresh.css`
- history completion / export helpers already used by those surfaces

### Focused validation

At minimum:

- update/add unit/UI assertions for the Archive root hierarchy and action reachability;
- update/add a Chrome E2E journey proving:
  - redundant headings are absent on populated Archive root;
  - one Archive-root `···` control is keyboard accessible;
  - history completion remains reachable;
  - existing Archive export remains reachable and retains current semantics;
  - Settings complete export/Backup remains distinct;
- run affected Archive/UI Refresh browser tests;
- run `npm run check`.

### Completion record

Runtime/test commit: `74bdd87656add03c5116398ed728695b1cc5b166` — `Complete UIS-01 Archive action consolidation`.

Implemented behavior:

- the redundant Archive intro/title presentation is no longer visible on the Archive root;
- `按来源浏览 / Browse by source` and its explanatory subtitle are removed while the existing conversation/document list and ordering remain intact;
- the existing `#document-menu` overflow control is reused as the Archive-root `···` owner instead of adding a competing menu control;
- history completion and existing Source Records JSON/Markdown export are reached through that menu by delegating to their existing handlers;
- standalone history/export controls are removed from normal visible Archive-root chrome without changing import/export payload semantics;
- Settings complete export, Backup and restore remain distinct system-level data actions;
- no Source/Input/Thought ownership, storage schema, tombstone, revision, capture, Provider, permission or paid-AI behavior changed.

Validation / recovery receipt:

- GitHub remote `main` and GitHub Actions were used as execution facts; no local clone state was used to declare completion.
- `uis-01-archive-actions-chrome-e2e.test.mjs`: PASS on the tested runtime, including quiet Archive hierarchy, one accessible overflow menu, Escape focus return, history-completion reachability, unchanged filtered Source Records export semantics, and Settings complete-export separation.
- PAIA Certification run `35229562214`, run #342, runtime SHA `74bdd876…`:
  - attempt 1 failed only in the independent Current Browser job on one existing UX-R5 focus assertion (`ai-presentation-toggle` focus expected, empty active-element id observed);
  - the same UX-R5 certification path passed in the Full Suite on the same SHA, so no runtime change was made solely to satisfy a non-reproduced focus failure;
  - failed jobs were rerun on the exact same SHA; attempt 2 concluded **SUCCESS**, including **Current Browser Certification = SUCCESS** and **Certification gate = SUCCESS**.
- Attempt 2 Full Suite: **1099 / 1099 PASS**, fail 0, skipped 0:
  - unit: 909;
  - browser E2E: 43;
  - adapter contract: 95;
  - privacy/security: 52.
- Remote CI package audit (`check_package.py`, the same audit implementation invoked by `npm run check`) reported **8467 package guardrails PASS**; the current-release build/guard job also passed.
- Current release build and guards: SUCCESS.
- macOS Secure Store Certification: SUCCESS.
- Full-suite receipt: `fullSuite=true`, `auditPassed=true`, `historicalBrowserFiles=76`, input digest `8ec99c18b31ef01f4d176dfa16b6ea01a19919154d2123c1dbe5950c1d4298df`.

UIS-01 is closed. Do not reopen it merely because attempt 1 contained a non-reproduced CI focus failure; any future reproducible regression should be handled from the then-current round and current remote evidence.

---

## 4. UIS-02 — Page-scoped search and removal of the visible global search model

Status: **COMPLETE**

### Objective

Establish one visible search box per content surface, scoped to that surface, and no Settings search.

### Required behavior

1. Archive root search covers eligible Archive/Input content across the Archive root scope.
2. Opening one Archive conversation/document provides one search box scoped only to that document/window.
3. Thought Library root provides one search box scoped to Thought Library content.
4. Opening one Thought topic/document provides one search box scoped only to that topic/document.
5. Settings has no search box and no visible/global search launcher.
6. Remove the normal visible launcher that currently presents `搜索档案与思想… / Search Archive & Thoughts…` as a second search model.
7. `/` and equivalent focus behavior must target the current surface search if one exists; in Settings it must not open a hidden global search task.
8. Preserve local query/page/scroll state per surface where current navigation already supports it.
9. Preserve exact result -> Reader positioning/highlight behavior for Input and Thought results.
10. Do not delete shared lexical primitives or `UniversalSearchService` merely because the cross-surface launcher is removed. Internal reusable search coordination may remain if it has no competing visible UI.

### Preferred implementation shape

If useful, introduce a small UI-level search-scope resolver such as:

```text
Archive root        -> input_archive
Archive document    -> input_document(documentId)
Thought root        -> thought_library
Thought topic       -> thought_topic(topicId)
Settings            -> none
```

Do not create a new durable search store or duplicate navigation state machine.

### Primary source areas to inspect

- `ui/universal-search.js`
- `ui/search-experience.js`
- `ui/input-search.js`
- `ui/archive.js`
- `ui/thoughts-base.js`
- `ui/thoughts.js`
- `ui/core-loop.js`
- `ui/ux-r1-shell-coordinator.js`
- `core/universal-search.js`
- existing Input/Thought search services and tests

### Focused validation

Add/update Chrome E2E coverage for all five surface scopes and keyboard focus behavior. Existing Universal Search domain/security tests should remain green unless their assertion is specifically about the superseded visible launcher.

Run affected search tests, affected browser tests, `npm run test:ui-refresh`, and `npm run check`.

### Completion record

Runtime/test commits:

- `fe2f6528095211878dbf24118ef33f9bc059e6e9` — `Implement UIS-02 page-scoped search`.
- `dbd1521e6424127830c64bf08d32d0e87ba41900` — `Align legacy browser gates with UIS-02 search scope`.

Implemented behavior:

- Archive root retains one Archive-scoped search over eligible Archive/Input content.
- Opening an Archive document presents one search scoped to that document only and preserves exact result-to-Reader positioning/highlight behavior.
- Thought Library root retains one Thought-scoped search; opening a Thought topic/document scopes the visible search to that topic/document.
- Settings exposes no search box and no normal visible/global search launcher.
- the normal shell no longer exposes the `搜索档案与思想… / Search Archive & Thoughts…` launcher as a competing second search model.
- current-surface keyboard focus behavior (`Ctrl/Cmd+K`, `Ctrl/Cmd+F`, `/` where applicable) resolves to the current surface search; Settings does not open a hidden global search task.
- Archive query state is preserved across Settings and Reader round-trips where the existing navigation model supports it.
- the internal reusable Universal Search/material-search coordination remains available to explicit internal owners; `UniversalSearchService` and shared lexical primitives were not deleted.
- the existing hide-content-previews preference now masks the page-scoped Archive search excerpt as well as prior preview surfaces, while explicitly opened Reader content remains readable.
- no new durable search store, Source/Input/Thought ownership change, storage/schema change, tombstone/revision change, capture-scope change, Provider permission change or paid-AI behavior change was introduced.

Validation / recovery receipt:

- GitHub remote `main`, canonical status and GitHub Actions were used as execution facts; no local clone state was used to declare completion.
- Focused `uis-02-page-scoped-search-chrome-e2e.test.mjs`: PASS, covering Archive root/document, Thought root/topic, Settings-none scope, keyboard focus routing, Reader positioning/highlight, and zero Provider/external-network activity.
- Existing Universal Search domain/security coverage remained green; the reusable internal material-search path was preserved.
- recovery validation after CI run #344 exposed two stale browser contracts that still required the removed visible global launcher (`ux-r1-shell-chrome-e2e.test.mjs`, `ux-r6-release-chrome-e2e.test.mjs`) plus a privacy-preview gap for the new Archive `.search-excerpt` surface. Those were corrected in `dbd1521e…` without restoring the launcher or weakening any gate.
- the existing `ux-r5-certification-chrome-e2e.test.mjs` focus path was not weakened; it independently reproduced **3 / 3 PASS** on the exact UIS-02 source during recovery.
- local exact-SHA recovery validation before the follow-up push:
  - `npm run test:ui-refresh`: **10 / 10 PASS**;
  - `npm run check`: **8528 package guardrails PASS**;
  - `ux-r1-shell-chrome-e2e.test.mjs`: **3 / 3 PASS**;
  - `ux-r6-release-chrome-e2e.test.mjs`: **1 / 1 PASS**;
  - `uis-02-page-scoped-search-chrome-e2e.test.mjs`: **1 / 1 PASS**.
- PAIA Certification run `35257262970`, run #345, head SHA `dbd1521e…`: **SUCCESS** on attempt 1.
  - Certification gate: SUCCESS.
  - Current Browser Certification: SUCCESS.
  - Full Suite Certification: SUCCESS.
  - Adapter and privacy contracts: SUCCESS.
  - Unit 1/4, Unit 2/4, Unit 3/4, Unit 4/4: SUCCESS.
  - Current release build and guards: SUCCESS.
  - macOS Secure Store Certification: SUCCESS.
- Full-suite receipt on `dbd1521e…`: **1100 / 1100 PASS**, fail 0, skipped 0:
  - unit: 909;
  - browser E2E: 44;
  - adapter contract: 95;
  - privacy/security: 52;
  - `fullSuite=true`, `auditPassed=true`, `historicalBrowserFiles=76`, input digest `064bd7e6c570e45d2d4df3c47e32ea992083ed38907c8fb9f13d31c6fce7ff1f`.

UIS-02 is closed. Do not reopen it merely because run #344 failed against stale superseded visible-global-search assertions; any future reproducible regression should be handled from the then-current round and current remote evidence.

---

## 5. UIS-03 — Thought Library simplification

Status: **COMPLETE**

### Objective

Keep Thought Library root focused on finding/opening thoughts; keep AI organization and export contextual to the content being read.

### Required implementation

1. Remove visible AI organization/toggle controls from Thought Library root/index.
2. Keep AI organization/presentation/update controls reachable when an actual Thought topic/document is open and has a concrete target.
3. Remove `最近阅读 / Recent reading` from the Thought Library root UI.
4. Do not delete reading-position/recent-read metadata or other Revisit/Reader support solely due to removing that section.
5. Move any visible Thought export action into the appropriate `···` menu for its existing scope.
6. Preserve topic-scoped export as topic-scoped; do not invent a whole-library export if one does not already exist.
7. Preserve `添加主题`, layout controls, independent Thought creation, organizer functionality, version history, and protected user/AI separation unless they are specifically repositioned by this round.
8. Keep the root search behavior from UIS-02 and the topic-scoped search behavior from UIS-02; do not reintroduce another search control.

### Primary source areas to inspect

- `ui/archive.html`
- `ui/archive.js`
- `ui/thoughts-base.js`
- `ui/thoughts.js`
- `ui/thought-copy.js`
- `ui/ui-refresh.css`
- Thought Library / AI presentation Chrome tests

### Focused validation

At minimum prove in Chrome E2E that:

- Thought root has one search control and no visible AI organize toggle;
- `最近阅读` is absent;
- opening a topic reveals the appropriate AI presentation/update control only there;
- export remains reachable in `···` with unchanged scope;
- user-authored Thought edits and saved AI presentation remain intact.

Run affected Thought tests, affected UI Refresh browser tests, `npm run test:ui-refresh`, and `npm run check`.

### Completion record

Runtime/test commits:

- `2cabcc1441b37ebe1ece557cfc95d536293990a8` — `Simplify Thought Library root for UIS-03`.
- `58d0b9a23730b91a6a5f406a42cf06cfa801c6d5` — `Scope Thought AI controls to open topics`.
- `af6c374aff34339b543abd97fa45f25ed38fba20` — `Align UIR-03 Thought acceptance with UIS-03`.
- `c0e1890bac049eadfa0b16809eea9571bbf796b3` — `Align UX-R3 recent-reading contract with UIS-03`.

Implemented behavior:

- Thought Library root keeps the single page-scoped search established by UIS-02 and no longer exposes the AI presentation/organization toggle or a root AI-organization action.
- opening a concrete Thought topic keeps the existing contextual AI presentation switch and update/retry behavior; no Provider capability was moved to the root.
- the `最近阅读 / Recent reading` root section is no longer rendered, while `RECORD_TOPIC_READ` / `LIBRARY_INDEX_PAGE.recent` metadata remains intact for Reader/Revisit and future internal use.
- root `···` keeps `添加主题` and `列表 / 网格`; independent `接着写` creation remains directly reachable.
- the existing topic-scoped `导出主题` action remains in the concrete Topic `···` menu and continues to call the existing topic export path; no whole-Library export scope was invented.
- Settings bounded organizer controls remain available; saved AI presentation, user-authored Thought edits, version/undo behavior and user/AI ownership separation are unchanged.
- no Source/Input/Thought ownership, storage schema, tombstone/revision, capture scope, Provider permission, paid-AI, Backup/restore or complete-export semantics changed.

Validation / recovery receipt:

- recovery audit started from remote `main` `8e496e59…`, where canonical UIS-03 was READY / not started; no partial UIS-03 implementation was present, so no completed work was repeated.
- PAIA Certification run `35295440470`, run #349, head `af6c374…`, exposed one deterministic stale UX-R3 assertion that still required the intentionally removed `#thought-recent` UI. That assertion was replaced in `c0e1890…` with the stronger current contract: no Recent Reading root surface while recent-read metadata remains recorded. No runtime behavior was changed for that recovery.
- the same #349 Current Browser run also produced one non-reproduced UX-R5 provider-failure visibility failure. No UX-R5 runtime or acceptance threshold was changed; the exact path subsequently passed in both independent browser executions on the certified head.
- PAIA Certification run `35296717805`, run #350, head SHA `c0e1890…`: **SUCCESS** on attempt 1.
  - Certification gate: SUCCESS.
  - Current Browser Certification: **44 / 44 PASS**, fail 0, skipped 0.
  - Full Suite Certification: **1100 / 1100 PASS**, fail 0, skipped 0:
    - unit: 909;
    - browser E2E: 44;
    - adapter contract: 95;
    - privacy/security: 52.
  - `uir-03-thought-original-chrome-e2e.test.mjs`: PASS, including one root search, no root AI toggle, absent Recent Reading UI with retained metadata, Topic-only AI controls, and Topic `···` export scope.
  - `uir-03-ai-presentation-chrome-e2e.test.mjs`: PASS; saved AI presentation remains readable and Provider work stays explicit.
  - `ux-r3-thought-chrome-e2e.test.mjs`: **5 / 5 PASS**, including independent user editing/draft/undo and the updated recent-metadata contract.
  - `ux-r5-certification-chrome-e2e.test.mjs`: **3 / 3 PASS** in Current Browser and Full Suite, including Original readability after provider failure and no automatic paid retry.
  - remote package audit: **8528 package guardrails PASS** across 197 runtime resources; `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`.
  - Current release build and guards: SUCCESS.
  - macOS Secure Store Certification: SUCCESS.
  - Full-suite receipt: `fullSuite=true`, `auditPassed=true`, `historicalBrowserFiles=76`, input digest `659085b34ce2a1878bed77aeb56427244308059c7b69d80a0467b84e0443aaaa`.
- the Current Browser job runs the complete current browser suite, a strict superset of the affected UI Refresh browser set, and executes the same package audit used by `npm run check`; both passed on the exact certified remote head.
- a supplementary exact-SHA `/tmp` Mac validation attempt on the pre-recovery head never entered npm because the GitHub HTTPS clone stalled and was terminated. It is not counted as validation evidence; completion is based on the authoritative exact-SHA GitHub Actions receipts above.

UIS-03 is closed. Dead selectors/copy and other obsolete presentation wiring intentionally remain for UIS-04 cleanup; do not reopen UIS-03 merely to perform that next-round work.

---

## 6. UIS-04 — Cleanup, documentation alignment, and final certification

Status: **READY**

### Objective

Remove obsolete presentation wiring, align current product docs with the shipped simplified behavior, and certify the result.

### Required implementation

1. Remove dead/obsolete visible-global-search shell wiring that is no longer used after UIS-02, without deleting reusable domain services still used elsewhere.
2. Remove dead UI code for the Thought Recent Reading surface after UIS-03, while keeping required underlying read metadata/services.
3. Ensure no stale labels, CSS selectors, mutation observers, or keyboard handlers recreate removed controls.
4. Reconcile `PRODUCT.md`, `ARCHITECTURE.md`, and `ROADMAP.md` with actual final behavior:
   - visible search is page-scoped;
   - cross-surface/global search service may remain internal/reusable but is no longer a normal competing launcher;
   - Thought Recent Reading root section is removed;
   - low-frequency import/export actions are context-menu based;
   - no data/schema/trust-boundary change was introduced.
5. Update this status with final receipts and mark UI Simplification v1 complete.

### Final validation gates

Run from `extension/`:

```bash
npm run test:ui-refresh
npm test
npm run check
npm run build:release
```

Also run any directly affected browser E2E files individually if the complete suite output does not make their status easy to audit.

Do not claim completion if a required gate is skipped or failed. Record exact environment-specific blockers if a pre-existing local environment issue prevents a gate, and use authoritative CI only if the repository's current workflow actually executes the same required gate on the same tested source.

### Completion record

Ready after certified UIS-03 closure. Not started.

---

## 7. Global non-regression checklist for every round

Every round must preserve:

- immutable Source provenance and tombstone precedence;
- user-edited Working Input and protected Thought work;
- autosave/conflict handling;
- explicit AI/provider authorization and bounded request behavior;
- no hidden paid provider calls during ordinary navigation/search;
- local-first ordinary reading/search/editing;
- current Backup/restore/complete-export semantics;
- current capture/import privacy boundaries;
- no new durable content store or duplicate body copy;
- accessible keyboard/focus behavior for menus/search/navigation;
- current extension identity/runtime path assumptions for user deployment.

## 8. Current next action

**Next user / Supervisor execution message required: `继续开发`**

That next message authorizes **UIS-04 only**. UIS-03 is COMPLETE and must not be reopened without new regression evidence.
