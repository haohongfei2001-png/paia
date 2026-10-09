# Private first Human sibling retention — local candidate

**Not independently approved. No production registration, release, public ACK, native retention execution or full recovery claim.** Root approved implementing only the finite design direction in `SYNC_HUMAN_SIBLING_RETENTION_NEXT_20261009.md`, SHA256 `8e5dea2cf3b689f829de7868ba6e62a65f80ff516de9ae09061e58a1693db40e`. This receipt does not expand that authority.

Base `9993c8d56a2dd5e2ed08195ea31af941db422d84`; initial code `eb5d5813ce57c4e32f097d28d51b56de0b97590f`, final code `650d9ec24e811cdaef8d9687a29b11a7c22f49ac`, tree `0c7385bea6213b26e03560f8f04a96795f35b90d`. Only existing Core/plan/journal and one NEW owning test changed. Root still owns version/CI/integration. The inherited 0.41 version is not a new version assignment or deliverable from this branch.

## Implemented private seam

The original current-owner receiver remains unchanged and rejects overlapping parents. New explicit `HumanLibrarySyncJournal.retainSibling` first tries a complete durable duplicate proof, otherwise uses the original semantic witness and a new retention preparation. It is not registered in worker, UI, adapters or default constructors.

The original `branchRaw` transaction body is factored into a private `branchRawInTransaction`; original readonly capture/revalidation keep their original wrapper, guards and outcomes. The same actual base/read/accepted-closure/mapping/receipt comparison now executes inside the final Core-owned write transaction. There is no historical database, caller-supplied read adapter, replacement reducer, current-CAS override or nested readonly transaction presented as a write fence.

All three handle types use the existing per-store registry/WeakMap, combined maximum8 live handles, the original4MiB raw-cut bound,8MiB aggregate retained-plus-fresh-buffer budget and one in-flight slot. Conversion consumes the semantic handle; the new retention cannot be minted again from it. Retention and duplicate plans participate in ordinary oldest eviction and byte accounting. Execution keeps the claimed handle accounted until final cleanup; success, stale failure and transaction failure revoke it. New final raw buffers are compared against the complete private captured data; no body-bearing projection is exposed.

Core's private transaction entry captures the original repository transaction function at construction. Overriding public `core.transaction` cannot substitute a transaction DTO. Before the named validator reads, Core installs a private marker bound to the exact Core, repository, database, actual transaction, readwrite mode, namespace, consumed handle and immutable complete-group identity. The validator requires that marker. Only after validation does the marker enter its application phase, limited to the exact immutable operation objects. Both phases are cleared in `finally`. Lifetime cleanup additionally requires the exact active claim object held inside Core; a caller with only the public opaque handle cannot release in-flight byte accounting or the busy slot early. The matching cleanup identity is covered by a forged-cleanup refusal plus continued-busy assertion. A structural DTO, a genuine unrelated transaction, forged/clone/consumed capability or foreign binding cannot authorize retention.

The new path calls the original Core graph application with `origin:remote` and `materialize:false`, under that separate capability. It keeps whole immutable members and descriptor, computes original incomparable heads, records original operation/sequence/frontier/generation state and emits no outbox. It does not call a canonical domain writer, consume local domain counters, overwrite an existing `humanMapping`, append a domain operation receipt or edit a canonical history row.

Fresh admission and duplicate-only preparation both restrict the immutable group to a standalone active user-created body-only Entry with no Source/Input/Topic/membership/dependency or indexed allocation. The duplicate proof verifies every member and descriptor's exact receipt, operation, sequence and entity linkage. Partial receipt state is a collision, never repairable insertion authority. The duplicate result says only `{state:'duplicate', materialization:'not-reapplied'}`; existing generic receipts do not prove whether the first acceptance applied or retained it.

Fresh durable success returns the body-free private status `{state:'retained-conflict'}` after actual transaction completion. A late control loss after durable commit rejects the caller's result; exact duplicate reconciliation discovers that completed outcome. No public/provider acknowledgement or `applied` status is added.

## Exact local evidence

Executed before the code commit on the exact committed bytes, using Node v26.8.2 and synthetic original domain/Core instances with the existing fake IndexedDB implementation. These are meaningful original-owner unit/transaction tests, **not native browser evidence**.

| Evidence | Actual outcome | SHA256 |
|---|---|---|
| `/tmp/human-retention-lifetime-final.log` | Eight complete files,52/52 PASS,12994.416792ms; zero skipped/cancelled | `36d4518808ac51781409415748681a27a97ead10a3011b9725ec7c2e68a713ce` |
| `/tmp/human-retention-lifetime-import.log` | Actual source and built-release module imports PASS; no TDZ; standard436-file build,13880 emitted-package guards/412 runtime resources PASS | `1913240910c4b4866e083b0f1d8a443a2909c1a3dd08842dcf67350977c1d4d3` |
| `/tmp/human-retention-lifetime-package.log` | Source package/privacy guard13944/416 PASS | `02fbbc05ef8524a97691eaa7a9b830e261d6345347bbafeb43d8a4869e8dc485` |

The52-case run contains the NEW12 owning cases and original whole semantic witness14, Human journal10, grouped recovery3, allocation portability4, edit-owner seams4, derived refusal2 and indexed journal3. The original runtime functions and existing test files remain as recorded in the diff; original receiver/local-owner behavior is exercised rather than reconstructed in a test reducer.

NEW cases prove first complete retention and exact zero-write duplicate; semantic consumption/clones and fake transaction refusal; stale body/protection/control/namespace; transaction rollback after actual original IDB revision/receipt/frontier put attempts; completed-transaction late control loss and duplicate recovery; partial durable receipt refusal; combined semantic/retention/duplicate eight-handle eviction; actual original bound edit refusal with unrelated Entry progress; both-device identical complete Core graphs while each canonical projection stays unchanged; all six original semantic scenarios without domain counter allocation; genuine unrelated transaction refusal and captured repository entry despite public-method override; and an already accepted placed-body edit refused by the narrower duplicate-only path.

The convergence test also exercises actual `prepareGroupCheckpointPlan` against the retained complete graph: its original multihead `BNS_CONFLICT_REQUIRES_RESOLUTION` is preserved with every store unchanged. No last-row scope compilation, implicit resolution or false checkpoint success is introduced.

All three built runtime files were independently byte-compared with the frozen source after the build. Module import evidence is actual Node source/build loading; it is not a claim that the browser has executed this new retention branch.

## Frozen runtime/test hashes

- `core/browser-native-sync/core.js`: `e879f55432019ed0867ba582b2f464a5a00bcdb335fc841df00b6d5e59d96507`
- `core/browser-native-sync/human-library-plan.js`: `b387c4382712721b5309eff992d89ccf2ac96ba61f67e4ec4ef2b702ef55ea00`
- `core/browser-native-sync/human-library-journal.js`: `a628fc6147356d1a375f5edb555db7b222ebcd0b21ce15e92200d60b53d82081`
- `tests/human-sibling-retention.test.mjs`: `55e063fa189a99583a3a5c74d3fac4cb9b418aa6dc25030c8d3143ceb17d1727`

## Earlier records and remaining boundaries

Initial2/2 and8/8 owning runs, intermediate27/27 and34/34 related runs and11/11 owning run remain their historical exact-byte evidence. They are superseded for the final candidate by the52-case result. An intermediate command included the nonexistent name `browser-native-sync-human-library.test.mjs`; Node did not execute that file. Its27-case result is only the three actual files that ran, not an original journal pass. The final command uses all eight actual filenames listed above. The initial52-case run at `eb5d5813` passed but did not test caller-forged lifetime cleanup. Self-review added exact claim-identity cleanup and the stricter refusal/busy assertion; final650d9ec2 runs all52 again. The initial52 log `/tmp/human-retention-freeze-targeted.log` remains SHA256 `aa7be526600e6cf04fe0092383e0f7d9fc06125c980c1fdb054f877f6c080987`. There were no failing retention test outcomes to relabel as passes. A receipt-update command initially used a wrong relative path and failed before editing; commit9cd96b42 therefore held the initial receipt. This follow-up corrects its identity to final650d9ec2 without changing runtime.

The inherited readonly-witness native run at baseline had **0/2 FAIL**, with both variants stopping in the graph-bound case; it is being investigated separately. This branch did not modify the native fixture, lower an assertion, run retention in a browser, or count that baseline as native acceptance. No full-unit suite, native suite, cloud CI, PR, merge, publication, device/provider test or main delivery was attempted here.

First-sibling only: additional siblings, old unproved ancestry, indexed/historical cases outside the original witness, lifecycle/purge support, graph-aware checkpoint recovery, explicit joined resolution and user-facing conflict presentation remain unavailable. Current local projection may differ between devices even when their retained Core graphs are equal. The distinction is intentional and not a completed product experience.

Independent code/security/memory/transaction review is the next gate. Root must decide necessary further tests and stable integration. This candidate alone is neither SYNC-01 completion nor full seven-plan delivery.
