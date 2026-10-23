# Independent Topic identity source issuer: reviewable local contract proposal

Status: proposal only. No new processing purpose, consent switch, default policy, scheduler, provider, account access or runtime permission is implemented. This proposal follows `063adbc8` and the real source-issuer refusal evidence `47254d3d`. Root may include it in one consolidated scope/authorization decision; it does not require a separate decision for each internal function.

## Existing contracts and two distinct missing links

`TopicProcessingAuthority.authorize` requests exactly `{version:1,purpose:'personal-topic-identity',binding,restoreEpoch,inputIds,topicIds}`. Its original private capability authenticates the exact transaction, original store/database, caller, request, shared work budget, issuer receipt, deadline and synchronous revocation. Original `TopicProcessingGuard` checks that capability again and registers final Source/identity facts. A field qualification is deliberately not sufficient.

`createMaintenanceSourceProcessing` instead requires an original same-transaction `LocalMaintenanceSession` selector permit and, for qualification, the original qualification wrapper permit. Its purpose is exactly `ai-maintenance-qualification` or `ai-maintenance-payload`. It admits only the original selected Input descriptors, exact child coverage and fixed field sets. It cannot produce the above identity-purpose receipt; changing its scope or wrapping that receipt would assert an authorization it never granted.

There are two actual gaps, not just a missing third argument:

1. No source-owned independent identity issuer currently serves the identity request. The dispatcher tests use synthetic processing receipts behind the genuine original `TopicProcessingAuthority`.
2. The current source-owned field issuer does not admit structural/placement/bound descriptors. The new dispatch handle is obtainable from such original prepared handles in the local synthetic configuration, but this fact does not prove that the installed source-owned maintenance path can prepare them. A new identity issuer alone must not be reported as enabling that production journey. Plain Input-only handles remain unable to infer an arbitrary Topic.

## Proposed finite caller and selector contract

The sole consuming path is an explicit `TopicLifecycleDispatch` created from the actual `LocalMaintenanceSession` private handle. No public DTO, provider response, copied handle, serialized cap or raw Topic ID list selects a Topic.

The selector remains the original handle's already-qualified structural, placement or bound Entry mapping. It emits only exact Topic IDs, expected Topic revisions and the already selected primary Input IDs. It must prove every requested Topic belongs to that original mapping and every requested Input belongs to the requested Topic's original mapped Input set. An original preparation request with no Topic IDs may use only the same selected Input union; it cannot select new Topics. A request cannot relabel an Entry/Section descriptor as an Input descriptor. The original mapped coverage and independent field qualification remain required wherever those owners read fields.

The request grants identity processing only. It exposes no selected body, note, title, summary, old history, arbitrary whole-Topic contents or provider payload. The permitted metadata reads must be a fixed original-owner projection sufficient for current identity and lifecycle eligibility: exact selected Topic identity/revision/lifecycle/locks, mapped Input current revision/removal/filter and Source identities/presence, original database/restore identity and current independent identity consent facts. Physical IDB row reads that contain other fields must be accounted honestly and immediately reduced to the approved projection; no copy/hash/retention of ungranted fields. Existing activity/member/provenance checks continue to use their original owners and do not become broader because an identity receipt exists.

## Issuer, use lifetime and refusal

A future issuer must have an independent source-owned grant for `personal-topic-identity`; saved maintenance field consent, capture consent, Context external access, a policy DTO or a provider response cannot synthesize it. The trusted installation must retain the exact source-owned issuer object and frozen caller identity, not copy/wrap an issuer into an unbranded fallback. No default issuer is installed and unavailable source identity means refusal.

An internal same-transaction permit would bind the original session/handle, mapped selection, actual repository transaction, exact identity scope, stable action ID, original grant generation, restore epoch and shared qualification budget. Only the original selector/owner may mint this empty branded token. It must not expose a general permit constructor. The real identity issuer checks the permit before any newly permitted read. The source-owned field issuer's current `originalPermit` is unchanged.

The raw identity receipt retains the original exact shape and is accepted only by the existing `TopicProcessingAuthority`: version, store, frozen caller, exact scope, issuer epoch, processing=true, fixed expiry and genuine abort signal. Receipt identity and synchronous `isCurrent` must be source-owned. Deadline cannot grow when a caller repeats a request or reconstructs an adapter. Current checks include actual session disposal, service/account/caller replacement, grant disable/revocation, restored database/namespace, selected-source retirement and clock regression. Late revocation must fail the original final fence; a late or lost result never becomes evidence of no write. An already committed operation is reconciled by the exact durable receipt, without a second write or renewed grant.

Reject unknown/extra purpose or fields, descriptor substitutions, selected/unselected ID mixing, copied/foreign capabilities, wrong store/transaction, incomplete metadata, removed/quarantined Source, stale expected revision, human keep/pin/lock, expired/revoked grant, changed caller, malformed or extended lease, exhausted budget and unsupported field/structural preparation. Closing the dispatcher stops later actions, but must preserve the actual settlement of an in-flight original transaction. Partial results retain already settled receipts and the exact unresolved action.

## Budget and implementation boundaries

Use the original handle's qualification work budget. Do not create a new budget per issuer call, callback, page or retry. Preserve the original owner bounds and the existing first-read transaction envelope of 4096 references / 2 MiB / at most 30 seconds; time already spent must reduce remaining time. Existing Topic identity request bounds (at most 20 Inputs and 8 Topics per request), mapping/coverage bounds and the explicitly injected lifecycle policy still apply. Those are implementation ceilings, not approval of a default inactivity interval or default batch size. All denial paths should avoid semantic reads and provider/model calls.

If a later decision authorizes a **local synthetic implementation only**, a finite package would consist of:

- A new independent `core/ai-usage/topic-identity-source-processing.js` source issuer, private grant/use records and fixed metadata policy. It must not broaden `maintenance-source-processing.js`.
- A narrowly defined private permit capture/read seam adjacent to the current lifecycle handoff in `local-maintenance-session.js`, consumed by the original `TopicProcessingAuthority` adapter with its existing shared budget. If the source-owned prepared-handle contract is unavailable, refuse; enabling structural field preparation is a separate explicitly identified contract change, not an incidental fallback.
- A dedicated synthetic grant owner/fixture and owning tests. No installation in `background.js`, no settings default, no OAuth/token/provider or real-user action is part of this package. A future production grant owner/consent and host installation must be reviewed separately against the actual approved purpose.

The exact new grant owner authority, approved field/metadata scope and production consent semantics are decisions needed before implementing a source-owned permission. They cannot be inferred from this document or from local correctness tests.

## Finite acceptance before any host installation

Use real private prepared-handle and original identity/lifecycle owners with synthetic storage and an actual independent source grant owner. Required positive evidence is exact selected Topic consumption, shared budget, stable receipt/lost-return reconciliation and preserved manual content. Required negatives include wrong purpose/fields, child/selector mismatch, unrelated Topic, copied cap, Source/filter/restore drift, grant/caller replacement, callback revocation, fixed-deadline regression, first-read limits, late receipt mutation and second-item failure after first-item commit. Verify original field-issuer refusal remains unchanged. Explicitly test the real source-owned prepared-handle path or report it unavailable; synthetic structural handles are not a replacement.

Run a targeted Node batch first. Add the new cases to a later meaningful integrated Source/Release headless native milestone; do not rerun the already qualified dispatch suite merely for this proposal. Real account/provider, platform matrix and host scheduling remain outside this local proposal.
