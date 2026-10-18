# R3 design decision

## Selected: shared corner + relocated existing tool row

The corner is not a circle partly covered by an opaque panel. A single painted shape ends at the original anchor's right/bottom edges. Its lower-right24px radius has the same center as the original48px circle, so only the original quarter arc remains as the board's outer contour. The rest of the circular outline disappears into the same surface. The full target and double-card glyph remain unchanged.

The content conflict is solved by **reallocating the old header**, not by adding an empty footer, shrinking rows or reserving a narrow region in the last expression. The old43px top tools become a48px bottom tool row. Border2 + six rows264 + list breathing space14 + tools48 =328px. The list is clipped to six complete rows at normal size, without the seventh row's separator peeking through. The tool row's content receives a1px optical baseline correction through2px top padding; the anchor is not shifted.

The capsule retains R2's272×48 stadium. One skin grows from the same fixed corner; board text is a clipped content layer, not another painted rectangle. The quarter arc remains24px during all transitions. No new ornamental gradients, shadows, symbols or glyph design were introduced.

## Actual alternatives

A — **local shared corner / last-row reservation**,336×324. The top toolbar stays. The corner consumes only the final row's trailing56px. It is a serious compact alternative and was rendered, but narrows that expression and displaces its more-action position. Long content is more often ellipsized; a scrolling list would also require continually deciding which row gives way. Rejected in favor of consistent equal-width rows.

C — **fully embedded control with a new footer**,336×360. The old top toolbar stays and a48px band is reserved below the list. It avoids hit conflicts but creates a mostly empty row beside the corner control. Rejected: this is precisely the extra48px-footprint solution the owner disallowed.

R2 — separate336×312 board plus48px circle and8px gap. Still a clean fallback and the prior exact HTML was rendered for comparison. It has a336×368 total envelope and two objects. The selected328px single object is40px shorter overall. This is a geometry comparison, not a claim that it never occludes chat text.

## Explicit costs and limits

The search field and tools move from top to bottom; this is a deliberate interaction-location change. In the prototype their labels, actions and same-board views remain intact, with DOM order matching visual order and keyboard focus checked. Production adoption must validate the existing header/query/focus owner rather than copy demonstration state logic.

The default surface has no instructional tooltip or native title. It still has a quiet functional toolbar label inherited from the original header, invisible accessible names, error feedback and active user-opened views. Those are not explanatory popup hints.

The decision is based on self-inspected actual offline light/dark/long/narrow/editor renders and scoped component checks, not a user-preference study or an independent reviewer. Browser-policy denial prevented direct file:// navigation in the managed renderer; the exact self-contained HTML was rendered and exercised with page.set_content. That direct-opening claim remains BLOCKED. No current real ChatGPT or installed-extension acceptance is inferred.
