# Consumer UX Contract — PAIA Consumer Product v1

Current scoped Archive authority: **IAH-1.1, 2026-10-08**. [INPUT_ARCHIVE_INTERACTION_CONTRACT.md](INPUT_ARCHIVE_INTERACTION_CONTRACT.md) owns behavior; [INPUT_ARCHIVE_HOME_UX.md](INPUT_ARCHIVE_HOME_UX.md) owns selected minimal Archive presentation; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation and evidence. The [adoption ledger](INPUT_ARCHIVE_HOME_ADOPTION.md) explicitly excludes unselected B details.

## Complete retained UX contract

[UX_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md](UX_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md) is the exact prior file, blob `cdfc21ef5e507c40cbb38012d82f3ed5f0437aa8`. **Its entire nonconflicting requirements are incorporated**, including shared visual/typographic/accessibility roles, global loading/save/conflict/error behavior, Archive direct editing/source/version/import safeguards, all Thought/Context/Settings/Prompt and other unaffected surfaces. This overlay is not a substitute summary or permission to skip the full relevant baseline.

Only conflicting Archive requirements are superseded as precisely recorded in [ADOPTION section 4](INPUT_ARCHIVE_HOME_ADOPTION.md#4-scoped-supersession-ledger), now correcting IAH-1.0 Main-only/Home/split-click rules. Frozen historical visuals/acceptance remain evidence for their original scope. No mandatory independent prototype phase is introduced.

## 1. Global product shell — Archive entry amendment

Primary product spaces remain Input Archive, Thought Library and AI Context, with low-frequency Settings. IAH adds no top-level destination. Wide Archive retains current Primary Nav | Archive navigator | Main, brand and geometry. Main is intentionally blank before content selection, not a new Find welcome page. Other spaces retain their own adopted composition and do not acquire an Archive navigator.

Every primary-nav Archive click requests Home(all, empty query, no content/scope selection) after the existing editor leave guard. Explicit Back/Forward or explicit-route reload restores recorded context; it is not another fresh entry. A failed save preserves the current page/text rather than clearing Reader to satisfy navigation.

## 2. Visual language

The complete predecessor section 2 applies unchanged, including shared semantic tokens, source fonts, quiet metadata, restrained controls, long-form reading, visible focus and reduced motion. Settings Consumer v2 and TL-PT1-UI-1.0 continue to control their respective spaces. Saved reading size/width choices are not overwritten by a new Home or a prototype metric. No separate Archive theme, glass search overlay, cards, thumbnails, tree connector lines or dashboard styling is adopted.

## 3. Global state behavior

The full previous loading/save/failure/partial/external-change/confirmation requirements remain. Existing content is not replaced by stale requests; durable acknowledgement precedes saved; IME and dirty drafts survive background changes and navigation failures. New IAH loading/error states do not weaken any of these guarantees.

## 4. Input Archive surfaces — IAH-1.1

### A1 — Archive root

ARCHIVE_HOME is the existing unselected shell/search/tree with blank Main. Default scope is all archives with no selected Source/Project/Conversation/Input. No previous Reader title/year/order/body appears. No Home heading, Welcome, Main global-search block, persistent P1/P3 hint, Recently viewed, suggestions, statistics, feed or automatic content selection.

Archive Search remains at the middle-column top with 搜索全部档案 when unrestricted; preserve its current size/style and accessible label. No duplicate same-scope field is added to Main. Existing contextual history import and actual-fault recovery remain reachable without a permanent maintenance toolbar. Normal no-selection is distinct from actual empty data or failed coverage.

### A2 — Project/Conversation Navigator

Retain actual Source -> Project -> Conversation identity, current hierarchy, row targets, selected Conversation treatment, stable expansion/scroll and full-name wrapping. Project name and arrow stay one whole-row disclosure action. Expansion is local tree state and does not change query/search scope, select a Conversation or create a Main Browse page. BROWSE_SCOPE remains for explicit scope/return contexts, without a compulsory new visual surface.

A distinct explicit supported Source/Project search-scope operation can retain query in SEARCH_RESULTS; prefer existing low-frequency controls. A new permanently visible scope selector is not approved. Preserve provider-qualified Project IDs, duplicate-title identity, last-known placement and source-deleted local content. Current membership copy remains; B M6 and the earlier mandatory 项目待确认 rewrite are not selected. Unknown and confirmed unassigned never merge into one fact. Real-end paging and honest empty/incomplete states remain required.

### A3 — Conversation Reader

Retain the existing continuous working-text Reader, title, every attributable time, sort/menu placement, direct editing, Input spacing and saved reading-size/width logic. Desktop retains the middle Archive field and existing Reader field with distinct scope/query; Reader's visible hint is 在此对话中查找. Opening an Input hit carries a temporary location highlight, not an automatic Reader-Find query, edit or Keep.

Existing normal-flow Back is origin-aware: 返回搜索结果 / 返回项目浏览 / 返回档案 restore actual saved query/scope/result/tree/reading state. It is not sticky/floating. Verified original-site opening is separate, secondary and reuses existing contextual/overflow placement. Generic open does not infer intent from the host page. Safety for valid supported explicit/contextual entry remains; a new host entry is not required by this visual approval.

### A4 — Direct editing

The full prior A4 applies unchanged: one editor/body owner, IME safety, durable save, retry/conflict recovery, navigation guards and no silent overwrite. IAH does not create an editing mode or remove version/undo protection.

### A5 — Source / Time / Version Inspector

The full prior A5 applies unchanged. Original source facts and working versions remain distinct; real/unknown send time remains truthful; restoring a version creates a new current version. Main Back is not this inspector or an external-source action.

### A6 — Archive search and filters

SEARCH_RESULTS is explicit and preserves query, scope, deterministic result ordering, continuation/window, identity-relative scroll/focus and origin history. Exact current Input text/excerpt is primary; reliable time/Source/Project/Conversation path are subordinate. Use flat results, not cards or AI summaries, preserving meaningful negation/conditions and Unicode-safe continuation. Local lexical/full-text queries reach unmounted eligible content through existing trusted owners. No remote query rewrite, answer, summary or model cost.

All/Source/Project/Conversation scope is clear without an advanced filter console or implicit scope-on-Project-disclosure. Only an explicit supported scope action narrows/broadens a query. Clearing query returns neutral Home or explicit BROWSE_SCOPE with blank Main, never a recent-Input stream. Archive Search remains in the navigator on desktop, Reader Find local to its document; no duplicate global field is added to Main.

An activated hit resolves the actual current Input and revision, loads its bounded Reader window, safely recalculates the original-text match and scrolls/highlights precisely. Back restores the recorded results after current eligibility validation. Changed/removed/purged targets use the contract's honest fallback, not stale-text resurrection or another default Conversation. Incomplete index/search coverage is not no-result; partial counts are not full totals.

### A7 — Smart Filter

Prior light/off reading preference and protected human intent remain. Otherwise eligible smart-filtered Inputs participate in ordinary Find by default; a result may say `平时已收起`. Viewing it permits only a route/Input-local temporary reveal, never automatic Keep/protect/restore or a global setting change. Explicit removals and purges cannot be bypassed. A deliberate edit remains a separate human action under existing protections.

### A8 — History import

The complete prior A8 import/preflight/idempotence/recovery contract is retained. Archive optimization does not add automatic history capture/import or restore export/backup-generation.

## 5. Thought Library surfaces — TL-PT1-UI-1.0

All prior section 5 requirements remain incorporated and controlled by THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md / REFERENCES and TOPIC_ARCHITECTURE_PLAN.md. No Archive result directory, scope tree, recency block or response/relation feature is transplanted into Thought.

## 6. AI Context surfaces

The complete prior section and its explicit current-over-historical precedence remain under AI_CONTEXT_CARDS_V2_ADOPTION/PLAN/REFERENCES. Archive navigation grants no Context access, Archive fallback or external capability.

## Responsive, dark and final acceptance

Current Archive UX U7/U8 and INTERACTION IAH-11 retain the existing responsive shell, navigation/overlay and safe single-content-pane behavior. Wide retains the familiar columns; narrow can show its existing search/tree directly without a standalone welcome stage or three thin columns. Preserve one logical list/field per scope and correct focus while adapting placement. No rejected sticky return is imported from deep/dark/narrow B references.

Use shared dark/field/selection/highlight/focus/metadata roles, text enlargement, 320 CSS-pixel equivalent reflow, touch/keyboard targets and reduced motion. Narrow entry does not open the keyboard automatically; Back restores initiating focus/viewport instead of stealing it on updates. Selected visual direction is owner-approved; actual source/release visual, accessibility, performance and supported-entry evidence remain separate future acceptance. Prototype checks do not supply those PASS claims.
