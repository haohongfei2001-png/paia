# Flagship website verification — 21 October 2026

## Why the entry point changes

The owner explicitly requested a new design for the entire website, including
its opening, narrative, type, layout, motion and important inner pages. The
previous `art_direction_checks.py`, `presentation_checks.py` and publication
baselines froze an earlier, limited homepage revision. Their old hero DOM,
copy hashes, CSS hashes, frame dimensions and untouched-inner-page hashes are
not acceptance requirements for this authorization.

`website/test.py` recognizes the explicit `data-design="flagship-20261021"`
generation and runs `flagship_tests.py`. It retains the previous suite below
that dispatch and keeps every previous test module and baseline as historical
evidence. No assertion is silently changed to success, no failed historic run
is relabelled, and no new visual snapshot is substituted for the old hashes.
The GitHub website workflow remains unchanged. It continues to check generated
source, execute the actual website test entry and require a clean worktree.

The same generation dispatch in `verify_live.py` selects `flagship_live.py` for
the existing post-deployment job. It compares every generated route and every
active image, script, stylesheet and CSS font with the reviewed local bytes,
then checks real public HTTP pages and synthetic demo interactions. Its asset
inventory follows source dependencies; old unused visual files are not treated
as the current presentation. The public job never submits a contact form. This
change does not execute that job, deploy the site or relax exact-byte checks.

## Current checks and their original purpose

| Original obligation | Flagship verification |
| --- | --- |
| Real source owns generated HTML | `website/build.py --check`; exact 57 HTML routes, sitemap and robots |
| Bilingual routes and English aliases | All route languages, canonical/hreflang, current-entry aliases and exact `/en/` bytes |
| Usable information and assets | One h1, metadata, unique IDs, valid aria references, internal files/anchors, image alternatives and social dimensions |
| Original artwork | The creator's original image retains its existing SHA256 |
| Honest distribution | Same manifest; no install link while the verified target is null; disabled action with an adjacent availability description |
| Legal and contact continuity | Existing legal source is included intact; original recipient, action, native POST, form fields and required unchecked forwarding consent |
| No private-data access | Website demonstrations have no network/storage API; browser observations refuse unexpected remote requests; transient edits and grants reset on reload |
| Usable on small/large screens | All canonical routes at 1440, 768, 390 and 320 CSS px; 200% text at 320; actual browser image loading and no script errors |
| Accessibility and ordinary scrolling | Keyboard tabs, mobile Escape/focus, semantic switches, forced colors, reduced motion, native disclosure and no-JS reading/contact/download paths |
| Original versus working text | Full Unicode/multiline edit, source unchanged, dirty navigation refusal, same-page return, current-text search and explicit no-result |
| Topic reading | Explicit section opening, no sibling-content contamination, return to directory |
| Context boundaries | Four distinct product permissions; four default-off Context cards; inspection separate from authorization; child cannot open parent; paused global access retains card and Topic choices; no fake connection |
| User-managed Context | Direct editing, explicit deletion, same-text undo, close/reopen persistence; these actions leave access unchanged; My Inputs references existing Topics rather than copying archive bodies |
| Exact Prompt insertion | Caret/selection-end insertion preserving the selected text and surrounding draft, with the retained website paragraph separators; composer focus restored; board stays open and ordered; IME refusal; no automatic send; search and reset |
| User-owned Prompt management | Edit/save/cancel, exact whitespace, pin and explicit order, reversible hide retaining identity/text/pin/order, dirty work preserved across close/reopen, independent archive and Context state |
| Current quick-reuse boundary | Exactly 150 compound Unicode graphemes remain eligible; 151 stays in the editor with an explicit error and cannot enter quick reuse; no silent truncation or native hover hints |
| Contact transport reliability | Original controller byte-preserved; real DOM with a deterministic mocked transport; pending locks and duplicate-event refusal; string/boolean success, false, non-JSON, HTTP error, network error, activation and actual 15s timeout |
| Unknown contact outcomes | Inputs survive; no auto retry or fallback second POST; explicit retry is editable; confirmed receipt stays locked and never claims inbox delivery |

The browser fixtures are synthetic. They do not open an installer, submit a
message, access a personal archive, activate external AI, test an installed
extension or qualify production deployment. Network requests are intercepted
before leaving the local server.

## Execution and evidence

```sh
python website/build.py --check
python website/test.py --static-only
python website/test.py
```

The last command belongs to CI or an explicitly permitted browser environment.
`--static-only` imports no Playwright runtime and starts no browser/server.
`--offline-render` is deliberately not presented as equivalent to HTTP browser
acceptance. The report is written to `$WEBSITE_TEST_OUTPUT/report.json` and
states `STATIC_ONLY` or `SYNTHETIC_HTTP_BROWSER`, actual browser version,
failed checks and the absence of real contact submission. Actual desktop/mobile
screenshots are collected by the full browser run; they are evidence, not
pixel-locked aesthetic authority.

Current physical-device, screen-reader, live extension and live provider
qualification remain separate from this website check. A local static pass
must not be reported as a full browser or CI pass.
