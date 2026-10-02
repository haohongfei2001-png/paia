# D5 — Visual Convergence & Product Acceptance

Status: **OWNER_APPROVED / QUEUED_AFTER_D4**  
Owner decision: 2026-10-02.  
Execution prerequisite: D4 required verification + merge + exact-main integration.  
Product meaning: unchanged. This is a production visual-conformance and legacy-style-retirement slice.

## 1. Why D5 exists

D1–D4 intentionally prioritized route/state ownership, editing/recovery, trusted domain boundaries, Topic chronology, staged AI adoption and Context review/release correctness. Those are necessary but not sufficient. A structurally correct page can still visibly remain the legacy PAIA product.

D5 closes that gap. The owner requires the actual extension to **highly reproduce the approved Desktop vNext design**, not merely approximate its information architecture. D5 is therefore a blocking product-completion gate.

Desktop vNext is NOT complete when:
- the right route/state owner exists but the screen still visibly looks legacy;
- screenshots have no clipping/overflow but hierarchy/spacing/brand/density differ materially;
- unit/browser/privacy/release CI is green but canonical screens are not visually reproduced;
- a generic SaaS/Finder/Mail/ChatGPT visual interpretation replaces the frozen PAIA language.

## 2. Authority and non-negotiable boundary

Read, in order:
1. current remote main + STATUS / EXECUTION_PROTOCOL;
2. DVN FROZEN_CONTRACT, SURFACES, STATE_MATRIX;
3. UI_SYSTEM + tokens.css;
4. canonical reference routes in desktop-vnext/screens/index.html;
5. this D5 plan.

Never import the documentation specimen into production. Implement the same approved visual result using real production components and real state owners.

For conflicts:
- behavior/data/privacy/capability truth beats appearance;
- literal declared token values beat guessed pixel extraction;
- canonical reference surfaces govern pure visual composition/hierarchy;
- intentional visual departure needs owner review, not implementer preference.

No Source/Working Input/Thought/AI Candidate/Context/Passport ownership change. No new schema, provider, permission, connector, paid service, semantic claim or destructive policy. If visual convergence uncovers a true behavior defect, split a bounded repair with its own evidence.

## 3. Production surfaces in scope

D5 covers every real Desktop vNext family, not only Archive:
- AppShell / PrimaryNav;
- Archive root, Project/Conversation navigator, Reader, search, selection, editing/save states, overflow, Original, History, Source changes, remove/purge-blocked;
- Thought root, Topic original, dense years, longitudinal view, Add Thought;
- AI Organize scope, running, candidate, compare, decisions, stale, many changes;
- AI Context task, select, retrieve, review, redact, stale, budget, ready, copied, denied;
- Settings, recovery, capture status, import/backup;
- normal, empty, loading, saving, failure, unknown-ack, stale/conflict, partial/degraded, long-text, narrow, dark and reduced-motion states.

## 4. High-fidelity requirements

### Shell and brand
- Use the exact approved PAIA logo asset. No redraw, substitute symbol or generic icon.
- Primary rail / contextual navigator / workspace proportions follow tokens and canonical references.
- No fourth column, permanent inspector, permanent material tray, dashboard or old shell chrome.
- Brand accent is restrained and distinct from selection/focus/danger.

### Typography and reading
- Use the approved typography roles and exact sizes/weights/line heights from the design system.
- Reader/Topic/Context/Compare readable widths follow declared max widths.
- Title, metadata, prose and code hierarchy must visibly match the canonical screens; do not retain legacy heading scale or tool-panel typography.
- Chinese/English rendering must remain deliberate, not tofu, fallback-misaligned or mixed-language chrome.

### Spacing and density
- Use the declared spacing scale and canonical whitespace rhythm.
- Project/Conversation rows, Topic rows, evidence groups, candidate blocks and Context materials must match approved density rather than generic table/card spacing.
- Do not solve visual mismatch by adding cards, rounded containers or shadows absent from the reference.

### Controls and states
- Search, sort, overflow, tabs, selection toolbar, buttons, radios, status, warning and disabled actions match canonical prominence and placement.
- Source/History remain modal/temporary surfaces, never a right drawer.
- Compare is semantic and quiet, not Git diff.
- Ready/Copy/Export states cannot visually imply Send.

### Responsive/dark
- 1440 is the primary wide-desktop conformance target; also validate 1280,1024,768,320.
- At narrow widths use the frozen collapse/stack rules; do not merely shrink desktop columns.
- Dark mode must be a first-class rendering of the same hierarchy, not legacy overrides layered over the new theme.

## 5. Production-to-design comparison protocol

Use synthetic/sanitized fixtures only.

For every representative target, render:
A. canonical reference route;
B. actual production extension route with equivalent synthetic content and state.

Mandatory representative targets:
- A02 Reader;
- A03 Selection;
- A07 Original;
- A08 History;
- T01 Topic root;
- T03 Dense Topic;
- T04 Longitudinal;
- O01 Scope;
- O04 Compare;
- O05 Decisions;
- C01 Task;
- C04 Review;
- C06 Stale;
- C08 Ready;
- S01 Settings.

At minimum compare 1440 light for all targets; selected representatives additionally at1280/1024/768/320 and dark.

Evidence per target:
- production screenshot;
- reference screenshot;
- side-by-side or overlay review artifact;
- computed width/gutter/max-width/control geometry;
- typography roles;
- token color/border/radius/shadow values;
- list of intentional differences with reason.

Deterministic fixed geometry should match declared tokens; unexplained >2px drift in fixed rail/nav/gutter/control/modal geometry is a defect. Dynamic wrapping/content height may differ only because content/locale requires it. Raw pixel similarity is a regression signal, not the sole acceptance oracle; human visual review is required.

## 6. Legacy visual retirement

Audit actual imported CSS and active selectors after each cutover:
- remove obsolete selectors/variables/layout aliases that still influence a D5 Surface;
- do not keep the old visual system under a higher-specificity new override;
- prove one final token/theme/style owner per component family;
- preserve pure utility/accessibility/preferences rules that remain needed;
- retain behavior owners and safety guards even when their legacy presentation is removed.

Deliver a legacy-style retirement ledger: selector/file → replacement owner → proof unused/removed.

## 7. Verification gates

D5 cannot reduce D1–D4 safety coverage. Required:
- affected unit/controller tests;
- current source + built browser journeys;
- privacy/contracts/release/package;
- light/dark/narrow/200%/reduced-motion layout checks;
- keyboard/focus checks on changed controls;
- no regression to IME/draft/selection/recovery identity;
- actual production screenshots from the tested head;
- independent design-conformance review;
- owner visual acceptance.

Performance, physical IME, screen reader, current-live/provider, real-device120Hz and actual-model fidelity keep their own evidence classes. Do not fabricate them from D5 screenshots.

## 8. Owner visual acceptance gate

Before D5 completion, present a concise review set from the exact candidate:
- wide Archive Reader;
- Thought root + dense Topic;
- AI Organize Compare;
- AI Context Review + Ready;
- one modal;
- dark mode;
- one compact/narrow state.

The owner must be able to compare actual production PAIA with the frozen approved design. Material visual divergence is a D5 failure even if CI is green. Record owner acceptance explicitly. Without it:
- D5 != COMPLETE;
- Desktop vNext whole-product != COMPLETE;
- no “final UI” or equivalent product claim.

## 9. Sequencing / rollback

Do not start D5 runtime changes while D4 owns the active production writer. Begin from fresh exact main after D4 integration.

Rollback is presentation-scoped. Preserve all D1–D4 durable revisions, operation receipts, negative intent/tombstones, Topic/AI candidate data, Context authorization/review semantics and safety guards. A rollback may not resurrect retired legacy coordinators, permanent inspector/fourth column, composer, duplicate search or permanent material tray.
