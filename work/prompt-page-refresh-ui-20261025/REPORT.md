# Receipt-only compatibility UI continuation

This candidate completes the real Manual, Next and Assist error/notice paths for the separately reviewed receipt-only core. It changes ten runtime paths plus one new test file; the core commit is a dependency and must not be duplicated when integrating this UI successor.

Base: 54e15e911c297dd687d7162b7dcacb576c644c23. Core dependency: 5416962d708af3899644e14adece4f8eb1fe920e, locally cherry-picked as 7a50ac1. The UI changes are only the paths in SOURCE-VECTOR.json. Root independently read the ten runtime diffs before this final combination and reported no new blocker; no claim is made that this report is independent review of itself.

## Behavior

`PROMPT_PAGE_REFRESH_REQUIRED` is a fixed body-free safe code. Before the durable pending record, the three original producers return a definite failed/page_refresh_required result. UI asks the user to preserve the draft and manually refresh ChatGPT. Manual preparation and actual insertion are separate phases, so a thrown error after sending insertion remains uncertain. Assist and Next keep their existing unconfirmed state; a refresh notice cannot clear it. The initial Assist/Next preparation path propagates the exact code rather than silently hiding the view or falling back to another insertion producer.

After PENDING, the core dependency converts the same transport-shaped error to OUTCOME_UNKNOWN. The three actual producer controls confirm the ledger remains pending and the UI result remains uncertain. No automatic refresh, close, retry, allowance renewal, receipt reclassification, global selection admission or new browser permission is added.

## Actual verification and retained failures

- Original new-test baseline against unchanged runtime: 3/11, exit 1, TAP 916.873417 ms. Original test body and log retained.
- UI/error-propagation intermediate: 21/21, exit 0, TAP 1176.381458 ms. This predates the three post-PENDING cases and receipt-profile core integration; it does not certify either.
- Final exact core + UI related combination: 158/158 across eight owning files, exit 0, no fail/cancel/skip/todo; TAP 4860.569708 ms and wall 4986.792625 ms. Includes all 24 new controls. Complete command and log retained.
- Runtime/test diff whitespace check passed. A subsequent staged whole-evidence check reports trailing spaces inside original TAP failure excerpts and the literal patch; these raw evidence bytes are intentionally retained. No native browser, browser performance, real account, real model, CI, installation, network, deployment or whole-product acceptance was executed.

Execution used existing official Node v22.23.3 on macOS arm64. The local synthetic service fixture reused the existing PAIA dependency directory only after identical lockfile and all fourteen installed dependency versions were checked. Its exact owned symlink was removed after completion; no dependencies were deleted or installed. This evidence is synthetic Node/VM verification only.

## Integration

Take only the successor UI commit on top of the original core commit in root. Keep the original core evidence and all earlier failures. Production selection gates and historical UNKNOWN restrictions remain unchanged. The notice cannot force a pre-existing old constructor to retire; it prevents new worker-origin insertion through the new protocol and requires the user's own reload. A reload is not evidence that an old unknown operation succeeded or settled.
