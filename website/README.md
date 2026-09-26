# PAIA public website

The public site is a separate runtime from `extension/`. Website tests and the
fictional examples do not certify the extension, its live provider compatibility,
private data recovery, or signed distribution.

## Current owner-selected direction

Baseline main: `17ac1368df600fab32bb2e22573de9bc7becae26`.

The owner explicitly selected the first English-led editorial concept and asked
for implementation, not further image generation. This revision supersedes the
previous graphite workbench identity. It retains the selected concept's white
background, restrained serif headline, quiet navigation, asymmetric expression
collage, fine connections and first-scroll value hierarchy.

The illustration is authored HTML/CSS with fictional expressions from one ongoing
creator-tool project. It has no generated person, landscape, tree shadow, stock
photo, model-generated scene or external image dependency. The muted back sheets
are original flat typographic compositions, not simulated photography. No
reference screenshot, private design document or real user text is published.

The approved visual reference was not an approved claims sheet. Its invented
user endorsement, film, unrestricted multi-provider integration, automatic
personality conclusions, login and blog links are deliberately not reproduced.
The hero promises recoverable, editable, reusable expression, not an autonomous
agent or universal personal-data collector. The consented ChatGPT capture scope
and invite-only beta status remain explicit.

## Routes and localization

- `/` and root `.html` pages are **English by default**, rendered without JS.
- `/zh/` contains the paired Chinese pages, including legal, demo and beta pages.
- Existing `/en/` deep links still work. Their HTML matches the English root
  counterpart and uses that root URL as canonical; internal links lead to root.
- The locale switch preserves the current page. There is no geolocation,
  language fingerprinting, persistence, or forced client-side locale redirect.
- Metadata has per-page descriptions, canonical, reciprocal language alternatives,
  an English `x-default`, paired social cards and a canonical-only sitemap.
- Root `404.html` is the English Pages fallback; Chinese navigation also has an
  explicit `zh/404.html` page. No hosting or CNAME change is required.

## Build and edit

Production is checked-in static HTML/CSS/JS. It needs no build service, Node
runtime, remote fonts, backend, API key, tracker or paid dependency.

```sh
python website/build.py
python website/build.py --check
python -m http.server 8000
```

Serve the repository root, not the `website/` directory.

- `website/home.py`: bilingual homepage narrative, authored expression collage,
  illustrative three-step journey, use cases, privacy, FAQ and invitation.
- `website/build.py`: shared shell, secondary pages, forms, legal policy text,
  locale routing, metadata, static HTML and generated-path manifest.
- `assets/website/site.css`: sole active website stylesheet. Native system fonts;
  serif branding is distinct from functional body/input typography.
- `assets/website/site.js`: native menu enhancement and in-memory below-fold
  context-selection illustration; no storage, archive or network calls.
- `assets/website/demo.js`: existing fictional full demo, with original/working
  distinction, stale-preview invalidation, safe text rendering, copy and export.
- `website/render_social.py`: regenerate the two 1200×630 cards from authored
  HTML. The generated PNGs are checked in; tests do not re-render them.

The public pages do not load legacy `styles.css`, `polish.css`, `i18n.js`,
`experience.js`, old screenshot assets or extension code.

## Product and privacy boundaries

The information hierarchy is: next use for past expression → why it matters →
one complete example → ongoing project/research/decision use → user control →
questions → clearly scoped private-beta invitation. Input Archive, Thought
Library and AI Context serve the story; they are not a mandatory onboarding chain.

The compact hero is not an app screenshot. Below the first scroll the example
lets people change steps and include/exclude fictional material; unselected text
stays out. The full demo separately supports working-text edits, original-text
comparison, preview, copy and Markdown export. Material/task changes invalidate
old previews. Empty selections do not silently acquire replacement material.
There is no live AI, capture, classification, persistence or archive connection.

Current capability claims remain scoped to integrated beta behavior. iOS/mobile,
voice, general sync, semantic retrieval and a real external-AI reader connector
are future directions, not available installations. User-authored inputs are not
automatically evidence of permanent beliefs. Source, working edits and AI output
remain distinct. Local-first is not an encryption or absolute no-network claim.
User-initiated external copies cannot be recalled.

The beta retains the existing FormSubmit action and recipient, with explicit
forwarding consent. Questions other than email/consent remain optional. No tests
submit the form. The thanks page does not invent a successful delivery receipt.
Original legal policy substance/dates are retained; locale paths and presentation
are updated. The website introduces no accounts or collection permissions.

## Verification

```sh
python -m pip install -r website/requirements.txt
python -m playwright install --with-deps chromium
python website/test.py
```

`CHROMIUM_EXECUTABLE` optionally selects an installed browser.
`WEBSITE_TEST_OUTPUT` selects the artifact directory. `--offline-render` is only
for managed environments blocking browser navigation: it records weaker
exact-source DOM evidence and does **not** certify HTTP or deployment.

The read-only PAIA Website workflow checks the exact PR head, exact main,
deterministic generation, all 30 static HTML routes, 1440/768/390/320 reflow,
narrow 200% text, selected contrast tokens, keyboard/native-menu/reduced-motion,
JS-off content, locale aliases/canonical/internal links, demo immutability,
editing/search, selected text, stale output, exact clipboard/download, XSS and
form validation/consent without transmission. It observes the actual old public
site on the PR and preserves screenshots/reports.

After merge the live job compares deployed public files byte-for-byte, verifies
English/Chinese/legacy English pages at desktop/mobile widths and checks actual
homepage inclusion/exclusion before capturing screenshots. A stale deployment
fails the strict readback; rerun only that failed job after Pages finishes rather
than weakening the assertion. Website-only CI includes `zh/**` in its path filter.

Visual review is separate from automated assertions. These checks are not full
WCAG certification, physical-iOS/120Hz certification, measured user comprehension,
a beta-email delivery test, or aesthetic approval by the owner.

## Writer and maintenance

The VS-05 writer retains extension/canonical-doc ownership. This change does not
modify `extension/**`, Consumer Product STATUS/receipts, existing extension CI,
CNAME, user archives or private design sources. Re-read canonical product status
before raising any website capability claim. Any temporary source-transfer
workflow is branch-only and absent from the integrated production tree.
