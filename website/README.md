# PAIA Website Refoundation

The public website is a separate runtime from `extension/`. It makes no archive,
provider, storage, or authorization calls. Do not infer extension certification
from this website's tests or illustrative demo.

## Build and serve

Python 3.13 is used in CI. The static production files are checked in; hosting
requires no Python, Node, API key, backend, remote font, or new paid service.

```sh
python website/build.py
python website/build.py --check
python -m http.server 8000
```

Open the repository root, not `website/`. Paths target the existing
`inputarchive.com` root deployment. `CNAME` and the extension are unchanged.

## Edit

- `website/build.py`: paired Chinese/English copy, page structure, metadata,
  sitemap and generated page list. Root is Chinese; `/en/` is English.
- `assets/website/site.css`: the only active website style owner.
- `assets/website/site.js`: progressive enhancement for native mobile navigation.
- `assets/website/demo.js`: fictional, in-memory sample only.
- `website/render_social.py`: render the two local-font 1200x630 social images.

The new pages do not load the legacy `styles.css`, `polish.css`, `i18n.js`,
`experience.js`, or older screenshot assets. They are not silently modified as
part of this runtime boundary.

```sh
python -m pip install -r website/requirements.txt
python -m playwright install --with-deps chromium
python website/render_social.py
python website/test.py
```

`CHROMIUM_EXECUTABLE` optionally selects an installed Chromium executable.
`WEBSITE_TEST_OUTPUT` selects the test artifact directory. The default suite uses
real local HTTP, checks the actual downloaded Markdown file, and never submits
the recruitment form. `--offline-render` exists only for environments whose
managed browser blocks navigation; its report explicitly identifies that weaker
transport evidence. Never call it a deployment or real-device test.

## Product and narrative decisions

Baseline: `8ae0533c2399082cb273c20ed99fc2f1cce29918` (2026-09-26 review).
Source priority: current Consumer Product v1 contracts and implemented code for
capabilities; the owner's authorized design materials for intent. Private source
text, private screenshots and personal examples are not published here.

The previous module-led sequence is replaced by:

1. Recognizable personal problem and a concrete fictional ongoing project.
2. Capture -> Revisit -> Understand -> Reuse, without an organization prerequisite.
3. Complementary roles for chat history, Memory and user-owned working material.
4. Practical data boundaries rather than unqualified security badges.
5. What is integrated, still being verified, and not a current release.
6. A low-risk sample, then a clearly explained invitation-only beta application.

Input Archive, Thought Library and AI Context remain real product spaces, but
not the required order for a visitor to understand the value. Direct Input
material can be reused without first becoming a Thought. The hero is explicitly
labeled a capability illustration, not a production screenshot.

## Truth and privacy boundaries

- Existing ChatGPT capture, local working-text reading/editing, keyword search,
  topics and explicit Context preparation/copy/export are distinguished from full
  Consumer Product v1 certification.
- Current live-site compatibility, private real-export validation, large-library
  recovery and signed consumer distribution are not advertised as fully certified.
- Semantic retrieval, general cloud sync, mobile/voice/MyWrite, more sources and a
  real external AI archive connector are future directions, not available downloads.
- Local-first is not an encryption claim or an absolute no-network promise.
  Optional external AI processing has its own explicit scope and permission.
- Source records, working edits and AI presentation are not interchangeable.
  Saving a quotation does not establish the user's belief.
- Capture, filtering, deletion, external AI processing and Context release have
  distinct meanings. Revocation cannot recall copied/exported third-party copies.
- The website demo uses only fictional data and current-page memory. Editing,
  selection or task changes invalidate old previews. It cannot connect to PAIA or
  an AI; its topic is prepared, not generated. Reload/reset clears it.
- The existing FormSubmit/project-email recipient is retained. Email and explicit
  forwarding consent are required; other questions are optional. Form validity is
  tested without transmitting anything. The thanks page does not assert delivery.
- No analytics, external fonts, archive connection or new service is introduced.
- Existing Chinese legal policy substance and original policy dates are retained;
  the website sample processing clarification is separate. No prices, regional
  availability, release date or new commercial guarantee is invented.

## Verification and maintenance

`PAIA Website` runs exact PR-head and main checks with read-only repository
permissions. It does not run or replace extension certification and does not
write repository files. Synthetic screenshots and the JSON report are artifacts.

The suite covers static locale/metadata/link correctness, four viewport widths,
320px plus 200% text, no-JS content, native menu focus, reduced motion, selected
color contrast tokens, demo keyboard/search/source/edit/stale-release/XSS/reset
paths, exact reviewed copy/export and recruitment-form constraints. Passing these
checks is not a full WCAG audit, physical-device review, live-provider validation,
mail-delivery test or production deployment proof.

Re-read current canonical status before upgrading any website capability claim.
Keep the public status review date explicit. Do not copy private design documents
into this repository when revising the public decision record.
