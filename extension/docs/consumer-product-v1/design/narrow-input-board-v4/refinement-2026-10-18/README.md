# PAIA · Floating double-card component refinement R1

One selected refinement of **PAIA-FLOAT-UI-1.2**. This is a runnable, offline design component with SVG/CSS parameters and actual Chromium screenshots; it is **not a production-extension patch or an automatic replacement of the canonical v1.2 design**.

Base main: `34f5188d52ada449b99ac88fb6451db8dabcea6f`; base tree: `38e391eef5971d7b41872a76c1ff13976ced20f2`. Independent branch: `design/float-ui-1.2-polish-20261018`. All new files belong to this directory. Main, existing PRs, production runtime, canonical plans/STATUS, CI and versions are unchanged by this work.

Read the existing [SPEC](../../../NARROW_INPUT_BOARD_V4_SPEC.md), [PLAN](../../../NARROW_INPUT_BOARD_V4_PLAN.md), [ADOPTION](../../../NARROW_INPUT_BOARD_V4_ADOPTION.md), [REFERENCES](../../../NARROW_INPUT_BOARD_V4_REFERENCES.md) and [ACCEPTANCE](../../../NARROW_INPUT_BOARD_V4_ACCEPTANCE.md). Their source/privacy/domain rules remain authoritative.

## Open the prototype

Open `index.html` alongside its four CSS/JS files in a normal browser. No build, account, remote font, library, API or paid service is required. Alternatively run `python build.py` and open the generated **PAIA_Float_R1.html**, a single self-contained file. The delivered review archive includes that file.

The top controls and “环境检查” belong to the review harness, not PAIA. Switch between interaction and three-state comparison. The environment drawer provides English/Chinese fixtures, home/long conversation, 200% component text, reduced motion, opaque fallback and a multiline draft. Typing in the example composer changes its natural height; the entry follows it. The host is a reconstruction from the supplied design reference, not a claim about the current authenticated ChatGPT UI.

Click the circle to open/close at the same point. Click a candidate or the capsule body to insert into **this page's example textarea only**. It never sends. Search, whole-text detail, create/edit/save, pin, reorder, hide/restore and split operate on in-memory synthetic fixtures. Tab/Enter, row Up/Down, Left/Right to row-more and Escape are supported; the board is nonmodal. Unsaved edits receive an in-board leave guard. Reloading resets fixtures; no private archive is read or stored.

## The selected visual decisions

**Two planes, not one opaque block.** The two cards stay 21×14px, 3:2, radius 3.25px. A restrained alpha gradient and thin edge separate the exposed rear strip from the foreground. There is no blur filter, heavy 3D highlight or decorative texture. The same foreground stays at `(14.75,17)` within the same 48px circle. Rear translations are `(-2.5,0)`, `(-5,0)`, and `(-5.25,-1.5)`px. Horizontal overlaps are about 88.1%, 76.2% and 75%; the last state's vertical displacement is separate from that percentage. No rotation or recentering per state.

**A complete circular rim, with shallow overlap.** The board no longer pinches into a concave melted neck. Its 18px lower-right corner sits slightly behind the unchanged circle. The board's `right:34px; bottom:34px` relative to the 48px anchor gives a small optical overlap while keeping actual row/menu/editor controls clear. The circle does not move. The capsule preserves the approved soft neck and distinct body/toggle targets; the neck itself is not interactive.

**Complete controls in one quiet board.** The ordinary board stays 336×312px, with a compact 43px inner header and six 44px rows. Search replaces the header view; editing and management reuse the same body. Text and separator alignment stay unchanged even though the row-more hit region has been moved clear of the circular overlap. Persistent messages participate in layout rather than covering Save/Cancel. Genuine narrow/short-space fallback retains logical view and dirty work.

Use [tokens.json](tokens.json) and [component.css](component.css) for exact chosen values. The six [SVG assets](assets/) use the same geometry/material in light and dark. `icon-review.html` compares their actual 44/48/50px optical scales; **48px remains the single selected component size**. The SVG assets include a standalone circular backing for inspection; shell pairing remains in the component, not in a replacement global logo.

## Browser evidence

`python verify.py --chromium /path/to/chromium` runs 30 grouped checks and recreates the source-linked report and screenshots. Python Playwright and an already-installed Chromium are required for verification only; the prototype itself has no dependencies.

The final recorded run passed **30/30** in Chromium **144.0.7559.96**, at 1440×960 CSS pixels / DPR1 and DPR2, plus a 390×844 narrow fixture. It checked fixed target and foreground bounds during state changes, rear offsets, pointer/keyboard behavior, selection-preserving fixture insertion, search/IME events, 150/151 graphemes, dirty edits, error-message flow, corner hit-testing of Save, resize/recovery, reduced motion, forced colors and zero external requests/unhandled script errors. See [verification.json](evidence/verification.json), [geometry.json](evidence/geometry.json) and [REVIEW.md](REVIEW.md).

The renderer receives the exact standalone HTML through `page.set_content`: this managed environment blocks both file and localhost URL navigation. No browser policy was disabled. These are genuine Chromium render/interaction results of the offline document, not navigated live-site screenshots or an installed extension. A normal browser can open the delivered local files; file-URL navigation itself was not verified here.

Screenshots are produced at their stated CSS size without enlarging the component. The delivered archive includes lossless PNGs for light/dark comparison, long conversation, dark editor, narrow viewport and DPR2, plus the SVG size sheet. Repository screenshot availability is stated in `evidence/manifest.json`; a compressed preview is not a byte-identical PNG.

## Bounded integration handoff

The current Prompt owner should first reconcile the latest main and active PR heads. PR #295 was observed at `545aa4a6c2307bdbc4440b1af82b84397679b8bc` during inspection; that is dated context, not a request to restore it. The scope claim is in its comment `6244362362`. Do not pause its authored/theme/status work or transplant whole files from this prototype.

1. Extract the scoped material roles, glyph geometry, capsule path, board/circle layering and safe interaction clearances. Adapt them through the existing `ui/prompt-surface.html/css/js` and layout/private-frame owners. Keep one persistent toggle coordinate during any real iframe-envelope change.
2. Preserve the production Family/Manual/History/Reply ownership, full qualified history ranking/cursor, current-body eligibility, grants, source purge, single insertion arbiter, receiver binding, selected-text protection, native undo and UNKNOWN/no replay. The demo's `Array.filter`, synthetic IDs, local save/mutate functions and `textarea.setRangeText` **must not replace these owners**.
3. Preserve all existing lawful management and range operations not represented completely by the finite fixtures. Do not ship the synthetic host, review controls, sample content, clipboard diagnostic or page-wide demo CSS. The component's adapter seam is illustrative; production still uses its authenticated extension frame and original receiving protocol.
4. Retest changed native source/release geometry, focus/IME, target/privacy and visual dependencies. Reuse unchanged qualified evidence with its original identity. No production tests, release, deployment or canonical-plan edit is made here.

**Still unverified:** actual installed ChatGPT integration, source/release parity, real host selectors, production native undo and receiver isolation, screen readers and OS IME, Safari/Firefox, physical120Hz, real event-to-paint p95, sustained human comfort and live-provider usefulness. Composition-event tests do not prove OS IME; synthetic denial tests do not certify production security. No third-party independent review was performed.
