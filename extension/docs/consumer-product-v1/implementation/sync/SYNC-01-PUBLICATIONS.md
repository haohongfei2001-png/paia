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

## Local obsolete-retirement candidate

BNS-06 requires unknown outcomes to retain logical identity; BNS-07 prohibits
collection without complete reference proof. The explicit `retireObsolete` seam
therefore accepts only an obsolete cut with a durable purged/redacted revision
witness. It never unlocks integrity or missing-object blocks. One native-store
transaction retains every possible object reference, releases still-valid local
reservations, marks the old publication terminal and removes its active restore
blocker. It neither acknowledges operations nor advances any uploaded frontier.
An injected transaction failure leaves all original reservations and blockers.

The body-free `publicationRetirement` catalogue resides in the existing meta
store under the dataset prefix outside the active generation, just like the
existing publication identity fence. Its narrow purpose is to keep uncertain
remote object identities discoverable after namespace activation; it adds no
body copy, user entity, object store or schema version. Enumeration is bounded
and explicitly paginated. Records say `retained_unproven` and
`performedDeletion:false`. They are protection records, not deletion permission.
No age-based expiry, remote delete, provider connection or background scheduler
is implemented. Original publication identities cannot be recycled.

A publisher already awaiting a remote put may still leave its immutable object
behind. Retirement cannot recall that request; all possible references, including
a late descriptor, stay recorded. Subsequent local acknowledgement is fenced.
Any later cleanup must prove complete reference closure, retain required
checkpoints, branches and restore pins, and include these uncertain objects.
The current read-only compaction planner does not perform such orphan deletion.

The new namespace-activation test uses a clearly synthetic pure-Core materializer.
The existing production Prompt materializer rejects aggregate Prompt purge; this
candidate does not expand that owner or certify production purge/restore. Native
retirement/production-owner qualification is not implied by model-storage tests.

Local retirement validation: the complete selected Sync/Prompt/harness corpus
passes 163 tests with zero failures, skips or cancellations. A separate complete
source/release headless native file passes 2/2. Each native journey injects a real
IndexedDB retirement abort, checks unchanged reservations/catalogue, stops and
restarts the worker three times, verifies committed retirement persistence and
then confirms retained references survive namespace activation. Lifetime network
ledgers prove native factories and no external requests through all restarts.
This uses the explicit pure-Core synthetic no-op restore owner, not the production
Prompt materializer. No product gate is relaxed.

The local native run was made before this checkpoint commit: its head/tree
metadata names the clean base, while the seven recorded production module hashes
identify the tested working runtime. Do not present that base SHA as containing
retirement or treat this as an exact-head hosted CI receipt. Logs/isolated receipts
remain local under `work/qa-bns-retirement`; hosted admission is still pending.


## Full-gate preparation on certified Root baseline

Draft PR192 headf834627 passed candidate37688529368, including native partial
Core evidence. Full certification was skipped and the separate Prompt foundation
workflow cancelled; neither is a pass. The regular test runner scans only top-level
tests, so its full-browser discovery does not cover the three nested Sync files.

Independent combination branch merged current main daf1807 as b6c2e23. The two
conflicts were CI aggregate dependencies and their exact assertion; the union
retains both Root jobs and Sync. Independent review checked all non-conflict
source blobs (30 Sync-side and71 main-side files) against their original commits.
No product/data logic was rewritten to resolve the merge.

Full certification now explicitly runs all three native storage/publication/
retirement files in one bounded12-minute job, binding receipts to github.sha
(the tested merge or main), preserving the complete source/release receipt
verifier and requiring success in the full aggregate. Draft candidate remains
opt-in and bound to PR head. The full job reuses the reviewed signed HTTPS
Ubuntu mirror pre-step. No provider, secret, deployment or permission is added.
Local8 CI guards and independent184 Sync/Prompt/CI regressions pass, no skips or
cancellations; workflow YAML, job dependency references and201 shell blocks
validate. Initial gate-harness execution without GitHub bash -e was retained as
a failed local fixture run, then corrected to the real runner shell semantics.

This is preparation, not executed combined native/full certification. Reconcile
the Settings0.20 batch before integration and test that exact version. The scope
remains SYNC-01 local protocol, Prompt preferences partial transaction/restore
and publication lifecycle. Retirement's synthetic no-op restore owner does not
prove production Prompt purge/restore; full canonical owner journals, consumer
preference intent/dual-storage atomicity, large-scale experiments, cloud OAuth
and cross-device service behavior remain open.

## Current Settings reconciliation candidate

The preserved Sync preparation at beaf4a8 incorporates Settings0f750af with no
text conflicts. Independent comparison proves all31 Sync-only and102 Settings-
only changed files retain their owner blobs. The coordinator reviewed the two
shared CI workflow merges: the complete three-file native Sync job, exact-head
receipt checks and required full aggregate remain, together with Settings
source/release presentation validation. No cloud wiring or permissions changed.

The complete12-file Sync/Prompt/harness/CI owner selection passes156/156 locally,
zero skipped/cancelled, in3.398s (sync-settings-merged-owning.log). This is merged
worktree evidence before commit, not exact-head hosted native certification.
The prior0.19 native results do not certify this0.20 combined candidate. Full
production preference journaling, canonical restore and real account/device
qualification remain open; constructor seams are not deployed synchronization.

## Native verification of the Settings combination

At2b6ac34, all three complete native owning files pass36/36 across source and
release, zero failed/skipped/cancelled, in34.652s. Playwright1.63.0 was explicitly
selected to match package.json.1321 non-document tracked file hashes remain
identical across the run; all six native receipts report PASS and that exact
head. The original automatic fallback used1.62.1 and is retained only as a
dependency-mismatched diagnostic, not current acceptance. No browser assertion,
source code, CI rule or timeout was changed to obtain the matched result.

Current main f1740bc is subsequently reconciled without runtime changes. Logs:
work/sync-2b6ac34-native-matched-deps.log and its byte manifest. A later commit
still needs its own hosted head receipts; these byte-equivalent local results
are not a claim of cloud transport, complete restore or live cross-device sync.

## Current Section-main combination

Formal main03a57b5357d71cca3cfdfbdfce915d5ced5a5e77 was merged without
conflicts as7682398fb5d19f13152a59d4776ee1d7ca52d7f4. The Sync core,
Prompt owner and all nested native suites are byte-identical to0a8d0fd7; shared
Section worker/read-model, Context and strict backup0.21 changes were reconciled.
Nine complete related unit files passed94/94. All three full native files
(storage/publication/retirement), serial source/release, passed36/36 in39.84s
with explicit Playwright1.63.0, isolated headless profiles and synthetic data.
No skipped/cancelled case is counted. Native receipts bind head/tree/module
hashes and real IndexedDB/worker lifecycle. Logs:work/sync-main03a-owning.log
and work/sync-main03a-native.log in the coordinator worktree.
Independent merge review confirmed no new manifest permission, no lost worker
bridge, and unchanged Full gate requirements for all three native files and
their exact-head/zero-network receipts. This permits requesting formal current
combination certification; it does not mean that gate has passed.
All partial-Core/Prompt and synthetic-retirement limitations remain. Production
Prompt purge/restore, complete canonical restore and real account/device/provider
sync are not claimed. No cloud transport or scheduler is enabled.
