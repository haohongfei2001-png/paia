# Narrow Input Board v4 — Acceptance and Regression Matrix

Authority: [SPEC](NARROW_INPUT_BOARD_V4_SPEC.md). Execution: [PLAN](NARROW_INPUT_BOARD_V4_PLAN.md).
**All production cases below are NOT_RUN by this documentation task.** This is an executable acceptance contract, not a receipt reporting tests passed. The original synthetic prototype results are separately identified in REFERENCES.

## 1. Test environment and evidence

Use an isolated temporary browser profile, unlogged-in and without personal cookies, credentials, archive, extensions or daily install identity. Use current source and independently built release variants. The original harness may route supported-site requests to synthetic fixtures, while external network is blocked; do not add test host permissions to the production manifest. Use actual extension worker, IndexedDB owners, bound cross-origin frame and existing native editor transactions. Do not replace them with prototype arrays, local tier toggles or textarea assignment when claiming production behavior.

Record OS, browser/channel/version, viewport/visual viewport, DPR and zoom, source/head/tree, release asset identity and exact test variant. Full-browser screenshots/recordings must show the host, top controls, composer and actual floating frame. Component screenshots alone cannot establish non-overlap or native insertion. Native Side Panel is not part of this v4 matrix.

Fixtures include: at least two Archive query pages; short complete inputs; multiline/very long input with final negation, whitespace, numbers, combining characters and emoji; current Working Input differing from its Source; a retained-but-removed source; smart-filtered yet search-eligible Input; unknown source time; edited/independent manual expressions; pinned/split/hidden Family records; two chats, another window and unsupported webpage; live invalidation via real owners rather than CSS hiding. All data are synthetic.

## 2. Geometry, presentation and stable mode — S0

| ID | Action / setup | Required observable result |
|---|---|---|
| G01 | 1680,1280,1024,401,400,390,320 CSS-pixel viewport widths; open candidates/search/check/editor | Width equals `min(width<=400?322:336,width-32)` in every mode, within1 CSS px measurement tolerance; no613/620px expansion |
| G02 | 1,2,5,22 and many candidates; free/Pro/result rows | Default44px one-line rows, stable reserved action region; only ellipsis, not multiple-line titles/summaries; low count compact |
| G03 | Move/resize full top control region and full composer; grow composer continuously | Board stays in measured top-to-composer safe band with12px gaps, grows upward or shortens; never covers controls or switches to a side/below reader |
| G04 | Scroll overflowing22+ rows, focus a lower row, resize composer | Internal list scrolling reaches final result; required controls reachable, focused/result-relative anchor restored; no outer horizontal overflow |
| G05 | Blur, click host whitespace, idle, scroll chat, toggle theme, resize window/composer | Logical mode/query/row order unchanged; geometry only; no provider calls or archive queries caused by layout |
| G06 | Hold candidate refresh, update frequency/new input, release late result while pointer/focus on row | No late reorder/replacement; explicit refresh/open may use new order. Invalid removed row is blocked immediately without exposing stale content |
| G07 | Same-document chat/branch change, background-tab return, true refresh/new document | Same-document view/query survive but old receiving target invalidates; true document replacement resets ephemeral view/tokens only; position/manual intent and browser-session Next permission preserved |
| G08 | 200% text, keyboard, coarse pointer, dark, forced colors, reduced motion/transparency, extremely short safe band | Reachable labeled actions and focus;44px minimum targets where required; no dark/translucency unreadability. Insufficient space is honestly unavailable, not automatic collapse or sidebar launch, and not counted normal usability PASS |

Reference ordinary sizes are capsule272x44, free/pro5rows336x310, search2results336x178, long336x490 and shortened336x294. Heights apply to the supplied reference viewport/content only; production measures intrinsic height instead of hardcoding all six. Preserve material role/font/radii, not prototype sample labels or review controls.

## 3. Shared Archive search and return — S1

| ID | Action / setup | Required observable result |
|---|---|---|
| Q01 | Same nonempty query in board and PAIA, same scope/snapshot; traverse multiple pages | Exact same ordered eligible Input IDs and body revisions, truthful complete/partial fields; Family usefulness does not filter Archive results |
| Q02 | Include smart-filtered Input, removed retained Source, manual override and non-user material | Ordinary eligible filtered Input discoverable; removed/non-user material absent; manual override does not replace a history hit or mutate it |
| Q03 | Type using IME, clear query, submit newer query while prior page is held | No mid-composition query; empty remains SEARCH without full history feed; old continuation cannot overwrite newer result |
| Q04 | More than one result page, intermediate empty page, unavailable index/read | Continue honest progress; distinguish no result from incomplete/read failure; do not claim all data searched from a bounded partial page |
| Q05 | Open check from scrolled result, return; visit menu/consent/recovery then return | Query, scope/order, valid snapshot/continuation, result-relative scroll and focus restored, not just label or list top |
| Q06 | Edit/remove/restore-generation change while query/check is pending | Old snapshot/result/ref rejected and stale body removed; no raw Source/old cache fallback or Keep/protect mutation |
| Q07 | 打开 PAIA from query/current Input with existing dirty PAIA editor | Qualified same-query/Input arrival via original guard; no automatic host inference, private body/query-in-URL, forced reload or unsaved loss |

## 4. Exact copy/fill and receiving-target protection — S1/S4

| ID | Action / setup | Required observable result |
|---|---|---|
| U01 | Complete short row and visibly truncated/multiline row | Short fill uses exact text; truncated text/fill/copy first enters same-width checking; no hidden tail sent before review |
| U02 | Check long body, partial loading, over-limit body | Normal checking text viewport<=150px; whole-body action only after complete resolution; no silent clipping or surrounding conversation added |
| U03 | Select Unicode/cross-paragraph range, focus/click copy/fill control | Exact original continuous range only; focus does not fall back whole; cancel range is explicit; revision mismatch blocks both actions |
| U04 | Empty draft; caret mid-draft; saved caret; selected host draft; no valid caret | Exact insert preserves prefix/suffix/selection text; existing append rule only if caret unavailable; no repeat-confirmation merely because draft exists |
| U05 | Hold prepare; change draft or composer; composition active/unknown | Zero new write, latest draft retained; no append fallback that bypasses conflict, no synthetic compositionend |
| U06 | Change chat/branch/document, discard/close target, switch tabs/windows, unsupported website | Old target fails; no hidden old-tab activation or last-focused-window mistake; explicit rebind alone does not fill |
| U07 | Double activation of one operation, competing Prompt/Next/history fill | At most one effect for operation; existing target writer arbitrates; no automatic queue, replay or double frequency update |
| U08 | Drop post-effect acknowledgement, interrupt worker, reopen board | Show UNKNOWN, preserve pending semantics, no new-op automatic retry or false success; do not destructively restore prior draft |
| U09 | Clipboard denied, source invalidates before copy, manual fallback | No clipboard read; truthful status and exact current manual selection; invalidated content cannot be recovered from old Source/cache |
| U10 | Native rich-text insertion/undo, host DOM/network counters | Expected native edit/readback and supported undo only; zero Send/submit/attachment/network effect; unsent draft/body not logged or persisted by the board |

Use original full composer/Prompt tests as well as new cases. A fallback-copy PASS does not certify the primary fill path. OS Chinese IME/native Undo and actual-site compatibility require separately recorded real evidence; synthetic events cannot supply it.

## 5. Free/Family/manual continuity — S0 guards, S2 completion

| ID | Action / setup | Required observable result |
|---|---|---|
| M01 | Upgrade fixture with pinned/edited/hidden/retained/split/representative/manual records | Same stable identities, bodies, membership intent and manual order; no wipe/recreated library or copied InputID counts |
| M02 | Edit/reorder/create a reuse expression; conflicting revision/save failure | Original Prompt owner/CAS used; latest manual text retained on failure; Source and Archive Working bodies unchanged |
| M03 | Edit from history search hit | Explicit saved reusable expression, history remains current original Working version; no automatic Archive write or fake previous-use provenance |
| M04 | Exercise hide/show, pin/unpin, split, manual deletion and keyboard/drag ordering | All prior lawful functions reachable despite simplified normal rows; deleting template is not deleting source |
| M05 | Repeated capture/view/search, failed/unknown insertion, verified successful Family reuse | Only existing verified successful reuse changes its proper aggregate once; no duplicate events or invented per-Input history |
| M06 | Restart/relevant restore/source invalidation/downgrade | Original manual and restriction semantics retained; no new cloud journal or restored AI/reply grant; no manual work disappears because AI is unavailable |

## 6. Pro historical candidate admission — S3

| ID | Action / setup | Required observable result |
|---|---|---|
| A01 | Fake local Pro flag, absent/expired entitlement, unavailable service or absent processing consent | No model dispatch and no claimed AI result; lawful local frequency/search remain usable |
| A02 | Allowed history/current sent Inputs plus unsent/assistant/hidden-tab/denied canaries | Provider payload contains only explicitly allowed bounded source scope; no broader Stage3A/Context permission reuse |
| A03 | Fabricated/stale/removed IDs, free-form text, reordered protected rows | Reject invalid output; trusted current-text resolution; no historical text generation or manual overwrite |
| A04 | Negation, conditional reply, login/authorization/destructive-confirmation examples | No unsupported affirmative assertion or guessed user intent; abstention instead of unsafe auto-recommendation |
| A05 | Open/scroll/search/resize repeatedly; explicit AI refresh; late result | Zero geometry/open/search-driven generation; one bounded explicitly admitted job; cache and frozen open-list semantics hold |
| A06 | Permission revoke/downgrade/evidence change during provider request | Late result cannot appear or be used; stop delivery promptly; accurate local fallback label |
| A07 | Timeout/unknown charge/quota/offline/provider failure | Existing budget/receipt/unknown outcome rules preserved; no hidden retry or other quota/provider fallback; no duplicate account/entitlement store |
| A08 | Actual admitted membership/provider/consent and preregistered paired usefulness corpus | Real end-to-end and independent usefulness/latency/spend evidence, not fixed-ID fixture PASS. No public Pro qualification if absent or materially inferior |

A01–A07 deterministic passes can establish mechanics only. A08 and real service/privacy/financial activation remain explicit gates. Do not market model quality from syntax/schema checks or 193 standalone prototype assertions.

## 7. Entry replacement — S4

| ID | Old responsibility / scenario | Required replacement |
|---|---|---|
| E01 | Toolbar on supported/unsupported/no-composer page; PAIA already open or absent | Approved toolbar meaning; reuse current-window PAIA without reload/dirty loss, otherwise create; no Side Panel |
| E02 | First capture consent before/after entering PAIA | Existing onboarding, genuine informed confirmation; opening an entry never silently consents or enables Next/Pro |
| E03 | Next enable/cancel/revoke from retained controls, held late suggestion | Same session owner, local new completed reply only; cancel no grant, revoke no resurrection; standalone board mode stable |
| E04 | Pause/resume while Next enabled and manual work exists | Original SET_ENABLED and current backfill explanation; no deletion, no per-page exclusion, no change to independent Next |
| E05 | Storage/query failure, absent orb, stale content script, unknown update | Essential PAIA/Settings/recovery path still reachable; one truthful fault region, no auto-refresh/uninstall/clear; current installation-source version not GitHubmain claim |
| E06 | Settings/permissions/About navigation, malformed target fragment or hostile sender | Existing exact trusted navigation and capability-specific delegation; no universal archive/settings trust for a content frame |
| E07 | Source and release isolated old-Popup/replacement candidates, real browser controls | Each retained old behavior mapped to an actual tested replacement. Same action not falsely expected to fire both popup and onClicked |
| E08 | Final cutover / Pro supplement | Local S0/S1/S2+E01–E07 evidence and owner entry decision precede removing Popup. Real S3 acceptance precedes Pro exposure; missing Pro does not erase local completion |

## 8. Replacement ledger

| Existing Popup item | v4 destination | Retain or remove |
|---|---|---|
| Open PAIA | Toolbar + the board's single explicit 打开 PAIA link in context | Retain actual navigation, avoid duplicate logo entrance |
| First-use explanation/consent | Existing PAIA onboarding, reachable without orb | Retain |
| Next status/configure | Existing PAIA Settings; narrow authenticated board-more delegation only if selected | Retain independent session/revoke behavior |
| Pause/resume | Low-frequency board more and existing PAIA Settings | Retain semantics and backfill explanation |
| Version/check update | Existing About/current-install update owner | Retain low-frequency accurate result |
| Fault recovery | Original truthful guidance reachable in PAIA/board fault context | Retain; do not depend on functioning search |
| Total count/normal page diagnostics/repeated explanatory cards | No new destination | Remove UI clutter, not source mechanisms |

## 9. Closure and evidence classification

For each actual run preserve exact identity, full case results, original failures, measured geometry, screenshot/frame isolation and no-send/no-source-mutation probes. Missing cases are NOT_RUN/NOT_VERIFIED, not skipped-as-PASS. Apply current affected-regression and high-risk full gates without altering timeout, corpus, test placement or safety assertion to obtain green status. New names/proposed files in PLAN are future implementation suggestions; this PR creates no executable test or workflow.

Do not mark S0–S4 complete from this matrix's existence, a screenshot, docs-only CI, or the old prototype report. This turn verifies documentation links/scope/source/reference identity only; no native extension, capture, AI or installed test is executed.
