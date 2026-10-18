# Floating input — final double-card acceptance delta

**PAIA-FLOAT-UI-1.2 / 2026-10-18.** [SPEC](NARROW_INPUT_BOARD_V4_SPEC.md) and [ADOPTION](NARROW_INPUT_BOARD_V4_ADOPTION.md) govern. This is an acceptance contract, not a report that tests ran.

The entire preceding matrix is preserved byte-for-byte in [PRE_DOUBLE_CARD](NARROW_INPUT_BOARD_V4_ACCEPTANCE_PRE_DOUBLE_CARD_2026-10-18.md), blob `7832455f0e79b40733467438caa105ab4eb23ab3`. **All nonconflicting environment, fixture, G/Q/U/M/A/E, F04–F07/F09/F11/F12/F14, entry-replacement and evidence rules remain incorporated in full**, including its PRE_JUBAN/PRE_FIXED chain. Historical passes/failures retain their exact identities. This is no coverage, threshold or timeout waiver.

## 1. Explicitly revised geometry expectations

| Case | Current observable expectation |
|---|---|
| G01 | Native layout faithfully implements the selected circle/capsule/board proportions through the existing layout owner. Record visible body and private-frame bounds separately; old272×44/336×312 values are engineering baseline, not immutable B fidelity tokens. Narrow constraints never expand into host controls. |
| G02 | One stable ordinary board size per supported scale for0/1/3/6/many/loading/error/search. Six default expression rows, internal overflow and retained same-board controls; no fake rows or content-count resizing. Accessibility may show fewer rows without shrinking text/targets. |
| G03 | The same circle center, diameter and hit-target rectangle across collapsed/capsule/board at identical composer geometry. Existing12px safe gap and right inset are preserved where actual safe geometry allows. Composer growth moves the whole surface; fallback preserves logical view/query/dirty work and recovers them. |

G04–G08 and Q01/Q02–Q07, U01–U10, M01–M06, A01–A08 and E01–E08 remain as amended by the predecessor unless a precise visual conflict is listed here. Direct use, complete-history query, <=150 eligibility and optional range handling do not revert to earlier mandatory CHECK_TEXT or adaptive-height behaviour.

## 2. Revised visual and control cases

| ID | Scenario | Required result |
|---|---|---|
| F01 | Actual-size light-host three-state comparison against the selected final component image | Permanent circle; exactly two same-size horizontal translucent landscape cards; same foreground size/position; unchanged approved capsule silhouette/junction and upper-left board. No B strokes, diagonal/portrait cards, arrows, repeated row icons, invented shortcuts or host redesign. |
| F02 | Inspect44–50px circle at DPR1/2 and enlarged detail; light/dark/complex backgrounds | Default two layers discernible through narrow left exposure and transparency rather than a solid block. First two states dy=0; capsule left exposure increases; board has only tiny upper-left rear offset. Horizontal edges, restrained highlights/shadows, no third layer, glow, thick glass or state-dependent scaling. Dark/fallback evidence is separately identified. |
| F03 | Six-row default list, hover/press/keyboard, search/details/edit/more/empty | Quiet one-expression rows and readable typography. No new decorative header/row icons/count footer. All existing lawful controls remain reachable in the same board; screenshot omissions do not delete management. Header/control integration does not occlude rows or the circle. |
| F08 | Growing composer, narrow/short viewport,200% text, extreme shortage and recovery | Observe complete composer/top controls. Move the existing shell consistently; do not move the circle merely because mode changes. Safe constrained interior only when needed; logical view/query/dirty work survive. No host-height rewrite, accidental remount or forced sidebar. |
| F10 | Rapid open/close/insert; idle; late recommendations; reduced motion | Same circle and foreground remain fixed during rear-card/shell transitions. No whole-carrier4px/3px anchor drift. Restrained timing, immediate clickability, no bounce/idle animation/frame churn. Preserve distinct hover/press/keyboard/current/inserted feedback, local accessible success and no stale current row after host focus returns. |
| F13 | Activate entry; distinguish capsule body/circle/neck; close board at original pointer coordinates | Circle opens directly and closes at the same point, returning to prior collapsed form. Capsule body inserts only its actual expression and keeps capsule; circle does not insert. Board/circle junction has a continuous clean edge/shadow, but does not obscure or steal the circular target. No mandatory intermediate mode or second widget. |

In F01/F02 use geometric component state assertions in addition to screenshots: exactly two card elements, no transform rotation/skew/perspective, equal card dimensions, unchanged foreground bounds and circle bounds, horizontal-only rear displacement in collapsed/capsule, small upward rear displacement only in board. Preserve fractional rendering precision where useful; do not demand a misleading byte-identical raster across OS/DPR. Material/fidelity review and executable geometry checks are separate evidence.

## 3. Retained functional gates

F04–F07 retain150/151 grapheme policy, non-destructive oversized data handling, complete-history/later-page/long-only/partial query truth and first-click complete insertion. F09 retains actual cold/warm latency/failure/long-tail measurement. F11 retains selected wording, IME, native undo/redo, held activation/double-click and no-send checks. F12 retains current receiver/body/revision/permission, UNKNOWN/no replay, cross-origin/caller privacy and no automatic clipboard fallback. F14 retains actual roughly15-minute repeated-use/reading comfort review with explicit human/device limitations.

All original manual-work, Source removal/purge, revision/CAS/restore, strict caller, independent Next and AI financial-admission cases remain. Six visible rows never impose a search/data cap. Visual simplification does not remove safety or lawful user controls. Changed privacy/frame/input boundaries receive their original independent/native review; unchanged qualified evidence may be reused only with its actual identity.

## 4. Evidence boundary

Record exact source/release/base/head/tree, viewport/zoom/DPR/host/environment, selected-source PNG hash and checked-in derivative hash from the [manifest](PAIA_FLOAT_UI_1_2_REFERENCE_MANIFEST.json). Show ordinary-size controls with the full composer/top-control relationship, not only isolated enlarged icons. Keep dark/reduced-transparency/forced-color adaptations truthful: the approved source is a light mockup, not a complete pretested design system.

Warm p95<=50ms remains an optimization target, not a measured result. JavaScript timers do not establish physical120Hz, and screenshot generation is not a human comfort study. This documentation adoption runs no production/source-release/native/provider suite and establishes no installation. Prior B prototype checks and PR #295's B implementation evidence do not certify the new double-card appearance. Reference inspection/hash integrity and a successful documentation commit prove only their stated documentation scope.
