# PAIA flagship website — revision 3 review receipt

Date: 21 October 2026. This receipt separates revision 3 implementation and
executed source checks from the historical revision 1 and revision 2 evidence.
**Revision 3 source checks, the targeted CUA review and the packaged HTML review
were completed before submission. Commit-specific CI is reported on Draft PR
[#310](https://github.com/haohongfei2001-png/paia/pull/310); historical CI below is
not a pass for revision 3. No production deployment or owner design acceptance
is claimed.**

## Scope and revision

- Base commit: `5d46cb2578ce76a3442dd056386868dc37c19827`.
- Revision 3 starting commit: `40dc853b69be9165783d2d8ccd031b4d1b4022c8`
  (the revision 2 checkpoint, not a revision 3 verification target).
- Independent branch: `design/paia-website-flagship-20261021`.
- Website-only source, generated pages, assets, fictional page-local examples
  and verification. No extension, product database or product permission-model
  changes.
- **57 HTML files:** 19 English root pages, 19 Chinese pages and 19 identical
  `/en/` aliases. The generator also owns `sitemap.xml` and `robots.txt`.
- No merge, production deployment or replacement of the public website.

## Revision 3 implementation under review

The opening now contains a compact, operable three-space example. It begins
with the writing record. The Archive directory is available through a native
disclosure, retaining search and record selection; its source date follows the
selected record. Thought Sections can be opened and returned from, and Context
uses the existing independent controls. The full Demo remains directly linked.
The lower writing continuation keeps its own unchanged original and propagates
an accepted working edit to its paired Topic reading. These examples have
separate page-local state; no shared account or AI connection is implied.

How it works uses a continuous product journey with source disclosure, Topic
reading and a real Prompt Reuse component. Use cases provides three native
expandable scenarios. About gives the unmodified drawing a larger setting and
keeps the complete unresolved story. Notes and articles use a featured entry,
continuous reading and native contents navigation. Shared type is Manrope plus
the self-hosted PAIA Sans SC subset; the current soft-blue symbol is retained.

Two How review findings were corrected and checked again in the browser: the first product scene follows a shorter opening without a second
introductory paragraph, with reading material above its directory on small
screens; Prompt's introductory copy is reduced to two sentences and its
availability note sits at the end of the section. The Prompt example uses the
writing scenario supplied by the shared component. The Thought link labels
describe opening the library, matching their actual destination.

The four product permissions remain distinct from the four Context content
scopes. Every Context instance begins closed; reading or editing does not grant
access. The retained launch manifest still has no verified store URL or release
version. Live AI organization, external Context connections and cloud transfer
remain in development. Contact transport, its explicit consent and native
fallback, and the legal source remain in place.

The five requested skills were read as actual upstream material and applied to
structure, content, typography and interaction review. Their sources and uses
are recorded in [README.md](README.md). The Impeccable context launcher/binary
was unavailable; existing project context and current product contracts were
read directly. No Impeccable CLI or detector result is being asserted.

## Revision 3 executed evidence

| Evidence | Recorded scope |
| --- | --- |
| Generated-source consistency | `python website/build.py --check`: **59 generated files checked**. |
| Static contracts | `python website/test.py --static-only`: **3,990 checks, zero failures**. `browser: NOT_RUN` describes this static command only. |
| Source syntax and whitespace | Revised Python source rendered successfully; `node --check` passed for the workspace, personal and homepage controllers. `git diff --check` passed. |
| Chinese font | **777 required code points, zero missing**, 237,536-byte self-hosted WOFF2. |
| Visual review | Actual desktop browser at 1363 × 936 and a 390 × 844 CSS-pixel iframe were reviewed for Home, How, About, Demo, Get PAIA and Contact. A separate reviewer inspected Use cases, Notes, an article and Privacy at desktop and 390 px. English Home was additionally checked at 390 and 320 px; its 320 px title was corrected and rechecked. These are browser viewports, not physical-phone tests. |
| Compact opening | Expanded record disclosure, searched the original text, switched records and observed matching source dates; edited working text with the original unchanged; switched tabs with keyboard, opened a Thought Section and returned to its directory. |
| Homepage continuation | Saved a fictional edit, observed the paired Topic echo, verified the unchanged original and zero granted Context choices. |
| Context | Desktop opening: view/edit did not grant access; a card choice did not open global access; global pause retained that choice. Mobile lower Context: edited My Now and observed all five visible access switches still off. |
| How and Prompt | The shortened first scene now shows the actual expression in the 390 px opening viewport. The live Prompt draft follows the moving-day writing scenario. Insertion retained a fully selected draft at its end, kept the board open and did not send. A second precise selection inserted the chosen prompt text. |
| Navigation and reading | Mobile menu opened and Escape closed it. Use cases' three disclosures opened; Notes linked to its intended article; contents disclosure and `#topic` navigation worked on desktop and mobile. Privacy's six section targets existed and `#policy-6` was opened, with the heading visible below the fixed navigation. No horizontal overflow was observed in those reviewed layouts. |
| Real launch/contact state | Installation remained disabled. Normal contact consent was required and unchecked; no real message was submitted. |
| Packaged HTML | The exact single HTML was served over local HTTP and opened independently. Archive edit/source retention, About navigation, language switching, browser Back, Demo Thought reading and child Topic permission boundaries worked. Offline contact accepted valid local input, cleared that success after invalid input, and had no form action or submission capability. |
| Full website CI | Runs after the commit is submitted. Review the current-head website check on Draft PR #310; the previous revisions' results below do not certify this source. |

The package contains 57 routes and embeds all active styles, scripts, fonts and
artwork. No direct `file:` protocol run, physical-device test or screen-reader
qualification is claimed. Browser screenshots are actual viewport captures;
mobile delivery images crop the 390 × 844 review iframe without changing its
contents. The final package report records its exact SHA-256 and dependency list.

Separate visual and technical reviews removed the first revision-3 full-window
hero, corrected narrow-screen nesting, increased functional text contrast and
size, shortened repeated How introductions, and unified its writing sample.
The Impeccable detector CLI was unavailable; these are manual review results,
not a claimed automated design score.

## Historical revision 2 implementation and observations

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

### Executed on revision 2

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
| Revision 2 CI, recorded after the original receipt | Commit `40dc853b69be9165783d2d8ccd031b4d1b4022c8` passed [run 39532598832](https://github.com/haohongfei2001-png/paia/actions/runs/39532598832): **5,585 checks, zero failures**, Chromium 143.0.7499.4. The production live-verification job was skipped. This result belongs to revision 2 only. |

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

## Interpreting the evidence

The original revision 2 receipt left full CI pending; its subsequent successful
run is recorded above with the actual commit. Revision 3 requires its own run.
The existing workflow invokes `website/test.py`, which selects `flagship_tests.py`.
It covers local HTTP routes, keyboard and media preferences, no-JS paths,
original/working-text separation, Context boundaries, prompt management,
150/151-grapheme limits, IME handling, draft-safe insertion and intercepted
contact outcomes. The homepage continuation checks and newly placed compact
scene must be assessed for the current revision as well. See
[FLAGSHIP_TEST_MIGRATION.md](FLAGSHIP_TEST_MIGRATION.md).

Contact browser scenarios use synthetic intercepted responses; they do not send
a real message. The offline package separately prevents contact submission and
only checks form validity locally. The revision 2 package observations are
recorded above; [OFFLINE_PREVIEW.md](OFFLINE_PREVIEW.md) documents rebuilding.
Static package checks are not a replacement for browser execution.

No revision 3 production readback has been run. `verify_live.py` remains
available for a separately authorized future deployment. Any later CI or package
result should be recorded with its actual commit and execution scope.
