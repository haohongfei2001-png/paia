# PAIA flagship website — revision 2 review receipt

Date: 21 October 2026. This receipt separates checks executed on the second
revision from the first revision's historical evidence. **Revision 2's full CI
run is still pending. No production deployment or owner design acceptance is
claimed.**

## Scope and revision

- Base commit: `5d46cb2578ce76a3442dd056386868dc37c19827`.
- Independent branch: `design/paia-website-flagship-20261021`.
- Website-only source, generated pages, assets, fictional page-local examples
  and verification. No extension, product database or product permission-model
  changes.
- **57 HTML files:** 19 English root pages, 19 Chinese pages and 19 identical
  `/en/` aliases. The generator also owns `sitemap.xml` and `robots.txt`.
- No merge, production deployment or replacement of the public website.

Revision 2 follows one expression about writing across the homepage. Its working
text can be edited locally; the original stays separate and the same edit appears
in the Topic reading below. The full Demo remains a separate route. How it works
uses the same example; use cases cover writing, an ongoing question and a
personal choice. About gives the unchanged original drawing more space and
retains the story's unresolved facts. Cool white, blue-gray and a self-hosted
Chinese typeface replace the first revision's violet presentation.

The existing distribution manifest, legal wording and contact destination are
retained. An unavailable installer stays disabled. Website examples do not read
personal chats, call AI, grant real access or persist edits across reloads.

## Executed on revision 2

| Evidence | Recorded result |
| --- | --- |
| Generated-source consistency | `python website/build.py --check`: **59 generated files checked**, comprising 57 HTML files, sitemap and robots. |
| Static contracts | `python website/test.py --static-only`: **3,870 checks, zero failures**. Its browser result is `NOT_RUN`. |
| JavaScript syntax | `node --check` passed for the homepage and personal-interaction scripts. |
| Source whitespace | `git diff --check` passed. |
| Chinese font coverage | **776 required code points, zero missing**; the reviewed self-hosted font is 236,264 bytes. |
| Responsive CUA inspection | **88 layouts: 11 routes × 2 languages × 4 viewport widths**, at 320, 390, 768 and 1440 CSS px. No horizontal overflow was observed. |
| Homepage CUA interaction | Edit and save were exercised. Original text remained unchanged, Topic reading reflected the working edit, and focus returned to the edit control. |
| Context and Prompt CUA interaction | Viewing and editing My Now left all five visible access switches off. Prompt insertion preserved the entire selected draft, inserted at the selection end and returned focus to the composer. |
| Mobile navigation | The menu opened and Escape closed it in the 390 px review viewport. |
| Revision 2 packaged preview | The exact generated HTML was served over local HTTP. Homepage save, blank rejection and Escape cancellation; About navigation; language switching and browser Back; Demo Thought selection; and valid/invalid offline contact checks were exercised. |

The static report's `browser: NOT_RUN` describes the automated Playwright suite;
it does not describe or invalidate the separate CUA observations. Browser
viewport checks are not physical-device or screen-reader qualification.
The packaged contact confirmation responds to mouse and keyboard interaction.
Its local validation clears a previous valid result when the email becomes
invalid. No contact message was sent. A direct `file:` protocol check remains
unavailable in the managed browser; the delivered single HTML is self-contained.

## Historical evidence — revision 1 only

Commit **`33806eb`** passed the complete website CI run
[39523076190](https://github.com/haohongfei2001-png/paia/actions/runs/39523076190),
with **5,417 checks**. That result belongs to that commit and is not a revision 2
CI pass.

Revision 1's separate CUA observations covered Archive and Thought browsing and
editing; Context closed defaults, editing, deletion/undo and pause with retained
child choices; and Prompt management, unfinished draft preservation, length
rejection and selection-end insertion with selected draft text preserved.

Its packaged preview was also exercised over local HTTP: About navigation,
language switching, browser Back, Demo tabs, mobile-menu open/Escape, and valid
and invalid offline contact validation. The managed browser did not provide a
direct `file:` protocol check. These package observations are historical and do
not certify a freshly generated revision 2 package.

## Remaining revision 2 verification

The full CI suite must run against the revision 2 commit after submission. The
existing workflow invokes `website/test.py`, which selects `flagship_tests.py`.
It covers local HTTP routes, keyboard and media preferences, no-JS paths,
original/working-text separation, Context boundaries, prompt management,
150/151-grapheme limits, IME handling, draft-safe insertion and intercepted
contact outcomes. The homepage continuation checks must be evaluated in that
run as well. See [FLAGSHIP_TEST_MIGRATION.md](FLAGSHIP_TEST_MIGRATION.md).

Contact browser scenarios use synthetic intercepted responses; they do not send
a real message. The offline package separately prevents contact submission and
only checks form validity locally. The revision 2 package observations are
recorded above; [OFFLINE_PREVIEW.md](OFFLINE_PREVIEW.md) documents rebuilding.
Static package checks are not a replacement for browser execution.

No production readback has been run for this revision. `verify_live.py` remains
available for a separately authorized future deployment. Any later CI or package
result should be recorded with its actual commit and execution scope.
