# R1 decision and self-review record

This is one selected refinement, not a library of alternative identities. The exact approved original PNG was available in the working environment and its SHA-256 verified as `dec1e0d19d373a0a6ae4219514bf9dc183f5ebe84773c8b7512f5ff96aa69c0e` (3072×2048,1454460 bytes). No unrelated or earlier generated concept was substituted.

## Decisions made

- Retained horizontal 3:2 cards and restrained rear-only state motion. Chose a 2.5px default offset: enough exposed edge to read a second plane at the actual 48px scale, while retaining about88% horizontal overlap. The foreground is not independently recentered between states.
- Avoided a new decorative light source, blur, thick glass and glow. A narrow edge and different front/rear alpha ramps supply depth. The panels remain opaque and readable on long host text. Dark mode is a new adaptation for review, not a previously approved dark raster.
- Kept the capsule's soft joined silhouette. Chose a complete circular rim with shallow front/back overlap for the board, instead of the predecessor's concave melted connection. Normal circle and board targets do not rely on an animated neck.
- Added real search, detail, editor and management views through the same small board. The ordinary six-row view stays simple; its missing permanent decorations are not missing controls.

## Findings corrected before delivery

An early render used a CJK fallback for Latin text, causing needless capsule truncation and awkward apostrophe spacing. An ordinary system Latin fallback was added before the CJK fallback; no font file or CDN is distributed.

Inspection found a one-pixel composer-gap discrepancy from using outer host coordinates without subtracting the host border. Layout now accounts for `clientLeft/clientTop`; the final browser check measures exactly12px.

Insufficient-space hiding initially needed explicit child visibility/inert treatment because a child with explicit `visibility:visible` can outlive an inherited hidden parent. Hidden/entry fallback now keeps the logical mode and edit buffer while suppressing the actual unavailable carrier.

The initial full browser run was29/30: the forced-color focus test used a programmatic focus jump after pointer input, which does not necessarily establish keyboard `:focus-visible` modality. The test now enters keyboard modality with Tab before checking the same focus outline. No CSS focus requirement or threshold was weakened. The original failed report is preserved as `evidence/verification-initial.json`. Initial test SHA-256: `023f3bf159b603a82bc59cc8d431d5a41b695c54733fc2ae5ddd951f76456d79`.

A subsequent30/30 center-hit run is preserved as `evidence/verification-pre-clearance.json`. Visual examination of the dark editor then identified a more subtle problem: a deeper circle overlap could intercept the lower-right corner of Save or a last-row more target even though the center was clickable. The final shallow overlap moves only the board up/left10px (`right/bottom34` instead of24), retains48px circle and336×312px board, and adjusts row inner spacing without changing text alignment/width. Save is now also tested at four interior corners in normal and short/error layouts. The final30/30 report belongs to these changed bytes; it does not relabel the earlier geometry as passing this stronger check.

Screenshots are captured after transitions settle. Early narrow-view inspection caught mid-fade text showing through the panel; settled-state screenshot timing was corrected without removing the actual short fade from the prototype.

## What this review does not conclude

The checked shapes are not a guarantee of a top-tier installed experience. Long conversation inspection visibly retains the inherent occlusion trade-off of an open floating board; it is not concealed by a decorative glass effect. Same-point collapse is preserved, but only sustained actual use can decide whether the chosen footprint is comfortable.

The inspection and 30 browser scenarios are self-review of the synthetic design component. They are not independent third-party review, a15-minute human comfort pass, a120Hz measurement, native receiver/security qualification or proof that the product is complete.
