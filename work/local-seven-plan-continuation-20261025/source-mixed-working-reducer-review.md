# Mixed Source/Working reducer review

Read-only review of source-mixed-working, base 4d39d7ff01e9efc334991eb590bedc1b34914136. Runtime reviewed at SHA256 a004288b6e63cae01d40af831f56b37e96871337fbfbe84ceafe9f551e9f3bf7; group-checkpoint caller a7a1010e6856c70dbd02421bf60ec7062f22e873db55b744d6cc6500cab20cf3. The actual matrix's four source hashes match current bytes. No test execution or runtime edit by reviewer.

## Source conclusion

No new static correctness blocker found after root's pre-execution document-allocation correction. Original record/block/document allocation is zero-based postincrement; retained allocations now match the original base.documents + document count convention. That correction is present in the actual matrix source.

The original group authentication still selects the whole retained bootstrap cut and globally contiguous local descriptor sequence. The unified mixed branch seeds each original Input, then processes every added group in order. Source bootstrap/append advance common revision/delta allocations and create the exact new Input baseline; append preserves the original document anchor/allocation. Working reads only a previously seeded Input, retains fixed Source identity and references, compares typed previous-parent chains and reconstructs complete history through the original planner using the shared global revision counter. First Working typed parents remain empty, because Source is a different operation family; the original group dependency and seeded chronology independently prove Source precedence.

initialFilters derives only from authenticated Source groups and the original initial-filter planner, is charged once and is shared with the caller's cut projection. Retained originalCut is preferred; there is no current edited-row fallback. Final comparison checks the actual Source group state/allocation, reconstructed whole cut and original exact Working filter, preventing the provisional baseline from becoming self-certifying.

Removing the recursive Source-only proof preserves its substantive comparisons: every expected recordIndex, blockIndex, sourceCounts and complete document row is rebuilt and compared; untouched Input states/allocations/filters and all metadata remain in the expected cut. Canonical and protocol full-cut validation remain in the original caller. Invalidation/receipt cardinality and event Input/content/global sequence remain exact. No new authority, namespace, per-family budget or count gate is added. Pure Source keeps its prior branch.

## Actual evidence and incomplete result

Read original matrix.log and matrix-result.json: 15/16, exit 1, no cancelled/skipped/todo; TAP 10096.798125 ms, wall 10176.38816597173 ms, source unchanged. The four positives append→edit, retained-edit→append→new-edit, interleaved coalescing and interleaved allocated history all execute actual original publication, fresh synthetic recovery and cold reopen with exact portable bodies/history/time/filter/document assertions.

The fifth new-bootstrap→edit→append→edit case fails BNS_CHECKPOINT_PUBLICATION_LIMIT in requireSourceUnionPublicationCut during publish. Prepare completed; fresh/cold recovery was not reached. The diagnostic syntheticWrites=11 is cumulative from this fixture's original seed/head construction, not an isolated count of writes by the failing publish. Without a before-counter snapshot, do not classify that invocation's exact transport delta from this number. This case is not delivered and must not be changed into an expected-LIMIT positive or silently skipped to make a green aggregate.

All eleven negatives passed their exact failure and unchanged-full-table/no-new-write assertions. The two former unsupported-shape checks were replaced with actual immutable Source mismatch and global delta mismatch; their original source is retained. New source-anchor and typed-parent mutations intentionally have stale digests and prove original operation integrity rejection, not a recomputed-digest graph semantic negative. This limitation must remain explicit. Other causal/cut checks are verified from code, not falsely attributed to those digest negatives.

The algorithm may be retained as an incomplete local successor, but the general continuation package is not complete or ready to claim product acceptance while its fifth positive fails. Root owns archive/integration disposition. No repeat of the failing positive, scale change, quota increase or reduced full-cut comparison is recommended by this review. Final commit/manifest binding can be appended once the implementer freezes the archive.

## Final held archive binding

Final commit `7eabab1259b935ac8908185f5ceceabf2b779f5d`, parent `4d39d7ff01e9efc334991eb590bedc1b34914136`, clean worktree. Twenty evidence checksum entries independently verified; manifest SHA256 `3e5892126dce542c08e788a79d0a6f9dc395ec096eae1129ae13f7e2f5d25ca3`. Four source/test paths and twenty-one evidence paths. Root selected whole-package HELD, not integrated. The failed fifth positive remains unchanged in its test source, not rewritten as a successful refusal. No subsequent execution.
