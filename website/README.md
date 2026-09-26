# PAIA website — Context in motion (v4)

The owner selected the latest supplied PAIA composition and explicitly authorized
implementation plus a complete website PDF. This supersedes both the v3 flat
workbench and the rejected `design/website-editorial-v1` delivery. Historical
artboards remain archived, not a reason to reintroduce rejected copy or layouts.

## Current presentation

A text-only first viewport opens the site. Native downward scrolling moves the
headline into its editorial position while individually timed inputs emerge;
PAIA appears after the source cards. The sequence reverses on upward scroll. No
scroll interception, timed gate, endless autoplay or WebGL runtime is required.
Small screens use ordinary document flow: first typography, then a staggered
collection. Reduced-motion and no-JS show all content without a motion gate.

The owner-selected serif/sans contrast, custom vector benefit marks, recognizable
source SVG marks, unequal card positions, fine connectors, photographic planes,
glass-framed interactive example and architectural closing are retained. Cards
are HTML, not a screenshot of a UI. Source marks must remain unobscured. Photos
are fixed local assets, not remote requests. The architectural crop is from the
owner-selected image; its source resolution is explicitly recorded, not called
an original high-resolution photograph.

Copy is concrete and deliberately short. Source capture that is not available
is marked **Planned**, even inside the hero composition. “Watch the film”, fake
endorsements, personality profiling and decorative micro-slogans are absent.
This website is not a reading application or a claim of universal AI access.

## Routes

16 canonical page types have English root and `/zh/` counterparts. `/en/` keeps
identical legacy English aliases. Locale switching retains the route.

Home; how it works; use cases; interactive example; our story; blog; three
original product essays; data and permissions; beta application; current status;
privacy; terms; application return page; 404. Canonical/noindex/hreflang rules,
real link targets and paired sharing images are generated centrally.

## Real interactions / explicit boundaries

The homepage example has five fictional inputs, selection that changes the
actual Context view, keyword filtering, keyboard-operable Inputs/Topic/Context
tabs and an empty state. Filtering never silently changes the selected set.
The Topic is a fixed example, not a fake automatic AI result.

The separate full demo preserves working-text editing, immutable originals,
keyword search, Topic readback, explicit Context selection, stale-preview
invalidation, exact copy and Markdown export. No archive connection, live AI,
background capture, remote storage or telemetry is introduced by the website.

The existing beta FormSubmit endpoint and recipient are retained. A valid email
and separate, unchecked forwarding consent are required. All verification is
read-only: the form is never submitted. The return page does not fabricate an
email delivery receipt. Existing legal substance/dates are retained.

The extension's canonical product documentation remains the authority for real
capabilities. Marketing examples do not certify current-live provider support,
private archive recovery, signed distribution or production AI semantic quality.
No `extension/**` state, schema, implementation or CI is changed by this work.

## Edit / verify

`website/build.py`, `home.py` and `pages.py` are the only HTML generators.
`assets/website/site.css` and `site.js` own the public site's presentation and
homepage behavior. The independent `assets/website/demo.js` is preserved.

```sh
python website/build.py
python website/build.py --check
pip install -r website/requirements.txt
playwright install chromium
python website/test.py
python -m http.server 8000
```

Serve the repository root. Committed pages require no build server. Font and
image assets are self-hosted and recorded in `assets/website/asset-lock.json`.
`prepare_assets.py` is an explicit one-time acquisition utility; ordinary builds
and visitor requests never fetch external dependencies. Upstream license text is
retained separately. Never substitute a system font without screenshot review.

Website checks cover all generated routes, 1440/768/390/320 reflow, enlarged
320px text, no unsolicited external requests, image availability, source-mark
visibility, native/reduced/no-JS motion, keyboard navigation and the complete
existing demo safety and form-validation paths. Aesthetic review remains
separate; the number of assertions is not a quality score.

## Website PDF and motion proof

```sh
pip install pymupdf Pillow
python website/export_pdf.py --output /tmp/paia-website-pdf
```

The exporter serves the actual website locally and uses browser PDF rendering
with screen media. Each route is a complete, normal-width page with its natural
height; it is not squeezed into a fixed tall poster. English and Chinese books
include bookmark navigation, public website links and the hidden interactive
states. A separate PDF/GIF records the native scroll sequence. All examples are
fictional and no form is submitted. PDFs are verification/delivery artifacts,
not dependencies required by the live website.

## Review / integration

See `receipts/WEBSITE_V4.md` for exact source, browser and deployment evidence.
The temporary source-transfer workflow exists only during this branch's work
and is removed before integration. Production byte readback is distinct from
local browser and PDF rendering. Never label a pending deployment as verified.
