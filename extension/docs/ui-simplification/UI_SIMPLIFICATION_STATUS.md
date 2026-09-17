# PAIA UI Simplification v1 — Execution Status

Status file: **canonical execution state for UI Simplification v1**

Version: v1.0

Date: 2026-09-17

Repository: `haohongfei2001-png/paia`

Authoritative branch: `main`

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

Status: **READY**

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

Not started.

---

## 4. UIS-02 — Page-scoped search and removal of the visible global search model

Status: **PENDING UIS-01**

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

Waiting for UIS-01.

---

## 5. UIS-03 — Thought Library simplification

Status: **PENDING UIS-02**

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

Waiting for UIS-02.

---

## 6. UIS-04 — Cleanup, documentation alignment, and final certification

Status: **PENDING UIS-03**

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

Waiting for UIS-03.

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

**Next user command required: `继续开发`**

That command authorizes **UIS-01 only**.
