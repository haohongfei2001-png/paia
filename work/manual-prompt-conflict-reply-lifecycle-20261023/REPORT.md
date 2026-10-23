# Prompt conflict reply and disposal correction

Parent: `85ec447e`. Follow-up to `0ff6f0ff` without changing journal/Core, permission, owner, budget or data behavior.

The original pane now reports **“处理结果尚未确认；编辑仍保留。请稍后刷新核对，不会自动重试。”** when a resolution reply or subsequent completion refresh fails. It never claims “not saved” after a possibly committed operation. The offered buttons are disabled and the exact human draft remains. Failure does not automatically resubmit, renew the token, or pick a version. The panel title also says unconfirmed rather than incorrectly asserting a known version change.

The pane exposes `dispose()`, consumed by the original Prompt surface `pagehide` and explicit cancellation. A pending reply checks disposal and actual `container.isConnected` before completion, error or pending-control updates. Late success and late rejection after disposal neither call done/refresh nor touch the detached pane. The original refresh now returns explicit success/failure and suppresses catch/finally DOM updates after disposal; its normal behavior is unchanged. During an acknowledged completion, the pane stays owned until refresh settles, so pagehide can still dispose it. If refresh cannot confirm the updated view, the existing editor is made visible again with its draft and unconfirmed-result notice.

## Verification

Already completed before interruption, re-read and reused after resumption: isolated **Node22.23.3**, three affected files, **15/15**, exit0, no fail/cancel/skip/todo, **227.60275 ms** (`ui-final.log`). Tests include actual synthetic committed callback followed by lost reply; committed ACK followed by failed done; no automatic second submission; retained draft; disposal before late success/rejection; detached pane without pagehide; existing Cancel/Close and private-surface boundaries. No unchanged85-test rerun.

Syntax checks passed for changed runtime, native entry and optional pane helper; diff whitespace check passed. These are local synthetic UI/control tests, not native IDB, actual layout, physical IME or visual acceptance.

## Native entry prepared only

`extension/tests/native-sync/manual-prompt-conflict-chrome.test.mjs` registers Source/release cases using the existing `storage-harness.mjs` and the unchanged prepared23-case owner bridge. It requires **an absolute PAIA_NATIVE_RELEASE_PATH before either variant starts** and never builds automatically. It verifies loaded runtime source vectors between Source and release, original owning SHA256, all23 returned case names unique, and original native/network isolation. It retains per-variant receipts, including failures, in `extension/work/qa-manual-prompt-conflict-native/manual-prompt-conflict/` when the integration owner eventually runs it.

`prepare-entry.mjs` only registered the two test callbacks and checked this fixed contract; **0 callbacks executed**, no browser/build. Existing23 owning cases and runtime were not rerun.

Optional `verifyManualPromptConflictPane(page)` in `extension/tests/harness/manual-prompt-conflict-pane-native.mjs` is prepared for an already-owned isolated extension page from the original FakeChatGPT harness. It mounts the actual `mountManualPromptConflict` UI owner in a temporary DOM pane, uses trusted Playwright clicks, checks literal paragraph bodies and preserved CRLF, controlled composition-event refusal, a retained draft after synthetic committed-but-missing reply, and quiet disposed pending completion. It launches no browser and does not modify a shared harness. **Not executed.** Composition events are explicitly synthetic, not physical IME acceptance. It is not a complete private iframe/Settings journey or full R3 visual qualification; the caller must retain its own network/isolation and Source/release identity evidence. The current storage harness intentionally does not expose a page, so this optional helper is not silently activated inside its owner23 entry.

No browser, build, cloud, large seed, real account, paid model, deployment or installation executed. Root can cherry-pick this one successor after the original two commits and batch native validation with its next integration build.
