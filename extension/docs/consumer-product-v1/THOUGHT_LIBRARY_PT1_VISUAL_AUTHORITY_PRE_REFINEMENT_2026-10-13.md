# Thought Library PT-1.0 — approved final UI

**Current presentation contract: TL-PT1-UI-1.1. OWNER_APPROVED, 2026-10-13.**

The owner approved the final interactive Thought Library prototype and requested that PAIA's existing development plan end in this UI. This replaces the conflicting TL-PT1-UI-1.0 presentation requirements **in the same authority path**. It is not a second design, a new product programme, or a request to finish the superseded UI first.

[TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md) remains the sole PT-1.0 identity/formation/ownership contract. [TOPIC_ARCHITECTURE_PLAN.md](TOPIC_ARCHITECTURE_PLAN.md) remains the implementation plan, within existing TOPIC-05. [STATUS.md](STATUS.md) retains execution scheduling. [References](THOUGHT_LIBRARY_PT1_VISUAL_REFERENCES.md) bind the exact approved artifacts and their limitations.

This task changes documentation/design references only. It neither implements the production UI nor changes the existing runtime authorization, selected batch, seven-lane programme, release certification, paid-service availability or installed extension. Existing non-UI capabilities and current safety owners remain.

## V1. Approved reference and finite scope

The approved source is `PAIA_思想库_交互原型.html` and its final Home, Reader and sparse-content screenshots. **The two earlier generated dashboard pictures are not approved references.** Neither the first dark-sidebar dashboard nor the second statistics/quick-note/recent-items dashboard may be implemented under this approval.

The intended combination is the PAIA website's restrained blue-white translucency and the other project's immediately readable topic contents. Do not copy the website's marketing composition or the other project's ChatGPT/browser shell. Preserve PAIA's three primary spaces: 档案 / 思想库 / 用于 AI, with Settings secondary. Do not introduce a fourth AI Context destination, browser tabs, ChatGPT navigation, account space, statistics, promotional hero, decorative illustrations, quick-note dashboard or permanent AI upsell column.

The change is Thought-specific. Archive IAH-1.1, Context Cards v2, Settings, Narrow Input Board v4, Sync and AI usage retain their existing goals. The prototype's PAIA wordmark is not authorization to replace the product logo or redesign other pages. Adapt the existing shell, not a second shell/router.

The previous full contract is preserved byte-for-byte in [the pre-UI baseline](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY_PRE_UI_2026-10-13.md), Git blob `24a915b81f586d4138ed2f2da3654a005a644fa3`. Its **nonconflicting product/data/editor/permission/recovery requirements remain normative**. V9 below exhaustively identifies the presentation replacements. Historical execution pointers and adoption-time NOT_STARTED statements never overwrite current STATUS.

## V2. Home — contents-bearing topic cards

Home has a modest Thought Library heading/subtitle, one Thought-scoped search, a compact topic/order toolbar and the cards themselves. Content begins near the heading, not below a large banner. Cards show, in order:

1. Topic name and a restrained line icon, with contextual overflow.
2. A bounded directory of real named Sections in their actual order. Each chapter is directly actionable. A quiet connecting rule may establish the directory hierarchy; it is not a recursive folder tree. Actual counts may be secondary, never invented.
3. When eligible material exists, one short exact excerpt from a real current readable Entry, with a subtle separator. A generated summary, rewritten maxim or invented source is not an acceptable replacement.
4. Quiet actual chapter/update metadata where known, and an unobtrusive open-Topic action.

The Topic title opens the Topic; a Section link opens that same Topic at its actual Section. The preview must resolve to its actual Entry/Section using existing identities and eligibility. A contextual menu must not make the entire card intercept selection or its child actions. Native link/button semantics and keyboard access take priority over copying incidental prototype DOM markup.

**Card height follows meaningful content.** Do not restore the present large mostly empty rectangles. No forced equal-height rows, fixed tall minimum, invented chapter names, filler quotations or placeholder paragraphs. A Topic containing only a stable untitled default Section remains valid. Show the actual title and any real description/eligible excerpt compactly; do not invent General/Default/Uncategorized headings. An explicitly human-created empty named Section is preserved and reachable.

The approved wide-desktop starting composition has **three columns**, not a compulsory four-column wall. Columns follow available workspace width, with two and then one on narrower layouts. Use deterministic column assignment/ordered stacking, real gutters and independent rounded boundaries. Different heights are approved; random packing or importance-based resizing is not. The six example Topics are fixtures, not a product taxonomy or required population.

Root preview capacity remains bounded, initially three to five real Section lines as appropriate to the available space, with accessible continuation for more. This is a presentation limit, never a domain cap. Long titles/Section labels remain available without renaming stored text. Retain bounded query/loading for 30/50/100/144 Topic scenarios and the real eligible end.

### V2.1 Order, updates and restoration

The approved controls are 最近更新 and 我的顺序. Derive recency from valid existing topic modification evidence, not an invented activity collector or capture time pretending to be expression time. Rendering, opening a card, search and AI-view toggles do not themselves update content timestamps. Unknown metadata stays unknown or is omitted honestly.

Preserve durable human order and stable identity through existing owners; selecting recency is not rewriting human placement. Restoring Home restores the chosen order, query, focused target and identity-relative viewport. Do not reshuffle under a click, editor, selection or active restoration. Coalesce background layout changes through the existing view/session lifecycle.

The old requirement for permanent spatial slots and blank holes after removal is superseded. Ordinary content-sized flow may close gaps after a committed removal, with safe anchor restoration and undo; it must not lose an identity, human order or deletion fence. Reuse existing persistence/read models wherever valid, rather than replacing data storage to obtain this layout.

## V3. Search — same scope, result view when needed

Home search covers all eligible Topic names, named Section names and Entry text, including unmounted or unpreviewed material. Reader search covers the current Topic only. Their labels distinguish scope; do not add a competing global search.

The prototype's compact result list **inside the same Thought workspace** is approved. A result can show its Topic/Section path, an exact bounded match excerpt and a verified target. It is a temporary view state, not another Library, destination, result database, or permanent sidebar. The old requirement to keep all results in the unchanged grid is superseded.

Preserve original-safe text/Unicode offsets, full search coverage, current eligibility and bounded existing retrieval. No model call, AI job, quota or Archive fallback is introduced. Incomplete coverage is not an empty result. Typing must not yank scroll. Opening a match reaches its actual Section/Entry; clear, Back/Forward and return restore the prior view/order/query/focus/anchor. Stale/deleted targets fail safely without resurrecting content. Support the current keyboard shortcut and visible focus.

## V4. Reader — chapter directory and continuous prose

Entering a Topic replaces the card grid with a reading composition: quiet return/breadcrumb and current-Topic search above, **a compact chapter table of contents on the left and continuous prose on the right**. The directory can remain in view while reading on a sufficiently wide screen. It contains only this Topic's real Sections; it is not a second global navigation tree or management panel.

Use a readable bounded prose measure. Topic title and description introduce the document. Named Sections become natural headings; the untitled default Section has no manufactured heading. Empty manually named Sections remain available for writing. Original paragraphs, full text, code and mixed scripts remain readable to the real eligible end. Do not regress to Section cards, Entry bubbles, timeline panels, page-number dead ends or a permanent sources column.

At narrow widths, collapse the directory to the approved lightweight chapter selector. Do not squeeze navigation + directory + prose into unreadable columns. Long content may be windowed only through the existing safe reader: preserve active editor, IME, selection, dirty draft and Entry/revision/text-offset anchor. Keep saved reading size/width preferences; prototype defaults do not erase personal settings.

Each Entry has a quiet source affordance and contextual actions. Restrained separators from the approved prototype are permitted where they improve reading; avoid heavy boxed rows and repeated provider chrome. Actual expression time remains attributable and unknown time stays unknown. The prototype's illustrative update words are not permission to fabricate production dates.

A source action opens a **temporary, dismissible source drawer**. Keep verified original source and current edited body distinguishable. A manually written Entry must be identified honestly as manual writing, not given a fake ChatGPT source. Escape/close restores focus. Existing verified original-site navigation remains separately secondary; a source URL is not authorization.

## V5. Editing, writing and organization — preserve the capabilities

Use the existing canonical Entry/body owner and EditorSession. Editing visible Thought content does not overwrite immutable Source evidence; any Working/Thought binding effect still follows the actual current domain contract and B-01/B-02 decisions. Do not create a new body store or infer a new binding policy from the prototype's separate JavaScript objects/localStorage.

Editing is visually inline. Reuse the existing editor technology and semantics; the prototype textarea is an interaction sketch, not a mandate to replace the production editor. Saved feedback requires durable acknowledgement. Failed saves retain the draft and provide retry/safe copy. Preserve caret, composition, selection, conflict handling and leave guards through view/search/sort changes. Enter adds a paragraph, not Send.

Place 接着写 in the explicit Section. The root-level/manual writing capability and compact header entry remain available where already required; their absence from this narrow prototype is **not cancellation**. They use the same writer. A stale or absent Section context uses the existing lawful default/unassigned route, not guessed scroll state or a fabricated Inbox Topic. Saving never depends on AI classification.

Preserve Topic and Section create/rename/order, Entry copy/move/reorder, placement removal/undo, multi-placement, protected human constraints, safe promotion and existing low-frequency operations. Place them in compact contextual/overflow controls, not a permanent administrator sidebar. The reference is not an exhaustive inventory: Section creation/promotion and other prior capabilities missing from the sample remain planned in their existing owners.

Moves preserve canonical bodies, explicit inclusion/exclusion, source provenance, revisions and other placements. Removal means the stated placement scope; it is not shared-body deletion or permanent Source purge. Explain affected scope for destructive actions and preserve safe undo without bypassing newer edits/tombstones. Promotion retains TOPIC-04 confirmation, location mapping, human order and new-identity-closed permissions. Do not automatically merge or rename the existing user's poorly named Topics merely to make Home look better.

## V6. Original / AI Organize — same document, truthful capability

The compact 原文 / AI 整理 control is approved. The organized view remains within the same Topic/document composition, not a report, separate candidate Library, modal approval workflow or dashboard. A restrained blue-white transition may mark a completed change, with the header and reading anchor preserved. Do not use continuous animated glow or simulate processing/success. Reduced motion is mandatory.

The prototype **does not call AI**. Its repeated text/lead sentence and demo switch are not a real organizer implementation or evidence of semantic quality. Production consumes the existing authorized derivative/projection owner and `AI_ORGANIZE_STYLE_CONTRACT.md`, including all three approved styles and their existing controls. A single sample view must not reduce that scope.

Saved valid projections toggle locally. New generation requires the real authorized service, scope, entitlement and budget under AI_USAGE; this UI approval activates none. When unavailable, explain the actual limitation without disabling ordinary local read/search/edit/write. Keep pending/error/stale/partial coverage honest. No BYO key entry, direct retired transport, automatic paid retry or default background billing.

Durable Topic/Section IDs, protected names/order, placements and canonical bodies remain unchanged by reading toggles. Derivative headings are not new Sections or access targets. Do not silently collapse negation, condition, certainty or emotion. Source references stay inspectable; exact-repeat folding is reversible. Late outputs revalidate revisions, eligibility, permissions and human work. Postpone layout changes during composition/dirty editing; returning to Original restores an Entry-relative anchor.

## V7. Visual implementation reference

The approved light reference uses a near-white blue-tinted canvas, subtly translucent white cards, fine pale-blue borders, restrained shadow, navy text and muted blue hierarchy. It is **not gray dashboard styling, strong rainbow gradients, dark navigation or thick glass effects**. Content is more prominent than decoration.

Measured CSS starting values from the approved HTML, not new design proposals:

| Role | Reference value |
|---|---|
| Main ink / accent / divider | `#20334d` / `#3769c9` / `#dfe8f4` |
| Canvas | `#fbfdff`, with broad restrained `#edf4ff` / `#eff6fd` radial tints |
| Wide navigation width / workspace maximum | `184px` / `1192px` |
| Wide workspace inset / final top inset | `62px` horizontal / `46px` top, before existing responsive overrides |
| Topic grid gap / card radius | `20px` / `18px`; gap becomes `24px` on the widest reference |
| Main title / Topic title | `34px` serif title role / approximately `17px` semibold UI role |
| Directory / excerpt | approximately `13px`, subordinate to Topic title |
| Reader directory / column gap / prose max | `180px` / `49px` / `740px` |
| Reader prose | `15px`, line-height approximately `2.06`; honor saved production preferences |
| Source drawer starting width | `390px`, capped by available width |
| Hover | restrained border/shadow emphasis and at most the reference's `2px` lift; no scaling or layout change |

These are implementation anchors, not requirements to clip content, shrink touch targets or override accessibility. Map them into the actual current semantic roles and bounded Thought-specific styles. Avoid a parallel global token system; do not let late existing CSS override the intended final result. Prefer approved system font roles/fallbacks; no font binaries or unlicensed assets are copied.

Preserve the existing light/dark preference even though the approved prototype demonstrates light mode only. Dark is an accessible translation of these roles, not an approved dark screenshot or another art direction. Preserve native focus/heading/link semantics, 32px desktop and 44px narrow/coarse effective targets where required, 200% text enlargement, 320 CSS px reflow, keyboard/touch alternatives, reduced motion and visible failure states. The prototype alone does not certify these.

## V8. Reference-only elements and production boundaries

Never ship the prototype footer, 完整示例 / 截图标题 / 说明 / 重置 controls, fixture data, public-reference notices, `__paiaDemo`, illustrative counters/time strings, demo AI results or its localStorage model as production architecture. Its simplified history, sorting timestamps, editor and error handling do not replace existing robust services.

Only trustworthy real data populate production cards. Empty/sparse data must be usable and attractive without false chapters, fake quotes or AI-created filler. Test synthetic dense and sparse content as well as the visually complete example. Privacy, source ownership, external access, tombstones, eligibility, revisions and recovery outrank incidental mock implementation details.

## V9. Exact supersession ledger

| TL-PT1-UI-1.0 or lower-level interpretation | TL-PT1-UI-1.1 final requirement |
|---|---|
| Prefer equal-height blocks; no masonry/variable packing; fixed tall footprint | Content-sized independent rounded cards with deterministic ordered column flow; sparse cards compact. No random/importance packing. |
| Four columns as wide-desktop starting point | The approved three-column wide composition, responsive to actual workspace width. |
| No normal excerpt, footer, real count, timestamp or contextual ellipsis | Optional exact eligible excerpt, quiet truthful metadata/open action and contextual overflow as in the approved reference. No statistics dashboard. |
| Near-zero radius; flat hover; no shadow/translation | Fine blue-white rounded/translucent treatment and restrained non-layout-changing hover from V7. |
| Persistent geometric slots and compulsory blank removal holes | Preserve stable identities/human order and safe restoration, but permit normal content flow and gap closure. |
| Search must keep the grid; no separate result rendering | Compact temporary result list within the same scoped workspace; no new navigation destination or database. |
| No persistent Topic/Section directory in Reader | Current-Topic chapter table of contents beside continuous prose; narrow selector; no global tree/admin panel. |
| No Entry separators of any kind | Subtle approved reading separation is allowed; heavy bordered Entry cards/timeline chrome are not. |
| No decorative blur/glow of any kind | Restrained approved blue-white surfaces and brief completed-view transition only; no fake processing, perpetual animation or readability loss. |
| Old visual screenshots/tests imply this target is complete | Historical evidence stays at its original head/scope. New presentation convergence and applicable real interaction tests remain required. |

This finite update also overrides conflicting transcriptions in Master/UX/frozen/history/source tests **only for these presentation clauses**. Nonconflicting functional, search coverage, body ownership, safe editor, human authority, permission, real-time, migration, recovery and service requirements remain. Do not revive Years/Content tabs, candidate management, relationship graphs, recursive taxonomy, exports, backup generation, extra profiles, old Side Panel or rejected website designs.

## V10. Acceptance and routing

Continue the existing TOPIC-05.1–05.8 workstream using the revised Topic plan; do not start TOPIC-01 again or build an eighth queue. Reuse qualified underlying work and fix only demonstrated gaps. Do not first finish the superseded presentation. Other active owners and current STATUS scheduling are unchanged.

Completion requires production Home/Reader/sparse-state screenshots and actual interaction evidence against the approved reference, not merely the word 'cards', matching colors, an uploaded HTML, or passing old UI tests. Update obsolete geometry assertions to the new contract while retaining or strengthening underlying identity/restoration/edit/privacy coverage. Preserve historical PASS/FAIL records; no claim of new runtime, AI quality, installation or final product completion is made by this adoption.
