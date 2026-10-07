# Technical Restructuring Plan — PAIA Consumer Product v1

Current scoped addition: **IAH-1.0, 2026-10-08**. Product behavior is fixed in [INPUT_ARCHIVE_INTERACTION_CONTRACT.md](INPUT_ARCHIVE_INTERACTION_CONTRACT.md); source-grounded engineering and acceptance are in [INPUT_ARCHIVE_HOME_PLAN.md](INPUT_ARCHIVE_HOME_PLAN.md). STATUS alone chooses execution. No runtime/schema/test/permission/version change is made by this adoption.

## Complete incorporated technical baseline

[TECHNICAL_PLAN_PRE_ARCHIVE_HOME_2026-10-08.md](TECHNICAL_PLAN_PRE_ARCHIVE_HOME_2026-10-08.md), blob `b1df62582dea0ea4ea2cf32bb9033d83c823b2fc`, preserves the entire preceding technical plan exactly. **Every nonconflicting responsibility, keep/refactor rule, domain contract, migration receipt, privacy/source invariant and non-goal is incorporated in full.** Read the relevant complete baseline, not just this new Archive overlay. The earlier Topic/Thought/Context/Prompt/Sync/AI scopes and gates are not cancelled, restarted or certified here.

## 1. Target responsibility model

The previous trusted admission -> canonical Source/Working/human intent -> replaceable projections -> existing query/editor/router -> restricted external release model remains. IAH is a route/query/presentation amendment over the same content owners, not a new layer of user truth. Capture/save stays independent of Find availability and AI processing.

## 2. KEEP

Keep the complete prior KEEP set: stable Source/message/Conversation/Project and Personal Topic identity; source evidence versus working bodies; human body/field/edge intent; attribution and real time; revisions/CAS; deletion/tombstone fences; bounded query/index owners; editor/IME/recovery; strict import/restore; permissions and current provider boundaries. Navigation or a search hit cannot authorize content resurrection, Source edits, Keep or external access.

## 3. REFACTOR

Prior capture lifecycle, worker task, domain API and EditorSession requirements remain. The Archive lane specifically reuses ArchiveNavigationQuery, SourceStructureStore, existing store.searchInputs/SEARCH_INPUTS, shared lexical helpers, ReaderStateService and current editor/navigation/session modules. Exact owner/gap mappings are specified once in the Archive plan P2.

## 4. REPLACE ONLY JUSTIFIED IMPLEMENTATION

### 4.1 Consumer shell and page composition

Keep one AppShell/history/route coordinator. Add an explicit Archive product-state discriminant: ARCHIVE_HOME, SEARCH_RESULTS, BROWSE_SCOPE, CONVERSATION_READER. Do not infer it from a DOM class, nonempty Reader, a recent-document field or the active host site. Legacy view=library remains Input Archive; legacy view=archive remains Source Records compatibility, not a new Home alias that changes source ownership.

Separate PRIMARY_ARCHIVE/OPEN_ARCHIVE, internal Back/Forward, explicit reload, Browse scope selection, search-scope change and content selection. All destructive-to-editor transitions pass the current leave/IME/save guard before route mutation. The global current-task pointer is not changed by this technical design.

Use one active Main-owned ScopeSearch presentation and current query services. Reposition/repurpose the shared component without duplicate active listeners or hidden focusable clones. Reader Find remains local to its Conversation and separate from the originating Archive result session. Source/Project/group labels select scope; disclosure only expands; Conversation selection opens Reader.

### 4.2 Supported restore and recovery at scale

The entire preceding section applies unchanged. IAH does not add backup/export products, weaken graph/hash/tombstone checks, access a real archive or create a migration merely for a new view.

### 4.3 Consumer update/distribution

The entire preceding section applies unchanged. This is documentation-only: no manifest/package change, extension build, installer, daily-profile update or release is authorized.

### 4.4 Archive route/session metadata and query continuity

Reuse existing RouteHistory/ViewSessions/DocumentSearchSessions. Add typed scope, origin/history key, result-window IDs/revisions/order/cursors/coverage, result focus/viewport anchor and a narrowly scoped temporary reveal set as body-free view metadata. Reload restoration needs a bounded, actual-tab-scoped trusted extension-session checkpoint; current RAM-only snapshots alone do not prove that requirement.

Safe refs/anchors/session keys can enter the versioned history projection. Private query/result metadata stays in the trusted tab session; no bodies, snippets, titles, arbitrary external URLs or secrets in route URLs. Do not use global last-query state, host-site storage, cloud sync or a new permanent IndexedDB entity/body store. Validate limits, eviction, cleanup and degraded restoration. Browser-Native Sync does not transport active route/query/result/reveal state.

Planned direct-link fragments must be implemented together with strict sender admission. Current service-worker isExtensionPage accepts exact application entry URLs. Do not add fragments without testing the trusted command path; do not repair it by accepting arbitrary origins or paths. Retain source/caller validation, current permissions and negative tests. Concrete accepted route grammar/lifetime is in IAH-04, not another router specification.

### 4.5 Archive search and precise Reader handoff

Apply all/Source/Project/group scope in trusted query owners across the full eligible corpus, not in a UI filter over mounted results. Reuse deterministic lexical/rank/paging foundations with truthful coverage and current-body ownership. Input-first presentation does not imply that current title-first ranking has changed or that semantic search exists. Any necessary local ranking change must remain bounded and independently tested without altering unrelated consumers.

Carry stable Input/document IDs, revision-qualified original-safe match data and origin key to the Reader. Resolve current eligibility, load the bounded window, safely remap Unicode/normalized offsets, then scroll/highlight without changing editable text or its revision. A changed match is recomputed; an unavailable/removed/purged one is never replayed from a cache as current truth.

Smart-filtered Inputs can be found while explicit removals/purges remain protected. Use a narrow route/Input-local reveal rather than FILTER_KEEP/FILTER_PROTECT, automatic restore or global show-all policy mutation. Existing deliberate edit/Keep semantics remain separately owned. Reader bodies, their continuous loading, ordering, source attribution and editing/recovery are reused, not redesigned.

## 5. DERIVED CAPABILITIES

All preceding retrieval, invalidation, recovery-draft, Prompt Reuse and Personal Topic sections are incorporated unchanged except the narrow IAH search presentation/return rules. Ordinary Archive Find, navigation, scope changes and highlights have zero remote model calls, no embeddings dependency and no AI maintenance event. Explicit external Context retrieval still cannot fall back to Archive.

## 6. AI Organize versus Topic Organizer

The full existing distinction, derivative/human authority, evidence/revision/cache and no-activation boundaries remain. Archive Home selects no model, changes no style/budget and creates no Topic, Entry or AI output.

## 7. AI Context and Passport

The full prior card/item/Topic access, complete-read, dedupe/revalidation/revocation requirements remain. Local Archive route references grant no external access or read/write capability.

## 8. Connector and internal processing

Existing read-only/external versus internal-formation boundaries remain. A deliberate supported-site contextual action may resolve the exact already-saved local Conversation through a trusted owner; ordinary open does not infer it. Absent local data is not permission to capture/import or change consent. A verified original-site link is a separate secondary action, not a navigation return URL or new provider transport.

## 9. Import and source expansion

The full prior import/role/time/branch/dedupe/provider qualification requirements remain. No provider, permission or account-history access is added here.

## 10. Sync / cloud / mobile

The complete current BNS and prior nonconflicting mobile/MyWrite/voice boundaries remain. UI session restoration is not canonical Sync and never reactivates grants. Narrow push navigation changes presentation only, not identity or capture semantics.

## 11. Migration contract

The complete exact predecessor migration receipt requirements remain mandatory if a future authorized change actually affects schema/identity/canonical representation. IAH has no approved new content schema or real-data migration. Preserve all old bodies, revisions, human decisions and deletion fences; do not alter them to make the Home fit.

## 12. Technical non-goals and verification

All prior technical non-goals remain. No framework rewrite, new corpus/store, vector database, AI per search, dashboard/feed, second router/search policy, permission expansion or cancelled feature revival. Existing tests are not weakened to obtain green status.

ARCHIVE-HOME-01–06 implement the settled dependencies under the existing VERIFICATION/EXECUTION_PROTOCOL. Design traces are not browser tests. Actual source/release behavior, exact-main evidence, current-live contextual entry, accessibility and resource measurements retain separate acceptance labels and applicable gates. None is claimed performed by this documentation integration.
