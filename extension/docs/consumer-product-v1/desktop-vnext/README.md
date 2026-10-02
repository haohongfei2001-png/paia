# PAIA Desktop vNext — design-only handoff

Package: **DVN-1.0 / 2026-09-30**. Product direction is frozen. This package fills implementation details; it is not a new product concept or a runtime release.

**Read the execution gate first:** audited main is `368a8ca5065ef8c0ef526be85c667a8389375e95`. Its [STATUS](../STATUS.md) and [Execution Protocol](../EXECUTION_PROTOCOL.md) say `PAUSED_FOR_PRODUCT_FOUNDATION_REVIEW`. This design PR neither resumes product development nor authorizes merging preserved R&D PR #99. A future owner-approved foundation/roadmap and explicit implementation scope are required. Design merge alone is not that approval.

## Read order

1. [Audit and readiness](GAP_AUDIT.md): what was inspected, what was missing, what is newly specified.
2. [Frozen interaction and data contract](FROZEN_CONTRACT.md).
3. [Surface contracts](SURFACES.md), [state matrix](STATE_MATRIX.md).
4. [UI system](UI_SYSTEM.md), [literal tokens](tokens.css).
5. [Screen index](screens/index.html): deterministic, independent full-window reference states, not production software.
6. [Existing-code mapping](IMPLEMENTATION_MAP.md), [acceptance](ACCEPTANCE.md), [Work handoff](WORK_HANDOFF.md).
7. [Source precedence and supersession](SOURCES.md), [verification record](VALIDATION.md).

Open `screens/index.html` from a local checkout. Each hash route is an independent screen; use the index outside the product frame to select it. CSS/HTML under this directory are documentation specimens only. Never import them into the extension or publish them as a working product. The fixture controls do not implement persistence, authorization, actual AI, clipboard release, or production navigation.

## Authority

Frozen owner decisions are recorded in FROZEN_CONTRACT. Numeric tokens, pagination presentation and keyboard details explicitly marked **completion decisions** are authored in this package to close ordinary design gaps. They are reviewable specifications, not measurements inferred from screenshots. Current product safety contracts and unresolved owner gates remain intact.

Text contracts prevail over accidental defects in reference images. The original/working distinction, exclusion policy and final domain-service checks prevail over UI appearance. Every screen has one canonical route; prior generated posters and fake logos are not alternate implementations.

Only this documentation subtree may change in this PR. No production UI, core, tests, manifests, workflows, distribution assets, STATUS or historical receipts are changed. No production test, live-model fidelity, real-device, large-library performance or WCAG conformance PASS is asserted.


## D5 visual-authority clarification — owner decision 2026-10-02

The reference HTML remains documentation-only and must never be imported/shipped as production code. **However, for D5 pure visual composition it is a canonical visual target, not merely inspiration.** Work must implement the real extension at high visual fidelity to the frozen reference surfaces and visual system.

Authority split:
- behavior, data ownership, privacy, destructive semantics and capability truth → FROZEN_CONTRACT / SURFACES / STATE_MATRIX / product-domain contracts;
- literal declared geometry/color/spacing/responsive values → UI_SYSTEM + tokens.css;
- pure visual composition/hierarchy/density/brand character → canonical high-fidelity reference surfaces rendered from screens/index.html, together with the declared tokens;
- an intentional visual departure requires an explicit recorded owner decision; it cannot be justified as ordinary implementation freedom.

“High fidelity” means the production surface should visibly read as the same approved design: same shell proportions, visual hierarchy, whitespace rhythm, reading width, navigation density, logo treatment, search/control prominence, selected states, border/radius/shadow language, typography roles and brand balance, allowing only content/localization/responsive differences required by the contracts. A page that is merely functionally correct, unclipped, accessible or CI-green but still looks like the legacy PAIA UI is **not** D5 PASS.

Where a visual reference and literal token appear inconsistent, do not silently choose a divergent third style. Record the conflict in D5, keep behavior/data contracts untouched, and resolve the pure visual choice through owner visual review. Private owner screenshots may be used during review but must not be committed to this public repository.
