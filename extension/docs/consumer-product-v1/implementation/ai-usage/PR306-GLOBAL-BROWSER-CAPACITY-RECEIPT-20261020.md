# Current browser whole-file capacity revision

Status: local routing contracts passed; the new exact-head Full run remains required. No browser result is certified by this receipt.

## Original evidence

The fixed candidate is 2ad37d32d9315382a4c402477e5a134ba5410755 (tree 294bda10a6f337f608de0b46d4d19398af6640eb). Full run 39341955147 completed with a cancelled Browser 8 and failed aggregates. The other nine browser jobs, four unit jobs, Sync, macOS, build and privacy jobs succeeded. The separate supplement 39341949156 passed all 52 source roots (710 tests) and both Source/release native variants (170 tests). These retain their own scope and do not make the cancelled Full successful.

Browser 8 job 118365427703 reported 48 PASS and no leaf FAIL before cancellation near the original 18-minute job limit. The first 11 files completed, the history-preemption file reported only its first leaf, and the final certification file had not reported. The prior same-route Browser 8 job 118347535375 completed all 13 files and 52 leaves. Its remaining history leaf and certification file took completion intervals of 7.506 and 7.623 seconds. The latest original log and prior complete log are retained without rerunning or replacing their outcomes. There is no evidence that the unreported second history leaf hung.

## Whole-file distribution

All ten current logs were compared. Only width 10 changes:

- Archive Year: shard 8 to 2 (observed completion interval 129.147 seconds).
- NIB Settings entry: shard 1 to 7 (69.181 seconds).
- Section writing: shard 5 to 7 (52.775 seconds).
- Reader surfaces: shard 9 to 4 (59.003 seconds).

Saved AI presentation remains on 8. Context, including its native deadline helpers, remains alone on 10. The dedicated Settings Chrome preparation stays on 6, text-size artifact on 5, and Context artifact on 10. All four moved files use the original common Chrome setup and per-job artifact collection.

The planning model uses each latest complete-file completion interval, each observed setup interval, an additional 15-second closeout allowance per job, and twice the prior remaining-tail cost for censored shard 8. These are adjacent completion intervals, not isolated CPU durations or guaranteed upper bounds. Cross-run variation was substantial despite unchanged product runtime. The projected job durations in seconds for shards 1 through 10 are:

981.927, 941.884, 1006.167, 993.566, 979.639, 970.788, 985.941, 1004.948, 1002.293, 945.835.

The narrowest projected margin is about 74 seconds under the unchanged 1080-second limit. This is capacity planning only; a new real Full run must finish.

## Invariants and local checks

The original workflow is unchanged: ten browser jobs, 18 minutes each, concurrency 1, no test filter, skipped-test allowance, continue-on-error, or removed assertion. All 100 current native root files and all other materialized fixtures preserve their exact candidate Git blobs. Historical route fixtures are untouched. The three newly relocated previous-current roots are individually accounted for: the original frozen fixture now has 570 unchanged route observations and six explicitly checked relocations, rather than silently changing its former 573-plus-three census. Archive Year remains one of the four separately admitted roots.

The three original route-contract files executed 7/7 with zero failure, skip or cancellation (406.506158 ms). An independent comparison evaluated 30,000 routes: 100 current roots, widths 1 through 100, and bare/POSIX/Windows paths. Exactly the four listed files changed, only at width 10; all 100 roots occur once in the new ten-way union. All 100 native Git blobs match the exact remote base tree. The 1,846 materialized source/dependency inputs were identical before and after these checks. Installed dependency files are included in the execution inventory but are not represented as Git-tracked repository files.

The public receipt is added after execution and is not counted as an executed input. No product runtime or version changes. Full and the existing supplement on the eventual exact successor head remain required before merge.
