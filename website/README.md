# PAIA Website — Personal AI Context

The public website is a separate runtime from `extension/`. It does not access an
archive, call an AI, or authorize a product operation. Remote main remains the
engineering source of truth.

## Current design decision — 2026-09-26

The owner rejected #77's reading/library-led expression. PAIA is an AI-era
personal information and context product. Good reading is a supporting quality,
not the product category or the leading website promise.

This revision replaces the editorial homepage, not just its colors:

- Hero: **你的 AI，不必每次从零开始。** / **Your AI. Not starting from zero.**
- An interactive context workbench leads with selected personal material and its
  use in the next AI task. Capture/retrieval and topic organization are explorable
  supporting capabilities, not a compulsory organization funnel.
- The main narrative covers lasting accumulation, a user-controlled information
  layer, ongoing projects/research/decisions, complementary history/Memory roles,
  explicit data boundaries, and the current beta versus the roadmap.
- Graphite and cool neutral surfaces, restrained mint, strong sans-serif hierarchy,
  and product controls replace paper/serif/quotation styling. No decorative glass,
  glow, background video, external font or always-running animation.
- Demo and beta are distinct entry points. The demo uses a fictional creator-tool
  project, not the earlier newsletter-reading example. Privacy and legal substance,
  forwarding recipient, explicit form consent and honest delivery wording remain.

Start baseline: `00d880a40137e672e000f4e550fb3d482b9269dc`.
Consumer Product STATUS is VS-05; #79 owns the extension writer. The website task
must not modify extension code, its STATUS/receipts or its CI. Website-only
coordination was recorded on #79. The owner's private design sources are not
mirrored in this public repository.

## Editable sources

- `website/home.py`: the complete bilingual homepage and illustrative workbench.
- `website/build.py`: shared shell, secondary-page copy, metadata and static output.
- `assets/website/site.css`: sole active website stylesheet, including all layouts.
- `assets/website/site.js`: native menu enhancement and in-memory homepage selection.
- `assets/website/demo.js`: existing functional sample with explicit stale-output guards.
- `website/render_social.py`: locally rendered 1200×630 ZH/EN metadata images.

Root pages are Chinese; `/en/` is English. HTML is generated and committed for the
existing `inputarchive.com` root hosting. No new hosting account, backend or runtime
build service is needed. Do not edit generated HTML instead of its source.

```sh
python website/build.py
python website/build.py --check
python -m http.server 8000
```

## Truth boundaries

Current product paths include capture on supported ChatGPT pages after consent,
local search and working edits, source inspection, topics, optional separately
authorized AI organization, and explicit Context selection/preview/copy/export.
Integrated code does not imply complete live-provider, device or signed-release
certification. Re-read canonical status before strengthening a product claim.

The homepage workbench is labeled **synthetic capability illustration, not an
extension screenshot**. Its topic is prepared; it performs no real capture,
automatic classification or external AI processing. Selection changes only this
page's temporary illustration; unchecked text is not automatically substituted.
The full demo provides real local sample editing, preview, copy and Markdown
export. It does not claim to be the running extension or prove extension behavior.
No private information should be entered into either sample.

Direct external AI connectors, semantic retrieval, mobile and generalized sync
are clearly roadmap capabilities, not downloads. The current reuse path is manual
copy/export. Local-first is not encryption or loss-proof storage. Source, working
text and AI outputs stay distinct. Saving never grants external AI access; copied
or exported third-party copies cannot be recalled.

## Verification

```sh
python -m pip install -r website/requirements.txt
python -m playwright install --with-deps chromium
python website/render_social.py
python website/test.py
```

`CHROMIUM_EXECUTABLE` may select an installed browser. `WEBSITE_TEST_OUTPUT` selects
the artifact directory. In a managed environment that blocks local HTTP,
`--offline-render` renders the exact generated HTML/CSS/JS, but is explicitly weaker
evidence; it must not be labeled HTTP, deployment or real-device certification.

Tests retain source immutability, edit/XSS safety, no unsolicited requests, stale
preview blocking, exact clipboard/export text, reset, keyboard, no-JS, all 20
ZH/EN pages, 1440/768/390/320 reflow, 320px+200% text, and beta consent checks with
no form submission. New workbench tests verify keyboard navigation, scope selection,
empty scope and exclusion retention. Changing a fictional fixture does not permit
weakening these invariants. Test selected actual color tokens, not the old palette.

The existing read-only `PAIA Website` CI verifies exact PR head/main. The existing
main-only live job compares public deployed bytes and captures public desktop and
mobile-sized pages. If CDN bytes lag, retry only that failed job after Pages has
completed; never weaken the comparison or call an unexecuted live job PASS.

Screenshots and these tests do not establish physical-device behavior, complete
WCAG certification, actual invitation-email delivery, measured user comprehension
or improved conversion. Those claims require separate evidence.
