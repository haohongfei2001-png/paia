# UX-R4 original-scale seed timing — 2026-10-23

## Scope and identity

Human approval relayed by dot allowed one isolated, original-scale local timing diagnosis after static and tiny synthetic validation. The original 300000 ms case timeout applies, with no automatic retry. This is not a Full run, Linux qualification, cloud capacity diagnosis, or authorization to optimize production writes.

Source checkout: `3a5e53634e69add565f55a6867f324a98f2080c0`. Eight relevant source files match frozen acceptance head `02144bccf5e0e0b6842aaa4e7c6958cedecdfde1` byte-for-byte; their exact SHA256 and Git blobs are in `start.json`. Original fixture SHA256: `5bb5c14924b13690dfedb6f4cdbb1cc80ec9f225bbb00ce96b6483a6823e9e7b`.

All diagnostic files are isolated in this evidence directory. No tracked production source, shared harness, browser test, workflow, router, version, acceptance branch, or main was edited. The executable contains exactly the original F-LARGE case, including its post-seed assertions, with only final evidence export added. It does not run the other cases in the owning file.

## Observation boundaries

The fixture remains 100000 Inputs, 1000 documents, 300 Topics, 5000 Entries; Input batches remain 200 × 500 and Entry batches 10 × 500. Row objects, write order, all 25 original awaits, original strict repository transactions, hooks, indexes, semantic metadata, final counts, and test assertions are preserved. `edits.json` and `instrumentation.patch` enumerate every insertion. Reversing those edits reconstructs the exact original fixture bytes.

Per batch, timestamps record repository call, callback entry, final request issuance, completion of the original `Promise.all`, and return from the original awaited repository transaction. Object construction time measures only the Input record/block/document object construction subset. It excludes index factories and is part of dispatch time, not an additional phase. Entry construction cannot be separated without rewriting the original inline arguments and remains UNKNOWN.

Post-Promise repository completion includes navigation/semantic flushes, backup generation, fences, original strict native transaction completion, and JavaScript continuation. This experiment does not instrument these internals, so it cannot split hook time from native commit time or prove a particular internal bottleneck. Timestamps add unquantified observation overhead. No second run is allowed to estimate it.

## Prechecks and retained failures

Static checks passed: reversible original bytes, 25/25 awaits, exact case after removing evidence export, original timeout and bounds, one test case, syntax checks.

The first tiny synthetic validator failed because its mock environment supplied `globalThis.chrome` but not the original callback's bare `chrome` binding. This was a validator defect before any browser or large seed. The first checker and failure log are retained as `check-timing-first.mjs` and `synthetic-validation-first-failed.log`. Only the mock argument binding was corrected.

The corrected tiny synthetic validator passed four scenarios: success, put failure, commit failure, count failure. It compares original and instrumented operation order, original awaits/error identity, timer cleanup and body-free observation schema using a small in-memory surrogate. It is not native IndexedDB evidence and never changes the full-scale executable's bounds.

## Environment and single-run gate

Official isolated Node 22.23.3 / npm 10.9.9, Python 3.12.14, Playwright 1.63.0, macOS arm64. Actual installed Chrome is 156.0.8078.47, not the historical 155 version. The original harness runs headless using its existing launcher, temporary profile, arguments and network blocking. No dependency download, system environment change, new launch flag, credential, real model request, build, APT or font install is involved.

`run-once.py` verifies unchanged source hashes and successful prechecks, creates `run-start.json` exclusively, then executes one absolute-Node command. `run-result.json` and `full-scale.log` record its result; an existing start marker refuses another invocation. This gate is evidence for this local invocation, not a global protection against manually deleting files.

## Results

The only original-scale invocation passed: 1/1, exit 0, no fail/cancel/skip/todo. Test duration 87572.293042 ms; TAP total 87744.3015 ms; wrapper wall 87771.068542 ms. UTC start/end: 2026-10-23T01:21:38.379415Z / 01:23:06.151028Z. All eight source hashes remained unchanged. No rerun.

Counts: 100000 Inputs / 1000 documents / 300 Topics / 5000 Entries. Original `seedMs` = **84714.5 ms**. All 200 Input batches and 10 Entry batches completed.

| Observed batch phase | Inputs, 200 batches (ms) | Entries, 10 batches (ms) |
| --- | ---: | ---: |
| Repository call to callback entry | 7.1 | 0.4 |
| Callback entry to final request issuance, including construction | 1013.1 | 3.6 |
| Final request issuance to original Promise.all completion | 60054.0 | 1145.1 |
| Promise.all completion to original repository return | 22172.5 | 9.9 |
| Total transaction time | 83246.7 | 1159.0 |
| Measured object construction subset, already included above | 122.5 | UNKNOWN |

Outside these batches: sequence transaction 3.7 ms; Topic/Entry owner creation and template reads 231.7 ms; final four counts 73.3 ms. Template setup 42.7 ms and clear 6.6 ms occur before the original seed timer. Aggregate rounding and uninstrumented loop overhead leave 0.1 ms relative to the original seed duration; the intervals are not all independent/additive (construction is a dispatch subset, and seed includes its subphases).

Post-seed original assertions passed: search 159 ms, 672 reads, 0 writes, 0 scans, 40 items / 40 scanned, full long Input 50008 characters, retired Context refusal and original network/error checks. This is the isolated F-LARGE Source case, not the entire owning browser file or any service-native qualification.

## Interpretation and remaining unknowns

For this local sample, Input batch asynchronous waiting dominates. Measured object construction is roughly 0.145% of the seed interval; even eliminating that entire observed subset would save only about 0.123 s in this sample. This does not measure every synchronous factory or allocation, and no optimization is implemented.

`Promise.all` wait is not synonymous with disk time: original `t.put` paths can include asynchronous reads, indexes and hooks. Post-Promise time is not synonymous with native commit: it includes repository finalization and semantic metadata flush before original native completion. The result supports focusing any separately approved deeper diagnosis on those existing paths; it does not justify removing hooks, semantic metadata, awaits, strict durability, or changing batch/data size.

The previous cloud seed 228126.6 ms and this local 84714.5 ms were measured on different platforms/environments and observation conditions. Their difference is not an improvement benchmark or proof of cloud margin. No Linux capacity limit, Browser2 budget, retry allowance or routing change follows from this result.

## Delivery

`timing-summary.json` contains aggregate intervals; `artifacts/phases.json` retains all 210 per-batch records; `full-scale.log` is the complete TAP result; `artifacts/large-fixture.json` and the original screenshot retain the owning case evidence. `SHA256SUMS` binds all delivery files. No full-scale failure occurred; the initial synthetic validator failure is explicitly retained. PR313 Conversation was reread in full (70 comments, unchanged from the start).
