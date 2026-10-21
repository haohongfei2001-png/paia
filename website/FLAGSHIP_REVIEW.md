# PAIA flagship website — review receipt

Date: 21 October 2026. This receipt records completed static checks and the
lead agent's CUA browser observations. **It does not record a Playwright CI
pass, a production deployment, or owner design acceptance.**

## Review basis and scope

- Base commit: `5d46cb2578ce76a3442dd056386868dc37c19827`.
- Independent branch: `design/paia-website-flagship-20261021`.
- Scope: website source, generated bilingual pages, presentation assets,
  page-local examples and website verification. The maintained Python source
  generates 57 HTML routes, `sitemap.xml` and `robots.txt`.
- No extension, product database, production permission model or product
  runtime changes. Website examples use fictional material and transient state.
- No merge, production deployment or replacement of the public website.

The existing distribution manifest, legal content and native contact route
remain. An unavailable installer stays disabled. The creator's original
illustration is byte-preserved. The contact controller was extracted in full
from the existing implementation; its destination restrictions, field whitelist,
consent, pending lock, duplicate protection and truthful outcome handling were
retained.

## Executed verification

| Evidence | Completed result |
| --- | --- |
| Source generation | `python website/build.py --check` found no generated drift. |
| Static contracts | `python website/test.py --static-only`: **3,792 checks, zero failures**. |
| JavaScript syntax | `node --check` passed for `flagship.js`, `flagship-personal.js` and `flagship-contact.js`. |
| Verification code syntax | Python parsing passed for `flagship_tests.py`, `flagship_live.py`, `test.py` and `verify_live.py`. |
| Future live asset inventory | Local dependency collection found 73 reviewed files, including the actual fonts and new scripts. No public readback was executed. |
| CUA layout inspection | The lead agent verified **88 layouts: 11 routes × 2 languages × 4 viewport widths**, at 320, 390, 768 and 1440 CSS px. |
| CUA Archive / Thought | Archive and Thought browsing and editing interactions were exercised. |
| CUA AI Context | Independent closed defaults, content edit/delete/undo, and global pause retaining child scope choices were exercised. |
| CUA Prompt Reuse | Edit, pin, hide/undo, unfinished draft preservation, rejection of a 151-character sample, and insertion at the selection end while preserving selected draft text were exercised. |

The local machine-readable report is
`website-test-artifacts/report.json`: `evidence: STATIC_ONLY`,
`browser: NOT_RUN`, no private data and no contact submission. **`NOT_RUN`
describes the automated Playwright suite; it does not erase the separate CUA
browser observations above.** Responsive browser viewports are not physical
device or screen-reader qualification.

## Written checks awaiting actual CI execution

The unchanged GitHub website workflow still invokes `website/test.py`. The new
generation selects `flagship_tests.py`; the prior modules and visual baselines
remain as historical evidence. The owner's full-site design authorization
supersedes their old visual freeze. Functional requirements were migrated rather
than converted to unconditional passes; see
[FLAGSHIP_TEST_MIGRATION.md](FLAGSHIP_TEST_MIGRATION.md).

The full Playwright suite is written but **has not yet run**. It includes actual
local HTTP route journeys, four viewport widths, 200% text, keyboard behavior,
reduced motion, forced colors, no-JS paths, original/working text separation,
Context authorization boundaries, editable prompt management, exact 150/151
compound-grapheme limits, IME handling and draft-safe insertion.

Its contact scenarios use a synthetic intercepted transport: accepted and
unconfirmed outcomes, pending locks, duplicates, explicit retry, malformed
responses, network errors and the actual 15-second timeout. These browser
scenarios are **pending**, not inferred to pass from the unchanged controller
or the static result. No real message is submitted by the suite.

`verify_live.py` similarly selects the new `flagship_live.py` after a future
authorized deployment. Exact public byte comparison and public browser checks
remain unexecuted. The subsequent Draft PR's actual run, at its recorded commit,
must supply CI evidence; this receipt makes no CI or live-site pass claim.

## Final packaged-preview check

The generated single-file HTML was served through the local preview server and opened in Chrome. Internal About navigation, same-page language switching, browser Back, Demo tab selection, and contact validation were exercised. The contact preview uses a normal button to validate locally; a valid email plus explicit acknowledgement shows a local-only result, and an invalid email clears that result. The iframe does not allow form submission and the package CSP denies network connections and form actions.

The responsive review also verified the mobile menu opens and Escape closes it. Screenshots were captured from the implemented pages. A direct file-protocol browser check was unavailable in the managed browser; the exact packaged HTML was verified over local HTTP. No external contact request was sent.
