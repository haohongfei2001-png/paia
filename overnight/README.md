# PAIA continuation control v2

Campaign: `paia-continuation-20260915-v2`.
Control branch: `overnight/control-20260915-v2`.
Product branch: `ux-r2`.

This branch was created from the verified v1 control commit `b46a2edda95424934da23784a424d47f0a44f739`. V1 is EXHAUSTED / HISTORICAL, with 8/8 opportunities used. Its branch and published history must never be edited. Inherited `overnight/runs/001` through `008` records are historical v1 evidence, not v2 executions. No ninth opportunity or new scheduled task is authorized.

Read this README, `OVERNIGHT_DEVELOPMENT_STATE.json`, `OVERNIGHT_DEVELOPMENT_PLAN.md`, and State.last_run_report at one pinned control commit. Then verify State.product.expected_head against `ux-r2` before reading its `extension/AGENTS.md` and UX authority order. **All extension files on this control branch are an old snapshot, not product authority or current source.**

Current independent recovery is limited to: audit v1; diagnose and repair UX-R5; run every required gate; publish accurate report/status; establish a continuation checkpoint; stop. UX-R6, Apple/MCP slices, main changes, merges, force pushes, baseline moves, destructive migrations, secrets and private-data tests are forbidden.

All publication uses a single parent, exact expected refs and non-force fast-forward. Record a prepared product commit and tree in State.pending_publication before advancing the product ref. Immediately before each write, recheck the target HEAD and active owner. Only the exact prepared H/C pair may be recovered. Any other HEAD or owner drift stops writes. Release the owner at a safe final checkpoint. CI-only draft PR #28 stays unmerged against the frozen baseline.
