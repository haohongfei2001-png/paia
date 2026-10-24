# PAIA floating entry · geometry R2

**One selected design: unified capsule + clearly separate board.** Independent successor to PAIA-FLOAT-UI-1.2 / PR297 R1. Not a new logo, production implementation, canonical-plan update or approved replacement of all earlier engineering requirements.

## Open and inspect

Open `index.html` with the adjacent files, or run `python build.py` and open the generated `PAIA_Float_R2.html`. No build dependencies, fonts, account, network or model are needed. The demonstration host is inherited synthetic R1 context, not the current authenticated ChatGPT page.

The top switch shows interactive mode or the three-state comparison. Environment controls offer two themes, long conversation, growing draft, text enlargement and reduced motion. Search, edit, create, save, pin/order, hide/restore and split operate on R1's in-memory fixtures. Insertion affects only this page's explicit demo textarea and never sends.

## Selected geometry

- A single 48px-high stadium grows from 48px to272px toward the left. The right48px target and glyph never move. A shared skin owns the sole outer border and shadow. The old neck SVG is removed; text and toggle remain separate semantic buttons, without a permanent visual divider.
- The336×312px board is right-aligned with the circle, with **8px clear space above the whole circle**. No overlap, concave notch, bridge, tail or corner dedicated to a protruding button. The original six-row content region remains intact.
- R1's equal21×14px horizontal cards, radius3.25, foreground position, rear offsets, six SVGs, material, text and management are byte-preserved. Only `geometry.css` and `geometry.js` alter presentation/layout; the demonstration heading identifies R2.

`tokens.json` records only the geometry decision and references the unmodified `tokens-r1.json`. `REVIEW.md` explains the rendered competitor and tradeoff. `INTEGRATION.md` gives the bounded extraction path.

## Reproducible verification

With the existing Python Playwright and a Chromium executable:

```sh
python build.py
python verify.py --chromium /path/to/chromium
python verify_geometry.py --chromium /path/to/chromium
```

`verify_r1_inherited.py` is the exact hash-pinned R1 script. The wrapper preserves all30 checks, with the documented case04 substitution: the expressly rejected dead neck becomes usable text area. No privacy threshold, timeout or unrelated expectation is relaxed. The separate geometry suite adds16 checks and actual A/B/detail renders; overlapping coverage is not a statistical quality score.

Full lossless screenshots and detailed reports are in the conversation delivery package; generated evidence identities and repository/delivery distinction are recorded in `evidence/manifest.json`. Re-running the scripts regenerates the PNGs and full reports. The repository contains the source, exact SVG assets, concise verification receipt and evidence manifest, rather than claiming that all generated PNGs are checked in.

## Source and scope

Inspected main `34f5188d52ada449b99ac88fb6451db8dabcea6f`; R1 PR297 head `7e5322d2241fd13112751a5170d3902179e00081`. The22 supplied R1 source/report files reproduce its exact subtree `5d72b58df3528cc15c42c9fb862f5c7f9c85b114`. The original selected PNG was opened and SHA256-matched to the canonical reference. Current SPEC/PLAN/ADOPTION/REFERENCES/ACCEPTANCE were read before work.

The later owner request specifically replaces 'preserve the neck' for this candidate. It does not authorize rewriting all canonical plans. All new files stay in `geometry-r2-2026-10-18/` on an independent branch. Main, PR295, PR297, production code, CI/version and installation remain untouched by this delivery.

Tests are offline Chromium DOM/component evidence only. They do not certify installed-extension isolation, current real-host selectors, native undo, OS IME, spoken screen-reader output, physical120Hz, event-to-paint p95, live provider quality or sustained human comfort. No independent human reviewer or user preference study is claimed.
