# CPV1-TOPIC-02 — bounded retrieval and hidden work candidate

Stacked base: TOPIC-01 `de28068e54392de2d557fcf90b944f1201c3ddcc`, tree
`6e6f73e4edf8576b8ec27d309972f54c960b279d`, PR #177. The recorded main
base remains `0093c81300b8dff80b0cf00c4f2cad6130840030`.

Scope: PT-03/PT-08, G01/G03/G04/G06/G08 mechanics. State:
IMPLEMENTED_LOCAL_CANDIDATE / INDEPENDENT_REVIEW_CLEARED /
HOSTED_CERTIFICATION_PENDING. This receipt does not advance STATUS, integrate
ahead of TOPIC-01, or certify semantic formation, deployment or the whole product.

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
runtime resources; release product guard passed with 317 files. Version remains
the inherited 0.12.1 until the integration owner coordinates it.

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
