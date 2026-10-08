# Prompt last-materialized owner across advancing conflicts

Base0935817104dd6282849b6328b80645fabcaccd3c, PR204 pre-integration candidate.
This is a local ordinary-receive/staged-restore correctness repair, not provider
activation or complete canonical sync. No paid model, account or worker wiring.

## Actual failure and repair

Receive A, then a concurrent B leaves canonical Prompt A. Receive C descending
from A updates protocol heads to C/B without overwriting the human conflict with
C. Previously resolving C/B failed BNS_OWNER_CHANGED because canonical A was no
longer an immediate head. The same happened after legitimate verified reuse.
Both actual-owner failures are retained in `/tmp/sync-conflict-owner-before.log`.
An actual resolved-checkpoint activation reproduced the same gap separately in
`/tmp/sync-conflict-stage-before.log`.

Core now stores a body-free exact materialized revision pointer plus local owner
revision in its existing namespace. The existing immediate-head portable equality
path stays unchanged, including its device-local reuse counter behavior. Only the
new ancestor path requires this exact proof, current local owner revision, exact
portable state and an at-most128-row same-entity ancestry proof against current
heads. Missing legacy proof, wrong namespace, unrelated same-text ancestor,
redacted/missing revision or excessive ancestry cannot manufacture permission.
A user's edit followed by reverting to identical text therefore cannot use this
new path to masquerade as an unchanged last-materialized owner.

Local journal commits with materialize:false record proof in the same canonical /
protocol transaction. Explicit bootstrap uses empty expectedParents and preserves
canonical revision, refusing a head installed between validation and prepare.
The actual noteVerifiedReuse path advances only an existing still-matching proof
inside its existing transaction; it neither initializes missing proof nor repairs
human edits. Saturated reuse counters still legally advance the local revision.

Checkpoint activation passes its existing live Core for prior proof and the exact
stage Core for ancestry and the new proof. The activation protocol, coverage cap,
local-generation fences and rollback behavior are unchanged. Source/purge codecs
are not expanded; Prompt purge remains explicitly unsupported. Context multi-
parent transition rules are unchanged and not claimed resolved by this batch.

## Validation

- Twelve new actual-owner cases cover receive resolution, reuse, human reversion,
  absent legacy proof, saturation, non-repair, namespace isolation, local commit
  rollback, unrelated same-text pointer, ancestry bound, actual staged transfer,
  and explicit bootstrap / concurrent-head CAS.
- Five complete owner files78/78PASS866.77ms,
  `/tmp/sync-conflict-related-final.log` (new owner, original Core/checkpoints,
  Prompt service/security). The original direct reuseCount fixture initially
  exposed an over-strict first draft; `/tmp/sync-conflict-owner-after.log` retains
  that failure. Its original assertions are intact; the final code preserves the
  existing immediate-head contract and restricts only the added ancestor path.
- Package11880 checks/356 runtime resources PASS `/tmp/sync-conflict-package.log`.
- Existing full native storage file keeps all original cases, receipt oracles and
  240000ms variant budgets. Twelve additional production-IDB owner scenarios run
  in isolated synthetic databases in each source/release variant; they are
  separately recorded, not substituted for original crash/privacy/restore cases.
  Independent review passed; reviewer executed12/12 separately in
  `/tmp/sync-prompt-conflict-independent.log`. Original full native32/32PASS,
  15094.34ms, `/tmp/sync-conflict-native.log`,0fail/skip/cancel. Each variant also
  passed the12 added actual-worker scenarios. Source/release production hashes
  and extra case names match exactly; six runtime/fixture hashes unchanged before
  and after native. JSON evidence records base093 HEAD/tree with these dirty
  candidate bytes, not a claim the later commit was itself already run.

Final exact candidate bytes:

```
6bbfa65639988e25621b727169431feb385d5632eca46d7f51bc03322159ff1f  core/browser-native-sync/core.js
b4533ed57d7de8cc62a200b503bc5e9be3c281724d4c84c5ca777bb20ea090f2  core/browser-native-sync/prompt-journal.js
b8a002683c8a7b117ab3fe4bb8b8851dcec441446a346821566a2ba078fd55cb  core/browser-native-sync/checkpoints.js
efe1ff73e798f4fac4e78b37d51cf8d68368bd4eb98b90c3d1880c8a28ee053b  core/prompt-reuse-service.js
48a7ed17b05105d5b3e451cd5981fe003c0e294d148744665be2f184cfed4cf6  tests/native-sync/storage-worker-fixture.mjs
95c72d51524ebbd0e03efdfbbf107c23019ff801ab82c30714af1e4cc9e6309b  tests/native-sync/storage-chrome.test.mjs
```

No push, merge, cloud/provider readiness or installed-user qualification is implied.
