# 0.28 writing Reader completion qualification

Base01b464e7. Test-only fix; no runtime/CSS/CI/version changes. Original two complete source/release cases and90-second budgets remain.

Cloud run37827671006 Browser2 release failed0!==1 while source passed. Raw `work/028-browser2-failure.log` and artifact11573335211 are retained. The artifact includes release compact-save-failure.png, placing the failure after the actual abort/draft checks. The custom reporter/summary did not retain a precise stack, so that artifact alone does not uniquely prove which final count failed.

Actual owner ordering: TopicActions.close synchronously hides writing and restores the trigger; archive.onWorkspaceChange starts deferred refresh without awaiting it. A committed Entry and restored invoker are not evidence that the Section Reader has painted. First local diagnostic complete run2/2PASS12.943879375s (`/tmp/topic-writing-release-diagnostic.log`) did not reproduce the timing and is not called a fix.

Deterministic actual-response negative: arm only on the second original compact CONTINUE_THINKING attempt; execute the real worker Section-reading RPC, then hold its response. Existing transaction/source/placement/idempotence checks pass, writing is hidden and invoker focused, but the old immediate Entry DOM count fails0!==1 in both complete variants. `/tmp/topic-writing-held-read-before.log` preserves2/2FAIL and exact stack.

The fixture now explicitly proves that intermediate zero-node state, releases the real response, waits with the existing default eventual budget for the exact created Entry, and retains the original final count1. No fake successful save, timeout increase, force click or production wait is added. Finally restores only its own sender/hold, including failure cleanup.

Final original complete file **2/2PASS**, zero failure/skip/cancel,12.995845708s (`/tmp/topic-writing-held-read-final.log`). Test SHA256 `9680246920618802bf94ac883b52b20d6dbc095179defacd0fd95791b02898f6`. This closes the proven deterministic read-completion race in test qualification; the old cloud failure is retained, and final exact-head hosted validation remains required.

Independent settings_review review: PASS. Real worker-before-hold semantics, original durable/Section/Source/exact-operation assertions, intermediate DOM0 proof and exact Entry completion are retained; cleanup and original budgets are unchanged. The reviewer did not repeat browser execution.
