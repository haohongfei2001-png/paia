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

## Recovered local candidate and bounded review — 2026-10-08

Recovery used published base `c76f260157cba6f00dda9a249dfac4b0b5ce7276`, whose
exact tree `f08ac0e5de75906e78ad96771a97da8eb9608936` matches the handoff base.
Applying only the publication increment produced the expected tree
`93743e150663015eeb56a86d71031f7adc79a028`; this does not fabricate the original
local commit ancestry. The published native-test successor `c6581e20` was merged
separately: its 13 files change tests/workflow only, not this runtime.

Bounded independent source review found no confirmed blocking defect in this
increment. Two additional negative-path regressions prove that arbitrary
transport error bodies are not persisted/returned, and that a purge while the
publication iterator is suspended prevents its later descriptor publication.
The full selected Sync/Prompt/native-harness preflight corpus passes 157 cases,
zero skipped/cancelled. Source package audit passes 10,257 checks across 306
runtime resources. These are fresh local model-storage/preflight results.

An initial overly broad Prompt test selector also selected browser files; that
attempt failed to obtain Chrome CDP and was stopped. Its failure/cancellation is
retained outside the source tree, not counted as a native pass. The corrected
explicit file selection above excludes browser execution. No native qualification
for the publication journal, CI, provider call, full canonical restore,
activation, migration or deployment is claimed. The documented blocked/obsolete
reconciliation and orphan-cleanup limitations remain open.


## Native publication recovery successor — 2026-10-08

Test-only successor `14377a4` adds actual isolated Chrome IndexedDB and service-
worker stop/restart verification for source and built release. Both complete
journeys pass (2/2, no failure/skip/cancellation); 19 publication owning tests
plus 6 harness preflight tests also pass. The coordinator reviewed the new fixture,
its native assertions and publication owner before this checkpoint.

Each variant verifies prepared reservation, unknown-upload persistence through
worker restart, same-ID readback without duplicate upload, acknowledgement
transaction abort retaining outbox and withholding receipt, retry atomicity,
confirmed receipt persistence through another worker restart, pending-publication
restore refusal and old-publication-ID refusal after namespace restore.
Synthetic transport bytes are retained only by the test; receipts record native
IndexedDB, three real worker restarts, seven production module hashes and zero
external network attempts. This is local native lifecycle proof, not a qualified
cloud provider, complete canonical restore, cross-device sync or installed release.
The previously documented obsolete/integrity reconciliation and orphan cleanup
remain open; full integration certification is still required.
