# PAIA R3 · shared control corner

One selected runnable refinement of PAIA-FLOAT-UI-1.2: **circle → unified capsule → unified board**. In the board state, the original circle's lower-right quarter arc is literally the board corner. The complete 48×48 target and the foreground card remain stationary. There is no separate circle ring, neck, protrusion, or gap in the selected board.

## Open

The conversation delivery includes ready-built `PAIA_Float_R3.html`. The repository sources reproduce it with `python build.py`; `index.html` also uses the adjacent files. No account, model, third-party script or downloaded font is needed. The host and phrase data are the explicit inherited R1/R2 demonstration, **not live authenticated ChatGPT or an installed extension**.

The review controls outside the component switch interactive/three-state views, light/dark, long conversation, growing drafts, and text size. They are not product controls. Custom hover text and native `title` hints have been removed from the component itself; invisible accessible names, visible focus/press feedback and necessary errors remain.

## Why this fits

Instead of adding a second 48px footer, R3 **moves the existing header/tools to the bottom**. This same row contains the fixed corner control. Six equal-width 44px phrase rows remain above it. The board is336×328, only16px taller than the old312px body, while its complete envelope is40px shorter than R2's separate336×368 envelope.

`REVIEW.md` records the actual alternatives and costs. `tokens.json` is the current candidate geometry; `tokens-r1.json` is retained palette/glyph provenance, not authority for old tooltip/neck/board values. The six original card SVGs are unchanged. `export_geometry.py` generates three surface-outline SVGs.

## Source boundary

Inspected main: `34f5188d52ada449b99ac88fb6451db8dabcea6f`. Canonical SPEC/PLAN/ADOPTION/REFERENCES/ACCEPTANCE in the conversation resolve to that same immutable main; their full retained requirements are unchanged except the later owner explicitly authorized this independent fusion/no-tooltip candidate. R1 PR297 head `7e5322d2241fd13112751a5170d3902179e00081`; R2 PR298 head `9a770b22f3e1be88f146905fbd31ff204139710d`. Both were read as unmerged drafts, not assumed deployed.

All files are under the new `fusion-r3-2026-10-18/` sibling design directory. Main, earlier PRs, canonical plans/STATUS, runtime data/insertion owners, CI/version and deployment are not modified. `inheritance.json` identifies the exact small removals from the inherited component; the precise `component-no-hints.patch` is also provided in the conversation ZIP. `demo.js` and its fixture data/receiver are unchanged.

## Reproduce the checks

With an already available Python Playwright and Chromium:

```sh
python build.py
python export_geometry.py
python verify.py --chromium /path/to/chromium
python verify_fusion.py --chromium /path/to/chromium
python review_geometry.py --chromium /path/to/chromium
```

The30 inherited checks are all retained, with only two declared visual expectations substituted: R2's usable capsule area replaces the rejected dead neck, and R3 fixed height is328 instead of312. The new fusion suite has19 PASS and one environment-BLOCKED direct-file navigation probe. All actual component renders/interactions ran through exact HTML bytes in Chromium's document renderer. The initial19/20 report is preserved; the browser policy block is not relabelled as a successful file opening. No policy settings were changed.

The full PNG screenshots and detailed records are included in the conversation ZIP. `evidence/manifest.json` distinguishes generated delivery files from repository source/report assets. Recorded outcomes are offline component evidence, not proof of production cross-origin isolation, actual native undo, OS IME/spoken screen-reader output, browser chrome zoom controls, physical120Hz, real event-to-paint latency, live recommendation quality or sustained human comfort.
