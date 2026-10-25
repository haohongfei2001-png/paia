# Same private review requalification — independent review

2026-10-25. Frozen `decf64c1ff60721a92c274429f4b29a6c31a1dba`, parent `f7e64ffdef90f8b8c0e50ba09ac42f1aa9083ccd`, in `selection-requalification`. Read the complete runtime difference, new tests, original inheritance proof implementation and report/log summaries. No tests or runtime edits by reviewer. **No blocking issue identified for the narrow same-physical-cut local profile.**

## Identity and completeness

`requalify()` accepts no arguments and obtains its sole target from the current owner-private cuts record. It does not call prepare(), open a new candidate, choose another registry target or issue a new operation ID. Exact original source/target repository and database objects, names/factories, core repositories/device identities, database IDs, original method qualification and full original review values are rechecked. The candidate and registry handles remain the original ones.

Both source and target complete physical row trees are recaptured and compared without filtering or normalizing metadata. The original target registry root, canonical gate and control fences, original SDK before row, pending selection markers and both inheritance proofs remain required. Unknown metadata, unresolved control reservations, restore changes, or any changed reviewed content refuse. The original full-preimage checks inside activation transactions remain unchanged; a raw mutation after a successful requalification still fails activation rather than being silently adopted.

This deliberately supports only unchanged content/physical rows with renewed original tail/control observations. It does not accept even legitimate post-review hold/settlement writes. That broader dependency still needs explicit proof design or a new explicit review and is not solved by this commit.

## Lifetime and failure handling

Prepare marks busy before its first await, replaces the original review explicitly, and increments a private lifetime. Requalification records that exact lifetime/private token and sets busy before awaiting. Concurrent prepare/activate cannot consume or replace the in-progress review. Close invalidates that lifetime and clears the original private record; late prepare completion cannot publish, and late requalification fails its original current checks. A new explicit review is allowed only after the old busy operation settles, so its identity cannot be removed by old catch cleanup.

Requalification failure discards the stale record and closes only its original handles; an unchanged raw DTO or previous successful response cannot revive it. Success installs a new private token while preserving the original operation ID and original handles. Forged arguments are rejected before altering the existing legitimate review.

The established activate/continue/cancel durable transaction protocol is not redesigned. Close is not a cancellation capability for an already accepted activation or SDK dispatch; this review makes no such claim. A consumer must retain the original durable outcome rules and phase-aware release rather than treating local close as rollback or settlement.

## Evidence and limits

Read evidence: new initial cases **17/17**, 9918.380625 ms; final four complete files **56/56**, 14616.819666 ms, with zero failures/cancellations/skips/todos. The final combination includes 19 new cases and existing one-SDK-dispatch/lost response/cold selected and synthetic worker coverage. Reviewer did not rerun these commands. No browser/native/whole-product or global selection qualification is inferred.

No RPC, configured service, global editor/host gate, cold continuation consumer, budget or workflow changes are included. Current-process warm owner holds cannot substitute for missing durable UNKNOWN/financial and host completeness proof.

Reviewed SHA256:
- `extension/core/browser-native-sync/application-generation-selection.js`: `88ec947304ad1c864c405ee8a7b2ad027efa3889c1760f9af2971c51263d0246`
- `extension/tests/application-existing-selection-requalification.test.mjs`: `cb14ce74c87d3e4e9841940e029564516d8dc8e34aa716fa7919edabcbfb55d4`
