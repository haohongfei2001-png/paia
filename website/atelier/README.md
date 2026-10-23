# PAIA Atelier V9 — official homepage

Owner request, 23 October 2026: make the Thought Library presentation less rigid;
replace the overly derivative hero background while retaining the approved hero
content and other design; publish this version on the existing official site.

## Source and finite scope

This is the conversation's V8 design continuation, not another redesign of the
older production homepage. The prior production baseline is
`3bbd033b760701b5267a813d23ea94d26760c3b0`. The source here replaces only the paired
homepages and English alias. Existing interior pages, standalone demo, release
manifest, contact destination and consent, legal text, extension, services,
permissions and deployment workflow are unchanged.

`home.zh.html` and `home.en.html` are the paired canonical templates.
`../atelier_home.py` is called by the existing `../build.py` for index.html only.
`../../assets/website/atelier/site.css` owns the homepage styles;
`site.zh.js` / `site.en.js` own the fictional page-local interaction.
`en.tsv` records the reviewed English wording. It is a translation reference,
not a browser dependency. Edit the paired templates and controllers together,
then run the existing build; do not edit generated index.html files alone.

## Design

- Keep the V8 hero text, hierarchy, actions, logo and product-preview geometry.
  Replace the enclosing disk/conic field with an open, soft, folded-line field.
- Present the Thought Library with staggered topic directories beside a broad,
  directly editable reading plane. Directory content remains real topic titles
  and named chapters, not quotations, counters, descriptions or source badges.
- Keep the established four Context cards, original closing illustration,
  downstream sections and approved R3 glyph/geometry.
- Initial content is prerendered for no-JavaScript reading. Interactive changes
  remain in browser memory and are explicitly fictional.
- Both real main-app permissions and this example begin off. Opening content is
  separate from permission. No endpoint or model call is introduced.

The approved R3 source files are copied byte-for-byte to homepage-owned assets;
English R3 differs in consumer text only. Its source stays under the original
extension design directory, which this website change does not modify.
The homepage adapter routes Escape to the active Context modal before the
floating component, including after a modal chapter change replaced focus.

## Assets

Original PAIA artwork and Instrument font assets are reused. The additional
Noto Serif SC subset is locally hosted, licensed under SIL OFL 1.1, with its
license and provenance retained. No remote fonts, analytics, third-party scripts,
account connection, real archive or background AI processing is loaded.

## Verification

Run `python website/build.py --check` and `python website/test.py` as before.
For an existing installed browser, set `CHROMIUM_EXECUTABLE` to its actual path.
The new homepage checks live in `../atelier_checks.py`; existing interior,
standalone-demo, input/IME, contact/consent and asset checks are retained.
`preserved-files.json` locks all prior website assets and non-home generated
outputs to the exact production baseline. The historical homepage-only freeze
is replaced by the new owner-requested homepage checks, not relabelled as a
pixel match to the retired homepage.

`../verify_live.py` compares the deployed HTML and every new owned asset against
this checkout, then exercises the actual served homepages and unchanged demo.
This is website evidence, not installed-extension, live AI, synchronization,
physical-device or whole-product acceptance.
