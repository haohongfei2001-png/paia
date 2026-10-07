# Consumer UX Contract — PAIA Consumer Product v1

Current scoped Archive authority: **IAH-1.0, 2026-10-08**. [INPUT_ARCHIVE_INTERACTION_CONTRACT.md](INPUT_ARCHIVE_INTERACTION_CONTRACT.md) owns behavior; [INPUT_ARCHIVE_HOME_UX.md](INPUT_ARCHIVE_HOME_UX.md) owns the final Archive presentation and full state inventory; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation and evidence.

## Complete retained UX contract

[UX_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md](UX_CONTRACT_PRE_ARCHIVE_HOME_2026-10-08.md) is the exact prior file, blob `cdfc21ef5e507c40cbb38012d82f3ed5f0437aa8`. **Its entire nonconflicting requirements are incorporated**, including shared visual/typographic/accessibility roles, global loading/save/conflict/error behavior, Archive direct editing/source/version/import safeguards, all Thought/Context/Settings/Prompt and other unaffected surfaces. This overlay is not a substitute summary or permission to skip the full relevant baseline.

Only the predecessor section 1 Archive composition and A1/A2/A3/A6/A7 clauses that conflict with IAH are superseded, as precisely recorded in [ADOPTION section 3](INPUT_ARCHIVE_HOME_ADOPTION.md#3-scoped-supersession-ledger). Frozen historical visuals/acceptance remain evidence for their original scope. No mandatory independent prototype phase is introduced.

## 1. Global product shell — Archive entry amendment

Primary product spaces remain Input Archive, Thought Library and AI Context, with low-frequency Settings. IAH adds no top-level destination. Wide Archive remains Primary Nav | Browse/Scope | Main; Main now opens as a neutral Find Home, not a wholly empty Reader. Other spaces retain their own adopted composition and do not acquire an Archive navigator.

Every primary-nav Archive click requests Home(all, empty query, no content/scope selection) after the existing editor leave guard. Explicit Back/Forward or explicit-route reload restores recorded context; it is not another fresh entry. A failed save preserves the current page/text rather than clearing Reader to satisfy navigation.

## 2. Visual language

The complete predecessor section 2 applies unchanged, including shared semantic tokens, source fonts, quiet metadata, restrained controls, long-form reading, visible focus and reduced motion. Settings Consumer v2 and TL-PT1-UI-1.0 continue to control their respective spaces. Saved reading size/width choices are not overwritten by a new Home or a prototype metric. No separate Archive theme, glass search overlay, cards, thumbnails, tree connector lines or dashboard styling is adopted.

## 3. Global state behavior

The full previous loading/save/failure/partial/external-change/confirmation requirements remain. Existing content is not replaced by stale requests; durable acknowledgement precedes saved; IME and dirty drafts survive background changes and navigation failures. New IAH loading/error states do not weaken any of these guarantees.

## 4. Input Archive surfaces — IAH-1.0

### A1 — Archive root

ARCHIVE_HOME displays `查找你的输入`, a brief sentence/keyword/topic search hint, the primary field `搜索我以前说过的内容` and subdued Browse guidance. Default scope is all archives with no selected Source/Project/Conversation/Input. No old Reader title/year/order/body appears. No Recently viewed, suggestions, statistics, feed or automatic content selection.

Exactly one active content-search field lives in Main. The navigator has no duplicate global or scoped field. Existing contextual history import and actual-fault recovery remain reachable without a permanent maintenance toolbar.

### A2 — Project/Conversation Navigator

Retain actual Source -> Project -> Conversation identity with quiet hierarchy, modest Conversation indentation, stable expansion/scroll and current selected state. Project label activation enters neutral BROWSE_SCOPE; its separate disclosure changes only expansion. Search scope choices are separately explicit and retain a query in SEARCH_RESULTS. Conversation activation selects content.

Preserve provider-qualified Project IDs, duplicate-title identity, last-known placement and source-deleted local content. Confirmed unassigned uses `未归入项目`; unknown uses `项目待确认` with on-demand explanation, not a forced resolution workflow. Do not merge those states or invent a catch-all Project. Real-end provider/group/Conversation paging and honest empty/incomplete states remain required.

### A3 — Conversation Reader

Retain the existing continuous working-text Reader, title, quiet reliable time, one sort control, contextual overflow, direct editing and saved reading preferences. The only visible content search is Conversation-scoped. Opening an Input hit carries a temporary location highlight, not an automatic Reader-Find query or an edit.

Main Back is origin-aware: `返回搜索结果`, the actual Project/Browse return, or `返回档案首页` for unparented direct entry. `在 ChatGPT 中打开` is a separate secondary verified external action. Generic open does not infer intent from the host page; a deliberate qualified `在 PAIA 中查看此对话` may open the exact saved Conversation.

### A4 — Direct editing

The full prior A4 applies unchanged: one editor/body owner, IME safety, durable save, retry/conflict recovery, navigation guards and no silent overwrite. IAH does not create an editing mode or remove version/undo protection.

### A5 — Source / Time / Version Inspector

The full prior A5 applies unchanged. Original source facts and working versions remain distinct; real/unknown send time remains truthful; restoring a version creates a new current version. Main Back is not this inspector or an external-source action.

### A6 — Archive search and filters

SEARCH_RESULTS is explicit and preserves query, scope, deterministic result ordering, continuation/window, identity-relative scroll/focus and origin history. Input excerpt is primary; reliable time/Source/Project/Conversation path are subordinate. Local lexical/full-text queries reach unmounted eligible content through existing trusted owners. No remote query rewrite, answer, summary or model cost.

All/Source/Project/Conversation scope is clear without an advanced filter console. Clicking a Browse label opens a neutral scope; changing a Search scope choice keeps the query. Clearing query returns Home or the neutral selected Browse scope, never a recent-Input stream.

An activated hit resolves the actual current Input and revision, loads its bounded Reader window, safely recalculates the original-text match and scrolls/highlights precisely. Back restores the recorded results after current eligibility validation. Changed/removed/purged targets use the contract's honest fallback, not stale-text resurrection or another default Conversation. Incomplete index/search coverage is not no-result; partial counts are not full totals.

### A7 — Smart Filter

Prior light/off reading preference and protected human intent remain. Otherwise eligible smart-filtered Inputs participate in ordinary Find by default; a result may say `平时已收起`. Viewing it permits only a route/Input-local temporary reveal, never automatic Keep/protect/restore or a global setting change. Explicit removals and purges cannot be bypassed. A deliberate edit remains a separate human action under existing protections.

### A8 — History import

The complete prior A8 import/preflight/idempotence/recovery contract is retained. Home redesign does not add automatic history capture/import or restore export/backup-generation.

## 5. Thought Library surfaces — TL-PT1-UI-1.0

All prior section 5 requirements remain incorporated and controlled by THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md / REFERENCES and TOPIC_ARCHITECTURE_PLAN.md. No Archive result directory, scope tree, recency block or response/relation feature is transplanted into Thought.

## 6. AI Context surfaces

The complete prior section and its explicit current-over-historical precedence remain under AI_CONTEXT_CARDS_V2_ADOPTION/PLAN/REFERENCES. Archive navigation grants no Context access, Archive fallback or external capability.

## Responsive, dark and final acceptance

Full IAH UX U6/U7 defines the state/error inventory and responsive behavior. Wide keeps three usable regions; medium uses compact/overlay Browse; narrow uses a single content pane and Home -> Browse/Search -> Reader push navigation. There is no full-height tree before narrow Home Find and no three narrow columns. One logical Conversation list is presented in the appropriate pane, not duplicated.

Use shared dark/field/selection/highlight/focus/metadata roles, text enlargement, 320 CSS-pixel equivalent reflow, touch/keyboard targets and reduced motion. Narrow Home does not open the keyboard automatically; Back restores initiating focus/viewport instead of stealing it on updates. Performance, accessibility, live contextual entry and source/release visual comparison remain future measured acceptance. This documentation supplies none of those PASS claims.
