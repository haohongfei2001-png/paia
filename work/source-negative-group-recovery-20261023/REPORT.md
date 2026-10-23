# Finite positive + permanent negative Source checkpoint recovery

This implements one original-owner consumer gap in BROWSER_NATIVE_SYNC_PLAN.md C: a complete finite checkpoint containing independent initial Source groups and typed permanent Source purge groups can now be consumed together. It is not completion of Sync, generic active-generation replacement, or recovery of an arbitrary populated Working library.

## Exact scope and actual consumer

Base is 9f4cd6b8 (Saved runtime cbbb8a3b cherry-pick), following compiler b227c5fd and selected Source purge b76bf781. Integration must select this package's delta, not merge this evidence branch wholesale. Six implementation/test paths plus two preparation-only native bridge paths are recorded in source-vector.json; group-checkpoint-plan.js is unchanged.

The existing buildGroupedCheckpoint and GroupedCheckpointRestore accept explicit boolean sourcePurgeProjection:true and dispatch to the new real consumer. Conflicting projections and custom checkpoint hooks are rejected. Ordinary grouped recovery retains its negative refusal. The old negative-only checkpoint's 25-item / single-negative restriction is unchanged.

A complete original Source purge closure contributes seven original redacted envelopes and eight validated purge operations, never reconstructed body content. Positive groups remain original SourceBootstrap groups. The complete local protocol must match exact revision/receipt/sequence/entity-revision/head/frontier/generation/device/owner epoch rows, retained queued outbox, and every original denial. No namespace or queued operation is discarded. Unrepresented protocol, pending namespaces, active canonical generation metadata, Working/Human/Saved families and incompatible live old Source rows remain rejected.

Before mutation, stage validates both current and remote full cuts and their exact union, coverage and ownerScope. Cold denials and real local cleanup are distinguished using original Input/history and cleanup evidence, not a caller flag. The original local purge cleanup validator remains unchanged. Only validated local residuals are projected for existing source-scope checks; full raw facts are retained and rechecked.

The new prepared cold-purge capability invokes the original Core purge path with private transaction authority, exact tombstone and negative facts. It cannot delete a live Source or materialize a historical body. Positive Source writes use the existing prepared bootstrap owner. Both apply in ONE original repository transaction. Local outbox and original local cleanup stay unchanged.

A private detached Map prediction runs the original Source/index/navigation/semantic writers before any native write, against exact original schema and full before-state. It does not become another data truth or live writer. The expected callback and terminal cuts are derived in advance. The consumer verifies every callback row, then registers count plus exact row reads for all 37 repository stores at the original final transaction fence, including original semantic/navigation flushes and backup generation. It does not bless an observed post-write cut as the expectation. Config, Core, repository, original control publication/settings and deadline guards remain active through completion. Replacement staging invalidates older unresolved readers.

## Validation

Final command used the existing isolated official Node 22.23.3 absolute executable on macOS arm64, original fake IndexedDB, and these complete owning files in one command:

- browser-native-sync-source-purge-group.test.mjs
- browser-native-sync-source-purge-closure.test.mjs
- browser-native-sync-source-purge.test.mjs
- browser-native-sync-source-purge-multi.test.mjs
- browser-native-sync-group-checkpoint-restore.test.mjs
- browser-native-sync-group-checkpoint-plan.test.mjs
- browser-native-sync-group-checkpoint-audit.test.mjs

Result: **155/155, exit 0, 10930.985709 ms**, no fail/cancel/skip/todo. combined.log and combined.exit are the raw terminal evidence. The new owning file contains 22 actual cases: positive+negative commit and re-export to C; local cleanup/outbox retained through genuine successor; independent local Source retained; owner failure/extra row/post-callback extra row/semantic terminal mismatch all roll back; concurrent capture and Core rebinding reject; live old Source overlap is read-only rejected; old ordinary consumer still refuses; actual cold store reopen followed by original Working note edit retains denial; existing local plus new cold negative re-export; extra protocol/missing denial/wrong frontier/invented generation/unrepresented human row refuse before external get; final settings revocation; stale asynchronous stage; fresh repeated import/full-row idempotence; and mutation during export preventing a stale advertised result. The four injected write-failure controls and settings-revocation test assert the injection actually ran before checking rollback.

All earlier outcomes are retained separately:

- first.log 0/1: detached query mistakenly treated compound array equality as range includes.
- planner-diagnostic.log 0/1: same defect diagnostic; contains only generated SYNTHETIC fixture values, not user data; temporary diagnostic code removed.
- second.log 0/1: detached original semantic invalidator required rangePage.
- third.log 0/1: authority comparison incorrectly used portable JSON equality on physical undefined-bearing facts.
- fourth.log 1/1; expanded.log 11/11.
- safety-expanded.log 9/20, 11 failed: staged original control-view identity became stale across Store.run. Final fence now binds the freshly read activation control view while checking identical staged authority facts.
- safety-corrected.log 20/20. Final combined run added explicit injection and two further cases; it is the final source qualification.

Historical failed runs' shell wrappers printed TAP afterward, so their shell success is not a test exit-code claim. Their TAP failures remain authoritative. Only final combined.exit records the actual final Node exit separately.

## Budgets and remaining work

No original budget is raised: bounded 384 checkpoint items / 128 revisions in the original closure compiler, 4096 raw snapshot rows and object references, 2 MiB measured bounds, 30-second stages, conservative pre-allocation/retained prediction admission, and original repository work limits. This is finite correctness evidence, not a supported-scale or memory peak measurement.

Staging is private in-memory. A crash before commit restarts from immutable checkpoint reads; this package does not add a durable staged namespace or activation receipt. The committed original protocol/denials make a fresh repeated import and later re-export work, and those paths are tested. Whole generic active-library replacement, existing canonical-generation selections in this profile, noninitial Source/Working histories, linked/shared Human or Saved/AI families, all negative-intent families, durable staged recovery and supported-scale qualification remain on the parent continuous queue. The successful post-restore Working edit is genuinely consumed, but this profile intentionally rejects subsequent export of that wider Working history rather than omitting it.

No native browser, Source/Release build, 65/129 scale run, cloud/CI/Full, real provider, real account/data, defaults, deployment or destructive user deletion was executed. Parent schedules native verification at the next combined milestone. No performance or whole-product acceptance claim follows from these 155 local tests.

## Native bridge prepared, not executed

New explicit milestone entry: `extension/tests/native-sync/source-purge-group-native.test.mjs`, Source and Release, 22 original cases each. Its fixture is `source-purge-group-fixture.mjs`, adapted from the parent's already-used selected-negative fixture, and it imports the existing `structural-correction-bridge.mjs` assertion boundary unchanged. Only Node imports/registration, the exact synthetic helper imports, and two constructor occurrences are adapted. All original case bodies and assertions remain. The command accepts only `source-purge-group-matrix`, rejects changed constructor/import boundaries, requires exactly 22 registered cases, and uses the original storage-harness/startNative.

Each original fake factory gets a private native-name map; the second Store in the cold reopen case resolves the SAME actual database. Real `indexedDB.open`, transactions and `indexedDB.databases()` remain in use. Cleanup is restricted to names allocated by this fixture. No shared generation-purge-fixture or root allowlist was edited. The consumer source vector includes new runtime files plus original owners; Source/Release equality and before/after source equality, original native-factory/network isolation and complete unique case counts remain checked. A supplied absolute `PAIA_NATIVE_RELEASE_PATH` lets the parent reuse one coherent build.

Preparation assertions passed (native-preparation.log, exit 0): exact boundaries, retained critical assertion bodies, constructor count, rejection of changed imports/factory/helper boundary. Generated fixture and native entry passed Node syntax checks. `native-prepared.mjs` preserves the generated preparation artifact; it was NOT evaluated and no browser was started. Two new runtime `.js` files are already covered by the original release runtime-directory allowlist; no allowlist broadening is required.


Native preparation correction: the initial bridge enforced the fixed command and registration count but did not compare individual case names. The successor adds an ordered exact 22-name allowlist extracted from the original successful logs, and rejects duplicate, reordered or unknown registration names before executing any case. This is static preparation, not another 155-case run or browser validation.
