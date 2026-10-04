# D5 — Thought page and writing appearance

Status: IMPLEMENTING; base `5d7440d86dbee9c9994302915f162567f971a747`. Actual candidate screenshots and integration are pending.

## Visible result

The Topic heading, Write action, existing AI-view switch and management controls form a compact title area. Content/Years tabs retain the frozen spacing; source/order controls remain a quiet secondary row. The switch uses one token-based visual owner instead of the old green pill and two competing thumbs. Real Undo, more actions, provenance and current-state feedback remain present.

Writing uses the approved T05 heading, text, control and action roles: optional Topic before the same literal textarea, then Save/Cancel/Copy. It deliberately retains the existing native dialog, Close control, backdrop, dismissal guard and invoker focus. Full-window screenshots must show that actual hierarchy. This is not a completed T05 main-workspace route or acceptance of PR132's failed origin-return behavior.

The owner explicitly prioritized appearance before unfinished functionality on 2026-10-04. Complex atomic Reader/Topic return preparation is preserved separately and does not enter this change. Q7–Q12 remain adopted.

## Frozen design and retained differences

Authority: [D5](../../design/foundation/desktop-vnext/D5_VISUAL_CONVERGENCE.md), T02–T05 in [SURFACES](../../desktop-vnext/SURFACES.md), and `screens/specimens.js` Topic/Add Thought routes.

- Preserve current authored title, current date/source truth and saved reading size/width. Do not insert the specimen's fabricated year range or replace real optional Topic controls with a static dropdown.
- The actual AI-view switch is not a direct generation link. It retains existing Original/AI presentation and first-generation semantics.
- Existing overflow and Undo/Redo controls are absent from the minimal specimen; they stay visible in the same command-owner boundaries.
- Content year-navigation composition remains open. The existing Years page keeps real known/empty/unknown-year behavior.
- The writing dialog's container/padding and Close affordance remain a truthful modal difference. Its text/controls match the declared writing roles; no screenshot crop hides the backdrop.

## Style ownership retired

- `archive.css`: 17 active `#library-view-switch` / `.ai-toggle-label` rules, including repeated dimensions/gaps, green colors, pill border and forced margin, move to the Thought stylesheet.
- `experience.css`: eight further switch/label/thumb/responsive/reduced-motion rules are removed. One 34×20 glyph with one14px thumb remains; the label supplies the touch target.
- `thought-reader.css`: replace existing title/toolbar rules and remove duplicate grid overrides. No new high-specificity legacy layer.
- Native dialogs retain their existing modal owner; compose-specific roles apply only while TopicActions marks its current compose surface. Other action dialogs keep their own presentation.

## Verification

Use the existing complete seven-file Topic route (16 cases) plus its unchanged 22-case compatibility selection. Both retain their12-minute budgets and all20 command-owner receipts. No full-suite placement, old registration, assertion or timeout is removed.

Existing source/release Content/Years fixtures retain48 paired width/theme rows and all preferences, body/selection, header and keyboard interactions. Add same-row composition, switch glyph/label, 200% focused controls and full-window top captures. The two existing newer-text acknowledgement cases additionally capture24 writing-role pairs and12 focus/Tab observations before resuming their unchanged real save/retained-draft assertions. Exact-head receipt guards require this evidence.

Independent review checked button ownership: the relocated AI-view host remains outside `#topic-toolbar`, so Topic setBusy cannot override AI permission/pending status. Empty live feedback retains its accessibility node. Language round-trip keeps the approved Write label distinct from the existing dialog heading.

Required before adoption: affected units, complete selected native source/release, actual pixel inspection, contracts/privacy/release and §7.2 light/exact-main integration. Full browser/Mac are not automatically reacquired for this presentation-only cut. Final same-build D5 family review and explicit owner visual acceptance remain open. Public consumer release remains held.
