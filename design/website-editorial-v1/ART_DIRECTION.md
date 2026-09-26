# Art direction — Continuous Editorial

## The idea

The site should feel like a carefully arranged page about a person's unfinished thinking: part editorial spread, part desk of selected fragments, part landscape seen through an opening. It is **not** an administrative archive, analytics console or a template for an AI assistant. Restraint applies to noise, not to composition.

The visual rhythm is **dense object / quiet field / editorial sentence / newly arranged object**. Whitespace is an active shape. Do not fill it to make the page look busier. Do not repeat the hero collage unchanged in every section.

## Ten non-negotiable characteristics

1. **Asymmetric first viewport.** Copy occupies the left, but the right is one composed scene, not a grid of self-contained feature cards. At 1440, the source scene extends roughly x596–1395 and y105–687. It has its own internal depth and edge notes.
2. **Actual photography.** Coast, pale architecture and botanical light are three different photographic roles. They remain visible as photographs, not beige rectangles with words. Their muted tonality links them to the paper palette.
3. **Unequal sheets and interrupted edges.** A source paper, selected note, photograph and main context paper have different dimensions and different positions. Real occlusion is intended; identical radii, shadows, sizes and baselines are not.
4. **Serif display / sans working language.** English display uses the locked EB Garamond 12 family; functional text uses Inter. The contrast is structural. Do not silently replace display type with a system sans. Chinese uses Noto Serif CJK SC against Noto Sans CJK SC; no synthetic Chinese oblique.
5. **A phrase can change texture.** The English “what’s next” and selected editorial phrases use genuine italics. Their shapes and line endings are intentional. Do not turn the entire heading into italic or bold.
6. **Fine connectors, not a network diagram.** Bézier paths run behind papers, end in restrained dots and relate specific fragments. They do not become thick arrows, neon paths, a web of nodes or perpetual motion.
7. **Edge annotations.** Spaced uppercase marginalia are visually small and function as annotations, not section headings. Meaningful content has a legible alternative. Their presence and approximate positions are mandatory.
8. **Nearly absent containers below the hero.** The first value row uses hairline dividers, not three bordered feature cards. Use-case entries are staggered typographic folios. Legal text is a readable column, not a dashboard.
9. **An irregular but controlled page rhythm.** First composition → three light columns and an arched manifesto → original/working relationship → four-stage continuation → staggered use cases → paper-toned working versions → user-control composition → quiet questions → final landscape note. Section heights and pauses are part of the work.
10. **Mobile has an art direction.** It retains the photo/overlap/annotation vocabulary in a new composition. It is not the desktop shrunk to illegibility or the photo layer deleted. Primary actions and body copy remain normal HTML in future implementation.

## What can vary

CSS layout primitives, file organization and component extraction are engineering decisions. Grid and flexbox are not forbidden. Flattening the resulting composition is forbidden. Responsiveness can move a foreground paper, rewrap a paragraph and simplify redundant decoration only where the supplied mobile board or explicit responsive rule permits it.

## What is not a fallback

No generic SaaS cards, bento dashboard, chat composer hero, giant glowing orb, sparkles, decorative network, fake browser screenshot, gradient blob, monochrome card grid, invented social proof or entire-page raster image. No “performance simplification” that removes photographs before optimizing their size and loading strategy. No universal card primitive that forces every paper into identical proportions.

## Photography treatment

The locked image files already contain the intended muted grade. Do not apply that grade again in CSS. The geometry manifests preserve crop windows in source pixels. Use object-position or an equivalent crop that reconstructs those windows. Do not regenerate the imagery with a new image model or query a random photo endpoint. For the supplied reference's exact originals, provenance was not established; the manifest's replacements are explicit choices, not claimed identical originals.

## Page-specific variations

The homepage is the most layered. How-it-works is four generous chapters. Use cases look like an index of ongoing questions. Detail pages contain before/after reasoning, not fabricated customer outcomes. Our story is a three-part editorial statement. Journal uses a large lead photograph and ruled article rows. Articles have a narrow reading measure, a marginal note and one pull quote. Beta makes the form straightforward without letting it erase the visual identity. Trust and legal pages prioritize actual boundaries and legibility over decorative security symbols.
