# AI-COST-03 — bounded existing Context session and original-owner settlement

Local P1 implementation, 2026-10-18. Base is the exact partial checkout at `8275d54b1061922aacf827ea3900fddaacf4a64e` plus the separately frozen P0 owner/adapter checkpoint. This receipt supersedes only the P0 statement that ordinary Maintenance cannot send an independently granted existing Context baseline. P0 test identities and original failures remain historical evidence.

## Qualified session path

- The helper selects bounded Item metadata before the payload processing resolver runs. The resolver must grant the exact additional `existingContextItems` descriptors, including independent body/section and optional temporal fields. Sharing an Input source never grants Item prose.
- The immutable selection, source closure and independent grant remain child-specific. Existing content consumes the remainder of the original content/request envelope after base material and summary overhead. The original full-payload ceiling runs again. Omitted candidates are selected-scope incompleteness, never whole-profile NO_CHANGE.
- Only semantic Item fields enter `material.existingContextItems`; associations, provenance, current qualified evidence and original Source snapshots remain local. The session validates every non-ADD command against its exact selected Item/revision/card/epoch/associations/current evidence. The source mapper has a separate owning receipt.
- ADD, UPDATE, REMOVE_CANDIDATE and NO_CHANGE require exact original-owner dispositions `created`, `updated`, `invalidated` and `no_change`. A protected/removed/duplicate result cannot receive an ordinary Context ACK. The original selected human-correction protected NO_CHANGE exception remains. Missing fresh temporal evidence clears a Now UPDATE's previous deadline.

## Original owner capabilities and the sent-baseline fence

`ContextMaintenanceService` fixes the exact expected Item before its first write and keeps original processing/lineage alive until the complete joined Foundation transaction returns. Its private final fence verifies selected Input/Source records, restrictions, epoch, processing authority and exact expected Item after receipt and exact ACK/usage/job/counter settlement. Direct callers also execute the fence. Exact Source snapshots were added for ADD and direct callers as well as existing Items. Snapshot acquisition and original lineage capture share the original branded work budget. No crypto await was added inside an IndexedDB transaction.

`TopicFormationService` and `ContextMaintenanceService` mint module-private WeakMap publication tokens, never request/provider fields. A token is bound to its original store/database, operation and native transaction. Pending tokens are readable only in that same transaction; committed tokens become usable only after the original joined write returns successfully. The session accepts the capability only from its constructor-private active owner callback, which is already bound to the exact job, child, facet and coverage.

The Topic owner records each actual original write intent before delegating its put/delete, compares exact intended rows and root metadata at final settlement, and freezes the ledger before returning to Foundation's ACK stage. Recursive writes from a delegated put cannot become owner intents. Publication records retain only the graph metadata needed by the helper; Entry bodies and Topic/Section names are not in the retained publication ledger. Root advancement is derived from original root-write intents and the existing repository's one final backup-generation increment, never read back after ACK.

When a relevant baseline exists, the helper freezes all Input fields and Sources already granted to the same child, including an Input whose lawful new whole mirror may later join the old Topic. This does not expand the Item’s checked evidence subset. An empty selection sends no Item facts and does not participate in an aggregate root publication chain; original epoch/gate/grant still apply and selection is never repeated.

The helper begins at the sent admission, chains exact authenticated before/after root tokens, and applies the authenticated metadata writes to a copy of the original graph. It requires complete graph equality; a prior successful write does not waive global authority or allow arbitrary additional placements/dependencies. The session stores tokens only after successful Foundation commit, and records a per-handle start offset so a later-selected child cannot consume earlier tokens. Exact expected Item state is kept separately from the immutable sent baseline. A failed transaction publishes neither ledger nor new expected Item.

## Cleanup and continuation

A child with all coverage ACKed or explicitly deferred releases its raw provider output, source-adapter child state, prepared Topic/filter handles, existing-Item snapshot and validated groups even when an unrelated sibling keeps the job PARTIAL. Authored/bound/structural/correction material is released when no unreleased child needs it. Non-storage stale failures release their child commands and cannot silently execute them on a second local run. `STALE_BASE`/`UNAVAILABLE` from the joined owner are preserved rather than mislabeled storage failures.

An actual STORAGE_FAILED/STORAGE_FULL rollback retains the validated local command and required original material for same-response continuation. No additional paid replay is authorized. Unsent sibling grant refusal still allows a valid received sibling to finish, and the unsent child may later take its first exact grant/capture without refreshing the metadata selection. Revocation, unknown outcome and terminal cleanup clear the material. These are explicit lifetime controls; no JavaScript heap/GC or complete-process erasure guarantee is claimed.

## Preserved negative evidence and corrected test oracles

- `/tmp/maintenance-existing-baseline-red-v2.tap`: 9 real receipt/ACK/counter races, 3 PASS / 6 FAIL before the new fence. Original processing-currentness already blocked its three races; Item and historical Source drift wrongly committed.
- `/tmp/maintenance-existing-add-source-red.tap`: 4 FAIL for ordinary ADD Source mutation at receipt/ACK/usage and direct-owner receipt. `/tmp/maintenance-existing-add-source-green.tap`: corresponding 4 PASS after the all-operation Source fence.
- `/tmp/maintenance-existing-post-topic-drift-red.tap`: 3 cases, 2 PASS / 1 FAIL; post-Topic/pre-Context root-epoch drift wrongly committed. The two graph cases ran while helper tightening was in progress and are not claimed to establish the older implementation's protection. Final tests cover all three plus a recursive Topic put-injection negative.
- `/tmp/maintenance-existing-add-disposition-red.tap`: 2 FAIL / 1 PASS; a schema-valid ADD racing a protected or removed same-ID target wrongly received COMMITTED, while duplicate-ID mismatch already failed. The final exact `created` disposition guard passes all three and leaves same-response storage retry/ACK-loss controls intact.
- `/tmp/maintenance-existing-final-owner-suite.tap`: coherent six-runtime inventory, 478 cases / 472 PASS / 6 FAIL. Five following-grant continuations exposed the missing strict first-capture publication chain; one filter assertion expected completed-child material retention. Neither this RED nor the source worker's separate graph/fixture REDs are relabeled a pass.
- Authorized old-oracle corrections preserve their original positive and negative assertions: protected ordinary UPDATE now expects PARTIAL, zero Context ACK and zero protected receipt while preserving the entire human Item and one provider call; Placement payload reconstruction passes the newly sent existing-Item fields to the constructor and retains all malformed/duplicate/budget negatives; completed filter child expects immediate release once, whereas failed ACK rollback still expects zero release until successful continuation.

## Supported composition and remaining boundary

Whole-Input mirrors from already selected Inputs can be newly published by the same original Topic owner and then support the existing Item operation through the exact publication graph. The source-path tests demonstrate the precise supported composition.

A new partial/excerpt AI Entry has no independently granted Entry body field. The original Context scope owner validates/reads that body's fields, so this slice does not infer authority from its Input. Such a new Entry currently fails the joined Topic helper fence and rolls back that Topic transaction with zero Topic/Context ACK; it is not a completed Topic-ACK/Context-DEFER composition. Preserving the independent Topic result while deferring only the Context facet remains a separate bounded semantic-disposition task. No new Entry grant, new Input, refreshed sent Item or blanket graph exception was introduced to make the positive tests pass.

## Final scoped evidence

Final frozen owner suite: **481/481 PASS**, 30332.157989 ms, zero failures, cancellations, skips or todos. Log: `/tmp/maintenance-existing-final-owner-suite-v2.tap`. The complete 332-file `extension/core/**/*.js` SHA-256 inventories before and after execution compare equal: `/tmp/maintenance-existing-final-owner-tree-before.txt` and `/tmp/maintenance-existing-final-owner-tree-after.txt`. The new session suite contributes 31 cases. The combined 16 files retain the five direct Topic suites, exact Topic final fences, session owner integration, original NO_CHANGE/invalidation, payload, ordinary/mixed Maintenance and filter controls. The targeted ADD/following-grant successor passed 11/11 in `/tmp/maintenance-existing-add-following-green.tap`. Node tests execute the actual original domain owners with the existing synthetic fake-IndexedDB harness. They are not a browser/native/full-suite, installed-user, real-service or real-provider qualification. Packaging/build and independent integration review are owned by the parent checkpoint. No installation, credentials, external write, paid activation, deployment or new Sync feature was performed here.

## Frozen owner resource identity

| Resource | SHA-256 |
|---|---|
| `extension/core/ai-usage/local-maintenance-session.js` | `8a41302c62208699d6658370725974a5f5648f3cf055dd39b5e9b530562944b1` |
| `extension/core/ai-usage/maintenance-payload.js` | `e4bea8e3e7ebf6c477ec4c2c01cb00f6551229e274c29b090a633c6e7e90f4fa` |
| `extension/core/context-maintenance.js` | `5b41179f885cd17b1420711e99369981bdeb10250ab9e4e10093f2da4bfa4232` |
| `extension/core/topic-formation.js` | `c01abfa776f9aba4b08feaf8dfb7b31f53b261fe5326a6ebcd4b1b116781d629` |
| `extension/tests/ai-maintenance-existing-context-session.test.mjs` | `209613a6aa54e31a5d0e63e916d64724ca85e1bcfa13255aa84e343e8ee4c166` |
| `extension/tests/ai-maintenance-no-change-session.test.mjs` | `49b3cc0b688a17d9210a338cfce0c6941f50710dcb33b72ecf374f3c5795247b` |
| `extension/tests/ai-cost-03-maintenance-session.test.mjs` | `6218ede41875f102edf2ed97e568933328b62194509ac2a799c8883627521de3` |
| `extension/tests/ai-filter-maintenance-session.test.mjs` | `42e9e1dd754de52c94bc2a34d43412c8e8258c240ef1534d98a3ca90ada31f10` |

The helper and source mapper are separately owned resources and receipts. Their exact bytes in the successful combined owner run are retained by the full-core inventory above.
