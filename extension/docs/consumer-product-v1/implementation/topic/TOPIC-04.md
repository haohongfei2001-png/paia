# CPV1-TOPIC-04 — confirmed Section promotion mechanics

State: IMPLEMENTED_LOCAL_CANDIDATE / INDEPENDENT_REVIEW_CLEARED /
HOSTED_CERTIFICATION_PENDING. Domain mechanics only: no production assessor,
processing resolver, worker command, automatic runner, provider, UI, external
grant, private-data migration, deployment or release is installed by this slice.
This receipt does not advance STATUS or claim the TOPIC-05 promotion UI is wired.

## Base and ownership

Base `b4b05a2233110c1b6184f36d9f10bec34711ec56` contains independently reviewed
TOPIC-03 mechanics atop TOPIC-01/02 and documentation main `29940a92`.
Combined runtime was committed as
`42c479912b72f31b1368f4b84672ca817ef248d5`. Independently reviewed
`910856ab870737fcef023acfa421b5bd3760df61`, tree
`82bc279942cc2f00d76ff04bbf1c5590820dc0d4`, adds a strengthened permission
pagination fixture. Subsequent test-only head
`a0bc54759c77bb304883d43f65c2a20eb1d7d367`, tree
`888f2e75e99b329e10546412ee26b8c79568f9cf`, retains the independently
reviewed zero-Source manual scenario. The independent reviewer inspected and
reran that retained case and extended scoped clearance to this exact test head.
All three have identical Topic04 runtime files. The original receipt was a later
documentation-only change; the dependency reconciliation below is recorded separately.

### Reviewed dependency reconciliation — 2026-10-07

Local combined commit `0f1850eacfdcaad16f83ed055efbc26e8da5be69`, tree
`a709ae6d1d465ac389efca07024982635f277119`, merges the actual remote Topic01
maintenance checkpoint `caf3b70b77599c7f2c12473c1ceac6d7616df63f` from PR #184.
That checkpoint preserves main `4de4e225` and its Settings adoption. No Topic04
module, owning test or harness file changed from reviewed `bdc5a1db`.

The combined stack passes 145 owning Topic04/identity/access/restore cases,
59 serial privacy cases and the development audit. Source package checks pass
10,398 checks across 308 resources; release checks pass 10,334 across 304
resources, with 328 packaged files. The inherited `0.13.1` version identifies
this non-release dependency checkpoint; it is not a final Topic04 version
allocation. Earlier `0.12.1` evidence below remains historical.

TOPIC-01's repaired full candidate/main proof, followed by TOPIC-02/03 integration,
remains a dependency of this stage. No promotion service, UI or processing
resolver is installed by this reconciliation. A stacked draft and candidate
checks preserve the work; they do not complete this stage.

Only new Topic04 owners are added:

- `topic-promotion.js`: trusted AI-proposal preparation, explicit confirmation,
  disposable staging, current-scope revalidation and activation coordination.
- `topic-promotion-policy.js`: six-check formation reuse and typed independent
  identity justification; volume is not a justification.
- `topic-promotion-selection.js`: complete bounded selection/evidence traversal
  and an ephemeral, current-authority assessor reader.
- `topic-promotion-manual.js`: the separate explicit-human structural command.
- `topic-promotion-commit.js`: one shared atomic existing-owner mutation body.
- `topic-promotion-history.js`: guarded structural undo/redo, preserving bodies
  and later human work rather than restoring a whole historical content image.
- `topic-promotion-access.js`: fail-closed preservation of existing restrictive
  Topic/Section Context fences without another permission store.

Existing Topic/Section/Placement/Entry, journal, operation-receipt and search
owners remain canonical. No shared layout, revision dispatcher, backup format,
database schema/version, Context, worker, AppShell or runtime-version owner was
edited. No recursive hierarchy, relation graph, taxonomy, candidate inbox or
second Library is introduced.

## AI proposal and explicit confirmation

`SectionPromotionService` is uninstalled production-domain machinery. It needs
a constructor-only current processing resolver, a constructor-only versioned
trusted assessment mechanism and explicit formation parameters. Request fields
cannot supply a permission flag, manual actor, arbitrary Source body or plan.

Preparation uses TOPIC-02 complete signed identity/constraint coverage and
TOPIC-03 current Input/Entry/Section evidence. Source-derived Section labels
must be safe and currently Input/filter eligible before assessment. Removed,
renamed, dormant and redirected identities participate; a same-name miss is
not identity proof. All applicable scopes and canonical identities are checked
before assessment, after preparation and in the final transaction.

The proposal must meet the existing six admission checks and cite a supported
independent goal, direct naming/input or separate reuse need. Volume and ordinary
internal aspects do not qualify. Existing-Entry spans stay bound to their real
direct dependency fields and exact-excerpt provenance. No Entry is manufactured
and no body is rewritten merely to promote a Section.

Preparation returns a process-private, instance-bound opaque handle carrying
the reviewable name and exact selected Entry IDs. Copies, another service's
handles and cancellation cannot confer authority. `confirm(handle,
{confirmed:true})` is the explicit trusted confirmation boundary; calling
prepare alone writes no proposal, identity, Placement, journal or receipt.
The eventual UI must show this actual selection and route the confirmation,
not synthesize approval from an assessment result.

## Complete selection, mixed bodies and work bounds

Both exact `explicit_entries` and `whole_section` requests are supported.
Whole-Section enumeration traverses every active Placement in that exact
Section and generation; no prefix is treated as the whole. Empty selections
refuse. The original/default Section remains a stable valid location even when
the confirmed move leaves it empty. Existing empty manual Sections are retained.

Pages contain at most 100 Entries and 100 Input references; existing content and
request byte budgets can split them further. Every Input scope is authorized
independently. A complete body-free manifest records identity/order, page
evidence digests and the total. The ephemeral reader rechecks current authority
and eligibility before each page. The assessor must actually visit every page
and acknowledge the exact manifest; an asserted count/digest without complete
visited coverage is insufficient. Missing, denied or ineligible tails refuse
the operation rather than silently moving a subset or creating several Topics.

Semantic proposal evidence and structural move selection have distinct roles.
The automatic admission anchors retain genuine Input/Source provenance. A mixed
Section may also contain a first-party independently user-created Thought.
For disclosure to the AI reader, such a row must have current user ownership,
`user_created` provenance, Thought body ownership and no Source/Input,
dependency or provenance references. Only its body and necessary identity/
revision metadata are supplied; its note is not. Its exact current body is
digest/CAS-bound. It never becomes a fabricated Input or an independent Source
contribution and cannot inflate subject recurrence.

The complete selection is retained transiently during preparation/revalidation,
not persisted as another body store. Every staging/resume and reader page
revalidates the complete relevant authority. This deliberately repeats reads;
paging does not imply constant memory, linear total latency or a native-browser
large-library SLO. Keyed Maps remove the obvious per-Entry quadratic lookup
loops, but final activation is still one O(selected Entries) write transaction.

## Explicit human structural intent, including all-manual Sections

The separate `ManualSectionPromotionService` implements ordinary user creation
and movement, not an empty-Input AI inference exception. Its normative basis is
[PT-02](../../TOPIC_ARCHITECTURE.md#pt-02--fixed-structural-depth-and-content-ownership),
which retains independent user-created Entries, and
[PT-07](../../TOPIC_ARCHITECTURE.md#pt-07--human-authority-and-durable-constraints),
which protects explicit create, move, Section, order and restore actions.
PT-04 separately makes human creation independent of automatic recurrence and
name-quality thresholds.

The trusted manual command accepts the user-entered Topic name and exact
Section/Entry selection, prepares an opaque preview and requires explicit
confirmation. It works when automatic processing is off and invokes no
assessor, processing resolver or provider. There is no fabricated resolver,
empty-Input AI guard adapter or claim that an AI judged an all-manual Section's
meaning. Broad, unusual, whitespace-bearing and identical human names remain
exact labels on distinct identities.

Manual activation creates a genuinely user-origin Topic with protected human
fields. Its independently user-supplied label has no fabricated Source lineage.
Structural selection may include currently readable retained Entries, including
human-edited derivatives and uncertain legacy authorship; it never relabels
them as independently authored just to pass. Current library seal, body owner,
Entry lifecycle, Source/Input availability/filter, suppression, key/restore,
revision and complete-generation fences still apply. Entry bodies are private
CAS snapshots only; notes never enter preview or staging. Existing B-01/B-02
decisions and their owner gates are unchanged.

## Durable staging, activation and rollback

Confirmed work uses separate reserved AI and manual prefixes/kinds in existing
`organizerWorkItems`, with a keyed signature over the exact confirmed request,
name, selected identities, authority epochs, snapshot digest and finite expiry.
These are terminal/nonrunnable rows with no Organizer `jobId`. They contain
metadata and the confirmed new label, never copied Source/Input/Entry bodies,
notes or the local hashing secret. Ordinary Topic/search/Context readers do not
read them. Staged per-Entry rows contain existing Placement/intent metadata only.

The existing Source index disposes of related work during purge cleanup, and
existing-file replace restore clears it. Restore/key/permission/source changes,
concurrent organization and stale confirmation all fail closed. Bounded staging
can resume in a new store/service instance. Until activation, canonical Topics,
Sections, Placements and Entry intents are unchanged; there is no partly moved
visible Topic or partial negative intent.

Atomic activation allocates one new stable Topic ID and default Section ID,
preserves the parent identity/default/named Sections, and moves exactly the
confirmed memberships. It preserves relative rank, body ownership, Source/Input
facts, provenance and unrelated memberships. Old source memberships become
protected removals; destination inclusion and source exclusion update the same
existing Entry intent owner, including fixed sets, in that transaction. It does
not redirect the parent, merge identities, duplicate all promoted memberships,
copy bodies or write external grants.

The same transaction writes existing journals and an idempotent operation
receipt, then removes disposable staging. Failed middle Placement, journal or
receipt writes roll back everything. Explicit rollback before activation removes
only staging. A cancellation arriving after successful activation reports that
it is already committed; it does not falsely report a cancelled mutation.

## History and restrictive access

Existing Placement journals retain old Topic/Section/generation/rank anchors;
body-free intent journals and receipt pointers bind the exact structural change.
No new durable history/mapping family is required. Undo/redo preserves one new
identity and updates protected reverse intent. It never restores an Entry body,
Source, note, permission or stale label image. Later body-only changes and
unrelated parent names survive. Conflicting later memberships, exclusions, fixed
sets, placement order, target Section/name/keep/removal or layout changes refuse
instead of silently overwriting human work. Purged history cannot recreate body
content or replay a movement.

Independent review found an important initial PT-11 defect: removing a denied,
never-allowed or Section-excluded parent path could expose a shared Entry through
another already-allowed Topic, despite the new Topic remaining closed. The same
defect affected structural undo. The repaired guard reads the current permission
owner's paged Topic/Section rows and refuses removal of a restrictive path in
activation and both history directions. It preserves restrictions from inactive
or nondefault profiles too. Ordinary default-off is not treated as a denial.
No permission is copied or rewritten; separately revising a restriction remains
with its existing owner. Actual `MemoryService.permittedPaths` regressions prove
the before/after effective-access result, not merely absence of grant writes.

## Verification

At the final test head `a0bc5475`:

- 78 Topic04 owning cases are included in the combined affected run: 441 passed,
  0 failed, 0 skipped. Coverage includes all retained Topic01/02/03 cases and
  affected Thought, Organizer, body-binding, Source purge, strict restore and
  Memory/Context authorization tests.
- Independent exact-runtime review passed the preceding 77-case owning suite,
  23 targeted effective-access cases, nine additional manual safety probes,
  mixed strict restore/history, and the zero-Source 249-of-251 scenario.
- The standard parallel privacy invocation recorded 58 passed and one failure
  in the unchanged ANS-03 Source-observation notification assertion
  (`true !== false`). Its isolated actual test passed. The existing supported
  serial privacy runner then passed all 59 cases plus the development
  privacy/permission/network audit. No assertion or timing budget changed;
  the failed parallel observation is retained, not recast as a pass or proved
  to be a baseline defect.
- Source static package guard: 10,362 checks across 307 runtime resources passed.
- Release build: 10,298 checks across 303 runtime resources passed; release
  product guard passed with 327 files. That baseline inherited version 0.12.1.
- `git diff --check` passed. No production promotion worker command, external
  account/grant, model/provider service, paid processing, installed user data or
  browser interaction was activated. Tests use synthetic permission rows and
  existing worker/privacy dispatch fixtures only.

Exact affected invocation:

```sh
node --test tests/cpv1-topic-*.test.mjs \
 tests/thought-m1.test.mjs tests/thought-m2.test.mjs \
 tests/organizer-m3.test.mjs tests/original-organizer-v072b.test.mjs \
 tests/shared-working-content-round8.test.mjs tests/ux-r3-thought-binding.test.mjs \
 tests/ux-r3-topic-actions.test.mjs tests/topic-quality-round5.test.mjs \
 tests/topic-quality-v080.test.mjs tests/library-entry-conflict-vs04.test.mjs \
 tests/backup-hardening-v092.test.mjs tests/cpv1-01-5-backup.test.mjs \
 tests/dvn-source-purge.test.mjs tests/memory-safety-v0100.test.mjs \
 tests/context-access-v0101.test.mjs tests/ux-r4-context-authorization.test.mjs
node scripts/test.mjs 'privacy/security'
node --test --test-name-pattern='ANS-03 source observations' tests/background-security.test.mjs
PAIA_TEST_CONCURRENCY=1 node scripts/test.mjs 'privacy/security'
python3 scripts/check_package.py
npm run build:release
```

The 257-Entry production-function test uses five budget-bounded assessment pages
and 100-row staging batches. It interrupts/reopens the store before activation,
rejects premature activation, injects a middle failure at destination Placement
129 and compares a digest of all canonical tables before/after the failed write.
It then activates exactly one Topic, proves all 257 bodies/intents/memberships,
and performs complete undo/redo. Current observed Node/fake-IndexedDB values:
455 ms preparation, 851 ms activation including revalidation, 570 ms final
transaction and 2,592 writes. These are synthetic mechanics observations, not
Chrome/device memory, durable real-user migration or a product latency promise.
Separate tests cover a 111-of-113 explicit subset and 103 independent Inputs.
A retained manual test promotes 249 of 251 authored Entries with literally zero
Sources/Inputs and an `evidenceFor` method that throws if called: three staging
batches, undo/redo, exact bodies/owners/name and two unselected memberships all
pass with zero evidence-adapter calls.

Earlier negative evidence is retained: strict restore rejected an invented
membership-intent reason until the writer reused existing `user_edit` semantics;
large descriptor pages exceeded the existing byte budget until adaptive splitting
was implemented; a new test's nested readonly transaction caused a harness-only
failure and was repaired without weakening assertions. The first owning tail-permission
fixture used malformed early IDs and could not prove pagination; it now requires
valid Memory rows and asserts at least two pages and 126 visited rows. Review's
effective-access reproductions are now owning regressions. No timeout, corpus, historical test,
permission gate or package guard was weakened.

No full local benchmark rerun or local Chromium retry was performed. Prior
controlled-machine timing limits and verified Chromium process-singleton socket
denial remain unverified/blocked evidence, not passes. Hosted exact-head
certification, dependency-ordered integration, coordinated version/STATUS and
exact-main verification remain with the integration owner. Real model quality,
service activation/budget, private migration, live Context client, production UI,
installation and release remain unverified or separately gated.


Independent review separately reproduced the same restrictive-path loss in the
pre-existing TOPIC-01 `moveMembership` operation. Its owner retained the reproduction and published the separately reviewed
maintenance candidate in PR #184. The combined checkpoint above consumes that
exact repair; its full/main proof remains separately tracked. Topic04's scoped
clearance covers its own activation and history paths, including the explicit
manual path, and does not certify the shared foundation or whole product.
