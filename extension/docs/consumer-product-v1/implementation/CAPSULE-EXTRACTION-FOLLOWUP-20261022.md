# Capsule host fixture extraction — 2026-10-22

PR313 handoff 6336651855 requested this test-only correction. Branch `codex/capsule-fixture-extraction-followup-20261022` starts at Prompt Surface evidence `0b1fc8596ae611b5a76120af8a823cf2482b2505`. The isolated one-file fix is identified in [receipt.json](evidence/capsule-extraction-20261022/receipt.json); pick that fix, not its ancestors. Existing ANS-07 successor remains separately preserved.

## Exact failure and cause

[Full39748755471 / Unit4 job119723745213](https://github.com/haohongfei2001-png/paia/actions/runs/39748755471/job/119723745213) tested merge `9c712f716b105c449c264cdb0c87c4c7d6187e32`, PR312 head `86fbeed40d64a0fc4f84a869db1195bae6960b28`. Three capsule cases threw `ReferenceError: test is not defined` in the Function created at prompt-surface-capsule-display.test.mjs:39. Raw cloud log is preserved without replacement or relabeling. Dot also reported Foundation39748755374; its separate log was not downloaded or independently verified here.

The capsule fixture reused source from `async function hostFixture(` through the later named `disposing the host` test. The new two-case `for (...) test(...)` registration block sits between them, so that old string boundary captured both the fixture and registrations. The generated Function has no `test` binding and executes the loop when creating the capsule helper. This is a test-loader defect, not evidence of a production capsule regression. Both test sources and production host are byte-identical between this branch's baseline and the failed tested merge, as recorded in baseline.json.

## Minimal correction and verification

Only `tests/prompt-surface-capsule-display.test.mjs` changes: end extraction at the fixture's own unindented closing-brace line and include that brace. It follows the existing fixture formatting; this is not a general JavaScript parser. The fixture body, all replacement doubles, production code, thresholds, timeouts, and both newly registered mount cases remain unchanged. No test registration is removed or moved.

The exact two owning files were executed once before and once after with local Node22.23.4: before 36/39 (the same three capsule failures), after 39/39, zero skipped/cancelled. Receipt compares all 39 registered names in order and verifies both held-first-RAF cases remain present; the capsule file retains all ten original cases. Original run used cloud Node22.23.3/Ubuntu; local OS/patch are different. Static package check passed 21218 guardrails/607 resources and diff whitespace check passed.

Command: `node --test tests/prompt-surface-capsule-display.test.mjs tests/cpv1-09-prompt-surface.test.mjs`, using the isolated Node22 path. Python3.12 executed `scripts/check_package.py`. No browser run is needed for this source-extraction-only correction; prior native evidence is not relabeled as a changed-head run. No Full, workflow/head/Draft/version changes, model calls, deployment or merge. Dot still owns independent review and integrated acceptance. Original Search MEMORY_STALE and historical STALE_BASE remain separate tasks.

Local paths are redacted from published TAP only; raw/public hashes are retained. No profiles, databases or private content are included. Full cloud log is losslessly compressed. Original failures remain available.
