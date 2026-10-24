# Cold restore Working preparation lifetime

## Result and exact candidate

- Candidate: `0130ad1080761616b198a1dcc2b299424f638fc0`.
- Parent: `e6233e232ad2545c924d51b20d30803ef88477dc`, the exact integrated R + Saved code base. Not the previous `eeebc743` branch.
- Branch: `codex/dot-cloud-working-lifetime-20261024`.
- Only `extension/core/browser-native-sync/input-working-commit.js`, `extension/core/browser-native-sync/group-checkpoint.js`, and new `extension/tests/working-application-lifetime.test.mjs` changed. Combined runtime 10 additions / 3 removals; new tests 84 lines. Worktree frozen and clean after commit. No push.
- Final new complete owner file: **16/16 PASS**, 3610.820389 ms.
- Original six complete small owner files: **84/84 PASS**, 7727.490676 ms.
- Original R causal-tail complete file: **36/36 PASS**, 7539.584588 ms.
- Cloud Node **v24.19.0**, Linux x64, synthetic fake IndexedDB and in-memory transport/local SDK. No native browser, Mac, Node22, Full, cloud diagnostic, 100k or 129-group recovery run.

## Why this prerequisite is not a claim of an old Human-refusal leak

Original parent performs Human preparation before Working preparation. The preserved original baseline confirms real Human rejection creates **zero** Working capabilities and leaves every row unchanged. It must not be described as a leaked Working capability on that old path.

For future automatic composition, authentic Working preparation must be available before Human preparation. This slice moves the existing applications preparation earlier without changing Human's three-argument contract, future view, linked admission or success semantics. That order change needs a bounded lifetime on every exit, not an unused release helper.

The preserved counterfactual runs the proposed applications-first order with a genuine release primitive but **without its finally consumer**. Both tiny tests fail (0/2): a real Human refusal and a successful original cold activation leave the actual captured preparation accepted by the original readonly projector. Adding the real consumer makes the same two tests pass (2/2), before expanding the final complete owner suite.

## Exact implementation

1. `releaseOriginalWorkingApplication(store, core, cap)` accesses only the original private WeakMap. Unknown/already-consumed caps return false. A valid cap bound to a different store or Core throws before deletion. Exact owner binding deletes that one preparation.
2. Cold `GroupedCheckpointRestore.activate` builds its original applications list inside `try`, then executes the original Human, Saved, Context, consumer-preference and empty-scope preparations unchanged.
3. `return await this.store.run(...)` retains capability lifetime through original transaction completion and any actual local preference publication. `finally` releases every prepared Working application after success or rejection, including failures in later preparation before a writer starts.
4. All original recovery ticket registration/window code, canonical-generation proofs, terminal fences, limits, source/permission/deletion checks and publication semantics remain. No new source view, linked guard exemption, test callback, debug getter, schema or authority type was added.

The following inherited files are byte-identical to parent: IDB repository, group-checkpoint-plan, recovery-session, canonical-generation-publication and Saved bootstrap. The entire `group-checkpoint.js` diff is only the release import, applications-first move, try/finally and required await. The R ticket/window implementation is preserved.

## Credible original-owner observability

The new test briefly observes `WeakMap.prototype.set` only around its own activation/preparation, immediately delegates every set to the original function, and records only actual `InputWorkingCommitReceiver` values bound to the exact target store. It never fabricates a capability or replaces a successful owner. The hook is restored in `finally`; Node's default same-file serial tests are retained.

The negative oracle is the existing real `projectOriginalWorkingHistory` consumer, with the captured receiver's exact replay Core, its authentic prepared operation group, actual target histories/counter, and original mapping rules. Before release the projector can consume the real capability. After release it must reject at the private capability gate with `BNS_PREPARATION_REQUIRED`. A null-transaction `applyRestored` gate is an additional check, not the main oracle.

The genuine Human refusal fixture uses one journaled Source + Working + independent Human on A, and one real unjournaled Human Entry on B before staging. Original stage succeeds; original Human preparation rejects its nonempty initial graph. It does not forge Source-linked evidence, loosen compile admission, synthesize a successful Human reducer, or bypass any existing gate.

## Final 16-case boundaries

- Real Human-preparation refusal revokes already prepared Working capabilities and preserves the complete target.
- Real cold success completes the actual original Working writer before revocation.
- One and two Working preparations are all released on success and Human refusal.
- Foreign store/Core, copied cap, unknown cap and independently prepared capabilities cannot dispose or impersonate the valid original one.
- Rejection at before/after activation, actual IDB transaction abort, fault after real Working writes, and failure preparing a later genuine group release earlier capabilities and retain all rollback guarantees.
- Explicit retry after abort creates a distinct fresh cap; old and newly settled caps are both unusable after their attempts.
- At actual after-activation inside the transaction the cap remains live; after completion it is revoked. This protects against releasing before the queued async writer finishes.
- Already activated duplicate prepares no new cap and changes no row. Source + independent Human with no Working remains an accepted zero-cap path.
- Actual local preference publication success and terminal SDK failure both keep the cap consumable while stage is `publishing` and the real local write hook is executing; only after that operation settles is the cap revoked. Terminal failure retains the original truthful `publishing` state, not a forged activation ACK.

## Commands and evidence chronology

Original baseline, at unmodified parent:

`node --test ../evidence-working-lifetime/observe-working-baseline.test.mjs`

- `original-baseline.log`: 2/2 PASS, 828.456643 ms.
- The first exploratory projector call incorrectly passed empty history after successful apply, producing `BNS_WORKING_HISTORY_CHANGED`. This diagnostic setup failure is preserved as `baseline-probe-history-mismatch.log` and `observe-working-baseline-first.test.mjs`. It is not a product regression or a successful release proof. Corrected baseline uses actual current histories/counter.

Applications-first without finally:

`node --test extension/tests/working-application-lifetime.test.mjs`

- `reorder-without-finally-red.log`: 0/2 PASS, 2 FAIL, 871.803373 ms, exit 1.
- Exact intermediate runtime/test snapshots: `group-checkpoint-reorder-only.js`, `input-working-release-unconsumed.js`, `working-lifetime-reorder-red.test.mjs`. They are evidence only, not committed production code.
- `finally-first-green.log`: same two tests 2/2 PASS, 907.557404 ms.
- `working-lifetime-owning-first.log`: first complete 14/14 PASS, 3171.602994 ms.
- `working-lifetime-publication-first.log`: expanded publication controls 16/16 PASS, 4256.215397 ms.
- `working-lifetime-owning-final.log`: final exact-store-scoped observer bytes, 16/16 PASS, 3610.820389 ms.

Original six complete small files:

`node --test extension/tests/browser-native-sync-input-working-receive.test.mjs extension/tests/source-working-restored-successor.test.mjs extension/tests/browser-native-sync-human-library-group.test.mjs extension/tests/browser-native-sync-saved-mixed.test.mjs extension/tests/consumer-preference-group-restore.test.mjs extension/tests/canonical-generation-owner-restore.test.mjs`

- `working-lifetime-owner-regressions.log`: 84/84 PASS at frozen runtime bytes.

Original R protection:

`node --test extension/tests/browser-native-sync-recovery-causal-tail.test.mjs`

- `recovery-ticket-regression.log`: 36/36 PASS, including shared 4096-reference / 2 MiB ticket, no reset across windows or failed scopes, deadline, reentry, late completion, rollback and continuation.
- These are original small synthetic fixtures, not the exhausted 129-group recovery case. `browser-native-sync-group-checkpoint-restore.test.mjs` was deliberately not run because it includes the larger exact128/129 scenario.
- Names containing “native transaction/fence” in Node test output refer to the fake-IDB raw transaction fault boundary, not actual browser execution.

All three files pass `node --check`, and the patch passes `git diff --check`. Identity, patch, complete logs and checksums accompany this report.

## Nonclaims and dependencies

This is the cold activation lifetime prerequisite, not full automatic Context composition. Human future Source/Working/history views are unchanged; native-linked qualification remains refused at its original gate. No pending WIP file was blindly picked.

Standalone Working receive, `mergeSourceWorking`, `mergeMixed`, and other preparation lifecycles were not refactored here. The new release primitive is consumed only by the authorized cold activation coordinator and its tests. No blanket claim is made about all possible capability lifetimes.

The original four failed automatic-composition Node attempts remain failures. No budget enlargement, fence deletion, case shrinking, timeout increase, install, account/credential access, payment, permissions expansion, PR/push, version bump or deployment occurred.
