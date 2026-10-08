# Optional Input Working publication — independent review pending

This isolated follow-up starts from 6ecf902f. It is excluded from the coherent0.27 delivery. settings_review began the implementation; the coordinator completed and tested it after agent quota exhaustion. It therefore still needs an independent review. No production caller binds the optional journal, and no transport, remote materializer, account, permission, schema or model is activated.

## Bounded ownership

InputWorkingSyncJournal accepts one existing active Input with real Source provenance and no Thought/evidence dependencies. It binds exact canonical Input/document/index/state/history, backup generation, restore epoch and Core namespace. It prepares one batch containing Input, InputState, required existing/new history and user-edit Keep protection. Canonical Working data, input state, normal revision history, protection, receipt and Core outbox commit in the original transaction; a post-outbox error rolls all of them back. SHA preparation remains outside IndexedDB transactions.

The original IA revision planner is extracted once and reused: default coalescing, sequence allocation, important-history retention and pruning are not replaced by a parallel history implementation. This first publication-only slice refuses aged history that would require retirement bundles, large history, unsupported title/removal/multiple-Input edits, existing referenced Inputs and unbootstrapped human work. It does not claim complete Input ownership or remote recovery. Normal unbound editing remains unchanged.

The existing Keep journal accepts user-edit intent only through the private combined preparation capability. Its standalone remote receiver still rejects user_edit without a Working bundle. Strict Input revision codec admission refuses generic revision envelopes and local admission metadata; the original unsupported-revision safety test remains unchanged and passes. CODEC_COVERAGE continues to mark full Working/legacy revision ownership unavailable; registered types are not canonical recovery proof.

Lost-ack replay checks the original durable receipt before preparing against already-committed state. Same operation with a changed digest still fails. Source bodies remain unchanged. No service-worker wiring is added; constructor injection defaults to null.

## Evidence

- Initial two owner cases failed during incomplete author work (`/tmp/input-working-root-initial.log`): raw Input passed to a physical-row projector. Subsequent preserved failures identified local negative-zero index tuples sent through wire canonicalization and the restore marker being committed before the Keep owner's pre-write check (`-second.log`, `-diagnostic.log`, `-third.log`). The fixes preserve wire canonicalization and move the one restore marker commit to final atomic publication.
- Twelve owner cases cover body/note publication, exact Source preservation, Keep composition, receipt replay/digest mismatch, causal second edit and revision coalescing, post-outbox rollback, unsupported title/removal/multiple edits, prepared stale state, existing Thought dependencies and aged-history refusal.
- `/tmp/input-working-root-unit-final.log`: all browser-native-sync unit files plus original IA foundation and Working revision files,289/289 PASS, no skipped/cancelled,5.176s.
- `/tmp/input-working-root-native.log`: new complete native source/release file2/2 PASS,9.252s. Each variant runs all12 unchanged owner assertions in real IndexedDB, verifies the combined state after an actual service-worker restart, and asserts zero network. Six production source/release file hashes match. Receipts are in work/qa-bns-input-working/{source,release}.json.
- `/tmp/input-working-root-native-regression.log`: three original complete native files (storage-chrome, cpv1-02-dvn-working-revision, uir-04-data),41/41 PASS,110.357s, no skipped/cancelled. These preserve existing Keep23 cases, original storage/restart contracts, normal History lost-ack/conflict/recovery and Data backup restore. The Keep unknown-reason check now uses an actual unknown reason and additionally rejects a valid user_edit operation at the standalone receiver; its23-case count and existing safety boundary remain.
- Package12523 guardrails/378 resources PASS; diff-check PASS.

Runtime bytes remained frozen through native runs. This is local synthetic proof, not hosted certification, independent approval, full browser/account sync, complete restoration, installation or delivery.

Final SHA-256:
- core/browser-native-sync/input-working-journal.js: f4a844bfd88151b8ae1aa5cfa3afa981cb5d32fa5c783cd464fe56a7e2bd69a3
- core/ia-store.js: ceb65468d03cd311a2ff832ea873ea22e199177ffaa1ed9cd3a7ccade657d46f
- core/indexed-store.js: 36981d233223bf026ead4fb67c5e9d1148eae0d3d0c11032b2b87b34316a29d0
- core/browser-native-sync/codecs.js: 62ad6415561ec312b9b65e236c6568f9be0f91c0a9b159f2bafd8a845c5e9482


## Independent retention-boundary repair and final verification

settings_finish independently reproduced a blocking clock boundary: a prepared major edit committed after the retention horizon advanced, and the ordinary prune owner removed one historical edit although the publication batch had no retirement operation. `/tmp/input-working-independent-clock.log` preserves the actual failure (before2, after2, lost1). Bound transactions now give that same existing prune algorithm their private prepared timestamp through WeakMap-backed pruneTime(t); unbound transactions still use the original clock. Explicit pruneRevisions also refuses while this incomplete owner is bound. No second pruning algorithm or deletion authorization is added.

The original independent negative now reports before2, after3, lost[] (`/tmp/input-working-independent-clock-fixed.log`). Two new owning cases cover implicit horizon crossing and explicit pruning refusal. Final independent review accepted the runtime and ran complete related units291/291 PASS2.840s (`/tmp/input-working-independent-final.log`); no remaining confirmed blocker.

Final frozen runtime native verification: `/tmp/input-working-retention-native-final.log`, four complete files43/43 PASS112.369228958s, zero skipped/cancelled. It includes source/release14-case Working matrices with real worker restarts and unchanged original native storage, History and Data recovery files. Earlier12-case/41-case proofs above remain historical. Package and diff checks were repeated on the final runtime. Still no remote materializer, full recovery, account connection, hosted CI or user delivery claim.

Final changed runtime SHA-256:
- core/browser-native-sync/input-working-journal.js: f65e8de4955151cde1496e05a9423f6423a632b38f266ac4adb9fc48b99ec2c8
- core/ia-store.js: ba938aa7bb46712b7188cd5ded5f94b22e4127f27540e3eb3855ec3e5a6db7e1
Other runtime hashes from9439 remain unchanged. Independent review covers this final correction; historical pending notes above are not current approval status.
