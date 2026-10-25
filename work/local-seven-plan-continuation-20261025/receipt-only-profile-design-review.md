# Receipt-only document profile: independent design review

2026-10-25. Read-only against root checkout `54e15e911c297dd687d7162b7dcacb576c644c23`, current adapter/receipt owner/three producer/UI sources. User has now explicitly approved the compatibility change. No runtime modification, execution or browser activity in this review.

## Interface conclusion

A new adapter instance may reject every bare legacy insertion from birth, with no public opt-out. A fixed `profile: 'receipt-only-v1'` added to the original PROBE reply is an appropriate explicit protocol discriminator. The receipt owner must validate the exact reply shape and fixed value in both original top-frame and exact-document probes, retaining original nonce, registered document/window, recovery token, current tab URL, immutable known-map identity and final readback checks. A profile string alone is not a document capability or complete-host proof.

Keep the existing Symbol constructor early return: do not overwrite an already-loaded old constructor. Consequently the enforceable promise is that **the new worker will not dispatch a new insertion to a page that fails the new profile qualification**. It cannot retrofit the new admission gate into old code already loaded in that page, stop an independently pending old native operation or prove old work ended. Existing registration and ACK/reconciliation should remain compatible so genuine historical outcomes can still settle. Do not require the new profile for a valid old ACK, silently retire historical UNKNOWN or clear `legacyCoverageUnknown`.

A user-initiated reload may supply a new protocol document after preserving the draft; it never proves the previous UNKNOWN became successful/not inserted or that global switching is safe. No automatic reload, close, new permission, content enumeration or retry is warranted.

## Critical phase distinction

Before durable PENDING, an exact protocol mismatch can return a fixed, body-free “preserve your draft and refresh this page yourself” condition. A missing/failed transport or arbitrary malformed response must not be described as proof of the old protocol unless the specific old reply shape was actually observed; generic unavailable can remain conservative.

After durable PENDING, a new profile failure must remain UNKNOWN. Current `prompt-insertion-receipts.js` dispatch catch calls `#notDispatched` for `pending && !a.invoked`. The second receiver probe occurs after PENDING, so merely throwing the same new refresh-required error there would currently turn the durable claim into `not_dispatched`. This path needs an explicit phase-aware conservative exception for the profile failure. It must not manufacture `not_inserted`, erase PENDING, unlock selection or automatically replay an insertion. Likewise, no UI may reinterpret a post-PENDING error as a safe refresh-only failure.

Do not use every response with `status: failed` as the freshness discriminator: only the exact pre-PENDING protocol condition supports this message. Existing successful receipt verification and genuine negative ACK semantics remain unchanged.

## Real producer and UI paths needing coverage

1. **Manual:** `PromptReuseCommands.#prepareInsertion` probes before issuing the action, so it can surface the explicit pre-PENDING condition without a claim. Both `ui/prompt-surface.js` (selection-read preparation inside insert handler) and `ui/prompt-reuse-test.js` currently catch that exception as generic uncertain insertion. Preserve the condition through the original error channel and distinguish preparation from an actual insertion request. Existing late view/selection checks must remain.
2. **Next:** `PromptNextCommands.#presentInsertion` probes for both the existing card `get` path and shared suggestion presentation. In `ui/prompt-next.js`, `rpc` currently discards the error code and initial `get` failure calls `hide()`. Without a narrow change, old pages simply lose the card instead of receiving the approved draft-preservation notice. Retain the exact safe code and show a non-inserting notice, rather than silently hiding or treating the result as a source/model failure. No new action is issued for that mismatch.
3. **Assist / shared suggestion capsule:** `PromptAssistCommands` handles `assist_current` by catching presentation failure and deleting its view; `PromptSurface` then catches remote current failure and falls back to Next. `PromptAssistState.refresh` clears its result on errors without a message. These paths must preserve the exact protocol condition rather than losing it as ordinary service unavailability or substituting another suggestion lane. The existing `suggestion_result` requalification can also fail before insertion; the UI must keep phase-aware messaging. After actual insertion was attempted, retain existing uncertain outcome semantics.
4. **Error transport:** a new `ArchiveError` code is currently sanitized to `STORAGE_FAILED` unless added to the original fixed `STATUS_CODES` allowlist or expressed in an equally narrow existing safe response. `ui/prompt-next.js` must also stop discarding that exact approved condition. Do not return raw browser errors, text or unbounded details.

A suitable message is: “当前页面需要更新。请先保留草稿，再主动刷新页面；未确认的历史插入结果不会因此清除。” Its shorter local equivalent can be used before any pending operation, while existing UNKNOWN continues to instruct inspecting the draft and no automatic retry. The message must not assert the draft was unchanged if that fact is unavailable.

## Historical compatibility and validation

Preserve the old legacy contract and its original assertions as an explicitly historical adapter profile using the frozen pre-change adapter source with a recorded hash. Do not add a production constructor option/environment flag to reactivate legacy insertion, quietly rewrite the positive expectations, or patch the production source string during a test to bypass its new gate. New production-profile controls are separate and should cover birth-time bare refusal for all three lanes, genuine receipt success, malformed/copied receipts, exact double-probe profile matching and old Symbol retention.

Include the actual pre-PENDING refusal and post-PENDING mismatch branches, with durable claim and insertion/native-call counts. Test the existing Manual, Next and Assist presentation routes so the message is visible rather than swallowed. Existing register/ACK/reconciliation controls remain applicable to old genuine receipts. No synthetic result is native browser acceptance, and neither the new profile nor refresh changes complete-host coverage or the production selection hard gate.

No design-level blocker remains once these phase and UI paths are included. Final implementation and frozen diff still require review.
