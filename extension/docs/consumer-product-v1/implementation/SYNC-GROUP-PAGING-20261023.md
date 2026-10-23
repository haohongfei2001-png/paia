# Sync bounded grouped paging — 2026-10-23

## Result and remaining boundary

This is a consumed finite paging increment, not completion of SYNC01 §3.2 or large-owner recovery. The final six owning files pass **83/83** on Node 22.23.3 / macOS arm64 using the original fake IndexedDB. No native browser, remote provider, large seed, CI or Full was run.

A real original Prompt service creates **129 retained operations** for **one canonical Prompt row**. The sender closes; original grouped stage validates two complete generations; compaction plans covered segment collection, the test deletes only in its in-memory object map, and original cold receiver activation recovers the exact latest Prompt. The immutable checkpoints remain. This does not claim 129 physical canonical owner rows or production deletion authority. Compaction remains a qualification snapshot, not an atomic remote deletion lease.

The first 129 original Human Entry attempt created 129 Entry + 129 history rows and 387 complete protocol operations. Before enforcement it restored, but the entire activate invocation measured 12,617 reads / 4,391 writes, so this is retained as **disqualified evidence**, not an accepted budget result. With the final encoded + decoded + yielded-item 2 MiB staging work envelope, that graph refuses during staging without canonical publication. A separate 65 Entry / 195-operation graph fits staging, then exceeds the original transaction's enforced work envelope: every table, active pointer, and validated stage remain unchanged. No history or assertions were deleted and no resource limit was raised to make either case succeed.

## Implementation

- New original paged reader uses 64-row pages, exact monotonic primary keys/prefix and cursor validation, and a shared 4096-reference / 2 MiB / 30-second work ticket. It is a meter, never read/write authority. Physical IDB values preserve own undefined/signed zero through the existing physical-tree meter; portable operation encoding remains strict.
- Generic graphs larger than 128 use the paged compiler and explicit ownerScope version 2 / `paged-admitted-local-owners`. Version 1 small graph semantics and the original single commit-group 128 limit remain. The original small-array compiler's 4 MiB envelope remains tested; the new paged path is 2 MiB. Private currentSourceWorking/currentMixed profiles retain their original restrictions and constructors.
- Core Human restore preparation accepts complete paged graphs but still validates every original group through its existing 128-bounded named owner. Receipt, sequence, ancestry, coverage and scope verification are unchanged.
- Ordinary canonical and Human scope table reads use bounded pages. Canonical metadata inspection keeps two exact key ranges around the selected authenticated Core's `bns:v1:<dataset>:` protocol prefix, whose graph is separately verified. That namespace is not accepted by `backupMetaAllowed`. All canonical metadata and other namespaces remain checked; negative tests on both sides reject unrepresented owner metadata. Private native scope paths are unchanged.
- Version-2 checkpoint traversal meters cumulative received encoded bytes, decoded bytes and yielded item operands, including repeated work, with bounded graph references. This is a processing ledger, not a host allocation/heap claim. Compaction reuses the original compiler and adds bounded staged item reads and cumulative received-object accounting; remote final reads still precede the final local proof recheck.
- `registerRepositoryWorkLimit(repository, scope, {references, bytes, ms})` registers an optional private original-scope envelope. Defaults and maxima are 4096 references / 2 MiB / 30 seconds; overrides may only lower them. Re-registration tightens without resetting elapsed time or consumption. Caller must register at the beginning of the original write callback. Generic version-2 activation does so; unregistered existing paths retain their prior behavior.
- Original repository methods charge each scalar request, each cursor result and key probe, physical write operands/read results, and finalizer/terminal reads. Unbounded `all` and `clear` refuse when registered; bounded keys use an incremental original key cursor. Mutable public metrics, borrowed scope objects and catching an error cannot bypass the private rollback state. Original native identity and methods remain the authority; no transaction wrapper or new writer is substituted.
- The timer requests abort only while that native transaction is still active. Deadline checks also run at request/result/finalizer boundaries. This does **not** claim cancellation of an arbitrary never-returning external callback after IDB has already naturally completed; consuming owners must keep the original IDB-only transaction discipline.

## Validation evidence

Raw logs and exact post-run source vector: `work/sync-group-paging-20261023/`, indexed by `SHA256SUMS`.

| Evidence | Actual result / meaning |
| --- | --- |
| baseline.tap | 0/1: original allOperations cap refused the 129-Entry consumer |
| page-reader.tap | 7/7: bounded real repository pages and forged cursor/size/deadline refusals |
| owning-before-root.tap | 8/20: initial physical-vs-wire meter and old budget assumptions exposed; preserved |
| owning-physical-corrected.tap | 20/20 after exact physical metering and legacy small-array compatibility correction |
| consumer-first-wired.tap | 7/8: an inserted check used the wrong method scope; exact correction followed |
| consumer-second-wired.tap | 8/8 but 129 Human activation exceeded budget; explicitly disqualified |
| prompt129-private-budget.tap | 0/1: original exact-key publication lookup needed finite incremental keys support |
| paging-private-budget.tap | 14/14 before final traversal accounting and complete metadata-key charging |
| final-owning.tap | 77/80: one stale staging assertion and two test-continuation cancellations; retained |
| final-owning-corrected.tap | 81/81 before final metadata-key accounting refinement |
| keys-budget-final.tap | 9/10: full private protocol metadata key scan exceeded references; preserved |
| private-canonical-ranges.tap | 10/10 after exact canonical key ranges, including atomic rejection |
| final-paged-consumers.tap | **83/83**, 9294.718458 ms, final six complete owning files |

The Prompt transaction callback's public diagnostic counters remain 2503 reads / 1163 writes. These omit key probes/counts and finalizer work and are not the safety boundary; the private envelope independently covers those operations. Negative cases include public metrics mutation, repeat registration, borrowed scope, byte overflow, cursor references, terminal-tail overflow, deadline refusal, version/profile admission and canonical metadata omissions. Native runtime work, cross-platform timing and real provider compatibility are not established by these synthetic checks.

## Next architecture work

The 129-physical-owner recovery requirement remains blocked by the single canonical activation transaction under the existing work budget. It needs a genuine bounded staging/publication design that preserves all original owner invariants, complete causal history, negative intent, current-target conflict handling and atomic visibility. Do not divide or partially publish canonical content, raise budgets, or relabel the one-row Prompt case as large-owner completion.
