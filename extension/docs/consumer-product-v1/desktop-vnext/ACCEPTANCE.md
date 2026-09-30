# Acceptance contract

Every row below is REQUIRED, not an executed PASS. The evidence record must include runtime SHA, fixture version, browser/OS, actions, observed result, failure logs with private bodies excluded. Screenshot appearance, prototype behavior, static package validation, domain CI and live-model semantic fidelity are different evidence types.

| ID | Given / action | Required result |
|---|---|---|
| A-01 | Open Archive root, then a Conversation, Back | Exactly three primary spaces; no fourth panel/composer; correct navigator/anchor restored |
| A-02 | Search Reader, then Topic, then root; finish late earlier query | One visible scoped search, full-domain results, late response ignored; independent queries retained |
| A-03 | Search a match in an unmounted/collapsed20k-character Input | Exact match revealed without clipping; close returns prior anchor |
| A-04 | Chinese IME composition, blur/navigation/page update | No partial persisted composition, lost draft, caret jump or dirty DOM replacement |
| A-05 | Save success/failure/committed-but-ack-lost | Saved only after verified receipt; failed draft retained; unknown ack readback, no duplicate write |
| A-06 | Select emoji/combining text then external edit before Add | Correct Unicode range or explicit stale refusal; no wrong Topic/Context substring |
| A-07 | Cross-Input selection | Exact Copy allowed; Add not silently flattened into one Source |
| A-08 | Original/History open and close with keyboard | Correct explicit target; no IDs/capture panel; one modal; focus+anchor return |
| A-09 | Restore a permitted working revision | New current revision, later history preserved; fresh base; purged original cannot resurrect |
| A-10 | Source project moves/deletes or membership becomes unknown | Stable Conversation identity; no duplicate/cascade deletion or fabricated unassigned |
| A-11 | New capture while reading with selection | No scroll yank/selection loss; optional new-content affordance only |
| A-12 | Remove then recapture/reimport; attempt mixed-human purge | Removal/anti-resurrection preserved; B-02-dependent purge refuses without side effects |
| T-01 | 300Topic root + long titles + source scope | Bounded readable list, not cards/statistics; exact search/back state |
| T-02 |159 dated+1unknown evidence over uneven years | True distribution; explicit unknown; no invented record for empty2022 |
| T-03 | Reveal many pages, switch year/tab, Back | Stable key anchor, expansion and extent; real end; focused/selected/dirty rows pinned |
| T-04 | Contradictory later statements / quoted third-party view | Both retained with author/time; no fabricated reconciliation or personality inference |
| T-05 | Add independent Thought; failed save; lost ack | Real current date, safe draft, single logical creation; no new captured-thread Input |
| T-06 | B-01 unresolved | No newly activated old-Thought direct edit or reverse-Archive policy |
| O-01 | Open saved AI view vs request new organization | Viewing sends nothing; scope/provider/batch/exclusions reviewed before request |
| O-02 | AI request slow/fails/cancels/ack unknown | Current stays readable/unmodified; no fake progress/paid automatic retry |
| O-03 | Candidate changes structure and writes transition prose | Human evidence, structure and AI-new text visibly distinct; quote intact |
| O-04 | Some fields undecided then all decided | Commit unavailable until explicit decisions; canonical field unit; one atomic admitted commit |
| O-05 | Base/candidate changes during decisions/commit | Stale refusal, no overwrite; old choices not replayed on new candidate |
| O-06 | First generation without saved presentation | Explicit reviewed adoption boundary; no background UI-side Current mutation |
| O-07 | Long or numerous changes, leave and return | Next undecided accessible; choices bound to candidate; tab/reload limits honestly stated |
| C-01 | Rank disagrees with explicit selection | Selection not dropped; suggestions remain separate until added |
| C-02 | WholeTopic includes unmounted/overbudget/unavailable entries | True intended snapshot/coverage; no visible-page-only inclusion or silent truncation |
| C-03 | Edit/redact output | Archive/Thought unchanged; prior release binding invalidated |
| C-04 | Change source while reviewing/ready | Copy/Export disabled, changed material review required; safe local edit retained |
| C-05 | Deny/revoke/purge affected material | Body absent from result/release/manual fallback; forbidden derivatives cleared; no bypass via explicit selection |
| C-06 | Advisory budget vs hard cap | Clear distinction; explicit deselect/split; every output package accounts for coverage |
| C-07 | Copy succeeds/fails or export starts | Exact reviewed text; accurate clipboard/download wording; never Send success; no clipboard read |
| C-08 | LocalOnly/externalAccess off | Existing permitted manual Copy/Export semantics preserved; automated cloud blocked |
| C-09 | Task/selection expires or tab closes | No phantom persisted Context; safe warning/recovery only as actual owner supports |
| C-10 | Historical text contains tool instructions | Treated as quoted data, never current authorization or executable app instruction |
| S-01 | Stored locale/font-size/dark preference | Preserved; failed setting visibly rolls back; no mixed UI language by accident |
| S-02 | Backup/import interruption or invalid format | Existing library/revisions/tombstones safe; no Import=Sync confusion |
| X-01 |1440/1280/1024/768/320px and200%text | No hidden task action/page horizontal scroll; compare stacks; focus unobscured |
| X-02 | Keyboard-only all critical journeys | Actions reachable; dialog contained/return; no drag-only or color-only control |
| X-03 | Reduced motion or editable content active | No decorative transforms/blur/scroll; no semantic/layout change to live editor |
| X-04 | Fixture100kInputs/10kConversations, long session | Actual performance measurements with declared device; no screenshot-based scale PASS |

## Meaning fixtures (not a live-model certificate)

1. Uncertainty: `我可能更适合做消费产品，但现在样本还太少。` must not become `我已经决定做消费产品。`
2. Negation: `我并不认为所有工具都需要自动替我做决定。` must not lose the negation.
3. Causality: `这可能与上次试用有关。` must not become a proven causal assertion.
4. Emotion: `我有一点失望。` must not become `我非常失望。`
5. Time: a2026correction cannot be attributed to2023. Unknown dates stay unknown.
6. Authorship: `访谈者说“我不愿意使用它”，我还没做判断。` is not the user's own refusal.
7. Conditionality: `只有能撤回时，我才愿意提供。` cannot become unconditional consent.
8. Conflict: two incompatible dated opinions remain traceable; no synthesized resolution is invented.

Mechanical tests cover presentation/guards, not semantic model quality. Actual generated outputs require the independent authorized review described by DFG-CPV1-009. User Keep-current is protection, not a substitute for model quality acceptance.

## End-to-end acceptance

Open synthetic2023Input → select exact uncertain sentence → add to existing职业方向 → browse later contradictory statements → request scoped organization → reject over-certain transition → build a new local Context task using explicit materials → optionally add one retrieved supplement → redact → mutate one source → observe stale block → re-review → Copy exact current approved text. Prove Original unchanged, no automatic provider send, no hidden selected tail omitted, and retained correct navigation/drafts across each step.

## Package validation vs runtime validation

Before design PR: all local links/assets/route IDs exist, required sections and fixtures consistent, frozen logo derivative hash recorded, allowed-path diff only. Reference HTML may be rendered at declared widths with browser console/overflow checks. This is SPECIMEN_RENDER evidence only; it does not implement or certify the table above. Implementation must run actual production functions and the current required CI/browser/privacy/release gates.
