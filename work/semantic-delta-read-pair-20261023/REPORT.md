# Same-entity semantic metadata read pair — 2026-10-23

## Candidate and authority

Implementation **f745013c121391488002116e28b061dd796c94ef**, parent **6ff2ce8d67eb94d1e342e84b0d1bfd79e185ae51**, isolated branch `codex/semantic-delta-read-pair-20261023`. The human allowed the two independent reads in one original transaction to overlap plus targeted failure/rollback/concurrency/correctness tests, relayed verbatim by dot. This candidate does not update PR313/312/main, change a version, authorize a Full/cloud diagnosis, or implement a larger optimization.

Exactly two implementation/test paths changed:

- `extension/core/ai-usage/delta.js`: replace the two sequential `known` / `previous` reads with one awaited `Promise.all`, with explanatory comments (3 added / 2 removed lines).
- `extension/tests/ai-usage-semantic-receipt.test.mjs`: append six focused cases (one concurrent/sequential-boundary case, four rejection cases, one coalescing/replay case); original seven tests remain an exact byte prefix. The four new paired-failure tests have a 5-second bound so a future loss of concurrency cannot hang their test barrier. No original timeout is changed.

Other runtime, repository, invalidation, shared harness, registration, workflow, package/version and existing assertions remain unchanged. `start.json` binds original files; `source-vector.json` binds final files and six unchanged dependencies; `candidate.patch` is the exact two-path difference. The original delta source equals frozen acceptance `02144bccf5e0e0b6842aaa4e7c6958cedecdfde1` byte-for-byte and is retained in `baseline-delta.js.txt`.

## Independence and rejection reasoning

The keys are `KNOWN_PREFIX + key` and `DIRTY_PREFIX + key`, with distinct constant prefixes. Both reads use the same `t`, same `meta` store and same already-admitted entity after original live-owner/layout eligibility checks. Neither key nor call depends on the other's result; there is no intervening write. The original async `Transaction.get` performs scope validation, read accounting and an IndexedDB get; it has no mutation hook. Its rejected promise, including a synchronous exception inside the async method, is handed to the join. Both promises receive rejection handlers before their asynchronous request results are consumed.

Planning still starts only after both fulfill. A rejection propagates through the unchanged repository catch/abort/done path; no fallback, catch-to-success, retry or error remapping is added. With two failures, the first observed rejection remains the propagated error and the sibling rejection is handled by the join. The tests exercise both rejection orders explicitly.

All subsequent per-entity known/pending writes remain individually awaited before the next entity's reads. Sequence/counter, human fence, live revision checks, removal handling, invalidation, final fences, strict durability, repository completion wait and post-completion receipt binding retain their original code. No cross-entity concurrent flush, old-value cache, batch/data reduction or new authority is introduced.

## Tests and preserved evidence

Environment: existing official isolated Node **22.23.3**, macOS arm64, original vendored fake-indexeddb through the production repository. No install, network/model call, browser/native IndexedDB, build, APT, cloud or Full execution. This is local emulated-IDB evidence, not native or Linux certification.

1. New concurrency contract against original runtime: **0/1**, exit **1**, TAP **237.824417 ms**, preserved in `baseline-negative.log`. The original serial implementation does not issue the pending read before known resolves; the existing repository reports `STORAGE_FAILED`. No original failure is relabeled green.
2. First complete targeted batch: **48/48**, exit **0**, TAP **10487.446875 ms**. Saved as `targeted-before-test-bound.log` with the exact test source `receipt-before-test-bound.mjs`.
3. After bounding only the four new failure-barrier tests, final same three owning files: **48/48**, exit **0**, **0 fail/cancel/skip/todo**, TAP **9906.273916 ms**, `targeted-final.log`. No test-name filter in either complete targeted batch.

The three owning files are `ai-usage-semantic-receipt.test.mjs`, `ai-cost-semantic-invalidation.test.mjs`, and `mixed-current-fixed-plan.test.mjs`; exact absolute Node/argv in `commands.json`.

New successful-path assertions prove both original requests start before either resolves; both complete before known/pending writes; both writes finish before the next entity's reads; sequence progresses exactly once per entity; pending and known signatures/sequences agree; receipt is absent inside the callback and completion event, present only after repository return, and consumable once.

Each failure case targets the second entity after the first entity's known/pending writes have really occurred. Known-only, pending-only, both-known-first and both-pending-first failures all reject with the exact first error object, abort once, never complete, roll back every original store against a full pretransaction snapshot, and mint no receipt. Both injected native-read-backed rejections are observed; no rejection listener suppresses unhandled errors. Node's test runner reports none.

The repeated-key/journal case coalesces two Input revisions to one sequence increment, uses actual owner-created birth/edit journals, replays duplicate journals in both orders, and retains the newest known row, pending requirements/facets, global sequence and human fence. Replays mint no new receipt. Existing owning tests also retain original native-completion ordering (in the emulation), abort after semantic planning, exact-owner receipt aliases, semantic invalidation, rollback, current plan and restored-journal behavior.

## Limits and next review

**No performance gain is measured or claimed.** Test-suite wall time is correctness-run metadata, not a throughput benchmark. The previous 84.715-second local seed belongs to the unchanged original runtime; it cannot certify this candidate or predict Linux capacity. No new original-scale seed, cloud diagnosis or Full was run. Browser2/PR312/PR313 consumed opportunities remain consumed.

Dot should independently review this exact two-path implementation and evidence before any integration or additional execution. Native IDB, Linux/CI, complete product regression and combined-candidate qualification remain unverified here. This result does not alter the 18-minute/ten-shard constraints, billing/permission boundaries or original transaction protections.
