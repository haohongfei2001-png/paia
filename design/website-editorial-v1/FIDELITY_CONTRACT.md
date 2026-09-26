# Visual fidelity and acceptance contract

## The binding artifacts

For a named frame, the order is:

1. **PNG proof** for the intended rendered appearance.
2. **SVG** for editable paths, images, text, exact line breaks and paint order.
3. **matching geometry JSON** for numerical bounds, source crop, copy ID and Bézier control points.
4. **copy and interaction contracts** for meaning and behavior.
5. **tokens and responsive rules** for the space between supplied frames.

A product-truth change can revise a claim; it does not authorize discarding the scene around that claim. A conflict among these artifacts must be repaired in the design package or recorded as an explicit design change. The future implementer must not silently choose an easier result.

## Critical first-viewport acceptance at 1440 px

- Container left margin 76; first rule y715. Main hero content remains above this rule. The approved composition has air around it; no viewport-filling background or boxed hero.
- H1 origin x76/y291, 64 px EB Garamond 12. The English lines are “Turn what you’ve” and “said into what’s next.”; italic phrase is a separate text treatment, not a different line. Numerical geometry records its actual origin.
- Source photograph roles and central card must all be present. The main PAIA paper is 232×269 at x874/y307. It visually dominates the source papers but not the headline.
- Unequal source papers, two rotated lower photographs, an upper coast plane, fine connectors, endpoint dots and marginal annotations must survive.
- The first benefit region is a three-column ruled layout with an arched manifesto panel, not four identical cards.
- Mobile has the explicitly drawn alternate composition. Cropping the desktop to 390 is a fail.

## Comparison procedure

1. Fix the viewport, locale, DPR=1, browser version and supplied content. Wait for `document.fonts.ready` and all local images; use reduced motion / final state for deterministic capture.
2. Capture the actual HTTP-served website, not a storybook substitute or a static pasted screenshot. Separately test the website without JS; primary content must survive.
3. Compare a full-page thumbnail first. If the visual mass, section rhythm, photography or type contrast is wrong, fix those before chasing small pixel errors.
4. Compare each major section at 100%. Use a 50% overlay and crops around H1, collage, first value row, every photo overlap, form, mobile navigation and footer.
5. Compare landmark bounds from the geometry JSON. At the canonical width, primary text origins, central card bounds and section seams should normally be within 4 CSS px; small decoration within 6 px. Font line breaks and visible text must match. These are engineering targets, not claims that browser text rasterization is identical on all operating systems.
6. Review states: keyboard focus, open menu, open FAQ, invalid form, external form uncertainty, empty selection, stale preview, failed copy, image loading failure, reduced motion and 200% text.
7. Preserve before/after screenshots and explain any accepted deviation by node ID. Do not approve by a single aggregate pixel or similarity score: a missing photograph or flattened scene is a hard fail even if most white background pixels match.

## Hard failures

Any removed photographic layer; reflowing the semantic collage into a normal grid; changed headline family without reviewed replacement; all sheets standardized; primary statement illegible; meaningful text clipped; dead CTA; fake testimonial; unsupported availability claim; hidden mobile content; a screenshot used as the whole webpage; automated test results substituted for visual review; or a runtime modification in this design-only batch.

## Visual completion is separate from functional completion

HTML validity, link checks and accessibility checks cannot certify art direction. Conversely, a matching screenshot cannot certify form delivery, real capture, backup restoration, signed distribution or an AI connector. Report those evidence classes separately.

## The limit of a guarantee

This package removes unspecified design decisions by supplying actual pictures, local assets, exact type/copy, coordinates and states. It does not guarantee a future agent will comply, nor exact text rasterization on every platform. “Implementation complete” requires the comparison above. The owner-approved direction is binding; newly authored pages remain pending the owner's visual review until reviewed, not retroactively approved by a test.
