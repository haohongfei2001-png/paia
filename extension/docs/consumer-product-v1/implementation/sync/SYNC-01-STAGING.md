# CPV1-SYNC-01 staged recovery checkpoint

2026-10-07. **PARTIAL / INDEPENDENT REVIEW PENDING.** This follows the independently
reviewed [foundation](SYNC-01-FOUNDATION.md); it does not close SYNC-01 or widen
production codec/writer admission.

## Added mechanics

- Complete checkpoint streams contain retained revision ancestry, concurrent
  heads, exact digest/sequence receipts and sparse frontiers. Purged revisions
  retain only body-free ancestry/receipt envelopes. No fabricated empty-body hash
  replaces an old digest.
- Content-addressed bounded leaf shards and 128-child index pages build a
  multi-level tree. A final manifest contains the root, exact item count, ordered
  integrity chain, required family coverage and parent checkpoint IDs. Missing,
  corrupt, incomplete or unsupported objects cannot activate.
- Restore writes into an isolated generation in the same real IndexedDB meta
  store. It records progress durably and resumes after interruption. Existing
  canonical Prompt content remains usable throughout staging.
- Verified causal tails apply to the staging generation. An unregistered later
  staging mutation invalidates the activation token.
- Activation changes the active Core namespace and the selected real canonical
  Prompt owner in one strict IDB transaction. Owner data/generation, old prepared
  operations, ancestry, existing tombstones and unmanaged local work are checked
  before switching. A failure after pointer write rolls everything back.
- The read-only compaction planner requires two distinct complete comparable
  checkpoints, exact receipt containment and explicit parent relation. It keeps
  checkpoint-referenced chunks, active-restore pins and uncovered tail objects.
  A pre-purge body-bearing checkpoint cannot be retained as a purported safe
  second copy. Planning does not invoke a provider deletion API.

## Current activation scope and limits

The only admitted canonical restore materializer in this checkpoint is manual
Prompt preferences. It restores exact independent manual text and intent with
new local CAS revision/ranking. It refuses unmanaged local work, a mismatched
local owner, unresolved multi-head choice, and aggregate Prompt purge, which has
no existing canonical deletion owner. Ordinary manual-template deletion remains
an explicit preference revision, not that aggregate purge operation.

Source and Context transport codecs do not imply actual Source/Context restore
admission. Any populated unsupported owner blocks activation. The current
activation transaction explicitly refuses more than 128 logical heads; this is
a bounded initial proof, not the required large-library activation mechanism.
Other domain owners need their own safe staged-generation switch before broad
canonical scope can be claimed. The entire current owner matrix and new main's
Context Rules/Now/Inputs remain open in the foundation receipt.

No service-worker instantiation, user-facing Sync availability, schema upgrade,
cloud adapter, OAuth grant, network transfer, real migration, paid service,
deployment or release is introduced. The tests use independent synthetic IDB
factories and a no-network fake immutable-object transport.

## Evidence

Twelve additional focused checkpoint/compaction tests pass locally:

1. Fresh virtual installation restores solely from protocol cloud objects.
2. Interrupted staging resumes while previous canonical content remains usable.
3. Canonical owner plus active pointer roll back atomically after failure.
4. Local edits and pre-restore preparations cannot cross an activation cut.
5. Unmanaged owner and unknown mandatory codec cannot be overwritten.
6. Missing/corrupt shard leaves the active generation unchanged.
7. Purged historical bodies remain absent, including stale-device replay.
8. More than one level of bounded checkpoint index pages preserves exact state.
9. Causal tail reconciliation reaches the exact later committed state.
10. Unvalidated staging mutation prevents activation.
11. Comparable two-generation compaction retains uncovered tails and pins.
12. Pre-purge body retention is refused; a body-free floor prevents resurrection.

The 1k/50k/500k parameter experiment is independently underway on pinned protocol
source with explicit process limits. No host optimum, scale envelope, full
current-corpus recovery, provider acceptance or installed runtime is claimed.

## Independent review corrections, still unpublished

Frozen `e5a8af0a` remained unsafe for publication. Independent negative probes
showed that a pending-only receive could evade the activation generation fence;
compaction could collect a chunk shared with an uncovered or pinned descriptor;
pinning a checkpoint root could accidentally skip subtree traversal; and missing
checkpoint manifests were not reverified before planning collection.

The corrective branch advances generation for newly pending or quarantined work,
refuses activation with pre-existing/live/staged pending gaps, and uses a two-pass
global reference closure for retained descriptors. Checkpoint traversal has a
separate visited set, so a pin never skips descendant protection. Exact manifest
references are persisted and read-verified before and after eligibility reads.
Unknown pin closures fail closed. Compaction is still a read-only plan, and these
checks do not authorize deleting remote objects.

Eight added negative regressions plus the prior targeted corpus pass locally:
126 focused Sync/Prompt tests in total. Independent re-review and native browser
storage proof remain required. All original frozen failures remain evidence;
none is relabeled as having passed at its old commit.

Re-review of `95b2ef03` cleared those failures but found a caller-owned descriptor
mutation across asynchronous reads: coverage could be checked against one object
and eligibility derived from another. The next isolated correction snapshots the
entire descriptor inventory, pins and profile before the first await. Two added
negative regressions cover individual descriptor substitution and whole-array/
pin mutation. The corrected local focused total is 128; exact independent
re-review is still required before publication.
