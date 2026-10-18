# PAIA floating input — R3 fused control corner

**PAIA-FLOAT-UI-1.3 / R3 / OWNER_APPROVED / 2026-10-18.** Exact approved source and artifact identities are in [REFERENCES](NARROW_INPUT_BOARD_V4_REFERENCES.md). Read [ADOPTION](NARROW_INPUT_BOARD_V4_ADOPTION.md), [PLAN](NARROW_INPUT_BOARD_V4_PLAN.md), [ACCEPTANCE](NARROW_INPUT_BOARD_V4_ACCEPTANCE.md) and [INTEGRATION](NARROW_INPUT_BOARD_V4_INTEGRATION.md).

The complete former SPEC remains in [PRE_R3](NARROW_INPUT_BOARD_V4_SPEC_PRE_R3_2026-10-18.md), exact blob `00e5d0703421e0cdf96a3be93288d0aba3e92e07`. **All nonconflicting product, owner, privacy, search, manual-work, admission, lifecycle, restoration and entry-replacement requirements remain mandatory in full**, including its earlier archives. ADOPTION identifies the only replacements.

## 1. One component and one fixed control point

This is PAIA's personal expression-reuse surface, not a second assistant/composer, marketplace or primary app. It inserts existing lawful text into the current receiving composer after validation; it never sends it.

Collapsed circle, recommendation capsule and expanded board share the same **48×48px interaction rectangle**, center and foreground card. Orb and capsule remain alternative collapsed presentations, not mandatory intermediate steps. The original point opens the board and closes it back to the preceding collapsed form. State transitions must not relocate, shrink, obstruct or replace that point.

A fixed interactive region does not require a permanently drawn circle. The circular contour becomes the capsule's right end, then the board's shared lower-right corner. In the latter two states there is no second circle background, border or shadow pasted on top. Its accessible button and48px target remain distinct from text/content actions.

## 2. Exact selected geometry

| State/region | Approved ordinary CSS geometry |
|---|---|
| Collapsed |48×48 circle; radius24; same48px target |
| Capsule |272×48 stadium; radius24; text action224px and fixed right48px toggle; no permanent divider |
| Board |336×328; radii TL/TR/BR/BL =18/18/24/18; right and bottom edges equal the anchor's right and bottom |
| Board control region | In board coordinates, left288/top280/right336/bottom328 |
| Shared outer arc | Center(312,304), radius24; the original circle's lower-right90-degree arc, tangent to the board's straight right/bottom edges |
| Default list | Six complete equal44px rows;264px viewport;7px top and7px bottom breathing space |
| Existing tools | Relocated48px bottom row, with right55px reserved for the fixed toggle and safety clearance; no duplicate top header |

These are the selected executable R3 parameters, no longer merely estimates from the earlier raster. Use the exact scoped [tokens](design/narrow-input-board-v4/fusion-r3-2026-10-18/tokens.json), fusion CSS and skin SVGs. The normal budget is **2px borders +264px rows +14px breathing space +48px existing tools =328px**. Do not add another footer, compress text/rows, narrow the last row or trade its more action for the control corner.

One skin owns the external fill, border and shadow. Circle→capsule→board extends left/up from constant right/bottom edges. No neck, gourd, bump, tail, cutout, independent ring, intersection seam or R2 gap remains. Quiet internal row separators are not a second external shell.

Normal0/1/3/6/many/loading/error/search states retain one ordinary board size; six is visible capacity, not a data/query limit. Additional results scroll within the list, with no partial seventh row at the default settled view. Accessibility enlargement may expose fewer full rows, and genuine space shortage may constrain the interior; neither permits silently deleting content or shrinking controls.

## 3. Double-card identity and material are unchanged

Exactly two equal21×14px landscape cards, radius3.25, remain front-facing and unrotated. Retain R1's exact six light/dark SVG assets and scoped palette roles. Foreground coordinates in the48px glyph stay x14.75/y17, with its existing optical placement. Rear offsets relative to the foreground are **(-2.5,0), (-5,0), (-5.25,-1.5)px** in collapsed/capsule/board. No state-dependent recentering, resizing, third card, arrow, inner text or new mark.

Use restrained gray-blue/slightly lavender translucent layers, fine edge light and soft separation. The circle and content surfaces remain one near-neutral material family. Source `tokens-r1.json` is inherited only for glyph/palette/nonconflicting roles: its old board, neck and tooltip values are not current authority. Dark adaptation now follows the selected R3 dark prototype rather than a hypothetical new dark design.

No host recoloring, excessive blur, luminous border, colored haze, textured glass, heavy reflection or idle animation. Preserve opaque/reduced-transparency, forced-color, reduced-motion and visible keyboard-focus adaptations through existing owners. No live backdrop sampling of private host content is required to reproduce the material.

## 4. Relocate existing tools, not their behaviour

The existing header/title/search/more group moves to the bottom tool row. Search occupies that same area when invoked; detail/edit/back/management remain internal views. Move the DOM/read/tab order consistently with the visible layout rather than relying only on visual flex reordering. Keyboard opening still reaches useful content; search remains keyboard-accessible. Preserve exact query, origin/Back and dirty-work restoration.

The six expression rows above remain equal width. No titles/summaries, repeated card/category icons, scores, dates, frequency labels, shortcut badges or decorative row containers. Existing optional full-text, edit/create/delete/pin/order/hide/restore/split/representative and long-expression continuation stay reachable. R3's six examples are demonstrations, not a production corpus or ranking.

Editor Save/Cancel and necessary persistent errors stay within the normal content flow, clear of the bottom tools and48px control. Test their corners as well as centers. Do not place an error over the buttons, discard dirty work on collapse or use the invisible remainder of a large frame as a catch-all control.

## 5. No extra hints

Remove the custom tooltip element, delayed-hover/focus hint CSS, tooltip update logic and native `title` tooltips on the entry, rows and action controls, including after state changes and re-render. Do not replace them with another label bubble, hint arrow, instruction badge or onboarding popover on this surface. Do not hide a duplicate tooltip merely with opacity while leaving a focus-triggered fallback active.

Retain invisible `aria-label`, `aria-controls`, `aria-expanded` and live-status semantics; normal hover/pressed/focus feedback; deliberate search/details/management content; and genuine failure, empty-data or unsaved-work handling. 'No hints' is not permission to suppress errors or make the interface inaccessible. Existing required onboarding/permission entry flows elsewhere in the product are unchanged.

## 6. Composer-relative placement and motion

Reuse the original position/layout/reset and authenticated frame owners. The48px anchor stays above/outside the complete composer with the existing12px safe gap and compatible right inset (desktop4px, narrow0). Composer growth moves the component coherently; changing state at identical composer geometry does not move the anchor. Observe the full composer/top controls in one visual-viewport coordinate system. Never resize the host to manufacture room.

The board's combined envelope is now336×328, not R2's336×368. Recalculate actual safe space accordingly. Preserve logical view/query/dirty work through constrained/entry/hidden fallback and restore it when room returns. A geometry-only change must not create a new scheduler, preferences store, model request or private-frame remount.

Retain **120ms opening,80ms closing, cubic-bezier(.2,.7,.2,1)** with matched skin/content clipping. Right/bottom edges, the full toggle rectangle, foreground card and24px bottom-right radius remain stationary throughout all six transition directions. No scaling text, bounce, rotate, overshoot, whole-carrier translation, mismatched clipping or animation-completion gate on clicks. Reduced motion uses0ms nonessential transitions. Existing local inserted feedback/accessibility remains, without an additional tooltip/toast/composer glow.

## 7. Full functional and trust boundaries retained

First intentional eligible row/capsule click validates current body, permission and receiving target, inserts the exact full expression, verifies the effect and returns host focus. Display ellipsis/newlines do not add mandatory CHECK_TEXT or a second insert/copy choice. Optional details and precise selected-range operations remain optional.

One shared<=150-grapheme policy governs admission and final use;150 is eligible,151 is not. Preserve long originals, IDs, human metadata and edits without silent truncation, AI rewriting or destructive migration. Query full qualified lawful history through its original ranking/snapshot/cursor owner before quick projection; retain later-page, long-only/partial truth and PAIA continuation.

Retain original typed services and Family/Manual/History/Reply boundaries, human order/protection, Source/Working/tombstone/purge, revision/CAS/restore, current receiver/document/conversation/permission checks, caret/prefix/suffix, selected wording with insertion at its valid end, IME/conflict protection, held-key/double-click suppression, one-operation/one-effect identity, UNKNOWN/no automatic replay and native per-host undo. No automatic Send, default clipboard fallback or wrong-editor/tab selection. Board insertion/blur/scroll/idle does not close or reorder it.

A rounded or transparent iframe pixel does not by itself pass through pointer events. Actual painted/interactive regions must remain qualified through the existing host/private-frame projection; no arbitrary event forwarding, private text exposure, new privileged frame or replacement insertion engine. Original S3 live-service/budget/entitlement and S4 safe-entry replacement requirements remain in full.

## 8. Approval versus implementation

R3's30 prototype regression passes,19 fusion passes and1 environment-blocked direct-file probe retain their original scope and identity. This adoption verifies references, not production runtime. Source/release fidelity, real host hit/focus/input/undo/privacy, browser zoom/OS IME/screen reader, physical120Hz, actual cold/warm latency and sustained use remain separate requirements. Warm p95<=50ms is an optimization target, not an outcome inferred from artwork.
