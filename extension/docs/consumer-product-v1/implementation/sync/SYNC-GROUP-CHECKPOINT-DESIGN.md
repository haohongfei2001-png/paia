# SYNC-01 bounded grouped checkpoint activation — design and executable audit

Base `e7c279ae` (032 future integration), branch `codex/group-checkpoint-design-20261009`. Design/test audit only. No runtime implementation, browser run, schema change or activation is authorized by this document. Root and an independent reviewer must approve the interfaces below before implementation.

Live remote main was read as `1b06ffc2ad0ed91475fefc99772c3a4351649004` (0.30). Its `checkpoints.js`, `canonical-readiness.js`, BNS contract and plan match this candidate byte-for-byte. Source bootstrap/append in this candidate are later independently reviewed local slices, not a claim that remote main already has them.

## Goal: a vertical restore slice, not another single Source codec

An empty synthetic installation consumes only actual checkpoint objects and a verified causal tail to recover **all populated state in the admitted owner scope**, then atomically exposes it. Select the existing initial Source/bootstrap, same-conversation append, wrapped Working/history/Keep, standalone Keep where compatible, manual Prompt, manual Info/Rules/Now and supported four-card desired values together. Unsupported populated state refuses construction/activation; no whole-library readiness claim. No account/provider, production registration, permission grant, new object store or second canonical writer.

BNS_CONTRACT §§04–05 and BNS_PLAN §3 outcomes1/3/5 and Exit govern: complete references, exact receipts and gaps, preserved intent, canonical+protocol atomicity, fresh-device complete declared scope. A local core proof does not close real-provider/device or full canonical coverage.

## Actual executable gaps

`tests/browser-native-sync-group-checkpoint-audit.test.mjs` calls current production APIs on synthetic real repository owners:

1. Actual Source capture→`buildCheckpoint`→empty B `stageCheckpoint` fails `BNS_SOURCE_BOOTSTRAP_REQUIRED`; activation remains NOT_READY and canonical/active namespace unchanged. Original proposed-success negative is retained in `/tmp/group-checkpoint-before.log` (one FAIL). The committed audit asserts this existing refusal; it is not a newly passing restore implementation.
2. A controlled protocol-only stage using the actual private-capability complete receive primitive acquires receipts without a canonical callback. Calling that same primitive for activation returns duplicate and executes zero callbacks. This is an interface audit, not a production bypass claim: current generic staging correctly rejects the family before that path. It proves why registration of whole receivers as per-row owners is insufficient.
3. A real **unbound ordinary capture** gives one canonical Source but `buildCheckpoint` produces empty coverage/itemCount0: protocol export alone is not canonical coverage.

All three audit assertions PASS in `/tmp/group-checkpoint-audit.log` (152.663583ms). No restore completion is claimed. The initial failing log is preserved, not converted to feature success.

## Existing owners and refusal boundaries

`buildCheckpoint` already writes bounded immutable shards/chunks, exact chain/count/coverage, all retained protocol revisions/heads/frontiers and sparse causal information. Keep those checks. It does not inventory unjournaled human state.

`StagedSyncRestore.add` sends each revision through generic Core.receive; grouped Source/Working families intentionally refuse. `reconcileTail` has the same issue. `activate` loops individual head callbacks, not logical closures, and caps heads at128. Directly reusing public receivers would nest repository/store queues, see pre-existing stage receipts, require missing canonical state during async qualification, or apply a partial shared-document group. None is an acceptable fix.

Existing `manualSyncOwners` restores Prompt and manual Info/Rules/Now using their domain materializers. Desired values have a separate scoped owner; effective grants and local acknowledgements remain excluded. Keep manual namespace/restore-epoch validation and Context continuation proofs. Existing Prompt-only restore API and its regressions stay unchanged unless explicitly selected grouped mode is used.

Thought/Topic/Section/Placement, protected AI artifacts, Source user facts/removals and non-initial captures, human document-title revisions without a portable journal, unsupported old Working/history identities, Context automatic/Topic desired and explicit portable preference dual-store ownership remain incomplete. A populated unsupported owner must block the selected complete checkpoint, even if its count is absent from current protocol heads. Derived search/UI/device geometry/credentials/external grants are excluded by existing authority, not silently represented as restored.

## Required producer scope proof (not merely a readiness boolean)

Add an opt-in grouped builder using the actual canonical owner inventory and existing repository read transaction. Do not flip `readCanonicalReadiness.fullCanonicalReady` or remove `notYetRepresented` labels to admit this slice.

The selected builder must verify exact current canonical values against the admitted owner history at one bound namespace/protocol generation/backup generation/recovery epoch cut. Counts alone cannot prove unchanged human text. For Source groups this includes current document union and all relevant Inputs, states, retained histories, filter decisions and immutable Source/time. A changed title with no title owner journal, missing Source baseline, default unjournaled capture, extra Thought/Topic object or unsupported persisted preference is a blocker. Legitimate defaults that represent no user state must be explicitly identified by their current owner, not guessed from empty protocol coverage. No fallback exports all meta rows.

Proposed manifest addition: required `ownerScope:{version:1, profile:'bounded-admitted-local-owners', families:[...exact inventories/counts/digests...]}` for **grouped mode only**. Its bytes participate in the manifest hash. Current old reader's exact manifest-key validation must reject the entire new manifest before staging any item; prove with frozen actual reader. Old Prompt-only manifests retain old behavior but cannot enter grouped full-scope mode without this proof. This is a proposed wire manifest extension requiring review, not an IndexedDB schema change or silent loosening of existing `validateCoverage`.

Construction starts by capturing current authority before the first transport/hash await, and rechecks the same cut before publishing its final manifest. Provider acknowledgements and sync account identities are not invented. The proof certifies only the locally audited declared scope; it cannot cryptographically certify truthful third-party provenance.

## Two protocol namespaces; one canonical writer set

Use separate **inventory stage** and **activation replay** namespaces in existing Core meta. Neither is a second canonical store. A persisted restore record binds both namespace IDs, manifest ID, original live namespace/generations/recovery epoch, scope proof, validated graph digest, progress and outcome. IDs are generated once and collision-checked; retries never allocate a different replay namespace to guess success.

Why two: inventory stage contains the final verified checkpoint graph/receipts. Replaying canonical owners against it encounters duplicate receipts or final heads ahead of the intermediate canonical values. A distinct initially empty replay namespace lets the original transactional owner operations establish their real receipts, heads, canonical state and materialized proofs in order. Only this namespace becomes active after all groups and final-state checks succeed. Inventory-stage receipts are explicitly **staging evidence**, never an acknowledgement of canonical materialization or an uploaded frontier.

Inventory stage ingestion is opt-in, namespace-restricted and protocol-only. Do not disable generic receive's new-family rejection. Admit a complete validated group through a new private staging capability; hold incomplete refs durably under the restore namespace without canonical writes, using existing bounded checkpoint structure/progress, not a new transport inbox. Unsupported families, missing parents and malformed closure prevent VALIDATED. Redacted/purged cases without an admitted domain deletion owner refuse; do not discard tombstones to make the scope fit.

Checkpoint base plus tail must be validated together. Any tail modification invalidates the compiled activation plan. Build an exact dependency DAG over immutable operations/logical groups: initial bootstrap precedes append references, Source creation precedes Input Working/Keep, and every entity revision parent precedes its descendant. Full exact descriptor members are indivisible. UUID/device arrival order and wall time are not causal order. Each operation occurs once even if referenced by multiple groups. Reject cycles, conflicting same-Source identities, missing parent/ref, unresolved unsupported siblings and unsupported mixed standalone/wrapped ownership.

## Bounded activation plan and real transaction seam

Retain current128 activation limit; additionally bound **all unique replay operations including ancestry**, not only live heads, to `CORE_LIMITS.batch=128` and aggregate canonical encoded operation bytes to `CORE_LIMITS.batchBytes=4MiB`. These are reused conservative local-slice admission limits, not a protocol capacity claim. A dataset exceeding them returns explicit RESOURCE_LIMIT with canonical/active namespace unchanged; do not truncate or invoke sequential visible transactions. Larger bounded-generation restore remains future work and requires independent budget evidence.

Decode/hash/Source-body validation and immutable group preparation happen outside the activation IDB transaction. Memory includes decoded input plus prepared clones and verified Source material; measure actual peak/time against operation/byte bounds using synthetic near-cap cases before claiming responsiveness. Do not invent a transaction timeout or silently increase native/CI budgets. If the existing caps exceed a safe transaction budget, reduce this profile with measured explicit refusal rather than claim arbitrary whole-device restore.

Public `receive()` is not the activation callback. Refactor only the existing domain receivers to expose module-private or trusted coordinator-only **prepare/validate plus apply-in-this-transaction** seams. Public live receive still uses these seams with its original authority checks and behavior; no second merge/write algorithm.

Required integration points:

- Source bootstrap/append retain their exact private entity plan and `applyInitialSource`/`applySourceAppend` trusted writers, document union verification and original baseline/local-sequence remapping. During activation their complete group applies against the fresh replay Core, not against inventory receipts. Append revalidates original seven committed anchor proofs, which bootstrap already established earlier in this same transaction.
- Working/history/Keep retain exact history continuity, source closure, source-user authority, local mapping and `applyRemoteWorking`. Split async validation from transactional validation without weakening either. The current `FilterIntentSyncJournal.qualify` reads Source before digest work; during restore the Source is not yet canonical. Add a **private restored-Source proof** derived only from already cryptographically validated bootstrap/append plans and exact closure bytes. In the transaction, after actual Source creation, the original source/current checks must compare canonical bytes to that proof. No caller-supplied hash/boolean can replace Keep eligibility, no network/crypto awaited in live IDB, no pre-activation Source writes. This is a necessary interface change, not permission to accept unknown Source.
- Prompt/Context/desired owners are bound to the replay Core and called through the existing typed domain materializers as each causal operation applies. Their real materialized revision/epoch proofs are built progressively, avoiding final-head-only129+ ancestry assumptions. No effective external access/global acknowledgement is restored. Unsupported aggregate purge or conflict remains a blocker.

The coordinator uses one existing store.run and one repository transaction for the bounded activation. Inside it recheck original live namespace, protocol and owner generation, actual fresh-target inventory, consent/current restore epoch, capture exclusions/deletion fences, and staged graph generation/digest. Recheck pending/publication constraints. Replay all prepared groups/operations using existing owners with origin remote and no outbox. Validate final head/frontier equality with the inventory cut, exact declared canonical state (only documented local sequence/epoch mappings may differ), retained tombstones and absence of unaccounted members. Then write the active namespace pointer and an exact manifest/graph outcome receipt in that same transaction. No canonical content is visible before commit.

Initially the target must be actually empty of portable canonical user state (explicit owner defaults allowed), not merely an empty protocol namespace. Existing human data is never replaced by this slice. Any local edit/new capture/restore during staging or pre-activation planning fails the final cut. Existing Prompt-only nonempty-target restore remains separate; this new path does not relax it.

## Recovery, unknown ACK and cleanup

A crash during inventory staging resumes from existing exact item progress and revalidates fetched objects/graph; no canonical changes occurred. A crash during activation leaves either the unchanged live target or the entire new canonical state plus active pointer/outcome receipt. Unknown activation ACK reopens the same restore ID and verifies manifest/graph/namespace outcome; it must not replay canonical callbacks or allocate new baseline IDs.

The duplicate outcome path still checks current binding and cannot reactivate an old namespace after a subsequent local restore/account namespace change. It reports the already committed outcome without overwriting later lawful edits. A collision under the same restore/manifest identity is rejected. Faults in any Source/Working/Prompt/Context write or final switch roll back every canonical/protocol row. Inventory/replay cleanup is bounded and only deletes inactive namespaces after verified outcome/abandonment; no TTL or deletion of the only recoverable protocol graph. Cleanup implementation is not a prerequisite to silently grow persistent usage: admission must account for both bounded namespaces and refuse overflow.

## Negative-first implementation acceptance after design approval

1. Extend the existing audit's real capture checkpoint to the full admitted synthetic portfolio: initial Source, append, two sequential/bilateral Working edits, standalone Keep on a different compatible Input, manual Prompt and Info/Rules/Now/desired. Build through actual producer journals; B starts from owner defaults with different local counters and receives only hashed checkpoint/tail objects, never copied canonical rows.
2. Shuffle descriptor/member/parent arrival; restart mid-stage; before activation all canonical stores and active namespace remain unchanged. Complete graph restores once with exact bodies, Source/time/baseline identity, history/Keep and manual states; external grants remain off. Actual saved protocol heads/frontiers match producer's admitted cut.
3. Tail newer than checkpoint and conflict/missing-tail tests; stale prepared plan rejected. Actual same-value backup restore and new local edit between first fetch and final activation reject without clobbering.
4. Stage receipts cannot cause no-op canonical activation; duplicate final ACK after worker restart executes zero new writer callbacks and preserves later legal edits. A graph/outcome collision is not accepted as duplicate.
5. Fault inject after each domain write and immediately before/after active-pointer write within the transaction; verify full rollback and deterministic same-ID retry.
6. Deleted Source, current tombstones, restrictive capture policy/consent, detached Input, changed proof epoch, unknown history/unsupported conflict/purge, malformed/colliding group/ref, missing one member and stage generation mutation all refuse.
7. Exact128-operation/4MiB profile boundaries and over-bound rejection; include few heads with many ancestry revisions so head-count-only bypass is caught. Measure actual allocation, read/write counts, activation time; report caps as limited local profile.
8. Producer populated unjournaled Source, human document title, Thought/Topic/Section/Placement, protected AI or unsupported preference must block whole declared-scope construction; reader unsupported ownerScope/family must block activation. No success with silently omitted rows.
9. Original Prompt-only checkpoint/manual owners, Source/bootstrap/append, Working/inbox and deletion gates retain whole-file regression coverage. Source/release native proof follows stable independent review; no real provider is needed or implied.

## Proposed future ownership, not present modifications

`checkpoints.js` opt-in grouped staging coordinator/manifest proof; `core.js` private staging/replay capability; new `group-checkpoint-plan.js` for bounded graph orchestration (no domain writes); minimal private seams in existing Source bootstrap/append, InputWorking receiver and FilterIntent journal; actual typed manual owners/desired only if their existing APIs need transaction binding. Canonical coverage inventory should extend `canonical-readiness.js` through a separate exact scoped proof result, preserving its conservative fullCanonicalReady result. Dedicated audit/owner/native and receipt. Root owns CI/version.

No new schema/object store, worker/UI/settings entry, provider, account, permission, arbitrary meta export, unbounded restore, second canonical body store, or duplicate domain materializer. The wire ownerScope extension and two-namespace lifecycle need explicit design approval before runtime work.
