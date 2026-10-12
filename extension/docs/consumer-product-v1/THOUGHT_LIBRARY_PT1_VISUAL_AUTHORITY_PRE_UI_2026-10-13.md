# Thought Library PT-1.0 — adopted product and visual authority

Decision: **OWNER_APPROVED / ADOPTED**, 2026-10-07. Presentation contract: **TL-PT1-UI-1.0**. The owner approved the reviewed direction and explicitly requested documentation adoption and development-plan integration. This is not another design exploration or authorization to implement in this task.

[TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md) remains the sole normative identity/formation/ownership contract, PT-1.0. This document is the sole current Thought Library presentation and interaction authority. [TOPIC_ARCHITECTURE_PLAN.md](TOPIC_ARCHITECTURE_PLAN.md) owns implementation dependencies and acceptance; [STATUS.md](STATUS.md) alone selects execution. [The reference manifest](THOUGHT_LIBRARY_PT1_VISUAL_REFERENCES.md) identifies the private owner-provided artifacts and their evidence limits.

Approval of this design does not establish runtime implementation, live AI, migration, accessibility compliance, measured usability or production visual acceptance. Those remain future evidence under the existing verification system.

## V1. Product composition and precedence

The only normal organization is `Personal Topic -> Section -> Entry`, within one Thought Library. Root shows independently returnable Personal Topics, not mandatory System Topics or taxonomy parents. A Section is a non-recursive partition within its Topic, not a second Topic, folder, tag or standalone destination. An Entry retains one canonical body owner; placements carry organization, not copies of that body.

The owner's written adoption requirements and PT-1.0 control semantics. The supplied overview controls the reviewed composition where compatible. Existing shared PAIA shell/tokens control common navigation and controls. Incidental illustration details do not authorize extra Home/global Search/account destinations, default counts, a catch-all Topic, new colors or per-Entry quote/timeline chrome. Synthetic labels and dates in a reference are not imported user records. This is a scoped reconciliation of the supplied instructions, not a new design.

Default reading uses the actual durable Section structure. AI Organize changes a reading projection over the same content; it does not create a second library or become the owner of durable organization. User-created/renamed/ordered Sections and membership exclusions remain protected under PT-07. Named Sections arise from justified recurring internal aspects or explicit user action, never a quota for making a block look full.

## V2. Stable Personal Topic Grid

Root consists of the existing PAIA shell, Thought Library heading, one current-scope search, Add Thought and necessary overflow, followed by independent rectangular Topic blocks. It has no empty contextual navigator column, category bar, Recent area, statistics, view switch, root-wide AI organizer or permanent management surface.

A normal block contains **Topic name + a bounded overview of real named Sections in their durable order**. It does not default to an AI summary or expression preview. Section names are plain readable text, subordinate to the Topic name; no chips, capsules, badges, folder icons or recursive indentation. A Section link opens its parent Topic at the Section anchor. The Topic title opens the whole Topic; a Section is not an independent top-level route.

A Topic with only its stable untitled default Section may show its title alone. It is not empty organization or an error. Do not generate a name, explanatory message or placeholder to fill it. Explicitly user-created empty named Sections and human order survive; their existence is not permission to fabricate Entry content. No Default/General/Uncategorized label appears in ordinary Root or reading.

The overview has finite presentation capacity. Start implementation comparison with three to five named Section lines/links, using the existing visual scale; settle the measured capacity in production visual evidence rather than as a domain limit. Long labels wrap without rewriting their stored name. Whole labels that do not fit the preview remain available in the Topic and search. An unobtrusive continuation opens the Topic; it is not a per-block management menu or a Section-count dashboard. Do not auto-rank Sections by recent activity.

### V2.1 Geometry, stability and scale

Use a stable orthogonal grid with real gutters between complete, light, independent block boundaries. Prefer equal block height within a row and a stable footprint over ordinary content updates. No shared continuous table rules, masonry, dynamic packing, random offsets, hover lift or importance-driven resizing. Rectangle/grid/card terminology is not an acceptance test; clear identity, readable structure and predictable operation are.

Column count follows available workspace width, never the number of Topics. The reviewed starting scenarios are four columns on wide desktop, three on compact desktop, two on tablet and one on phone. Apply the current shell's actual remaining width and readable/touch targets; the breakpoint numbers are not product invariants. Thirty, fifty, one hundred and one hundred forty-four Personal Topics use the same scrolling model with a real end. These are scale scenarios, not a catalogue, mandatory population or a maximum Topic count.

Persist or reliably restore identity-based positions through the existing view-state owner. Topic/Section rename, ordinary Entry/Section additions, AI reading toggles and search do not globally reorder or repack Root. New Topics use a suitable unoccupied slot or append; semantic proximity is secondary to existing positions. Removed Topics leave a genuinely blank slot: no border, label, drop target or Add button. Reuse of that slot does not move other identities. Any safe empty-row recovery preserves order and the current identity-relative viewport anchor and does not run during active interaction. Text enlargement and changed responsive widths may require readable reflow; do not promise fixed pixels by clipping essential text. Returning to a previous width restores its stable order/address model.

### V2.2 Entry and interaction

The Topic title and Section anchors must have native link semantics and visible keyboard focus. A broader block click may assist pointing but cannot intercept text selection, a Section link, context action or keyboard operation. Avoid nested interactive containers. Hover stays flat: restrained boundary/title emphasis using shared tokens, no shadow/scale/translation. Focus is distinct and uses PAIA's existing focus role. Tab follows comprehensible visual order and includes visible Section anchors; continuation provides access to the rest.

No picture, thumbnail, illustration, footer, source badge, activity, progress, AI score, recent timestamp, item count or permanent per-block ellipsis is introduced. Block and canvas surfaces remain close; no floating white widgets on a newly gray canvas. Small/near-zero radius is acceptable within shared geometry.

## V3. Scoped search and navigation

Root search covers eligible Personal Topic names, named Section names and Entry bodies, including content not mounted or previewed. Reuse existing lexical retrieval and domain eligibility. Do not claim semantic retrieval merely because the UI searches three kinds of text.

Search preserves the existing grid and Topic order. Section matches emphasize the Topic and matching Section. A match outside the ordinary preview may temporarily occupy an existing preview slot. Entry-only matches may temporarily show an exact, Unicode-safe excerpt with its real target; this is a search state, not the normal block schema. Keep valid content and boundaries legible when reducing nonmatch emphasis. Match focus uses the shared selection/focus language rather than a new Thought color system.

Typing alone does not repeatedly jump the viewport. Explicit first/next/previous actions move to actual matches; activating one opens the same Topic at the Section/Entry and real text offset. Query, focused result, original overview and viewport anchor are local view state. Clearing/closing restores the correct pre-search view. Browser Back/Forward and returning from the reader restore the same Topic's viewport-relative position and focus, not merely a stale scrollTop. Deleted/stale targets resolve safely to an available parent/neighbor with an honest local notice; they never resurrect content.

No separate result directory, competing global search, permanent result sidebar or mini-map is created. Incomplete search coverage is not "no results". Source deletion, visibility and organization permission remain distinct. Lawfully unassigned material retains the access provided by PT-03; it is not converted into a named default Section of an invented catch-all Topic.

## V4. Continuous Topic reader

Entering a Topic removes Root's block geometry. Keep the shared Reader header: return, Topic title, one Topic-scoped search, compact Add Thought, Topic-local AI Organize and necessary overflow. No Content/Years tabs, timeline view, summary sidebar, statistics or persistent Topic/Section tree.

Read the same Topic as a continuous page. Entries in the untitled default Section have no invented heading; named Sections are natural headings within that same reading surface. Preserve human Section order. An empty default Section need not reserve a blank chapter. A manually created empty named Section remains reachable for writing and does not get AI filler. Named headings are clear but subordinate to the overall Topic and do not overwhelm the user's prose.

Entries keep their original paragraph structure and actual length. Distinguish paragraph spacing from pauses between expressions, without cards, bubbles, bordered rows, a divider after every Entry or repeated provider labels. Time remains legible but quiet and attributable to the corresponding expression. Unknown expression time remains unknown; capture/import time cannot masquerade as send time. Source, evidence and versions are available on demand.

Long reading is continuous to the real eligible end. Bounded loading/windowing may implement it without pagination dead ends. Preserve the active editor, IME, selection, dirty draft and reading anchor across loading, search, background additions and navigation. Search reaches unmounted content and opens its real location. Existing saved prose width/size preferences are retained. Chronology is retained in evidence and quiet times; differing words do not by themselves prove a change in belief.

## V5. Editing, Sections and Add Thought

Direct editing uses the existing single EditorSession/body owner, caret and text selection, not a new modal/textarea card or duplicate Topic body. Durable acknowledgement precedes saved feedback. Failed saves retain local text and provide retry/safe copy; concurrent changes preserve drafts and use existing reconciliation. Cross-Entry selection can copy text without serializing UI labels. A structural move never joins or copies bodies merely because the reader is visually continuous.

Section rename/create/reorder and moving an Entry use ordinary contextual controls. Inline rename protects the actual Section identity/name; cancel does not persist a half-composed name. Reorder/move has a non-drag keyboard/touch alternative, records human constraints, and supports safe undo through existing revision rules. Do not show a permanent admin sidebar or handles beside every paragraph. Selecting a text span does not silently move an entire Entry; make the target and scope explicit in the action.

Add Thought within an explicitly active Section continues there. Without reliable Section context it uses the stable default Section. A lightweight destination choice may clarify intent, but saving does not depend on successful AI classification. Root-level writing similarly saves safely without inventing an Inbox Topic. Enter means a paragraph break, not send. Use real first-party creation time/identity; saved writing becomes normal prose. The no-title default region may have a contextual destination description in a move control, not a fabricated durable name in the library.

Distinguish removing a placement from deleting shared visible content and permanently purging Source. Show the actual affected scope for destructive actions; do not copy a body to avoid shared effects. PT-1.0 preserves existing Source/Working Input/Thought body-binding rules and unresolved B-01/B-02. This visual adoption neither settles those gates nor authorizes an implicit reverse write, source overwrite or destructive historical merge. Unambiguous supported edits remain usable; genuinely gated effects stay protected without redesigning the reader or reintroducing a management workflow.

Section-to-Topic promotion is a low-frequency contextual proposal/confirmation under PT-06, not a tree manager. It requires independent identity/value, not volume alone. It creates the approved new identity and moves intended placements without body duplication; preserve old Section/Entry location mapping and human order/negative intent. Do not redirect the entire parent Topic to the promoted child. New Topic access remains closed; no permission union or silent external sharing.

## V6. AI reading over durable Sections

Durable Sections exist with AI Organize OFF and remain the organization authority with it ON. A valid saved projection toggles locally. In the organized reading, related expressions may become adjacent, repetition may be reversibly folded and small reading headings may appear. These headings belong to the derivative projection, not new Section entities, Root overview, default folders or authorization targets.

The reading toggle cannot create, rename, delete or move durable Sections or override human Section/Entry order facts. Justified durable organization uses the separately authorized Organizer and trusted PT-07 commit path. Returning OFF restores ordinary reading around the same Entry. Human edits to a derived heading protect that projection field only; editing an Entry uses its canonical body owner and existing edit gate. No fused editable AI sentence may ambiguously replace several original bodies.

Exact repeats can fold with an ordinary expand action retaining original wording, dates and provenance. Near-repeats containing different negation, certainty, condition, causality or emotional strength are not silently merged. A short Topic may need no extra reading headings. No personality narrative, summary panel, report or forced opportunity/risk/conclusion template is created.

New generation remains unavailable until the real authorized service, entitlement, processing scope and budget exist. Design approval does not revive BYO/direct transport, read-only client writes, background billing or paid retries. Existing saved AI work and lawful legacy candidates retain readability/version protection without candidate approval UI. Internal Topic-formation candidates remain hidden and are not those legacy files.

While processing, keep local content usable. Do not repack active text during IME/selection or unsaved edits. Revalidate Entry/Section/body revisions, source eligibility and permissions before activation; stale results leave current content intact, without automatic paid retry or a new candidate review task. New/unprocessed material remains visible and coverage is honest. Animation explains a completed structural change; preserve header and reading anchor, use reduced motion, and never simulate progress or use decorative blur/glow.

## V7. Shared PAIA visual and accessibility roles

Reuse the current App Shell, primary navigation, icons, title/UI/prose/metadata font roles, spacing scale, focus, search, overflow, destructive language and light/dark tokens. [The shared D6 system](desktop-vnext/d6-final-visual-master/DESIGN_SYSTEM.md) remains a role source, not authority for its superseded ThoughtRow/Years/Candidate composition. Inspect current computed styles at implementation, including later overrides in ui/app-shell.css; do not implement only an earlier declaration or substitute a new font family.

The current shared reference supplies 28/38 main title, 16/29 prose, 12/20 metadata and the existing spacing scale. Root Topic/Section text and block measures must be calibrated at actual target viewport/font against the reviewed composition. Do not infer exact CSS pixels from a reduced multi-screen overview, freeze illustrative counts as domain limits or overwrite saved reading settings. Record final used values in implementation evidence, using shared roles rather than a competing token system.

Phone is a readable single column of Topic names and Section overview, not a chevron folder list. Tablet/desktop use the same identities. Dark mode maps the existing semantic roles; no Topic-specific colors or glowing widget outlines. Preserve shared keyboard focus, accessible names/heading levels, 32px desktop and 44px narrow/coarse effective targets where specified by the current system, text enlargement, 320 CSS px reflow and reduced motion. Existing verification decides compliance; this document claims none.

## V8. Scoped supersession and retained history

| Previous interpretation | Current disposition |
|---|---|
| Compact Topic list, default recency/cue and pre-Section expression-preview blocks | Superseded by V2: stable Personal Topic blocks with named Section overview. Search excerpts remain temporary. |
| B2 shared horizontal/vertical table lines | Superseded by independent block boundaries and true gutters. |
| Pre-Section B+ density/fragment experiments, P/masonry, free field or maps | Historical exploration, not competing visual authority. Grid/card naming is not a rejection criterion. |
| Current/frozen Thought Content/Years, year navigation, evolution/timeline as normal surface | Superseded by V4. Real time/source and explicit longitudinal retrieval remain; no claim that historical coverage can be dropped. |
| Candidate/Compare/Adopt/Keep, approval inbox or separate Original/AI organization directories | Superseded by one library and V6. Legacy saved work and conflict/version comparison remain protected; not a blanket ban on the word comparison. |
| Default AI insight/summary sidebar, Section folders/cards/tabs, recursive taxonomy or System Topic parents | Not current Thought product behavior. |
| D6/D7 Thought-specific frozen journey, TopicRow/YearSection/CandidateChange or acceptance assertions conflicting with V2-V6 | Historical scoped references. Shared visual language and all nonconflicting data/edit/permission/recovery assertions stay. Replace obsolete assertions with current equivalents during implementation. |

This override applies to conflicting current lower-level wording and retained PRODUCT/ARCHITECTURE/ROADMAP, foundation, Organizer, AI Experience, desktop-vnext/FROZEN_CONTRACT and execution-history descriptions only for this Thought presentation scope. It does not rewrite frozen artifacts, erase PASS/FAIL, cancel Archive improvements, redesign approved Context Cards v2, change Prompt Reuse or revive exports/backup generation/old transport. The PT architecture adoption record remains the authority for its earlier semantic supersession.

## V9. Acceptance boundary and implementation routing

Implementation follows the existing TOPIC-01 through TOPIC-06 workstream. TOPIC-05.1 through 05.8 consume this document; their detailed dependencies and tests are specified once in the Topic plan. STATUS remains TOPIC-01 until a later authorized execution update. No second queue or new UI exploration is opened.

Future acceptance must show real Root at 30/50/100/144, no/one/many/long Sections, blank removal slot, Section and Entry search, identity-relative Back/Forward, current-scope writing, contextual rename/reorder/move, safe promotion, long mixed default/named reader, exact same durable Sections across AI OFF/ON, dark/narrow and save/conflict/unknown-time states. Counts refer to actual fixtures and the continuous page, not headings above a handful of placeholders. Use production functions and separately obtained native rendering evidence; static references do not prove navigation, stability, editing or semantic quality.

Missing private reference access is recorded precisely and resolved through the authorized owner source; do not invent an approved 21-screen package or a new layout. Gated live processing and B-01/B-02 effects remain gated. Local read/search/edit and mechanical UI work may proceed after their actual prerequisites without waiting for an unrelated external service. Overall production visual/migration/downstream closure remains TOPIC-06 under VERIFICATION.md.
