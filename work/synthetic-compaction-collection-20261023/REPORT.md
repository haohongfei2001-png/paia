# SYNC-01 synthetic collection and retention continuation — 2026-10-23

Base: `215b0ddf993afb5528b70526d1efbf3f8c5aa44e`. This is the test-only continuation of the already delivered actual Source + Working fake-collection journey (`d203bd55` / `114082bd`); those tests were not repeated. No production/runtime/provider file changed.

## Current capability

For BROWSER_NATIVE_SYNC_PLAN §3.2(4), an owned in-memory transport now consumes the original `planCompaction` result and actually removes eligible descriptor/segment/chunk objects from its own private Map. It cannot accept an external Map, provider, filesystem path, delete callback or caller-supplied eligibility plan. Original immutable-object integrity checks and the original planner's complete retained generations, receipts, pins, uncovered tails and graph validation remain authoritative. Fake inventory or pin changes during the asynchronous qualification cause refusal before any deletion. The final owned-version check and bounded Map deletion have no intervening await or external callback.

The complete owning file verifies:

- A manually registered pin stays live during an actual interrupted original `StagedSyncRestore`; collection removes nothing while pinned. Explicit pin release then allows covered-object collection. Both retained checkpoints still restore, and the original Prompt owner can edit after recovery. Pin registration/release is explicit test transport lifecycle, not a production restore-manager implementation or automatic pin cleanup.
- A new pin, released pin or new immutable object after planning starts invalidates collection; every pre-existing object remains. Caller public eligibility is rejected.
- Uncovered descriptor closure remains readable after eligible covered objects are collected.
- Two real original Prompt-owner concurrent edits remain unresolved through collection and cold staging; stale return cannot choose a winner, activation is rejected, and the target preferences remain empty.
- The original Core protocol's body-free purge fence rejects a pre-purge checkpoint as the redundant retained generation. With two complete body-free generations, actual collection succeeds and both separately staged generations remain purged with zero versions after stale operation replay. **This last case is protocol-only**: aggregate Prompt purge remains unavailable at its product owner; no such owner activation is claimed. Older checkpoint retirement and remote physical erasure are not claimed.

## Evidence

`first.tap` was already complete on resumption: 6/6, no fail/cancel/skip/todo, TAP551.049417ms. Its then-current test/helper bytes were retained as `first-source.mjs` and `first-transport.mjs` before adding the released-pin and fence controls. No original process was still running. The prior invocation's environment and command were not reconstructed or attributed retroactively.

After the meaningful two-control delta, the one complete owning-file invocation in `execution.json` passes **8/8**, exit0, no fail/cancel/skip/todo, TAP772.523625ms. Actual Node22.23.3 on macOS27 arm64; synthetic fake IndexedDB. Wall920.2393329906045ms includes the execution receipt's version lookup. Exact test/helper/original-planner SHA256 values are identical before and after. No failures occurred in this continuation; all prior evidence remains separate and preserved.

No original Source + Working regression rerun, browser, build, cloud, large dataset/matrix, installation, credentials, model invocation, real account/data or real deletion ran. The owned Map is the only object collection target.

## Remaining scope

This completes the additional fake-collection conflict/fence/unfinished-pin/inventory-race combination coverage. It does not complete SYNC-01 as a whole, establish native or cross-platform qualification, solve the separate scale/publication requirements, or create any production remote collection/provider capability. Source/Working original-owner recovery remains the separately frozen prior evidence. Actual provider retention, orphan cleanup and physical-erasure semantics remain outside this test-only packet.
