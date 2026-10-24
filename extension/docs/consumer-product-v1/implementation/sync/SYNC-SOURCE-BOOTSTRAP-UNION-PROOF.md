# Bounded local Source-bootstrap union proof

Base `2f9250fe817dd9eebc0fc1373c05d01dcd7a0ed6`, 2026-10-24. This is the pure
proof/format slice, not by itself a restored, published or released consumer.
The original restore and lifecycle/publication owners must consume it as below.
No native/protected-generation admission is created.

## Existing contract and exact selected scope

`BROWSER_NATIVE_SYNC_CONTRACT.md` BNS-04 requires original operation identity,
complete validation, explicit proven independence, retained siblings and no
clock/arrival winner. BNS-07 explicitly requires merging nonoverlapping operations
from incomparable checkpoints. BNS-08 requires a complete recovery base, bounded
staging and atomic activation without replacing local edits. This slice implements
only the following explicit Source entity rule, not a generic CRDT or a wider
permission rule:

- Exactly two complete Source-bootstrap-only heads, each naming exactly the same
  one direct parent; that complete ancestor and both original manifests/shards
  authenticate through the original protocol reader.
- Every original ancestor operation remains byte-equivalent in both heads. Each
  head contributes a nonempty delta of complete original bootstrap groups. No
  group straddles the ancestor and delta.
- Across all retained groups, source ID, sourceKey, dedupeKey, Conversation ID,
  document ID, Input ID, baseline ID and every typed entity identity are disjoint.
  Original operation ID, revision ID and device/sequence checks still run in the
  original group compiler. Different Source messages in one Conversation are not
  independent initial bootstrap groups.
- Only original `sourceBootstrapMember` and `sourceBootstrapCommit` operations,
  ownerScope v1, nonredacted revisions and the existing small 128-operation profile
  are selected. No append, Working, purge, Human, Context, Prompt, preference or
  redaction is admitted. No timestamp selects a winner or replaces provenance.
- The real writer must require an empty ordinary canonical destination, settled
  original consent/publication authority and no protected-generation marker. The
  pure proof does not certify emptiness or authorize any database write.

Authenticated here means content hashes, schema and dataset checks under the
original caller's provider subject/app-namespace binding. It is not a claim that
Source content is cryptographically signed by its provider.

## Local format, not a remote checkpoint

New module: `core/browser-native-sync/source-bootstrap-union.js`.

The exact LOCAL selection has version 1, kind `source-bootstrap-union`, datasetId,
ancestorRef, two headRefs in ascending original ID order, and selectionId. The
selectionId hashes those other fields. All three references remain genuine
checkpoint-manifest references. The selection has no protocol `id`, manifestId,
manifestRef, synthetic remote manifest or ownerScope v2 identity.

The exact LOCAL receipt has version 1, kind `source-bootstrap-union-receipt`,
selection, three ordered cuts and graphDigest. A cut retains its original ref,
exact encoded manifest bytes using the existing manifest-storage codec, and its
ordered item evidence. Revision evidence records only kind/revisionId; head and
frontier evidence stays body-free. It does not duplicate Source bodies. Each
original cut's own hash chain, manifest digest, count and graph can therefore be
reconstructed from retained original operations after disposable stage cleanup.

This requires a distinct versioned local restore row and local selection-aware
lifecycle state. Reusing the old single-manifest row, changing ownerScope v2, or
pretending selectionId is a checkpoint ID would lose restore identity. Existing
remote manifests and old ordinary single-manifest restore rows remain unchanged.
Older readers must refuse this unfamiliar local kind; they must not downgrade it
or clean up evidence as a single-head restore.

## API and authority boundary

- `assertSourceBootstrapUnionSelection(value)` checks exact structure only. It
  intentionally does not authenticate selectionId.
- `createSourceBootstrapUnionSelection(core, {store, ancestorRef, headRefs})`
  returns the frozen deterministic local identity using the supplied current work
  ticket. It does not prove the selected content.
- `prepareSourceBootstrapUnion(core, {store, selection, get})`, or the equivalent
  ancestorRef/headRefs form, authenticates all three cuts, compiles the original
  complete groups and returns an opaque proof. Caller `get` retains its original
  provider binding, cancellation and shared deadline; it must not open a fresh
  per-cut budget window.
- `prepareStoredSourceBootstrapUnion(core, {store, receipt, operations})` remints
  proof on a new invocation's original work ticket from staged or actually active
  exact operations. It reauthenticates original encoded manifest bytes, ordered
  chain, graph and union, rejecting missing, extra or altered operations. There
  is no transport request and no cached success bit.
- `readSourceBootstrapUnionProof(proof, {core, store})` returns frozen plain data:
  selection, receipt, original operations, derived LOCAL items, heads, frontiers,
  plain ownerScope, graphDigest, deltaGroups and original cut summaries. It never
  returns original Source capabilities, prepared receipt brands or branded plan /
  Scope objects. The original restore owner recompiles those itself.
- `requireSourceBootstrapUnionProof(proof, {core, store}, transaction)` also
  requires the original repository transaction and unchanged JournalRestoreFence
  inside the consumer's existing commit transaction. It is a validator, not a
  writer or native-generation grant.

Proof identity pins original Core method identities, the exact Core/Store/
repository/physical database, namespace, dataset, Store database identity and work
ticket. The original journal epoch/namespace fence is captured before transport,
checked after preparation and rechecked by the transactional consumer. Caller
objects are detached before awaits; getters, symbols, sparse/extended arrays and
extra format fields refuse. Public proof data is recursively frozen.

All cuts, parsing, compilation, snapshots, cold reconstruction and consumer work
share the one original 4096-reference / 2 MiB / 30-second ticket. The module never
creates or renews a ticket. Repeated real work is charged again; these are limits,
not guaranteed supported payload sizes. The small profile does not claim paged,
129-operation or 100k-scale recovery.

## Required real consumers and durable continuation

`GroupedCheckpointRestore.stageSourceBootstrapUnion(proof)` must use the existing
restoreId, store original operations and receipt atomically, and create the
explicit local row variant instead of a fake manifest. Activation must recompile
original Source capabilities against its replay Core, apply through original
Source owners, validate exact canonical/protocol/receipt/frontier closure, and
switch the active pointer only in that same atomic transaction. Active identity
must retain the exact local selection and original restoreId. Failure must leave
both old canonical state and all authentic remote heads intact.

Cold retry uses that same restoreId and selection: validated state reconstructs
from retained group items; activated state reconstructs from actually active
original operations even after disposable item cleanup. Corrupt receipt, changed
base/epoch, protected or nonempty destination, resource exhaustion, cancellation
and original owner refusal remain failures, never a new success identity.

`recovery-session.js` and `background/sync-local-lifecycle.js` must actually select,
persist, resume and confirm the local variant under their original provider/
dataset/restore binding and shared ticket. A standalone proof is not restoration.
`checkpoint-publication.js` may subsequently build a normal remote checkpoint
from the committed, revalidated union with BOTH original heads as parents. It must
prove every original parent operation retained, including a changed newly selected
remote parent, before publishing. Missing parent operations refuse; no new manifest
may overwrite or conceal an unretained head. Proof bytes alone do not authorize
publication, and native completed-control consumers remain strict.

## Scoped evidence and open claims

Direct Node/fake-IndexedDB evidence: 27/27 passed, zero failures/skips/cancellations,
`/tmp/source-bootstrap-union-proof-assertion-boundary.log` (9458.581614 ms).
Cases include genuine original captures/checkpoints, exact operation retention,
order-independent local selection, body-free cold proof, all identity domains,
Working rejection, omitted ancestor operations, incomplete ancestry, corrupt
remote bytes, forged/mutated receipts, accessors, post-entry mutation, frozen data
without capabilities, original Core replacement, same-ticket binding, epoch
changes and cumulative resource/deadline refusal. Combined with the complete
existing Source-bootstrap owner file, 51/51 passed with zero failures/skips/
cancellations in 10149.349769 ms (`/tmp/source-bootstrap-union-proof-related.log`).

Historical logs remain: first/fenced/data-only runs each passed 15/15. The expanded
adversarial and reviewed runs each had one failed test: the test caught an expected
transaction abort *inside* the restriction window, which correctly poisoned that
ticket and caused BNS_GROUP_RESOURCE_LIMIT at envelope settlement. The corrected
test asserts the original BNS_RESTORE_LOCAL_CHANGED outside the envelope. No
production ticket guard or limit was weakened to obtain the final pass.

This receipt does not claim combined original-consumer acceptance, browser/native,
Full/C, live provider, 129/100k, installation, deployment, account or paid-service
actions. Those remain separate, and all earlier failures retain their identities.
