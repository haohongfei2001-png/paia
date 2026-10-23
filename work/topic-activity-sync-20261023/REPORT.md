# Explicit Topic activity Sync on an existing legitimate Topic

Base `59675bf5`. This is an explicitly constructed local technical consumer, with no scheduler, worker, Settings enablement, default policy, credential, provider or new processing issuer. It adds the first `active → dormant` event on an existing original Topic to the original Sync protocol in the same transaction as its original lifecycle owner. It does not create a Topic or replace its human history.

## Implemented consumption

`new TopicActivitySyncJournal(originalLifecycleService, originalCore)` attaches only to that privately identified service/Core/store binding. Original `changeInactive` retains the actual Topic processing authority, shared qualification budget, activity projection, keep/pin/lifecycle lock, Source membership closure, source invalidation, original important history, receipt and rollback guards. New protocol writes require the exact private current transaction, Core, operation object and origin. Ordinary local/remote Core apply calls cannot treat an activity DTO as write authority. The optional consumer verifies original Core descriptors without invoking caller accessors; ordinary uninstalled lifecycle behavior remains on its old path.

The versioned `topicActivity` wire uses a distinct `activity` actor and contains only the existing Topic identity/CAS metadata, explicit versioned policy and event observation/transition times. It contains no Topic label, Entry/Input body, copied history or processing grant. Every other type still rejects the new actor. The local protocol head/revision/receipt/sequence/frontier/entity revision/generation/device, queued outbox and domain mapping have precomputed exact terminal expectations. The original Topic identity metadata and actual original lifecycle intent are also closed at final settlement; no write-after-snapshot value is used as a substitute for expected intent.

`journal.receive(operation, {scope, policy, now, previousObservedAt, workBudget})` requires an existing matching legitimate Topic and a fresh receiver-owned independent original processing authority. The caller selects current Input scope and explicit local policy/time. The wire cannot supply permission or substitute a future clock. It invokes the captured original lifecycle method and records remote protocol completion without an echo outbox. A conflicting operation is rejected before replacing an already settled event.

Idempotence is based on the original domain receipt and an exact validated typed operation, mapping, head, revision, sequence and protocol receipt. The duplicate path reads these together and rechecks a complete snapshot after the original domain receipt settles. Lost mutation responses and a cold repository/service reopen recover the prior durable result without another lifecycle or outbox write. Busy/close behavior refuses reentry or close during an in-flight original operation and releases the busy state in `finally`.

## Verified result and failures retained

The final five complete owning files ran once on Node `v22.23.3`, macOS arm64, using synthetic fake-indexeddb: **120/120**, exit 0, no failed/cancelled/skipped/todo, TAP **6433.754625 ms**. This comprises the 34 new cases plus original Core, local lifecycle consumer, dispatch and source-processing boundary cases. It is not native browser, Linux, cloud capacity, real provider or complete plan acceptance.

The remote base is produced by original Topic formation and transferred using the existing test-only historical backup encoder and the actual production backup restore consumer. The test-only encoder is not a restored production export entry. The matching Topic is never created by raw test insertion. The event itself is validated and consumed through the new typed receiver; the base transfer is not claimed as a new Sync Topic graph implementation.

All earlier outcomes remain separately preserved:

- `first.tap`: 1/1 initial local consumption. Its initial test title said “native transaction”; this was an inaccurate label and was corrected to “original repository transaction”. Execution was always fake-indexeddb.
- `restore-first.tap`: 1/1 original backup base + remote original owner + no echo + replay.
- `identity-before.tap`: 0/1, the initial fixture replaced a repository method and was refused before injection (`injected=false`); not proof of a late-write bug.
- `identity-real-before.tap`: 0/1, real after-owner injection changed Topic identity but committed; missing rejection established the actual terminal gap. `identity-fixed.tap`: 3/3 after exact original identity terminal comparison.
- `owning-first.tap`: 20/20, before subsequent duplicate/clock/method hardening.
- `reentry-reopen.tap`: 1/2; reopen fixture created the qualification budget before opening the database and was correctly rejected `UNAVAILABLE`. The fixture now opens the original Foundation first. `reopen-fixed.tap`: 1/1, no runtime weakening.
- `review-before.tap`: 0/2; corrupt durable mapping incorrectly returned old success, and a future remote event incorrectly supplied the receiver eligibility clock. Both actual missing rejections are retained.
- `review-fixed.tap`: 5/5 after complete durable duplicate verification and explicit receiver time admission.
- `review-closure.tap`: 12/12, covering mapping/revision/head/receipt/sequence/entity revision changes, post-receipt substitution, original Core accessor rejection and remote clock control.
- `owning-final.tap`: the final 120/120 result above. No source changed after this execution; source vector and exact command are recorded alongside it.

New cases also assert full-table rollback for late original identity, protocol head/receipt/generation, domain receipt, Source removal, issuer revocation, synthetic storage failure and 4097 actual repository reads. Original pin/keep/lifecycle protections, no-body wire shape, actor/type/dataset/parent restrictions, independent remote authority, clock regression, lost return, competing activities, busy handling and cold reopen are exercised.

## Resource and authority boundary

The original operation writer registers the private execution-transaction envelope before its first read: 4096 references / 2 MiB physical operands and results / 30 seconds, including final fences. Original Foundation initialization remains separately defined. Qualification retains its existing independent scope budget. The new preparation additionally counts its retained and read protocol values conservatively against 2 MiB and checks a cumulative 30-second clock at async boundaries; its duplicate path is a fixed set of reads, not an unbounded scan. This does not promise forced cancellation of arbitrary external never-returning JavaScript callbacks. No budget, policy default or original pruning rule was increased.

The existing independent processing issuer remains necessary. The maintenance Input-only permit is not broadened into Topic identity permission. The receiver validates a remote operation but independently re-evaluates local eligibility; an event is not a bearer capability.

## Explicit remaining implementation/acceptance work

This finite profile accepts one zero-parent inactivity event per Topic. After a human reactivation/new identity base, another event deliberately fails `BNS_TOPIC_ACTIVITY_CAUSAL_BASE_REQUIRED`; the original human lifecycle causal bridge and repeated activity ancestry are not implemented by this package. First cold Topic graph reconstruction, grouped checkpoint family admission, provider transport delivery, Sync dispatch integration and default automatic scheduling remain separate consumers. An existing legitimate matching Topic base is mandatory. No generic checkpoint family is silently broadened to admit this event.

Native Source/Release execution, cross-platform validation, authorized real service/account/permission behavior and any future production/default activation remain unexecuted. No cloud, browser, large seed, deployment, paid call, installation or external sending occurred in this package.
