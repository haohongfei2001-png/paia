# PAIA / Atelier 17 — a considered, lively homepage

Date: 2026-10-30. Starting `main`:
`e99e7ac5aeea73f727acf707fc7f7e651fa2cf2f`.
Homepage identity: `data-atelier-version="17"`,
`data-website-release="atelier17-20261030"`.

## Design purpose

The owner requested a more refined, lively official website, with the care and
clarity associated with Craft. This release gives PAIA a lighter opening, calm
typography, generous spacing and restrained blue, lavender and warm accents.
The product's own words and recognizable brand remain the material of the page.

The opening places a concise product explanation beside a small, tangible
preview. Three deliberate tabs show keeping an original input, following a
thought and reusing an expression. A reader can understand the progression
without scrolling through a large moving stage. The Archive and Thought Library
below retain their complete original records in normal document flow. Small
hover responses and a finite arrival animation add movement without taking
control of scrolling or rotating the visitor's selected view.

## Implementation and ownership

The canonical `home.zh.html` and `home.en.html` still pass through
`website/atelier_home.py` and `website/build.py`. The homepage loads the existing
`site.css` plus the new `atelier17.css`; `presentation17.js` is its single current
presentation owner. The new entry assets use `v=20261030-a17`. Prior presentation
assets remain available for their historical versions.

The existing `.p16-apparatus`, `.p16-reader` and Archive/Thought/Context/reuse IDs
remain useful semantic hooks. V17 removes the old large perspective and pinned
scroll composition from the current presentation. It does not rewrite the old
V16 checks to declare that retired composition successful.

The original `context12.zh.js` / `context12.en.js` and approved R3 component and
geometry adapter retain their bytes. Existing interior pages, independent demo,
release manifest, contact destination and CI workflow retain their owners.
`preserved-prism16.json` remains the inherited immutable reference for 149
protected files; it has not been regenerated from this candidate.

## Product and interaction boundaries

| Surface | What this homepage actually does |
| --- | --- |
| Hero preview | Selects one of three prerendered fictional illustrations. Selection changes the visible panel and tab semantics only. |
| Input Archive | Shows the same four original fictional inputs and their existing expression IDs. Original expression text remains exact. |
| Thought Library | Shows the same three topics, nine chapter labels and two complete original records in the selected chapter, with their original dates and order. The homepage reader is a presentation. Direct editing is available through the independent demo link. |
| AI Context | Opens the existing example dialogs and keeps edits in page memory. Opening or editing content grants no permission. All four card switches and the master switch begin off. Pausing the master preserves card choices; choosing a topic does not enable either parent permission. |
| Prompt reuse | Uses the original R3 six-row component. Only an explicit reuse action appends wording to the complete existing fictional draft. The draft is readonly. Saving or mutating saved expressions returns an explanatory unavailable result. The independent demo remains the full interaction destination. |
| Installation and contact | The primary CTA leads to the working example. The release manifest still has no verified public installation URL. The download page retains that honest unavailable state. Contact retains its separate consent gate. |

The homepage establishes no account or AI connection, sends no messages and adds
no model or application transport. Preview selection, Context edits and reused
draft text are not persisted. Nothing automatically submits the example draft.
The page explicitly identifies the content as fictional website examples.

## Geometry and accessibility decisions

R3 calculates its available space from the host and composer rectangles. Its
host therefore uses the entire reuse card, with inherited fixed host heights
cleared. The host is transparent; the composer and footer link have separate
positions. The card reserves enough vertical room for the approved board above
the draft. The board can cover part of the explanatory copy while deliberately
open, but must remain inside the visible card. Pointer handling keeps the clear
host from intercepting surrounding content while the R3 controls and draft
remain usable.

The Reader uses 15 px body text at the desktop layout, 14 px in the tablet and
ordinary mobile layouts, and 13 px at widths of 360 px or below. Paragraphs keep
their full text and reading order. The responsive targets are 320, 390, 768 and
1440 CSS pixels; actual clipping and overflow require browser verification.

Hero tabs have a labelled tablist, linked tab/panel IDs, `aria-selected`, hidden
inactive panels and one keyboard tab stop. Arrow keys wrap, Home selects the
first tab and End selects the last. The static HTML begins with Archive visible;
tabs are enabled by the presentation runtime. Essential Archive, Reader and
Context overview content remains in the HTML without JavaScript.

The mobile menu updates its expanded state, and Escape closes it and restores
focus to its trigger. Context retains the established native modal and focus
return behavior. Reduced motion removes the entry animations and animated
scrolling. Forced colors has explicit surface, button and selected-tab styles.

## Verification record and remaining work

Recorded local static run on 2026-10-30:

```text
PYTHONPATH=/tmp/paia-website-test-deps python website/test.py --static-only
{"checks":5989,"failed":[],"evidence":"STATIC_ONLY","browser":"not run"}
```

The generation check also reported `Checked 59 website files`.
Python syntax and `git diff --check` passed for the verification integration.
These are recorded local checks, not a completed browser or deployment result.

V17 dispatch now reaches `atelier17_checks.py` through the existing Atelier,
publication and harmony routes. The V16 suite and older version branches remain
intact. The V17 static checks verify the inherited protected files, complete
original prose, product structure, default-off controls, approved runtime owners
and linked preview panels. Existing independent demo, contact, installation and
publication gates continue to run.

The browser checks are written to exercise actual tab selection and keyboard
focus, Context editing and permission separation, native menu focus return, R3
reuse and preservation of the complete draft. They compare the composer, entry
and expanded board bounds with the visible card. The draft additionally has a
real pointer hit test and click-to-focus check, so correct rectangles cannot
hide a `pointer-events` regression. The suite also retains the shared viewport,
no-JavaScript, reduced-motion, forced-colors and external-request checks.

**Pending:** the full browser suite and the GitHub `PAIA Website` workflow must
still run against the final candidate. CUA visual review is separate evidence
and is not recorded here as completed. After publication, the existing
`website/verify_live.py` exact-byte and public-browser readback must verify the
deployed revision. No CI, deployment or live-verification pass is claimed by
this note.

The existing CI commands remain:

```text
python website/build.py --check
python website/test.py
```

These checks establish website behavior and preservation boundaries. They do
not substitute for visual review, physical-device testing or installed-extension
acceptance.
