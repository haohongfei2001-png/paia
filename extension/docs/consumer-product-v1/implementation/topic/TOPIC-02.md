# CPV1-TOPIC-02 — bounded retrieval and hidden work candidate

Stacked base: TOPIC-01 `de28068e54392de2d557fcf90b944f1201c3ddcc`, tree
`6e6f73e4edf8576b8ec27d309972f54c960b279d`, PR #177. The recorded main
base remains `0093c81300b8dff80b0cf00c4f2cad6130840030`.

Scope: PT-03/PT-08, G01/G03/G04/G06/G08 mechanics. State:
IMPLEMENTED_LOCAL_CANDIDATE / INDEPENDENT_REVIEW_CLEARED /
HOSTED_CERTIFICATION_PENDING. This receipt does not advance STATUS, integrate
ahead of TOPIC-01, or certify semantic formation, deployment or the whole product.

## Coordinated integration candidate — 2026-10-07

Runtime/version head `27a5727fed2810b9748985f7f2a8b08c86ca0269`, tree
`f1c6616ddbcc069b6bfd87caaca5d1b618613bdb`, reconciles actual main
`66fe65cae9ad7766362a0b09f2651e139b863258` and independently certified
Context02 `8c9ba02104c90b14e8a05d6f2b43f3347c9b7f00`, tree
`22d361f40c1e957da2705a04d256a40c664a4bc2`. All twelve previously reviewed
Topic02 runtime/test/harness files remain byte-identical to published
`bce39ea4cf8113ecf34d3607689a97a2043715c1`. Context runtime is inherited,
not reimplemented by this Topic writer.

The integration owner reserved `0.16.0` after Context01 `0.14.0` and Context02
`0.15.0`. Manifest, numeric version-name prefix and package agree. The bounded
five-file release delta adds only producer minor 16 to existing-file header
admission, preserves all previously supported minors and strengthens malformed
current-version coverage. Future minor 17, unknown schemas/sections and
credential-bearing envelopes still refuse; production export remains retired.
No backup entity/schema, restore graph or processing permission changes.

Local combined owning/restore/Context compatibility checks: 197 passed,
zero failed/skipped. Serial privacy/security: 59 passed, zero failed/skipped;
development audit passed. Source package: 10,152 checks across 302 resources;
release package: 10,088 checks across 298 resources, 322 packaged files.
Independent review cleared the exact five-file release delta at `27a5727f`
and separately reran all four owning version/backup cases successfully.
Hosted exact-head full certification remains pending; these are candidate receipts.

The original draft candidate `37555637460` passed on `bce39ea4`; it does not
certify this successor. Topic01's repaired candidate full `37565860724` passed,
while main `66fe65ca` recorded a retained release A01 typography-sampler stale-node
failure in `37567653820`. The reviewed correction is already present in this
certified Context ancestry. The authorized dependency sequence still requires
successful corrected exact-main proof and normal Context integration; this
receipt neither converts the failed run to PASS nor advances STATUS.

## Recovery and current dependency reconciliation — 2026-10-07

After the executor reset, the paused candidate was reconstructed from verified
remote sources to exactly tree `ec1f41e8bd06060c44b78e6d9b346325c1448a92`.
Read-only GitHub checks found none of the six interrupted new blob uploads and
no branch update; no partial publication is credited as a checkpoint.

Reconciled runtime `558f827eafdc4fb384360fc0b59edb3656892aaf`, tree
`3b24c0f6be78d7c08545cd4ac29d49e857500d9d`, includes the certified combined
Context 0.15 head `84edc0c8aa4528224492938430e304a5d6085de0`, tree
`850cb29b413d6b40f785f34c6c3054e1e29846c2`. Its actual receipt-admission
and restore-epoch corrections remain intact. The twelve reviewed Topic02
code/test files still match `bce39ea4` byte-for-byte; the shared backup-format
difference against that Context base remains only producer-minor 16 admission.

Current combined Topic01/02, Context03/04, receipt portability and restore tests:
514 passed, zero failed/skipped. Serial privacy/security and development audit
passed. Source package: 10,415 checks across 309 resources. Release product
guard: 329 files with synchronized 0.16.0 metadata. These results supplement,
rather than replace, the earlier receipts. Hosted full proof and the declared
Context-before-Topic02 integration sequence remain required. This recovery
adds no provider/model activation, external grant, UI redesign or STATUS advance.

## Lifecycle effective-access correction — 2026-10-07

A focused integration test found a missing case in this unactivated candidate:
active Topic A carried an explicit retained denial, Topic B allowed the same
Entry, and automatic dormancy of A changed actual `MemoryService.permittedPaths`
from zero to one while all permission rows stayed unchanged. This was a Topic02
candidate transition, not a newly activated production service.

Runtime/test commit `820d8d9c98f0453220d96a2050f08697a4686b7b`, tree
`925c7e53943fd58a3d5862c8498f2191e2ec19dd`, invokes the existing foundation
negative-witness guard inside the same write transaction before active-to-dormant
mutation. It adds no permission owner, metadata copy or grant write. Explicit
Topic/never/Section restrictions and restrictions in another retained profile
refuse atomically; unrelated restrictions and empty excluded Sections do not
block safe activity. Separate permission-owner revision remains authoritative.

Seven new actual-owner regressions cover those paths, unchanged data/permissions,
real replace restore and same-ID reactivation after lawful permission revision.
The lifecycle/foundation removal-and-history/Context scope combination passes
136 cases. Independent review cleared the exact two-file delta and repeated all
11 lifecycle cases successfully. Earlier statements about unchanged Topic02
files refer to their pinned recovery checkpoints; this later bounded correction
changes only the lifecycle owner and its owning tests. Final inherited-base full
certification remains required before integration.

## Owners and physical storage

- `topic-processing.js`: default-denied trusted internal processing boundary.
- `topic-retrieval.js`: bounded identity/constraint traversal, authenticated
  continuation and complete-current coverage checks; paged constraint proofs.
- `topic-candidates.js`: disposable hidden evidence work, internal lookup,
  accumulation/consolidation, CAS, expiry/discard and source/restore fences.
- `topic-lifecycle.js`: same-ID active/dormant transitions under current
  processing authority, human protection, layout and revision checks.
- Current and legacy Original materializers: valid uncertain, transient or
  missing destinations leave Entries unassigned, without a catch-all Topic.

The existing `topics`, `meta`, journals and receipts remain identity owners.
There is no schema/database version change, new object store, copied evidence
body, catalog, taxonomy dependency, worker command, UI, provider or permission.
No existing Topic is swept, renamed or removed by its name. Actual Topic IDs
are still allocated only by existing trusted creation operations.

Hidden work uses reserved `personal-topic-candidate:<HMAC>` rows in existing
`organizerWorkItems`. Rows have a versioned kind, terminal/nonrunnable state,
bounded Input evidence references/digests, source IDs, opaque boundary/name
tokens, authority epochs, revision and expiry. They have no `jobId`, Topic ID,
body, label, summary, excerpt, user-facing count or authorization target.
Current job readers resolve work only through real Organizer job IDs; ordinary
suggestions, Topic lists, local search and Context directories do not read this
namespace. Existing saved AI-presentation candidates are separate and unchanged.

The initially considered `libraryMigrationItems` owner was rejected during
review: a new Source-linked kind there would wrongly trigger B-02 purge
admission. `organizerWorkItems` already has source-index cleanup and replace-
restore disposal, so no purge-admission or restore-policy exception is added.

## Processing and retrieval contract

No resolver is installed in production by this slice. A future trusted service
must supply the constructor-only processing resolver; request data cannot grant
permission. It receives the exact bounded Input and Topic IDs and must return
that same scope and a current permission epoch. Capture consent and external
Context read grants are insufficient by themselves.

Permission is checked before evidence reads, after asynchronous preparation,
for raw and canonical redirect targets/constraint endpoints, after cursor
signing, and in the final transaction. Existing Source/Input eligibility,
Smart Filter, library seal, consent, suppression key, restore epoch and current
portable-data generation are rechecked. The resolver's epoch must cover changes
to its processing policy; exact target checks also defend target-specific
revocation during an asynchronous operation.

`TopicIdentityRetrieval.page({scope, names, cursor, limit})` traverses existing
Topics and keep-separate constraints by indexed/primary-key pages, at most 100
rows per page. It is explicit internal background work, never per-keystroke
dispatch. HMAC-bound continuations can resume with a new service/database
instance and cannot be altered to skip rows, change scope or pretend completion.
An import, human edit, identity/constraint change, source change, key replacement
or restore invalidates old coverage rather than silently omitting new rows.

Active and dormant identities, current and prior-name matches, permanent merge
redirects and removed fences all participate. Unavailable metadata is counted
explicitly; source-ineligible generated labels are not released. A complete
enumeration is not semantic identity proof or new-Topic authorization. Equal
names stay distinct and a name/shortlist miss never establishes a new identity.
The former active-only 32-to-8 ranking remains a legacy proposal aid, not this
coverage proof or a new admission policy.

Coverage carries a signed removed-name match. Current normalized names are
checked even for legacy removed rows with no identity metadata or name registry;
NFKC-equivalent names cannot evade suppression. No compatibility migration is
silently invoked. Opaque retained alias tokens continue to fence erased labels.

Candidate constraints are evaluated by one complete paged read proof, not up to
190 full-namespace scans inside a write transaction. Current labels and pairs
are read in batches of at most 100; hashing stays outside IndexedDB. A final
generation/key/restore/exact-target check allows only a short CAS write. More
than 100 constraints and a mutation halfway through the proof are tested. No
prefix or arbitrary maximum Topic count is treated as complete coverage.

## Hidden lifecycle and unassigned content

An explicit opaque boundary key locates a stable internal work row across
restart and later independent Inputs. Several boundaries from one Input can
coexist. Without a key, the row is only an unresolved evidence bundle. Neither
key, name nor overlapping evidence proves established identity. Internal
`lookupBoundary` and `read` reauthorize stored evidence; no ordinary directory or
candidate approval inbox is introduced. Evidence counts are reference counts,
not recurrence/admission scores.

Record/accumulate and consolidate use current evidence, CAS and complete
identity/constraint coverage. Removed identities and keep-separate, including
canonical redirect targets, block consolidation. Consolidating hidden work
never merges established Topics. The initial disposable policy is version 1:
at most 100 Input references, eight opaque name tokens, 20 related identity
references and a 30-day maximum lifetime. Accumulation does not silently extend
that lifetime. These are engineering parameters, not formation thresholds.

Source removal/revocation immediately makes stale candidate reads unavailable;
existing source cleanup physically deletes affected work rows. Existing-file
replace restore clears the rows, and key/restore checks reject retained work.
Bounded expiry/discard touches only these disposable rows. Capture, Input,
independent Entry bodies and saved presentation work remain owned/readable by
their existing services. No user database was inspected or migrated.

Activity transitions preserve Topic ID, default Section, layout, Entry bodies,
manual memberships, name/field protections and access metadata. Pin, keep,
restored lifecycle intent, stale revisions, layout locks, removal and redirect
aliases prevent inappropriate transitions. No automatic aging/reactivation
runner or threshold policy is started.

Both Original materializers preserve valid substantive spans as ordinary
unassigned Entries when uncertain or destination-free. They do not invent a
span for ambiguous multi-Input output, discard meaningful content merely because
its heading is transient, create orphan Sections, or change existing manually
named containers. Production commit/replay tests verify the exact body, existing
Input body binding, provenance and absence of Topic/Section/Placement creation.

## Verification and remaining gates

Current owning suite: 34 passed, 0 failed, 0 skipped. It exercises actual
production modules and IndexedDB transactions, including restart, complete
73-identity traversal, 120 constraints, signature forgery, alias/removal/dormancy,
target revocation during signing, source purge admission/cleanup, real replace
restore, candidate invisibility, distinct same-Input boundaries, later-Input
rediscovery/accumulation, rollback and exact unassigned-body preservation.

Current combined affected run: 266 passed, 0 failed, 0 skipped. Additional
Source-purge, restore and Context/Memory regressions: 73 passed, 0 failed,
0 skipped. Privacy/security:
59 passed, 0 failed, 0 skipped. Source static package guard: 10,005 checks passed
across 297 resources. Release build: 9,941 package checks passed across 293
runtime resources; release product guard passed with 317 files. That historical
checkpoint inherited 0.12.1; the coordinated successor above reserves 0.16.0.

Two full-unit attempts have no terminal receipt and are PARTIAL / NOT_VERIFIED.
The local runner sessions ended before a terminal result could be retrieved.
The second captured log ends after
the unchanged ANS 10,000-window navigation case, with neither a FAIL line nor a
terminal summary/exit result. This is not a full pass or an observed timing
failure. No unchanged third run was started. The unchanged controlled-machine
10k timing test
previously failed on clean main as recorded in TOPIC-01; no test/time budget or
corpus is weakened. Local Chromium was already verified unable to launch
because the executor denied the process-singleton socket; no local browser,
adapter, installed-version or device pass is claimed here.

Independent read-only review cleared runtime commit
`c48a0e3c1b48c052950f82e0c2dcb2e447376077` / tree
`cc88c3572f927628fd391d2f1f2621af7c565774`, with a separate 34/34 owning
rerun. This receipt-only update changes no runtime or test. Predecessor TOPIC-01
head `de28068e` passed full Certification `37549715747`; its version alignment,
main integration and exact-main verification are still separate obligations.

Hosted exact-head certification, TOPIC-01-before-TOPIC-02
integration, final coordinated version/status and exact-main verification remain
required. TOPIC-03 owns semantic identity/admission, six-part formation, Section
policy and real service activation. Real model quality, migration on user data,
downstream utility, external client, paid processing, installation and release
remain separately unverified or gated. There are zero network/provider calls
or external authorization writes in the new mechanics tests.
