# PAIA UI Simplification v1 — Development Instructions

Status: **ACTIVE EXECUTION OVERLAY**

Created: 2026-09-17

Repository: `haohongfei2001-png/paia`

Authoritative branch: `main`

This package defines the next user-authorized PAIA interface simplification work after Chrome UI Refresh v1 was merged into `main`. It is deliberately narrow: simplify visible information architecture, page-scoped search, and low-frequency action placement without changing PAIA's durable data ownership, capture contract, privacy model, authorization semantics, or storage schema.

## 1. Resume protocol — what “继续开发” means

When the product owner says **“继续开发”** (or an unambiguous equivalent such as “继续 PAIA 开发”) in the PAIA context, that message authorizes exactly **one** implementation round: the round marked `READY` / `CURRENT` in `UI_SIMPLIFICATION_STATUS.md`.

The executing agent must:

1. Resolve the live GitHub `main` HEAD. Do not rely on an old chat, local worktree, or frozen SHA as the current source of truth.
2. Read, in order:
   - `extension/AGENTS.md`
   - this file
   - `UI_SIMPLIFICATION_STATUS.md`
   - `extension/PRODUCT.md`
   - `extension/ARCHITECTURE.md`
   - only the current round's relevant source/tests.
3. Implement **only the current round**. Do not begin the next round in the same user authorization.
4. Preserve existing data, provenance, deletion, revision, privacy, external-AI, and authorization contracts.
5. Add/update focused tests for the changed behavior. Do not weaken existing assertions or simply hide a failing test.
6. Run the round gates defined in `UI_SIMPLIFICATION_STATUS.md`.
7. Commit completed changes to `main` unless the product owner explicitly asks for a branch/PR.
8. Update `UI_SIMPLIFICATION_STATUS.md` with what actually changed, tests run, commit/checkpoint, known limitations, and mark the next round `READY` if appropriate.
9. Stop. The next implementation round requires the product owner to say **“继续开发”** again.

Do not ask the product owner to restate the requirements already captured here. Ask only when a genuine data-ownership/privacy/destructive-semantics conflict cannot be safely resolved from the repository contracts.

## 2. Product decisions fixed for this execution package

These decisions are approved for this UI simplification and should not be reopened as design questions during implementation.

### UIS-D01 — Archive home becomes quieter

On the Archive home/root surface:

- remove the redundant visible `档案 / Archive` intro label when the navigation already establishes location;
- remove the visible `按来源浏览 / Browse by source` heading and its explanatory subtitle;
- keep the actual document/source list and existing ordering behavior;
- do not delete underlying data or source metadata because a heading is removed.

### UIS-D02 — Archive low-frequency actions live under one `···` menu

Archive-root low-frequency actions should be consolidated into a single accessible `···` menu.

The menu should contain the existing appropriate entry points for:

- history completion/import (`历史补全` / historical import);
- archive-level export actions currently exposed on that surface.

Important: preserve the existing export semantics. Do **not** silently merge Source-record export, Input export, complete open export, and Backup into one payload merely because their buttons are being reorganized.

System-level **complete export / Backup / restore** remains in Settings / Data & devices. This round changes action placement, not backup semantics.

### UIS-D03 — Thought Library home does not expose AI organization as a primary control

On the Thought Library root/index surface:

- remove visible AI organization controls/toggles from the root;
- AI-organized presentation/update controls remain available only when reading an actual Thought topic/document where that action has a concrete target;
- do not remove organizer capability, provider contracts, saved AI projections, or protected user work.

### UIS-D04 — Exactly one visible search box per content page, scoped to that page

PAIA should not present competing visible search models on the same surface.

Required scope model:

| Current surface | Search scope |
| --- | --- |
| Archive root | all eligible Archive/Input content |
| One Archive conversation/document | only that current document/window |
| Thought Library root | Thought Library content |
| One Thought topic/document | only that current topic/document |
| Settings | no search box and no search launcher |

Rules:

- no visible cross-Archive-and-Thoughts global search launcher on normal pages;
- `/` and other search-focus shortcuts must focus the current surface's search when one exists;
- Settings must not route `/` into a hidden/global search experience;
- search query/page/scroll state should remain local to the relevant surface;
- opening a result must preserve current trusted Reader/navigation behavior;
- this UI decision does **not** require deleting `UniversalSearchService` or shared lexical search primitives. Underlying reusable search services may remain as internal capabilities if they no longer create a second visible search model.

### UIS-D05 — Thought export belongs in `···`

Any currently visible Thought Library / Thought topic export action should be moved into the appropriate `···` action menu for that scope.

Preserve its existing scope. If the implementation currently exports a topic, keep it topic-scoped; do not invent a whole-library export merely to satisfy placement wording.

### UIS-D06 — Settings has no search

Settings should be navigated by its existing grouped information architecture. It should not show or launch content search.

### UIS-D07 — Remove `最近阅读 / Recent reading` from Thought Library home UI

Remove the `最近阅读` section from the Thought Library root presentation.

Do **not** delete reading-position or recent-read metadata solely because this UI section is removed. Those data may still support resume/revisit behavior elsewhere. This is a presentation deletion, not a data migration.

## 3. Interaction principle

The governing interaction model for this work is:

> **当前位置 → 当前内容 → 当前操作**

not:

> **PAIA → 全局工具集合 → 当前内容**

Search belongs to the current content container. Low-frequency actions belong in context-specific `···` menus. High-frequency reading should not compete visually with import/export/maintenance controls.

## 4. Scope boundaries

This execution package may modify:

- `extension/ui/` shell, Archive, Thought, search-focus, menu, and presentation code;
- focused UI tests and Chrome E2E tests;
- current product/architecture/roadmap documentation when behavior actually changes;
- stale UI Refresh execution documentation so agents do not resume a completed branch.

This package does **not** authorize:

- a new IndexedDB/object store or durable body copy;
- capture expansion to drafts, assistant replies, other sites, browser history, cookies, credentials, or unrelated private data;
- new providers, new paid AI behavior, hidden provider calls, automatic organizer runs, or automatic retries;
- cloud sync, Web/mobile implementation, or backend work;
- changes to Source/Input/Thought ownership, tombstones, revision guarantees, or external-use authorization;
- deletion of reusable underlying search services merely because their global UI entry point is removed;
- weakening certification, privacy, package, or release checks.

## 5. Engineering rules

Prefer removing/recomposing presentation wiring over rewriting domain services.

In particular:

- reuse existing `GET_PAGE`, Input search, Thought search, Reader navigation, history completion, export, and organizer paths;
- avoid introducing a second search index or parallel navigation state machine;
- if a page-scoped search needs a small resolver/coordinator, keep it UI/read-model level and body-free;
- preserve keyboard accessibility for `···` menus (`Enter`, `Space`, `Escape`, focus return, outside-click behavior);
- preserve autosave/leave guards when changing Reader controls;
- update old tests that assert the superseded visible UI, but retain the underlying behavioral/security assertions;
- use synthetic/sanitized fixtures only.

## 6. Validation policy

Each round must run focused unit/UI tests and the directly affected browser journey(s). Final closure must additionally run:

```bash
cd extension
npm test
npm run check
npm run build:release
```

`npm run test:ui-refresh` should also remain green after this post-refresh simplification, with tests updated to the new approved visible behavior rather than disabled.

A local environment timeout that is already documented as environment-specific may be reported accurately; do not increase timeouts or weaken assertions simply to produce a green result.

## 7. Completion definition

UI Simplification v1 is complete only when:

- all rounds in `UI_SIMPLIFICATION_STATUS.md` are `COMPLETE`;
- Archive/Thought/Settings visibly follow UIS-D01 through UIS-D07;
- there is no competing visible global search entry point on normal content/settings surfaces;
- page-scoped search works at root and document/topic levels;
- import/export/AI organization capabilities remain reachable at their intended scope;
- complete export/Backup remains correctly distinguished in Settings;
- final full-suite, package, release build, and relevant browser gates pass;
- current docs describe actual behavior rather than the superseded UI.
