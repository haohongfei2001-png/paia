# PAIA-WEBSITE-V7-ORIGIN-FIDELITY — owner review

Draft only. Production has not been modified or deployed by this task. Do not
merge or publish without explicit owner approval.

## Isolation and source authority

Base: remote main `261e094e703ddea913d03db513f088c5898ec1a4`, freshly read on
2026-09-28, rechecked before delivery. Independent branch:
`design/website-v7-origin-fidelity`. The PR body records the final head.

Protected PRs were read only: #88 `17f109cddb0c944fcf17bdcf62f92dad4e92e308`
and #91 `ea035da1b006ac08183d5724ffb2eea3f98dea85`. No existing branch was
pushed, rebased, merged or closed. No overlapping active website writer was
found. The existing local product checkout was not changed. During final delivery,
the independent #88 writer advanced to `810e9520218f2d8cf1b868cd1153e3b76fa56f74`;
its changed-file list still has zero website overlap. This task made no write to it.

Read before implementation: README, WEBSITE_DESIGN, website README, home/build/
pages/core, active CSS/JS, website receipts, both PR #91 design documents, and
Google Drive `PAIA设计想法.docx` (content review v2.5, modified 2026-09-27).
The new explicit V7 request supersedes the older green palette/frozen wording;
it does not expand product implementation or authorize v6 production.

No changes to `extension/**`, product STATUS, runtime, capture, storage,
semantic/evaluation code, schema, permissions, workflows or existing receipts.
`site.css`, `site.js`, `demo.js`, source-provider marks and all graphic brand
assets retain exact baseline bytes. Non-home generated pages are unchanged.

## Visual and content changes

- Near-white background, charcoal actions and neutral gray surfaces, borders,
  hover and authorization states. No large green or dark panel.
- Homepage display headings use self-hosted Instrument Serif at weight 400.
  Chinese uses readable native Songti / Noto Serif CJK fallback, also weight 400.
  `--brand-serif` retains the previous PAIA Display wordmark. Neither the brand
  graphic, its CSS rendering, paths nor proportions are modified.
- Concrete bilingual capture/reuse copy and nearby private-beta/planned scope.
  Same left/right hero composition, source-card hierarchy, native scroll,
  source-first/PAIA-last timing, reduced-motion and no-JS behavior.
- Four direct scenes after a light linked transition: editable archive and
  immutable source; editable/ranked/pinned prompt library with composer-only
  insertion; cross-conversation chronological topic/export; explicit candidate,
  confirmation, selection, preview, permission, revocation and current use.
- Topic example dates are consistent with the archive and span August–September.
  Export preserves edited text and the displayed conversation provenance.
- The single closing brand illustration is smaller. No feature-section imagery
  or new illustration system is introduced.

## Asset provenance and deliberate exception

Font: [Instrument Serif](https://github.com/google/fonts/tree/0b58fb370093f9a9f4ff785d94405710b79de67c/ofl/instrumentserif),
SIL OFL 1.1. Full license in `assets/website/licenses/Instrument-Serif-OFL.txt`.
Regular/italic TTF converted to full-glyph WOFF2 with fontTools 4.66.0; no outline
or name edits. Pinned upstream source and SHA-256 are in `asset-lock.json`.
No runtime third-party font request; original brand fonts remain intact.

No new photographs were acquired. This uses the owner's explicitly allowed
conservative option: retain the existing local WebP planes at reduced prominence
(grayscale and 0.32 image opacity), rather than introduce an unestablished stock
image or whole-site mockup. This is a **retained-photo exception**, not a claim
that two replacement images were delivered. Existing sources/licenses remain:

- Coast: Gunel, [Unsplash](https://unsplash.com/photos/a-view-of-the-ocean-from-the-top-of-a-cliff-zg3WkjhieRA).
- Light: [Unsplash](https://unsplash.com/photos/plant-shadow-on-white-wall-Tc_4PdN-Fq0).
- Both: Unsplash License; existing provenance is in
  `design/website-editorial-v1/assets/manifest.json` and original license files.
- Design origin: owner-supplied reference, used only for the review comparison;
  never used as page UI or a production hero asset.

## Capability claim review

| Scene | Public boundary |
| --- | --- |
| Capture | Desktop Chrome / supported ChatGPT private beta. Claude, Gemini and general cross-AI capture remain planned. |
| Archive | Fictional local preview of viewing/search/editing; original source remains separate. Existing implementation does not imply full consumer certification. |
| Prompt library | Entire scene explicitly planned. Counts and deduplicated similarity groups are preset examples. Editing, pinning and reordering work only in page memory. |
| Reply-aware prompt | Planned, preset suggestion. A new candidate example or an existing prompt can be selected. Selection fills only the local composer; no sending. |
| Topics | Preset grouping, not live AI. Inputs keep chronology, changes of emphasis and provenance; direct edits flow through to export. |
| Personal context | User-added, confirmed fact and extracted candidate are visibly distinct. Confirmation never implies selection or permission. |
| Connected AI | Planned. Requester/task, preview, approved items, invalidation and revocation are shown. Actual current use: 0 items read; last used: never. Permission history is a page-local example. |

Grounded against current main's product docs and protected writer scope. No claim
of universal providers, production semantic quality, real AI connector, private
archive access, account sync, physical 120Hz certification or automatic sending.

## Verification and visual review

`python website/build.py` and `python website/build.py --check` pass.
Full existing `website/test.py` runs over actual local HTTP, including all page
routes at 1440/768/390/320, enlarged text, EN/ZH, keyboard, reverse native hero
scroll, reduced motion, no-JS, source visibility, original independent demo,
actual Markdown downloads, consent invalidation, form validation, and zero
unsolicited external requests. No beta form was submitted. New checks add
asset/brand hashes, neutral surfaces, light headings, brand typography, pinning,
topic provenance, planned labels and truthful usage states.

No prior assertion or browser journey is deleted or skipped. The frozen hero
literal hash is updated for the explicitly authorized copy/color changes; all
three shared-asset hashes are unchanged. An additional baseline DOM/attribute
signature freezes hero hierarchy/geometry, excluding only copy line breaks,
accessible wording and line colors. Screenshot review is separate from tests.

The local full suite passed 3,158 checks with zero failures; two additional
320px EN/ZH header checks passed after the final header spacing adjustment.
The committed `v7/test-summary.json` records these results. PR CI provides the
exact final-head cloud result and independently observes the existing public
baseline. No production deployment is requested or triggered by this Draft.

[Review gallery](v7/README.md) includes the actual public before screenshots,
branch after screenshots, original design reference, both languages, all four
widths, no-JS and key scroll stages. Full-page comparison captures use reduced
motion so all content is visible; native scroll captures are separately labelled.

Manual findings: backgrounds are light/neutral; English serif is lighter and
more condensed; Chinese title is legible and avoids the legacy green emphasis;
hero spatial relationships and timing are unchanged; post-capture scenes retain
real editable controls and permission feedback instead of decorative feature
cards. Source/candidate metadata was enlarged after screenshot review. Native
macOS Chinese font rasterization may differ from the cloud Noto CJK runner.
