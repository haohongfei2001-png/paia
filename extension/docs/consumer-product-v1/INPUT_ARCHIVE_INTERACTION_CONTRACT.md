# Input Archive — current interaction contract

**IAH-1.2 / OWNER_APPROVED / 2026-10-13.** [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) owns the finite replacement ledger; [UX](INPUT_ARCHIVE_HOME_UX.md) defines the approved new visual composition; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation; [REFERENCES](INPUT_ARCHIVE_HOME_REFERENCES.md) identifies the exact prototype.

The preceding contract is preserved byte-for-byte as [PRE_UI](INPUT_ARCHIVE_INTERACTION_CONTRACT_PRE_UI_2026-10-13.md), Git blob `b224662b5097ce4933858211abb2de7a2d89bed7`. **All its nonconflicting detailed requirements remain normative.** Only old presentation/coordinate locks are replaced by ADOPTION §2 and the new UX. This revision preserves the same canonical content, identity, scope and authorization model. Historical authorization/NOT_STARTED text is not the current schedule; STATUS remains controlling.

## IAH-01. Four logical states and one owner

| State | Entry and meaning | Presentation |
|---|---|---|
| ARCHIVE_HOME | Ordinary/primary Archive: all scope, empty query, no Source/Project/Conversation/Input selection | Existing three-role shell in new style; heading/search/tree in the middle; unselected Main blank |
| BROWSE_SCOPE | A distinct explicit Source/Project scope action or actual restoration of one, with empty query | Same tree and blank Main, with truthful conditional scope indication; no Project welcome page |
| SEARCH_RESULTS | Nonempty committed Archive query, explicit scope change or restored results | Same middle query owner; flat Input-first results in Main |
| CONVERSATION_READER | Explicit Conversation/Input result or already supported qualified handoff | New continuous Reader and independent current-Conversation Find; desktop Archive Search remains available |

Reuse the current AppShell/navigation/history coordinator. Source of truth is never selected DOM, mounted bodies, a title, recency, host tab or the prototype's JavaScript route object. Project disclosure changes only expansion/extent/scroll/focus; it cannot change scope/query/route/content or add a history step. Tree-browse origin can restore ARCHIVE_HOME plus its tree snapshot without manufacturing BROWSE_SCOPE. Loading, empty data, partial index, error, stale target and save-blocked remain distinct subordinate states.

## IAH-02. Fresh entry and work preservation

Primary 档案 and generic OPEN_ARCHIVE request all-scope neutral Archive with no prior Reader text/title/time/match/reveal. Do not resume a latest/last/host Conversation. Repeating neutral entry is idempotent. Explicit Reader reload and browser Back/Forward are not fresh primary entry.

Pass existing EditorSession composition/save/leave/recovery guards before a transition that could discard work. Failed save retains the page, text, caret and recovery actions. Resetting view selection never deletes canonical content, source history, preferences or saved reading positions. Neutral tree expansion may survive within its qualified lifetime but must not constrain search. Existing collapsed-group defaults remain; the prototype's pre-expanded example is not a new product default.

The new navigator title does not revoke the blank-Main decision. An actually empty archive may show an honest compact navigator empty state and the existing capture/settings entry; an error must not be concealed as normal blank Main.

## IAH-03. Back restores the actual origin

Keep normal document-flow Back, now styled and placed by UX, never sticky or floating. Search-origin returns to saved query, scope, deterministic result window/order, viewport-relative result anchor and focus. Tree-origin returns to its real prior route and expansion/extent/scroll/focus. No recorded internal origin returns neutral Archive. Existing cross-space contextual Back preserves the recorded Reader and applicable reading/Find anchors; primary 档案 remains neutral. Sibling opening creates the correct new browse origin rather than inheriting an unrelated search origin.

Reuse valid history entries or validated reconstructed snapshots without push loops. Query edits replace the current search entry; meaningful content/scope transitions may add one; disclosure and every keystroke do not. Preserve native Back/Forward and qualified explicit-route reload. An evicted origin falls back honestly to a valid scope or neutral Archive, not a claim of exact restoration. Merely changing Back labels is not completion.

The original PRE_UI IAH-03 action/target matrix remains in full. The prototype's reduced `origin`/scroll logic is not a replacement for that matrix or current production return owners.

## IAH-04. Representation, lifetime and supported entries

Retain archive.html and current route/history/session owners, including legacy view=library Archive and view=archive Source compatibility. No new public URL grammar is required by the mock's `#conversation/...` links. Preserve strict existing source-owned target validation, current Topic/Section targets and separately approved NIB-to-Archive search/Input handoffs. Do not expand callers/fragments or roll out a new host-site control under visual adoption.

PRE_UI IAH-04's complete lifetime table remains: canonical bodies/revisions/preferences stay with domain owners; history contains only validated references, discriminants and bounded anchors; private queries/result metadata/tree/origin use bounded tab-local sessions and only qualified checkpoints; bodies/snippets are re-read, not stored as route truth. No query/title/body/secret/grant/arbitrary return URL in public URLs. No host storage, global last-query store, second corpus or cloud history checkpoint.

Maintain cross-tab isolation, aggregate limits, eviction and cleanup. Sync, backup, Context and telemetry do not transport active query/result/reveal state. Unavailable checkpoint permits safe live-tab operation with truthful degraded reload restoration. If the final Reader uses an inner scrolling element rather than document scrolling, bind that element to the existing anchor/history owner and test both navigation and viewport changes; do not silently restore window.scrollY into the wrong scroller.

## IAH-05. Independent search and explicit scope

Middle Archive Search covers the actual selected all/Source/Project scope; Reader Find covers only its current Conversation. They have independent queries, cancellation, composition, result/return state and accessible labels. One field for each different scope is correct; no duplicate global field belongs in Main. Opening an Archive result must not seed Reader Find with the Archive query.

The approved Source/Project overflow actions make explicit narrowing reachable. The Project name/arrow remain a single disclosure control; the separate menu is not a split name-versus-arrow action. Narrowing preserves the query, operates through the trusted query owner and shows a truthful conditional scope/clear indicator even when query text hides the placeholder. Clearing that scope preserves the query and searches all; clearing the query retains a deliberate narrower BROWSE_SCOPE; primary Archive resets both. No permanent scope matrix or guessed title-based scope.

Focus alone does not navigate. A newly committed Archive query while reading is an explicit search intent: guard/save and preserve the Reader snapshot before displaying results. Debounce/cancel stale local requests; IME must not dispatch an unfinished query or lose its caret. Enter cannot auto-open an unselected first result. Keyboard shortcuts respect field/editor/dialog ownership. Narrow results may expose a button that returns focus to the same Archive query owner; it is not an off-screen duplicate search input. Search requires no model call, AI tier, generation job or network service.

## IAH-06. Search truth, full coverage and reliable time

Search displays current eligible Working Input text, with source originals separately available. Unedited working projection can use valid Source text; old edited-away wording cannot be advertised as current. No AI replies, generated summaries, private unsaved drafts or fabricated paraphrases. Input text is primary; genuine source/Project/Conversation path and send time are secondary. Title-only matches are labeled as such and never fabricate body emphasis. Preserve conditions/negation, Unicode-safe excerpt boundaries and full-Input access; deduplicate by stable Input identity, not wording.

Reuse existing deterministic lexical ranking and generation-aware bounded continuation. Do not copy the mock's corpus loop, ordering, result counts or 12-result limit as production algorithms. Unmounted/collapsed data remain searchable to a trustworthy end. Partial counts are not totals; empty intermediate pages with continuation are not no-result; building/incomplete/unavailable scope is not absence. Revalidate current provider-qualified scope, identity, revision and eligibility at render/activation.

Time facts retain their actual precision, timezone and provenance. Never replace unknown send date/time with capture, import, file-modified, edit or current time. A known date with unknown clock time can retain that date honestly; a fully unknown date is not grouped under a neighboring known day. The prototype's `time ? date : unknown` shortcut is not the production precision model. Date range/header/group labels must describe qualified current content, including explicit incompleteness. Preserve the existing qualified chronological/source-order policy, stable tie order and all unknown-time Inputs; no invented chronology or date arithmetic changes are authorized.

## IAH-07. Result to exact Input and real surrounding content

Resolve actual document/Input, current revision, query/scope generation and original-safe occurrence before landing. Load through the existing bounded Reader around the target; do not just open the Conversation top. Recompute normalized offsets against original Unicode/UTF-16 safely. Apply a temporary range/highlight presentation, never editable markup/body revision or durable selection. Keep otherwise eligible surrounding user Inputs readable, with neither assistant text nor missing time invented.

Preserve the entire PRE_UI changed-target matrix: changed-but-matching text gets recomputed offsets; changed-away match may open current Input with honest notice, not old text replay; rename/move follows stable identity; smart-hidden eligible text gets a narrow temporary reveal; unavailable original site does not erase lawful local reading; explicit removal/purge wins; unresolved target reports an affected error without substituting a neighbor. Do not display an old body under a new title.

Ordinary hit highlighting stays lightweight; useful exceptional-state notices may be dismissible. No permanent arrival stripe/banner is required. Reader Find stepping reaches real occurrences beyond mounted pages and close restores the pre-Find anchor while preserving Archive origin. Highlighting/focus does not place an editing caret unless the user explicitly edits.

## IAH-08. Temporary reveal, Keep, removal and undo

Archive/Conversation Find includes smart-filtered Inputs that otherwise remain eligible. Reveal only the matched Input and bounded lawful context in the route; search, clear, highlight and scroll never call FILTER_KEEP/FILTER_PROTECT, restore data, toggle global filter policy or create durable show-all. Fresh/unrelated navigation discards the exception; explicit Back may restore it only after revalidation. Removal/purge defeats cached snippets, sessions, highlights, source/history drawers and pending outputs.

An explicit existing 查看过滤内容 action is distinct from automatic reveal and remains local view state. Explicit 保留 retains current human-intent semantics through its owner. Existing removal/restore/undo remain scoped Working operations: state the actual effects, preserve immutable Source where it exists and do not delete the original platform. Never interpret the prototype's removed/kept arrays or undo timeout as production policy, lift a tombstone, revive late purged text or overwrite newer human work.

## IAH-09. Tree identity and continuity

Preserve the Source/Project/Conversation structure, stable IDs, provider qualification, full-name wrapping, duplicate-title disambiguation, current source ordering guarantees, paged coverage and tree focus/scroll. The approved new row/selection/indent styling does not create a new source truth store, infer Projects from names or rename/reorganize the user's source structure.

Unknown membership, confirmed unassigned, last-known relationship, detached work and source deletion stay distinct. The mock's fixed 未分组 and provider names are fixtures, not a mandated rename or collapse of states. Known-empty requires complete coverage. A failed group does not block unrelated content; transient source evidence loss does not invent a move. Expanding during Reader/Search preserves the content/query/scope. Current source-state wording and older rejected M6 copy are not otherwise changed.

## IAH-10. Original source, history and external opening

Original-source inspection is an on-demand dismissible drawer over the existing reader, not a permanent fourth column. Resolve source-owned evidence and distinguish initial source text from current Working text, time, provenance and actual attachment-coverage facts. Show 已修改 · 原文保留 only when modification and retained source are verified. Missing/purged source cannot be replaced with a stale cache or reconstructed from current text. The prototype's prefilled original objects are not source evidence.

Edit history uses the existing qualified revision owner. Explicit use of an earlier Working version creates the permitted new revision with current conflict/deletion guards; it never rewrites immutable Source or the external platform. The sample's recent-12 history limit is not a new retention policy. Copy current/original text only on explicit action, retaining exact paragraphs/newlines and excluding UI labels/highlights; no clipboard read, bulk export product or automatic sending. Clipboard failure offers safe manual selection of eligible current text, with honest success/failure.

Original-site opening stays a separate secondary verified action. Use source-owned identity/URL and existing no-opener restrictions, not title interpolation, arbitrary return URLs or automatic prefetch. Unavailable link does not block local reading. Capture/settings/help entries reuse existing workflows; the mock's explanatory dialogs do not replace real capture, import/recovery or consent capabilities. No new provider permission is implied.

## IAH-11. Responsive, appearance, dates and focus

Use the existing shell/navigation/overlay/preferences owners for the approved wide three-role layout and narrow directory-or-reader composition. Opening/closing the same navigator preserves route/scroll/focus; hidden controls must not remain keyboard reachable. Resizing cannot clear queries, select new content or trigger AI. Do not create a second mobile query/state owner or squeeze three columns together. Preserve relevant tree, dialog and overlay focus behavior, no unsolicited software-keyboard opening and no sticky Back.

Reading appearance uses actual saved font/width/theme choices and existing fallback policy. The sample's 17px/680px setting, numeric limits and width options are not new global defaults. Actual date navigation is a small current-Conversation aid over qualified dates, not a calendar product or whole-corpus scan. A literal 15-Input threshold in the demo is not a product constant. Date jumps, sorting and appearance changes preserve current identity-relative position, selection, draft and IME through the existing reader.

Respect reduced motion, contrast, 200% text and 320-CSS-pixel reflow, native headings/control semantics, keyboard order and applicable 32px desktop/44px coarse effective targets. Enlarge incidental small mock controls as necessary without altering the approved composition. New captures must not yank reading or rebuild an active editor. Reference screenshots do not certify these behaviors.

## IAH-12. Direct Working editing and safe integration

Adopt visually inline editing but reuse the current editor technology, canonical Working owner, revision/CAS, durable acknowledgement, existing source bindings, human protection and recovery. The mock's plaintext contenteditable, serializer, localStorage and whole-object persistence are demonstrations, not a replacement editor/database. Enter adds a paragraph, not Send. Preserve exact line breaks, code/mixed scripts, caret, selection and composition; search highlights never enter saved text or clipboard payload.

A save failure retains draft and safe retry/copy; Saved follows actual durable acknowledgement. Do not discard a draft to change query, source drawer, sort, theme, route or navigator. Do not infer guaranteed tab-close/crash recovery from a session-only mock. Cross-tab changes revalidate revisions rather than last-write-wins overwrite. Working edits and restoration follow the current explicit B-01/B-02 and related domain contracts, neither cancelling authorized bindings nor granting new reverse writes.

All nonconflicting PRE_UI state, lifetime, safety, search and recovery details remain. Existing low-frequency actions not implemented by the sample are not cancelled. Local read/search/edit is independent of unavailable AI; this adoption authorizes no real capture, cloud, account, payment, migration, installation or release action. PLAN defines how changed presentation earns actual source/release acceptance.
