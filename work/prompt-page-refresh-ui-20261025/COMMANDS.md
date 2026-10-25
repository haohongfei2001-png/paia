# Commands and sequence

All execution uses `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`, with cwd this isolated repository.

1. `node --test extension/tests/prompt-page-refresh-ui.test.mjs` against unchanged base runtime: 3/11, exit 1, 916.873417 ms (`baseline.log`, `baseline-test.mjs`). This is the original pre-change test body.
2. Same command after UI implementation and adding the Manual/Next VM controls: 21/21, exit 0, 1176.381458 ms (`targeted.log`). At this point the fixture still used the old base receiver-probe reply. This proves local UI/producer error propagation only, not the new receipt-only protocol combination.
3. Three post-PENDING transport controls added after step 2. They require root's phase conversion and will run with that protocol integration, not represented by step 2.

Existing service dependencies are reused by an owned local symlink to the original PAIA service directory, with byte-identical lock and all installed versions checked (`dependencies.json`); no install or network. Symlink will be unlinked after the final tests, without deleting original dependencies.

4. Locally fetched exact core commit `5416962d708af3899644e14adece4f8eb1fe920e` from root checkout, cherry-picked as `7a50ac1`. An initial cherry-pick before the object transfer returned `bad object`; no changes from that attempt. Core/runtime UI paths have zero overlap. New probe fixture now includes the fixed `receipt-only-v1` profile. The eight-file command and exact runtime identity are in `related-final.json`: 158/158, exit 0, TAP 4860.569708 ms, wall 4986.792625 ms. This includes all 24 new controls, including three post-PENDING cases.
5. Exact owned dependency symlink target verified and unlinked; original dependencies retained (`dependency-cleanup.json`). No test process remains.

6. The staged all-path whitespace check returned exit 2 for original TAP blank-indentation/patch context lines; no runtime whitespace defect. Raw evidence is retained byte-for-byte; the runtime/test staged check was then used.
