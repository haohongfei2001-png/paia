# Finite original Source purge and portable negative intent

Baseline: `5d77a349703dcbdffa16c480aa0c8879acba08dc`. This is an opt-in local implementation, not an enabled provider, production deletion, or a claim that the whole Sync plan is finished.

## Actual consuming closure

`SourcePurgeJournal` is explicitly injected into the original store. The original Source purge retains its complete B-02 admission, Chrome recovery checks and canonical writer. The selected protocol must be exactly one original seven-operation Source bootstrap, with every current head, sequence, receipt and projection validated against the original Source plan. The local canonical Source may have untouched automatic derivatives; human-edited Input or human-confirmed AI derivatives still refuse with all tables unchanged.

In the original purge transaction, before its canonical cleanup, the journal writes a bodyfree deny and uses the original Core to redact all seven retained protocol payloads and remove their old outbox entries. Seven user purge operations and one bodyfree `sourcePurgeIntent` replace them. The intent binds the complete original seven operation identities, digests, producer sequences, exact entities, source identity, and new purge operations. It contains no Source text or retained before-image. The generic Core cannot receive or manufacture this mutation without the exact original-owner private transaction binding.

The first write-transaction query is covered by the repository's private 4096-reference / 2 MiB / 30-second work budget. Resetting public metrics cannot reset it. Original complete admission collections use the repository's metered streaming `all` form; original collection-size rejection and human protection remain. Full expected protocol state is computed before the new writes. Exact final raw-read fences bind protocol rows and negative-space count, authority, canonical Source absence, original tombstone, and the original maintenance job, invalidation, Input state and epoch. Original maintenance expected rows are captured immediately before their actual puts; transaction bindings are removed in `finally`.

Actual consumers tested:

- Original immutable publication sends the old Source to B; A purges; the eight bodyfree operations are published and consumed by B and cold C. No receive echo, exact duplicate ACK is idempotent, and the old bootstrap cannot recreate Source.
- The explicit negative-intent checkpoint reuses the original immutable encoder and reader with a detached validated cut. Cold D validates without database writes, activates the denial, re-exports it, and cold E consumes it.
- A device that has received this denial rejects an earlier grouped Source checkpoint before persisting body-bearing stage rows. The coordinator patch is mandatory integration work, not included in this commit's runtime path. Root's newer `stageCanonicalGeneration(proof)` must invoke the same guard before each stage-writing transaction and before its first stage write.
- Original import preflight made before purge cannot reintroduce the Source when committed afterward. Re-capture under the opted-in original bootstrap owner explicitly refuses; it is not reported as a silent successful no-op.
- A pure-AI dependent Thought becomes unavailable through the original tombstone fence immediately, and the original resumable `drainPurgeCleanup` later removes its Thought/history rows. Human protection still refuses.

## Resource and outcome boundaries

All resident `bns:v1:` rows, not just the active namespace, are audited. Other datasets/namespaces, staged `groupItem`/inbox copies, unknown protocol rows, and unconfirmed/prepared publication state cause a complete refusal. A fully confirmed original publication may retain validated bodyfree object references and receipts. This package does not claim to erase refused copies.

Local protocol redaction and the original Source tombstone/maintenance enqueue share one transaction. Canonical derivative/history physical removal is deliberately the original later resumable cleanup; this report does not call it atomic physical erasure. Deleting the real cleanup job at the transaction tail was demonstrated to leave the initial implementation incorrectly successful (0/1); the final prewrite-observed job/event/state/epoch fence rejects that drift and rolls back every table.

Negative checkpoints have a private cumulative 4096-reference / encoded-plus-decoded 2 MiB / 30-second deadline for reading or writing transport objects, with lower-only constructor limits and the fixed original segment profile. Oversized returned bytes are refused before the original reader copies them. A held transport operation settles the public deadline and cannot publish a late stage proof or start further object calls. Underlying I/O cannot be canceled by this interface; a timed-out immutable put may have persisted remotely and is not called rolled back. Ref identities are detached at entry and separately copied for transport. A failed or newer stage invalidates the old pending proof.

Remote immutable objects containing old Source bodies are **not physically deleted**. Devices that have not yet received the negative intent, including completely new offline devices, are not claimed protected from old remote cuts. This is not a remote GC lease, account authorization, encryption policy, or arbitrary Source graph purge. The selected closure permits one bootstrap, not appended Sources, saved typed history, multiple Sources, all other current namespaces, or arbitrary restored populated libraries. Those remain continuous implementation/qualification work; they are not silently deleted or accepted.

## Verification and preserved failures

Node 22.23.3 from the previously verified isolated runtime; Python 3.12.14 selected explicitly. Local fake IndexedDB only. No browser, build, cloud, Full, actual user data, remote deletion or account access.

- Original canonical purge + new expected protocol outcome: 0/1 retained (`source-purge-baseline.log`), showing seven old body-bearing outbox operations remained.
- First producer/guard tests: 3/3. First receiver fixture incorrectly treated an async iterator as its return value: 0/1, corrected actual original publication consumer 1/1.
- Early checkpoint syntax failure, null recovery-epoch overrestriction, and illegal private-budget registration on a readonly transaction are retained separately. Their corrections use original contracts; no guard was weakened.
- First complete new owning file: 14/14, 1308.208875 ms.
- Actual cleanup-tail deletion: 0/1, retained before its fix.
- Expanded owning: 21/23. Two test-fixture mistakes were corrected separately (original re-capture correctly throws; outbox physical order is operation ID, not sequence). The two corrected cases: 2/2.
- One combined run of eight owning files: **165/165**, no fail/cancel/skip/todo, 5035.016083 ms. Files: new Source purge, original Core, Source bootstrap, checkpoints, grouped checkpoint restore, publication, Source purge admission and import ledger.
- Subsequent review added exact transaction observer cleanup and transport-ref alias protection: final new owning **28/28**, no fail/cancel/skip/todo, 2182.082208 ms. Two new tests cover oversized host-mutated ref without `slice` and duplicate Input-state observer rejection. This is separate from the earlier combined run, not a retroactive 167-case combined result.
- Last static boundary tightening validates parent/reference shape before copying; no execution or supported behavior changed. `git diff --check` passed.

Independent reviewer `/root/acceptance_audit` read the final finite chain and reported no remaining blocker in that scope, without repeating tests. The broader plan, native qualification, remote physical retirement and default readiness remain distinct.

## Integration

Commit the new modules and narrow original-owner/codec/Core seams. Do not commit or copy the whole temporary `group-checkpoint.js`: it also contains earlier saved-group wiring already integrated by root. Apply only `source-purge-coordinator-only.patch`, then place `requireNoSourcePurgeDeny(live,t)` in root's new canonical-generation stage transactions. `source-purge-vector.json` identifies the exact locally tested coordinator and all runtime sources. Root owns resolving these coordinator points and subsequent native milestone verification.
