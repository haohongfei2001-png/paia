# Input Archive — approved final visual specification

**IAH-1.2 / OWNER_APPROVED / 2026-10-13.** The approved `PAIA_输入档案_交互原型.html` and its ten packaged screenshots are the final visual reference. [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) defines finite supersession; [INTERACTION](INPUT_ARCHIVE_INTERACTION_CONTRACT.md) preserves behavior/data safety; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation; [REFERENCES](INPUT_ARCHIVE_HOME_REFERENCES.md) records exact bytes.

This replaces the old minimal-optimization geometry in the same file. The complete [prior UX](INPUT_ARCHIVE_HOME_UX_PRE_UI_2026-10-13.md), blob `55ba9142c455658d3c8bf1009ec9af8ed22ce7e5`, remains preserved with all nonconflicting obligations incorporated. Approval changes the target, not the installed application or production acceptance.

## U1. Three spaces, one visual family, different structures

Continue the refined blue-white language of Thought TL-PT1-UI-1.1 and Context CTX4-UI-1.1: near-white canvas, pale-blue boundaries, navy headings, restrained hierarchy, thin line icons and quiet contextual controls. Do not copy their card layouts into Archive. Source → Project → Conversation belongs to the navigator; real user Working Inputs form continuous prose in Main.

Desktop retains primary rail | Archive navigator | Main. No extra browser/chat rail or fourth permanent source column. Keep the three primary destinations 档案 / 思想库 / 用于 AI, Settings secondary and the actual approved brand/Logo. The prototype wordmark is not a separate brand redesign. Scope new styles to Archive or map to existing shared semantic roles; do not change other approved pages merely by modifying a global selector.

Apply the reference's new proportions and spacing, not a recolor of old layout. Preserve the actual scroll/route/editor owners: geometry must integrate with them, not an iframe or a second application shell. Inspect final computed styles including late overrides.

## U2. Neutral Archive and the navigator

The middle navigator has a restrained INPUT ARCHIVE label, 输入档案 heading, compact overflow, one Archive Search, conditional active-scope indication, then the Source/Project/Conversation tree. Source names are quiet; Project controls use a chevron and folder line icon; Conversation rows have clear indentation and a pale-blue rounded selected state. Long and duplicate names must remain identifiable using real metadata.

Project name and arrow are one disclosure target. The separate low-frequency menu can explicitly search that Project; Source overflow can explicitly search that Source. Menu targets must not steal disclosure clicks. Scope is not inferred from expansion, selection color or a Reader path. The conditional scope/clear line is shown only for meaningful explicit scope, not a permanent search administration strip.

Ordinary entry leaves Main truly unselected: no title, welcome, center search, recents, cards, illustrations, statistics or automatic Reader. The new navigator heading does not authorize a Main Home banner. Existing tree expansion defaults remain; the sample's selected/expanded fixture is not production initialization.

An empty archive shows compact truthful guidance in the navigator, reusing existing capture/settings capability. Loading/incomplete/error source states remain distinct, with retry where supported. Do not hide a failure behind neutral blankness or show a fake connected provider.

## U3. Search and flat results

Keep the blue-white rounded Archive field in the middle navigator, with actual scope wording. Reader Find remains a separate compact field within Reader and searches only the current Conversation. Labels and accessible names retain their meaning when query text is present. No duplicate global field in Main.

Results use a modest query heading, truthful scope/coverage, and flat exact Working Input excerpts separated by quiet spacing/rules. Source/Project/Conversation and qualified sending time are secondary. The excerpt is neither a generated summary nor a new content card. Title-only hits are labeled. Known partial coverage/counts are not advertised as global totals or a trustworthy empty result.

Selection must not navigate; native activation should resolve the actual Input/occurrence and surrounding context. Use lightweight non-editing highlights with safe original-text offsets. Return restores the actual query/scope/result viewport and focus. Narrow results can expose 修改搜索 to reopen/focus the same navigator field, not introduce another query owner.

## U4. Continuous Reader

Place normal-flow origin-aware Back above the document; appearance and document overflow remain compact secondary controls. Source path introduces the actual Conversation title and qualified time range. Then a quiet working-text status and current-Conversation Find, chronological order and relevant date navigation lead into continuous prose.

The approved reading hierarchy includes subtle verified date-group headings/rules and per-Input time in a quiet left gutter on wide screens. On compact screens, time can move above the corresponding prose. Never hide time truth for aesthetics, put fully unknown time under a known date, or invent a date/range. Preserve known date versus unknown clock-time precision and source ordering. A date picker is a small current-Conversation navigation aid, not a calendar, taxonomy or whole-library timeline product.

Inputs are unboxed paragraphs, not chat bubbles, raised cards, per-Input provider banners or reconstructed assistant exchanges. Preserve full text, original paragraphs, long/code/mixed-script content and reading to the qualified eligible end through existing safe incremental/windowed rendering. The demo renders a finite corpus all at once; that is not a scale implementation.

Reader end/coverage wording must describe actual completeness and hidden/ineligible content honestly. Read to end cannot be inferred from the currently mounted nodes. Sorting, additions, font changes and navigation preserve the relevant Input/revision/text-offset anchor, dirty editing and selection. Back is not sticky in any theme or viewport.

## U5. Editing, source and history

Clicking Working prose directly enters the existing inline editor. Resting text remains visually open; the active edit alone receives restrained border/focus emphasis. Enter creates a paragraph. Compact edit/copy/overflow actions appear on hover/focus, and remain reachable on touch/keyboard. Do not show an always-visible tool row under every short Input.

A genuine edited Input may show 已修改 · 原文保留; the label requires retained source evidence. Save pending/failure/retry/safe-copy and truthful durable acknowledgement remain visible where relevant. Do not sacrifice draft/caret/IME protection to produce a smooth mock animation. Use existing editor and source-binding semantics, not the demo serializer or localStorage.

Original-source inspection opens a temporary right drawer. It distinguishes source path/time/type, initial retained original and current Working text when changed. It does not remain a fourth column during normal reading. Version history is likewise on-demand, with real versions and explicit guarded replacement into a new Working revision. Missing source, partial evidence or purged history stay honest; current text cannot be relabeled as original.

Keep contextual explicit copy, removal/undo, lawful recovery and qualified original-site opening through their existing owners. Copy preserves only the intended current/original text and line breaks, without time labels or highlight markup. No clipboard read, automatic external sending, bulk export workflow or deletion of the original platform. The sample's absent real source link is an example, not removal of the product's supported original-site action.

## U6. Dark, narrow and reading preferences

Use the supplied dark Reader as a real reference for the new Archive dark translation, while preserving the existing shared theme preference owner. Dark gets the same hierarchy, contrast and functionality; no unrelated dark palette or global theme reset.

At narrow width, initial Archive shows the navigator; choosing a Conversation shows a single usable reading pane. Opening the same navigator uses the existing overlay lifecycle and returns focus correctly. Do not squeeze primary navigation, source tree and prose into three narrow strips, duplicate hidden search controls or discard state during resize.

The rendering baseline uses 17px/680px, but actual saved reading font/width/theme preferences and current default/fallback policy prevail. Existing controls/ranges are not reduced to the mock's example options. Reference numerical changes must not silently override another page's settings. Keep explicit zoom/text enlargement, 320 CSS px reflow, coarse targets, keyboard/heading semantics, accessible focus and reduced motion. Where the mock's small controls or low-contrast metadata fail an existing requirement, use the closest accessible semantic role rather than reproducing an inaccessible pixel.

## U7. Concrete starting values and reference-only details

Values below are read from the original HTML. They anchor implementation; they are not a license to clip content, hardcode device breakpoints or replace shared preferences.

| Role | Reference starting value |
|---|---|
| Primary rail / Archive navigator at 1560px reference | 184px / 282px |
| Main document container | max 1000px; 30px top and 55px horizontal padding |
| Main ink / working text / accent / divider | #20334d / #435e80 / #3769c9 / #dfe9f6 |
| Canvas / fine selected surfaces | #fbfdff with broad restrained #eaf2ff / #edf5ff tints; selected #e8f1ff |
| Navigator heading / Conversation heading | 25px serif / 29px serif starting roles |
| Navigator search | about 40px height, 10px radius; independent Reader field about 34px before target adaptations |
| Wide prose reference | 17px, 680px preferred measure, line-height 2; saved choices take precedence |
| Wide time + text separation | 45px time column + 23px gutter; 68px document heading/date alignment |
| Navigator rows / selected boundaries | Project about 42px before coarse-target adaptation; Conversation padded content-sized rows, 8px radius |
| Source drawer | 470px starting width, capped to available viewport; narrow becomes full available width |
| Narrow layout | reference switches to directory-or-reader around 700px; current shell integration and usable width govern |
| Motion | brief focus/layer transitions; all nonessential transitions disabled for reduced motion |

Use system font roles/fallbacks; no font binaries are shipped. The actual brand asset remains separately authoritative. Reference selectors include `.navigator`, `.nav-search`, `.scope-hint`, `.project-toggle`, `.conversation-link`, `.main`, `.reader-head`, `.record`, `.input-body`, `.record-time`, `.find-box`, `.result-content`, `.drawer` and `.preference-panel`.

Do not ship prototype controls 初始页/阅读示例/搜索示例/更多状态/说明/重置, fail toggles, inspection hooks, sample source labels, fixture corpus/URLs, fake counts or sample dates. The documented 80-Input fixture, 12-result display window, 12-revision history and sample font choices are not product capacities/policies. Preserve real settings/capture/import/recovery and existing low-frequency operations that the illustrative mock does not implement.

## U8. Acceptance and precedence

Compare actual native PAIA source/release rendering against the ten new-reference states at equivalent viewport, content roles, theme, locale, font/zoom and saved reading preferences. Match composition, information hierarchy, spacing, contextual states and behavior, not merely blue colors. The original diagrams are not runtime or installed-build evidence. The old A/B/C screenshots and their exact-pixel requirements are historical; previously rejected behaviors remain rejected.

Keep all nonconflicting old behavioral/error/coverage/accessibility/performance expectations, including states not pictured in the new package. Screenshots do not prove storage, permissions, genuine source/clock precision, complete traversal, deep history or physical IME. Do not trade these away for visual similarity, or run unrelated whole-product redesign/recertification merely because a scoped UI changed. PLAN and existing verification rules specify the actual changed-boundary checks.
