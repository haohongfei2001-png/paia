# Reader icon controls — bounded local candidate

## Result

Archive/Thought reader Back and chronology controls now use the existing Back
and up/down icons without explanatory captions or new tooltips. Accessible
origin/order names remain and chronology state is explicit. Thought Reader's
shared header returns to its left workspace axis in normal flow; its empty
retired-search slot no longer reserves a flex row. No prose width, authored
whitespace, unknown-date information, primary navigation or AI Organize label
is changed.

Base: `875a58ca89602c4ccb0daf05d3ba5ee2b3a471b0` on an isolated local worktree.
This is an unintegrated candidate, not main, an installed update or full visual
restoration. Product version remains unchanged (`0.55.9`).

## Source diagnosis and preservation

- The actual header order is parsed from `archive.html` in the new component
  fixture, then passed through the real AppShell mount and Archive composition.
  Repeated Archive/Thought/Settings and desktop/compact route changes retain Back
  as the first Thought header node. AppShell's existing remount/navigation
  implementation is therefore unchanged; the issue was not assumed to be a
  misplaced spacer or repaired by introducing another navigation owner.
- The existing Thought desktop rule positioned the entire header absolutely at
  `right:44px` with `width:250px`. Removing that rule and retaining the normal
  workspace inset corrects the proven source-level anchoring mismatch. The
  genuinely empty retired search slot is separately suppressed with `:empty`.
- Icon rendering replaces children only, not native buttons/listeners. Back
  destination selection and click dispatch remain original. The existing
  Archive origin query/tree/focus/history and editor leave paths are unchanged.
- Archive sort presentation is extracted into a small repaint helper so the
  original live-preference event updates accessible language without rerendering
  prose. Topic retains its existing preference-event/sync owner. Both keep the
  original chronology action, save/IME/opening guards and persistence requests.
- `source-scope.json` mechanically checks byte equality outside the finite
  presentation substitutions in Archive and Topic. AppShell, icon paths,
  prose/layout CSS, reader navigation/history/editor modules and version files
  listed there are byte-identical to base.

## Evidence map

| Required behavior | New targeted evidence |
| --- | --- |
| Back search/project/archive origin and locale | Actual Back paint and icon helper, zh/en repaint, missing/wrong/invalid origin negatives; exact original click dispatch and `replaceHistory` target |
| Thought Back and preserved non-reader labels | Actual paint, real localized copy and original Thought click; old aria cannot mask the later non-reader label |
| Sort icon, accessible current state and next action | Both orders/locales, `aria-pressed`, original datasets, unchanged button identity/listener/focus; no text/title; existing SVG family |
| Sort guards and persistence | Actual Archive click handler: accepted/refused/stale-route/save-failure branches; actual Topic click registration with real change/flush owners: accepted/IME/dirty-save-refusal/opening/newer-route branches |
| Live locale changes | Execute actual Archive and Topic `preferences-applied` registrations; retain order, focus and synthetic body identity |
| Back-left source semantics | Parse actual header markup; real shell mount and repeated composition; CSS source checks for normal flow/left inset, empty slot, coarse targets and independent prose width |
| Existing expectations | Old origin/language browser assertions now check the corresponding accessible name. Existing local origin assertions additionally inspect actual icon-only DOM. Annual-render and opening fixtures still use their original behavior assertions, adapted only to the presentation helper/DOM API |

Final command:

```sh
node --test --test-reporter=tap extension/tests/reader-icon-controls.test.mjs extension/tests/reader-icon-shell.test.mjs
```

Final result: **29/29 PASS**, 0 failures/cancellations/skips/todos
(`logs/06-final-localization-click.tap`). These are newly targeted local
component/source tests, not a browser or complete product suite.

Earlier invocations remain separately recorded: initial control suite25 PASS;
first shell fixture bootstrap1 FAIL because AppShell's imported Settings module
requires `document` before import; corrected fixture moves the import after DOM
setup, then2 PASS. Subsequent combined27 PASS and final expanded29 PASS are
separate invocations, not an aggregated single run. The bootstrap failure is
not reclassified as a pass or a runtime failure.

Changed JavaScript/test syntax and `git diff --check` pass. Modified pre-existing
browser and local owning suites were **not executed** in this bounded package.
No old browser/native/full suite, rendering, build, CI, network publication,
installation or production version bump occurred.

## Unverified boundary

Two owner-provided private screenshots were viewed locally for the exact
caption/right-alignment evidence; neither screenshots nor their user content
are copied into this package. The original full-restoration target view was
not available for comparison. CSS/source composition checks do **not** prove
actual pixels, native focus/selection/IME, full accessibility, responsive/dark
geometry or installed behavior. Independent review and any separately authorized
real-browser/visual acceptance remain open. This package introduces no broader
redesign and does not claim all seven plans complete.

`MANIFEST.json` freezes the changed sources/tests/canonical amendment and these
local logs. No unrelated UI work follows this package without coordination.
