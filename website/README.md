# PAIA website — current-site layout patch, 11 October 2026

This candidate follows the owner's six screenshot-based requests. It restores the
live site's copy and visual baseline, rather than continuing the rejected V1/V2
narratives or subsequent design studies. **Do not merge or deploy without the
owner's confirmation.** Earlier automatic/normal release instructions do not
apply to this candidate.

The homepage hero, marketing titles, prose and example words stay intact. The
secondary 1–4 navigation is removed from the homepage. The repeated lower Archive
application shell becomes a compact editable Reader. Thought Library and Context
use copy/UI columns where the width permits readable columns. The Prompt example
shows explicit Orb, Capsule and Board alternatives within one chat scene; Orb and
Capsule both open the same Board. This is not an automatic three-step flow.

The original complete Demo retains its own layout and operations. Other routes,
forms, legal copy, SEO and locale routing are unchanged. Real data, permissions,
AI, billing and sync are not activated. The existing explicitly pre-authorized
fictional Context example is preserved as such; it does not alter the product's
default-denied policy.

## Implementation

`home.py` composes the unchanged `product_hero.py` with the focused transformations
in `home_layout.py`. Only homepage generation includes `home-layout.css` and
`home-layout.js`. The original `home-core-v2.js` remains the sole owner of editing,
Find, Topic state, Context state and insertion. The new UI changes only page-local
presentation and full-wording inspection. Existing drafts and sources survive.

`layout-copy-baseline.json` was extracted from the actual production-matching
baseline. `layout_checks.py` adds frozen-copy, removed-navigation, column-layout
and three-state guards to the existing browser test suite. The existing source,
permission and draft tests remain; assertions for the intentionally removed home
navigation now check that all four original sections remain present.

```sh
python website/build.py
python website/build.py --check
pip install -r website/requirements.txt
playwright install chromium
python website/test.py
```

`CHROMIUM_EXECUTABLE` optionally selects an installed browser, and
`WEBSITE_TEST_OUTPUT` changes the evidence location. The suite exercises all 48
HTML routes at 1440/768/390/320, enlarged text, keyboard, reduced motion, forced
colors, no-JS and page-local interactions. It does not submit forms or exercise
real extension services.

`package_layout_review.py` builds the four offline review HTML files and a ZIP
without font files. System-font fallback is deliberate; actual-build screenshots
use the original website fonts. Links to the application and policy pages open
the existing live site, not a newly deployed version.

See [the scoped receipt](receipts/LAYOUT_ONLY_20261011.md) and
`receipts/layout-20261011/` for actual results, screenshots and previews. Evidence
counts certify those checks, not taste, consumer conversion or product readiness.
