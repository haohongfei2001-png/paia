# UI system, tokens, responsive, accessibility and motion

These numerical and behavioral details are **completion decisions** within the supplied frozen visual language. They are not a claim of pixel-extracted source values or WCAG certification. `tokens.css` is the literal token authority; screenshots must not introduce competing values.

## Component contracts

| Component | Inputs / owned state | Events / restrictions |
|---|---|---|
| AppShell / PrimaryNav | route, enabled capabilities, current space; 184px wide rail | navigate only through one route owner; never storage/permission authority |
| ContextualNavigator / ConversationRow | admitted provider/project structure, selected ref, expanded keys, anchor | open/collapse; no second search; no decorative counts; no forged membership |
| ScopeSearch | label, immutable scope ref, query generation, coverage, result anchor | query/next/previous/close; full-domain service; preserve route-specific query |
| ReaderHeader / Time | title, true order, save status, actual time precision | order toggle/overflow; no duplicate metadata; unknown stays unknown |
| ReaderInput / InlineEdit | stable owner/ref, base revision, local draft, composition, selection | edit/flush/undo; delegate existing EditorSession; no captured-thread composer |
| SelectionToolbar | revision-bound single-body range, text, viewport rect | exact copy/add/topic/context; close on selection loss, keep logical target during action |
| InlineSaveState / RecoveryState | actual operation receipt/state, recovery capability | retry/compare/copy/stay; never declare saved on timeout or animation |
| OverflowMenu / OriginalSurface / HistorySurface | explicit target and invoker, selected existing version | one modal; historical text readonly; restore creates new working revision |
| TopicRow / TopicEvidence / YearSection | title, true excerpt, role, time precision, loaded/total coverage | open/jump/reveal; no invented development story or AI importance filter |
| EvolutionMarker | actual human heading or labeled AI proposal | structural date label not inferred belief; no fake turning-point badges |
| AddThought | safe independent draft, optional Topic | current-date save; B-01 does not authorize old-body editing |
| AIOrganizeTrigger / ScopeReview | saved-output availability, real request scope/provider/limits | view saved vs confirm generation distinct; no paid background retry |
| CandidateChange / CandidateAIText | canonical change-field identity, exact evidence, proposed role, revision | disclose structure vs AI-new; no independent commit of arbitrary subparagraph |
| AdoptKeepControl | unset/adopt/keep, candidate identity, staleness | explicit choice; check + text + neutral selected border; no color-only meaning |
| ContextTask / ContextSelection | task draft, explicit intended set and coverage | preserve incoming selection; task changes invalidate old review |
| RetrievedSuggestion | allowed suggestion and origin, current excerpt | add only intentionally; cannot silently replace explicit material |
| ContextMaterial / StaleMaterial | chosen ref/role/origin, revision, eligibility, local output edits | remove-from-task != delete source; re-review changed permitted material |
| CoverageWarning / ContextReview | intended/included/excluded set, exact output, budget type | explicit split/deselect; output-only editing, no silent clipping |
| CopyExportActions | reviewed binding, current eligibility, effect state | final fresh check; clipboard/file ack only, never sent-to-AI success |

Components share one menu/dialog stack, one status presenter per active task and one domain owner per editable body. Existing dark mode, font-size, capture, Backup and permission controls are preserved; a light canonical specimen is not permission to remove those capabilities.

## Typography and geometry

UI and prose: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif. No network font download. Code: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace. Do not bundle font files. Consumer text remains one selected locale; mixed-language user content is unchanged.

UI 14px/1.5; primary navigation 14px; metadata 12px/1.5; prose 16px/1.85; heading 28px/1.35 weight600; section18px/1.5; code13px/1.6. Preserve existing reader-size preferences; maximum body width is 760px, Context880px, compare960px. Small captions must remain legible, not pale decorative hairlines. No serif substitution based on generated mockup accidents.

Spacing: 4/8/12/16/24/32/48/64px. Control min-height32px desktop and44px coarse pointer; normal primary control36px. Modal radius8px, inputs6px, selection rows4px; body/evidence no card radius/shadow. Border1px. Shadow only for transient menus/modals. Text selection is pale blue; brand brick-red is not destructive or automatic selected-state meaning. Focus ring blue2px plus2px offset; selected controls add label/check mark.

## Responsive rules

>=1440 CSS px: primary184, Archive navigator280, main remaining; header72; body max width as above with minimum32px inner gutters. No empty contextual column on root/Context/compare.
1024–1439: primary160, Archive navigator240, main fluid, gutters24. Long titles wrap at most two lines in rows; full title accessible on focus/tooltip and main heading without ellipsis.
768–1023: primary64px icon rail with accessible names and visible focused labels; navigator is an explicitly opened temporary navigation sheet, not metadata Inspector. Main uses24px gutters; main header includes Back/navigation trigger. No simultaneous narrow fourth surface.
<768: stacked browser reflow, top compact current-space/navigation controls, no permanent side columns,16px gutters. Compare stacks Current then Candidate. Modal uses available width. This is desktop-browser reflow/zoom support, not a released native mobile claim. At320px page has no horizontal scrolling; code/table may use its own labeled horizontal scroll region. At200% text, headers/actions wrap without covering content; sticky controls cannot hide focus.

## Keyboard/accessibility contract

Use semantic navigation, headings, native buttons/inputs and dialogs, not clickable divs. Reading content is not an application-role region. Default focus order: space navigation → contextual navigator if present → workspace controls → content → task action. Provide Skip to content. Tab/Shift+Tab reach all functions; no drag-only action.

Cmd/Ctrl+F opens only current scope search when appropriate; do not steal IME/native editing shortcuts. Escape closes active popover/search/dialog first; no implicit discard. Native text Shift+arrow selection can reach actions through a contextual shortcut or Tab focusable toolbar without clearing range. No unconditional interception of Copy. Enter/Space activate controls; arrow keys move in an actual tree/menu only, not in ordinary reading prose. Adopt/Keep are a radiogroup per canonical field, with no preselected answer.

Modal focus enters heading for long prose or first meaningful control for small forms; background inert, Tab contained, Escape uses close guard, focus returns to surviving invoker or workspace heading. Only one modal. Busy states expose aria-busy; meaningful status uses role=status; failures include text/action. Use aria-current for route, aria-expanded for groups, visible labels for disabled release reasons. Full title never exists only on hover.

Target WCAG2.2AA: normal text>=4.5:1, large text>=3:1, relevant non-text controls/focus>=3:1; minimum target24px with standard exceptions, PAIA targets32/44 above. 200% text resize and320CSSpx reflow tested separately. Keyboard, VoiceOver/NVDA and physical Chinese IME are separate evidence classes. See official references in SOURCES; prototype rendering is not a conformance certificate.

## Motion specification

Menu120ms, Project reveal160ms, navigation180ms, candidate structure preview220ms; easing cubic-bezier(.2,0,0,1), distance<=8px. Delay loading indicator150ms, but never delay actual action completion just to finish animation. No continuous decorative motion or fake progress.

AI request-running state keeps Current readable and stable; status describes only actual request phase. After a validated candidate arrives, animate a separate preview snapshot, not the live editable Current: preview spacing opens, existing quote groups move slightly, new headings fade in. Clearly label Candidate throughout. Changes are not committed by animation. User edits/selection stop preview movement. Fast result skips waiting animation; failed/canceled/unknown result does not show a fabricated organized state. Leave animation cancels view work, not blindly the provider job.

prefers-reduced-motion: remove movement/blur/auto-scroll, use immediate state change or <=80ms opacity only. Focus/anchor never moves merely because animation ends. No120Hz claim without real reference-device measurement.
