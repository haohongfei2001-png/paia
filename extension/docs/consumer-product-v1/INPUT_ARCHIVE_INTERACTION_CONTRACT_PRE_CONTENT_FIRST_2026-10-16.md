# Input Archive — interaction contract IAH-1.3

**OWNER_APPROVED / 2026-10-13.** [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) and [shared UX §§3/4](UX_CONTRACT.md) apply the latest source-selector/reading corrections. [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) remains the implementation plan; STATUS schedules execution.

The entire previous contract is retained in [PRE_REFINEMENT](INPUT_ARCHIVE_INTERACTION_CONTRACT_PRE_REFINEMENT_2026-10-13.md), exact blob `1aeafeb5631af6d96ee50a5a0ce1c908a23b58e8`. All nonconflicting IAH-01–12 and incorporated prior state/lifetime/target/failure matrices remain normative. The finite changes below replace old all-source-on-primary/reset semantics and simultaneous-provider presentation; they do not replace the underlying owner system.

## IAH-01. Existing four logical states

ARCHIVE_HOME remains neutral/no selected content with blank Main. With a selected Source or Project, the existing BROWSE_SCOPE can represent that empty-query context; this is not a fifth state or new page. SEARCH_RESULTS represents an explicit nonempty Archive query with its actual all/source/project scope. CONVERSATION_READER opens only an explicit stable Conversation/Input/qualified handoff and retains independent local Find.

Provider/source selection belongs to the same current route/view/query owner, not a second UI or account store. Current Source identity and query scope must be consistent. Project disclosure changes only tree expansion/extent/scroll/focus and creates no scope/content/history transition.

## IAH-02. Neutral entry and source selection

Primary/generic Archive entry clears query, Project, selected Conversation/Input and old Reader body/title/match/reveal. It retains a valid current-source choice within the existing bounded view lifetime; the old blanket reset-to-all requirement is superseded. A fresh view uses actual existing source initialization, choosing one locally browsable source where available, never a fixture, recent Conversation, host tab or credential lookup. Empty/unknown/unavailable source is honest, not a guessed replacement.

Repeated neutral entry is idempotent. Declining capture does not prevent entering Archive. Existing collapsed-group conventions remain; no first Project/Conversation is automatically expanded/opened merely because the source is selected. Explicit reload/Back/history is not neutral primary entry. Preserve all existing editor leave/save/IME/recovery guards and valid reading preferences.

## IAH-03. Source switch, Back and origin

The current-source name and disclosure glyph activate one menu. Selecting another actual Source is an explicit scope transition: guard edits, preserve the query, clear incompatible Project/Conversation selection and transient reveal, update navigator/scope/label together, and cancel old result/continuation generations. Show scoped results when query is nonempty, otherwise blank Main. Do not silently replace content while a save/IME guard blocks the change; keep the previous acknowledged source/value and draft.

The menu offers deliberate 全部来源 search. That broadening does not force all source trees to expand. Primary navigation does not silently broaden a retained Source. Clearing Project restriction returns to that Source; clearing query leaves the explicit Source/Project browsing context; choosing all is separate. No hidden alternate scope remains behind the visible source name.

Record Source/all/Project context with the existing query/tree/result/Reader origin snapshot. Normal-flow Back restores actual prior scope, query, result window/identity-relative position and focus or prior tree expansion/extent/scroll. Native Back/Forward includes meaningful source changes, not every keystroke/menu focus/disclosure. No push loops or saved body replay. Preserve the full prior source/result/tree/no-origin/sibling/cross-space/eviction matrix. A stale/unavailable source must not silently broaden or fabricate exact restoration.

## IAH-04. Representation and lifetime unchanged

Use current AppShell/RouteHistory/ViewSessions/DocumentSearchSessions, qualified source IDs and bounded session checkpoint policy. No new public fragment grammar, persisted global favourite-source/last-query corpus, private body in URL/history, external return URL or cloud query checkpoint. Bind the real inner scroller to the existing anchor owner. Keep strict callers and existing NIB-to-Archive all/source/project query handoffs and Topic/Section targets; an explicit all-source handoff remains all, not forcibly narrowed by a default source selector.

## IAH-05. Two independent search scopes

Archive Search is in the navigator and follows the explicit selector/project scope across the whole trusted query, indexes, results and continuation. Its visible/accessibility label reflects the actual Source or All even when query text replaces the placeholder. Reader Find remains current-Conversation-only and keeps its own query/session/pre-Find anchor. Opening an Archive result does not copy its query into Reader Find.

Project name/arrow only disclose; an actual separate low-frequency Project search can narrow within the current source. Focus alone changes nothing. Debounce/cancel stale queries; committed IME only; Enter does not open an unselected result. No off-screen duplicate mobile field, model work, AI tier or network dependency. Use the same source selector in the narrow navigator and restore focus on dismissal.

## IAH-06. Search truth, coverage and time unchanged

Retain the full prior current-Working-versus-original, exact excerpt, title-only, original-safe Unicode/negation/condition, stable Input dedupe and deterministic rank rules. Preserve full eligible coverage, bounded continuation, honest unknown/partial/error/no-result and source-qualified identity. A failed selected source is not an instruction to search others. All-source results retain true source attribution. Smart-filtered-but-eligible inputs remain findable; removed/purged data remain excluded.

Keep actual send-time precision/timezone/provenance and stable source chronology. No capture/import/edit/current-time substitution. Thought metadata simplification does not remove real Archive time. Unknown date/time remains distinct and does not drop or move data to a fake day.

## IAH-07. Precise landing and Reader Find unchanged

Resolve document/Input/current revision/query generation/eligibility and recompute original-text-safe occurrence through the existing bounded reader before highlighting. Preserve the complete changed/moved/hidden/removed/purged/unavailable-target matrix. Exact arrival is not the Conversation top or a stale snippet under a new title. Highlight does not alter editable text or grant Keep. Reader Find steps beyond mounted windows and closing it restores the proper reading anchor independently of Archive origin.

## IAH-08. Temporary reveal, Keep and recovery unchanged

Retain route-local eligible filtered-target reveal, separate deliberate Keep/protect, scoped Working removal, lawful recovery and guarded undo. Source switching/neutral entry discards unrelated reveals; explicit Back revalidates before restoring them. Permission/deletion/tombstone fences defeat current UI caches, layers and late requests. No duplicate body, broadened permission, automatic restore or change to source existence.

## IAH-09. One-source tree, original identity

The ordinary view shows one chosen Source's Project/Conversation tree. Other source names are menu choices, not mandatory simultaneously expanded groups. The explicit All choice is for broader navigation/search and never a reason for automatic expanded trees. Keep current provider-qualified IDs, real source order, long/duplicate names, source membership distinctions, complete paging and readable lawful local data. A platform with imported qualified content need not imply live capture support; express actual capability honestly. Unknown/unassigned/last-known/deleted states are not merged for aesthetics.

## IAH-10. Original source and history unchanged

Retain the exact source/current distinction and on-demand source/history drawer, meaningful real version metadata, explicit safe historical-version replacement, real source-time facts, copy eligibility/full text/newlines and verified separate original-site actions. No permanent fourth column, stale purged-source replay, inferred source URL, bulk export or data/permission change from inspection. Contextual risk disclosure remains despite reduced ordinary explanation text.

## IAH-11. Responsive presentation and ordinary text rhythm

Use [UX](INPUT_ARCHIVE_HOME_UX.md) and shared UX §3. Correct combined line-height/paragraph margin/blank-block presentation so ordinary wrapped lines and paragraphs of one Input stay connected. Start around 27–29px leading at 17px ordinary prose, scaling with actual saved preferences. Separate different Inputs with a larger gap without making each a card. Preserve deliberate blank lines, verse, code and list semantics; this is not text cleanup.

Maintain one narrow navigator/Reader/overlay lifecycle, 320px reflow, 200% text, dark/theme preferences, reduced motion, accessible controls/targets and focus. Source switching and resize preserve guarded work. No sticky Back, unsolicited keyboard or independent mobile scope store. Reflow/sort/date jumps retain qualified identity-relative anchors.

## IAH-12. Existing editor and acceptance boundary

Keep canonical Working/Source bindings, EditorSession, durable ACK, revision/CAS, edit history, current B-01/B-02 and human intent. No raw body newline removal or replacement of the editor/parser to match CSS. Resting display, active editor, original/history display and clipboard/serialization must agree on the same unchanged text. Protect caret/selection/IME/drafts, failure/retry and cross-tab revisions through every source/query/sort/navigation transition.

Test source-selection atomicity, all/source/project restoration and stale-response rejection, plus compact single-Input text in the actual production Reader. All prior data/privacy/full-read/migration/physical-device/service evidence obligations remain. Original snapshots are reference history, not the new runtime; this documentation starts no provider, capture, cloud, payment, installation or release operation.
