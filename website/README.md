# PAIA website — words worth returning to · 10 October 2026

A website-only consumer-experience refinement, not a product rearchitecture.
**This PR must not be merged or deployed until the Owner confirms.** Existing
production remains the comparison baseline. Older receipts describing automatic
or normal release permission do not authorize release of this branch.

## Experience

The home keeps the blue-white optical product window and three-space switcher,
but introduces PAIA explicitly as a Chrome extension for the person's own inputs.
One wholly fictional project, a family cookbook, shows why an old expression
matters to a new task: preserve Mum's voice, not just a generic recipe.

Home proves the outcome through a selected continuous Topic and an intentional
old-words-to-new-draft interaction. The independent Demo retains deeper Archive
Find/edit/source readback, the approved Topic Root and Section readers, prompt
management/search/inspection and independent Context scopes. Neither page calls
AI, captures a chat, persists edits or sends a message. People can try the Demo
without an email or installation; beta applications follow the separate existing
invitation form. Story and blog remain available in the footer.

Narrow Input Board v4 is labelled **approved but not implemented in the extension**.
Candidates are single-line, at most 336px wide; search/check/edit keep the same
width. Only content scrolls, with the complete composer protected. Expansion is
user-controlled. Clipped or multiline content is inspected before whole/selected
reuse. Unsaved edits, current body ownership, composer selection and existing
drafts are protected. Pro AI is explained as unavailable, never pretended active.
Context starts globally/cards/Topics off, including the no-JS fallback.

## Source ownership

| Source | Responsibility |
|---|---|
| `build.py` | Shell, route pairs, footer, Beta, legal and return pages |
| `story.py` | Shared fictional person-authored expressions, dates and frequent phrases |
| `product_hero.py`, `flagship_home.py` | Three-space opening and one home value story |
| `core.py`, `topic_preview.py`, `product_sections.py` | Complete Demo Archive/Topic/Context/sync illustrations |
| `prompt_preview.py` | Shared NIB v4 markup; full Demo's availability explanation |
| `pages.py`, `product_pages.py` | Interior content, availability and Demo introduction |
| `assets/website/site.css`, `interior.css` | Shared typography, navigation, forms and interior composition |
| `assets/website/product-experience.css`, `flagship.css` | Existing optical product system plus focused narrative and narrow-board refinements |
| `assets/website/site.js` | Hero tabs, native-scroll effects, reduced motion and mobile navigation |
| `assets/website/home-core-v2.js` | Demo source-safe editing, Reader Find, Topic reading and permissions |
| `assets/website/narrow-board.js` | The sole owner of website prompt search/edit/check/reuse interactions |
| `flagship_checks.py`, `core_checks.py`, `origin_checks.py` | Shared synthetic browser journeys and product-model guards |
| `accessibility.py` | Explicitly separate axe audit with raw review findings |

No visitor runtime dependency or remote font/service was introduced. Existing
licensed brand/media/font resources stay self-hosted and unchanged. Reduced
motion is native to the system preference; there is no autoplay story, forced
scroll tour, ordinary-user motion toggle or continuously running render loop.

The generator owns 48 HTML routes plus sitemap and robots: 16 English root
pages, `/zh/` counterparts and identical `/en/` aliases. Locale switching keeps
the route. Canonical/hreflang/noindex behavior, existing beta recipient/action,
required unchecked forwarding consent and legal promises remain intact.

## Build and verify

```sh
python website/build.py
python website/build.py --check
pip install -r website/requirements.txt
playwright install chromium
python website/test.py
```

The default test serves the generated site over loopback HTTP and captures review
screenshots. All 48 routes retain 1440/768/390/320 reflow and 320px/200%-text checks.
Journeys cover EN/ZH desktop/mobile, exact sources, search, selection-safe insertion,
no persistence/unsolicited requests, independent scopes, keyboard/focus, reduced
motion, forced colors, no-JS, form validity and language routes. It does not submit
the form, test real AI, or claim a physical-device/OS-IME evaluation.
`CHROMIUM_EXECUTABLE` can select an installed browser. `WEBSITE_TEST_OUTPUT` changes
the report destination. `WEBSITE_TEST_CAPTURE=0` skips only extra screenshots for
iteration, not assertions; final review uses the default captures.

For the additional audit, obtain a trusted axe-core distribution separately:

```sh
WEBSITE_AXE_SCRIPT=/path/to/axe.min.js python website/accessibility.py
```

This does not add axe to the website. It records violations **and incomplete
manual-review items**, rather than treating a zero-violation report as WCAG
certification. It tests 78 key-page/interaction states in two languages at
1440/390/320. Contrast over optical layers additionally needs bounded manual
review. Recruited user tests and screen-reader/physical-device studies are separate.

`website/verify_live.py` is a read-only post-release gate. It checks exact deployed
bytes including the new assets before browser journeys. **Do not run it as proof
that this unmerged PR is deployed.** After a separately authorized deployment,
it should reject stale CDN bytes instead of weakening the comparison.

## Review materials

[Design, diagnosis and actual verification receipt](receipts/FLAGSHIP_20261010.md)
separates the proposal, engineering evidence and unresolved consumer questions.
[Product capability map](PRODUCT_CAPABILITY_MAP.md) binds each claim to current
product authority and its availability class. The review bundle contains an
operable offline prototype and rendered desktop/mobile views; it is not an
extension installer. No font files are included in that bundle.

This work does not change `extension/**`, product Canonical, product development
plans, active product writers, services, grants, billing or deployment workflow.
Older receipts are retained as historical records, not instructions to restore
retired features or to publish this branch.
