# Negative checkpoints with resolved Prompt history

Baseline: 09edd57b plus exact upstream ed4ee021 (local pick 4565a5d9) and 24fa2e64 (local pick 1f72cc0a). Only the new final commit is needed on root, which already contains those dependencies.

The original paired Prompt replay materializer is prepared outside negative activation and retained across the entire transaction. Its original resolver/deferred algorithm is shared with a separate detached predictor. That predictor is admitted only for the original physical planner private Map scratch identity and exact core/plan/repository/database, with original core data-method checks. There is no caller Boolean or duck-typed transaction exemption. Real activation keeps Repository final fences. Detached prediction explicitly requires its deferred map to be empty before returning any projected physical tree; it never registers a fake Repository fence.

The remaining negative Source scope now calls the existing exact local Memory default-row validator. No memory permissions, profile, arbitrary key prefix, or changed settings become portable.

## Actual verification

- Six related whole Node files: **77/77**, exit 0, no fail/cancel/skip/todo; TAP 18123.098792 ms. `owning-tested-source.mjs` preserves the 13-case new file at that invocation.
- Afterwards one additional deterministic private Map incomplete-pair case was added and run alone: **1/1**, exit 0, TAP 173.158 ms. Do not describe this as a single 78/78 invocation. Runtime source did not change between these runs.
- Both original Google Drive and OneDrive adapters use synthetic HTTP. Actual Settings/worker: A has seven portable intents, surviving Source Working, an independently permanently deleted Source, and an explicit paired manual Prompt conflict resolved through the original token action; NOW → A closes → fresh independent B discovers/restores only cloud objects → cold B edits → NOW → fresh C restores. Original MemoryService.ready on each device leaves its exact local default. Old deleted Source replay is refused with all tables unchanged. New HTTP bodies do not contain deleted Source text.
- Four authority refusals: actual Repository transaction, wrapper forwarding its methods, fabricated Map facade, and cloned plan cannot acquire the private predictor. No table changes.
- Original Repository final fence refuses a deferred pair that never reaches its final companion, rolling back every table. This Node fake-indexeddb path maps the SyncError at finalization to the existing STORAGE_FAILED; production error mapping was not changed.
- Private Map prediction with the same unfinished pair refuses BNS_OWNER_CHANGED before returning a tree. Six altered/default-profile Memory cases refuse before cloud writes, preserving every table and local control.

## Retained failures

`before.log`: 0/2 paired full consumers failed BNS_HUMAN_RETENTION_REQUIRED with the old prediction calling the native fence. `second.log`: fixed paired 2/2 without Memory initialization. `memory-before.log`: 0/2 BNS_GROUP_CANONICAL_UNREPRESENTED; `memory-after.log`: exact helper gives 2/2. `guards.log`: 6/13; one test expected the inner error instead of original Repository STORAGE_FAILED, six fixtures had not used original FILTER_MODE off before Source purge. These are test prerequisites/expectation corrections; guards were not weakened. `guards-corrected.log`: 11/11 selected guard cases.

No native browser, build, network, cloud CI, large seed, 65/129 recovery or paid API was run. This is not whole-archive certification. Budgets remain 4096 references / 2 MiB / 30 seconds. Unsupported negative Human/Context combinations and prior Working history on deleted Source remain rejected. Previous 291/291 evidence is reused, not rerun.
