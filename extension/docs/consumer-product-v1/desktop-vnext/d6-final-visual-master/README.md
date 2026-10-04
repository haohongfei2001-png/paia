# PAIA Desktop vNext — D6 Final Visual Master

**D6.1 · 2026-10-04 · OWNER_REVIEW_PENDING**

This is a proposed final visual system, not a production release or an owner-approved visual baseline. D5 remains the existing engineering stage; it is not renamed or declared complete. D7 is planned and must not begin from this package alone.

## Open the actual images

The finished image bytes are versioned as three binary parts `assets/visual-masters.tar.xz.001`–`.003` (one lossless archive; full SHA-256 in the adjacent file). Run `python3 source/unpack_masters.py` once, or join and extract the archive into this directory, then open `screens/index.html`. This is lossless packaging of actual completed SVG images, **not** a placeholder or a request to generate missing designs. The review ZIP is already expanded and also includes the PNG exports.

Each selection displays one complete application viewport, not a contact sheet. The image package contains **seven self-contained native SVG image documents containing 59 named artboards**: 48 light states, four dark masters and seven compact/reflow masters. Every artboard also has a separate standalone SVG. The accompanying review package includes59 separate full-window PNGs.

These are final-design drawings with literal positions, text, typography, colors, controls and states. They do not execute PAIA services. Their appearance is reviewable; functional controls must be implemented against existing production owners in D7. The gallery and any state selector belong to design tooling and must never enter production.

Suggested first review: A02 Reader → T01 root → T03 dense Topic → O04 Compare → O08 first-generation candidate → C01 Task → C04 Review → C06 stale → C08 Ready → A08 History → dark → compact.

## Scope and current baseline

Audited main: `5d7440d86dbee9c9994302915f162567f971a747`. The latest runtime recorded by that docs-only main is `b81ebfee6683d2eabc17d8ae50c34a717ac52cc3`. D5 Q12 is bounded/integrated, **D5_OPEN**; PR132 is preserved/unmerged. The checkpoint explicitly leaves several whole-surface compositions and owner visual acceptance open. No production completion percentage is inferred from Q12.

Read `VISUAL_AUDIT.md`, `FINAL_VISUAL_CONTRACT.md`, `SURFACE_MAP.md`, `DESIGN_SYSTEM.md`, `tokens.css`, `RESPONSIVE.md`, `DARK_MODE.md`, `MOTION.md`, `D7_HANDOFF.md`, `SOURCES.md` and `VALIDATION.md`.

## What becomes authoritative, and when

Before owner approval, the entire D6 visual proposal is pending. Approval must identify the D6 revision and accepted visual references. Only then may its pure visual decisions supersede earlier visual completion decisions. Product definitions, data/permission semantics, Source/Working/AI separation, denials and release checks are never superseded by pictures.

Do not repeat the earlier handoff mistake: the finished pictures and tokens must agree. A genuine conflict is `VISUAL_REFERENCE_CONFLICT`, not permission to choose a third style. A missing state is `VISUAL_REFERENCE_MISSING`, not permission for Work to design it. Unregistered generation previews are not alternate canonical masters.

The single next step is owner review of the D6.1 image set. This PR neither starts D7 nor changes D5's active writer, unfinished evidence or release hold.
