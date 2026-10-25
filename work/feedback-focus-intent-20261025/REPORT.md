# Settings feedback copy completion preserves newer focus and selection

Base: published development 510d2c7f5a94367db2411f38ad1017860d9b81d8.

## Actual bug
A failed asynchronous clipboard attempt checked dialog generation, copy serial, IME and unchanged text, but then focused and selected the entire textarea even after newer focus or selection intent in the same dialog. The original published source failed three new controls (2/5 pass), preserved in baseline-first.log.

## Finite correction
Only the existing clipboard callback in settings-feedback.js changes. Capture focus plus textarea range/direction after the initiating synchronous update. Temporary document intent observers cover focus, selection, pointer, key and input changes during the pending attempt, including away-and-back intent. Always remove those observers on settlement. Failure fallback focuses/selects only with no intervening intent and the original exact focus/range. Existing stale-dialog, newer-copy, composition, exact-body and successful-copy behavior remain.

No draft storage, recovery protocol, permission, synchronization, automatic send, mail URL, provider or persistence code changes. No change to the held Context/sync enrollment candidate.

## Verification and limits
- Original new owning baseline: 2/5 pass, 3 fail; original raw failure log preserved.
- First author complete owning files: 18/18 pass (13 existing + 5 new), zero failure/skip/cancel/todo, 394.229739 ms. This predecessor did not retire observers until clipboard settlement and is superseded.
- Reviewer/author identified potentially accumulating observers on unsettled superseded copies. One active idempotent observer disposer now retires immediately on new copy, actual close, reopen and IME. Old completion can only retire its own observer; delayed old native close events do not retire a new open attempt. Underlying clipboard settlement semantics are unchanged.
- Final author whole-file successor: 22/22 pass (13 existing + 9 new), zero failure/skip/cancel/todo, 365.177881 ms; candidate-observer-retirement.log.
- Pure PresentationNode and mocked clipboard promise only. No OS clipboard, browser, native, actual email, cloud/provider, Full or spent quota execution.
- Independent successor review cleared the exact runtime8a699163 with complete original13 + author9 + independent8 =30/30 pass, zero skips/fails,459.785557 ms. Source-bound report and all predecessor/successor independent logs are in review/. This is scoped source/fake-DOM clearance only; no integration/publication/main or whole-plan completion claim.

## Preparation limitation
Initial broad extension archive encountered missing unrelated screenshot blob 6fdf24514e3a0540a761a22f636a40924c98648f. No fetch or replacement attempted. Selected code/test extraction supported the scoped test files; partial unrelated files were preserved. Shared checkout/index/HEAD unchanged.

Packaging first attempt stopped at an invalid preservation assertion that compared the private candidate index before/after intended changes. It did not alter the shared index. Corrected packaging compares the actual shared index separately. No code/test rerun followed.
