# Topic lifecycle: finite local policy and activation boundary

2026-10-23. Technical decision preparation under the current whole-programme
handoff. No scheduler, lifecycle write, background permission or paid call is
activated by this document. The original explicit activation restriction remains.

## Existing owners and the actual gap

`TopicLifecycleService.change` already performs active/dormant transitions under
its original TopicProcessingGuard, repository transaction, Source availability,
identity/revision checks, processing final fence, search and original journal.
Pin, keep, explicit lifecycle protection, redirects and memory restrictions
remain vetoes. The original formation owner already reactivates a genuinely
reused dormant identity without cloning it. Do not implement a duplicate
reactivation path or treat inactivity as deletion.

The original root activity projection is meaningful but is a **reading** owner:
`prepareTopicRootActivity` builds bounded, complete-set activity ordering from
`readTopicActivity`, with journal/current-body authorship proof and original
expression timestamps. It can inspect retained human-body revisions while
building. Its root-read permission is not Topic processing permission. It is
not safe to turn that UI projection into an automatically authorized lifecycle
issuer or to scan all private topics merely because it exists.

There is also a concrete composition limit: the original lifecycle test requires
`BNS_HUMAN_UNSUPPORTED_MUTATION` when an installed human-library Sync journal
cannot encode that operation. Keeping this refusal prevents unjournaled local
mutations. A future automatic caller must support the original canonical Sync
owner or defer; it must not detach the journal to make activity succeed.

## Selected conservative policy for a bounded local successor

Policy identifier: `personal-topic-activity-v1`. Only active → dormant needs a
new evaluator; reuse stays with original formation. No model call is needed for
a time comparison, and a comparison supplies no processing authority.

- Evaluate only already explicitly selected stable Topic IDs under an existing
  independent Topic processing grant, with a complete qualified activity cut
  for their current memberships. Never enumerate the whole corpus by default.
- Propose dormancy after 90 complete UTC days without qualified meaningful
  activity. This is a versioned conservative implementation parameter, not a
  claim of a measured optimal threshold. Open/read/render, midnight, AI metadata
  refresh, renamed labels and copied timestamps do not create activity.
- Unknown/partial activity, omitted membership, a future activity timestamp,
  clock regression, incomplete original journal, unavailable Source or Sync
  owner cause bounded DEFER. No fallback to Topic creation/update wall time.
- A candidate needs a fresh observation at actual dispatch; elapsed scheduling
  time is never a lock or capability. Capture original identity/revision,
  membership generation, processing authority and restore epoch. Re-read them
  in the original commit/final fence; intervening activity or human intent
  invalidates the proposal. Keep/pin/lifecycle locks always veto dormancy.
- At most 16 selected Topics and the existing 4096-read / 2 MiB / 30-second
  qualification budget per invocation. Reuse original bounded read machinery;
  do not add a background corpus index, private-text cache or durable body copy.
- Pending decisions are ephemeral. After restart, regenerate from current
  qualified state. Once an original operation commits, replay its original
  receipt; unknown completion is reconciled, never retried with a new identity.
- No removed/candidate/merged transition, membership change, name/body rewrite,
  permission update, external read scope or Source/Input deletion is admitted.

## Required implementation and proof before any activation

Implement one consuming package only after selecting a legitimate original
processing-capability issuer: activity proof adapter → original lifecycle owner
with activity final fence → canonical Sync mutation support → bounded consumer.
Do not land an unused boolean `eligible` checker as completion of this lane.

The package must prove threshold edges, no/future/unknown timestamps, backwards
clock, stale membership and late human edit, keep/pin/restored protection,
Source revoke, restrictive Context permissions, native ACK abort and exact
replay, and installed Sync journal round-trip. Same-identity reactivation
remains the existing formation test obligation. No automatic paid attempt or
unselected-body acquisition may be hidden in that package.

If the current existing grant cannot issue the required complete activity read,
request its exact extra processing/read boundary in the grouped decision.
Keeping the existing feature unavailable is safer than borrowing UI access.
This policy work removes an unspecified technical choice; it does not claim the
remaining runtime/Sync/permission work or real automatic lifecycle is complete.
