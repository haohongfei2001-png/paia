# Phased canonical coverage: frozen-generation design and prerequisite

Status: design, not implemented; exact inspected base `3d6e8cd4a59ea63b847fd84e1c4842934f4fde55`. Root has integrated the cold runtime predecessor as `3be3a14b`. This document does not certify 65 or 129 groups. No additional scale, browser or build execution was performed to write it.

## Current evidence and required invariant

The corrected consumer retains a final native point read for every expected physical row and complete store counts, including all original semantic known/dirty/sequence/human-fence metadata. The 65-group path completes all original owners but refuses final publication under the unchanged limits; 129 refuses earlier. The preserved four raw semantic mutations that originally committed are now rejected. The old prefix-exempt 65 success is superseded.

The cold successor rebuilds the private expectation from original pre-write state and the complete authenticated graph, verifies the durable applied prefix, and resumes the same task ledger. Its actual two-group continuation includes close/reopen of the original target and registry, another original owner step, publication, exact cold reads and a subsequent original `editEntry`. It is not a 65/129 result.

The unchanged invariant is stronger than “every page was once valid”: every row consumed by publication must still match its original authorized expected value at the publication linearization point. Extra rows, same-count substitution, absent expected rows, semantic mutations, old-source drift and receipt drift must all prevent publication. A page cache is not this proof.

## Exact present write coverage

| Path | Current gate settlement | Consequence |
| --- | --- | --- |
| Original checkpoint and protection installation | Exact writeRevision + 1 | Covers this participant's committed write only |
| Bound active Library original owner | Exact writeRevision + 1, generation system rows protected | Available only after real registry publication; not shadow application |
| Human, phased Human, original group apply | Gate must remain byte-identical | Their canonical writes do not currently advance a global mutation version |
| Group staging and checkpoint-copy retirement | Gate unchanged | Changes to their allowed metadata are not represented by writeRevision |
| Publication fixed owner | Exact original gate/qualification closure | Does not provide a general revision for arbitrary target mutations |
| Direct native IndexedDB transaction/objectStore request | Outside repository admission | No automatic gate revision; current final row/count checks detect relevant late corruption |

`ArchiveRepository.db` and transaction scopes' native transaction are currently accessible. Repository admission uses original private brands and fixed consumers, which prevents arbitrary caller DTOs from minting the repository writer. It is not a native IndexedDB security sandbox. An instrumentation hook can alter a row through a genuine native object store without calling repository `put` and without changing the gate. The existing negative controls intentionally exercise that path.

## A version-only final seal is currently insufficient

A concrete invalid execution is:

1. Verify physical page P against the original graph, retain its digest and version V.
2. Verify later page Q in another transaction.
3. A native request changes a row in P, preserving counts and V.
4. A small final transaction verifies V plus the page receipts and seals.

P is now wrong even though every checked certificate agrees. Changing the order, adding an in-process mutex, using a private WeakMap or closing the particular reader connection does not eliminate other native connections or the same-transaction raw hook. A transaction spanning all pages would restore native isolation, but its work remains one physical transaction and cannot restart the 4096-reference / 2 MiB / 30-second budget between pages.

Therefore this design does not replace the current full final read with version-only coverage. Doing so would drop an existing tested guarantee. The prerequisite is engineering work, not a missing user authorization or a reason to run 129 repeatedly.

## Safe immediate work decomposition

### 1. Reduce repeated preparation; retain final native closure

Prepare immutable logical topology once through the original complete compiler. Reuse that private computation only for calculation. Each original Human step must still read and fence its exact current allocation/control/namespace/head/receipt dependencies and compute output through the original owner. The durable task sourceBase and ledger stay unchanged.

A fixed incremental expectation witness can replace repeatedly enumerating all already-applied groups when the current step actually depends only on original allocation counters plus exact heads. It must retain the original all-group duplicate, parent, frontier and mapping checks from the complete compiler. It cannot accept caller-supplied current state, a changed Source baseline or an uncommitted synthetic Core base. The current `prepareHumanIncrementalProtocols` accepts a complete already-committed brand and a different namespace contract; it must not simply be passed an unfinished shadow graph.

Success criterion: one small original-owner profile demonstrates the same output and rollback under late counter/head/control changes with a smaller measured per-step read set. Only after that change is frozen is a single meaningful 65/129 correctness check justified. Final physical row/count proof remains intact.

### 2. Remove redundant copies only through an exact original owner

Root owns checkpoint-copy retirement. No cleanup is implemented by this design. A future prepublication consumption mode is distinct from the existing after-publication retirement and requires its own proof: original authenticated immutable page, complete compiled graph membership, committed original owner receipt, exact task identity/sourceBase and a durable consumed-page record. It must delete only the exact old item/page keys in a bounded atomic transaction and leave a body-free receipt. Failure cannot erase the sole durable recovery information needed to derive expected canonical/protocol rows.

Cold rehydration must be redesigned before accepting a consumed page: it must reacquire and authenticate the same immutable manifest/page through the original codec, charge transport and decoding to the existing task, and verify the exact original application receipts. A digest or caller-supplied page is not sufficient. Unavailable immutable data means safe interruption, not invented authority. This is not permission to drop final checks over remaining canonical/protocol rows.

This can reduce duplicated final reads but is not evidence that 129 fits; protocol and canonical copies may still exceed the native ceiling. No capacity claim follows from static file counts.

## Conditional frozen coverage interface

The following interface is only implementable after the write-coverage prerequisite below. No exported generic callback or arbitrary expected-row DTO is proposed.

- `freezeOriginalPhasedGeneration(restore, proof)`: fixed original consumer, same native transaction as exact task/gate/sourceBase checks; requires all owners applied and no pending owner ticket. Writes a new exact freeze record with taskId, generation identity, manifestId, graph digest, sourceBase, owner cursor, a unique freeze identity and complete mutation version. Subsequent canonical/protocol/stage-copy writes are refused. Ledger and coverage records have separate exact fixed owners and cannot alter covered state.
- `verifyOriginalFrozenPage(restore, proof, pageOrdinal)`: deterministic bounded physical key interval, original compiler-derived expected rows, all actual keys and values, interval negative space, real current freeze identity and version. A body-free durable receipt binds interval boundaries, expected/actual count, digest, store, predecessor chain and full task identity. Empty intervals and the final tail are explicitly covered. Hashing and reads spend a prepaid ticket; no duplicate refund.
- `resumeOriginalFrozenVerification(...)`: reads the durable freeze, complete task and receipt chain; re-authenticates the same original graph with its budget, rejects reset identities and burns unresolved reservations. An unexplained version change invalidates all coverage; it does not refresh the sourceBase or silently restart the budget.
- `sealOriginalFrozenGeneration(restore, proof)`: one small transaction validates the original fixed consumer, complete ordered per-store coverage with no gap/overlap/extra receipt, total store counts, same freeze identity/version, original permission/source/deny facts, exact remaining task ticket and original publication intent. It atomically writes qualification, task terminal state and sealed gate. Publication still uses the existing recoverable registry protocol; no cross-database atomicity claim.

All supported consumers must enumerate a closed mutation inventory. Human application, protocol receive, derived navigation/semantic finalizers, backup counters, stage changes, fixed publication and cleanup must either increment the appropriate covered revision atomically or be refused after freezing. A version increase cannot be omitted merely because the write is “derived”. Body-free accounting may be outside the covered data version only with exact key/schema authority and exact final accounting checks; not a prefix exemption.

## Prerequisite to preserve raw late-mutation guarantees

Repository revision coverage alone is insufficient. At minimum the protected execution boundary must stop exposing the actual native connection/transaction/object store to arbitrary application callbacks, capture original backend operations, and ensure each permitted mutation crosses the same private version owner. This affects `idb-repository.js`, original owner methods that use `t.tx`, real backend/fault test adapters, and fixed generation consumers. It is wider than a new gate phase. The application still shares an origin with code able to call native `indexedDB.open`; hiding a JavaScript property does not itself prevent that code from opening the same named database.

Two honest outcomes are possible:

1. Keep support for arbitrary raw mutation as a corruption model. Preserve final full native reads; optimize duplicate storage and original owner work until a specific inventory fits. If it cannot fit, report the exact unsatisfied physical proof size. Do not claim a version certificate detects raw corruption.
2. Introduce a genuinely isolated immutable canonical representation and its original read/write owner, where raw mutable storage is not the truth consulted by the final certificate. This requires a separate storage/factory architecture and native qualification, including cold recovery and compatibility. It is not achieved by renaming the current mutable database or wrapping only repository methods. Its integrity and read semantics must be demonstrated before enabling the small final seal.

The existing mutable representation cannot honestly offer both bounded version-only final verification and detection of arbitrary unversioned raw changes to every previously checked row. This document therefore recommends option 1 for the immediate slice and retains option 2 as a separate architecture proposal if representation size remains the limiting factor.

## Required controls before any future coverage implementation is accepted

- Original owner changes an early verified row before the last page: rejected or exact version invalidation, never accepted stale proof.
- Raw same-count replacement, raw late sequence/known/dirty/extra metadata, and late receipt mutation: keep existing rollback expectations; do not delete or relabel them as passing unsupported tests.
- Cold reopen after freeze, after a page receipt commit, and after lost settlement: same identity/sourceBase, no refunded spent ticket, no duplicate page acceptance.
- Fake, overlapping, missing, reordered or foreign-generation coverage receipt; extra row before/after final key; missing expected row: rejected.
- Task/controller/permission/Source deny drift after verification: publication remains absent and old active unchanged.
- Successful consumer: real sealed gate and registry committed receipt, cold exact canonical read, then a real original owner edit through explicit active binding.
- All physical transactions retain 4096 references / 2 MiB / 30 seconds. Data work retains 16 MiB / 120 active seconds with ≤4096 tickets; separate bounded control work is reported. A new process cannot reset either durable task accounting or immutable graph identity.

## File ownership and rollout

Root retains publication/gate cleanup and phased copy retirement. This design makes no shared runtime edits. A future incremental Human expectation implementation belongs in the fixed Human plan/group/phased consumer, with exact patches coordinated for shared original owners. A freeze/schema change requires explicit coordination with publication and repository owners before coding. The default application factory, Sync pause and real account/deployment boundaries remain unchanged.
