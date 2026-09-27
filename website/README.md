# PAIA website — Context in motion (v5)

The public website is a separate runtime from `extension/`. The owner authorized
this refinement only if it did not interfere with active product development.
PR89 owns the website; PR88 owns extension retrieval development. See
`receipts/WEBSITE_V5.md` for boundaries and verification status.

## Current design

Text-only opening → separate AI inputs → related material → explicit context for
another task. The900px desktop scroll runway uses native scrolling and exact
per-source progress; source marks never morph or blur. A context object resolves
last. There is no timer before entry/CTA and no forced scrolling or infinite loop.

The reference's typography, asymmetric spatial composition, unequal surfaces and
custom icon craft remain. Decorative coastal/architectural photography, filler
micro-slogans and the redundant four-step homepage strip no longer appear. The
second visual stage is a dark, interactive source-to-context workspace, not a
lifestyle photograph or fake app screenshot. It provides real selection/search,
keyboard tabs, exact context copy, an empty state and truthful error feedback.

Every full page uses the same optical language.16canonical page types in English
root and `/zh/`, with identical legacy `/en/` aliases, remain available. Navigation
and locale switching preserve destinations. Legal substance, beta recipient and
unchecked forwarding consent stay unchanged.

## Product truth

The website does not connect to a user's archive, account, model, filesystem or
browser capture. Examples are synthetic and ephemeral. The Topic view is a fixed
example, not automatic semantic inference. Claude/Gemini capture is explicitly
planned. Integrated canonical product docs, not this website or an open semantic
lab PR, govern actual capability and certification claims. No trackers, new
permissions, remote dependencies, paid services, or unsolicited visitor requests.

The separate `assets/website/demo.js` retains the existing source/edit distinction,
stale-context invalidation, safe text rendering, exact copy and Markdown export.
The new homepage copy likewise copies only selected text and reports clipboard
failure honestly. No-JS renders the initial selected context and disables controls
that require JavaScript. Reduced motion disables every finite animation; desktop
also has an explicit pause. A static website view retains all meaningful content.

## Edit and verify

```sh
python website/build.py
python website/build.py --check
pip install -r website/requirements.txt
python -m playwright install chromium
python website/test.py
python -m http.server 8000
```

Serve the repository root. The live site is checked-in HTML/CSS/JS; no Node server,
framework or paid build service. `home.py`, `pages.py`, and `build.py` own generated
HTML. `assets/website/site.css` is the sole active stylesheet and `site.js` owns
the public motion and homepage example. Existing font/brand assets are reused;
this refinement does not acquire or distribute new font binaries.

Use `website/test.py --smoke` for the affected six-route inner-loop matrix; the
normal CI command retains all48routes and the existing demo/consent regressions.
`--offline-render` records weaker exact-source DOM evidence in restricted local
browsers. It is not a substitute for the runner's real HTTP verification.

```sh
pip install Pillow
python website/review_motion.py --output /tmp/website-v5-visual
```

The visual capture script performs actual HTTP navigation, captures normal
1440×960 motion stages, small desktop/large desktop/mobile layouts, example
selection/empty states, and a native-scroll GIF. It makes no form or AI call.
Inspect screenshots separately; a green test does not prove aesthetic excellence,
physical-device performance, full WCAG compliance or owner approval.

The existing `website/export_pdf.py` can still export the implemented pages when
needed. PDFs are static delivery artifacts, not the experience or runtime owner.

## Integration

Only website-owned files may change. Temporary authoring/transport files must be
absent from the final PR diff. Re-read main before merging; retain independent
extension changes. Existing website exact-head CI and exact-main actual-domain
byte/browser readback are release gates. An old CDN version fails; never relax
readback. Product-development CI and its current writer are not modified.
