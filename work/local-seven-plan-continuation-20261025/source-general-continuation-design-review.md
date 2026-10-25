# Mixed Source/Working continuation design review

Read-only review of `source-general-continuation-next-scope.md`, original `InputWorkingSyncJournal.prepareEdit`, group dependency preparation, `planInputRevision`, and publication physical-cut caller. No runtime edits or tests. Root authorized only the continuation reducer and narrow original group-checkpoint caller difference.

No design-level blocker found. This is not source approval of an implementation that has not yet frozen.

Required implementation invariants:

1. Use one actual local descriptor chronology and original global counters. Source bootstrap/append increment history and delta; Working increments delta/epoch, and history only when the original planner allocates. A→Source→A must retain A's coalesced history identity even when the global counter advanced.
2. A newly captured Input's first `inputWorkingMember` parent is empty, as the original writer has no head for that typed Working member. Source members are a different type. Original `createdInputs` dependency and the reducer's already-seeded Input must prove the Source event came first; do not fabricate a cross-family parent edge.
3. Seed retained Inputs only from authenticated original bootstrap and original cut. New Inputs derive baseline/filter/allocation from the authenticated Source group plus original planners, never from their final rows. Preserve original Source document anchor dependency for append and distinct document allocation behavior.
4. The new filter baseline must be shared by the caller's cut projection and final reducer proof or be bound to identical original inputs. A missing baseline is refusal; final filter rows cannot supply their own before-proof. Existing exact Working filter checks remain.
5. Complete final physical/protocol/canonical comparison must cover untouched Inputs, Source counts/indexes/documents, history allocations and metadata; require exact event and receipt cardinality. Removing the recursive Source-only pass is safe only if every one of its comparisons remains represented in the single complete expectation.
6. Keep the same accumulated original work ticket and original operation limits; no new group-count whitelist, extra continuation budget, relaxed source ancestry or global activation capability.

Frozen source review will check these real caller/callee paths and compare new positive/negative evidence separately. Existing tests are not to be rerun by the reviewer.
