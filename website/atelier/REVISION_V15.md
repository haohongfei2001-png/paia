# PAIA Thought Library — V15 official visual correction

Owner feedback, 24 October 2026: the published spatial homepage is not good enough. This release fixes a real regression in V14: a roughly three-viewport sticky scene created extensive visually empty scrolling and over-prioritized a translucent container, making topics and reading appear too small.

## Product intent

The page illustrates one existing Topic/Section with exactly two dated fictional original inputs, newest first. Other topics are titles and chapter directories. We do not add card abstracts, provenance controls, search, relationship graphs, automatic AI conclusions, an editing mode or a new product feature. The content is cloned from the pre-rendered V13 semantic fallback. The fallback remains if scripts or assets fail.

## Art direction and behavior

Replace the sticky 300vh stage with a normal-length editorial folio: one coherent glass housing with a restrained bevel and unified light, rather than three miniature glass cards orbiting in a large empty area. A typographic directory shares space with a large matte reading surface, and every original paragraph remains readable. A restrained single Chinese character and mathematical fine lines belong to the environment, not the content surface.

Motion is limited to a short native-scroll-driven perspective correction. There is no scroll lock, multi-screen sticky scene, hidden essential content or idle animation. Reduced motion disables the camera effect. Mobile displays a compact three-topic row above a complete section.

The original logo, hero, manifesto, Context quartet and permissions, approved R3 geometry, privacy artwork, demo, help/contact and installation availability remain unchanged.

## Ownership, evidence and limits

The existing presentation13 entry imports a new spatial-folio15 module only for the #thoughts section. Two fixed same-origin no-credentials assets supply a declarative HTML fragment and scoped CSS. Shadow DOM prevents leaking visual CSS to the Context cards or product controls. No arbitrary fetched code is executed, and there is no data storage or account access.

The new spatial_folio15_checks checks the actually painted scene, source-text identity, reasonable section length, responsive topic row, readability, menu/keyboard, Context consent and R3, plus motion preference. Historical V13 semantic fallback and exact scope locks remain.

This is website visual evidence, not installed-extension certification, user research, real-account connectivity or a substantiated claim of surpassing Craft or mymind.
