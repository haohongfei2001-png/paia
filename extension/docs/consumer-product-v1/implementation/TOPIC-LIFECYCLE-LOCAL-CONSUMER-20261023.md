# Explicit local Topic inactivity consumer

Base: `2ef5a3e4e450687faba13fb4c4eb9f95c6a14e83`. This is a local implementation milestone for the [execution policy proposal](TOPIC-LIFECYCLE-EXECUTION-POLICY-20261023.md), within the [takeover queue](PAIA-TAKEOVER-QUEUE-20261023.md). No worker, background, router, package script, production policy or account is activated.

## Actual consumer

`TopicLifecycleConsumer` consumes an explicit caller-selected array of existing original lifecycle requests. The caller supplies an explicit version, inactivity duration, maximum Topic count and current observation time; there are no 90-day or 16-Topic defaults. The implementation ceiling is100 selected requests and1000 projected members per Topic; reaching a ceiling does not guarantee the physical work budget fits. No Topic enumeration, provider call, rename, merge, membership modification, new grant or deletion is introduced.

`TopicLifecycleService.changeInactive` calls the original preparation, genuine `TopicProcessingAuthority`, exact operation receipt/CAS, Source presence checks, Memory negative witnesses, lifecycle protections, journal, search and Foundation transaction. Legacy boolean authority is insufficient for this new path. The ordinary `change` API remains compatible. A registered Human Sync journal still returns its original unsupported-mutation refusal; this implementation never detaches it.

The activity evaluator reads only an already completed original Topic asc projection, its bodyfree activity metadata, original active placement metadata and existing root authority. It neither invokes the UI/history activity reader nor creates a projection by reading the whole Topic. Every current placement must have one matching completed descriptor with known, nonfuture, sufficiently old activity. Unknown, missing, excluded, stale, rebuilding, mismatched or incomplete projections defer. Existing original projection preparation is used only by the synthetic fixtures.

Source and processing scopes remain independent. The terminal Source closure covers the union of actual Topic Source dependencies, current member Entry/provenance/dependency pointers, linked Input metadata and the already prepared selected Input evidence: record-index identity, both tombstone keys and physical Source existence counts, without reading Source bodies. Tests use an actual original Topic Formation result whose two Sources exceed the independently selected one-Input processing scope, and the original placeEntry owner to move a Source-linked member into an independently authored Source-free Topic while processing selects a different Input. The latter exposed a real omission: the original Topic Source union alone did not include its moved member Source. The pre-fix test incorrectly committed (0/1); the corrected terminal set refuses and rolls every table back.

The internal fixed Entry projection checks current schema/lifecycle/quarantine/human-action/origin/revision and Source/Input pointers. Original provenance and dependency collections are sealed by count plus every primary row; linked Input block/state metadata is sealed too. IndexedDB physically returns each entire Entry/Input row: its body/title/note are immediately discarded by the fixed internal projection, never retained, hashed, returned or used to calculate activity. The existing private repository budget charges the physical row bytes. This is not a claim of physically body-free IndexedDB I/O, and introduces no public arbitrary-field reader or processing grant.

## Atomicity and read-set closure

The activity capability is ephemeral and bound to the exact service, original transaction and Topic. The final original repository fence checks descriptors and member rows/counts, complete original index output, selected Input metadata, Source closure, root/filter/gate/library facts, Memory negative witness keys and facts, expected Topic metadata and the independent genuine processing facts. It predicts only the original writer's exact counter advances; it does not accept a new post-mutation baseline.

The original library owner legitimately invalidates the Topic index after the lifecycle callback. A private observation in `thought-read-index.js` records the exact next image only from the original `invalidateThoughtTopicIndex` computation before its put. A cloned/boolean capability cannot manufacture that observation. Original before-image mismatch, repeated invalidation, missing original invalidation and a late changed `buildingGeneration` fail closed. This avoids either ignoring the building state or rejecting the legitimate original invalidation.

The optional original writer path installs the private repository4096-reference /2MiB /30-second work envelope on the **first line of its execution transaction callback**, before the original publication prelude and operation receipt read. The original `operation → foundationWrite → write` chain passes a detached descriptor-validated numeric configuration; the Library override preserves it. No initializer callback is accepted, limits can only tighten, and getters are rejected without evaluation at each entry. Default existing callers remain unbounded exactly as before. It meters actual repository operands/results, cursor rows and terminal reads, not public metrics. Earlier Foundation initialization, request hashing and separate preparation transactions remain outside this execution-transaction envelope; the genuine issuer/preparation guards remain separate. Storage payload accounting is not a browser-heap or disk-byte guarantee.

The earlier91/91 candidate registered inside the lifecycle callback and missed prior receipt payloads. The final version moves registration before those reads. The first new budget run1/3 exposed the existing Library override dropping the new option; its exact one-line forwarding fix led to3/3 and then142/142 owning. The final144/144 also includes descriptor-safe upper-entry checks and partial batch settlement.

The existing journal retention owner used a raw cursor. For this new automatic path only, `journal` explicitly selects `pruneEntity(...,{bounded:true})`: original repository pages of100, same newest-first ordering and unchanged `revisionShouldPrune` rule. Default callers keep the original path. Reading retained journal rows here is the existing writer's retention work, not additional activity evidence and never returned by the evaluator. The tests compare more than two pages against the original pruning result, and prove a huge retained row or a failure after a real deletion rolls every table back.

## Settlement and close

Each selected Topic is a separate original atomic transaction; the selected batch is not one all-or-nothing transaction. Stable original operation IDs are mandatory for replay. Actual commit followed by lost delivery is resolved by replay of that same original receipt, with no second history or mutation. A restarted consumer can receive the prior observation time to reject a backward clock. An already dormant Topic with a new action defers without another receipt.

`close()` stops subsequent dispatch. It does not cancel, race, or claim rollback of an in-flight original transaction; the consumer reports its real completed result. Processing revocation is independently enforced by the original issuer/fence. Failures are not automatically retried with a different operation ID. A non-deferral exception retains its original error code and carries `partialResult`: earlier settled receipts, the current original operation ID marked `unknown`, and later IDs explicitly not attempted. This conservatively covers lost delivery after a real commit as well as a real storage rollback; it never labels the whole batch unwritten. The two-Topic test proves first committed state survives a second original execution-transaction storage failure.

A prior Topic commit may invalidate another prebuilt activity projection through the original global root authority. That later item truthfully defers until an independently authorized projection owner prepares current metadata; this consumer does not silently rebuild whole-Topic evidence.

## Evidence

See `work/topic-lifecycle-local-consumer-20261023/` and its SHA256 manifest for exact commands, runtime, file hashes and raw TAP files. All runs use Node22.23.3, macOS and the existing synthetic fake IndexedDB harness; no native browser, real Source, cloud, build, large seed or model call was made.

Historical results are retained separately:

- `first.tap`:4/13; incorrect index name plus premature fault injection and fixture qualification mistakes.
- `diagnostic.tap`:0/1; raw error identifies the nonexistent index. Diagnostic-only stack output was removed from runtime.
- `second.tap`:9/13; the original private budget rejects the test's early data-method replacement before its intended fault site.
- `third.tap`:13/13 after the fault is installed following original budget registration; faults must actually fire.
- `owning.tap`:76/76 original lifecycle file plus new tests at that stage, before later negative-witness/index-closure additions.
- `final-extra.tap`:22/22 after Source existence, Memory key-set and dormant/no-new-receipt closure.
- `exact-index.tap`:23/23 including exact original index invalidation and late generation refusal;205-row pruning retains the same25 rows as the old owner.
- `topic-source-closure.tap`:2/2 actual Topic Formation two-Source versus one-Input scope, unchanged positive and extra Source deletion rollback.
- `settlement.tap`:2/2 lost delivery and close during original commit.
- `member-source-baseline.tap`:0/1 fixture TypeError from an omitted sourceRecordIds array; retained separately from the product failure.
- `member-source-original-fail.tap`:0/1 actual incorrect commit after a moved member Source disappears.
- `member-source-fixed.tap`:1/1 corrected real Source rollback.
- `member-closure.tap`:7/7 member Source, Entry revision/admission, provenance/dependency same-count drift, linked Input metadata and unchanged real-owner positive.

The intermediate combined owning result in `final-owning.tap` is91/91, before execution-entry budget and partial settlement changes. `entry-budget-focused.tap` is1/3 (missing Library option forwarding), `entry-budget-fixed.tap`3/3, `entry-budget-owning-final.tap`142/142. `partial-settlement.tap`1/2 used a too-late fault site: second projection correctly deferred before reaching backup finalization; the corrected second original write admission fault and zero-accessor check are2/2 in `partial-settlement-fixed.tap`. The final four complete owning files are **144/144**, exit0, no fail/cancel/skip/todo, **3121.281ms**, in `reviewed-owning-final.tap`; it remains a local synthetic milestone, not product-wide, native, cross-platform or production lifecycle certification.

## Remaining integration

Production activation still needs the approved versioned policy, explicit selection owner, Source/processing/read authorization and a scheduling/settlement owner with stable operation identities. No default threshold is inferred from the old proposal. Missing completed activity projections remain a truthful deferral; preparing new whole-Topic evidence is not authorized by this consumer. Sync-installed lifecycle publication is a separate original journal integration gap. Native and eventual production qualification remain separate milestones.

## Exact additional owner changes

Besides the three new lifecycle modules and the fixed internal `topic-lifecycle-entry-metadata.js`, the existing implementation changes only `topic-lifecycle.js`, `thought-read-index.js` (original private invalidation observation), `thought-journal.js` (explicit option forwarding), `ia-store-owner.js` (opt-in bounded pruning), and the existing `indexed-store.js`/`thought-store-owner.js`/`library-documents-owner.js` execution-entry budget forwarding chain. No runtime defaults, background, workflow, schema, UI, provider or Source-processing authorization are changed.
