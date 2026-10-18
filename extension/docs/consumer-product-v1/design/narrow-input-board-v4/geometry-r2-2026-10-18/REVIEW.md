# Geometry decision · R2

## 1. Capsule: remove the connection rather than decorate it

R1's 44px pill attached to a48px circle required a locally narrowed path. R2 uses one272×48 stadium with24px corner radius. The default state is the same element at48×48; expansion keeps its right edge fixed. Border, fill and shadow are drawn once. A width-matched text mask prevents text appearing outside the moving surface. The text itself and front card do not translate.

The right48px remains a separate toggle button. The adjoining224px text target performs insertion. Hover/press and visible keyboard focus distinguish the actions only when used. No separator, additional arrow or idle circular seam is added.

## 2. Board: selected A, clearly separated

A renders a336×312 panel with an8px clear vertical gap and the same right edge as the48px circle. The relation is communicated through alignment, material, direction and the unchanged control. There is nothing to pinch into a neck, and no part of the control can occupy the last row or editor footer.

B was actually rendered, not only described: a rounded panel containing the same fixed circle in a reserved48px bottom control area. Keeping the existing six-row content region requires a360px-high panel. At312px, that region would lose48px; using an extra48px footer preserves interaction but produces a larger, nearly empty surface beside the single control. B's comparison image is retained only as rejected decision evidence. There is no A/B appearance selector in the delivered prototype.

A's cost is explicit: compared with R1's370×346 bounding envelope, the new336×368 envelope is34px narrower but22px taller. Safe-space layout and fallback were updated for that real geometry. A suspended panel still occludes conversational text; the design does not pretend to eliminate this intrinsic tradeoff. The same-point toggle remains available to dismiss it.

## 3. Actual review and limits

The selected light/dark whole-window renders, DPR3 capsule/gap details, narrow view and editor were inspected. Circle center, front-card bounds, text/toggle boundary, clear gap and editor corner targets were checked in Chromium. The card motif/palette was deliberately not refined again in this geometry task.

The final result is a candidate for bounded visual adoption and extraction, not automatic product approval. The prior requirement to preserve the neck is displaced only by the owner's later explicit geometry request. No source-history, privacy, insertion, manual-work or feature-completion requirement is changed.
