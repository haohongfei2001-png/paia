# AI-COST-01 — local foundation work in progress

Base: main `8c7561166e6fd617455e05ce19b1c65582b85692`, product 0.18.0.
This is the separately selected, owner-authorized local AI foundation lane.
It does not close the existing exact-main Context UI readiness failure or change
any other lane's verification. No integration version is assigned here.

## Owner and storage contract

- Canonical `inputStates` and human `revisions` supply semantic revisions. The
  repository transaction observes these writes and bounded human Context Item metadata and coalesces a metadata-only
  dirty marker atomically with them. Source, Working Input and human Thought
  bodies never enter the queue. AI-only derivatives, page reads, preference
  changes, cosmetic writes and duplicate canonical revisions do not enqueue.
- `meta` contains bounded-prefix dirty/known metadata, an ordering counter and
  a conservative human-mutation fence. Minimal dispatched-operation tombstones prevent restore from reminting an attempt
  after transient jobs/usage were cleared. They contain only opaque operation IDs
  and cannot authorize spending. The sequence orders work only; it is
  never a coverage acknowledgement. No new object store or schema version.
- `organizerJobs`, `organizerWorkItems` and `organizerUsage` own namespaced jobs,
  coverage and local reservation/outcome receipts. No second ledger per feature.
  No financial authority is claimed: actual trusted entitlement/reservation and
  cross-device paid admission belong to AI-COST-02.
- The new planner pages only dirty metadata. Historical `dual-view.planDelta`
  remains for retired compatibility callers; no new scheduler invokes it. It
  resolves all Input bodies and must not be reused for AIU scheduling.
- Topic and Context domain owners retain exclusive content-commit authority.
  Facet acknowledgements require their successful same-transaction callback and
  the exact committed coverage subset. Partial Topic scopes and Context holes
  remain distinct. New service construction without trusted authorization and
  domain owners fails closed.
- Existing backup/BNS allowlists already exclude AI job kinds, work items, usage
  and the new metadata prefix. No grants, consent, cache or job travels as content.

## Schema-free durability justification

The dirty index is a replaceable projection over canonical revisions, not new
content. Durability is necessary to survive worker termination without losing
pending work or reminting a possibly billed attempt. Jobs reference exact
canonical revisions and opaque lineage; domain owners remain the truth source.
Deletion and changed human/consent/restore fences invalidate handles immediately
at use. No actual-user migration, bulk body scan, content rewrite or backfill is
performed. Recovery of an old database needs a separately bounded metadata-only
bootstrap before claiming historical coverage. No existing user work is changed.

## No activation

No worker command, Provider registration, real transport, credential, entitlement,
subscription, commercial service, grant or paid allowance is enabled. Local and
fixture routes only. The design's future $50 evaluation proposal remains a
proposal, not spending approval. Remote generation remains unavailable.

## Evidence

Local implementation and 23 owning deterministic regressions pass at code
checkpoint `9b591753`. An earlier 325-test affected regression pass and package /
privacy / release passes are retained; the final composed tree is being rechecked.
The dormant service is present in the release graph through OrganizerStore and
its default constructor rejects admission. Independent review remains pending.
Three broader Backup browser tests initially could not load the inherited
Playwright default path; they did not run. Prior verified cloud browser socket
restrictions prohibit local native proof. Source/release native regression is
prepared for the existing reviewed hosted candidate route and is NOT_RUN.
No model fidelity, real-provider, financial, production UI or installed-device
qualification is claimed by this contract.

## Cross-device prerequisite (not certified by this local slice)

The current separately reviewed BNS runtime materializes Prompt state only. It
does not admit a full canonical Input writer. This foundation currently reuses
local Input contentRevision and stable canonical IDs; delivery sequence is
excluded. Before a BNS Input writer is admitted, divergent equal-counter body
versions require a stable causal/content-change token. That writer must provide
the token or prove that every genuinely different winning body advances the
canonical revision, while replay of the same content revision is inert.
Numeric revision equality alone is not a cross-device content proof.
Library/principal binding is constructor-injected synthetic authority here, not
a live BNS or paid-service identity. Cross-device paid dedupe remains a trusted
service prerequisite of AI-COST-02.

## Retained performance and lifecycle findings

The first local full-unit run retained 2,815 passing tests and one failed
10,000-Input benchmark: its non-CI 180-second watchdog expired. No timeout or
assertion was changed. Sequential tests under the suite's existing CI profile
passed on unchanged main 8c756116 (174.18 seconds) and candidate (183.22 seconds).
These synthetic fake-IndexedDB/cloud timings do not meet or certify the separate
controlled-machine 120-second commit target and do not prove browser performance.

Follow-up regression covers known-response cancellation as EXPIRED_UNCOMMITTED
without refunding attempts/spend; actual unknown children remain blocked. A
default-denied, exact-operation-bound trusted outcome verifier can reconcile a
receipt without dispatching a replacement. Historical journal deletion/replay
cannot remove or downgrade current dirty work, and derived revision bookkeeping
does not create semantic work. The owning suite now has 28 passing cases.
Existing portable backup explicitly excludes jobs, coverage, usage and attempt
fences. Full final-tree unit/native review and certification remain pending.

## Bounded review repair — local candidate, 2026-10-07

The retained independent review found four failures: one verified-rejected child
could hide its reserved sibling and release the parent flight; Topic-only
acknowledgement removed pending Context evidence; arbitrary journal UUID order
could downgrade restored human revisions; and keep-separate fence changes could
return an unusable same-ID plan. These are retained negative findings, not a
passed foundation receipt.

Repair checkpoints `5ffb27f8` and `17f37677`, followed by the zero-attempt
local-remainder repair, preserve the immutable logical/child identities and the
default-denied production boundary. Parent aggregation considers every child,
including not-yet-reserved siblings. A dispatch rechecks current flight ownership.
Per-facet pending work remains independently collectable; explicit Organize can
describe eligible known evidence after maintenance is acknowledged. Same-revision
journal delivery is inert, and one transaction coalesces the newest human
revision for each physical owner. Never-dispatched local/unused work can rebind
to current human fences without changing child IDs, checked coverage or unused
reservations. Dispatched, recorded and unknown attempts cannot rebind.

Actual replace testing also exposed stale scheduling metadata for the target's
removed canonical owners. Existing canonical-store clear transactions now remove
only that entity kind's rebuildable known/pending metadata in 100-row prefix
pages. No body scan, new store or content migration is added. Clear/write order,
unrelated kinds and transactional rollback are covered. Dispatch/flight fences
and the attempt counter remain; existing replace still clears transient jobs and
usage under its previous contract. An unresolved dispatched flight still refuses
a replacement attempt. This is not a real financial ledger or reconciliation
claim.

Current-main AIU-QWEN-1.0 was read at `e119a427`. This local slice remains
provider-neutral: opaque route/snapshot metadata does not mutate canonical IDs,
permissions or human work; untrusted provider/model/native-currency fields are
rejected. No Qwen SDK, credentials, provider registration or native-currency
allowance is implemented.

Evidence on the composed repair runtime:

- 42 owning foundation tests PASS; SHA-256 of the local result log:
  `e1fd661bbad481e7e6874a882a1f60d54a6e5c2692d8fb7eefe4054eba14321d`.
- 279 affected canonical/backup/Context tests PASS; log SHA-256:
  `b198ff374ea064d493a4547714de0858d878eb700a3683126de250e6505bcfbf`.
- 11 privacy/package tests PASS; log SHA-256:
  `c3a223bb07a766b47b899ccd1283a248da620fe26b4f2c99682d353483026c56`.
- Source package audit PASS: 10,937 guardrails across 324 runtime resources;
  log SHA-256:
  `c56ef408ba5f68cb84c98c7c5a57bf3eea98834dd67366303807d7c54b35b06a`.
- Release build/guard PASS: 344 files, with exact repaired source/release module
  comparisons. Build log SHA-256:
  `56eef453570f3216c58b093ecd86c9d36ab185bbb706fe6f68668f3d8d8ebe83`.

These are affected local checks, not a full certification, independent successor
review, native Chrome run, real-model quality/billing qualification or installed
device receipt. The authored source/release native test remains NOT_RUN under
the retained cloud socket restriction. Its hosted routing is separately pending;
no existing placement or CI timeout was changed by this repair. No publication,
paid operation, migration of real user data or deployment occurred.

## Handoff recovery and bounded independent review — 2026-10-08

Recovered the foundation patch on exact base
`8c7561166e6fd617455e05ce19b1c65582b85692`; the resulting pre-repair tree is
`c91c608f4275f92cb8025789aca7c637f449b4f1`, matching the handoff. This reconstructs
file content, not the unavailable original tip commit history.

Independent negative probes reproduced caller-reference mutation across async
boundaries: a caller could add a body field to an already checked planning
item, change its coverage scope, or add a body field to a provider descriptor
before dispatch admission persisted it. The repaired entrypoints snapshot the
planning request, local/response facet units, provider metadata and verified
outcome DTO before async
work. Existing domain and storage ownership, immutable attempt IDs and
production default denial remain unchanged. Original failures are retained as
negative evidence; the original tree is not retrospectively certified.

Fresh local verification after this bounded repair: 46 owning cases (the prior
42 plus four mutation regressions), 251 affected cases across 17 complete
canonical/organizer/Context/backup files, and three privacy/package tests pass
with zero skipped/cancelled cases. Package audit passes 10,937 checks across 324
runtime resources. The handoff's 279-case file list was not provided; the fresh
251-case scope is not labeled a replay of that earlier claim.

Native source/release execution and independent review of this repair remain
pending. The existing native test's page reload/new instance exercises durable
reopen, not service-worker termination with a fresh heap. No paid service,
financial qualification, model quality, real-user migration, production
activation or installed-device acceptance is claimed.

Coordinator review additionally identified a retained verifier-result reference
in reconciliation. A negative probe changed a verified NOT_ACCEPTED outcome to
ACCEPTED and substituted receipt text before asynchronous persistence. Snapshot
the returned verifier DTO immediately while retaining exact binding validation;
the added regression preserves the verified rejection and its original receipt.

## Coordinator headless source/release verification — 2026-10-08

Restored and repaired runtime/test tree `1feb5f37934c2aaab57af9e760489780213469c1`
passed both complete native source/release cases after a fresh release build.
Actual headless Chrome used isolated temporary profiles and synthetic IndexedDB,
100 valid captures, atomic rollback and page-reload unknown-attempt fencing;
zero provider/external requests were asserted. The test name now accurately says
page reload. No worker-termination, installed-device or paid-provider claim follows.

Retained negative evidence: sandboxed Chrome could not launch; the first actual
source/release run failed because the synthetic capture used pageOrder zero.
The fixture now uses 1..100 under unchanged production validation, scale and
assertions. An earlier native pass preceded the final outcome-verifier snapshot
repair; it is not substituted for the final rebuilt two-case pass above.
Coordinator review requested and verified the additional verifier-result snapshot
repair; hosted high-risk/full integration and exact-main proof remain pending.
