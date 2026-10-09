# Human graph grouped replay: proposed original-owner interface

This is an interface/review batch, not checkpoint runtime or a recovery receipt. Base `6f0f9c9cfc40a3ed4b35f584aa5b14de6bb17f7c` plus the preserved optional Human journal/receiver WIP in `work/sync-human-graph-design`. The coordinator approved design/audit extraction on 2026-10-09; runtime extraction awaits independent review. Existing Source, Working, Context and Prompt group paths remain unchanged.

## Actual remaining gap

`browser-native-sync-human-library-journal.test.mjs` uses the real bound `LibraryDocumentsStore`, creates a Topic/default Section with qualified immutable outbox and full history, then calls the real `buildCheckpoint(...,{grouped:{store}})`. Current group planner rejects `BNS_GROUP_OWNER_UNSUPPORTED` with zero transport calls and every actual store unchanged. The existing group activation prepares all applications before the single activation transaction. Calling the new single-commit `prepareHumanReceive` there is invalid: later groups require earlier canonical and Core parents that have not yet been materialized in an empty installation.

The receiver's successful sequential original-owner transactions do not close this gap. Missing current parents, overlapping sibling groups, unsupported identity/history and complete graph limits still refuse; they are not checkpoint success or conflict resolution.

## One original planner, two precisely typed inputs

Extract each current named planner's existing read capture and existing computation, without reimplementing domain rules. The public local operation keeps its current capture and private capability path. The private grouped compiler invokes the **same** compute function with a qualified typed future read-set.

Proposed internal module APIs (names are review proposals):

- `captureHumanGraphReadSet(store, core, causalPlan)` reads one bounded actual readonly inventory; validates library document mode, enabled consent, Source-free independent human qualification, supported graph identities, complete histories and initial exact owner/namespace fences. Returns a private capability, never a caller-provided object.
- `prepareHumanGraphCredentials(capture, causalPlan)` computes exact local keyed Entry/suppression signatures and Topic current/alias name tokens outside IndexedDB. It binds the original secret, recovery epoch and initial capture. No token or arbitrary body from a remote producer is trusted as local authority.
- `computeHumanNamedPlan(kind, typedReadSet, request, exactOptions, orderedEvents, credentials)` is extracted from the existing named planner, including its exact original pure owner calls. It emits the existing planned canonical/history/result/receipt state and exact derived owner state needed by the next read-set. No `get`, `put`, `all`, cursor, transaction or virtual store interface is accepted.
- `advanceHumanGraphReadSet(previous, opaqueNamedPlan)` composes **only** the existing original planner's qualified output into the next operation's enumerated read fields. It neither writes canonical rows nor computes Entry/Topic/Section/membership/identity semantics itself. Arbitrary row dictionaries, foreign callbacks and generic patch instructions are rejected.
- `prepareHumanGroupedApplication(store, replayCore, causalPlan)` holds the initial capture, all private named plans, credentials, exact mappings and expected per-group read sets in a WeakMap capability.
- `applyHumanGroupedApplicationInTransaction(t, capability)` requires the real repository transaction, validates initial inventory/permission/secret/epoch/namespace, then for each group revalidates its exact expected before state, invokes the existing original named writer, applies the qualified complete Core commit and mapping. The existing grouped activation owner writes scope proof, active pointer and outcome in this same transaction. It receives no arbitrary domain write callback.

No new database, second domain reducer, synthetic transaction wrapper, store.clock/uuid override, committed canonical staging, nested transaction or crypto await inside the final transaction is introduced. Read-set composition is a typed planning derivation; it cannot grant a write capability.

## Exact read-set inventory and family-specific views

The inventory is not an arbitrary store export. It enumerates current/removed independent human Entry, Topic, default/named Section, Placement, suppression and keepSeparate rows plus all retained qualifying histories needed by admitted groups. Stable identity keys, all current personal-name/alias/removal fences and both move Topics are required. A single missing endpoint, history, suppression or unsupported redirected/AI/Source dependency refuses the graph.

The initial actual capture also includes existing operation receipts for the request IDs, exact Topic read-index records, relevant original derived-index/task records, and the original counters/fences: `thought-sequence`, `revision-sequence`, `thought-epoch`, recovery epoch, suppression secret, library sealing, consent/settings, Core generation and bound namespace. Input/source/dependency/provenance/AI state must be proven absent from this graph; unrelated existing application data is handled by the existing full scope qualification rather than silently omitted.

Family-specific future views retain the exact fields currently read by each planner:

| Kind | Original before fields composed for that operation |
| --- | --- |
| Topic create | name registry fence, request receipt, Topic/default Section identity collision, history collisions, read-index collision, counters |
| Entry create | request receipt, Entry/history identity collisions, counters |
| Entry edit | Entry, retained Entry history, all Placement edges, touched Topics/read indices, provenance/dependency counts, request receipt, counters |
| Entry remove/restore | Entry, all affected Placements/Topics/Sections, suppression, retained removal/edit histories, original eligibility counts, request receipt, counters |
| Section create/edit | parent Topic, current/default/named Section and exact order edge, relevant Topic read-index, full retained Section history and selected restore row, request receipt, counters |
| Place/remove | Entry, Topic/default and selected Section, exact edge/rank and all relevant membership/history state, touched indices, request receipt, counters |
| Move | both complete place/remove views, source and destination histories/intent, both exact touched indices and ordered counters; never separate commits |
| Fixed membership | Entry and all actual active/removed edge and Topic qualification, complete intent history, touched indices, request receipt, counters |
| Topic lifecycle | Topic identity/name fence, all eligible entries/placements, all affected retained histories, read-index, request receipt, ordered counters |
| Topic rename/edit | Topic, current/prior/new name fences, exact read-index, complete retained Topic history and selected restore row, request receipt, counters |
| KeepSeparate | both qualified Topic identities, exact pair/fence and existing qualified histories; no fake new identity or domain receipt |

The precise capture keys are taken from the current corresponding planner helper. Before runtime coding, extraction must mechanically account for every existing read, including count/range/order edge results; the table is not permission to omit a read.

## Derived index is original-owner state

Current `reserveTouch` predicts UUID consumption and `buildingKey`, but does not produce the complete index record (`buildingGeneration`, `sourceCursor`, `scanned`, `indexed`, `timeRevision` and related original fields). It is insufficient for multi-step future read-set composition.

Extract the **same** pure metadata transitions from `thought-read-index.invalidate/startTopicBuild` into its original owner, with a precisely scoped review before editing that file. Both normal runtime and the Human planner use this one transform. Repeated touches inherit every prior original index field and consume UUID/time slots in the original order; no hardcoded reduced index or arbitrary metadata stripping can satisfy the oracle. Search queue/maintenance task changes are likewise either exact original-owner outputs needed by subsequent reads or final derived writes whose completeness is checked after original execution. They are never dropped to make equality pass.

## Portable sequence and history contract

Only these explicitly enumerated physical fields can map:

- Entry: `createdSequence`, `updatedSequence`, `negativeUpdatedSequence` (the existing `listKey=[activeKey,id]` is semantic and remains byte exact).
- Topic: `negativeUpdatedSequence`.
- History: `sequence`, `listKey=[entityKey,sequence]`, `documentList=[documentId,sequence]`; nested Topic before/after snapshots permit only the Topic physical field above.

Codec validation first verifies actual types/structure/derived relationships. Mapping is namespace-qualified Core metadata with wire and local values, committed atomically with the original owner and group. Protocol retains the exact original wire values and both lawful revisions of coalesced history. The same stable history ID keeps the same mapped local sequence while its parented content advances. The local producer consumes this mapping before republishing: compare exact semantic before bytes and exact mapped local physical before, then bind the actual acknowledged parent wire before. No suffix matching, generic sequence deletion, local sequence trust, new history IDs or receiver-generated human timestamps.

Descriptor required `options={restore:boolean,renameOnly:boolean}` comes from the original private plan. `restore=true` is legal only for Topic lifecycle; `renameOnly=true` only for Topic edit. Other kinds require false. Entry restoration has its own explicit kind. Options cannot manufacture human authorization.

## Causal capacity, duplicate and final transaction

Compile all incoming operations and every required ancestor/complete commit into one unique set **before** canonical mutation: maximum 128 operations and 4 MiB canonical encoded operation bytes. This includes history ancestry and both move sides. The local producer and private receiver use the same complete-ancestry bound. Checkpoint compiler has the full bounded supplied graph; it cannot demand preexisting parents in an empty replay namespace or use a per-entity budget.

Every descriptor/ref/member binds exact dataset, device, operation ID, digest, sequence, entity, parent, original request digest and ordered events. Split/missing/swap/duplicate/digest collision refuses before materialization. Concurrent siblings are retained as unresolved protocol work by a separately qualified causal conflict path, without successful canonical ACK or choosing an arrival/clock winner; this path is required implementation, not supplied by current single-commit receiver refusal.

All crypto, credentials and seals are prepared before the final strict transaction. Initial capture, per-group before, complete private capability, namespace and mapping are rechecked in that transaction. Original writers own every canonical/history/receipt/index write. Any error before or after any group/ACK/active pointer aborts the complete activation. No echo outbox on receive/restore. A previously committed exact group ACK returns duplicate after later lawful edits without replaying old content. Lost activation ACK is resolved by the original durable activation outcome and does not re-run writes. Existing two-namespace storage accounting and cleanup owner remain mandatory.

## Required actual-owner oracle and negatives

Use two isolated **real** original stores with synthetic data. The ordinary sequential path calls existing named public owners; the candidate path extracts their typed captures and uses the same pure computations. Exact semantic canonical rows, timestamps, human protections/intent/identity, IDs, histories and result/receipt/index state must match; only the enumerated physical mapping and installation-keyed tokens are qualified differences. Raw source copies or fake store methods are not the oracle.

Cover single and causally ordered multi-group Topic/default/named Section creation, placement, both move sides, fixed-set/negative edge, Entry edit/remove/restore, Topic rename plus aliases, Topic deletion/restoration, explicit KeepSeparate, Section/Topic selected history restore, no-op and repeated touch. Coalesced history keeps stable ID/local sequence and original windowStartedAt; ordered allocation events retain every actual repeated touch and pruning clock.

Negatives: wrong/missing read field, history omission, identity fence omission, stale initial/each-group before, namespace/secret/epoch/permission change, direct unjournaled human write, same revision different bytes, descriptor first/last, cross-commit swap, conflict siblings, arbitrary true options, malformed physical mapping, bounds 129 ops/4 MiB+1, changed counters/index, and abort at each original owner/Core/mapping/activation checkpoint. Every rejected activation leaves **all actual stores** unchanged. Complete scope must reject any unrepresented human/AI/Source state, not simply accept the newly added stores.

Native source/release journeys must execute original service worker/IndexedDB, worker stop/restart, duplicate/lost ACK, restore pointer and no-network/no-echo checks with exact current file hashes. Exact frozen 0.33 reader modules must refuse every required family cut and grouped restore before staging. Current receiver unit/native proof is not this grouped acceptance.
