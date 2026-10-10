# PAIA website V2 — exact wording, useful continuity

Current candidate: **PR #240**, branch `feat/website-words-worth-returning-20261010`.
Owner review is required before merge or deployment. The production site has not
been changed by this candidate. Website code and product code are separate scopes.

## What the site now demonstrates

PAIA is a Chrome extension for the person's own AI inputs. A fictional learning-
and-writing example demonstrates a practical distinction: a generic request for
an outline does not yet contain the previously chosen question or the limit on
its evidence. An opened personal Topic and the current draft are adjacent on the
home page. The visitor selects exact wording, inspects it in the narrow board,
and deliberately inserts it without replacing the draft or sending a message.

The two explanatory observations beneath the draft match literal sample text
only. They are explicitly labelled a **website demonstration guide**, not a PAIA
feature, a semantic evaluator, an AI result or a claim of quality improvement.
Removing the exact passage reverses the observation. A mobile switch moves
between the same reading and task states; it never creates another draft.

The site fairly acknowledges native ChatGPT Search, Projects and Memory, as well
as notes and prompt-template tools. PAIA is not presented as necessary for every
ChatGPT user. Its differentiator is the joined input-level workflow: original
source, working revision, human Topic/Section organization and intentional exact
reuse. Real external Context, Pro recommendations and cloud sync remain pending.

## Page responsibilities

- Home: category, concrete wording-to-task proof, fit, data boundary, invitations.
- Demo: complete working/source editing, Find, Topic Root/Section reading, NIB
  search/check/edit/reuse, independent default-off Context scopes.
- How: first-use instructions, actual controls and operation order; no duplicate
  interactive tour. All preview permissions begin closed.
- Use cases: writing claims, learning questions, recurring personal constraints.
- Beta: the unchanged invitation form, consent and delivery rules.
- Availability: consumer-facing local features versus unavailable services;
  engineering source evidence is a separate link.
- About and product articles: subordinate brand origin and explicit principles,
  with fair native-feature comparison, not a competing home-page story.
- Data and permissions: capture, internal processing, external reads and sync are
  distinct decisions. No new permission or form-processing rule is introduced.

## Source ownership

`build.py` owns generated routes, metadata and site shell. `story.py` is the single
source of the current fictional inputs and reading presets. `product_hero.py` and
`flagship_home.py` own the home; `core.py`, `topic_preview.py`, `prompt_preview.py`
and `product_sections.py` own the complete Demo. `usage_pages.py` contains the
practical How and Use cases pages. `pages.py`/`product_pages.py` retain the other
interior content. The shared visual system remains in the existing CSS files;
`usage.css` is scoped to the practical pages.

`site.js` retains tabs, finite motion and native navigation. `home-core-v2.js`
owns Demo editing/Topic/Context only. `narrow-board.js` alone owns the narrow
board and its composer. `value-proof.js` owns the website guide and mobile view
switch, never product data or permission. No external runtime dependency,
tracking, storage, model or generation pipeline is added to visitor pages.

## Build and verification

```sh
python website/build.py
python website/build.py --check
pip install -r website/requirements.txt
playwright install chromium
python website/test.py
```

The original 48-route, four-width, 200%-text, keyboard, reduced-motion, forced-
colors, no-JS, source/draft/scope safety and form checks remain. V2 adds literal
value-proof reversal, preserved mobile state, scenario consistency, retired-
example rejection, practical-page default-off checks and unchanged-form hashes.
`WEBSITE_TEST_OUTPUT` selects evidence output; `CHROMIUM_EXECUTABLE` can choose an
installed browser. The default test captures real generated pages over loopback
HTTP. `--offline-render` is explicitly labelled DOM evidence only, not HTTP or
origin-storage certification; it does not replace the ordinary CI test.

`website/accessibility.py` takes a trusted axe-core distribution through
`WEBSITE_AXE_SCRIPT`. It retains incomplete findings instead of reporting an
unqualified compliance certificate. `website/observe_live.py` reads the unchanged
production baseline without submission and packages the exact website sources
without font bytes. `website/verify_live.py` is for a future separately authorized
release; a Draft PR must not claim to have passed new-version live readback.

`website/review_bundle.py` creates four offline, self-contained prototypes and a
review index. Current bundles exclude V1 screenshots and contain no font files.
The screenshots show the real build; offline prototypes use system fallbacks.
Application/policy links intentionally open the existing production site.

## Design and authority

[V2 scenario comparison and design decision](receipts/FLAGSHIP_V2_DESIGN_20261010.md)
and [current claim-to-authority mapping](PRODUCT_CAPABILITY_MAP.md) describe the
accepted website scope. V1 receipts are historical evidence, not the current
recommended narrative or source of current test results. The rejected example is
not used in generated pages, current Demo data or current prototype output.

No extension runtime, formal Canonical, product plan, workflow, provider, account,
billing or cloud service is changed. Current consumer comprehension, willingness
to install and retention remain unmeasured; automated tests do not prove them.
