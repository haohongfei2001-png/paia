# AI-COST-06 automatic R3: exact-head offline native evidence

## Actual execution

On 2026-10-18, the approved existing free isolated CI job `offline-native-automatic-assist` completed successfully in [run 39172409473, job 117808052898](https://github.com/haohongfei2001-png/paia/actions/runs/39172409473/job/117808052898).

The complete job log confirms checkout and execution at head `419b8727608ef4c35046ba88f4d93fd685fd98c5`. The original full file ran unchanged: `extension/tests/ai-assist-automatic-r3-chrome-e2e.test.mjs`, SHA256 `3f2401cbecbe445de047c52b200375f5973e06caaf72201874b18ed084eacb98`.

**3/3 passed, 0 failed/cancelled/skipped, 22142.106588 ms.** Individual actual assertions:

1. Original Free source automatically changes the R3 orb into one capsule without opening the board; the first intentional suggestion click inserts into the current composer, with Send count zero.
2. The original capsule preserves a real existing synthetic-host draft and never auto-inserts during unrelated DOM and viewport churn.
3. A suggestion arriving while the original board is open waits for its original close and preserves the saved orb preference.

The job used the runner's existing Google Chrome `155.0.8059.39` and Node `v22.23.3`. It installed the existing exact direct dependencies using `--ignore-scripts`, with browser download disabled and no generated package lock. Its permission was contents-read; no live account/provider/model, private user data, credential entry, installation on a user's device or deployment occurred. No screenshot upload was added.

The job also printed and confirmed these exact runtime identities:

- `background/assist-consent.js`: `7d76ff326a15ae3bac7fb252084895a9c28ac3a082b258829143dbd630f7c552`.
- `background/prompt-assist.js`: `a98ea77c0f6e434f446a0487536820edbcc4d9a9090c731e0683da592830c1a8`.
- `background/prompt-next.js`: `6d1839cb3460220f2ffecb261a1552c81a6edc1c0ecabcc51f059a72d328a0be`.
- `content/prompt-surface.js`: `836829684b4d5d76edab025825121991eda8ddd785cc2193aa9577f01a07e529`.
- `ui/prompt-surface.js`: `9f6ed60d7055eeebbe671b902034ab46852f6d047fc23ed3c238a1586ba880c1`.

The complete downloaded decoded job log is 18,718 UTF-8 bytes, SHA256 `a15f2f716f3c3bc46ef150a7a4427698514e0f0b30ddd38d01d78002230db13c`. The separate evidence manifest retains those complete bytes, not only selected passing lines. GitHub's job/step state was independently read as completed/success before the full log was checked.

## Scope and preserved history

This is actual offline Chromium execution of the repository's worker, content code and private extension R3 frame against a synthetic supported host/composer. It establishes the three exercised local automatic mechanisms at the stated head. It does not establish live ChatGPT/actual ProseMirror-host coverage, remote Pro browser generation, model quality, full human visual fidelity, accessibility/device-performance acceptance, or all seven Canonical plans.

The earlier local Chromium launch failure and denied escalation remain genuine and were not retried through another local route. The owner subsequently authorized this separate existing public CI route. The frozen 281 Node receipt correctly records browser execution as pending at its own checkpoint; its bytes are unchanged. This later evidence closes that specific pending three-case execution, not wider acceptance.

The subsequent five-file Section lexical-refinement candidate is independently frozen and verified in its own 386-test receipt. It was not in head `419b872` and does not borrow this native run as its exact-head evidence. Other jobs in the same CI run retain their own conclusions; this successful Assist job does not turn a failed sibling job or the aggregate run into success.

## Later unchanged-runtime failure and fixture readiness correction

[Run 39173171835, job 117810305545](https://github.com/haohongfei2001-png/paia/actions/runs/39173171835/job/117810305545) checked out `a094af3d876adb7b4404fabeee9934bc692ecd77`. Its printed Assist test and five runtime hashes are exactly the identities above. It finished **2/3 passed, 1 failed, 0 cancelled/skipped, 23855.813714 ms**. The first case reached the `capsule` host-form condition, then failed the immediate `assert.ok(card)` at test line32. The draft/DOM case and open-board case passed. This is a genuine later failed run, retained separately from the earlier3/3 success.

The complete decoded failure log has SHA256 `bb076ed1d189f6808d4dd03cb6b7ca4cd85423077859b2c4291750499a24efac`. It establishes the failed assertion; it does not prove a browser-resource explanation. Source inspection shows `content/prompt-surface.js` appends the private iframe and synchronously sets host geometry/form before that iframe's extension navigation necessarily appears in Playwright's `page.frames()` URL projection. This supports an asynchronous frame-readiness race as the explanation; a new exact-head native run is still required.

The owner-approved test-only correction locates the exact original extension frame inside the existing full-text readiness poll. Frame navigation and the exact `continue` text share that **same14-second poll**, with no added or increased timeout. The original `assert.ok(card)`, exact extension URL, unique frame, no second iframe, saved preference, full text, first-click native input, Send0, Enter0, trusted input1 and zero external/extension requests remain. The resumed-draft case uses the same readiness rule. Runtime, workflow and shared harness are unchanged.

The corrected complete native test has SHA256 `76d15567f2234db32aca8406b07ce67a61ac31348f56a4af60b4d5e80f2b861c`. `node --check` succeeds. **The corrected file has not yet executed in Chromium** at this freeze; it must receive the approved full three-case CI run. No local browser launch or alternate escalation was attempted. The old `3f2401cb` test bytes and both actual native outcomes remain recoverable in their separate frozen packages.
