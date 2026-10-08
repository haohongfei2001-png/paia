# Input Archive Home — final UX specification

**IAH-1.0 / adopted 2026-10-08.** Behavior is owned by [INTERACTION CONTRACT](INPUT_ARCHIVE_INTERACTION_CONTRACT.md); this file does not create another state machine. [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation. This is a documentation freeze, not production visual acceptance.

## U1. Composition and exact Home content

Use the existing PAIA primary navigation, brand, shared serif heading, restrained blue selection, quiet navy text, low-border surfaces and saved reading preferences. Keep the existing three primary product spaces and low-frequency Settings placement. Do not add global Home/Search/Recents/account destinations.

Wide Main, in its normal content alignment rather than a full-screen search overlay:

```text
查找你的输入

搜索你以前说过的话、关键词或主题

[ 搜索我以前说过的内容                         ]

你也可以从左侧按项目或对话浏览
```

The last line becomes `也可以按项目或对话浏览` with an explicit Browse action on narrow layouts. The visible search field has a real accessible label; placeholder text is not its only label. All-archive scope is the default, with no automatic Source/Project selection. Main contains no Conversation title, year, ordering control or previous body before content selection.

**No Recently viewed, common-search suggestions, search recommendations, default recent Inputs, statistics, feed or empty decorative cards.** Do not add a new history/recency collector to populate Home. The large unused part of Main is intentional, not space to fill.

Home's emphasis is one task. The shared shell may retain low-frequency overflow for existing history import. Do not turn supported import/restore into an always-visible administration toolbar or revive export, backup-generation, sharing, membership/model or diagnostics controls.

## U2. Search owner and presentation by state

The only active content-search component lives in Main in every state. No second-column content-search input exists, including in a Browse overlay. Home renders the primary form; Results and Browse render its compact form with a scope heading/label; Reader renders it as current-Conversation Find. Existing separate query/session owners can be adapted behind this one presentation. Preserve the same input/caret during Home-to-Results typing where possible; never remount it in the middle of IME composition.

Scope is `全部档案`, actual Source, actual Project, or current Conversation. A small scope chooser provides only meaningful current/parent/all changes. Existing explicit date refinements may remain low-frequency if supported, but a complex filter panel is not a v1 dependency. No extra include-smart-filtered opt-in is needed for ordinary Find under the strengthened contract.

A Project Browse label and the Search scope chooser have distinct intent: Browse label opens a neutral scope with no active query; search-scope change keeps the query in Results. The previous query remains recoverable through Back, not invisibly active beneath a Browse heading.

## U3. Search Results

Main has a contextual return, scope label, the compact search field and continuous Input-first results. Each hit uses an exact readable excerpt as its main text, not a big Conversation heading. Necessary real send time, Source and Project/Conversation location are visually subordinate. Unknown send time stays explicitly unknown; never substitute capture/import/edit time.

A hit may occupy several lines, retaining meaningful negation/qualifiers around the match. Use a Unicode-safe bounded excerpt and an explicit indication when content continues. Excerpts are not AI summaries. Do not wrap every result in a raised card, thumbnail, avatar, colored tile or extra action toolbar. Hover is flat and restrained; focus is visible and independent from the selected result.

The result link opens the real Input. Text selection must not accidentally activate its container. Where a larger click area assists pointing, preserve native link/keyboard semantics and avoid nested controls. A title-only match is visibly honest about its location match; it does not highlight unrelated body text.

Search status distinguishes loading, partial, error and actual no-result. Show a complete total only when supplied with complete coverage; otherwise state the loaded matches/continuation. A still-building index cannot produce a confident no-result screen. Local retry preserves query/scope and old usable results but marks stale results before activation.

No-result text: `没有找到匹配的输入。` A subdued actionable hint may suggest changing the actual query or explicitly expanding scope. This is error/retrieval guidance, not generated common-search recommendations. Clearing the field restores the current neutral Find scope without inserting a feed.

## U4. Browse Scope and the second column

Wide second column continues to show Source -> Project -> Conversation. It is a browsing/scope surface, not a database inspector or file manager. Source labels are quiet but readable and actionable; Projects carry the clearest group label; Conversation text has one modest indentation level. Avoid connector lines, repeated folder glyphs, source logo galleries, counters and nested-card surfaces.

Separate Project disclosure from Project label activation. Disclosure rotates one small arrow and changes only expansion. Label activation selects the scope, enters BROWSE_SCOPE and exposes its Conversation choices without opening any. A scope-selected Project uses restrained scope emphasis; a Reader-selected Conversation uses the existing selected-row treatment. Do not paint both as competing selected content.

Main in Browse shows the actual Source/Project heading, one scoped search field and a restrained instruction to choose a Conversation. In wide view the Conversation list has one presentation owner in the navigator; do not duplicate the entire list in Main. In narrow push Browse, that same logical list is presented in the current pane. Loading extents, identity and selection remain owned by the same query/controller even when placement changes.

Long labels wrap to a readable small number of lines rather than being rewritten. Full title must remain accessible by focus/detail as well as hover; no hover-only identity. Duplicate-title disambiguators remain stable secondary labels, never identifiers injected into stored titles. Row spacing follows current shared controls, with effective narrow/coarse targets of at least the existing 44px role. Expansion does not jump scroll or cancel a current edit.

Confirmed unassigned is `未归入项目`; insufficient evidence is `项目待确认`, with on-demand explanation that saved content is unaffected and no user action is required. The latter is not an approval inbox. Retain reliable last-known placement through temporary evidence loss. Source deletion, detached work and incomplete index remain separate qualified states. No source-membership state is mapped into a Personal Topic.

Known-empty Project gets quiet empty copy only after complete query coverage. A missing source/failed page gets local retry and retains other available groups; no forced dashboard or repair workflow. Source and Project lists, not just child Conversations, must reach their real available end.

## U5. Reader integration, not a Reader redesign

Keep the actual continuous editable document, current Conversation title, quiet real time/year context, one ascending/descending control, shared reading size/width preferences and contextual overflow. No per-Input card, reply reconstruction, material tray or permanent copy/source/version buttons is added.

Header responsibilities are distinct:

| Control | Meaning |
|---|---|
| `返回搜索结果` | Restore recorded Search state |
| Actual Project return label | Restore recorded Browse state |
| `返回档案首页` | Safe internal return for an unparented direct entry |
| `在 ChatGPT 中打开` | Secondary, explicit external action using verified source identity |
| `在此对话中查找` | The only content-search field while Reader is active |

Result entry lands at the actual Input occurrence after its window is available. Use a restrained temporary text/range or Input emphasis, not a durable blue card around every expression. Preserve the original paragraph/editing surface. Highlight disappearance must not change scroll or cause a save. A short `已定位到这条输入` notice may announce the jump without implying editing or Keep.

Reader-Find results/stepping are a local substate. Closing Reader Find restores the pre-Find reading anchor. Main Back still returns to the external-to-Reader origin Search/Browse. An explicit scope-broadening action is separate from passive input focus.

A modified hit opens its actual current revision with an honest changed-match notice. A removed/purged hit shows unavailability and return, never an old snippet presented as current. External-source unavailability does not make lawful local content disappear. Smart-filtered targets use only temporary reveal and may have a quiet `平时已收起，本次临时显示` notice; no automatic Keep.

## U6. State and failure inventory

| Scenario | Visible behavior and preservation |
|---|---|
| Fresh Home | Minimal Find content; no selected content; zero model activity |
| Search typing | Same field/caret; no partial-IME query; no first-hit auto-open |
| Search results | Input-first excerpts; clear scope; truthful coverage; bounded continuation |
| Search loading | Keep useful current result context; late old-query results ignored |
| No result | Only after complete valid search; change-query/expand-scope guidance |
| Source/Project selected | BROWSE_SCOPE; no Conversation body |
| Project search | Results only inside selected qualified scope; all-scope expansion explicit |
| Conversation selected | Continuous Reader; correct origin label |
| Exact Input deep link | Correct bounded window, original-safe match offset and temporary highlight |
| Back to results | Same query/scope/order/result position/focus, with current content validation |
| Back to Browse | Same scope/expansion/list position; no default child selected |
| Contextual view | Direct intended saved Conversation; not the generic-open default |
| Empty local archive | Honest empty-source state plus existing explicit history-completion entry; no demo Inputs or fake Projects |
| Offline | Local Home/Find/Browse/Reader remain usable; external source action may be unavailable |
| Source/index unavailable | Local qualified error; preserve unaffected content and existing recovery behavior |
| Smart-filtered hit | Discoverable; temporary reveal; no Keep/protection mutation from viewing |
| Removed/purged target | Unavailable without resurrection; lawful existing recovery only by separate action |
| Long list/deep result | Continuous bounded pages to the end; stable identity-relative return |
| Save/conflict/IME guard | Preserve active text; navigation waits or fails safely with retry/reconcile |
| Reloaded explicit Reader | Same valid route/anchor; no global last-Reader selection heuristic |
| Narrow/dark/text enlargement | Same semantics with one content pane and shared accessible roles |

There is intentionally no Home-with-recent-history state in v1.

## U7. Responsive and accessible behavior

Wide begins with the current PAIA three-column composition. Use actual remaining reading width rather than a fixed screen-width assumption. Medium compresses the primary rail and, when needed, moves Browse into an overlay; the active Main content/search stays readable. Narrow uses Home -> Browse/Search -> Reader push navigation. Home does not start with a full-height tree above the Find task. No three thin columns and no duplicated Main/navigator result list.

An overlay retains its initiating focus and route; Escape closes it before page navigation. Selecting a scope or Conversation performs the same typed action used on wide desktop. Resizing does not change selected content, discard query, invoke another search or alter external permissions. Reflow tests include 320 CSS-pixel equivalent width, text enlargement and long mixed-language titles.

Use the current keyboard/focus system and skip-to-main behavior. Search shortcuts must not intercept IME composition, native editor commands or a modal's controls. Narrow Home must not summon the software keyboard automatically. Result focus and Back restore must be visible without forcing an editable caret. Loading and precise-hit notices use quiet status announcements, not repeated per-keystroke speech.

Dark mode reuses existing canvas/control/selection/focus/search-match/muted-text roles. Check field boundaries, selected Project versus Conversation, excerpt matches and metadata contrast in both themes; do not build an Archive-specific palette. Honor reduced motion and avoid blur/glow/animated re-ranking.

## U8. Reference precedence and acceptance

The latest written IAH-1.0 decisions override conflicting details in the prior poster and mock images, including same-session primary-nav resume, suggestions and any recently-viewed block. The existing private desktop Home/Search/Reader and narrow Home references supply composition only where compatible; prototype chrome/scenario controls, sample bodies and fixture counts are not production requirements.

No new bitmap, exact pixel comparison, current production render, live-device journey or accessibility result is generated by this adoption. The final implementation must compare actual source/release surfaces against the compatible references and this change list. Existing shared typography and the user's saved prose choices take precedence over incidental illustration metrics. Missing required visual evidence blocks its final visual claim, not independent route/query engineering or a reason to invent another design.
