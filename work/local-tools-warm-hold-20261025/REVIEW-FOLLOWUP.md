# Review follow-up: bounded fence and genuine revocation

Parent candidate `d9ee08af6d9cb51a4f7313068f394b83efbb5051` is preserved. This narrow successor changes only the internal helper, ImportLedger, owning tests and evidence. The original independent findings are in `../reviews/local-tools-warm-hold-review.md`.

## P2 fence deadline

All snapshot waits now use the **same original hold deadline**, including fence and acquire. The original snapshot rejection observer is attached before checking remaining time. Timeout invalidates the lease and returns OUTCOME_UNKNOWN; it does not claim that a queued or issued read was cancelled. Actual probe Promises remain in a private set through settlement. A new hold following explicit failure release drains those original probes; late completion cannot revive or clear a newer lease. No deadline/ticket renewal or budget change.

The new control blocks the actual original store queue after acquiring a token, verifies the fence timer receives the original remaining time (not a fresh 30 seconds), forces that timer's callback for deterministic local validation, then releases/reacquires while the old queue is still blocked. The new hold stays pending until real release and old probe settlement, and the old token remains false. The test does not claim real wall-clock 30-second/native browser validation.

## P2 genuine Import disconnect

`ImportLedger.revokeOwner` now unconditionally invalidates the original hold/admission serial and deletes the original owner's grants synchronously. It no longer asks to enter a new business operation. Genuine `ImportHandler.disconnect` remains the original trusted path; it cannot silently retain authorization while held. Already-issued tasks stay tracked and settle under original transaction rules. Old admitted but not issued writes fail the serial check even if the failed hold was released before their queue entry. New explicit authorized requests remain possible after exact release; revoked tokens never revive.

Two new controls invoke the real Handler disconnect during acquisition and after successful hold, using an original terminal import task with a freshly issued grant. Both verify revocation survives release and later use rejects IMPORT_SESSION_EXPIRED. The previous control that required refusal of revokeOwner was corrected; its old result remains in the parent candidate/history.

## Evidence

- `review-negative-before.log`: all three new controls on original d9ee08a runtime **0/3**, proving the queued-fence and two revocation failures; no cancellation/skips.
- `review-negative-after.log`: initial narrow correction **3/3**.
- `review-owning-pre-polish.log`: complete local-tools + original Import ledger + original Import security **43/43**, 832.676125 ms. A preceding edit invocation had a wrong cwd path and stopped before modifying anything; exact note preserved in `edit-invocation-note.txt`.
- `review-owning-final.log`: final same three whole files **43/43**, 787.002834 ms, no fail/cancel/skip/todo. This follows captured observer timer cleanup and an explicit nonrenewal assertion; it is the final candidate result. The old 119/119 wider combination is retained and is **not** claimed to run on this successor.

All invocations use the existing official Node22.23.3/macOS arm64. No native browser, network/account/provider, cloud, build or budget expansion. Exact final command (cwd extension):

`/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test tests/local-tools-selection-hold.test.mjs tests/import-ledger.test.mjs tests/import-security.test.mjs`

Targeted commands (worktree root) before/after narrow correction:
`node --test --test-name-pattern='review:' extension/tests/local-tools-selection-hold.test.mjs`

`source-vector.json` and SHA256SUMS describe final delivered bytes. Root independent re-review is still required before local integration. No push.
