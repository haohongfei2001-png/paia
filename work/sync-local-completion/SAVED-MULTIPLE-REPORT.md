# Same-Source multiple saved entities through original recovery owners

Baseline: `c0ea304171ca3b6bcee2168127496995be926e1e`. This package extends the existing explicit local saved-work Sync consumer. It neither enables a provider nor claims the entire Sync plan complete.

## Implemented consumer

One complete original Source bootstrap may now carry multiple independent saved AI-origin Entry bootstraps and their typed successors. Each original AI creation and human confirmation remains represented by its original immutable payload, generator, provenance, history and protection metadata. The graph retains one anchor and its exact parent/before/after chain per entity; a successor cannot use another Entry's anchor or parent.

Compilation checks all original bootstrap and retained typed before/after payloads for cross-entity revision IDs, original owner operation IDs, provenance IDs and actual created/updated allocation identities. The original Source baseline revision and operation are reserved with a private non-string owner identity. This includes histories that a later typed successor pruned or coalesced, rather than checking only the final physical rows. These constraints safely reject conflicting cross-device allocation histories; this package does not introduce conflict resolution or invent missing historical facts.

The aggregate capability remains private and bound to the original compiled graph, exact stage and repository. Every member is prepared by the original Source/saved owner against the same actual empty destination. Only that capability computes the intervening original owner counters and destination counts. Application calls each existing owner in graph order and imports its final validated canonical history once; every immutable typed operation still obtains the original Core receipt, sequence, frontier and entity identity. The group records all applied steps and will not seal a partial set. A transaction failure invalidates its in-memory progress; an explicit activation retry prepares new owners from unchanged durable stage evidence.

Final raw fences preserve each Entry, history, original Source/control facts, provenance, dependency, saved marker and protocol row. Aggregate fences bind the exact total Entry count, final thought/revision counters, exact staged item count and complete replay-namespace count, including one marker per saved entity plus the original recovery epoch. The existing private transaction budget remains cumulative across all members; public metrics resets cannot reset it.

Canonical scope now derives each entity's own final typed state. The old single-entity `savedWork` DTO is byte-shape compatible; multiple entities use a deterministic Entry-ID-sorted array. Every canonical member is checked against the keyed original Source evidence and owner-derived rows. Extra Thoughts, metadata, histories, placements, suppressions, migration rows or unrelated canonical families remain rejected.

## Actual validation and limits

The new consumer tests use **two saved entities, one Source, and empty cold targets**:

- Original A creates and human-confirms both AI-origin Entries; B restores both and performs independent original owner edits with typed outbox events. Duplicate owner requests return their original receipt without mutation. C restores both with no remote receive echo, retaining exact semantic content, provenance, generator and original manual protection.
- Interleaved same-field edits coalesce original physical history independently while all four real typed events remain replayable through cold C. No missing initial history is fabricated.
- Cross-entity history/provenance/created-sequence collisions, borrowed successor anchor/parent, and collision with the original Source baseline are rejected before destination mutation.
- A failure after the second saved member rolls back every table, including stage/protocol/canonical rows; a later explicit retry restores both.
- Actual backup-tail changes to first Entry, second history, second receipt, total Entry count or global revision counter are detected by the raw final fence and roll back every table.
- A real shared Source edit prevents stale export of either saved Entry. An attempted 4097-read tail after resetting public metrics is refused by the unchanged cumulative private budget.

Original operation/graph limits and the 4096-reference / 2 MiB / 30-second transaction ceiling remain. The positive fixture proves this bounded two-entity case; no arbitrary library size, multiple Source graph, nonempty target merge, adopted-AI family, generation replacement, native performance or Linux capacity qualification is claimed. Default provider readiness remains unchanged.

## Evidence

All tests use the previously verified isolated Node **22.23.3**, explicit Python **3.12.14**, and local fake IndexedDB. No browser, build, cloud, Full, account, network transport or actual user data was used.

- `saved-multiple-baseline.log`: original implementation **0/1**, rejecting the genuine two-entity graph with `BNS_SAVED_WORK_UNSUPPORTED`.
- `saved-multiple-first.log`: first complete positive consumer **1/1**, 658.048333 ms.
- `saved-multiple-controls-first.log`: expanded **13/13**, 2896.949084 ms.
- `saved-multiple-owning.log`: one serial combination of eight owning files **171/171**, no failures/cancellations/skips/todos, 30689.896959 ms. Includes new multi-entity, original saved group/successor/bootstrap, graph planning/recovery, old-reader and paging contracts.
- A final internal collision-owner label was changed from a string to a private Symbol so it can never alias a legal entity string. The final new owning run is **15/15**, no failures/cancellations/skips/todos, 2663.03575 ms, recorded separately in `saved-multiple-final.log`; it is not retroactively combined into the earlier 171-case result.

The exact final source vector includes the local temporary coordinator used by these tests. No new coordinator API or change is needed for this package: root already owns and integrated the earlier saved-group and Source-denial wiring. Do not copy or commit the whole local temporary coordinator.

Independent reviewer `/root/acceptance_audit` read all three runtime changes and reported no remaining known blocker in this finite scope. Its review does not replace native or broad acceptance qualification.
