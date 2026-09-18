# PAIA Capture Foundation Hardening v1

This directory records the product-owner-authorized capture audit and implementation begun from remote main `9d996b725150010e6c2b760b937b25790e852be5` on 2026-09-18.

Read [CERTIFICATION.md](CERTIFICATION.md) for findings, evidence, limits and the acceptance decision. A passing synthetic fixture is not evidence of today's logged-in ChatGPT structure.

## Runtime boundary

`ChatGPTAdapter` confirms a stable, rendered, explicitly user-authored text leaf and source identity. `capture.js` batches it for the trusted worker. The worker validates caller, conversation and consent epoch before the transactional archive writer persists immutable source snapshots.

`response-observer.js` reads only bounded passive copies of already-started, allowed page responses. `history-contract.js` projects user identity/time metadata, and `response-bridge.js` reconciles only sources with canonical DOM proofs. No extra request, draft capture, assistant archive or remote telemetry is introduced.

## Important semantics

A logical source is `(platform, conversation ID, source message ID)`. Several immutable content snapshots may belong to that source. Repeated DOM events are not new snapshots; distinct source IDs with identical text remain distinct sources.

`sourceSentAt` is accepted provider/DOM evidence at the archive's existing millisecond precision. `capturedAt` remains the first local persistence observation. Missing evidence stays unknown. Historical conflict ledgers are not blindly reset.

## Tests

`tests/capture-foundation.test.mjs`, additions to the adapter, scheduler, observer and security suites, and `tests/capture-foundation-chrome-e2e.test.mjs` exercise the hardening. The browser suite installs both source and emitted release in disposable offline Chrome profiles.

`tests/frozen-capture.test.mjs` retains the original freeze for untouched files and exact authorized CFH-v1 hashes for changed frozen files. Updating a hash is not a correctness proof; demonstrated regression tests and review are required.

## Installation boundary

This task does not replace the daily-use extension, read or migrate the user's real archive, or change its identity/path. After an owner-controlled extension update, existing ChatGPT tabs need refreshing to load the new content scripts. See the certification before treating this work as production-certified.
