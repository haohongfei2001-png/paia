# NIB Search MEMORY_STALE — bounded diagnostic handoff

Task PR313 comments 6336863889 / 6336952983; latest queue correction read 6336994155. Branch `codex/nib-search-owner-diagnostic-20261022` is based on the **exact failed merge** `9c712f716b105c449c264cdb0c87c4c7d6187e32`, obtained read-only without changing any acceptance branch. Diagnostic commit `22fb59c7aed65c91bf39de72d1e4ba4a8b426543` changes two test/harness files only. It is not a runtime repair or a claim that the historical failure is fixed.

## Original evidence

[Full39748755471 / Browser9 job119723745774](https://github.com/haohongfei2001-png/paia/actions/runs/39748755471/job/119723745774), PR312 head `86fbeed40d64a0fc4f84a869db1195bae6960b28`. Original log SHA256 `4600cb8b9969cc51092d261777644dfda0b9e09e0cc61cf59c256532a7f2082f`. Artifact12412724728 is 26480544 bytes, SHA256 `2cec4f9ea9b58bd75e0e0f7fb6ac9cf7f36dcd401bfffc7b4195d8c8da7c3813`, verified against GitHub's artifact metadata after one interrupted transfer was resumed. Only relevant JSON is republished, not screenshots or the entire artifact.

Release failure8 records 40 bounded frame RPC outcomes: two suggestion_current successes, PAIA_PROMPT_QUERY -> MEMORY_STALE at12726ms, then a measure success; candidates mode has zero rows and the changed-content message. Original stack points to the archive-page query at test line111 after capture closure/originalOwnersSettled. The frame trace is surrounding evidence, **not proof that the recorded frame query and failed archive query are the same invocation**. Failure9 shares the same incomplete family setup and is consequential. Strict positive flags correctly prevent a success receipt. Source passed. There is no original grant/refusal phase or complete producer-completion trace.

## Existing owner path and limits

PromptReuseService can refuse for original snapshot generation changes, lost repository/control identity, shared-read authority mismatch, write-fence changes or final delivery-key changes. Its already-existing `readPromptReuseRefusalEvidence()` holds at most16 fixed phase/code/boolean rows, with no bodies, IDs, epochs or hashes. These rows are observations and may include expected negative cases or successful guarded replacement attempts; they are not a one-to-one request log or fresh authorization.

`originalOwnersSettled` checks active foundation/invalidations/cleanup, publication reservations, compatibility/search migration and selected jobs. It is a current queue-state observation, not a completion handle for every accepted capture/diagnostic producer or every later notification. Seeing two saved Inputs, closing their page and subsequently measuring layout does not prove that a Prompt material grant remains valid. This identifies an unproven boundary to investigate; it does **not** establish the cloud root cause or justify replacing that barrier yet.

No scan/TTL/read budget, fence, cache qualification, original fallback, time budget, paid/compound action, assertion or product rule is changed. No retries were added. No runtime repair is supported by the current observations.

## Useful diagnostic change

The existing CPV surface failure probe attempts dynamic import in Worker.evaluate. An explicit local probe proved Chrome MV3 rejects that operation with `import() is disallowed on ServiceWorkerGlobalScope`; simply copying that probe would silently provide no evidence. That failed attempt is retained.

The opt-in `NIB_SEARCH_OWNER_DIAGNOSTICS=1` mode instead follows the repository's existing `uir03-worker-copy.mjs` static-ESM disposable-copy pattern. A helper copies selected source or standard release, verifies the exact file set and every copied byte, and only appends a static import plus a global reference to the existing **read-only** refusal reader in the copied service-worker. No new mutable owner, RPC, provider, authority, permission, launcher or security flag is added. Original selected source/release and manifest remain byte-identical. The copy is removed after the original harness closes.

The test captures bounded original-owner rows on a case failure, with the existing one-second diagnostic timeout/fallback pattern; lack of evidence cannot replace the original failed assertion. Diagnostic mode also saves a source/release copy binding and final ring for availability verification. Ordinary mode keeps the original installed extension and reports owner diagnostics unavailable, without dynamic import. The entire original16-case journey per variant and180s timeout are unchanged. The mode is not enabled in any workflow or acceptance branch.

## Executed results and retained mistakes

Actual Node22.23.4/Python3.12.14/Playwright1.63.0/Chrome155.0.8059.85/macOS, original headless CDP harness, fresh isolated synthetic profiles and zero external/provider requests:

- Ordinary source/release with the first failure-only observer:34/34. Historical positive failure was not reproduced; no acceptance claim for cloud is made.
- Initial native dynamic-import probe:FAILED because MV3 forbids import(), retained.
- First static-copy attempt:33/34. All journey leaves passed, but the original terminal source-identity assertion correctly failed because I edited test diagnostic cleanup during execution. This is an invalid qualification attempt, retained and **not** counted as product failure or pass. No assertion was removed. Final verification was rerun only after this new change was frozen.
- Final static-copy source/release:34/34, zero skipped/failed,76003.293667ms. Both original-owner readers are available; source ring has7 rows and release6, from expected negative/currentness paths. These cannot be assigned retrospectively to the original cloud query.
- Existing owner-identity/body-free refusal tests:25/25. The static package audit over unchanged runtime passed21218/607; whitespace check passed. No Full or complete Browser9 was run.

Exact logs, original cloud JSON, copy/file hashes and receipts are in [evidence/nib-search-owner-20261022](evidence/nib-search-owner-20261022/receipt.json). Local paths are redacted in published logs. Retained real failure and original runtime identity distinguish source/release acceptance from opt-in diagnostic evidence.

Command for the bounded original journey is `NIB_SEARCH_OWNER_DIAGNOSTICS=1 node --test tests/nib-v4-search-chrome-e2e.test.mjs` with the previously authorized exact local environment. Ordinary mode omits that flag. `node --test tests/prompt-reuse-control-identity.test.mjs` covers existing refusal metadata constraints. The failed one-off probe made no paid or remote request.

## Handoff / next dependency

Historical root cause remains **UNKNOWN**. Dot can independently review this diagnostic-only two-file commit and choose a single targeted exact Linux source/release run if it is needed to capture the missing phase; no workflow modification or CI dispatch is included here. Use failure-time ring together with the actual request, publication/currentness and producer-completion facts; do not infer cause from later layout success or from final rings of successful runs. A matching owner-stage failure is needed before any fixture or runtime correction. Continue independent queued font analysis and candidate-current contract proposal without repeating unchanged local journeys.
