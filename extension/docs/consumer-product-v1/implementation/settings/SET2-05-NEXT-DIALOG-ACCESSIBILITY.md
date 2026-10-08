# SET2-05 Next consent dialog selected accessibility evidence

Base b425105d; test-only successor, no production/runtime/CI/version change. Existing settings-next-chrome-e2e.test.mjs source/release cases and 90000ms per-case budgets remain. Independent review passed; integration pending.

Added English 320×900 selected dialog checks using actual computed font sizes multiplied by two and asserted per node. This is 200% text stress, not browser page zoom or physical assistive-technology certification. Native Space opens consent with Cancel focused; both Tab and Shift+Tab traverse the native modal without selecting underlying application controls. Escape and native Space cancellation preserve default OFF and send zero CONFIGURE calls; Enter confirmation sends exactly one enabled:true, followed by one explicit keyboard revoke. Focus returns to the checkbox. Existing click consent/cancel, cross-window revoke, reload persistence, real browser restart OFF, provider-zero checks and all prior assertions remain.

The first new oracle incorrectly required Tab from the last Cancel button to wrap directly to Confirm. Both variants returned document body focus while the native browser chrome owned traversal. `/tmp/settings-next-accessibility-expanded.log` retains these two failures. The product contract did not require a custom browser-chrome focus trap; root approved native traversal semantics. Final assertions still require no underlying app control receives focus, reverse Tab returns to Cancel, internal order is Confirm→Cancel, and all cancellation/authorization assertions pass. No runtime workaround or synthetic keyboard event was introduced.

A preceding fixture-edit path error left the old test unchanged; its 2/2 result in `/tmp/settings-next-accessibility-native.log` is only unchanged-baseline evidence, not new accessibility coverage. Final actual expanded whole file: `/tmp/settings-next-accessibility-final.log`, 2/2 PASS, no failed/skipped/cancelled, 13.217s. Headless Playwright1.63.0, isolated profiles and isolated release. No live account or paid request. Syntax and diff checks pass.

Both variants measured dialog x32/right288/width256, horizontal overflow0 and page overflow0. The focused confirmation button was within the 320×900 viewport. Actual source/release screenshots were inspected: long 200% copy uses the dialog's native vertical scrolling; focused Cancel and confirmation are reachable. Initial autofocus scrolls the long title above the captured viewport, so screenshots do not imply all text fits simultaneously. No new visual design or six-group 288-case rerun was performed.

Images: extension/work/settings-next/{source,release}-dialog-320-en-text200.png.
Stable native test and runtime SHA-256 before/after matched:

```
0d12215f4c9a0dd88a41ce792ef3ed6c28771889624e8f0e4429b4a3912ff595  extension/tests/settings-next-chrome-e2e.test.mjs
9e76a38fe08d4ba1f8b35cfad03da5b8a4a8affedc4e71aa7bd8b3afe3e1ecd1  extension/ui/settings-next.js
c24f82bde67ae5a07c2405fe8796fef4d266efadda4e266231e30547050de9b0  extension/ui/settings-next-state.js
```

This closes selected local dialog evidence only, not whole SET2-05, physical IME/screen-reader acceptance, a new installed release or full exact-main certification.

Independent root review passed: original two complete cases, 90s budgets, cross-window/restart/zero-network assertions remain; actual font doubling, geometry and native enable/cancel counts verified. Root inspected the release 320px English text200 screenshot: native vertical scrolling, reachable confirmation/Cancel, safe default Cancel focus, no horizontal overflow. Simultaneous visibility of the title and bottom buttons is not required. This test-only checkpoint does not modify the frozen 0.26 candidate.
