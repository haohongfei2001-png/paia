# Design review record

## Evidence classes

- **Observed product baseline:** remote main and public/canonical repository documents cited in AUTHORITY. The active extension writer was inspected and is outside this work.
- **Observed visual source:** the owner-supplied opening. Its native dimensions are recorded; exact font identity and original photographic provenance were not established.
- **Authored decisions:** full page composition, complete route set, bilingual copy, explicit font choices, photographic replacements, responsive rules and interaction states in this package.
- **Rendered proofs:** PNGs produced from the exact checked-in SVG content in the design-authoring environment. These are not website runtime screenshots.
- **Unverified:** future implementation fidelity; functional or production readiness of unbuilt new website routes; form delivery; current-live provider certification; real-device and cross-browser behavior; owner acceptance of every newly authored page.

## Visual checks performed during authoring

The full desktop homepage and first viewport were inspected at both overview and 100% crop. The mobile first viewport was inspected at 100%. The review corrected compact-header CTA overflow, a source-paper title that exceeded its narrow paper, and a wrapped mobile benefit title colliding with body copy. Chinese desktop type was reviewed separately; synthetic oblique Chinese display was removed. Subsequent exact artifact proof checks record text bounds and frame metadata in `specs/render-audit.json`.

These checks are not a claim of WCAG certification or production browser testing. Photographic replacements are separately credited and explicitly distinguishable from the original reference. Whole-site contact sheets help catch compositional omissions, but do not replace 100% review of critical text and forms before a later implementation ships.

## Design completeness vs approval

The complete route and state package is authored. Owner approval of the supplied art direction is not retroactive approval of the entire newly authored site. The package status is design-only, pending owner visual review, and does not start implementation.
