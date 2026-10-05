# Bounded frosted-material correction

Base remote main: `80f3201d8138f37d3d02658663d25a0b46874125`.
Branch: `codex/prompt-reuse-frosted-glass-v2`.
State: **IMPLEMENTED / ENGINEERING_VERIFICATION_PENDING /
OWNER_VISUAL_ACCEPTANCE_PENDING**. Do not merge.

Owner A actual screenshot and B original design sheet were both materialized and
pixel-inspected privately on 2026-10-05. B outranks the earlier engineering
translation. No private screenshot or source attachment is committed.

Runtime scope is limited to `content/prompt-surface.js` static orb/card CSS and
removal of its decorative reflection span, plus four divider/scroll-thumb CSS
values in `ui/prompt-surface.css`. All event handlers, trusted messages, layout,
data and insertion code remain byte-identical. Geometry stays 40/44 px and the
current safe default position is unchanged. No new Stage 3A runtime.

v1 remains unchanged. v2 contains all eight existing visual states plus 4×
material, focus/hover, background-participation and ordinary/conditional capsule
masters. The card audit justifies only lower opacity/rim/shadow/separator/scrollbar
weight; row layout, type, controls and information structure are preserved.

## Verification history

- Local baseline native Chrome failed before any test journey: the cloud shell
  sandbox blocks Chrome's local socket. The supported elevated attempt failed
  during environment mounting. Neither run establishes a runtime failure/PASS.
- Local owning Surface contracts: 15/15 PASS. Privacy/security: 59/59 PASS.
  Package: 11,495 checks / 294 resources PASS. Built release: 11,060 checks /
  287 resources and 311 product files PASS. Complete unit and hosted visual/
  browser/adapter checks are pending on the candidate head.
- Local adapter group: 21 PASS; 27 browser-backed cases fail in their before
  hook because the local browser environment is unavailable, before assertions.
- Independent read-only review confirms nonpresentation host JS is identical to
  base after excluding the CSS template and decorative reflection removal;
  trusted/core/frame JS, manifest and v1 files are unchanged. Review identified
  and corrected dark hover specificity and the dark vector material translation.
- The historical visual fixture used a saved anchor predating the preserved
  drag-layout change. Fixture-only saved x/y now align with the unchanged master
  composition. Production layout/default placement is not edited. Supplemental
  close-up, light/dark hover/focus and patterned-host captures are also parity
  checked; parity remains build evidence, not design acceptance.
- No logged-in current ChatGPT browser is available to this execution. Screens
  from the repository harness are synthetic native Chrome evidence, not current
  live-site certification. The owner's supplied A is the only current live image.
- Earlier Stage 1/2 functional/manual acceptance is retained, not repeated or
  reopened. No owner DevTools/Console/source-versus-release exercise is requested.
- D7 full-gate failures remain owned by the independent D7 branch and cannot be
  bypassed by this presentation correction. PR164 is preserved and unmerged.

## First rendered candidate: material rejected during engineering review

Head `82cbca765cd63ae4e45cb26541e9030c6fe0f647`, tree
`850b110a5ace10ae61c80b14e38640109589b0a9`, visual run `37344921316`:
8 actual source/release states and 14 supplemental image pairs passed build
consistency. The downloaded artifact SHA-256 is
`b7d654d5be9016cba3bb55f01a1d1ad4baa566276f19c36388f4f696e00d5d3d`.
Actual pixel inspection nevertheless found the light orb too empty with a
visible ring, and the dark orb too gray. This is **not material acceptance**.
The next bounded revision removes the hard border and restores a broader,
low-saturation blue/lavender/mint diffuse core, with a softer lower-energy
highlight. All behavior and card layout remain unchanged. New-head captures and
owning checks are required; no old green result is reused as final acceptance.
Local full unit results: 1,840 PASS / 1 unchanged 10k fake-IDB performance failure.

## Second rendered candidate: light retained, dark corrected

Head `67bf8366352722ee2dce8b3a7e415720d73c44c4`, tree
`aa458881639ca91e859c911adeb227d4ff2d26f9`, visual run `37345738769`:
8 primary states and 14 supplemental pairs pass build consistency; artifact
SHA-256 `7d9860d23bde3072dbf43277083e8c198c1a20640d0b33d0c3ac694b7bc00928`.
Two independent pixel reviews found the light orb materially improved, with no
hard highlight or separate reflection, and real background participation.
Dark still read as a gray solid sphere, so it was not accepted. Preserve the
light/card candidate, lower only dark neutral-white layers/rim energy and retain
more distinguishable blue/lavender/mint optical hues. Require fresh screenshots
and affected gates for this presentation-only dark revision.
