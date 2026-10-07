# Input Archive Home — dependency-ordered implementation plan

**IAH-1.0 / 2026-10-08 / all new outcomes PLANNED.** The product direction is frozen by [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md) and [CONTRACT](INPUT_ARCHIVE_INTERACTION_CONTRACT.md); this is not a design exploration or runtime authorization. [STATUS](STATUS.md) alone selects execution. Review base: main `1b3c3f91ea4e248fb048214fd1efceccc0b2f344`, tree `497095d5a09f12cd93707b6afd423911b3dde27e`.

## P1. Scope, ownership and readiness

The first lane task is `ARCHIVE-HOME-01` only after owner scheduling/authorization and fresh-main reconciliation. Do not promote it to the global next task, acquire a runtime writer or interrupt Topic/Context/Settings/Sync/AI-COST merely because this plan is merged. Current global `CPV1-TOPIC-02` closure remains unchanged; integrated later Topic mechanics are not missing implementations.

This is a local interaction/query/presentation lane. It does not depend on a paid model, AI-COST completion, Browser-Native Sync launch, the full Thought UI or a new content schema. Existing source/capture/permission/working-body/recovery services are prerequisites to preserve, not products to rebuild. Task C's actual provider-facing contextual action needs its own current qualification; missing live proof blocks that claim, not Task A/B engineering.

One writer must own shared `archive.js`, AppShell/routes, query eligibility and Source boundaries in any actual batch. Rebase/review new upstream implementations before coding. Do not run a second router, EditorSession/body owner, global-search index or Source/Project directory to avoid integration.

## P2. Current implementation and gap map

| Existing owner/path | Reuse | Bounded gap / planned change |
|---|---|---|
| ui/archive.html, ui/app-shell.js, ui/app-shell-state.js, ui/app-shell.css | Shared shell, slots, controls, responsive roles | Replace wholly blank root with Home; explicit four-state presentation; remove duplicate active search hosts. Current root already avoids default Conversation selection. |
| ui/archive.js; ui/reader-navigation.js; ui/route-history.js | navigate/leave/restore, history, typed references, cancellation and current save guard | Distinguish PRIMARY_ARCHIVE from Back/reload; typed Archive state/scope/origin; preserve old per-view routes; do not infer state from documentId alone. |
| ui/view-session.js; ui/document-search-sessions.js | Bounded body-free metadata/session ownership | Add needed origin/result-window/focus state and trusted tab-session checkpoint for reload; current in-memory ViewSessions alone does not preserve query after reload. |
| background/service-worker.js | Trusted command/sender dispatch; existing storage.session isolation | Qualify any new fragment route against exact-entry isExtensionPage checks. Extend only canonical route handling; never broaden origin/path admission or grant host access. |
| ui/archive-navigator.js | Stable group/window IDs, expansion, selected path, title disambiguation, paged children | Separate disclosure from scope label; make Source/Project/group selection explicit; reach root/group/child real ends and preserve scroll. Current Project click is expansion, not demonstrated auto-open. |
| core/archive-navigation-query.js / archive-navigation-index.js | ArchiveNavigationQuery, coverage/generation/cursors, metadata-only projection | Reuse for Browse; qualify empty/unknown membership, reload and cursor invalidation. No new permanent Project truth. |
| core/source-structure-model.js / source-structure-store.js | Provider-qualified Project ref, membership unknown/unassigned/project, last-known and deletion evidence | Consumer copy only; retain identity and evidence semantics. No unknown-to-unassigned collapse. |
| background/service-worker.js SEARCH_INPUTS -> store.searchInputs; core/organizer/store.js inheritance; ui/input-search.js; core/search-service.js | Existing trusted lexical query boundary, bounded page continuation and original-safe excerpt primitives | Full four-scope query coverage; ordinary include-smart-filtered semantics; metadata needed for hit revision and real location. Recheck actual inherited search implementation before changes; no UI-only partial filtering. |
| ui/smart-filter.js renderResults; ui/search-experience.js | Existing search activation and highlight helpers | Input-first result presentation; exact original-offset/revision handoff; truthful partial counts, no generated summary. Current helper ranking is title-first; presentation is not a ranking proof. |
| ui/archive.js Reader, ui/library.js, ui/reader-experience.js | Current working-text editor, continuous bounded windows, reading anchors, ordering and guards | Reuse around exact hit; add narrow route-local filtered reveal and correct parent return without dirtying bodies. Do not rewrite Reader. |
| ui/original-surface.js; core/archive-original-query.js; source/provider validation | Attributable original reading and verified source identity | Distinct external Conversation action, only when the source owner can supply a qualified target. The current primary Back is internal despite its ambiguous copy. |
| ui/popup.js; existing provider/action boundary | Ordinary explicit extension open | Generic open -> Home; separately qualified deliberate contextual view -> exact saved Reader. No automatic host inference/capture/import. |

Current extra `recentCapturedDocument`, PAIA_READER_RECENT and saved anchors are not instructions to populate Home. Preserve lawful existing owners without invoking them to select fresh content or building a recency feed.

## P3. Dependency graph

```text
ARCHIVE-HOME-01 Route/state/origin foundation
        -> 02 Home + one search owner + results
        -> 03 Browse scopes and selection
02 + 03 + existing Reader -> 04 Exact Input handoff / temporary reveal
01 + 03 + 04 -> 05 Back / external source / contextual integration
02 + 03 + 04 + 05 -> 06 responsive / reliability / acceptance
```

The default coherent delivery order is 01 -> 02 -> 03 -> 04 -> 05 -> 06. Work packages can be batched under one authorized writer; six identifiers do not mandate six PRs or six repeated full certification cycles. A prerequisite's actual accepted implementation, not its number, controls readiness.

## P4. ARCHIVE-HOME-01 — Route / state / origin foundation

**Goal:** establish the four explicit states and deterministic fresh-versus-return behavior before moving controls.

Implement a compatible route projection in the existing coordinator: state, typed scope, stable content refs, recorded origin and metadata session key. PRIMARY_ARCHIVE explicitly resets active selection/query/scope/reveal after the leave guard; Back/reload use validated references. Decode legacy history without repurposing Source Records. Meaningful actions create entries; typing/disclosure do not create unbounded history.

Define bounded reload-surviving tab-session metadata using the existing trusted session boundary. No snippets/bodies/secrets, no global last-query, no Sync. Preserve live-tab operation during storage failure and make degraded restoration explicit. Define fragment serialization and source sender validation together; current worker entry URL equality is a concrete integration risk.

Tests: every four-state transition; fresh open from each space/Reader/Search/Browse; repeated primary click; explicit Reader reload; invalid/unavailable/legacy routes; forward/back and modal close; cross-tab isolation/session eviction; stored-query absence from URLs/logs/Sync; dirty save failure, unknown save outcome and Chinese IME; forged host/extension origin/path/fragment and unrelated command rejection. No unrelated permission expansion.

Exit: route/state tests and affected existing navigation/working-save/privacy regressions pass; root action never invokes a recent/current-host auto-selector. UI design does not need to be reapproved to implement this settled behavior. State: PLANNED, execution not selected.

## P5. ARCHIVE-HOME-02 — Home, single search owner and Input results

Depends on 01. Render exact minimal Home and one Main search component. Remove the competing navigator content-search instance/keyboard ownership, not its useful existing domain query service. Implement SEARCH_RESULTS with query/scope/order/window/scroll/focus metadata and trustworthy coverage.

Use existing local SEARCH_INPUTS and paging. Results foreground exact current Input text and subordinate source/time/path. Eligible smart-filtered material is discoverable by default; explicitly removed/purged data is not. Keep original/working semantics honest. Evaluate current deterministic rank and make only a necessary, tested local correction within its existing owner; do not change shared Thought/Context ranking accidentally.

Tests: body-only and title-only hits; Chinese, English, emoji, normalization length changes and long Inputs; match beyond mounted DOM; empty/intermediate pages/real end; rapidly changed query and IME; no-result versus building/error; returned scroll/focus; plain-text selection without activation; search component count exactly one visible/enabled; search/open/clear/scroll produce zero remote-model calls and no AI job.

Exit: Task A reaches a real eligible Input result with original text, no summary or suggestions; Home has neither recents nor counters/feed. Search restore is tested, not inferred from a screenshot. State: PLANNED.

## P6. ARCHIVE-HOME-03 — Browse scope and source structure

Depends on 01/02. Wire Source/Project/group label selection separately from disclosure. A label opens neutral BROWSE_SCOPE with no Reader, while an active Search scope choice preserves query in Results. Conversation selection alone opens content. Preserve scoped Project tuple, same-title identities and actual source/membership provenance.

Reuse ArchiveNavigationQuery and SourceStructureStore. Cover pagination at providers/groups/Conversations, last-known relationship, confirmed unassigned versus unknown, detached and source-deleted states. Keep one logical Conversation list when it moves between wide navigator and narrow pane. Do not fetch full Input bodies to fill a Project home.

Tests: Project with zero/one/many Conversations; label versus arrow and keyboard behavior; no automatic first/latest child; cross-provider identical Project IDs/titles; rename/move during Browse/Search; incomplete index not empty group; list end/cursor invalidation; changing Search scope to all retains query while primary Archive clears it.

Exit: Task B selects scope, then a user-chosen Conversation, without content selection during scope changes. State: PLANNED.

## P7. ARCHIVE-HOME-04 — Exact Input handoff and temporary reveal

Depends on 02/03 and the existing Reader/working-body query owners. Carry stable Input/document IDs, revision-qualified original-safe match information and return session key. Revalidate in the trusted owner, load the bounded window around the hit, reveal the visual collapse and scroll/highlight the actual occurrence after layout. Preserve the one EditorSession and surrounding genuine user Inputs.

Implement narrow per-route/per-Input Smart Filter view exceptions instead of durable FILTER_KEEP/FILTER_PROTECT or a global filter-mode write. Distinguish ordinary filter hiding from explicit removal and permanent purge. Resolve changed revision, renamed/moved Conversation, source-unavailable local content, deleted target and missing original match with truthful feedback.

Tests: deep hit beyond first/mounted pages, both sorts, very long body and emoji; late result after edit/remove/purge; current phrase disappeared; active IME/caret/selection; filter mode and keep/protection records unchanged before/after navigation; no body revision from highlight; safe local Source-unavailable reading; exception expires on fresh entry and cannot resurrect a purged body. Search Back revalidates and restores the original hit position.

Exit: precise arrival is proven through production functions/browser tests, not merely opening a Conversation or checking a DOM element exists. State: PLANNED.

## P8. ARCHIVE-HOME-05 — Back, source action and contextual view

Depends on 01/03/04. Implement labeled recorded-parent return and native browser history without loops. Search Back restores Search; Browse Back restores Browse; primary Archive always requests Home. Separate external original-Conversation action from internal Back.

Use verified provider-owned source identity/URL. Ordinary popup/open never inspects a host Conversation to choose Reader. A deliberate contextual action uses the trusted current-Conversation ref to resolve saved content; absent local content is an honest not-saved result, not automatic capture/import/consent. Do not invent supported links or host permissions. Existing host capture, Prompt surface and no-send boundaries remain unchanged.

Tests: Search -> Reader -> Thought -> Back; Browse -> Reader siblings -> parent Back versus browser Back; primary Archive versus explicit reload; late source changes; no-origin direct link; invalid external URL/scheme/origin, external opener isolation; explicit current-context action and generic open contrasted; unarchived/temporary/unsupported Conversation; saved-state guard across every exit.

Exit: Task C engineering is demonstrated in the actual extension route/action path. Current logged-in provider evidence is separately required to claim live support; if missing, record ENGINEERING_COMPLETE / LIVE_CONTEXTUAL_VERIFICATION_PENDING for that part only. Never mark the whole lane COMPLETE without its applicable evidence. State: PLANNED.

## P9. ARCHIVE-HOME-06 — Responsive, reliability and final acceptance

Depends on applicable earlier outcomes. Converge actual source/release surfaces against UX and compatible private references; preserve source/read/search truth, not just pixel appearance. Verify wide three-column, medium overlay/compact and narrow push behavior with one active search and no duplicated lists. Use existing light/dark/type/focus roles and saved prose settings.

Test real-end long lists and deep return, missing/stale origin, worker/page reload, offline, incomplete index, data change, save failure/conflict, Chinese IME, keyboard/touch/reduced motion, text enlargement and 320 CSS-pixel reflow. Include long/same titles, empty and unknown groups and smart-filtered results. New content cannot yank scroll. Verify no ordinary query/route/session metadata in model jobs, network payloads, Sync or audit bodies.

Measure, do not invent, query latency, deep-hit landing latency, restored-position accuracy, memory/DOM bounds and idle work against a recorded current baseline at representative small and long-lived archive sizes. Reuse existing performance limits where applicable; disclose exact hardware/data scale and any regression. Capacity examples are test scenarios, not user-visible record limits. Home/nav metadata should not require a full-body scan or a new ranking collector.

Exit: all applicable Task A/B/C behavior, loss/negative cases, actual production visual comparison, affected accessibility/reliability/performance gates and exact-main source/release identity evidence pass under the existing VERIFICATION/EXECUTION_PROTOCOL. Synthetic/browser mechanics, current-live compatibility, installed-build and owner visual approval are separately labeled. A prototype/poster or no-overflow check cannot certify production. State: PLANNED.

## P10. Three core task traces and acceptance ledger

Use synthetic/sanitized fixtures, never the owner's actual archive text in public tests. The fixture phrases below are invented equivalents of the requested tasks.

| Task | Design trace | Required observable evidence | This adoption |
|---|---|---|---|
| A — remembers a sentence, not its Conversation | Home(all,no selection) -> type a literal fixture phrase such as `不要自建同步服务` -> Results -> explicitly chosen Input -> exact Reader match -> Back to same Results | Correct Input/body/revision and location; query/scope/window/focus restored; smart-filtered variant discoverable with no Keep; zero models | Design trace reviewed; production execution NOT_RUN |
| B — knows the Project | Home -> explicit Project label -> BROWSE_SCOPE(no Conversation) -> chosen Conversation -> Reader -> recorded Project Back | No default-first/latest child; identity survives rename; group list and scroll restored; incomplete-source variant honest | Design trace reviewed; production execution NOT_RUN |
| C — explicit current-context view | Deliberate supported-site action -> verified saved Conversation lookup -> Reader; PAIA Back -> Home unless valid internal origin | Intended current Conversation only; generic popup open still Home; absent local data does not capture/import/select another Conversation | Design trace reviewed; extension/live execution NOT_RUN |

Do not call these production-tested because the transitions are written down. The task reaches completion only with each applicable evidence class in 06, not a screenshot of synthetic content.

## P11. Integration and non-goals

Apply current VERIFICATION.md and EXECUTION_PROTOCOL.md. Targeted tests/affected regressions and the light integration gate are the ordinary batch progression. Escalate at an actual sender/authorization, deletion, identity, migration or other high-risk boundary; this plan does not waive existing full-certification requirements. No framework rewrite, separate content store, vector database, AI provider, site-permission expansion, dashboard, feed or restored cancelled feature.

At a future runtime start, inspect the current package scripts and version policy. Documentation-only adoption changes neither manifest/package version nor schemas/tests/workflows. A subsequent runtime integration follows its own proper version/source/release policy; no build, store publication, installed update or destructive user-data migration is authorized now.

Record exact source base, implemented subset, affected tests, failed/deferred evidence, main readback and unmodified invariants in the existing receipt framework. Do not invent a second ongoing status workflow. Missing external/visual evidence is specific and cannot convert a fail to pass or force unrelated engineering to restart.
