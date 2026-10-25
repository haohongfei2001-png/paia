# Prompt known-document selection hold candidate — 2026-10-25

Base: `34cc9bf462476a6663bd533c93aa384bf1060dbb`. Independent branch `codex/local-prompt-known-document-hold-20261025`. Only the original receipt owner and one new synthetic owning test change; evidence is under this directory. No worker, adapter, public request DTO, transport, permissions, global gate, shared harness or other runtime changed. No push, browser/native, CI, network, install or large-scale run.

## Behavior and limits

The original owner synchronously closes admission and freezes its entire private, nonempty known receiver map. Registration rechecks admission after its final tabs await when this new driver exists, and every registration/removal changes the map version. The original receipt hold token is private and distinct from the returned document-driver token. A caller cannot provide receiver arrays or issuer callbacks, or use the old generic release with this token.

One original work ticket carries the cumulative 4096-reference / 2 MiB / 30-second budget across original exact tabs.get, documentId-directed HOLD, original task/serial drain, actual ledger/gate/restore/generation snapshot, FENCE and repeated snapshot. Exact receiver, nonce, documentId, URL, owner epoch, domain and per-document challenge are checked; positive remaining time is required. Pending ledger claims, changed generation/gate/snapshot/membership, unobservable tracked promises and negative or malformed document evidence refuse proof.

Every attempted HOLD, including a negative response, has one precharged exact RELEASE. Unresolved raw sends remain tracked; only their actual settlement schedules that one cleanup. No retry or renewed deadline occurs. Unknown/false release, expired work or trackingUnknown keeps receipt admission closed. Disposal invalidates proof and preserves saved exact cleanup binding; it does not fabricate successful cleanup. The current public known-document methods are new local internal capability APIs, not worker request endpoints.

This proves only a prospective fixed known subset, never complete browser inventory. `legacyCoverageUnknown` remains true. Synthetic tabs replies are protocol controls, not actual host or browser acceptance. The production global selection gate remains closed. No real document coverage, global activation, background-wide quiet or old UNKNOWN resolution is claimed.

## Verification accounting (separate invocations)

Node: `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node` (existing Node 22.23.3). Working directory is this candidate repository. All tests use original local owning fixtures with fake IDB and synthetic tabs; no shared harness changes.

1. New positive control against original runtime: **0/1**, exit 1, TAP 759.037375 ms (`baseline.log`). Baseline method absent. Exact original runtime retained in `baseline-runtime.mjs.txt`.
2. Initial new driver (22 cases) plus original receipt-hold (19 cases): **40/41**, exit 1, TAP 1353.846 ms (`owning-first.log`). Timed-out raw HOLD cleanup incorrectly returned true after the mocked timeout; expected false. Original failing source and test are `first-runtime.mjs.txt` / `first-test.mjs.txt`.
3. Sticky driver budget failure repair, timeout control only: **1/1**, exit 0, TAP 302.33125 ms (`timeout-followup.log`). This does not replace the original failed combined invocation.
4. New driver file after three additional controls: **25/25**, exit 0, TAP 1148.2155 ms (`driver-final.log`). Exact runtime/test snapshots are `driver-25-runtime.mjs.txt` / `driver-25-test.mjs.txt`.
5. Final conservative trackingUnknown cleanup guard and new unobservable raw-Promise control: **1/1**, exit 0, TAP 249.118958 ms (`observability-followup.log`). This is later than 25/25 and reported separately. The final new test file has 26 cases; no final 26/26 or whole related combined run is claimed yet.
6. Final `git diff --check` passes.

## Commands

`NODE` below means the absolute existing Node binary above; not a shell environment change.

Baseline temporary module came from `git show HEAD:extension/background/prompt-insertion-receipts.js` into `extension/background/.known-document-baseline.mjs`, so its relative imports stayed original. Command: `PAIA_KNOWN_DOCUMENT_MODULE=../background/.known-document-baseline.mjs NODE --test --test-name-pattern='nonempty entire original known map' extension/tests/prompt-insertion-known-document-hold.test.mjs`. That owned temporary file was then moved into this evidence directory, not deleted.

Initial combined: `NODE --test extension/tests/prompt-insertion-known-document-hold.test.mjs extension/tests/prompt-insertion-receipt-hold.test.mjs`.

Timeout followup: `NODE --test --test-name-pattern='one timed-out raw HOLD' extension/tests/prompt-insertion-known-document-hold.test.mjs`.

Driver 25: `NODE --test extension/tests/prompt-insertion-known-document-hold.test.mjs`.

Last followup: `NODE --test --test-name-pattern='unobservable original HOLD' extension/tests/prompt-insertion-known-document-hold.test.mjs`.

## Review handoff

Candidate is frozen for root-arranged independent review. Final full related owning batch is deferred until review corrections are resolved, avoiding repeated runs. `source-vector.json` binds the final runtime/new test and unchanged original receipt-hold file. SHA256SUMS binds all report/evidence files except itself. No final product/real browser acceptance is implied.
