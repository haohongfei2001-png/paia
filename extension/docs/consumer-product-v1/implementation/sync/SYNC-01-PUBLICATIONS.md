# CPV1-SYNC-01 prepared publication journal

2026-10-07. **PARTIAL / INDEPENDENT REVIEW PENDING.** Local synthetic protocol
work on reviewed Core/staging tree `f08ac0e5`. This does not move the separately
reviewed native-storage test pin or claim complete SYNC-01 admission.

## Durable, bounded preparation

`PreparedPublicationJournal` selects a bounded committed outbox cut, validates
its immutable revisions, and computes deterministic segment/chunk/descriptor
references before opening its write transaction. The transaction reserves every
selected outbox row and saves the cut, namespace, producer, exact packing profile,
object identities and blueprint digest together. Later edits stay queued outside
that cut. A dataset-local publication identity cannot retarget a later restored
namespace. The journal stores metadata, not additional content-body copies.

Limits are explicit: 512 operations, 4 MiB decoded operation bytes, 512 emitted
object references, 256 KiB blueprint metadata, and 100-row catalogue pages. The
packer admits the current exact candidate profile; only the separately measured
64/256/1024 KiB packing target varies. These are provisional bounds, not a claim
about lowest-host capacity. Reserved rows are skipped through explicit page
continuation. This path never calls the all-history `Core.state()` snapshot.

## Restart and unknown outcomes

Each upload attempt is durably recorded before calling the injected immutable
transport. A resumed uncertain attempt reads the same object identity first.
Only explicit object-not-found permits re-upload of that identity; corruption
blocks rather than overwrites. Every object is checked by exact read-back.
Descriptor dependencies are verified before the final local acknowledgement,
including a repeated full descriptor read after delayed/lost acknowledgement.
The outbox deletion, complete publication receipt and pending-index removal are
one transaction. An abort leaves the exact cut reserved and retryable.

The async progress iterator can be stopped without retaining all-history output.
A new instance discovers pending metadata through the bounded catalogue and
resumes the same blueprint. Concurrent successes cannot clear a durable integrity
block. Transport failures are reduced to safe error codes; provider error text is
not persisted. The primitive Core acknowledgement cannot bypass a reservation.
Restore activation refuses an outstanding publication rather than abandoning its
unknown outcome in an old namespace.

Purge invalidates a prepared body-bearing cut. No later descriptor for that cut
is admitted, and its potential orphan object identities remain tracked. This
slice does not implement orphan cleanup, unblock policy, compaction deletion,
provider retries/backoff, account binding, scheduling or user-facing enablement.
An obsolete or integrity-blocked publication therefore remains an explicit
restore blocker until a separately qualified reconciliation path exists.

## Local evidence and remaining qualification

Seventeen focused fake-IDB/no-network cases cover fixed cut versus late edits,
new-instance restart, uncertain upload written/not written, early iterator stop,
reservation rollback, competing preparers, acknowledgement bypass refusal,
acknowledgement rollback/retry, missing remote data, same-ID corruption, partial
chunk loss, purge interruption, restore fencing, bounded pagination, duplicate
identity/configuration change, malformed reservation, concurrent publishers and
monotonic integrity failure. Synthetic transport methods never access a provider.
The combined owning Sync/Prompt corpus passes 132 tests; package guard passes
10257 checks over 306 runtime resources.

These are model-storage proofs. Native service-worker restart/quota/transaction
lifetime qualification for this new journal remains open, separately from the
prior Core's hosted native proof. Complete production owner coverage, consumer
activation, real cloud access, OAuth, credentials, paid calls, real user data,
migration and release remain outside this checkpoint.
