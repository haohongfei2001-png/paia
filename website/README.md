# PAIA website — full-site refoundation · 9 October 2026

The Owner authorized a complete redesign, implementation, website-only PR,
normal merge and production verification. The deployed site, including PR #213,
is the comparison baseline, not a visual contract to preserve. The final product
contracts determine product shape; this website remains a bounded illustration.

## Design and product model

The site uses a cool-white and blue-gray system of flat reading surfaces, fine
optical edges and a small number of translucent layers. Product windows keep a
credible desktop proportion instead of stretching across the page. Navigation,
annotations and the Prompt companion occupy different depths. Text remains
readable without a background effect, JavaScript or animation.

- **Input Archive:** three-space rail, source/project/conversation navigator and
  an explicitly selected continuous Reader. Reader Find marks and navigates
  matching inputs without filtering the document. Working edits preserve sources.
- **Thought Library:** the newer PT1 personal Topic grid and plain Section links,
  followed by continuous chapters in the same space. No category dashboard,
  timeline, candidate inbox or additional chapter landing page.
- **AI Context:** four independent cards, detail editing and separate global,
  card and Topic choices. This website's fictional user has already granted the
  sample scopes. Real product first-use defaults remain off; no real AI connects.
- **Prompt Reuse:** ordinary personal wording, contextual management, a 336px
  companion panel and intentional fill. A reliable caret or selection end is
  respected; all draft text survives. Nothing sends automatically.

The homepage introduces these spaces; How uses a continuous operation sequence;
Use cases connects prior expression to a new task; About confines the original
mailbox story to a brand chapter; Blog and the three essays use editorial reading
layouts; Data explains independent choices; Beta presents the real application
and next steps. Legal, status, return and error pages share the system. Different
pages have their own composition rather than one repeated card template.

## Source ownership

| Source | Responsibility |
|---|---|
| `build.py` | Site shell, route pairing, footer, Beta, legal and return pages |
| `product_hero.py` | Responsive three-space opening with fictional content |
| `core.py`, `topic_preview.py`, `prompt_preview.py`, `product_sections.py` | Shared homepage and standalone product examples |
| `pages.py`, `product_pages.py` | How, use cases, articles, brand, data, status and demo introduction |
| `assets/website/site.css` | Type, colors, navigation, controls and shared reading/form layouts |
| `assets/website/product-experience.css` | Product compositions, material depth and responsive product surfaces |
| `assets/website/interior.css` | Interior page compositions and their responsive layouts |
| `assets/website/site.js` | Keyboard preview tabs, native-scroll motion, bounded arrivals and mobile navigation |
| `assets/website/home-core-v2.js` | Page-local source-safe editing, Reader Find, draft insertion, Topics and permissions |

There is no ordinary-user motion toggle. Animation follows the system's reduced
motion preference, including preference changes while a page is open. Native
scrolling is not intercepted; there is no timer gate or perpetual render loop.
All illustrations are HTML/CSS with synthetic text. Existing licensed fonts,
brand artwork and media remain self-hosted. No package/runtime dependency is
added to visitor pages. Retired stylesheets and `demo.js` are not loaded.

16 page types have English root and `/zh/` counterparts. `/en/` retains identical
English aliases. The generator owns 48 HTML files, sitemap and robots. Locale
switching preserves the route; canonical, hreflang and noindex rules remain.

## Build and verify

```sh
python website/build.py
python website/build.py --check
pip install -r website/requirements.txt
playwright install chromium
python website/test.py
```

Serve the repository root over HTTP. Tests use actual generated HTML, CSS and
JavaScript. The browser suite checks all routes, 1440/768/390/320 reflow, enlarged
320px text, navigation, keyboard focus, reduced motion, forced colors, no-JS,
immutable sources, safe insertion, independent scopes and form validation.
No Beta form is submitted and no private archive is accessed. Test fixtures do
not prove real AI quality, installed extension behavior or physical-device use.
`CHROMIUM_EXECUTABLE` optionally selects an existing test Chromium installation;
the default CI-managed Playwright browser is unchanged.

After the existing GitHub Pages deployment, `python website/verify_live.py`
compares deployed bytes with the checked-out commit and exercises public pages.
A previous CDN copy must fail that comparison. Rerun only the live job after
Pages completes; do not weaken the readback or bypass PR gates.

[Product capability map](PRODUCT_CAPABILITY_MAP.md) records exact authority,
claim boundaries and missing private references. [Refoundation receipt](receipts/WEBSITE_FULL_REFOUNDATION_20261009.md) records
visual comparisons and actual verification separately from product acceptance.

## Scope and previous records

This branch changes only the public website, its tests and its evidence. It does
not change `extension/**`, formal plans, permission defaults, external services,
product-writer branches or the deployment workflow. The form's existing endpoint,
recipient and required unchecked forwarding consent are retained. The return page
never fabricates a delivery receipt.

Older files in `receipts/` remain historical evidence. Their frozen-hero rules,
old export/task-package examples and former browser-environment limitations are
superseded where they conflict with the current Owner direction and product map.
They are not instructions to restore retired UI or services.
