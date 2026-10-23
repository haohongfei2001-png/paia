# Integrated local UI checkpoint, 2026-10-23

Source checkpoint: `c6d3d5b2`; all tracked executable/test file hashes remained identical before and after the four invocations. Original headless harness, synthetic profiles and network isolation; no visible browser, install, real account, cloud CI or large seed. The existing original release builder was allowed to reuse/rebuild its local Development output. Full commands, actual environment, measured wall times and source vectors are in `execution.json`.

| Invocation | Actual result | TAP duration |
|---|---|---|
| Complete original Settings owning file | **4/6, exit 1**, two retained failures; no cancellation/skip/todo | 152010.779333 ms |
| Original shell main case (explicit name filter) | 1/1, exit 0 | 10728.953875 ms |
| Original Context UI owning file | 1/1, exit 0 | 16943.499916 ms |
| Prompt approved fixed three forms, Source/Release (explicit name filter) | 2/2, exit 0 | 17389.792333 ms |

These are separate invocations, not a Full or an aggregate certification. Context UI here checks the current unavailable route and data-preserving shell; it does not prove the complete four-card/service journey. Prompt performance/extra orb cases and other shell cases were not selected.

## Retained Settings failures and coverage

Both D5 Source/Release parents stopped at the original `coarseSettingsEvidence` assertion `headed device proof must not be overridden`. That helper requires a visible touch-enabled Chromium version **155.0.8059.39** and a diagnostic archive hash. This invocation deliberately used `PAIA_HEADLESS=1` with local Chrome **156.0.8078.47**. No browser was launched to evade that assertion, and the pinned qualification or its trusted-touch assertions were not changed.

Before the stop, each parent completed **288** layout observations (six groups, six widths, two themes, two locales, two text scales), native keyboard selection, visible rollback feedback for a failed preference write, and both enlarged Back target observations. The per-variant JSON correctly remains `FAIL`. Subsequent directory/history-focus, cross-control, About and offline AI-style stages inside those two parents were not executed. Separate passing tests do not retroactively make these parents pass.

The whole owning file's four passing cases cover its original main Source/Release journey, retained historical geometry baseline, and the two compact-language/reflow cases. The historical baseline is labeled as such and is not evidence for the new runtime. Touch qualification and the interrupted latter stages remain on the final acceptance queue; no claim of a complete Settings acceptance pass is made.

## Visual inspection and evidence

Representative actual screenshots were inspected for Settings desktop/narrow reading, dark narrow shell, dark narrow Prompt menu and the current Context route. Observed text and controls fit their recorded captures. The synthetic patterned Prompt host is fixture content. This is not human visual approval, physical touch/screen-reader proof, real-site acceptance or a pixel comparison against missing private reference images.

`selected/` retains representative screenshots plus both full Settings JSON receipts. `artifact-inventory.json` indexes every local artifact by SHA256; the larger complete screenshot set remains under local `artifacts/` and is not all committed. `SHA256SUMS` covers every committed evidence payload. Old failure logs are retained. No product or test assertions were edited to turn this result green.
