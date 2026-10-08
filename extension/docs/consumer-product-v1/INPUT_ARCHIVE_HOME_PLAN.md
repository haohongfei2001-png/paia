# Input Archive — minimal optimization development alignment

> Execution update: the owner's later explicit seven-lane instruction selects
> IAH-1.1 runtime development. It supersedes earlier documentation-only /
> NOT_SELECTED / exclusion statements in this adoption record, not the confirmed
> minimal design. See [current execution](SEVEN_PLAN_EXECUTION_2026-10-08.md).
> Implementation, tests, exact-main acceptance and user availability remain
> separate claims; none is established by this authorization.


> Historical adoption-time statement below; superseded by the execution update at the top.

**IAH-1.1 / 2026-10-08 / DESIGN_SCOPE_READY / EXECUTION_NOT_SELECTED.** [ADOPTION](INPUT_ARCHIVE_HOME_ADOPTION.md), [INTERACTION](INPUT_ARCHIVE_INTERACTION_CONTRACT.md) and [UX](INPUT_ARCHIVE_HOME_UX.md) control the selected subset. Current STATUS retains coordinated non-Archive work and Archive exclusion. This plan aligns future work; it does not acquire a writer or change production files.

## P1. Source and minimum-change rule

Initial review source: main 99bb95ed114c166347520b58e3216d0e63519379, tree 9438fb92d215833cdf8cd9d01047ad6ae804ea31. Its comparison with the visual-review base dc594f047cf44e92bd2e93a463746622b065f548 contains coordination/Context evidence Markdown only. Current implementations and partial helpers are not missing solely because their end-to-end acceptance is unproven.

Before integration, main advanced to daf180762e2fe7718dfcddcf345c6a11749aad8e, tree cf179b2a0662af33f6ea6c93fa373f7fc27e5f2c, integrating Personal Topic Root 0.19. Its changes include shared archive.html/js, Reader navigation, search keyboard helper and worker admission as well as Topic implementation/tests/workflows/version. Preserve all of them; they are not part of this documentation diff. In particular retain Topic-root slots/target restoration, the shared keyboard selector option and strictly validated Topic/Section fragments. Initial exact-entry-only worker notes do not describe this newer source. None of this requires reopening Archive visual design or certifies its selected implementation.

Re-read main and actual shared-file ownership before any future batch. One writer owns each affected boundary; do not race Topic/Settings/Context/AppShell or recreate already-integrated owners. Design approval is not an instruction to restore CPV1-TOPIC-02 as a global pointer. Source/capture, original/working identity, save/IME/recovery, permission and deletion invariants remain prerequisites, not products to rebuild. No paid-model or production-Sync dependency is needed for ordinary Archive Find.

## P2. Actual implementation, KEEP and bounded gaps

| Current owner | KEEP / existing fact | Necessary work only if not already satisfied |
|---|---|---|
| ui/archive.html; app-shell.js/.css; desktop-tokens.css; reader.css | Blank root, middle Archive field plus Reader field, existing brand/rail/tree geometry, dark/responsive and preference-aware prose | Preserve slots/geometry and newer Topic integration. No Home construction, Main-search move, primary-nav or Reader redesign. Conditional markup/style changes only for approved result/label/reflow needs. |
| ui/archive.js presentScopeSearch/renderDocumentSearch; components/scope-search.js | Two scoped instances and native accessible labels already exist; presentation currently resets both placeholders to empty | Visible truthful scope hints; prevent render from erasing them; retain independent queries/IME/focus. |
| ui/archive-navigator.js toggleGroup/paint | Whole Project row discloses; explicit openWindow selects content; stable IDs, wrapping, duplicate disambiguation and snapshots already exist | KEEP click semantics and source copy. Test no automatic scope/content transition; extend snapshot metadata only if return correctness needs it. No name/arrow split. |
| ui/archive.js onProjectSearch/updateSearchProjectScope; navigator Source selector | Source selector and conditional Project-clear/control plumbing exist; inspected Project paint has no name-to-scope action | Do not claim a callback proves reachable Project search. Reuse a supported explicit low-frequency scope entry; document actual gap. No new permanent scope widget or Project disclosure side effect. |
| ui/smart-filter.js renderResults | Current title-first result renderer; existing Input activation and local search | Input-first text hierarchy and quiet genuine path/time; preserve text selection/native activation and truthful coverage. |
| ui/search-experience.js; ui/input-search.js; ui/archive.js Reader stream | Existing revealSearchResult/highlightReading and bounded Input handoff/windowing; newer shared keyboard selector support | Prove exact off-screen occurrence, current-revision offsets and restore behavior; repair gaps only, preserving other consumers. |
| ui/reader-navigation.js; route-history.js; view-session.js; document-search-sessions.js | One route/history owner, safe projections and bounded memory sessions; current Topic-root slot/target restoration | Explicit primary-vs-return action, typed origin/result/tree metadata, independent Archive/Reader queries and identity-relative position/focus restore. Preserve Topic behavior; qualify reload checkpoint only for claimed restoration. |
| ui/library.js; reader-experience.js; ReaderStateService | Direct editing, save/recovery, selection, continuous reading and anchors | Preserve and run affected regressions; no new editor, body copy or sticky return. |
| Existing SEARCH_INPUTS/store.searchInputs; ArchiveNavigationQuery/SourceStructureStore and shared lexical helpers | Trusted query/identity/coverage boundaries, not a UI-owned corpus | Necessary scope, revision/path, include-smart-filtered and narrow temporary-reveal fields; current eligibility enforced before read/activation. Inspect actual inherited implementation before touching its owning file. |
| ui/original-surface.js; popup.js; background/service-worker.js | Existing original/source action, generic open and current strict exact-entry/qualified-Topic-fragment sender boundary | Reuse actual supported entries. New host-context button or Archive fragment grammar is separately scheduled; worker edits only if a proven selected-query/sender gap requires them. Never expand permissions or undo new Topic support. |

Unknown/unassigned distinctions, full-name wrap, source-label weight, title/time/prose spacing and current dark tokens are KEEP. KEEP means no redesign/reimplementation; it is not a new full production-certification claim.

## P3. Simplification without renumbering or false completion

Keep six legacy identifiers for traceability, but remove the artificial six-new-project chain. Three coherent batches are sufficient planning units; these are descriptive batches, not another queue or a requirement for exactly three PRs.

| Retained ID | IAH-1.1 scope | Disposition |
|---|---|---|
| ARCHIVE-HOME-01 | Minimum state/origin/query/tree-return extensions in the existing owner | NARROWED / PLANNED. No new router, canonical schema or mandatory URL protocol. |
| ARCHIVE-HOME-02 | Scope wording in existing fields, flat Input-first results, coverage and result-state capture | RE-SCOPED / PLANNED. New Home/Main-only/search relocation removed. |
| ARCHIVE-HOME-03 | Existing tree disclosure and explicit scope correctness | KEEP + GAP CHECKS ABSORBED INTO 01/02. No independent Browse page or split-click implementation; not falsely marked COMPLETE. |
| ARCHIVE-HOME-04 | Existing handoff/highlight gap closure, exact Input/revision and narrow temporary reveal | REUSE / PLANNED GAP CLOSURE. No body rewrite or mandatory stripe. |
| ARCHIVE-HOME-05 | Real origin-aware normal-flow Back, state restore and separation from original-site action | NARROWED / PLANNED. No sticky return or new host-entry rollout requirement. |
| ARCHIVE-HOME-06 | Affected visual/safety/accessibility/reliability/resource acceptance | CONSOLIDATED / PLANNED. No unrelated whole-product recertification merely for copy changes. |

Recommended order when explicitly scheduled:

1. Existing 01 + 02 with only the necessary 03 scope/return checks: search wording, result hierarchy, state foundations.
2. Existing 04 + 05: verify/repair exact landing, temporary reveal and true Back restoration using those foundations.
3. Existing 06: selected-scope acceptance and unchanged-region comparison.

Dependencies are actual route/query/editor behavior, not a demand for a new Project page before precise search can work. Batch together compatible work rather than running a full certification loop per legacy number.

## P4. First coherent batch — existing fields, results and state

Preserve blank Home and current search coordinates. Add 搜索全部档案 / 在此对话中查找 with truthful narrowing, visible scope and accessible labels/localization. Keep the middle field while reading on desktop and prevent same-scope duplicate fields. The existing Reader field remains current-Conversation-only.

Extend the one current route/session owner only for needed four-state discrimination, typed explicit scope, origin, result-window/focus and tree snapshot. Project disclosure remains local metadata with no scope/query/content change. Returning from a tree-origin Reader restores the actual earlier Home/Browse route and expansion/focus; BROWSE_SCOPE never requires a rendered Project Main page.

Convert the current result renderer to Input-first presentation with reliable metadata, Unicode-safe exact excerpt and no AI summary. Do not silently change ranking just to match a picture. Reuse paging/coverage and distinguish empty/intermediate/building/error/end states. Keep query while explicitly broadening/narrowing its supported scope. Identify whether Project-scope selection is truly reachable; use existing low-frequency facilities where possible. Any proposed new permanent control is recorded unapproved and does not block all-scope/Reader Find.

Affected tests: both independent fields and labels survive render, query/caret/IME; primary reset versus Back/reload; no first/latest/host auto-selection; whole-row Project disclosure during Home/Search/Reader; correct scoped full-corpus search rather than DOM filtering; body-only/title-only/long/Unicode/unknown-time results; partial counts and no-result truth; no remote calls/AI jobs. Native text selection must not cause result activation.

## P5. Second coherent batch — exact hit and accurate Back

Exercise actual current helpers before changing them. A result must resolve the correct document/Input, current revision and original-safe occurrence beyond mounted pages, show the target in its real context and apply only a temporary non-editing highlight. Ordinary smart-filtered text is discoverable; a narrow route/Input reveal is not FILTER_KEEP/FILTER_PROTECT, automatic restore or a global mode change.

Use current Back position/style in normal flow, with 返回搜索结果 / 返回项目浏览 / 返回档案. Restore saved query/scope, result order/window/viewport-relative anchor/focus, tree expansion/extent and appropriate Reader/Find anchor through the actual owner; labels alone are insufficient. Handle sibling opening, cross-space explicit Back, native history, eviction, changed/moved content, save failure and cancellation without loops or stale result replay.

Keep separate verified original-site action in its existing low-frequency location. Existing supported direct/contextual paths retain their safety contract; a new host-site button, new fragment protocol and their live rollout are parked outside this bounded implementation, not cancelled as long-term possibilities. They are not invented blockers for normal all-scope search and tree browsing.

Affected tests: deep/long/Unicode hit in both sorts; modified-but-matching and changed-away phrase; temporary filter exception without durable writes; explicit removal and tombstone defeating cached result; source unavailable but lawful local reading; return to the exact result/tree state; wrong-title/body prevention; no sticky return in any theme/viewport; editor/IME/selection and pending save preserved. Shared Topic-root state/links and its newer keyboard behavior must not regress.

## P6. Consolidated acceptance — existing 06

Compare actual source/release rendering at like-for-like viewports/data/reading preferences with the baseline plus the selected-change ledger, not the entire B screenshot. Unchanged primary rail, brand, geometry, blank Main, title/time/prose width and spacing must remain unchanged except ordinary responsive/saved-preference reflow. Reject accidental C/P1/P3, split click, sticky return, extra permanent scope widgets or blanket M6 copy adoption.

Check affected dark/narrow/320-CSS-pixel reflow, text enlargement, keyboard/focus/accessible labels/coarse targets, reduced motion, IME, long-name/list/continuous Reader behavior, failed saves, index coverage, offline and changed/deleted data. Restore metadata across the claimed lifetimes with existing bounds; missing checkpoints produce truthful degradation, not a new global history store. No query/body analytics, new performance dashboard or model dependency.

Measure affected query/deep-arrival/return/resource regressions only against a recorded actual baseline and existing limits at relevant synthetic scales. Do not invent timing improvements from screenshots. Reuse valid evidence for unchanged code. Apply current VERIFICATION/EXECUTION_PROTOCOL targeted/affected/light gates; escalate real caller/privacy/storage/deletion/identity/migration changes to the existing appropriate full boundary. No test weakening, timeout inflation or documentation PASS in place of runtime evidence.

Close the selected subset only when applicable actual tests and source/release comparison pass. Design approval, local mechanics, visual conformance, live-provider support, real-user usability and installed delivery stay separate. No new implementation/test/migration/build/install/release is performed in this adoption.

## P7. Explicitly removed acceptance and deferred choices

Removed from this selected work: constructing a Find welcome Home; moving Archive Search to Main; deleting the middle field; enforcing exactly one field across different scopes; Project name-to-scope/arrow split; separate Project Main content/P3; P1; C; sticky Back; importing all B UI/copy; manufacturing six independent implementation rounds.

Not selected follow-ups: a newly permanent Project-scope selector, membership copy M6, sticky/deep-return convenience and new host-context/public route entry. A need for one must be stated precisely and separately approved where it changes product scope. Preserve already-supported explicit scope/direct-entry semantics and their safety.

## P8. Task traces and readiness

| Journey | Required trace | Evidence status in this adoption |
|---|---|---|
| Find | Neutral blank Archive -> middle field -> exact Input result -> actual Reader occurrence -> normal Back -> original results | Design selected; production journey NOT_RUN |
| Browse | Neutral Archive -> whole Project-row expansion -> explicitly chosen Conversation -> 返回项目浏览 -> original tree/route, still no inferred search scope | Design selected; existing disclosure KEEP; return closure NOT_RUN |
| Explicit scope | Separate supported scope action -> same query in narrower/all trusted scope -> result -> Back | Reuse/gap verification planned; no new permanent selector approved |
| Existing explicit direct/contextual entry | Intended saved target only; generic open remains neutral; missing local target does not capture/import/select another | Retain safety; new entry rollout outside selected subset |

> Historical adoption-time statement below; superseded by the execution update at the top.

The selected minimal scope is design-ready, not execution-selected or production-complete. Current coordinated STATUS/exclusion remains; no new global next task, writer, schema, runtime, UI, manifest or user-data action follows from this plan correction.
