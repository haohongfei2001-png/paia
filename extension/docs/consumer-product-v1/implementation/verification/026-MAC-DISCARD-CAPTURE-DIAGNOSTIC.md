# macOS discard capture diagnostic

Base `b109041c`. Test-only diagnostic, no runtime/CI changes or repaired cloud-root-cause claim.

Hosted log `work/macos-discard-b109-failure.log` records the update case passing and discard case failing at the former broad stage `open conversation in archive window`, with the browser and archive still open. That stage encompassed navigation, capture-bridge readiness and three-record capture; the available hosted error does not disambiguate these awaits. The original failure remains unresolved evidence.

The same complete file now labels navigation, background capture bridge and initial three-record qualification separately. Initial and failure diagnostics report only synthetic lifecycle metadata: visibility/readiness, bridge boolean, message count, stored record count and fixture page errors. No Source or user body is recorded. Original two cases, 120-second budgets, real Chrome tabs.discard/reactivation, same-window/index and unique new-record assertions are unchanged.

One local full-file headless execution: **2/2 PASS**, zero fail/skip/cancel, 25.761862417 seconds, `/tmp/macos-discard-capture-diagnostic.log`. Initial discard fixture observed `visibility=visible`, `ready=complete`, `bridge=true`, `messages=0`; all original capture/discard/restoration checks then passed. This does not establish the hosted Mac visibility state or cure its failure. No same-configuration retry was used as a fix, and no activation behavior was changed.

Next evidence needed: the precise failed hosted await and its lifecycle metadata. The fake metadata-first page renders only after the actual capture bridge enables history and the synthetic history fetch completes; its existing 300ms render timer is not changed. No production capture/authority relaxation is proposed.

Failure-path diagnostic follow-up: the three read-only observations run independently under one 2500ms diagnostic ceiling, retaining whichever observations completed if another is hung. GET_STATUS exposes only response success, enabled/consented, adapter version and response readiness; runtime version is explicitly sourced from the extension manifest because the extension-page GET_STATUS response does not include the content-sender-only runtimeVersion field. GET_STATE is reduced to record count inside the page. Rejection/timeout never replaces the original lifecycle error. This ceiling does not enlarge either 120-second test budget or any success-path await. Syntax and diff checks pass; an extracted actual diagnostic block passed four controlled nonbrowser paths (all hung, partial completion, success, rejection). The temporary runner initially had a syntax error, corrected before those checks; no browser result is claimed for this diagnostic-only follow-up. Earlier complete 2/2 execution remains the prior exact test version evidence.

## Hosted follow-up and isolated capture diagnostics

PR214 targeted run37814104170/job113438160243 (`work/macos-discard-2e7-diagnostic-failure.log`) now identifies the failure as initial three-record capture, not bridge readiness: visible/complete, bridge true, three rendered messages but zero stored records, no page errors, enabled/consented true. This disproves the earlier timing-based bridge hypothesis; it does not identify the capture failure cause.

The next failure-only observer targets exactly the synthetic conversation tab and reads its ISOLATED lifecycle presence/active/ready, controller presence, content version and a separate temporary adapter's first scan code/count/sanitized structural metrics. The temporary adapter is never installed as the capture owner or allowed to mutate its pending/stability state; its first scan may legitimately be UNSTABLE_PAGE. Existing archive diagnostics contribute only status/scanned/time/error-code/sanitized structure. All four observers share the unchanged 2500ms diagnostic ceiling. No activation, retry, capture RPC or content/body logging is introduced. Private capture closure state is not observable: controller presence alone is not claimed to prove a running cycle.

One complete headless local execution with `CI=1 PAIA_HEADLESS=1`: **2/2 PASS**, zero fail/skip/cancel, 25.975639167 seconds, `/tmp/macos-discard-ci-capture-diagnostic-final.log`. Browser version154.0.8037.98, platform-default Chrome; initial visibility visible, bridge false, messages0, then original capture/discard/restore/uniqueness assertions passed. The new failure branch was not naturally entered on this successful run. The preceding invocation from the wrong working directory only reported a missing test path (`/tmp/macos-discard-ci-capture-diagnostic.log`); no test ran there. Hosted root cause remains pending.

## Hosted targeted result and remaining uncertainty

Exact diagnostic head c8b480e3773f29e9a0294e5e5d516bc5ccc23484, run37815295895
Mac job113442270936: complete2/2 PASS53.189s. Initial bridge=false, then actual
three-record capture, native discard/restore and fourth-record deduplication all
passed. Previous head2e7a6a19 run37814104170 failed with bridge=true and three DOM
messages but zero captured records. The successful-path test behavior is the
same; this result does not establish a runtime repair or explain the intermittent
failure. Original negative evidence remains. Diagnostics only, no timeout or
assertion relaxation, production capture unchanged.

The coordinator is combining the independently reviewed diagnostic with the
whole-file shard-balance correction for the next exact PR210 full candidate.
A full candidate pass and exact-main verification are still required. Further
failure must be diagnosed using the new bounded lifecycle/status metadata; no
unchanged targeted rerun is requested.

Formal custom-reporter visibility correction: `scripts/test-report.mjs` intentionally emits only pass/fail events, so console-only failure diagnostics were absent from the formal macOS failure log. The same already-whitelisted bounded diagnostic object is now retained and appended to the final thrown lifecycle Error message (`DISCARD_CAPTURE_FAILURE=`). No global reporter/runtime/budget change. An external synthetic Node test uses the exact throw statement extracted from this test and the actual custom reporter: intentional one-test FAIL/exit1 emitted both the marker and isolated controller/status JSON in `/tmp/macos-discard-reporter-diagnostic.log`. This is a successful diagnostic-visibility check, not a browser pass. Initial temporary generator path error was corrected before execution; no browser was rerun.
