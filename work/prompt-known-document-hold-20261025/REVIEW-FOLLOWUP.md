# Independent-review followup — 2026-10-25

This report supersedes the original REPORT.md only for the final successor state. Parent candidate `1f4107cf9ef765865575b94f97fc5af7a314463a` and all earlier results remain historical evidence.

## Two independently identified issues and corrections

1. The original candidate stored a local tracking wrapper as the apparent raw HOLD Promise. Failure to observe the actual SDK Promise rejected that wrapper; its rejection incorrectly marked HOLD settled and allowed RELEASE before the actual HOLD had completed. The final code retains the original SDK return as `e.transport`, installs the captured original Promise observer directly, and only its actual fulfillment/rejection callback sets `settled`. Failure to install observation or a synchronous SDK throw leaves outcome unknown and never sends early cleanup or reopens admission. The local tracked bridge is separate. A genuinely observable late settlement still sends its sole exact precharged RELEASE, preserving deadline and unknown worker admission.
2. A fixed tabs identity allowance omitted arbitrarily long registered URLs. The frozen entire receiver/URL set and every tabs.get identity-field result now charge actual UTF-8 encoded bytes to the same original work ticket, without truncation or a new budget. A freeze exceeding budget refuses before installing any hold or sending HOLD. Later exhaustion keeps the established hold closed.

No generalized FENCE/ledger rewrite: the reviewer found their delayed continuations read-only and fenced by original current checks, so those paths remain unchanged. No gate, adapter, worker, transport permission or public DTO changed.

## Actual evidence, strictly separate invocations

- Prior history remains in REPORT.md: baseline 0/1, first related 40/41, timeout targeted 1/1, new driver 25/25, later trackingUnknown targeted 1/1.
- Independent review regressions against frozen parent runtime: **0/3**, exit 1, TAP **309.257833 ms** (`review-negative.log`). The tests observed early RELEASE `1 !== 0`, missing frozen >2 MiB URL rejection, and missing repeated 300,000-character identity-byte budget rejection. Exact negative test saved as `review-negative-test.mjs.txt`; runtime is the parent commit.
- Final seven-file related batch: **131/132**, exit 1, TAP **43190.571667 ms** (`related-final.log`). The only failure was `prompt-insertion-producer-receipts.test.mjs` import setup: missing existing `pg` dependency, before any of its cases ran. New driver **28/28** and the other owning files passed. This batch is not reported as all green.
- Reused preexisting PAIA service dependencies through an ignored local symlink, with both lockfiles byte-identical SHA256 `bb5db079329901c8124ce14620444eae5a49a70d72069c7a9bf642421857bc0c` and all 14 installed package versions matching that lock. No install, network or dependency-file change. Details in `existing-dependency-reuse.json`.
- Only the previously unexecuted producer file then ran: **42/42**, exit 0, TAP **4119.498458 ms** (`producer-setup-followup.log`). No repeat of the already passing 131 cases. These runs are not combined into a fabricated single green batch.
- Final `git diff --check` passed, runtime/new-test hashes unchanged across review and final runs.

## Commands and exact scope

Existing Node 22.23.3 absolute binary:
`/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`

Commands below use `NODE` for that exact binary; no system environment change.

Negative: `NODE --test --test-name-pattern='unobservable original HOLD|actual frozen receiver URL|each original tabs identity' extension/tests/prompt-insertion-known-document-hold.test.mjs`.

Related final: `NODE --test extension/tests/prompt-insertion-receipts.test.mjs extension/tests/prompt-insertion-receipt-hold.test.mjs extension/tests/prompt-insertion-producer-receipts.test.mjs extension/tests/prompt-insertion-worker-receipts.test.mjs extension/tests/prompt-insertion-ui-receipts.test.mjs extension/tests/prompt-insertion-local-checkpoint.test.mjs extension/tests/prompt-insertion-known-document-hold.test.mjs`.

Setup-only followup: `NODE --test extension/tests/prompt-insertion-producer-receipts.test.mjs`.

`review-source-vector.json` binds final runtime, new tests and all six unchanged related files. Original `source-vector.json` remains the initial-candidate vector. The local dependency symlink is ignored and not committed. No browser/native, cloud, CI, paid calls, install, network or push occurred. Existing adapter 95-case result was not rerun. Synthetic owner/protocol correctness is not real host acceptance; legacy coverage stays UNKNOWN and production global activation remains disabled.
