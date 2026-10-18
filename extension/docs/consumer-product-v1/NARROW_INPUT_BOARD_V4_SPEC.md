# PAIA floating input — final fixed-circle horizontal double-card design

**PAIA-FLOAT-UI-1.2 / OWNER_APPROVED / 2026-10-18.** Current authority: the last `PAIA_三态悬浮入口_最终精修.png`, identified in [REFERENCES](NARROW_INPUT_BOARD_V4_REFERENCES.md). Read [ADOPTION](NARROW_INPUT_BOARD_V4_ADOPTION.md), [PLAN](NARROW_INPUT_BOARD_V4_PLAN.md), [ACCEPTANCE](NARROW_INPUT_BOARD_V4_ACCEPTANCE.md) and [INTEGRATION](NARROW_INPUT_BOARD_V4_INTEGRATION.md).

The complete preceding SPEC is preserved in [PRE_DOUBLE_CARD](NARROW_INPUT_BOARD_V4_SPEC_PRE_DOUBLE_CARD_2026-10-18.md), exact blob `51df157cab77a267d6725a5869f00e7eb414ab95`. **All nonconflicting product, domain-owner, privacy, search, manual-work, lifecycle, admission, restoration and entry-replacement requirements remain incorporated in full**, including its earlier archives. ADOPTION is the finite conflict ledger. B「句瓣」 is now historical visual evidence, not an alternative active target.

## 1. One input tool, three states

PAIA preserves and reuses the user's own expressions. This entry is a quiet personal input tool on a supported AI website, not an assistant, second composer, prompt marketplace or new primary application. An eligible deliberate action inserts existing lawful text into the current host composer; it never sends it.

The three states are collapsed circle, recommendation capsule extending left, and board extending upper-left. Orb/capsule remain alternative collapsed presentations rather than compulsory steps. Explicit board close returns to its preceding collapsed presentation. **The same circular control remains present, stationary relative to the composer and usable in all three states.** Opening must never replace it with a control elsewhere. The circle toggles open/close at the same point; capsule body insertion remains a separate target.

This is a local entry mark, not authorization to replace PAIA's website logo, app icon, toolbar architecture or global brand. Reference host chrome and sample phrases are synthetic context, not production data, current ChatGPT verification or host selectors.

## 2. Two horizontal translucent cards

Exactly two same-size rounded rectangles sit entirely inside the circle. Each is a front-facing landscape card, width approximately 1.4–1.6 times height, with horizontal top/bottom edges and vertical sides. No rotation, perspective, skew, fan, internal text, line, arrow, third layer or decorative symbol.

The foreground card has the same position, dimensions, corner radius, orientation and layer order in every state. Only the rear card translates. Choose one optical alignment for the entire sequence; do not independently recenter the group in each state and thereby move the foreground card.

| State | Rear-card relationship | Visual result |
|---|---|---|
| Collapsed | Approximately 88–92% horizontal overlap; a very narrow exposed left edge; **dy = 0** | Compact, quiet double layer, not a solid opaque block |
| Capsule | Approximately 75–80% horizontal overlap; larger left exposure; **dy = 0** | Gentle lateral opening inside the unchanged circle |
| Board | Similar or slightly greater left exposure and only a tiny upward displacement | A restrained upper-left response to the board, not a conventional widely staggered copy icon |

For implementation calibration, start with a **48px visible circle**, equal **21×14px cards**, approximately **3px card radius**, and rear offsets relative to the foreground of **(-2,0), (-4.5,0), (-5,-1.5)px**. These are proposed CSS starting values, **not measurements extracted from the raster or an independently approved vector asset**. Refine at actual size within the selected proportions; keep the same geometry across states. Confirm 44–50px circle variants only to accommodate the actual product scale, not a theme picker. The shipped component uses one size, not state-dependent circle scaling.

## 3. Material, edge and visual weight

Use muted gray-blue with a slight gray-lavender undertone. Separate the rear and foreground through translucent fills, a narrow exposed edge, gently different luminance and a subtle overlap tint. Avoid making the default high overlap read as an opaque colored brick. Edge light must clarify the two thin planes without becoming a thick white stroke or neon rim. Shadows communicate separation, not mass.

The circle, capsule and board belong to the same quiet near-white surface family. Preserve the approved capsule's silhouette and neck. Card transparency may be stronger than panel transparency: readable expression text and a clean panel take precedence over glass effects. Do not create bright gradients, colored haze, reflective 3D slabs, grain, continuous glow or blurry text. There is no requirement for a live backdrop filter; existing cross-origin/privacy constraints and performance may require a static translucent material approximation.

The supplied image approves the light appearance. Retain supported dark/forced-color/reduced-transparency modes through existing theme owners; adapt contrast without changing the two-card identity or circle geometry. Dark adaptation is implementation work requiring its own fidelity check, not a supplied approved dark screenshot. Keep distinct hover, pressed, keyboard focus and inserted feedback. The faint default border is not a substitute for a visible keyboard focus indicator.

## 4. Fixed anchor and shell relationships

Keep the current composer-relative position/reset owner. The anchor stays outside and above the complete composer, near its right edge. Retain the existing safe **12px bottom-to-composer gap**, desktop **4px right inset** and **0px inset at <=530px** where compatible with actual safe geometry. Composer growth moves the whole surface consistently; a fixed anchor means fixed across state changes at the same composer geometry, not a frozen screen position when the composer moves.

Use the same center, diameter and hit-target rectangle in all three states. No hidden close target behind the board, altered target after expansion, shrinking capsule mark in place of the circle, or pointer jump. Keep the circle in a stable coordinate space during parent-frame resize and shell animation. The board may visually meet it without consuming its click area. A connecting neck must not accidentally insert a phrase or intercept the toggle.

**Capsule:** preserve the selected pill outline, text spacing and small circle connection; extend to the left. Do not introduce arrows, notification dots, extra capsule labels or a redesigned merge merely to make the cards fit. Its text is one actual current reusable expression, not sample copy. Body click uses that expression; circle click opens the board.

**Board:** open above and left of the same circle. Refine only the visible lower-right joining region: continuous tangency, restrained negative space, no pointed notch, long stem, doubled edge or dark shadow pile-up. The circle must still read as a distinct round control. Do not draw two complete overlapping opaque borders through the connection. Match material and shadow direction; keep the circular button above the junction where necessary for a reliable target.

The current 272×44 capsule and 336×312 board are **existing implementation baselines**, not immutable measurements of the new artwork. Preserve the approved external proportions and native readability; reconcile only the necessary circle/body/frame-envelope dimensions in S0. Do not confuse a visible rounded board with the rectangular private-frame bounding box that also contains its circle. Keep one ordinary fixed size per supported scale, six default expression rows and internal overflow; result count/loading/empty/search must not cause ordinary content-adaptive resizing. Accessibility enlargement and genuinely insufficient safe space retain their existing constrained-interior and restoration rules. Do not modify the host composer to manufacture room.

## 5. Content and retained controls

Keep one expression per row, quiet separators and current readable text roles. Existing 14px text/22px line-height and useful row/control target sizes remain the functional starting point. No semantic category icons, repeated card marks, titles/summaries, dates, scores, counts, shortcut badges or separate decorative row cards. Six is a visible-window capacity, not a storage or query limit.

Retain the existing same-board search, optional whole-text/range view, editing, more and complete lawful manual operations. The clean six-row illustration does not authorize deleting unpictured controls, inventing a new permanent toolbar or removing dirty-work guards. Integrate necessary controls discreetly through existing views and focus ownership. Preserve background-order freeze while open. Insertion, blur, scrolling, idle and late recommendations do not close or reshuffle the board.

## 6. Interaction and safety retained in full

Normal eligible use is first intentional click → current content/permission/receiver validation → exact complete insertion → actual verification → host composer focus. Ellipsis or newlines do not require CHECK_TEXT or a second insert/copy choice. Optional details remain optional.

One shared <=150-grapheme policy governs all applicable admission and final-use routes. 150 is eligible; 151 is not. Preserve long originals, IDs, edits and human intent; do not silently trim, summarize, migrate away or rewrite sent history. Search the complete qualified lawful historical corpus through its existing ranking/snapshot/cursor owner, then project quick-eligible results. Preserve later-page results, long-only/partial truth, PAIA continuation and exact Back restoration.

Keep the original typed service/resolver, Family/Manual/History/Reply distinctions, authenticated private frame and single insertion arbiter/ChatGPT adapter. Preserve current target/document/conversation/revision/authorization checks, caret/prefix/suffix and **selected draft wording: insert at a valid selection's end, never replace it**. Retain IME/conflict guards, double/held-key suppression, one-operation/one-effect identity, truthful UNKNOWN/no automatic retry and real per-host undo/redo. No wrong-tab/editor fallback, automatic clipboard disclosure or Send. Preserve Source/Working, tombstone/purge, CAS/revision/restore, human pin/order/edit/hide/split and all S3/S4 provider/entry gates.

## 7. Motion and evidence

Animate the rear card as the same element rather than replacing three unrelated icons. Its foreground and the circular target remain fixed while the shell changes. Use existing restrained timing as the starting point (120ms open, 80ms close); the earlier 4px/3px carrier translations must **not translate the fixed circle or foreground card**. Any translated reveal is confined to the appropriate noninteractive visual layer. No bounce, overshoot, idle movement, frame remount, blur animation or delayed clickability. Reduced motion removes nonessential movement. Preserve approximately480ms local inserted feedback and650ms delayed entry tooltip without extra toast/composer glow.

Inspect actual-size 44–50px circles, DPR1/2, ordinary light/dark/complex host content, increased composer, narrow viewport and enlarged text. Functional tests alone do not prove visual fidelity; enlarged artwork alone does not prove native legibility. The original cold/warm latency, warm p95<=50ms optimization target, physical120Hz and sustained-use gates retain their stated scope and must not be marked passed from this image. This adoption is **DESIGN_APPROVED / PLAN_UPDATED; implementation, native fidelity and installation remain unverified by this change**.
