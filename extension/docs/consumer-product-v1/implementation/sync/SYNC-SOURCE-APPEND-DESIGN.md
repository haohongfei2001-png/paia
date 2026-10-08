# SYNC-01: one new Source in an already bootstrapped conversation

Design only; runtime not authorized by this document. Base `c6492298` (031 integration candidate), isolated branch `codex/source-append-design-20261009`. No change to the current 031 candidate or the earlier Source author tree. This is an optional local producer/publication/receiver slice, not product Sync activation, new-device full recovery, checkpoint support, or provider qualification.

## Authority and actual gap

BNS_CONTRACT §§04–05 require exact identity/parentage, explicit independence rules, deletion/permission fences, transactional outbox, and remote canonical/receipt/frontier atomicity. BNS_PLAN SYNC-01 permits synthetic two-installation Core proof independently of accounts. Root selected this design after the reviewed initial Source bootstrap slice.

Actual base owners:

- `source-bootstrap-journal.js`: `capture` accepts one message and `requireAbsent` rejects any existing `documents.byChat` row.
- `indexed-store.js`: ordinary `defaultBlock` reuses the existing conversation document. `applyInitialSource` deliberately rejects an existing conversation; calling it repeatedly is not append support.
- `refreshDoc` updates derived first/last time, status, Source counts and index display keys. It does not replace the current `documents`/`libraryDocuments` objects with incoming copies.
- `IAStore` baseline planner and trusted initial baseline seam preserve the wire baseline identity/time while assigning local physical history sequence.
- Working reception already consumes these baselines and maintains wire-to-local history mappings. It must continue to accept both A-first-edit and B-first-edit after the new Source arrives.

## Scope and explicit exclusions

One valid ChatGPT capture request containing exactly one **previously absent** source message; the conversation has a validated initial-bootstrap protocol closure in the current dataset/namespace and still resolves to its single original document. Both installations may append distinct new messages to that conversation.

No batch capture, enrichment, changed original text under an existing Source identity, legacy unproven conversation adoption, mixed supported/unsupported capture, imports, missing-parent recovery, checkpoint activation, cloud transport, worker registration, schema/store/permission/version change. Default journal remains null. Existing initial bootstrap v1 and its seven-operation contract stay exact; no silent expansion of that codec.

Existing human edits to old Inputs and document title/note are allowed and preserved. A detached, removed, ambiguous, purged, or unprovable document anchor is not recreated. Unsupported state is a typed rejection before any canonical/outbox change, not a fallback to ordinary unjournaled capture.

## Proposed wire family (reviewed design target, not existing implementation)

New required `sourceAppendMember` v1 and `sourceAppendCommit` v1, overall BNS wire protocol unchanged. Every member is the new outer type; putting a new flag inside an old Source codec would be unsafe for an old reader.

Five members: `source`, `timeEvidence`, `input`, `inputState`, `baselineRevision`. There is **no full inputDocument member**. Each wrapper has the existing normal operation envelope plus exact value fields:

```
{id, entityType, entity, logicalCommitId, datasetId, deviceId}
```

`id = entityType + ':' + entity.id`, validated against the complete entity. Each member is an initial operation for that new entity (empty parents); an existing wrapper head is rejected/collision-checked, never silently overwritten. The original Source identity is still verified through existing `identify`/sourceKey/dedupeKey and canonical indices, not merely through wrapper UUIDs.

The descriptor's exact proposed fields are:

```
{id: logicalCommitId, logicalCommitId, datasetId, deviceId,
 sourceId, sourceKey, documentId, inputId, baselineId,
 conversation: {platform:'chatgpt', chatId},
 bootstrap: {operationId, revisionId, documentMemberRevisionId},
 refs: [{type, entityId, revisionId}]}
```

`refs` has the five exact unique member references in the fixed order above. Normal operation digests include all fields and members bind the same logical commit, dataset and producer. The receiver rejects swapped members from two otherwise valid commits, missing/duplicate/extra refs, malformed identity, and unknown fields.

`bootstrap` is an explicit cross-family immutable dependency, **not an invented cross-entity Core parent edge**. Resolve the original descriptor and all six bootstrap members in the **current bound namespace**. Revalidate their exact envelope/digests and descriptor references, dataset/producer/logical identity, including the document member revision and conversation identity. In the admission transaction, every one of these seven operations must have its exact retained, non-redacted revision; a non-purged, single current head equal to that revision; and its committed receipt matching operation ID, digest, device and sequence. Verify the corresponding sequence record too. Partial receipts, changed/multiple/purged heads, an old revision retained only as history, a draft/prepared object, or a closure in another namespace cannot grant append authority. Crypto validation stays outside live IDB; the transaction rechecks the exact previously validated protocol rows and all current heads/receipts/fences. Missing dependency remains unsupported/waiting without canonical changes, not success.

This committed receipt is **not a remote/upload ACK**. Actual `Core.commitPrepared` (lines97–109 at this base) invokes `applyInTransaction(origin:'local')`, which unconditionally calls `recordReceipt` after writing the revision/head (lines190–207), then writes each queued outbox reference in the same transaction. Thus the producer already has the same seven committed receipts as a receiving installation. Local proof requires these exact heads/revisions/receipts and sequence records; any remaining outbox reference must match its operation/revision. Do not require an outbox row to remain queued forever: `publications.js` deletes acknowledged outbox references, and `acknowledgeOutbox` does likewise. Durable committed protocol records plus canonical identity retain the proof after legitimate publication. Remote proof uses the same committed records, with no outbox requirement and no echo. Neither branch accepts an outbox reference alone or requires a real provider ACK. No new truth store is needed.

Protocol proof alone is insufficient. The original bootstrap **canonical Source, original Input, baseline and stable document/mirror must still exist; current times evidence must equal the original member, including legitimate absent/null evidence** under their exact bindings. Source/provenance/time identity and baseline original values must match, allowing only the existing local physical history-sequence mapping. Existing legal Working changes to the old Input and human document title/note remain allowed and are preserved; they are not required to equal initial working text. Validate current binding/retained history rather than resetting them. If the original anchor Source has been independently deleted, this first slice refuses append **even if other Inputs keep the document alive**. Missing baseline, removal/tombstone, or detached/changed conversation binding also rejects. Re-anchoring to another Source is outside this slice.

Inherited codec/segment byte limits and Core batch limits apply to the complete six-operation append; over-limit requests reject atomically. A small member count does not mean arbitrary payload size. No new numerical protocol capacity is introduced.

## Document ownership, independence, and CAS

The immutable bootstrap proves the document's formation and stable ID, not its **current** entire contents. Current same-transaction checks require:

1. Current dataset/namespace/restore fence, capture consent/epoch, and existing protocol anchor are valid.
2. `documents.byChat` resolves uniquely to the anchored document ID; canonical document and Library mirror exist with the expected immutable conversation binding. No tombstone/removal/detachment or capture exclusion defeats the anchor/new Source.
3. New sourceKey/dedupeKey/record/Input/baseline/time identity is absent; conflicting canonical or protocol rows reject. The same ID with different content is not a dedupe.
4. Input and baseline bind that existing document ID. Validate Source using actual capture shape rules and SourceTime evidence rules; derive the new Input by the existing formation helper with only its document binding changed, then construct its initial baseline using the actual planner. Do not rewrite any old Input to make the plan fit.
5. Snapshot the relevant current document/mirror and counters before digest awaits; compare those **local** snapshots in the final transaction. A stale local prepare rejects rather than overwriting a concurrent local edit. Remote human fields need not equal the producer's fields because none are transmitted or replaced.

Distinct previously absent sourceKeys are an explicit append-only independence rule: A and B may each add a new message against the same immutable bootstrap. They create different Source/Input/history identities and then invoke the existing derived aggregate owner on the receiver's current union. Neither operation asserts a complete member-list replacement or a latest document revision. Therefore receive order may differ while both messages survive; timestamps/pageOrder only inform existing display/time rules, never winning authority. Conflicting same sourceKey additions fail closed rather than silently choosing UUID/text/time. Concurrent local mutation during one receive's asynchronous prepare still causes CAS rejection; an explicit retry may re-prepare against current state, without manufacturing a new remote operation.

This independence rule does not license arbitrary document field merges. Before implementation, tests must verify existing `refreshDoc` deterministically derives affected aggregates from the same union and preserves all other current fields; if it does not, report the actual owner conflict rather than introduce a second aggregate algorithm.

## Producer call and transaction sketch

Keep the optional constructor binding; extend its trusted capture dispatch to select either the unchanged absent-conversation bootstrap or the new exact proven-conversation append. Selection is explicit and rechecked; invalid append never falls through to default capture.

1. Validate actual capture DTO; capture namespace/restore/consent before asynchronous identity work. No global clock/UUID mutation.
2. Read current anchor and absent new Source under one read transaction. Obtain actual `clock()` capture time and planned IDs; form Source plus real time ledger and new Input referencing the existing document. Plan baseline with `uuid:()=>plannedBaselineId`, existing local revision sequence, actual baseline reason/before/after.
3. Outside live IDB, validate entities and build digests/wrappers/descriptor. Mint only a module-private capability for the exact verified append plan. Do not accept arbitrary client callback or caller-supplied capability.
4. In the final existing write transaction, recheck the full local snapshot/fences; add record/time/new block/index and initial state/baseline/filter row using existing helpers; call `refreshDoc` on the existing document; verify actual new canonical rows and preservation of old protected rows; commit the exact prepared outbox and existing diagnostics/control changes atomically.
5. Acknowledge only actual transaction completion; publish local change notification afterward.

Suggested narrow seam: `IndexedArchiveStore.applySourceAppend(t, privatePlan)` plus the existing trusted baseline writer, distinct from `applyInitialSource`. It must never put an incoming document/mirror object. Reuse `saveRecord`, `blockIndex`, baseline/initialFilter, `refreshDoc`, and sequence ownership. If a baseline helper currently insists on the initial six-member plan, generalize only its internal verified-plan access; no public bypass or duplicate revision planner.

## Receiver and replay

Explicit injected `SourceAppendReceiver(store,core)` only. Finish existing foundation maintenance first, then capture current authority before asynchronous decode/hash work. Core gets a family-specific private prepared receive and transaction capability as for initial bootstrap; generic receive/applyPending/reconcile/checkpoint routes continue to reject the new family.

Validate complete closure and bootstrap dependency, then recheck them and current canonical eligibility in the final transaction. Allocate only local sequence/list/delta indices. Preserve wire Source ID/capture time, SourceTime ledger, baseline ID/at/windowStartedAt/before/after and wire operation bytes. New Input may already have future Working operations waiting externally, but this slice does not invent an inbox or activate them silently.

Canonical additions, all member/descriptor receipts, head/frontier changes and derived indices commit in one transaction with `origin=remote`, no echo. Fault injection after any write rolls back the whole set.

Exact descriptor receipt replay returns duplicate only after checking current permission/namespace/restore, exact Source/time/provenance and retained baseline identity, current document binding, and deletion/exclusion fences. Later legal Working body/note/history edits are not reset or compared to an obsolete baseline as if still current. A missing/deleted Source/Input/anchor cannot be resurrected through the duplicate path. Changed digest under the same operation ID is a collision. Partially present receipt/member state must reject rather than manufacture a successful duplicate.

Capture DTO has no operationId: a new capture call after an unknown local save ACK cannot infer success from similar bodies or re-create a new logical commit. It rejects an already existing Source. Prepared durable outbox replay preserves identity, and remote exact operation replay is idempotent; **cross-restart public capture request ACK reconciliation remains unimplemented**.

## Required negative-first implementation evidence

Use actual stores and actual capture→publication→segments/decode→explicit receiver, no canonical-copy shortcut:

- Initial A bootstrap→empty B; A append→B same document. B append→A same document. Offset local sequence counters. Verify exact baseline/time and both directions of subsequent actual Working edits.
- Independent A/B new messages before exchange; receive in reverse order; both survive, aggregates converge, all original Inputs/revisions and user title/note/protection remain unchanged. Conflicting same sourceKey receives reject atomically.
- Existing human title/note and edited old Input/history remain byte-identical apart from explicitly derived aggregate/index fields. No old history rows are recreated, pruned, renumbered, or coalesced.
- Producer mixed/batch/enrichment/unsupported anchor rejects with all stores/outbox unchanged. Bootstrap itself still passes unchanged; default-null capture unchanged.
- Frozen actual 0.31 reader: each member alone, descriptor alone, maxOperations=1 publication, reverse arrival and segment boundaries all reject required family before any canonical application. Do not simulate old code by deleting a registry key in the new code.
- Wrong anchor/document/chat/dataset/producer, forged/missing/bootstrap refs, substituted member, missing/duplicate refs, wrong SourceTime ledger, invalid capture shape, baseline mismatch, namespace change and same-value restore during await: typed rejection and zero partial writes. Add exact tests for producer append before publication and after acknowledged outbox deletion; remote append with no outbox; missing one of seven committed receipts/sequence records; old revision with changed or purged current head; and deleted original anchor Source while another Input/document remains. All reject or accept according to the explicit proof above, without requiring a remote ACK.
- Capture excluded, source/snapshot tombstone, removed/detached document, changed permission, local CAS mutation, or unknown restore marker: reject. No broad boolean permission substitute.
- Fault injection during canonical/index/baseline/outbox/receipt/frontier work rolls back all stores. Exact remote duplicate after Working edit preserves it; duplicate after deletion fails without restoration. Unknown capture ACK never sends a fresh operation to guess success.
- Restart producer with committed outbox then publish unchanged identity; restart receiver then replay same operation. Real synthetic worker/IDB proof, complete network ledger, source/release runtime hashes; distinguish explicitly imported receiver from product registration.

No tests or browser runs were performed for this design. Initial Source's prior23-case native and its earlier failures remain separate evidence, not append acceptance.

## File ownership requested for a future approved implementation

- `core/browser-native-sync/source-bootstrap-journal.js`: narrow optional dispatch only, preserving initial path.
- New `source-append-{codec,plan,journal,receive}.js` (merge helpers if smaller, not a new architectural layer).
- `core/browser-native-sync/{codecs,core}.js`: required families/private complete-family capability; generic refusal preserved.
- `core/indexed-store.js`: trusted append transaction seam; `core/ia-store.js` only if the existing baseline capability needs narrow shared internal access.
- Dedicated owner tests/compiler fixture and a scoped native journey reusing existing synthetic capture/transport infrastructure; receipt only. No workflow/router registration until Root integrates a stable reviewed slice.

No worker, Settings, UI, schema, provider, permission, CI, version, checkpoint, or inbox changes. Multi-message200 capture and grouped checkpoint activation remain independent local architecture work; accounts cannot solve those missing owners.

## Design review revision

Independent reviewer root_finish requested complete current anchor proof and an explicit deleted-anchor policy. This revision follows the actual local/remote shared `recordReceipt` call chain; it does not invent a remote receipt requirement for local capture. Design only: no runtime or browser validation is claimed.
