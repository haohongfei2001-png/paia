# Canonical generation streaming continuation — 2026-10-23

This is the implementation contract for the next work package, not a completed scale certificate. Read against `b7f9e87a` and the root's separately owned original coordinator integration. The bounded consumer now authenticates pages, persists resumable state and invokes the original full-graph compiler. It deliberately does not turn an over-budget full graph into a successful restore by restarting the same budget for pages.

## Confirmed remaining barriers

| Existing owner | Current invariant and consequence | Required change owner |
| --- | --- | --- |
| `group-checkpoint-plan.js: prepareGroupCheckpointPlanInternal / finishOriginalCompiledGraph` | All operations, revision and operation IDs, device sequences, parent edges, group claims, unique entity heads and topological order are evaluated together. `size` remains bounded by `CORE_LIMITS.batchBytes`. Compiling independent pages loses cross-page duplicate, ancestor, head and dependency validation. | Original graph owner; a new persisted graph profile, retaining the existing bounded compiler unchanged. |
| `human-library-group.js: prepareHumanGroupApplication` | Captures the actual initial Human inventory, requires it empty, prepares all named Human steps and mappings, and preplays their allocation/counter state in one future view. Calling it after the first committed page is not a safe continuation: the original empty-state prerequisite no longer holds. | Original Human application owner; private one-step restore capability tied to a complete graph and durable canonical cursor. |
| `human-library-plan.js: humanInventory / captureHumanGraphReadSet` | Every Human table and metadata prefix is capped at 128 and retained as arrays. This is an independent barrier even if write transactions are split. Merely raising this guard or cloning a virtual repository is not an implementation. | Original named Human plan read-set owner; bounded exact current reads appropriate to the next named operation, with original before/after/protocol/mapping checks. |
| `group-checkpoint.js: activate / requireCommittedPlan / requireGroupScope` | Canonical materialization, protocol effects and final complete inventory checks currently occur in one write transaction. Rechecking the full graph in a final transaction recreates the 4096-reference / 2 MiB limit. | Root coordinator plus original scope owner; phase receipts and independently bounded final inventory certification. |
| `canonical-generation-publication.js` and `idb-repository.js` | The current generation gate fences participating adapter transactions only. An existing direct repository writer can bypass it. A final canonical scan proves a settled transaction cut, not that a raw writer cannot modify that generation before later reserve/publication. | Repository/factory integration, coordinated with its current owner; mandatory gates for registered shadow repositories before large staged certification or application switching. |

The observed 65-Human activation and 129-Human staging resource failures remain distinct. No local timing or small graph pass changes either result.

## First executable slice: original Human group steps in an invisible target

Keep the complete bounded graph compiler for this slice. This isolates transaction continuation from the separate unbounded-graph problem and gives a real cold-restart test without claiming support for graphs rejected by the original compiler.

Proposed fixed original-owner interfaces (not yet implemented):

1. `prepareOriginalHumanGenerationStep(store, replayCore, generationProof, cursor)` reads the next complete Human group from the already verified graph. It binds target generation, original manifest/digest, source base, replay namespace, expected cursor, group ID, dependency receipts and original restore epoch. It reconstructs the descriptor with `restoreHumanRequest`, binds the original allocation events through `bindHumanReplayEntry`, and calls the corresponding original named planner against the actual current target state. It must not use a caller-supplied reducer, before/after DTO or transaction facade.
2. `applyOriginalHumanGenerationStep(t, capability)` rechecks the original named read set, prior mappings, original protocol ancestry and dependency receipts; calls `executeHumanPlanInTransaction` inside `core.commitHumanReceive`; verifies actual original owner receipts and mappings; and writes the next durable cursor/step receipt in that same transaction. A lost return is resolved by that exact receipt; it never blindly repeats the owner mutation.
3. `requireOriginalHumanGenerationStepReceipt(t, proof, expectedIndex)` verifies the committed group/protocol/mapping/owner receipt relationship and original generation identity. An unrelated operation receipt with a matching label is insufficient.

The existing `prepareHumanRestoreProtocols` verifies a complete protocol graph at once. A single-step variant must be added inside that original owner, use the private complete-graph proof, and retain its original ancestry checks. Passing a one-element array to the old complete-graph preparer is not a substitute.

Start with source-free authored Entry creation/editing, whose existing original named plans read a finite exact per-entity set and whose original allocator is already replayable. Retain refusal for Source-linked or broad membership operations until their named prerequisites are included. Then expand using their original owners, not a generic row copier. A small test must contain at least two real groups, a restart between commits, one lost reply, late same-key canonical/protocol drift, allocation mismatch and a failure that leaves the previously completed target pages intact but unpublished.

The target remains invisible throughout this sequence. Publishing a partially completed target, returning success after only the latest page, or changing the existing active generation is forbidden.

## Full graph continuation after the first slice

The new graph profile needs durable exact indexes, each populated only from the original authenticated immutable stream:

- Revision ID, operation ID and `(deviceId, sequence)` uniqueness records.
- Group membership claims; descriptor-to-member references; exact parent and cross-owner prerequisite edges.
- Per-entity head candidates, device frontier/ranges and original manifest coverage.
- Deterministic topological order using the original dependency rules, including the Human-before-non-Human and Source-linked exceptions. A page boundary cannot select a winner or discard an unresolved edge.
- Complete verification and applied-step receipts bound to a phase ID, original manifest, source base, target generation and the exact prior phase receipt. Persisted digests summarize authenticated rows; they do not replace validation of those rows.

This requires a new original graph constructor, not a general caller-configurable graph engine. Every phase has its own explicit identity, bounded retained working set and physical transaction limit. An aggregate ledger records total input bytes, references, groups, dependencies and completed phases against an explicit selected profile. That profile and its overall stop conditions must be frozen before implementation and testing; this document does not silently replace the existing full-call 2 MiB budget with an unlimited job.

## Mandatory shadow-repository gate before staged final audit

A per-phase certificate is safe only while all writers to the shadow generation are accounted for. An optional application adapter cannot supply this guarantee. The repository owner must register the actual native DB identity and enforce its phase at the first query of every write transaction on that registered shadow repository; default unrelated repositories keep their original behavior.

Normal original owners may mutate a staging target under the coordinator's private step qualification. Sealed/retired/deleting targets reject ordinary writes. Only the fixed publication owner can perform its exact gate transitions. A transaction opened before a phase transition must recheck the gate at its true final fence. The canonical write revision advances with every actual owner transaction, including direct original Core paths. The exact API must preserve the original transaction identity and cannot depend on a mutable global flag or browser-wide asynchronous ambient context.

This will require narrowly coordinating `idb-repository.js`, original Core transaction entry points and the root restore coordinator. Current `indexed-store.js` Source-purge work remains independently owned. No shared file is changed by this design document.

After gate enforcement, a target can enter a privately reserved verifying phase, reject new canonical writes, and certify its inventory in bounded stages against the same fixed write revision. Publication consumes the complete certificate and original canonical receipts, not arbitrary caller digests. Crash recovery resumes or invalidates a precise phase; it never recaptures a newer source base. Active-generation deletion remains forbidden.

## Integration and validation order

1. Freeze the root's bounded original-owner consumer, including actual restore → seal → reserve → recover and failure receipts.
2. Add the original Human single-step continuation and small cold-restart/rollback tests under the old complete-graph bound.
3. Integrate mandatory shadow writer gates and prove old in-flight/direct writers cannot escape the terminal fence.
4. Add the persisted original graph compiler and explicit aggregate profile, then incremental canonical certification.
5. Execute the previously failing finite 65/129 synthetic qualification only once the relevant barriers are actually removed. Larger seeds, new cloud/Full runs, real accounts, paid calls and deployment remain outside this work package.

No browser/native/scale test was run to write this document. Source findings are static and identify concrete existing owners, not measured performance improvements. Application-wide generation selection, chrome.local control migration and real user-data recovery remain additional integration milestones; no cross-database atomicity is claimed.
