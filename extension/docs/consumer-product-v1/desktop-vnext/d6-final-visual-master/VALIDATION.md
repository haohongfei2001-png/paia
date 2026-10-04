# D6 design validation — not production certification

This record describes only this D6.2 drawing package. It does not recertify D5 or the extension.

Executed locally:
- 59 individual native SVG artboards rendered in installed headless Chromium at their declared viewport sizes; Chinese glyphs were inspected in representative full-size frames.
- No horizontal text overflow in the 59 recorded image states after correction. Owner-review preflight also caught and corrected one compact A02 collision where the search field overlaid the wrapped Reader title/subtitle at 320px; the corrected search now sits below the title metadata without changing content or behavior.
- Seven pooled SVG image documents provide the same named full-window states. Representative wide and compact fragment renders were pixel-identical to their standalone artboards.
- Exact approved icon source hash matched the prior DVN manifest. The 64px derivative is a complete-image Lanczos resample, no redraw/crop/reinterpretation; its hash is recorded in assets/manifest.json.
- Individual state counts corrected during review: dense 2026 shows 3 of 96, chronological total 159+1 unknown, comparison 2/2 rather than 8/8 for a two-change state, and blocked Context removes the blocked-body section.
- Initial Cairo rendering produced missing CJK glyphs and was rejected. Final exports use Chromium; those failed renderings are not the delivered masters.
- File/loopback navigation was unavailable in this environment. Rendering used in-memory SVG/data-image content. No browser security policy was disabled, and no external source/font/provider was requested.

NOT_RUN: actual production extension launch in this task; production unit/browser/CI; physical IME; screen reader; full 200% text matrix; live provider/model fidelity; 100k/120Hz performance; private export; distribution; final owner visual acceptance. Drawn controls are not clickable service implementations.

The visual audit distinguishes independently read current code/checkpoint, actual downloaded bounded D5 artifact crops, the older owner screenshot and authored D6 design decisions. It does not infer whole-production visual completeness from any of these alone.

D6.2 correction archive: `assets/visual-masters-correction.tar.xz`; SHA-256 `ea777e562da5e173fc941d216aa20620087cc0ccce5283719350aa5e2b98b6b7`. The unpack helper applies it after the base archive and refuses a hash mismatch.
