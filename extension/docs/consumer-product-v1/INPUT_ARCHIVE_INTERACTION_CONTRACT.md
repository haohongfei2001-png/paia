# Input Archive — interaction contract

> Execution update: the owner's later explicit seven-lane instruction selects
> IAH-1.1 runtime development. It supersedes earlier documentation-only /
> NOT_SELECTED / exclusion statements in this adoption record, not the confirmed
> minimal design. See [current execution](SEVEN_PLAN_EXECUTION_2026-10-08.md).
> Implementation, tests, exact-main acceptance and user availability remain
> separate claims; none is established by this authorization.


**IAH-1.1 / 2026-10-08 / selected minimal optimization adopted; runtime not started by this task.** [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) owns the selected/rejected ledger; [UX](INPUT_ARCHIVE_HOME_UX.md) owns presentation; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns bounded delivery; [REFERENCES](INPUT_ARCHIVE_HOME_REFERENCES.md) owns evidence. This revises IAH-1.0 in place without changing canonical content schema or authorization.

## IAH-01. Four logical states, one owner, no forced new page

The existing AppShell/navigation/history coordinator owns the route. DOM selection, mounted bodies, recent-record fields and the host tab are not independent state authorities. Keep all four states; logical state need not correspond to a newly designed screen.

| State | Entry | Content selection | Search and Main |
|---|---|---|---|
| ARCHIVE_HOME | Ordinary open or primary-nav 档案; neutral safe fallback | No selected Source/Project/Conversation/Input | Archive scope all, query empty; middle-column search/tree; blank Main |
| BROWSE_SCOPE | A distinct explicit scope operation, a valid supported scope route, or restoration of that scoped context | No selected Conversation/Input | Archive scope recorded explicitly; empty query; existing tree and blank Main, not a Project welcome page |
| SEARCH_RESULTS | Nonempty committed Archive query or explicit search-scope change/restored search | Selected-result reference may be remembered; no Reader body selected | Query and scope in the existing Archive field; Input-first results in Main, no extra global field there |
| CONVERSATION_READER | Explicit Conversation, Input result, supported content route or separately qualified contextual action | Requested stable documentId and optional Input | Existing continuous Reader and local Reader Find; desktop middle-column Archive Search remains available with its own scope/query |

Project disclosure changes only tree expansion/extent/scroll/focus. It MUST NOT automatically change archiveState, Archive search scope/query, selected content, Main presentation or a browser-history step. An expanded Project is not a selected search scope. In particular, ordinary browsing in ARCHIVE_HOME remains possible without creating BROWSE_SCOPE.

A Reader opened from an unscoped Project tree can have originKind=project-browse while its saved return route is ARCHIVE_HOME plus the exact tree snapshot. 返回项目浏览 restores that snapshot; it does not manufacture a scoped search or require a new Browse page. When an explicit scoped route actually existed, restore BROWSE_SCOPE. Origin label, tree browse context, Archive search scope and Reader provenance are separate metadata.

Loading/empty/incomplete/error/stale/save-blocked are subordinate states. A failed Reader load never displays an old Conversation body beneath a new title. An unavailable target is not permission to select another Conversation.

## IAH-02. Fresh entry and preservation of work

OPEN_ARCHIVE and PRIMARY_ARCHIVE request ARCHIVE_HOME(all, empty query, no selected Source/Project/Conversation/Input/result, no active match/reveal or old Reader title/time/body). Do not resolve last-read/recent/current-host content to populate it. Main is intentionally blank; no Home heading, search block, P1/P3 hint, recents, feed, recommendations or statistics.

Pass the existing EditorSession leave/composition/save/recovery guard before committing a transition. Save failure retains the current page and text with recovery actions. Resetting view selection never deletes Source/Working text/history/preferences/saved reading positions. Within a live tab, neutral tree expansion/scroll can survive primary entry but cannot restrict search. A new view follows the existing collapsed-group convention.

A meaningful primary navigation can record the old state for explicit browser Back. Repeating PRIMARY_ARCHIVE while already neutral is idempotent and does not flood history. Explicit Reader reload is not fresh primary entry.

## IAH-03. Back, history and actual origin

**Back restores context; primary navigation opens neutral Archive.** Preserve the current Back location, styling and normal document flow. No sticky/floating return row or fixed header is required or adopted.

| Reader origin/action | Existing Back label and real target |
|---|---|
| Input activated from Archive results | 返回搜索结果 -> saved query, scope, deterministic results/window, viewport-relative result anchor and focus |
| Conversation activated from Project tree | 返回项目浏览 -> saved tree expansion/extent/scroll/focus and its actual prior route/search state; no inferred search scope |
| No internal origin / neutral Archive entry | 返回档案 -> neutral Archive |
| Explicit contextual Back from another PAIA space | Recorded Reader and applicable reading/local-Find anchor; primary 档案 still goes neutral |
| Browser Back/Forward | Actual history entries, including previous Reader siblings, not a fabricated parent path |
| Reload of an explicit supported Reader route | Same valid target/anchor; do not choose the latest Conversation |

Record typed originKind, return route/session key, scope, result identity and tree/reading anchors. Origin is not an arbitrary external URL. A sibling Conversation opened directly from the tree gets a tree-browse origin rather than incorrectly inheriting an unrelated search-hit origin. Native history still records the actual journey.

Reuse an existing valid history entry or reconstruct/replace its validated snapshot; Back must not push endless copies. Query edits replace the current search entry; meaningful content/scope transitions may create one. Disclosure and each keystroke do not. Dialog dismissal follows the existing focus/modal stack. Unavailable/evicted origins fall back to a valid recorded scope or neutral Archive with an honest local notice, not a claim of exact recovery.

Changing labels without restoring actual query/scope/position is not implementation completion. Deep-return convenience may be evaluated later but is not authority to reintroduce sticky UI.

## IAH-04. Route representation and lifetime

Retain ui/archive.html and the existing route/history owner. Legacy view=library means Input Archive; view=archive means Source Records compatibility, not a new interpretation of original data. Use compatible versioned metadata for archiveState, explicit archiveSearchScope/query session, stable document/Input refs, sort/anchor, originKey, resultSessionKey and separate tree browse context/Reader provenance.

The old proposed #archive/... fragment spelling is a historical implementation proposal, not a mandatory URL migration for this minimal scope. Existing same-URL history and internal exact-Input handoffs may satisfy the approved behavior. Support valid existing explicit routes; introducing a new public/deep-link or host-context entry is separately scheduled work, not needed to make a search hit work.

Source reconciliation: the initial 99bb95e worker accepted exact entry URLs. Current main daf1807 also admits strictly validated Topic/Section fragments through topicRootTarget, and the shared Reader coordinator preserves Topic-root slots. Preserve that support and its strict extension identity/origin/path/query/fragment checks; do not revert to the older exact-entry-only behavior or infer that arbitrary Archive fragments are admitted. Any later authorized Archive fragment extension must be qualified with the current sender/route owner. No query, snippet, title, body, secret, permission or arbitrary return URL enters a URL. IDs are validated source-owned references, not parsed titles.

| State data | Owner/lifetime |
|---|---|
| Canonical Source/Working text, revisions, human intent, reading preferences | Existing domain owners, untouched by navigation |
| Validated route refs, discriminant, sort, bounded reading anchor, opaque session key | Existing browser-history projection |
| Private queries, result IDs/revisions/order/cursors/coverage/focus, origin and tree extent | Bounded tab-local ViewSessions/DocumentSearchSessions; qualified trusted extension-session checkpoint only where needed for claimed reload restoration |
| Bodies/snippets | Re-read current domain data; never route/history/checkpoint truth |
| Temporary filter reveal | Narrow Input-ID/route-local set; expires on fresh Archive/unrelated exit; revalidated on explicit return |

No global last-query store, body cache in history, new permanent content database, host-site storage or cloud checkpoint. Preserve current limits; test aggregate bounds, cross-tab isolation, eviction and cleanup. With checkpoint unavailability retain safe live-tab operation and disclose degraded reload restoration. Missing private query state never claims exact restored search. Sync, backup, AI context, telemetry and logs do not transport active query/result/reveal state. Back revalidates current data rather than replaying stale snippets.

## IAH-05. Two distinct search scopes in existing locations

**Desktop Archive Search stays at the middle-column top. Reader Find stays in the Reader.** Preserve current size, style, slots and shared component. Do not enforce an exact-one-field rule across two different scopes and do not add a duplicate global search to Main.

| Context | Archive Search | Reader Find |
|---|---|---|
| Neutral Archive | 搜索全部档案 in middle column | Absent |
| Explicit Source/Project scope | Existing Archive field with visible truthful current-scope wording | Absent |
| Archive results | Same field/query/scope in middle column; results in Main | Absent |
| Reader on desktop | Same Archive field and independently retained Archive scope/query | 在此对话中查找 in existing Reader position; current documentId only |
| Narrow/overlay | One logical Archive field in the existing usable navigation/result surface; no off-screen focusable clone | Current-Conversation field while reading; no squeezed desktop columns |

Use real accessible labels as well as visible scope wording. Where query text replaces the placeholder, preserve the actual scope through existing supported scope presentation/conditional clear control; do not display 搜索全部档案 while silently restricting the query. No new permanently visible scope selector/chip/header row is approved by this correction.

Archive query/scope does not inherit the currently expanded Project or selected Reader. Only a distinct explicit scope operation changes it. Reuse the existing Source overflow selector and actual supported Project-search/clear facilities; a callback or DOM slot without a reachable action is not proof of a shipped Project-scope entry. If a new permanent control is necessary, record that precise unapproved follow-up; do not repurpose Project disclosure.

Changing an explicit search scope preserves the query and stays in SEARCH_RESULTS when nonempty. Clearing returns neutral Archive when scope=all or BROWSE_SCOPE for an explicit narrower scope, with blank Main. Primary 档案 resets both. Scope change must be enforced across the full trusted query, never just mounted results.

Opening Reader from Archive results retains the Archive query for return but does not copy it into Reader Find. Reader Find and its stepping/close use the local session and pre-Find anchor without overwriting the Archive origin. Focusing either field alone does not navigate. Entering a new nonempty committed Archive query while reading is an explicit Archive Find intent: pass the save/IME guard, preserve the Reader return snapshot, then show Archive results. Failed navigation retains text/query safely.

Debounce and cancel stale local requests; IME composition never dispatches a partial committed query or loses caret on re-render. Enter does not auto-open an unselected first result. Keyboard search shortcuts respect field, editor and dialog ownership, including the newer shared selector support for Topic links. No search action calls a remote model or requires an AI tier.

## IAH-06. Input-first search truth and coverage

Use actual eligible current Working Input text; immutable Source text supplies only the still-current unedited working projection. Do not present old edited-away wording as current Input. Source originals/versions remain separately available. No assistant replies, generated summaries, private drafts or invented paraphrases in Find.

Exact Input text/excerpt is primary. Real send time and Source/Project/Conversation path are subordinate. Preserve meaningful negation, qualifiers and conditions in an excerpt; show truncation honestly and make the full Input reachable. Unknown send time remains unknown, never replaced by capture/import/edit time. Title-only matches use honest title-match context, not fabricated body emphasis. Deduplicate by stable Input ID, not wording/title.

Keep the existing deterministic lexical ranking owner. Input-first presentation does not claim body-first ranking or semantic search. Any measured rank defect gets a bounded, versioned correction in that owner with complete-pagination evidence, not a new UI ranking algorithm.

Require generation-aware bounded continuation and deterministic total order. Partial counts are not global totals. Empty intermediate pages with continuation are not no-result. Building/incomplete/unavailable scope is not 没有找到. Results beyond current DOM/collapsed prose remain searchable to a trustworthy end. Revalidate provider-qualified Project refs, moves/renames, visibility and current working revisions before render/activation. Missing scope evidence cannot silently broaden a query.

Basic search/open/clear/sort/scroll/highlight causes zero remote model calls, no AI maintenance event, no summaries, generative reranking or paid retries. This is not a new semantic-retrieval or embedding dependency.

## IAH-07. Search result to exact Input

Carry stable document/Input IDs, known revision, current query/scope generation, original-text-safe match data and origin session key. Re-resolve current eligibility on activation; load the bounded Reader window around the target, expand its visual collapse as needed and scroll to the real occurrence after layout. Merely opening the Conversation top is insufficient. Reuse the existing handoff/highlight/windowing helpers; prove missing behavior before replacing them.

Normalized offsets cannot be applied blindly to original Unicode/UTF-16. Use safe mapping or recompute against current text. Highlight is a lightweight temporary text/range presentation, not inserted editable markup, a body revision, a permanent card, required margin stripe or a Keep/protect write. Preserve IME, selection and applicable reading anchors. Ordinary surrounding eligible user Inputs stay available continuously; missing AI replies/time are never fabricated.

| Target changed since search | Required handling |
|---|---|
| Working text changed, still matches | Read current version and recompute offset; local changed-position notice only when useful |
| Input survives, old phrase no longer matches | Open current Input anchor and explain match changed; no old phrase replay/highlight |
| Conversation/Project renamed or moved | Stable identity wins; display current provenance and revalidate recorded origin scope on Back |
| Smart Filter hid the eligible target | Narrow temporary reveal only |
| Source externally unavailable/deleted, local data lawful | Keep local reading; qualify the separate external action |
| Explicitly removed Input | No reveal bypass; explain unavailable, separate lawful recovery only by deliberate action |
| Purged/tombstoned Input/Source | Never resurrect bytes/snippets from sessions/caches/history or substitute a neighbor as the hit |
| Target/scope/index cannot be resolved | Honest affected-state error and recorded Back; no guessed/global target |

## IAH-08. Temporary filter reveal is not human intent

Ordinary Archive and Conversation Find include smart-filtered Inputs that otherwise remain eligible. Explicit removals, purge fences and access restrictions remain stronger. A quiet existing result/state role can qualify hidden content; no new persistent management surface is approved.

Reveal only the matched Input and bounded necessary otherwise-eligible context in the current navigation session. Never use FILTER_KEEP/FILTER_PROTECT, automatic restore, a global filter-mode toggle or durable show-all to implement viewing. Deliberate editing/Keep retains its separate human-intent semantics. Highlight/focus/scroll are not edits.

Fresh Archive and unrelated Reader navigation discard the exception. Explicit Back can restore only a still-valid origin-bound exception. New removal/purge defeats it immediately. No query, reveal or search-close operation writes canonical content/filter policy.

## IAH-09. Familiar tree behavior and scope safety

Project row remains one native disclosure control: name and arrow perform the same expand/collapse action. No split targets, new selection styling, renamed folder model or Main Browse dashboard. Expansion while reading preserves that Reader; expansion during search preserves query/scope/results. It may checkpoint local expansion with replace semantics, not add a navigation step.

Conversation activation alone chooses its stable content identity and records the exact browse/search origin. Preserve duplicate-title disambiguation, long-name wrapping, source ordering qualification, paged provider/group/Conversation coverage and current Source label weight. A title/membership change never creates a duplicate Conversation.

Unknown membership, confirmed unassigned, last-known relationship, detached work and confirmed source deletion remain distinct. Keep current consumer copy in this selected scope; neither B M6 nor the earlier compulsory 项目待确认 wording is approved here. Temporary evidence loss does not invent a move. External deletion preserves lawful PAIA content. A known-empty group can use existing empty copy only with complete coverage; failure is not emptiness and does not block unrelated readable material.

## IAH-10. Internal return versus original site

Back uses the exact labels/targets in IAH-03, within PAIA and in normal flow. A verified 在 ChatGPT 中打开 or equivalent original-site action is separate and secondary, preferably reusing the existing contextual/overflow location; no permanent toolbar expansion is required. Resolve qualified source-owned origin/path/identity, use existing no-opener protections, and never infer URLs from a title or untrusted return parameter. No automatic external prefetch. An unavailable source link does not block local reading.

Retain safety for valid explicit direct/contextual entries wherever supported. A separately authorized 在 PAIA 中查看此对话 action can resolve a verified already-saved Conversation; missing local data does not enable consent, capture/import history or choose another Conversation. Generic 打开 PAIA remains neutral. Creating a new host-site action or URL protocol is not part of this minimal visual approval.

## IAH-11. Responsive, focus and unchanged reading

Keep the existing PAIA responsive shell and source tree/overlay owners, light/dark semantic tokens and saved reading preferences. Wide stays primary rail | Archive navigator | Main; narrow uses the existing usable single-pane/overlay approach, not three thin columns or a new branded welcome stage. A narrow logical neutral Archive can show search/tree directly; it need not first display a blank standalone Home pane.

Opening/closing the existing navigation overlay preserves underlying route/focus. Moving a logical control for necessary narrow reflow must not duplicate its scope owner or introduce hidden focusable copies. Resizing does not discard queries, change selected content or trigger model work. No automatic software keyboard, unsolicited focus stealing or new sticky Back row. Back restores the initiating result/row when available; precise arrival does not force an editable caret.

Keep title/time/prose width/size/Input spacing, continuous loading, direct editing, recovery/conflict/undo and current sort positions unchanged. Respect reduced motion, text enlargement, keyboard/coarse targets and current accessibility guards. New captures do not yank reading or rebuild active IME. No prototype test or design approval certifies production behavior; PLAN governs actual affected evidence.
