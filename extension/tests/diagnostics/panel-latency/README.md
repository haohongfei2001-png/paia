# Same-job PAIA panel latency comparison

Status: native paired measurement **UNRUN**. Local contract checks passed on 2026-10-19 at 07:45 UTC: 29 original V3 + 15 paired JavaScript tests (44 total), 5 original instrumentation safety tests and 10 paired filesystem safety tests. These synthetic contracts are not 44 native measurements. Full extension pair assembly awaits CI; local filesystem tests use the three actual pinned runtime files plus synthetic file/symlink entries. This package does not replace either historical CI attempt: V2 run39213242260 remained INCOMPLETE with 21 samples, and V3 run39215726767 passed all 22 samples, 2 source traces and 2 original retirement controls. Baseline 500-Input means differed by about 25% between those jobs; cross-job differences must not be attributed to optimization.

## Fixed comparison

Use the existing authorized public standard Ubuntu job, same official Chrome, same installed dependencies, original 12-minute limit, stdout only, no artifacts/cache/providers/deployment. Baseline always runs first. Each variant uses a separate temporary extension tree and a separate Node process invoking the unchanged V3 harness. Original FakeChatGPT.start creates a fresh native profile/browser/context for each invocation; its original finally-close completes before the next process. Do not reuse a process, browser, context, database or fixture state between variants.

The common UI/runtime base is diagnostic head90d485549a9cf18bec0ce1839565234fb6560788. Candidate overwrites exactly core/manual-materials.js and core/prompt-reuse-service.js with the independently reviewed bytes in candidate/. No integrated PR304 manifest, other UI, tests or runtime are silently substituted. variants.json records exact three-file identities for both variants, including unchanged background/prompt-surface.js.

prepare-pair.py verifies all three original hashes and the exact two-file candidate payload before creating output. It copies the complete extension twice, preserving dependency symlinks without dereferencing them, verifies the source did not change, and requires full file/symlink inventories to differ at exactly the two allowed paths. Full inventories stay in the temporary directory. Stdout assembly contains only counts, hashes, identities and paths, no file bodies.

Original instrument.py, panel-latency.mjs, validate-evidence.mjs, check-result.mjs and the V3 validator/instrument contract tests are byte-identical to the reviewed V3 package. The original instrument must reject candidate bytes. instrument-candidate.py explicitly pins the original instrument itself and all three candidate runtime files. It uses the same fail-closed staging engine and exactly-once anchors. A mismatched third file fails before any write. Its extra Source count hook is a private closure per snapshot passed into the original helper and invoked only after the original projection/filter check. It adds one pure numeric callback per filter-qualified Input. This measurement overhead is not present in production and is not subtracted or estimated away. No body is logged, no global/shared per-snapshot count is introduced, and all qualification/generation/target checks remain.

## Existing CI interface

Set H to this package and RUN to a fresh empty directory under RUNNER_TEMP. Existing CHROME_PATH/PLAYWRIGHT_MODULE/CI variables remain unchanged. Do not execute the browser locally in the blocked workspace.

```sh
node --test --test-reporter=tap "$H/validator-selftest.mjs" "$H/pair-selftest.mjs"
python3 "$H/instrument-selftest.py" --baseline extension
python3 "$H/pair-selftest.py" --baseline extension
python3 "$H/prepare-pair.py" --baseline extension --candidate-runtime "$H/candidate" --output "$RUN"
python3 "$H/instrument.py" --extension "$RUN/baseline/extension" --check
python3 "$H/instrument-candidate.py" --extension "$RUN/candidate/extension" --check
python3 "$H/instrument.py" --extension "$RUN/baseline/extension"
python3 "$H/instrument-candidate.py" --extension "$RUN/candidate/extension"
PAIA_LATENCY_AUTORUN=1 PAIA_LATENCY_EXTENSION_PATH="$RUN/baseline/extension" PAIA_LATENCY_OUTPUT="$RUN/baseline-evidence.json" node "$H/panel-latency.mjs"
node "$H/check-result.mjs" "$RUN/baseline-evidence.json"
PAIA_LATENCY_AUTORUN=1 PAIA_LATENCY_EXTENSION_PATH="$RUN/candidate/extension" PAIA_LATENCY_OUTPUT="$RUN/candidate-evidence.json" node "$H/panel-latency.mjs"
node "$H/check-result.mjs" "$RUN/candidate-evidence.json"
node "$H/compare-pair.mjs" "$RUN/baseline-evidence.json" "$RUN/candidate-evidence.json" "$RUN/assembly.json"
```

On failure, preserve whichever evidence JSON exists verbatim in the original stdout/noartifact job log. Do not replay failed actions or launch a replacement variant. No paired summary is valid unless both exact original artifacts independently pass every V3 check. Preserve exact source/runner/Chrome identities alongside the log.

## Interpretation

Each variant requires 22 samples, 2 fresh original Direct/Family classifications and 2 exact prior-candidate retirement controls. Consent, three target fences, generation, zero external/extension/provider requests, zero Send, unchanged draft, frame identities, successful RPCs and complete fixture counts remain mandatory. No product thresholds change.

compare-pair.mjs reads only the two complete JSON files and assembly receipt. It checks exact variants, fixture equality and sequential ordering, then reports all six cold values in execution order per size, min, interpolated quartiles, median, max and mean. It reports content, iframe initialization, query, scan, Family projection and target-check distributions. The four reported cold durations are recomputed from original timestamps and must exactly equal the evidence fields. Percentage deltas are descriptive, not significance tests or new acceptance thresholds; a zero baseline mean omits that percentage and records an explicit reason.

Fixed baseline-first order does not remove time/order or runner drift. Six observations do not establish stable tail latency. Recreated iframe means a new iframe in an already-running browser/worker, not cold startup. Warm samples retain old pre-click content/paint timestamps: only afterClickObserved minus click is reported as an observation upper bound with polling/settling overhead, not new rendering or physical paint latency. Synthetic Linux headless results do not measure the user's Mac, real archive, physical120Hz, NIB50ms, live provider, or complete PR304 integration.
