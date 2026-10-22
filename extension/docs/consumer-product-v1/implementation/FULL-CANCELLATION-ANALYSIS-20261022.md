# Full39789515257 cancellation diagnosis — read-only

Addresses PR313 [6342837640](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6342837640) item2 and [6342883734](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6342883734). Independent documentation branch `codex/full-cancellation-analysis-20261022`, base `e5cbe26ffb1d4ebe7e20195f3948de9727b478ff`. No runtime/test/workflow modification, execution, rerun, budget change or gate bypass.

## Exact identities and evidence

[Full39789515257](https://github.com/haohongfei2001-png/paia/actions/runs/39789515257) head `aae4407daec0bdf97ff3598787b66dd332896a31`; tested PR merge `0d6b88464c9b248674337b666b19b15b00a7da7e`, tree `630be5e2da76a6cb1b07808005a9a725da33966e`, parents main `1f3c826c0c49f9d8fd60156182883866971bb8c3` and that PR312 head. The exact merge object was fetched without checking out or changing either branch. Its original workflow, test runner, reporter and shard router were read; hashes in the [manifest](evidence/full-cancellation-analysis-20261022/manifest.json).

Actual original Full/Visual logs were read using gh; raw hashes and filtered public excerpts are preserved with original job metadata and check annotations. No credentials/private bodies or full setup/environment dumps are published. Run census remains **20 success, 1 cancelled, 2 failed gates, 1 historical skip**. Browser assertions808/808 and unit assertions11189/11189 do not establish run success. Foundation39789515119 has five successful jobs on the same head; it does not replace either failed qualification.

## Browser4: confirmed job time limit, unresolved interrupted subprocess

Job119861518409, Current Browser4/10:

| Stage (UTC) | Actual outcome |
| --- | --- |
|13:44:31 job start;13:45:17–13:45:31 font setup|Setup/font steps successful|
|13:45:33 original Run current browser shard starts|Single-thread original16-file suite; unchanged18-minute job budget|
|14:03:27.7088381 final root PASS;14:03:27.7343421 summary|260/260, fail0, skipped0; reporter output completed|
|14:03:30.8106953 original shard step|Operation canceled; no successful step exit|
|14:03:31–14:03:34 evidence upload|867 files,18,972,823 bytes; artifact12430569402 successfully finalized|
|14:03:34 cleanup/post;14:03:37 job completed|Checkout post and complete-job successful; Node/Python posts skipped; job remains CANCELLED|

**New direct evidence beyond the short raw error:** the [check annotations](evidence/full-cancellation-analysis-20261022/browser4-annotations.json) explicitly report `The job has exceeded the maximum execution time of 18m0s`. Thus the platform's reported termination reason is established as the existing job limit; this is no longer merely an inference from timing. The API job elapsed duration is19m06s while the platform annotation says18m; do not invent a reconciliation of scheduler/runner accounting.

The exact `extension/scripts/test-report.mjs` emits its JSON only after consuming the test-event stream and saving test-summary.json. `test.mjs:28–34` still waits for the test child to exit, runs check_package.py and check_development.mjs, then exits. In the other nine shards, both package20858/597 and development audit completion markers appear after the summary, about2.59–3.52s later. Browser4's summary-to-cancel interval is3.08s; neither completion marker appears. Therefore the interruption is in the **post-summary portion of the original shard step**, not the artifact-upload or later job-cleanup step. Raw logs do not identify whether the child had returned or which audit/subprocess was active. A browser-cleanup hang, failed assertion, or Python-audit defect is not demonstrated; don't patch those speculatively.

Artifact zip digest from the original upload log: `95524187415751f1a4973e1241d1c9b7f8e69d4fe5b033752d89b7d25b2578fb`. This analysis did not redundantly download the artifact or claim independent zip-byte verification. Full aggregate correctly rejects `CI_CATEGORY_NOT_SUCCESS:CURRENT_BROWSER=cancelled`; its missing receipt upload is a downstream consequence. Integration correctly rejects current_browser=cancelled/full_suite=failure. Keep both gates.

## Minimal proposal for dot, not implemented or certified

Do not increase18m, remove post-test audits, force process.exit, relabel assertion totals, or spend an unchanged retry. A bounded whole-file rebalance is supported by original sequential timings:

- On Browser4, the complete `cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs` (both native Source/release roots,170 reported assertions) occupies149.56s between the preceding file's last PASS at13:54:19.3527388 and its final PASS at13:56:48.9136775. This interval includes transitions; it is not a profiler measurement.
- Browser3's whole job measured898s; Browser4 measured1146s. Moving only that complete file from4 to3 projects approximately1047.56s and996.44s. Adding15s planning reserve produces1062.56s and1011.44s, each below1080s. These observations are capacity planning, **not a guarantee of future fit**; image/load/preparation can change.
- If dot chooses this proposal, modify only the total10 routing override and its owning coverage expectation. Prove unchanged complete file set, uniqueness, all Source/release cases, other routes including historical widths, original timeouts/concurrency/job count and all aggregate gates. No new shared workflow is needed. Dot owns integration and whether the remaining authorized corrected retry is appropriate.
- Fixed phase-start/end/status timestamps around the existing test child and two audits would disambiguate a future post-summary interruption without body logging. They are optional diagnostics, not a fix or a prerequisite for the evidenced capacity proposal. Do not launch a diagnostic-only Full.

## Prompt Visual is a separate preparation failure

[Visual39789515221](https://github.com/haohongfei2001-png/paia/actions/runs/39789515221), job119861475991, same head: original font step started13:44:41, logged download of fonts-noto-cjk61.2MB from `http://azure.archive.ubuntu.com/ubuntu` at13:44:58.4741401, canceled13:59:40.1524971. [Its annotations](evidence/full-cancellation-analysis-20261022/visual-annotations.json) explicitly report the separate15m job limit. Capture was skipped; later upload failed because no capture directory existed. This is not a screenshot/visual assertion or artifact-service failure. The exact underlying transfer-stall cause is not established by those bytes.

The already prepared font helper has not been natively qualified/activated and targets current_browser; its existence does not prove Visual fixed. Dot must finish the bounded official signature/font-chain qualification before deciding whether to reuse the supported preparation path for this separately owned workflow. No widening of packages, budget, permissions or workflow activation is made here. The remaining retry stays unused by this task.
