# TOPIC-02 lifecycle terminal authority repair

Date: 2026-10-20. Status: independently reviewed isolated correctness candidate;
native Source/release and exact-head/main certification remain unverified.
Baseline: `9c85d0df0672e89166fcaf5e6e4597b447488303`.

This receipt supplements [TOPIC-02](TOPIC-02.md), not its historical receipts.
It does not activate an automatic dormancy policy, schedule, runner or issuer.

## Reproduced defect

On the exact baseline, the original eleven lifecycle tests passed. Two added
actual-owner tests then failed: after the genuine original authority had admitted
the lifecycle write, revocation after the actual `backup-data-generation` put, or
issuer-currentness loss after the actual activity-journal put, still allowed the
transaction to complete as dormant at revision 1. The positive genuine-authority
commit/replay control passed. This RED was 12 passed / 2 failed, not a simulated
resolver failure or a claim inferred only from source.

The transaction already traversed the original lifecycle, ThoughtStore,
foundation write, IndexedArchiveStore and Repository owners. What was absent was
registration of the existing strict TopicProcessingGuard final fence.

## Bounded repair and compatibility

Only `core/topic-lifecycle.js` and `core/topic-processing.js` change production
behavior. The lifecycle operation retains its existing body, CAS, human locks,
source checks, negative-witness access guard, identity, search and journal writes.
It uses the same original transaction and the existing final-fence implementation.

The additive `prepareWithProcessingMode` path returns the ordinary preparation
shape and binds its provenance in a module-private WeakMap. Both preparation
transactions and every admission in the original write must use one uniform
mode. Registration requires the exact original preparation, guard, store,
repository, database, evidence and authority references. Copied, untracked,
mixed, or phase-switched provenance fails closed.

- Uniform genuine `TopicProcessingAuthority` calls register the existing strict
  all-use collection before lifecycle mutation or conflict/no-op success. That
  collection validates the original issuers, capabilities, work ledger and
  currentness in Repository's closed terminal segment after existing finalizers.
- Uniform legacy resolver DTO calls preserve the original non-strict direct API
  and its 100-Input preparation bound. They have no synchronous revocation
  capability and **do not acquire a terminal-authority guarantee**. Registration
  closes further processing admission in that write, without minting a final
  capability or calling an asynchronous issuer in the closed terminal segment.
- Genuine authority retains its existing 20-Input / 8-Topic bounds. No ceiling
  is lowered for pure legacy callers or expanded for genuine ones. Ordinary
  `TopicProcessingGuard.prepare` and the existing strict fence API keep their
  previous behavior for other consumers.

There is no public mode flag, catch-and-downgrade, new grant, refreshed ledger,
post-write permissive baseline, second transaction, rollback compensation,
evidence rewrite, history deletion or budget relaxation. The existing
LibraryDocuments owner can touch derived count/activity metadata during a
receipted no-op; that pre-existing behavior is preserved and is not reported as
a lifecycle transition. Terminal failure rolls back the entire original write.

## Verification

The final scoped unit command, from `extension/`, was:

```sh
node --test --test-reporter=tap \
  tests/cpv1-topic-02-retrieval.test.mjs \
  tests/cpv1-topic-02-candidates.test.mjs \
  tests/cpv1-topic-02-unassigned.test.mjs \
  tests/cpv1-topic-02-lifecycle.test.mjs \
  tests/cpv1-topic-03-*.test.mjs \
  tests/topic-processing-authority.test.mjs \
  tests/topic-processing-guard-authority.test.mjs \
  tests/topic-meaningful-activity.test.mjs \
  tests/human-graph-topic-lifecycle-plan.test.mjs
```

Result: 247 passed, zero failed, cancelled or skipped. This includes original
retrieval, candidate, unassigned, organization and guard regressions, genuine
commit/replay, late terminal failures, expiry, original-ledger changes and
exhaustion, cross-use revocation, competing fences, actual-write failures,
restore changes, legacy 21/100 and genuine 20/21 bounds, both directions of
phase switching, copied/foreign/untracked provenance, human locks and
conflict/no-op behavior. The original eleven lifecycle tests remain
byte-preserved.

Independent review cleared these production SHA256 identities:

- `topic-lifecycle.js`:
  `76a2dd641049022c04e048469626974c528d76140eef5c2a71779c3553de83f4`
- `topic-processing.js`:
  `103e7bca8ac1c0f1702ca84d0961c9c240e147623ba512f5f0d884de0e3c0afe`

The independent combined rerun passed 203/203 with zero failures or skips;
its TAP SHA256 is
`3bc14f0cda1b5fecc6caa1854560e68f1be4333086cc9ebd3cddd2e5590bdd04`.
These overlapping runs are separate receipts, not additive coverage.
Earlier unconditional-strict compatibility failures and test-fixture failures
remain historical evidence, not final passes.

The exact remote-tree audit covered 583 production JavaScript files under the
extension runtime roots and service runtime roots, excluding tests. All were
available and matched baseline blobs; no installed lifecycle caller was found.
This is not a full repository/test-consumer census and does not by itself justify
changing the documented legacy contract.

## Remaining gates and nonclaims

The new synthetic `cpv1-topic-02-lifecycle-chrome-e2e.test.mjs` defines source
and standard-release controls using actual native transaction completion/abort
events and whole-database rollback snapshots. Local Chromium failed to launch
before any domain case ran. Therefore neither suite is a native pass; the
current final native matrix is unexecuted. Static checks and a release build
cannot substitute for that proof.

The execution tree is a declared, blob-verified subset of the baseline plus
the scoped overlay, not a complete checkout. The development release retains
baseline version 0.55.3 solely for local candidate comparison; it is not an
installed or published release. A coherent integration must reconcile fresh
main, select the required compatible patch version, retain concurrent work, and
obtain exact changed-head Full and subsequent exact-main qualification.

No threshold policy, automatic aging/reactivation, observation record, worker
command, UI, source deletion, identity migration, permission widening, provider
call, paid model, user-data access, deployment or publication is introduced.
The legacy terminal limitation and the native/certification gaps remain open.
