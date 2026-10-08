# CPV1-TOPIC-01 — identity and human-intent foundation

Initial implementation base: remote main `0093c81300b8dff80b0cf00c4f2cad6130840030`.
Scope: PT-01/PT-07/PT-08; G01/G02/G03/G08 foundation only.
State: COMPLETE — scoped identity/human-intent foundation only;
INDEPENDENT_REVIEW_CLEARED / MAIN_INTEGRATED / EXACT_MAIN_FULL_VERIFIED.
The sole STATUS pointer advances to TOPIC-02. No later slice is certified here.

## Scoped closure and exact proof — 2026-10-07

The deliverable and acceptance in TOPIC_ARCHITECTURE_PLAN section 4 are closed:
dynamic stable identity, durable human field/edge authority, bounded conservative
compatibility mapping, strict restore/deletion fences and preserved effective
access through the existing structural owners. The later permission defect was
reopened and repaired before this closure; it is not erased by earlier passes.

- Original reviewed 0.13.0 head `802239b099b47f477c9cb8ddd0165609dd542e63`
  passed full `37554248921` and merged through PR177 as `492899d4`.
  The insufficient light merge run `37557706680` remains insufficient. The
  corrective marked main `288e17fb` subsequently passed full `37558949728`
  and Prompt `37558949666`.
- Effective-access repair PR184, reviewed head `caf3b70b77599c7f2c12473c1ceac6d7616df63f`,
  tree `c6f6d5c1cee4e1b112e4a36afe84c4dd742c8700`, passed full
  `37565860724`. Main `66fe65cae9ad7766362a0b09f2651e139b863258`
  integrated that exact tree at 0.13.1.
- Repair-main full `37567653820` failed only browser shard 2: release row
  A01-1440-light hit the old `CSS.getPlatformFontsForNode` stale-node sampler
  error, producing 9/10 instead of 10/10. Artifact `11460245920`, ZIP SHA256
  `b58423c8520bf818647f72abd7d4352ab5c065cc08a6731574f0313f540eb389`,
  preserves the negative; the source Archive and Reader matrices each passed
  10/10. This failed run is not relabelled PASS.
- The independently reviewed Context01 integration carries the corrected
  sampler and repaired foundation. Exact main
  `948ea06a57cd932c187407faf7140d9fb6714eff`, tree
  `78dbc060a3406ce301d1ca9b5f2d183d801ac619`, version 0.14.0,
  passed [full Certification 37611452025](https://github.com/haohongfei2001-png/paia/actions/runs/37611452025)
  and [Prompt 37611451822](https://github.com/haohongfei2001-png/paia/actions/runs/37611451822).
  All four unit shards, six current-browser shards, adapter/privacy, release,
  both macOS jobs and final gates passed. Historical-browser audit stayed
  separately policy-skipped.

The downloaded exact-main aggregate `11479426003` was hash-verified as
`24b1cd9ed18cb5a38073fe93dbc0b695987a801e628df365438d87de6a195568`.
It records exact SHA `948ea06a`, fullSuite/auditPassed true and 317 current test
files (235 unit, 73 browser, 3 adapter, 6 privacy); realGolden is UNAVAILABLE.
Initial closure preparation base `4a3cb4e663d8ae745f8385c5c854d5b060e26309`
adds only Browser-Native Sync documentation to that main. Final reconciliation
preserves verified Context0.15 main `0a438ccc` and the subsequent AIU/AIOS
documentation adoption `9a742673`, including its exact historical snapshots.
Neither documentation adoption changes runtime. This receipt/pointer update
changes no runtime, test, version or gate.

COMPLETE applies only to the bounded foundation contract. Real user migration,
semantic formation/model quality, the new Thought UI, live provider/client
behavior, physical-device installation and whole-product acceptance remain
outside this closure and are not inferred from hosted synthetic evidence.
Separately authorized dependent engineering continues with its own exact proof.
The following sections retain their historical candidate states and limitations;
the closure above supersedes their then-pending certification state only.

## Effective-access repair — 2026-10-07

Independent later integration review reproduced a missing foundation invariant:
moving a shared Entry from an explicitly denied Topic to a default-off Topic
removed the negative access witness, making an already-allowed third Topic a
permitted path. No grant row changed. This is a real permission-semantics defect
in structural membership changes, first reproduced through `moveMembership` and
then through direct placement, Topic removal and layout staging owners. It does
not establish an activated external client or provider. The earlier passing suites
remain truthful evidence, but did not cover these cases.

[The bounded repair record](TOPIC-01-ACCESS.md) tracks the fail-closed permission-
owner guard, actual effective-path regressions and coordinated `0.13.1` candidate.
Scoped COMPLETE and the next-task advance are withheld until the repaired head
has independent review and the required exact-head/main proof. Later Topic and
Context work keeps its own scope and does not erase this reopened obligation.

## Integration and verification routing — 2026-10-07

PR #177 integrated as main `492899d4e0c79b6c0cbb9ca0212f3e073c871d83`, tree
`7022ba0ec51bf0dcab7ac3cfd710f792817d30d2`, with product version `0.13.0`.
The main tree is identical to independently reviewed head
`802239b099b47f477c9cb8ddd0165609dd542e63`. Its full Certification
`37554248921` passed all four unit shards, all six current-browser shards,
adapter/privacy, release/build, both macOS jobs and the final certification gate.

The merge message omitted the required full-depth marker. Consequently, push
run `37557706680` selected round-integration and skipped the full browser/macOS
jobs. That run cannot substitute for full exact-main certification, even if its
ordinary checks pass. The workflow reminder added with this receipt repeats the
existing protocol rule; no runtime, version, workflow, timeout or test changes.
The documentation-only correction requests a full exact-main run with the
literal marker. Its terminal result and the final canonical closure remain
pending; no full main PASS or stage COMPLETE is claimed here.

## Release-alignment successor — 2026-10-07

Published implementation source: `de28068e54392de2d557fcf90b944f1201c3ddcc`.
Prior hosted Full Certification `37549715747` belongs to that source head only;
it is not exact-head evidence for this successor. The original candidate and
its historical local evidence below remain preserved.

This isolated successor reconciles documentation-only fresh main
`29940a921e4797c463a5e7e8436bafe6125f9f1d` through local merge
`28e7975adda6a5eff41b772a1200581ecea99e52`. It retains the final Thought visual
adoption and Topic foundation, and applies the coordinated `0.13.0` product
identity (`v0.13.0 Topic Identity Foundation`) with the version/build policy.
The sole additional runtime logic change admits producer minor 13 to the
existing strict restore header. Schema and secret refusal, future-minor
refusal and cancelled production export remain unchanged. No Context runtime,
Topic-02, STATUS queue, provider, permission or UI changes are included.

Successor local verification: 75 owning/version/backup/restore/export tests
passed; privacy/security passed 59 tests; source package audit passed 9,891 checks;
development privacy/permission/network audit passed; generated 0.13.0 package passed 9,827 checks and the release
product guard (313 files). Version identity agrees across manifest, version name,
package and generated manifest. These are local candidate results only.
The known unchanged local historical-import timing limitation was not rerun.
Chromium was not relaunched or worked around after the recorded process-singleton
socket restriction. Independent successor review cleared the bounded diff with
35 owning current-version/identity/restore tests passing. Exact-successor hosted
full certification remains pending, followed by exact-main validation if integrated.
No installation, user reload, public release or production acceptance is claimed.

## Identity and ownership

A fresh library still has zero Topics. IDs are allocated only when an existing
trusted creation operation creates an object. There is no seeded taxonomy,
144-row directory, mandatory label, or separate AI identity store. Human names,
including equal or unusual labels, do not merge identities.

Existing `topics`, `thoughts`, `placements`, `meta`, journals and operation
receipts remain the owners. No object store, database version, copied Entry body,
provider, host permission, runtime dispatch command or UI is added.

- `topic-identity.js` is the common redirect, exact-name fence, lifecycle and
  keep-separate domain contract. Names remain on existing Topic/journal owners.
- Topic `identity` is versioned metadata: original actor or explicit unknown,
  revision, unknown scope (`null`), body-free keyed name token, alias token and
  operation/revision/actor history, and removal/merge lifecycle intent.
- `personalTopicName:<HMAC>` rows reference the same Topic IDs. Tokens use the
  existing local suppression key, contain no raw labels, and serve exact-name
  collision/removal fences. They are not evidence of semantic identity or a
  complete identity-retrieval index.
- Known legacy redirects remain usable even when an old row retained `active`.
  Cycles, missing targets and unsupported states fail closed.
- Rename/takeover keeps ID and origin. Both ordinary `editTopic` and foundation
  `renameTopic` record aliases under existing CAS and journal ownership.
- Candidate lifecycle is an internal contract only. No candidate constructor,
  ordinary resource, list, count, badge, approval inbox or grant target is added.
  Dormancy mechanics are defined but no automatic lifecycle runner is started.

## Human authority

New Entry organization intents are versioned and edge-specific. Include/exclude
records carry actor, operation, time, reason and revision. Existing broad flags
remain for compatibility/history; automatic placement consults the specific edge
contract rather than using a human rename or unrelated membership as a global
freeze. Unknown legacy organization/locks remain protected.

`moveMembership` atomically records exclusion from the old Topic and inclusion in
the destination. `fixMembershipSet` protects the current set. These are trusted
local domain operations, not externally callable worker commands. Subsequent
explicit user changes may revise the protected set; an AI rerun may not.

An existing protected Placement cannot be moved/reordered/rewritten by automatic
assignment. A new lawful unprotected edge can be added independently. Placement
changes preserve one canonical body and all Source/Input evidence.

Keep-separate is checked through canonical redirect endpoints at merge staging,
activation and redo, including indirect third-identity collapse. New keep-separate
requests refuse while a layout job holds either identity. Existing merge Undo
continues to restore protected history and cannot turn redo into a bypass.

## Compatibility, restore and deletion

`mapTopicIdentityBatch` is explicit and not invoked on startup. It processes at
most 100 existing Topic rows per call, computes tokens outside the transaction,
checks the current cursor/name/revision, writes atomically and resumes after
restart. It adds metadata only: no Topic rename, sweep, demotion, body change,
permission write, historical alias invention or business revision reset.
Existing imports without this metadata remain readable and conservatively
protected. Actual user databases have not been accessed or migrated.

Strict existing-file restore admits the versioned metadata and validates its
complete graph, name-token references, fixed/excluded memberships and separate
identities. Partial, unknown, malformed and inconsistent payloads refuse. Foreign
hashing keys with incoming name fences cannot merge silently. The compatibility
cursor is invalidated after restore; existing recovery-restore epoch and Context
ownership are unchanged. Backup generation remains unavailable.

Source purge keeps no additional label/body copy in this metadata. Existing
purge fences remove source-derived Topic revision text; independent human labels
remain. Only body-free tokens and identity intent survive as suppression facts.
This does not resolve B-02 or authorize a real destructive migration.

## Evidence and remaining gates

New owning files test actual domain/transaction/restore functions:

- `cpv1-topic-01-identity.test.mjs`: empty/dynamic IDs, AI-origin human rename,
  alias fences, new edges after rename, atomic moves/replay, fixed sets,
  third-identity separation, merge Undo/redo, removed/restore protection,
  stale CAS/failure rollback, bounded restart mapping, unknown legacy authority,
  lifecycle refusal, redirect cycles, dormant no-recreation and no network or
  authorization writes.
- `cpv1-topic-01-restore.test.mjs`: strict round-trip, partial/malformed graphs,
  legacy compatibility, failed restore rollback, foreign-key conflict and
  source-label erasure with body-free negative intent.

Initial owning/affected run: 161 passed, 0 failed. Later combined affected run: 189 passed, 0 failed. Subsequent owning identity and
restore files reached 31 cases, all passing, including independent-review repairs.
The reviewed epoch/legacy-fence batch passed 187 owning/affected cases. Earlier two compatibility failures were fixed
without weakening old assertions (explicit merged old-name redirect and legacy
active-row redirect). An initial full unit attempt recorded 1,927 passed and one
failure in the unchanged controlled-machine 10k historical-import <120s timing
assertion. The isolated candidate run also failed (approximately 164 seconds
total), and unchanged main `0093c813` reproduced the same failure (approximately
162 seconds total; 145,886 ms commit). This is a pre-existing local benchmark
limitation, not a timing pass. Final exact-head full verification remains pending. No timing threshold, corpus, test routing or workflow was changed.

Independent review found and repaired two blockers: ordinary removal/merge of an
unmapped legacy Topic did not register its current normalized name, and a real
restore could replace the hashing key between name preparation and commit.
A third reviewed sequence, source-label purge followed by human rename and
strict restore, now retains the prior opaque token without recovering erased
text. Current-label fences now register transactionally on remove/restore/merge/redo.
Name preparation binds current restore epoch and, for ephemeral local proof, the
existing key; all commit paths recheck before writes. Persisted organizer work
contains only the body-free epoch, never another copy of the key. Actual
BackupService replace-interleaving tests cover create, rename, remove, metadata
mapping and automatic name commit. Restored unpinned lifecycle protection has a
decisive regression. Compatibility after label erasure retains the prior token.

Package static guard passed after replacing an internal lifecycle field name
that the package import scanner mistook for an import. Independent data review cleared local runtime head
`4866b329c31d9c04d03b9c003d826818905d02d8` / tree
`82eadd3eaf286e87d3d7bbacbf6c0fa78f728ddb` with 69/69 affected tests. Local
privacy/security 59/59, static package and source/release package build passed.
A later full-unit sweep recorded 1,942 pass / 1 fail, again only the baseline
10k timing assertion; the final two-line alias correction was independently
retested rather than credited as an exact full sweep. Actual cloud Chromium
source/release Topic Content attempts could not launch: process-singleton
`socket()` was denied by the executor. The adapter group is therefore also
not a local pass. Hosted exact-head full/unit/adapter/browser certification and
exact-main verification remain required before integration. Browser/device, installed version,
real-data migration, model formation quality and downstream utility are not
claimed. The original foundation deferred its runtime version to the integration owner.
The release-alignment successor above applies the coordinated version after
fresh-main reconciliation; the historical evidence does not certify that new head.

TOPIC-02 owns complete bounded identity retrieval and hidden candidate/unassigned
handling. TOPIC-03 owns generated naming, six-part admission, Section formation
and real authorized processing. This foundation does not activate either stage,
a real model, Semantic Lab, external access, billing, deployment or release.
