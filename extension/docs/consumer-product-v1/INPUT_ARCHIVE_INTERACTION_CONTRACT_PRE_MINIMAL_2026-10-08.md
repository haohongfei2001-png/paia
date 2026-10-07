# Input Archive — interaction contract

**IAH-1.0 / adopted 2026-10-08 / implementation planned.** Adoption and supersession: [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md). Presentation: [UX](INPUT_ARCHIVE_HOME_UX.md). Engineering: [PLAN](INPUT_ARCHIVE_HOME_PLAN.md). Source/evidence: [REFERENCES](INPUT_ARCHIVE_HOME_REFERENCES.md).

MUST/MUST NOT are product requirements, not claims about current runtime. This contract changes no canonical content schema or authorization model.

## IAH-01. Invariants and one state owner

The existing AppShell/navigation/history coordinator owns the route. Archive controllers consume that route; they must not infer product state from mounted DOM, selected-row classes, the active host tab, a recent-record field or whether Main happens to be empty.

Four states are exhaustive for ordinary Archive work:

| State | Entry | Active scope/query | Selected content | Main and exit |
|---|---|---|---|---|
| ARCHIVE_HOME | Ordinary Archive open; primary-nav Archive; explicit return Home; safe invalid-route fallback | all; empty | no Source/Project selection; no Conversation/Input | Neutral Find Home. Search -> SEARCH_RESULTS; select scope -> BROWSE_SCOPE; explicit content target -> Reader |
| BROWSE_SCOPE | Deliberate Source/Project/group label selection; valid scope link; narrow Browse action | all/Source/Project/typed group; empty | scope selected, never an inferred Conversation/Input | Scope heading, one scoped Find field and Conversation navigation. Search -> Results; Conversation -> Reader; Back -> recorded previous scope/Home |
| SEARCH_RESULTS | First nonempty non-composing query from Home/Browse; explicit search-scope change; restored results session | all/Source/Project/typed group; nonempty | no Reader content selection; selected-result reference may be retained | Input-first results with coverage. Result -> Reader; clear -> neutral Home or Browse for current scope; Back -> recorded pre-search context |
| CONVERSATION_READER | Explicit Conversation, result Input, valid content link or deliberate contextual action | active Find scope is this Conversation; separate local Reader-Find query | requested/resolved stable documentId and optional target Input | Existing continuous editable Reader. Main Back -> recorded origin; primary Archive -> Home; another explicit content selection -> Reader |

Loading, empty, incomplete, unavailable, stale and save-blocked are subordinate states. A Reader load failure must not leave the previous Conversation body beneath a new title. A syntactically valid but unavailable target may remain as a Reader error state with its requested reference; it is not permission to select another Conversation.

The active search scope and Reader provenance path are different. In Reader, Source/Project breadcrumbs describe current verified provenance; they must not silently change Conversation Find or overwrite the recorded result-origin scope.

## IAH-02. Fresh entry and preservation of work

`OPEN_ARCHIVE` and `PRIMARY_ARCHIVE` target ARCHIVE_HOME with scope=all, query='', selected Source/Project/Conversation/Input=null, no selected result, no active highlight/reveal and no Reader title/time/body. No request to resolve the last-read or recent-captured Conversation is made to choose Home content. An active ChatGPT tab is irrelevant to this action.

First pass the existing EditorSession leave/IME/save/recovery guard. On failure, remain at the current document with its text and actionable failure; do not reset the route and then lose the editor. Home reset clears active view selection, not stored Source, Working Input, history, user preferences or reading-position records.

Within an open tab, tree expansion/scroll may remain as neutral geometry. It cannot imply a selected Project or restricted search scope. A genuinely new view session starts with the existing collapsed-group convention. Empty Home is not a loading placeholder.

A primary click from another state records that state's valid return snapshot before entering Home. Clicking Home again is idempotent and must not fill browser history with duplicates. Browser Back from that Home may restore the earlier Reader because Back is an explicit return action; this does not weaken the fresh-entry rule.

## IAH-03. Back, history and origin ownership

**Back restores context; primary navigation opens Home.** Time elapsed and a vague same-session heuristic never decide between them.

Record a typed origin/return reference when leaving Search/Browse/Home or entering another PAIA space. It includes the owning history-entry/session key, state, scope and identity-relative focus/viewport references. It is not an arbitrary external return URL.

| Action/path | Required target |
|---|---|
| Search Results -> Input -> Reader -> PAIA Back | Same results session, query, scope, deterministic order, result-window/scroll and focused result, after current eligibility revalidation |
| Browse Project -> Conversation -> Reader -> PAIA Back | The recorded Project Browse state, tree expansion/list extent/scroll/focus; no first/latest Conversation opened |
| Reader -> Thought/Settings -> explicit contextual Back, or native history Back | That recorded Reader with its actual anchor, local Find state and appropriate transient view state |
| Anywhere -> primary-nav Archive | Fresh ARCHIVE_HOME, not any of the preceding contexts |
| Direct content link/contextual entry without a PAIA origin | PAIA Back -> ARCHIVE_HOME; an explicitly supplied valid internal origin may be used instead |
| Reload of an explicit Reader route | Restore that same target/anchor if available; never interpret reload as PRIMARY_ARCHIVE |
| Browser Back/Forward | Traverse the actual recorded history entry, not the current primary-nav default |

Switching between Conversation siblings may retain their common Browse/Search parent for the Reader's labeled parent-return action. Native browser Back still traverses the actual prior Reader. The label must describe the recorded target; a generic browser-back command must not be disguised as a Project-parent action.

Use an existing history entry when it exists; otherwise reconstruct/replace from its validated snapshot. Do not implement Back by repeatedly pushing new copies that create return loops. Query edits replace the current search entry; first entering Search, deliberate scope changes and explicit content selection create meaningful navigation entries, not an entry per keystroke. Modal dismissal follows the existing dialog stack before page-level Back.

If an origin was evicted, corrupted or is no longer eligible, disclose the loss locally and fall back to its valid neutral scope or Home. Do not claim exact restoration when it was impossible. Deleted targets never resurrect from a cached result.

## IAH-04. Route representation and state lifetime

The physical application remains `ui/archive.html`, using the one AppShell route/history owner. The future versioned Archive route discriminant is independent of content/database schema. Existing legacy `view='library'` is the Input Archive space; legacy `view='archive'` is Source Records and must not be accidentally reinterpreted as a new user space.

Logical route fields:

- `archiveState`: one of the four states;
- `scope`: typed all, source(providerKey), project(providerKey, namespace, projectId), group(providerKey, groupKind), or conversation(documentId) for Reader Find;
- `documentId`, optional `inputId`, revision-qualified anchor, and Reader sort;
- `originKey`, `searchSessionKey`, navigation-entry identity;
- separate active Reader provenance path and selected Browse scope; no title-based identity.

Readable URL contract for future direct links: a validated fragment on the same application entry, with shapes `#archive/home`, `#archive/browse/<opaque-or-encoded-scope-ref>`, `#archive/results/<opaque-tab-session-key>`, `#archive/read/<encoded-document-ref>` and an optional encoded Input reference within the fragment. These are planned route representations, not existing supported links. Never put query text, snippets, user titles, bodies, credentials, arbitrary external URLs or permissions in a URL. Titles are resolved from the current source owner, never parsed as IDs. A result-session link is local context, not a sharing product.

URL parsing and worker sender admission must be qualified together: current service-worker `isExtensionPage` accepts exact entry URLs. Do not merely add a fragment and accidentally break all requests, and do not fix it by admitting arbitrary extension/host origins or paths. Implement one strict canonical entry/fragment validator or a proven safe normalization path, with negative caller tests. The actual representation must preserve the above behavior and disclosure limits.

| State data | Lifetime and persistence |
|---|---|
| Source/Working Input/versions, manual intent and existing reading preferences | Existing canonical owners; unchanged by navigation |
| Safe route refs, current state, sort, bounded anchor and opaque session keys | Existing versioned browser-history projection; validate on reload, direct entry and Back |
| Private query, result-window IDs/revisions/order/cursors/coverage, result focus/anchor, origin snapshots, loaded tree extent | Bounded tab-scoped ViewSessions, with a reload-surviving trusted extension-session checkpoint for this metadata; not a new permanent database/body store |
| Resolved bodies and result excerpts | Read from current canonical owners; not saved into route/history/checkpoint snapshots |
| Temporary Smart Filter reveal | Reader/navigation-local ID allowlist; revalidate on restore, discard on fresh Home or normal route exit; never a durable Keep |
| Global last-used product space or an old Reader anchor | Not an authority to override PRIMARY_ARCHIVE |

Reuse existing bounded ViewSessions/DocumentSearchSessions and the trusted extension-session boundary. Checkpoints must be keyed to the actual tab/view session, not a single global last-query record; a new ordinary Archive tab cannot inherit them. Preserve existing field limits and validate aggregate bounds, eviction and cleanup in implementation. If checkpoint storage is unavailable, retain safe live-tab memory, disclose degraded reload restoration, and do not fall back to cloud/host-site storage or unbounded local persistence. Full restoration claims require the checkpoint tests.

Back restores metadata and re-queries the same real data generation/window where still valid; it never treats old snippets as current truth. Revisions/deletions may require recomputation. Preserve the surviving target's viewport-relative position rather than relying only on stale pixel scrollTop. Navigation/query/reveal/checkpoint state is excluded from Browser-Native Sync, backups, AI context, logs and analytics.

## IAH-05. One visible search and explicit scope

A single active ScopeSearch presentation is mounted in Main. Home uses its primary large form; Results/Browse use the compact scoped header; Reader uses the Conversation header. Never show a duplicate navigator content-search input, including hidden-but-focusable duplicates. Distinct query services may remain behind this one component; there is no need to conflate their data responsibilities.

| Surface | Visible field | Accessible scope |
|---|---|---|
| Home | 搜索我以前说过的内容 | 全部档案 |
| Source Browse/Results | 在 ChatGPT 中搜索, with actual provider label | Source ID |
| Project Browse/Results | 在 <当前项目名称> 中搜索 | Provider-qualified Project ID |
| Reader | 在此对话中查找 | Current documentId only |

Scope uses a heading plus a lightweight label/choice, not an advanced filter console. `全部档案` means unrestricted local eligible Archive scope, not a recent-Input feed. No selected Source is equivalent to default all, not unknown-source membership.

Two actions are deliberately different. Clicking a Source/Project **Browse label** requests BROWSE_SCOPE, parks any previous Search session for Back, and has no active query or selected Conversation. Changing the **search scope label** while searching preserves the query and stays SEARCH_RESULTS. This provides query broadening/narrowing without making a Project click secretly select content. Choosing all within Search keeps the query; primary-nav Archive clears it.

Reader Find is a local substate of CONVERSATION_READER. Its result stepping stays within that Conversation and does not replace the recorded Archive Search origin. Opening Reader from an Archive hit carries a temporary match anchor/highlight but does not silently copy the global query into the editable Reader-Find field. An explicit `搜索全部档案` action may transfer an actively entered Reader-Find query to SEARCH_RESULTS after the save guard; passive scope changes may not do so.

Typing a nonempty committed query initiates local search with debounce/cancellation. IME composition must not dispatch a partial committed query. First nonempty query enters Results; clearing returns the neutral current-scope Find state. Empty query never triggers a full-Input listing or model request. Enter never auto-opens an unselected first hit; keyboard focus/selection and activation must be explicit.

## IAH-06. Search truth, results and coverage

Search the actual eligible current Working Input text (original source text only where it is still the working projection), including all text beyond mounted DOM and ordinary visual collapses. Do not silently search old edited-away revisions as if they were current Inputs. Source originals and versions remain available through their separate existing actions. AI replies, generated summaries, private drafts and future semantic paraphrase search are outside v1 Find.

Input text/excerpt is the primary result; real send time, Source and Project/Conversation path are subordinate. A title-only match remains an actual Input result with honest title-match context, not a fabricated body match. Deduplicate by stable Input identity, not wording or Conversation title. Repeated identical Inputs in different positions remain distinct attributable records.

V1 keeps the current deterministic lexical query/rank owner as the baseline; this adoption does not silently replace it with a new scoring algorithm. Input-first **presentation** is mandatory. Evaluation must check that real body matches are practically reachable despite title matches; any necessary local ranking correction is bounded within HOME-02, versioned and tested across complete pagination, not bolted into one UI page. Do not claim body-first ranking from the existing title-first helper or semantic recall from normalization.

Results have a deterministic total order and a generation-aware continuation. Store selected result and viewport-relative anchor. Revalidate eligibility before render and activation. A partial page count is not a global total. Empty intermediate pages with continuation mean progress; building/unavailable/incomplete coverage is not `没有找到`. No-result is valid only after the requested scope reaches a trustworthy end. Long lists must remain reachable with bounded continuation, not a hidden total limit.

All/Source/Project/group scope must be applied in the trusted query owner, not by filtering only the currently mounted results. Preserve provider+namespace+Project identity and revalidate moves/renames. Missing Project evidence cannot silently broaden a scoped query to all or certify an empty Project. No search query, rerank, summary, answer, refresh, background prefetch or navigation calls Qwen or any remote model. No AI quota or entitlement gate may block ordinary local Find.

## IAH-07. Search result to exact Input

A result hands off stable documentId/Input ID, known revision, match information using original-text-safe offsets, current scope/generation and an origin session key. The trusted owner re-resolves identity and eligibility at activation. Load the bounded Reader window around that Input, expand its visual collapse as needed, then scroll to the actual occurrence after layout. Never open the Conversation top and call the task complete.

Offsets from normalized text cannot be used blindly against original UTF-16 text. Reuse grapheme/Unicode-safe helpers or an explicit normalization-to-original map. Temporary highlight uses a non-editing presentation layer; it must not mutate contenteditable text, create a revision, mark dirty, generate Keep or interrupt IME. It clears when dismissed/left or superseded, not through a new durable body field.

Preserve surrounding real user Inputs for context and enable continuous navigation to the true end. Do not invent missing assistant replies or infer an original timestamp from capture/import time.

| Change since search | Required response |
|---|---|
| Working Input changed but still matches | Re-read current revision, recalculate match/offset; show a quiet changed-position notice when relevant |
| Same Input survives but old phrase no longer matches | Open the current Input anchor; say the matching text changed; do not replay old text/highlight as current |
| Conversation/Project renamed or moved | Stable Input/document identity wins; current provenance displayed; origin Search scope stays recorded and is revalidated on Back |
| Smart Filter hid the target | Temporary narrowly scoped reveal; no Keep/protect/restore write merely from viewing |
| External source unavailable or confirmed deleted, local content still lawfully present | Read local material; qualify/disable external action as appropriate; never equate external deletion with PAIA purge |
| Input explicitly removed from Archive | Do not undo removal or include it through a view exception. Explain unavailability; use the existing explicit recovery destination only when legal |
| Input/Source tombstoned or permanently purged | Never recover bytes/snippets from route/cache/history, or show a neighbor as if it were the hit. Purge-derived cleanup and B-02 remain controlling |
| Document no longer available, index inconsistent or scope cannot be established | Local unavailable state plus recorded Back; no guessed Conversation or global-scope fallback |

## IAH-08. Smart Filter view exception

Ordinary all/Source/Project/Conversation Find includes smart-filtered Inputs that otherwise remain eligible. Their quiet result marker can say `平时已收起`. Existing user exclusions/removals, purges and access restrictions are NOT this category.

Activation may temporarily reveal the matched Input and bounded necessary, otherwise eligible adjacent context. Use an Input-ID/route-local view exception, not a global filter setting and not the existing durable FILTER_KEEP/FILTER_PROTECT path. A genuinely deliberate edit/Keep retains its existing separate human-intent semantics; highlight/focus/scroll are not edits.

Back restores a valid search-origin reveal only within that explicit navigation context. Fresh Archive and unrelated Reader selection discard it. A hidden target becoming removed/purged defeats the exception immediately. Search, temporary reveal and closing search produce no canonical content/filter-policy writes.

## IAH-09. Browse semantics and consumer language

Source/Project labels are explicit scope actions. A separate disclosure affordance controls children only. Project label activation enters BROWSE_SCOPE and ensures its children can be inspected; no first/latest Conversation is selected. Pure expand/collapse does not change route scope or the currently read Conversation. Keep these controls separately accessible without nested interactive elements.

Conversation label activation is explicit content selection. Stable identity, not the title, chooses Reader. Duplicate-title disambiguation is secondary, stable and does not rename either Conversation. A title or membership change does not create a duplicate.

| Actual source state | Ordinary copy | Meaning |
|---|---|---|
| confirmed unassigned | 未归入项目 | Reliable evidence says no Project |
| unknown membership with no reliable attribution | 项目待确认 | PAIA cannot currently establish the Project; no user resolution task or deadline is implied |
| temporary new evidence loss with a prior reliable relationship | Keep last reliable placement; expose qualification on demand | Do not fabricate an unassigned move |
| confirmed source deletion | 来源已删除, only in relevant context | Existing PAIA material is retained under its own rules |
| detached working document | 独立整理 | Not a claim about provider Project membership |

Do not merge unknown/unassigned into `其他对话`, synthesize catch-all Projects or use source errors to demand a management workflow. Detail copy for unknown: `暂时无法确认这些对话所属的项目，已保存内容不受影响。` These states remain separately typed in routes and queries. Typed groups are source-view partitions, not Personal Topics or a new Project entity.

Empty known Project: show `此项目中还没有已保存的对话` only with complete applicable coverage. Partial/unavailable source metadata gets a local qualified state instead. Source and group loading failures do not erase a readable local Reader or fabricate account-wide coverage.

## IAH-10. Original site versus PAIA navigation

Primary Reader Back is origin-aware: `返回搜索结果`, the actual Project name/return Browse label, or `返回档案首页` for unparented direct entry. It stays inside PAIA.

`在 ChatGPT 中打开` is a separate secondary action for a provider-qualified original Conversation URL. Resolve the URL from trusted source/provider ownership, validate the current supported origin/path/identity, and open only on user activation. Do not construct unsupported URLs from a displayed title, arbitrary pasted URL or untrusted return parameter. Use the existing safe external-open/no-opener policy; it cannot replace Main or consume the internal Back state. An unavailable link does not block local reading. No automatic external request/prefetch is needed.

A deliberate contextual action `在 PAIA 中查看此对话` carries verified current provider/Conversation identity through the trusted extension boundary and looks up the already-saved local Conversation. It may enter Reader directly. If no local Conversation is available, show an honest not-saved/unavailable state; do not silently capture history, turn on consent, import, create a Conversation or choose another one. Only the separately qualified provider action is enabled. Ordinary popup `打开 PAIA` continues to Home regardless of host context.

## IAH-11. Responsive, focus and continuity

Wide: Primary Nav | Browse/Scope | Main. Medium: retain usable reading width with compact primary navigation and a narrower or overlay Browse surface; no forced three-column minimum. Narrow: one content pane and push navigation Home -> Browse/Search -> Reader. Opening/closing an overlay preserves the underlying route; selecting a scope/content uses the same explicit actions. Return restores scope/list/query position instead of a new empty list.

Desktop fresh explicit Find entry can focus the primary search after the leave guard. Narrow/coarse entry focuses the Home heading/container without opening a software keyboard; tapping search activates it. Never steal focus on refresh, back restoration or source updates. Result activation positions a non-editing reading target, not an involuntary caret edit. Back restores the initiating result/row when available. Keyboard shortcuts respect IME, text editing and dialog ownership.

Use current PAIA light/dark/selection/focus/metadata/typography roles and saved reading preferences. No independent Archive theme, model styling or per-Input card chrome. Live additions never yank the reader or reflow active composition; applicable existing save/conflict/recovery/undo and continuous-reader invariants remain mandatory.
