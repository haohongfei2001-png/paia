# PAIA Narrow Input Board v4 — Canonical Design Specification

Contract: **NIB-V4-1.0** · 2026-10-09 · Programme: **PAIA-CONSUMER-PRODUCT-v1 / existing Prompt lane**.

**DESIGN_SCOPE_OWNER_APPROVED / DOCUMENTATION_ONLY / IMPLEMENTATION_NOT_STARTED_BY_THIS_TASK.** The owner selected the ten narrow-board requirements. This specification records that selection; it does not certify the prototype, authorize runtime execution in this turn, activate Pro, or remove Popup. While the documentation PR is Draft/unmerged, this is its proposed canonical integration, not a claim that main has changed.

Read [adoption and supersession](NARROW_INPUT_BOARD_V4_ADOPTION.md), [execution plan](NARROW_INPUT_BOARD_V4_PLAN.md), [integration](NARROW_INPUT_BOARD_V4_INTEGRATION.md), [references](NARROW_INPUT_BOARD_V4_REFERENCES.md), and [acceptance](NARROW_INPUT_BOARD_V4_ACCEPTANCE.md). STATUS alone admits a future implementation batch and assigns the existing Root/coordinator and Prompt owner. No second programme, scheduler or automatic developer is introduced.

## 1. Product and surface boundary

One narrow browser board supports familiar expression reuse, local Archive search and bounded exact-text checking. Free provides the existing editable frequency/Prompt Family experience. Pro may provide authorized AI-selected historical candidates through the same renderer. Deep reading, Archive/Thought/Context organization and full permissions remain in PAIA.

Do not build a native Side Panel, injected large sidebar, dual-carrier handoff, 376/613/620px expanded search window, document reader, content-type filters, ranking dashboard, material tray or second prompt library. The single ordinary product link is **打开 PAIA**. Logo is not a duplicate navigation control. Normal rows contain no frequency, confidence, date, category or diagnostic badges.

Automatic supported-input capture remains unified, continuous and independent of surface visibility. No per-page/per-conversation capture chooser. Existing Source removal/non-reentry, retained underlying records, tombstones, human protections, revision and recovery owners are unchanged. Searches, closing, subscription changes and geometry cannot restore removed material, delete source data, create capture consent or enable external Context access.

## 2. Exact geometry and material

### 2.1 Width

Retain the current layout rule in CSS pixels:

```text
W = min(viewportWidth <= 400 ? 322 : 336, viewportWidth - 32)
```

Ordinary desktop width is exactly 336px, independent of candidate count or body length. Candidate, search, full-text check, editing, menu and authorization states use this same width. The existing narrow-viewport rule only reduces width; it never grows beyond 336px. Browser zoom/DPR are not CSS-pixel width changes. Keep the existing horizontal position/position-reset owner; only clamp to the available viewport. Do not add a parallel position preference or rewrite saved position records.

### 2.2 Height

Use actual visible top controls and the **whole composer form**, including send/attachment/model/voice controls. Measure all rectangles in one coordinate system, accounting for visualViewport offset/scale. Do not confuse layout-viewport coordinates with visual-viewport coordinates.

```text
safeTop    = max(visibleViewportTop, relevantTopControls.bottom) + 12
safeBottom = min(visibleViewportBottom - 12, composerForm.top - 12)
available  = max(0, safeBottom - safeTop)
height     = min(measuredIntrinsicContentHeight, available)
y          = safeBottom - height
```

Anchor in this band above the composer; increasing content extends upward. A growing composer reduces available height. Keep the horizontal anchor stable. Do not move the board below or beside the composer to turn it into a larger reader. Upward-growing composer changes position and height, never user mode.

At normal text size, the reference list geometry is approximately `90 + 44*N`px; 90px is reference chrome, not a storage/algorithm constant. Measure actual content when language, font scaling, notices or editing change it. Do not fill all available height when there are few candidates. At the cap, scroll only the candidate/checking content; retain reachable search, back, close and necessary actions. Keep scroll anchor and focused row during reflow.

If the safe band cannot contain usable controls and a row, report layout limitation without covering the composer/top controls or changing logical mode. Retain query and pending manual work in the existing protected state. A temporarily unrenderable board may be clipped/not painted; this is **not** COLLAPSED and does not overwrite open preference. Resume the same view when geometry recovers. Do not auto-open PAIA or a sidebar. The toolbar remains an explicit PAIA escape route. Do not claim this physically unusable condition is a normal usability PASS.

### 2.3 Reused visual language

Use the current frequency-board font stack, **13.3px / 1.55** text role, approximately 430 normal row weight, 20px outer radius, 12px row radius, quiet separators, blue-white diffused light, translucent glass, subtle edge and soft shadow. Reference light text `#1d2738`, secondary `#64748b`, action `#426cad`, focus `#5e8ee8`; dark text `#e9eef6`, secondary `#a6b2c2`, focus `#91b4f4`. Reuse existing semantic roles rather than make a second theme system.

Keep the existing 40px visible orb/44px hit area. Capsule reference is 272x44px, reducing when necessary; no face, pulse or automatic carousel. Glass lives in the existing page-overlay shell; private text, including capsule text, stays in a bound cross-origin extension frame, not host DOM. Blur is bounded to the visible surface, approximately the existing 18px. Use higher opacity in the small full-text check when necessary for readability. No remote fonts or host screenshots.

Honor explicit PAIA appearance/language preferences, with the existing system/host fallback only where appropriate; do not claim the unfinished global proportional-font feature is delivered. Support keyboard, visible focus, coarse input, 200% text, forced colors and reduced motion/transparency. At enlarged text, 44px is a minimum rather than a clipping mandate; remain one text line with safe ellipsis and a reachable full-text path. Default-size rows are 44px.

## 3. One-line rows and exact use

All candidate and search rows use the same component. One expression, one line: nowrap, overflow hidden, ellipsis. No title/summary pair. Reserve a stable row action region; hover/focus must not move text, change the truncation threshold or reorder rows. Fine pointers reveal fill/copy/more; coarse pointers retain explicit accessible actions with at least 44px targets. Actions never overlap the text hit target or nest interactive elements.

A genuinely fully visible short expression can be filled by its text button or explicit fill control. Copy is a separate action. **Actual truncation**, multiline source text, meaningful hidden whitespace or a visually abbreviated body makes text/fill enter full-text checking first. Do not use a character-count heuristic as proof that all meaning was visible. Copying a truncated row also enters checking before disclosure. Accessible names do not substitute for visually checking an unseen condition.

The full-text check replaces/occupies a compact area in the same 336px board; its normal body viewport is at most **150px**, with internal scrolling. It is not a long reader. Show necessary source/ownership context here, not on every candidate row. Full text must come from the current trusted body owner. Whole-text actions require complete resolution; a loaded page is not an entire Input. Oversize/unsupported material refuses rather than truncating a hidden tail. Deep reading uses 打开 PAIA.

With no selection, buttons say 填入整条 / 复制整条. A contiguous selection inside the current body changes them to 填入选段 / 复制选段. Bind original UTF-16 offsets plus input/template identity, revision and eligibility generation; honor Unicode/grapheme boundaries and original line breaks. Preserve the selected range when focus moves to an action; explicit cancel returns to whole text. An invalid range never falls back to the entire body or a guessed newer range.

Only the selected body/range is used: no automatic title, timestamp, source URL, surrounding conversation, hidden evidence, Markdown quotation or generated prefix. Source invalidation/revocation removes stale readable body and disables fill/copy; do not fall back to retained Source or old cache. Content already deliberately placed in the user's draft is not later removed by background work.

## 4. Distinct content owners, one renderer

These are conceptual discriminated refs, not a new persistent schema or claimed existing endpoint:

| Ref | Authoritative body | Allowed handling |
|---|---|---|
| `history_input` | Current eligible Archive Working Input, stable Input ID/revision | Search and Pro historical-ID results; exact body/range use |
| `prompt_family` | Existing PromptReuseService resolver, Family/preferences revision and generation | Existing frequency projection, representative, pin/order/hide/split and manual intent |
| `manual_reuse` | Existing manual template/override owner | User-owned reusable expression, never relabeled as previously sent history |
| `reply_suggestion` | Existing ephemeral Stage3A candidate and authorization generation | Separate local reply-suggestion contract; never a durable historical row |

Free default candidates continue to use existing Families and manual overrides. **Do not replace the Family engine with a naive list of Input IDs.** Keep stable IDs, pins, representatives, hidden rows, split/do-not-merge intent, retained templates, manual order and existing verified-reuse semantics. Sharing a renderer does not merge these identities.

Editing a Family changes its existing reusable override, not Source or Working Input. Editing a history search hit creates/updates a reusable expression through the existing Prompt owner only after explicit save; no silent Archive edit, no placeholder Family solely to pass insertion. The history search result remains the actual history version. Full-text checking distinguishes 你修改的常用表达 / 手工创建的常用表达 from history. Do not delete manual work on upgrade, downgrade, reindex, new AI ordering or migration.

AI does not overwrite or move human-pinned/edited rows. Pin/manual order is applied as a constraint before presenting an admitted AI candidate sequence. Any manual override associated with an AI-chosen historical ID must be resolved explicitly as `manual_reuse`, not shown as unmodified history. Model-proposed free-form strings are rejected.

Frequency counting stays in its existing owner. Duplicate capture, failed/unknown insertion, opening, hovering and search do not increment it. Do not invent historical per-Input reuse counts by copying Family counts; no new behavior telemetry/event store. Successful Archive use that is not a Family must not fabricate a Family event. Any future additional aggregate belongs to the existing owner with separate compatibility review, not this UI's new database.

## 5. One Archive search

Search is free for both tiers and searches effective historical user Inputs, not Thought/Context types or only the useful Families. Use `SEARCH_INPUTS`, `qualifiedInputSearch`, existing ranking/cache/scan and `findInputPage`. Use Archive's existing full eligible scope and ordinary include-filtered semantics; no new type/category/ranking tabs. Recommendation eligibility may be narrower than ordinary Archive search; do not accidentally apply the Family useful/filter predicate to all search results.

Empty query stays SEARCH without invoking a zero-query whole-archive feed. No typing-triggered generative reranking or hidden remote embedding. Defer queries during IME composition; cancel superseded continuations. Partial coverage, no result, stale snapshot and read failure are different states. Preserve exact original input text in matches; normalized matching must map safely back to the original.

Back restores query, existing search scope/order/snapshot, continuation, result ID plus relative scroll offset, and focus. Removed targets revalidate and degrade honestly. Geometry and scroll never trigger a query. Reopening can revalidate refs; do not store a second body cache, snippets in URLs, permanent query history or sync active UI sessions.

An explicit board-to-PAIA search/selected-Input action hands the same query contract and qualified Input/range to existing Archive navigation after current editor save/IME guards. New query generations may require re-reading but not a silently different ranking. Generic opening does not infer an Input from the host chat. No arbitrary `#settings`/Archive URL grammar or general worker sender bypass.

## 6. Stable interaction and lifecycle

Logical states: COLLAPSED (orb or single capsule), CANDIDATES, SEARCH, CHECK_TEXT, EDIT, MORE, CONSENT/RECOVERY. Geometry has only a rectangle and layout-availability; it cannot request a logical state transition.

Only deliberate user pointer/keyboard actions expand, collapse or switch mode. Blur, inactivity, host scrolling, viewport/composer changes, unrelated storage notifications and arriving recommendations do not. Clear query stays SEARCH; Back restores the prior list. Fill/copy success leaves the board open. Preserve dirty edit/IME guards when a user explicitly closes.

Freeze candidate identity/order for the open session. Newly computed frequency/AI candidates become eligible for the next explicit open/refresh, not an involuntary jump. Explicit user reorder can update immediately. Removal/revocation is an immediate eligibility veto: erase or disable that slot without refilling/reordering the rest; stability never justifies stale content.

New users default to the existing orb. A single-candidate capsule is a user-selected collapsed presentation, not an automatic appearance when AI completes. Retain its selected presentation without restoring ephemeral content or authority. No candidate rotation. With no lawful capsule candidate show a quiet orb/empty affordance without auto-expanding.

Same-document conversation/branch changes preserve mode/query but invalidate selections' receiving target and transient reply candidates. Actual document replacement/refresh resets temporary expanded state, search/ranges and insertion tokens to the chosen collapsed entry. Background tab focus changes do not reset. Never apply another tab's saved open state to the current document. Preserve position/manual preferences and unrelated browser-session Next authorization across an ordinary page refresh. Extension update/browser-session termination follows existing permission owners, never backup-restores reply reading.

The private Stage3A transient strip may retain its existing bounded display lifetime; this is distinct from the user's expanded board and does not collapse or reorder it.

## 7. Existing draft and receiving target

Reuse `ChatGPTComposerAdapter` and the existing insertion coordinator, extending typed source resolution rather than creating a second writer. Before effect, revalidate window/tab/document/conversation/composer identities, content revision, selected range and relevant authorization generation. No lastFocusedWindow-based surprise target, hidden old-tab activation or generic editor fallback.

Use a valid current/saved caret, preserving prefix/suffix; a selected host draft is not permission to replace it. When there is no reliable caret, use the adapter's explicit non-destructive append behavior. Nonempty draft alone needs no repeated confirmation. Preparation-time draft drift, composition/unknown IME state, ambiguous/unwritable composer, target change or size refusal produces no write; do not switch to append to bypass conflict.

One operation ID has at most one effect. Fill/reply reuse paths share the target document's existing write arbitration; busy refuses rather than queues automatic actions. A known success requires readback; a lost acknowledgement is UNKNOWN, not failed or safe-to-retry. Preserve pending identity across relevant worker interruption without logging bodies; never auto-replay. User checks the draft before any new attempt. Use native undo where the adapter actually supports it; never restore an old whole draft destructively.

Copy is write-only clipboard with truthful failure/manual-selection fallback and current eligibility checks. Fill is an explicit one-time disclosure to the host input field even without Send; do not claim the website cannot see it. Never click Send, simulate Enter-to-send, upload an attachment or change persistent Context grants.

## 8. Free and Pro admission

Same board, search, rows, manual controls and insertion. Free uses frequency/retained expressions. Pro uses AI candidate selection only after all of: trusted membership/entitlement, real service availability, capability-specific processing consent/current scope, budget/quota admission and qualified candidate result. A local Pro switch is never authority. Without admission show/use ordinary 常用输入 and local search; never disguise local frequency as AI推荐.

Permitted recommendation inputs are bounded already-eligible historical Inputs within the processing scope; relevant already-sent/already-captured user Inputs within that same scope; and task intent the user explicitly supplies for this action. No unsent draft, keylogging, whole-chat or hidden-tab sweep, assistant history, attachments or credentials. Stage3A local reply consent does not authorize this provider to read/upload replies. Do not relabel the dormant reply-oriented Assist implementation as a safe historical recommender without a new scoped adapter/admission check.

Use the existing AI-COST/AI_USAGE job, entitlement, budget, usage receipt, cache and unknown-outcome machinery. This is a Pro historical-candidate facet, not a fourth independent quota/account/provider stack. Map its job/result contract before live activation; all numeric quotas remain owned by AI_USAGE_ARCHITECTURE, not copied here. Existing unrelated Free AI Assist/Organize allowances are not silently removed by this narrower Pro default-candidate decision.

Model output is a bounded ordered set of allowlisted candidate IDs with validated schema; trusted code resolves exact current bodies. Reject fabricated IDs, stale refs, assistant-derived pseudo-history, negation/condition mismatch and implicit sensitive confirmations. No generated prompt is represented as history. Low confidence may return no recommendation. Cache by allowed evidence/content/human-intent revisions and permission/service identity; never by page size or a broad all-history snapshot on every open.

In the first live slice, dispatch requires explicit AI recommendation intent after consent; merely opening/searching/resizing the board reads cache/local candidates and costs no remote call. Background refresh on newly captured inputs is deferred unless separately bounded and authorized. One request in flight; no timer loop, streaming-token request or hidden retry. Late result is held for a later explicit refresh. Revoke invalidates in-flight delivery immediately. Downgrade, quota exhaustion, service outage and offline state preserve lawful manual content/search and do not silently spend elsewhere.

Real provider/region/retention, commercial disclosure, account and financial permission remain genuine S3 activation gates. Fixed-ID prototype samples are not a service, benchmark or billable success.

## 9. Old Popup responsibilities and final entry

Keep production Popup until S4 replacement evidence is complete. No sidePanel permission or native carrier is introduced. Proposed S4 default: toolbar always opens/focuses an existing PAIA tab in the current window (create only if absent), without reloading or discarding work; the orb is the in-page reuse entry. Specific board search/content actions carry explicit qualified intent. This focus-only toolbar semantic is listed for final owner confirmation before S4 cutover; it does not block S0–S2.

First capture consent still goes through existing PAIA onboarding. Preserve independent Next status/configure, pause/resume with existing backfill explanation, Settings/permissions, About/current-install update and actionable fault recovery. Put them in board more/PAIA Settings as appropriate, not a status dashboard. Non-supported websites and hidden/unavailable orb still have the toolbar-to-PAIA route. Basic control reachability must not depend on a healthy archive search or Pro service. Actual faults use one truthful local notice; never auto-refresh a draft, unload/reinstall/clear storage, or equate enabled capture with successful saving.

## 10. Implementation and completion are separate

This document specifies future behavior. All production gates in ACCEPTANCE start NOT_RUN for NIB v4. S0 preserves Family/manual compatibility immediately; S2 is completion, not permission to break those features earlier. A design reference passing 193 synthetic assertions cannot certify actual extension iframe isolation, native IME/undo, 100k-input behavior or live AI quality. Existing Source/capture/Sync/Context/other UI work and release gates are retained; no old feature is restarted to manufacture this plan.
