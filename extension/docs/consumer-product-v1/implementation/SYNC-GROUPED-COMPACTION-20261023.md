# Grouped Sync compaction qualification — 2026-10-23

This package extends the existing read-only compaction planner to the existing grouped restore owner. It does not add production deletion, remote execution, credentials, OAuth, or automatic Sync activation.

## Implementation

The old planner expects staged Core receipts, while grouped restore deliberately stores its validated revision graph instead. Missing Core receipt rows must not be mistaken for empty coverage. The planner now reconstructs that graph through the original `validateGroupedCheckpointGraph` compiler and checks its recorded graph digest before deriving operation receipts, heads and frontiers. It binds the grouped store, stage and live repository/dataset; preserves the original 384 item / 128 operation compiler envelope and a 2 MiB staged-item read bound.

Both retained generations must remain validated or activated, and the later cut must preserve every earlier receipt digest. Existing manifest/object closure verification, two-generation retention, active pins, uncovered-tail protection, purge retention and unknown-pin refusal remain in force. Plain protocol checkpoints retain their original path.

The final remote manifest reads occur before the last local graph/state checks. A real `reconcileTail` during the last remote read invalidates the plan. The returned result is still a point-in-time eligibility snapshot with `performedDeletion:false`; it is not an atomic production deletion lease. No claim of cross-repository locking or physical erasure is made.

## Verification

All data is synthetic. The test uses the real Foundation store, Source bootstrap journal, Input Working journal, grouped checkpoint builder and staged restore owner with fake IndexedDB and an in-memory object transport.

- Close sender A, actually remove covered descriptor/segment objects from the test Map, retain both checkpoint closures and an uncovered later tail, then cold-restore B from the retained checkpoint.
- Reject an older checkpoint activation into populated B without changing its current data. Continue a real Working edit on B, build its successor and restore that state on independent C.
- Preserve the full closure of an active restore pin.
- Interrupt test-only deletion after one object: independently restore both retained generations and read the uncovered tail after partial collection. This proves recovery survives partial collection, not resumable production GC.
- Reject changed retained state during ordinary remote reads and specifically during the final current-manifest read; both cases use original grouped `reconcileTail` and preserve all transport objects.
- Reject missing staged revision items instead of treating missing receipts as covered.

Initial combined original compaction + new grouped tests: 16/16, exit 0, 1855.084667 ms (`group-compaction-first.log`).

Final one combined invocation of original compaction, original grouped checkpoint restore, and new grouped compaction files: **37/37**, exit 0, no failure/cancel/skip/todo, **6644.744042 ms** (`group-compaction-owning.log`). Runtime: official isolated Node 22.23.3, macOS arm64, Python 3.12.14 supplied explicitly. No browser, build, network, cloud, large seed or paid call was performed.

## Scope still outstanding

This package proves grouped Source + Working graph compaction using the existing small bounded corpus. The original protocol compaction tests retain their purge/stale-replay checks; this does not newly qualify grouped cross-domain purge or all negative-intent owners. Linked Thoughts/provenance, complete multi-Source canonical coverage, general populated-destination merging, compaction across rewritten/omitted historical revisions, scale beyond the current compiler envelope, provider/live-account qualification and production deletion remain separate work. The Settings surface remains unavailable by default; this planner adds no public delete capability.
