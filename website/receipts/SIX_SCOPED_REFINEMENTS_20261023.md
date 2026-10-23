# Six bounded refinements to the restored PAIA homepage

## Owner instruction and baseline

Implement the six concrete findings from the actual website audit, without
another redesign. Baseline: `5e3c426aead5ad698330fa4201ab17b0c21878b1`.
The rejected moving-home, long-term case and independent-opening designs are
not inputs to this work. The original site composition and fictional expressions
remain the authority. This is not permission to change the extension or services.

## Implemented scope

1. Meaningful date, provenance, retained-source and permission labels move from
   9–10px to 11px (mode cues 12px), with restrained blue-gray colors checked against
   a conservative light-blue surface. Main typography, fonts and brand colors
   are not replaced. A reading frame can grow to fit its actual original/organized
   content rather than clip the larger labels; the same frame is retained across
   reading states. Only meaningful metadata is targeted, not all decoration.
2. Phone transitions use the actual anchor/footer geometry. The ball remains in
   its original state after it becomes fully visible; only subsequent scrolling
   advances to capsule/panel. The original reading remains when its final source
   footer enters the viewport and advances after additional scroll. Fast forward,
   reverse scrolling, native page motion and reduced motion remain supported.
3. The existing prompt illustration now explains causality: show panel, emphasize
   its first row, then display that same expression in the non-editable composer.
   It is one finite sequence with cancellation, no idle loop, simulated pointer,
   real model call, storage, clipboard access or send. Reduced motion and no-JS
   visitors see the complete stable outcome without waiting for animation.
4. Remove only the redundant “My topics”, repeated topic/section explanatory tag
   and repeated directory slogans. All three topics, named sections, four original
   expressions and exact original/organized content remain unchanged.
5. Use small existing explanation areas to label interface illustrations and
   link directly to the four corresponding independent Demo anchors. The Thought
   link sits beside its explanatory text, where the growing reading sheet cannot
   cover it. No new homepage widget or toolbar is introduced.
6. The existing granted Context illustration explicitly says it is a sample,
   alongside the real external-connection availability. The existing ecosystem
   sync mapping stays, but is labelled as illustrative and not available yet.
   This does not change real permission defaults or activate a service.

## Unchanged

The exact hero, main title, case expressions, topic cards, four-card composition,
original closing, all identity/image assets, orb artwork and independent Demo
remain. No site-wide stylesheet, product source, service, release manifest or
workflow changes. Non-home generated routes remain byte-identical. No form is
submitted and no personal data is read by browser tests.

## Verification, not aesthetic certification

`website/six_refinement_scope.json` records reversible edits against the exact
baseline. The original copy-correction and historical frozen checks still run
after reversing only these listed edits; no earlier fixture is silently replaced.
Independent Demo/source/permission/IME tests are unchanged. Added tests verify
actual viewport visibility, metadata readability, same-node selection-to-insert
sequence, static/reduced-motion outcomes, direct demo anchors and source bounds.

The initial targeted original-plus-new homepage browser suite passed 1051 checks.
A subsequent local visual review moved the Thought demo link into the existing
explanation column to avoid overlap in short English windows. Earlier counts are
not a substitute for exact-final-head CI or actual production readback.

Actual local HTTP pages were rendered in Chinese and English at desktop, laptop,
390px and 320px widths. No generated concept image was used as implementation
proof. Final results are recorded in the PR discussion to distinguish them from
this implementation receipt. Do not treat test counts as an aesthetic rating,
a conversion claim or full-site accessibility certification.

Readability and motion reference:
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html

Standard entry points remain `python website/build.py --check`,
`python website/test.py` and `python website/verify_live.py`.
