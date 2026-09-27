# Website v5 — Context in motion

Status: IMPLEMENTATION_AND_BROWSER_REVIEW_PASS / FINAL_HEAD_AND_LIVE_GATES_PENDING.
Owner authorization: modify the public website only if independent of active
product development; otherwise deliver design only. No new service, account,
permission, AI call or data-collection authorization is implied.

## Isolation

Start main and pre-integration main: `e43b8748701cd7c71eba4da1576478bdcfce2d47`.
Website writer: PR89 / `website/context-motion-v5`.
Product writer: PR88 / VS07 retrieval evaluation. Its changed-file inventory was
read at batch start and again before integration. It now includes extension core
retrieval/time modules as well as experiments/scripts/tests/docs and its own lab
workflow; none overlaps the website-owned paths. Do not edit/rebase that writer.

Website and extension CI path filters/concurrency are separate. Final changes do
not modify extension, native-host, product STATUS, schema, capture, permissions,
private archives, signing/distribution or any existing workflow. The branch-only
transport and authoring workflow are removed from the integrated diff. Shared
main still advances normally; the product writer may fast-forward/rebase in its
own usual integration process. This is runtime isolation, not a promise that Git
or hosted-runner capacity is physically separate.

## Design and actual behavior

A production-domain baseline screenshot was acquired in run36296142097. The
baseline was not inferred from the earlier generated concept image.

- Text-only desktop opening. Native scrolling stages four source arrivals, draws
  connecting paths, then resolves a layered context object. The 900px runway is
  reversible and does not intercept scrolling. Mobile uses normal document flow
  and bounded entrance transitions, not a scaled-down sticky desktop canvas.
- Remove decorative coast, plant and architectural photos, handwritten slogans,
  unnecessary micro-headings and the redundant homepage four-step strip.
- Three independent optical SVGs represent document/search, related nodes and
  pen/reuse. Their strokes can trace on entrance. External provider SVG files
  remain unchanged; marks do not morph or blur.
- A dark source-to-context workspace replaces the pale lifestyle-style showcase.
  Selecting material updates the actual text, count and corresponding path. A
  finite label movement follows an included input toward its output. Removing
  material removes its path and text. Empty selection stays empty.
- Copy transfers exactly the selected strings to the clipboard. No AI call or
  automatic sending occurs. Clipboard failure has a manual recovery; a late
  completion cannot acknowledge a changed context selection as copied.
- Existing standalone demo behavior remains intact: immutable source/working
  separation, stale-preview invalidation, safe rendering and exact copy/export.
- Shared type, icon, spacing and interaction rules apply to all 16 paired route
  types. How-it-works/use cases show source/working/context relationships. Blog,
  beta, legal and status destinations remain usable and accurately scoped.

## Motion and access

Only finite entrances, native-scroll progression and user-triggered movement.
No WebGL, animation framework, remote font, image hotlink, particle loop, fake AI
spinner or timer-gated CTA. OS reduced motion and the explicit desktop pause
cancel in-flight animation and show meaningful static content. Hidden hero art
cannot receive focus. No-JS renders three selected source inputs and disables
controls requiring JS instead of pretending they work.

## Browser review and repairs

First full real-HTTP run [36297862028](https://github.com/haohongfei2001-png/paia/actions/runs/36297862028)
passed 2,986 assertions with no failures, then captured actual browser scenes.
Visual review found two defects not adequately covered by the original checks:

1. The Chinese product-heading emphasis inherited a dark legacy color. It now
   has a light color on the dark stage, with computed-style contrast checked for
   both languages and all four reflow widths, not only nominal token pairs.
2. At small desktop widths the foreground context partially covered the Gemini
   mark although its center remained visible. The context and back sheets were
   repositioned locally. Nine-point mark-area checks replace center-only probes
   at 1200/1280/1440/1920px; no mark asset was distorted or simplified.

Final runtime: `28c58d2c5dd66a55187033ee21de8b2ac21e4922`.
Final affected HTTP + visual run [36298557885](https://github.com/haohongfei2001-png/paia/actions/runs/36298557885)
uses input `edde70da2dbac5df8e8baf551c838ad7697a3617`; verified source was committed
only after tests and visual capture passed. Its affected smoke passed 2,283
assertions. This is not misrepresented as the full route matrix.

Artifact10924663332 was downloaded and independently reopened; ZIP SHA256:
`6d0ddf406ead12e08413e113af044ec51dc170e23728723be79b40ecc58a92a5`.
The report records real HTTP, no private data or form submission, successful
1200x800/1280x720/1440x960/1920x1080/1024x768 layout/mark checks, four genuine
scroll-progress states, actual selection/empty states and in-flight cancellation.
The 41-frame GIF is sampled from rendered native scrolling, not an AI concept or
an assertion of physical-device frame rate.

Reviewed actual full-size opening/collected states, the product stage and selected
motion frame, both-language/mobile pages, how-it-works/use cases, secondary-page
contact sheets, then the repaired Chinese mobile and 1280x720 mark clearance.
All five recorded runtime digests match the final authored sources. In particular:

- CSS: `41c70dd2ea73621cb6e6d3e6f48252f07c00eb7fe652423cc59f98e0ffd5002e`
- JS: `2cfcad24daf91e44d1a0b0b1892957fe50daa45c2d40fd5769d290df77b2629c`
- Existing demo JS: `447610004d6f476e4a15edc298526817a8fef6537fea9b6447fd9dab8a6b5c65`

## Remaining integration gates

This cleanup commit changes documentation/transport only, not reviewed runtime.
Require the normal exact-final-head PAIA Website CI with its complete route and
interaction matrix before merge. After merge, require the existing exact-main
website job and strict public-domain byte/browser readback. An old CDN must fail;
never weaken the comparison. Record final SHAs and evidence in PR89's closure
comment instead of creating a receipt-only CI loop.

Passing browser assertions is not an aesthetic score, owner visual approval,
physical-device benchmark, complete WCAG audit or extension capability release.
Claude/Gemini capture remains planned; Topic is a fixed fictional example, not a
claim about the independent VS07 model. Existing beta recipient and unchecked
consent are unchanged; no beta email was sent. The prior v4 PDFs are historical;
this task delivers the implemented site and browser motion/image proof, not a
newly certified PDF export.
