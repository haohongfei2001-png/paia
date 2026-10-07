# PAIA Archive Existing UI — Minimal Optimization visual specification

**IAH-1.1 / selected visual scope approved 2026-10-08.** This is the sole current Archive presentation contract, correcting IAH-1.0 in place. [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) controls the allowlist/exclusions; [INTERACTION](INPUT_ARCHIVE_INTERACTION_CONTRACT.md) owns behavior; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation; [REFERENCES](INPUT_ARCHIVE_HOME_REFERENCES.md) binds the unmodified review assets. Approval is not a production acceptance claim.

## U1. Baseline and unchanged regions

Use actual PAIA, not a newly invented Archive design system. Preserve Logo/brand, light primary navigation, 档案 / 思想库 / 用于 AI, bottom Settings, three-column relationships, Source/Project/Conversation tree, current blue selection, backgrounds, borders, radii, icons and fonts. The dark browser sidebar visible outside PAIA in private screenshots is browser chrome, not a fourth PAIA rail.

Preserve current Reader title/time/prose hierarchy, width and size preference logic, Input spacing, sort/menu placement and continuous reading/editing. Reuse final computed shared styles, including later app-shell.css overrides, rather than copying an earlier token declaration or prototype stylesheet wholesale.

The review used 1440x960 A/B with 184px primary rail and 272px Archive column; its 17px/680px standard prose setting was a comparison preference, not a new product default. Actual saved preferences and current 16px/800px fallback behavior where applicable remain. Keep present responsive breakpoints/geometry unless an approved content change exposes a real defect. Source weight and current long-name wrapping are KEEP, not redesign tasks.

## U2. Neutral Archive: blank Main is the final decision

Ordinary primary 档案 displays existing primary navigation, middle-column search/tree and an unselected blank Main. No selected Source/Project/Conversation/Input, previous Reader title/year/body, Home title, description, Welcome, large/centered search, icon, P1 hint or P3 Project hint.

No Recently viewed, default Input feed, recommendations, suggestions, counts or dashboard. Expanding a Project leaves Main blank if already blank and does not replace a visible Reader/results state. Empty local data, actual loading/search failure and fault recovery retain their existing distinct truthful presentation; this rule is not permission to disguise failures as a normal blank page.

## U3. Search in two existing locations, with different meanings

Desktop middle-column Archive Search remains exactly in its current position and visual role. Its unrestricted visible hint is 搜索全部档案. Reader's existing field remains with 在此对话中查找. Keep size/background/radius/icon and actual accessible labels. No duplicate global search is added to Main and no current different-scope field is removed merely to satisfy a numerical one-field assertion.

Archive query/scope and Reader Find are independent. Opening a search hit does not seed Reader Find with the global query; returning restores the original Archive search. Expanded Project/current Reader does not silently restrict Archive Search. Explicit narrowing must be visibly truthful through existing scope wording/conditional affordances and applied by the query owner. Reuse existing low-frequency scope facilities; do not add a new permanently visible selector or copy B's scope strip unconditionally.

When a query occupies the field, existing scope presentation and accessible naming must still reflect its real scope. Long scope names/query text remain usable without enlarging columns. Preserve input/caret through debounced updates and IME. Narrow states retain one logical field for each available scope using current navigation/result placement, not focusable off-screen duplicates.

## U4. Input-first flat results

Use exact eligible current Input wording as the principal readable text. Time, Source, Project and Conversation path follow in existing secondary metadata roles. A title-only match must say it matches location/title and cannot pretend the body matched. No AI summary, invented citation, thumbnail, raised card, avatar or per-hit permanent toolbar.

The compatible part of B results is content hierarchy, flat spacing/separation, readable attribution and lightweight lexical emphasis. Sample counts/text and incidental header metrics are not new requirements. Preserve negation and conditions around a match, Unicode-safe excerpts, honest continuation and access to the full Input. Unknown send time remains explicit. A partial loaded count is not a corpus total.

Activation reaches the actual Input, with native keyboard/focus semantics and text-selection protection; selecting an excerpt must not accidentally navigate. Hover/focus reuse existing PAIA roles. Coverage states distinguish loading, incomplete, error and trustworthy no-result. Reuse existing status/retry roles; no explanatory Home page or scope dashboard is added to solve results feedback.

## U5. Project navigation: no split click or separate Main page

Keep current whole-row Project disclosure, including the name and arrow. It only expands/collapses children. Preserve row targets, selected Conversation treatment, source-label weight, indentation, long/same-title behavior and scroll. Do not give the Project name a second scope-selection action or introduce selected-Project styling merely to imitate B.

A separate explicit search-scope action can use an existing low-frequency surface. A new permanent visible control is outside approval. BROWSE_SCOPE is a logical scope/return state and has no compulsory Main heading, search field, hint or repeated Conversation list. Keep Main blank before content selection; maintain current content if only the tree is disclosed.

Do not adopt B M6 consumer-copy edits by implication. Current labels remain, with unknown/unassigned/last-known/deleted/detached source facts correctly distinct. Actual empty/loading/unavailable groups use existing qualified states, never invented Conversation content.

## U6. Reader: preserve the page; improve return and arrival only

Existing normal-flow Back position/style is retained. Use 返回搜索结果, 返回项目浏览 or 返回档案 according to the actual recorded origin, not the current tree highlight. Restore real query/scope/result or tree focus/position; it is not a copy-only change. The button is not sticky/floating, including search-origin, deep, dark and narrow variants.

The original-site action stays separate and secondary in an existing contextual/overflow surface when its source URL is qualified. It never replaces internal Back or reserves a new permanent toolbar slot. Synthetic prototype links are not production URLs.

Result activation scrolls to the real eligible Input/range after loading, with a lightweight temporary text highlight using current shared roles. No editable markup mutation, body revision, automatic Keep or durable selection. A permanent margin stripe, persistent arrival strip and the prototype's sticky header are not prescribed. Relevant exceptional states can use existing local feedback. Changed/removed/purged/source-unavailable targets follow INTERACTION, never stale-body replay.

Reader Find continues within the same Conversation; close restores its pre-Find anchor without replacing Archive origin. Keep current title, years/time, prose width/size/spacing, sort and menu. No date-group redesign, hidden per-Input time, card/bubble or reconstructed AI response.

## U7. Dark, narrow and accessible continuity

Map the same existing palette, selection/highlight/metadata/focus roles in dark mode. No new Archive theme, glow/glass or navigation color scheme. Retain saved font/width choices and current responsive shell. Narrow Archive can directly present its existing search/tree; results/Reader occupy the usable content pane or current overlay model without a new welcome step.

Retain existing keyboard order, accessible names, effective desktop/coarse targets, text enlargement, 320-CSS-pixel equivalent reflow, focus return, IME/selection and reduced motion. No software-keyboard auto-open or late-query focus theft. Changes to result content/Back labels must be checked at desktop, narrow and dark sizes using the same data and preferences. This task does not certify those production tests.

## U8. Reference application and acceptance

Use A for source-informed visual comparison of unchanged regions; apply only ADOPTION's selected B changes. Relevant evidence includes B blank Home/search labels, flat Input-first results and ordinary Reader text; every B image/HTML interaction is overridden by the rejected-item ledger. In particular, figures showing Project scope-on-label, P1/P3, C, a sticky return, M6 or extra target chrome are not whole-screen production masters.

The existing review packages/report/prototype are preserved unchanged as private evidence, not edited into fictitious final assets. There is no new approved composite bitmap purporting to implement the corrected subset. At runtime implementation compare actual source/release rendering against the actual baseline plus this explicit change/exclusion list, not against all B pixels. A missing reference is not permission to invent a new design.

The prior IAH-1.0 Main-only/Home mock rules, pre-review poster and old compatible-mock precedence are superseded only as ADOPTION specifies. Unrelated shared/Thought/Context/Settings/Prompt/Sync rules and safety requirements remain. Full production visual acceptance needs evidence from the selected implementation; prior synthetic checks are historical, including checks of now-rejected prototype behavior.
