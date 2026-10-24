> **Atelier V13 homepage:** coherent product outcomes and subordinate everyday details. See [PRODUCT_WORLD_V13.md](PRODUCT_WORLD_V13.md). Product example and interior routes retain V12.

> **Atelier V12:** current homepage, example, and shared interior finish. See [POLISH_V12.md](POLISH_V12.md). Historical notes below retain their original scope.

> Current homepage and product example: **V11**. See [REFINEMENT_V11.md](REFINEMENT_V11.md). Earlier notes below describe their original release.

# PAIA Atelier V10 — visual narrative homepage

Owner direction, 23 October 2026: the homepage should present PAIA's value with
art direction and purposeful motion, not ask visitors to operate reduced
application mockups. Improve Chinese typography, archive, Thought Library,
prompt reuse and the daily example. Preserve the color-outline words, manifesto,
Context quartet, private-space illustration, brand and original closing artwork.

## Sources and ownership

- `home.zh.html` / `home.en.html`: paired source templates, used only for the
  homepages by `../atelier_home.py` and the existing `../build.py`.
- `assets/website/atelier/presentation10.css`: scoped visual composition.
- `assets/website/atelier/presentation10.js`: finite presentation timelines,
  navigation and the fictional readonly prompt-reuse adapter.
- `assets/website/atelier/context10.zh.js` / `context10.en.js`: the retained
  Context permission/detail logic, extracted from the V9 page controller.
- `assets/website/atelier/site.css`: existing shared homepage foundation.
  V9 `site.zh.js` / `site.en.js` remain historical assets but are not loaded.
- `../presentation10_checks.py`: current-home checks. The existing independent
  demo and all interior routes keep their prior full safety/interaction tests.

The previous superseded V9 home remains in Git history at
`f2b8db27237aa987864c74ddf2d85c22d5bf8123`. This release changes the homepage,
not extension code, service activation, accounts, real permissions or deployment
configuration. Do not edit generated index.html files without their templates.

## Presentation

The archive illustrates a small remembered phrase locating an expression.
The Thought Library moves the same three text nodes into one topic composition;
it never rewrites their stance or turns generated wording into a user quote.
The sculptural quotation marks are website art, not a new application icon.
The R3 companion uses the approved component and fixed-anchor geometry. Its
sample readonly draft is preset; animation cannot overwrite visitor-authored
text. Deliberate component interaction pauses automatic control. Nothing sends.
The daily example makes reuse concrete, without implying a live external AI read.

Each sequence plays once on entering the viewport and offers pause/replay.
Offscreen/hidden-tab playback is suspended; system reduced motion and no-JS
views expose the complete final compositions. No scroll hijacking, autoplay
sound, infinite animation loop, model transport or visitor data persistence.

The approved Context quartet still starts closed; opening content never grants
access, child choices never grant parents, and a superior pause retains choices.
The retained example explicitly has no real connection. Privacy/contact/legal
routes and the actual installation availability remain unchanged.

## Assets and verification

Original logo/closing art and licensed Instrument assets are reused. A locally
hosted Noto Serif SC Light subset gives the Chinese display typography its own
optical rhythm; `editorial-v10-font.json` records provenance. SIL OFL text remains
in `assets/website/type/atelier-serif-sc-OFL.txt`. There are no remote fonts.

Run `python website/build.py --check` and `python website/test.py`. The existing
PR and main website workflow is unchanged. `preserved-files.json` still locks
original assets/non-home output/workflows. V10 deliberately replaces old home
mock-application assertions with presentation outcomes, controls, node identity,
no-transmission and independent permission tests; the standalone demo's real
editing/IME/navigation/permission tests are not removed.
`website/verify_live.py` reads exact deployed bytes and actual public pages.
Website verification is not extension, AI-provider, sync or physical-device
certification. See the scoped V10 receipt for actual runs and limitations.
