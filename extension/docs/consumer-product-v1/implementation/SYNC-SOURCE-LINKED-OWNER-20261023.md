# Source-linked named owner prerequisite — 2026-10-23

This is the first implementation subpackage of the authorized single-Source, user-derived Thought creation/edit and cold grouped recovery work. It is **not complete C acceptance or grouped/wire admission**. Default journal/codec/Settings activation remain unchanged and refuse unsupported Source-linked work. No provider, account, credential, network, browser, build, large seed or cloud execution occurs here.

## Completed implementation

`prepareHumanSourceEntryPlan` and `prepareHumanSourceEntryEditPlan` are explicit private-plan constructors for one primary evidence edge, one Source, a user-authored explicit Thought with its own body, and no Topic placement. Existing independent Human planners retain their original selection.

The original writer's provenance/dependency construction is extracted as `planHumanEntryEvidence`. The actual writer calls that same computation and consumes its provenance UUID through the existing request-local allocator; when no plan is installed, the original `store.uuid()` fallback remains. No second writer or virtual repository is introduced.

The plan captures actual original evidence and its exact provenance/dependency pair, reserves original owner allocations, and rechecks Source availability/version and original rows in the same committing transaction. Its finish check compares the actual entry, source-linked history, provenance and dependency rows against the named plan. Edit retains original provenance/dependency, manual protection, journal semantics and local physical allocations. Missing/stale Source or a malformed retained dependency refuses without additional writes. Reads of the one-edge pair are bounded to two rows, with any non-single result rejected.

`source-linked-evidence.js` explicitly represents the public input ID/revision, selected field digests, primary role, Source IDs and immutable Source identity hashes. Installation-keyed scope/version tokens and local epoch are absent. The destination runs the original `store.evidenceFor` and compares the full public edge before returning destination-local evidence. A typed pair descriptor carries original provenance/generation/entry identities and timestamp for the next graph integration. Its schema validation is data validation only, not mutation authority.

## Actual validation

All fixtures use isolated fake IndexedDB and synthetic values with the original LibraryDocumentsStore, Core and owners, official isolated Node 22.23.3 and explicit Python 3.12.14 on macOS.

- Original named create/edit consumes exact provenance/dependency/history, with manual protections retained.
- Working Source changes after prepare reject create; stale Source and altered retained dependency reject edit, leaving all tables unchanged.
- A post-owner failure inside the original transaction is confirmed to occur after owner execution and rolls back the entry, provenance, dependency, history and other tables. The original repository returns `STORAGE_FAILED`.
- Original Source bootstrap is received into independent B. Portable evidence matches exactly while B's keyed tokens differ from A. Original allocation replay constructs the same entry/provenance identities through B's original named writer. Extra sender-local tokens and altered field digests reject without writes. This is a component receiving test, not a grouped checkpoint restore claim.

Evidence is deliberately separated:

| Log | Result | Scope |
| --- | --- | --- |
| source-linked-owner-first.log | 0/1 | Initial module-load failure: changing original hoisted exports to const triggered the existing import cycle; restored function declarations |
| source-linked-owner-corrected.log | 2/4 | Two test expectation mistakes: primary-key history order vs sequence order and original STORAGE_FAILED mapping; raw failures retained |
| source-linked-owner-owning.log | 69/69, 5107.118875 ms | New owner plus original allocation, Human journal/group and Thought M1 |
| source-linked-owner-portable.log | 6/6, 380.062625 ms | Added independent B portable evidence and real receiver |
| source-linked-owner-final.log | 94/94, 6631.926916 ms | Above owners plus original Source bootstrap; before final bounded pair read change |
| source-linked-owner-bounded.log | 6/6, 313.968125 ms | Exact bounded pair read followup |
| source-linked-original-edit-oracle.log | 11/11, 802.558375 ms | Original frozen edit computation oracle and owner seams |
| source-linked-owner-descriptor.log | 6/6, 289.250708 ms | Final typed descriptor and forbidden-local-field assertion |

Successful invocations exited 0 with no failure/cancel/skip/todo. Independent source review found no blocker within this finite subpackage. No previous failure is relabeled as a pass.

## Immediate remaining implementation

The next dependent slice must carry linked Human member/request semantics through original Core validation, stage Source before dependent Human operations, compile each original named owner against the correct future source/history cut, localize private tokens, include exact provenance/dependency in the final Scope, and retain same-transaction activation rollback. Default wire admission must remain closed until these consumers and their cold-B/stale-source tests pass together. Existing independent Human/Source/Working assertions remain required. Saved/adopted AI work, multiple Source closure, general nonempty merge, cross-domain negative intent/purge and integrated supported-scale qualification remain in the complete C queue.
