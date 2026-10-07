# Input Archive Home — final interaction adoption

Contract: **IAH-1.0**. Owner-directed final freeze: **2026-10-08**.
State: **DESIGN_ADOPTED / IMPLEMENTATION_PLANNED / RUNTIME_NOT_STARTED_BY_THIS_TASK**.

This is the final tightening of the previously reviewed Home / Find / Browse / Reader direction, not a redesign of PAIA. The current owner instruction authorizes product documentation, a dependency-ordered development plan and canonical integration only. It explicitly prohibits production runtime, schema, UI implementation and Archive runtime development in this task.

The sole Archive interaction authority is [INPUT_ARCHIVE_INTERACTION_CONTRACT.md](INPUT_ARCHIVE_INTERACTION_CONTRACT.md). [UX](INPUT_ARCHIVE_HOME_UX.md) specifies its presentation; [PLAN](INPUT_ARCHIVE_HOME_PLAN.md) owns implementation and acceptance; [REFERENCES](INPUT_ARCHIVE_HOME_REFERENCES.md) records the exact source and private reference boundaries. [STATUS](STATUS.md) remains the only global execution queue.

## 1. Final decisions

**Fresh Archive Entry is not Resume Previous Reader. Back restores context; primary navigation opens Home. No selection is a valid product state.**

Ordinary opening of PAIA's Archive and every deliberate primary-nav `档案` action enter `ARCHIVE_HOME`: all-archive scope, empty query, no selected Source, Project, Conversation or Input, and no previous Reader body. Existing capture consent and unsaved-work guards still apply. Navigation is not authority to discard a draft.

Four product states are explicit: `ARCHIVE_HOME`, `SEARCH_RESULTS`, `BROWSE_SCOPE`, `CONVERSATION_READER`. Loading, failure and local Reader Find are subordinate states, not substitutes for these four.

Find searches the user's actual Inputs. Browse narrows a Source/Project scope. Only an explicit Conversation, Input search result, valid direct link or deliberate contextual action selects content for Reader. A Project is scope, not a command to select its first/latest Conversation.

The first Home contains only the shared shell/Browse access, `查找你的输入`, `搜索你以前说过的话、关键词或主题`, the primary search field `搜索我以前说过的内容`, and one subdued Browse hint. **No Recently viewed in v1.** Returning to prior work is adequately served by explicit Back and existing reading anchors; a second recency surface has not established enough additional value. This decision does not delete existing reading-position records or remove another separately owned Revisit capability.

**No common-search suggestions, search-history recommendations, AI suggestions, feed, default recent Inputs, statistics or dashboard.** Blank space is intentional. Existing explicit history import and actual-fault recovery remain reachable in their contextual locations.

Exactly one visible/enabled content-search field exists in the active Archive surface. It is in Main: large on Home, compact in the Results/Browse header, and Conversation-scoped in Reader. The second column has no content-search field in any of these states. Reuse the shared ScopeSearch component and current query owners rather than adding a second search product.

Search remains local lexical/full-text first with zero remote AI calls. Smart-filtered, otherwise eligible Inputs participate in ordinary Archive Find; result navigation grants only a temporary view exception, never Keep, restore, a new membership or external authorization. Explicit removal and permanent deletion retain their stronger semantics.

## 2. Source-grounded correction, not an invented bug report

Fresh remote main at review is `1b3c3f91ea4e248fb048214fd1efceccc0b2f344`, tree `497095d5a09f12cd93707b6afd423911b3dde27e`; manifest remains 0.18.0. This is the same source identity used by the immediately preceding review, independently resolved again.

Current main already deliberately clears Reader at the Archive root. Current Project row activation expands/collapses a group rather than automatically opening its first Conversation. The existing `返回聊天窗口` button invokes PAIA navigation; it is not itself an external ChatGPT link. Do not report these as demonstrated auto-open/external-navigation defects.

Actual gaps are the missing neutral Find Home and four-state discriminant; root query/scope restoration not distinguished from a fresh primary entry; presentation with two search hosts; Project expansion not an explicit selected Browse scope; title-first result presentation; tab-memory search restoration limits; and incomplete result/origin/temporary-reveal metadata for the strengthened contract. Existing Reader, paging, editing and source safety are reused, not rewritten.

## 3. Scoped supersession ledger

| Prior source or interpretation | Disposition for Archive only | Preserved |
|---|---|---|
| UX_CONTRACT section 1/A1 and extension/PRODUCT.md, Archive navigation: root is a wholly blank Reader with search in the narrow navigator | Replace root composition with neutral Find Home and Main-owned search. No selected Conversation remains correct. | Shared shell, source hierarchy, no arbitrary selection, explicit Reader reload and edit guards |
| Earlier review/poster: primary Archive click may restore Reader within the same session | Superseded. Primary click always requests Home; explicit Back/Forward or explicit-route reload restores context. | Actual reading anchors and deliberate return navigation |
| Any older default-first/latest/current-host Conversation selection, or stale body displayed to fill unselected Main | Prohibited; a defensive invariant, not a claim that each defect exists on current main | Explicit content selection and contextual entry |
| Existing Project row doubles as disclosure; any interpretation that Project selection selects a Conversation | Separate disclosure from scope selection. Project label opens BROWSE_SCOPE; disclosure alone never changes content selection. | Stable provider-qualified Project/Conversation identity and expansion state |
| Existing root and Reader search hosts; generic label with unclear scope | One active Main-owned field, with typed all/Source/Project/Conversation scope | Shared lexical query services, scoped paging and accessibility |
| Existing SmartFilterUI title-first results and optional include-filtered checkbox | Input excerpt is primary. Ordinary Find includes eligible smart-filtered Inputs without requiring the user to discover that checkbox. | Explicit removed/purged exclusions, current working-body truth, user Keep protections |
| Generic `返回聊天窗口` for all Reader entry origins | Replace primary label/target with recorded PAIA origin; add separate verified `在 ChatGPT 中打开` secondary action | Source attribution and guarded external URLs; current button is already internal navigation |
| Earlier optional recent items/common suggestions/poster quick-entry content | Omit both Recently viewed and suggestions from v1 Home | Reading anchors, ordinary Browse and separately owned Revisit, without a Home feed |
| Earlier narrow root exposing a full tree before the Find task | Single-pane Home -> Browse/Search -> Reader push navigation | Same IDs, edit/save guards, keyboard and return state |
| ANS/Consumer Cleanup/D6/D7 historical Archive assertions and screenshots that conflict with rows above | Historical evidence for their original scope; not new IAH acceptance or a competing design queue | Their source, editor, privacy, recovery, continuous-loading and nonconflicting visual guarantees |

Frozen historical documents and past PASS/FAIL records are not deleted or retroactively relabeled. The seven immediately preceding canonical files are retained as exact-blob PRE_ARCHIVE_HOME snapshots; their nonconflicting requirements remain incorporated by their current canonical entry points. This ledger also governs the older Archive/Consumer Cleanup clauses named above without rewriting their historical evidence.

## 4. Boundaries with other product lanes

Settings Consumer v2 inventory and existing preferences are unchanged; no resume-Reader switch, search settings console or new account row is added. Browser-Native Sync does not transport active Archive route/query/result/temporary-reveal state or turn a restored reader anchor into an automatic default selection. AIU/AIOS/Qwen policies, quotas and paid-service gates are unchanged. Navigation, search and highlights cause no AI job or semantic maintenance event.

Personal Topics, Sections, Entries, Thought UI and Context permissions retain their own authority. Source Project is not Personal Topic. Archive Find creates no Topic/Entry and does not grant an external AI Archive fallback. B-01/B-02 and all unrelated gates remain unchanged.

## 5. Adoption versus execution

IAH-1.0 is settled for development planning. The six ARCHIVE-HOME outcomes are not started here. `ARCHIVE-HOME-01` is only the first task of this lane when explicitly selected; it does not replace the current global `CPV1-TOPIC-02` closure pointer. Subsequent merged Topic/Context mechanics are preserved and are not reimplemented or newly certified by this adoption.

This task performs source/design review, reference hashing, contract/planning integration and remote documentation readback only. No production test, browser journey, accessibility/performance measurement, live contextual-entry qualification, model call, user-data access, schema migration, extension build/install or release is claimed. The three core tasks have design traces in PLAN; their production execution remains NOT_RUN.
