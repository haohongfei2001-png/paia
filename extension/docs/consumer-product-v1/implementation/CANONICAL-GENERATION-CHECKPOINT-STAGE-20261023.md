# Canonical generation checkpoint stage — 2026-10-23

## Status and exact scope

Base `213ca770`: original generation publication foundation. This candidate adds an explicit shadow-generation checkpoint consumer and the fixed original coordinator sealing seam. It is not a default application database switch, a new Sync grant, or proof that scale recovery is solved. Root owns the separate `GroupedCheckpointRestore` integration; its tests and original-owner canonical materialization must be reported separately.

The consumer uses original `readObject`, `checkpointItems`, `assertGroupedCheckpointManifest`, and `validateGroupedCheckpointGraph`. Immutable transport authentication alone is not graph validity. A valid newly encoded checkpoint with one actual Source bootstrap member missing authenticates transport but is rejected by the original complete graph validator.

## Durable stage and authority

`CanonicalGenerationCheckpointStage(publication, handle, { store, core, checkpoint })` accepts an original publication handle and matching original store/core repository. It never creates canonical Input/Source/Topic/Entry rows. The optional checkpoint callback observes only a committed page index and received count; it grants no reads or writes.

- `begin(ref, get)` detaches the ref before the first await; captures the publication source root and active gate before the first immutable read; authenticates the manifest; persists the exact original encoded manifest bytes, parsed manifest, ref and source base.
- `stageCheckpoint(ref, get)` authenticates the complete original immutable chain, persisting at most 32 items and one exact page receipt/cursor per original bounded transaction. A lost return or interrupted page resumes by replaying and comparing the original immutable chain; already committed items are never silently replaced.
- `validate()` reauthenticates durable manifest bytes through the original hash/codec/length decoder, verifies every item/page key and digest chain, then invokes the original complete graph validator. It rechecks the original begin source base and mints a private in-memory proof only after the exact durable state is committed.
- `readCanonicalCheckpointProof(proof, {store, core})` returns a detached frozen packet: manifest ref/manifest/items, complete graph digest, state key, generation identity and original source base. A caller-created object or foreign store/core is not a proof.
- `requireCanonicalCheckpointProof(proof, {store, core}, t)` checks the original branded transaction, exact state/items/pages/gate and complete prefix membership. Original final read fences seal every point and prefix count. The proof expires after 30 seconds; that is a proof lifetime, not a claim that all preceding work took less than 30 seconds.
- `requireCanonicalCheckpointProofForSeal` (and the fixed coordinator alias `requireCanonicalCheckpointInputProof`) checks the same initial gate and all proof facts. Its terminal fence excludes only that gate; the fixed publication owner writes and seals the exact successor gate in the same transaction. It conveys no independent writer capability.

`captureSourceBase` compares the original registry and active gate; a resumed stage cannot refresh an earlier source baseline after publication or an observed active write. The trusted seal capability carries that baseline into `reserve`, which rejects a changed registry or old-generation gate. Adapter-controlled old in-flight writes remain governed by the original foundation retirement/invalidation protocol.

## Fixed original coordinator integration

`sealOriginalCheckpoint(handle, restore, proof)` uses a fixed static import of `requireOriginalCanonicalGenerationActivation`; it accepts no caller validator callback or self-asserted graph digest. The original restore coordinator must have privately prepared and activated this proof through its existing owners and receipts. The publication method starts one full-store original target write transaction, registers the private transaction work limit before the first query, invokes the fixed coordinator validation, compares its manifest/digest/identity, and finally writes and terminally fences the sealed gate.

Only an original `SyncError` thrown by that fixed validator is retained and rethrown after the repository has completed rollback. Native/storage errors retain the original repository mapping. This does not modify the repository or suppress failures. In this independent base the new coordinator export is not yet present; the method therefore rejects as unavailable until root integrates its separately owned coordinator. The full original cold-restore/seal path is not counted in this candidate's 58 local tests.

The existing public metadata `seal` remains explicitly metadata-only. It cannot be described as graph validation. Neither method atomically switches `chrome.local` and IndexedDB; no such cross-store transaction exists here.

## Resource contract

Every physical mutation uses the original private transaction limit of 4096 references, 2 MiB and 30 seconds. Each stage call also has one cumulative transport ticket across manifest, all internal/shard/chunk gets and emitted items, for both v1 and v2 manifests; it is not reset for pages. Declared decoded sizes are charged before fetch/decompression, actual encoded bytes are charged, and a held get has a deadline. Late completion cannot append state. A restarted stage replays the full chain under a fresh call ticket and still cannot bypass the original whole-graph bound.

Validation charges each paged row before appending it to its retained array and preserves the original complete graph compiler bound. The durable cursor tracks received count and payload bytes; it is not a claim of unlimited accumulated graph capacity. No limit is increased, no assertion or data is removed, and the known 65/129 scale limitations are not declared resolved. Whole-application writer/factory routing, staged large-graph compilation and canonical generation switching remain separate work.

## Evidence and qualification

Runtime: absolute official Node 22.23.3 on macOS arm64, original vendored fake IndexedDB; only synthetic data. No installation, browser, native service, large seed, cloud, CI, paid model or deployment execution.

1. Initial stage 17/17, TAP 1034.779584 ms (`initial.tap`).
2. Stage 22 plus original foundation 32: 54/54, TAP 1427.028333 ms (`combined.tap`). This predates the manifest identity review correction.
3. Independent review found that changing only durable manifest ref identity could mint a proof. Actual original negative control failed 0/1 with `Missing expected rejection` (`manifest-identity-original-fail.tap`); the repaired control passed 1/1 (`manifest-identity-fixed.tap`). The original failure is retained.
4. Final complete owning pair: 58/58, exit 0, no fail/cancel/skip/todo, TAP 1672.798458 ms (`final-owning.tap`). This includes 26 stage cases and the unchanged 32 foundation cases. Added original gzip manifest positive and durable encoded-byte/manifest/ref mismatch controls.

Coverage includes actual original Source appends over multiple durable pages, interrupted/lost page response recovery, original graph missing-ancestor rejection, forged/foreign proof, pre-proof and same-transaction item/page/cursor/gate/prefix drift, held get deadline/late completion, v1 encoded/decoded resource bounds, original reference detachment, fixed source baseline and restart after publication. Integration through the root's original canonical coordinator, native IndexedDB/browser, Linux capacity and large scale remain distinct qualifications.

Evidence: `work/canonical-generation-checkpoint-stage-20261023/`. `source-vector.json` binds the four source/test files. `SHA256SUMS` covers all retained evidence and this report. Independent static review of the corrected bounded consumer reported no remaining blocker within this explicit limited scope; it did not rerun tests or certify default production activation.
