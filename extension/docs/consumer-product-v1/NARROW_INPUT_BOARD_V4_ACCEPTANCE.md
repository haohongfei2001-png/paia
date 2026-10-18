# Floating input — R3 acceptance within the existing NIB matrix

**PAIA-FLOAT-UI-1.3 / R3 / 2026-10-18.** Current [SPEC](NARROW_INPUT_BOARD_V4_SPEC.md) and [ADOPTION](NARROW_INPUT_BOARD_V4_ADOPTION.md) govern. This file defines expectations; it does not claim tests ran in the production extension.

The full predecessor is preserved in [PRE_R3](NARROW_INPUT_BOARD_V4_ACCEPTANCE_PRE_R3_2026-10-18.md), exact blob `f167c44adecd65feb54de9b8759ed2123e14d8b5`. All nonconflicting environment, fixtures, G/Q/U/M/A/E cases, F04–F07/F09/F11/F12/F14, historical results, entry-replacement and evidence rules remain incorporated in full. Only the finite expectations below change. No assertion about unchanged privacy/data/receiver behaviour, threshold, timeout or corpus is relaxed.

## Revised geometry and existing visual cases

| Case | Required R3 result |
|---|---|
| G01 | Ordinary circle48×48, unified capsule272×48 and fused board336×328; correct shape/frame bounds recorded separately; only genuine narrow space constrains them through the existing owner |
| G02 | Same ordinary board size in list/search/details/edit/loading/error/empty; six equal44px rows above the existing relocated tools; internal overflow, no fake rows or partial seventh at default settled view; accessible scaling can show fewer rows |
| G03 | Same48×48 toggle bounds and original center across states; board right/bottom coincide with anchor; BR radius24 and arc center(312,304) in336×328 board; safe composer-relative gap/inset/growth/restoration retained |
| F01 | Native-size source/release light/dark matches exact R3: one skin, fused quarter-circle corner, no separate board/orb rim, neck,8px board gap, bump/tail or new mark; unified R2 capsule retained |
| F02 | Exactly two equal21×14 landscape cards, radius3.25; no rotation/skew; fixed foreground; rear offsets(-2.5,0),(-5,0),(-5.25,-1.5); source palette/edge roles retained at DPR1/2; no opaque block or new decoration |
| F03 | Existing title/search/more/back moves to the useful48px bottom tool row in DOM and visible order; six equal-width expression rows and7px block breathing space; no duplicate top toolbar, empty48px footer or narrowed last row; same-board management remains reachable |
| F08 | Complete composer growth, narrow/short view, text enlargement, true shortage and recovery preserve safe placement and logical view/query/dirty work; new328px envelope is used; no host resize or geometry-only remount |
| F10 | All six mode-transition directions keep target/front/right/bottom/BR radius fixed; skin and content clips agree throughout120/80ms motion; reduced motion0; no late clickable gate, idle motion or restored delayed hints; original local inserted/focus feedback retained |
| F13 | Entry opens and closes at original pointer coordinates; capsule text inserts and right48px toggles without overlap/dead neck; board corner closes without stealing any row/tool/editor action; collapse returns to preceding collapsed form |

## Explicit R3 regression additions

| ID | Scenario | Required result |
|---|---|---|
| F15 | Hover/focus entry, rows and bottom tools beyond old delay; switch mode/theme and re-render search/list/details | No custom tooltip element, delayed instruction bubble or native-title hint; no substitute title fallback. Invisible aria labels/control/expanded state, visible keyboard focus and genuine errors remain. User-requested full text is still available. |
| F16 | Mouse and keyboard open; bottom search, Back, more, edit/save/cancel; dirty leave; long error and short viewport | Logical read/tab order agrees with relocated tools; useful content focus on keyboard open; full48px corner target and all Save/Cancel/row-more center-and-corner hits remain reachable and distinct; no error/status overlap |
| F17 | Source/release native frame projection, fixed-point open/close during parent resize, actual painted/transparent regions | No invisible rectangle intercepts unrelated host controls, private text leak, duplicate frame, arbitrary event forwarding or wrong receiver. Rounded/transparent iframe pixels alone are not accepted as click-through proof. |

F15 replaces old required650ms tooltip expectations; it does not delete the test scenario. F03/F16 replace top-tool placement expectations. G01/G02 replace immutable312px board expectations. F01/F13 replace neck or separated-board expectations. Keep historical frozen references/results intact and update current visual expectations only for these approved deltas; do not recolor old evidence as a new pass.

## Retained behaviour and evidence

All existing Q/U/M/A/E requirements and F04–F07/F09/F11/F12/F14 remain: shared150/151 graphemes, non-destructive long originals, full-history/later-page/long-only/partial search, first-click complete eligible insertion, selected wording/IME/native undo, current body/receiver/revision/permission, one effect/held-key suppression, UNKNOWN/no replay, source removal/purge, caller/privacy and AI financial admission. Six rows never imply a six-item data cap. No-send and no default clipboard fallback remain absolute.

Record exact source/release/head/tree, selected source subtree, environment/viewport/zoom/DPR, normal-size and whole-host light/dark visuals, motion samples, target bounds/hits and all failures. Use the full executable reference and original screenshot identities; the checked-in720px thumbnail is a navigation preview, not native-size evidence. Compare actual source/release composition, not a synthetic textarea demo, for insertion/undo/private-frame claims.

Source R3 evidence is historical **30 prototype regression PASS,19 fusion PASS,1 direct-file navigation BLOCKED** in Chromium144.0.7559.96. The earlier fusion report's environmental failure and final explicit blocked classification remain distinct; the direct-file probe was never passed. This adoption only verifies source/artifact hashes and deterministic HTML rebuilding, not a rerun of those browser cases. No physical120Hz, real p95, OS IME/spoken screen reader, provider quality or sustained human-comfort outcome is inferred from the prototype. Warm p95<=50ms stays an optimization target. Apply existing independent/native review where the actual integration changes trust or input boundaries; unchanged qualified evidence keeps its original scope.
