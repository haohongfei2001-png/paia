# Explicit local lifecycle dispatch from original maintenance selection

## Scope and result

Base: `c99f5b593ebe71b1fc48373471b641e8f845ce15`. This package connects an already prepared `LocalMaintenanceSession` handle to the original local lifecycle consumer. The source is the handle's actual structural, placement and bound Entry mappings, not caller-provided Topic IDs. Plain Input-only and passive/copied/foreign handles cannot create a selection. No worker opportunity, timer, default inactivity policy, provider call, real account, cloud run or Sync activation is added.

The final four complete owning files passed **264/264**, no fail/cancel/skip/todo, Node 22.23.3 on macOS arm64, TAP 40978.003708 ms. The files are the new `topic-lifecycle-dispatch.test.mjs`, original `ai-cost-03-structural-context.test.mjs`, `ai-cost-03-placement-topic-reconciliation.test.mjs`, and `thought-m1.test.mjs`. Original 144 lifecycle tests and the previous native 78-case qualification were not repeated. Independent static review by the Context line found no remaining blocker in the handoff or receipt observer; that review did not rerun tests.

## Consumer and authority

`captureMaintenanceLifecycleSelection(session, store, handle)` is an internal WeakMap handoff. It captures only mapped Topic IDs, expected revisions and their already mapped Input scopes. The returned token is process-local and non-serializable as authority; copying its visible properties produces no usable selection. The original session generation, original grant, database identity and controller remain required. A scoped resolver admits preparation's empty Topic list only for the already selected Input union; it admits no unrelated Topic.

`TopicLifecycleDispatch(store, token, { policy, previousObservedAt })` uses the original configured resolver and passes its **same original qualification budget** in the trusted third parameter. The resolver still has to return genuine `TopicProcessingAuthority` uses; legacy booleans are rejected by the original lifecycle owner. A private session fence checks retirement/revocation through final settlement. There is no second processing grant minted from a DTO and no added body/history authorization.

The 18 new cases use the genuine `TopicProcessingAuthority` with the original shared budget, backed by a controlled synthetic processing issuer. They do not exercise `createMaintenanceSourceProcessing` or its private same-transaction request permit. This first package calls the existing independent Topic resolver seam; real source-owned permit dispatch remains a distinct follow-on integration requirement. The 264/264 result does not certify that source-owned chain.

The request's stable operation ID hashes the original job, selected Topic, expected revision and complete explicit policy. Reconstructing a dispatch adapter with the same original selection and policy reconciles a lost return through the original durable operation receipt. Reentry with the same observation shares one in-flight promise; a changed observation and competing adapter/session preparation/model run are refused. No automatic retry occurs. Closing an adapter stops further dispatch; it does not claim cancellation of an original in-flight commit.

Every Topic in the original mapped selection is visited, including a real two-Topic handle. A prior successful write can make the remaining original activity projection stale; that Topic is reported as deferred, not silently rebuilt, omitted or claimed complete. A later storage failure preserves the first settled result and the exact unresolved action via the existing consumer `partialResult`. Unrelated Topic rows are unchanged, and the positive test observes all Topic `get` reads during dispatch at the underlying IDB interface: they target only the selected Topic. This is not a claim that preparing the original maintenance handle never performs its ordinary selection reads.

## Actual receipt defect and repair

A corrected fault injector demonstrated that changing the original operation receipt's result after the backup finalizer could commit. The original 3/4 negative result is retained in `terminal-exact.tap`. The earlier broad batch 216/216 did **not** prove receipt integrity: its injector attempted a budget-refused `all` before changing that row. The corrected test uses the known actual operation ID and requires `injected === true` after the mutation.

The opt-in observer in `thought-journal.js` is tied to the original store, exact repository write scope and operation ID. Only the original `saveReceipt` records the expected complete row immediately before its actual put. Callers cannot supply expected contents. Pending duplicate observation of the same ID is rejected; separate receipts are independent. `saveReceipt` removes its watch in `finally`, including a failed put. `TopicLifecycleService` releases the capability in its outer `finally`. Its new activity path registers an original repository final read plan comparing the persisted receipt with that writer intent. Existing Source/activity/processing fences still decide validity; this extra fence covers receipt integrity only. Default receipt schema and write/sequence/clock ordering are unchanged.

After the fix, exact receipt drift, session disposal, grant loss, Source deletion and lost-return controls passed **5/5**. Original late Source rejection is a legitimate deferred result with full rollback, not necessarily a thrown error. The final 264/264 includes original observer multi-receipt/nested-registration/failure cleanup and all 18 new dispatcher cases.

## Evidence stages retained

- `first.tap`: 3/9. New adapter incorrectly rejected the original preparation request with an empty Topic list.
- `preparation-inputs.tap`: 8/9. Test instrumentation replaced repository `get`, correctly rejected by original private-budget method checks.
- `first-closed.tap`: 8/9. Test expected every resolver call to contain a Topic, overlooking original Input-only preparation.
- `selected-batch.tap`: 11/11, including two genuinely selected Topics and partial settlement.
- `terminal.tap`: 15/16. Source fault correctly deferred; test incorrectly required throwing. Its receipt injector was not yet a valid receipt-integrity proof.
- `owning-final.tap`: 216/216 at that earlier instrumentation stage; superseded as receipt evidence, retained unchanged.
- `terminal-exact.tap`: 3/4, genuine changed receipt committed before the repair.
- `receipt-fixed.tap`: 0/5. New final-fence registration omitted required `isCurrent`; fixed without relaxing repository checks.
- `receipt-fixed-current.tap`: 5/5.
- `receipt-owning-final.tap`: final four complete files, 264/264.

Hashes and exact environment are in `work/topic-lifecycle-dispatch-20261023/source-vector.json` and `SHA256SUMS`.

## Prepared native verification

`extension/tests/native-sync/topic-lifecycle-dispatch-chrome.test.mjs` is syntax-checked only. It reuses the existing lifecycle/storage headless fixture, real worker/native IDB and Source/Release hash checks, and executes all **18** owning cases in each variant. The original assertions and case bodies are retained. The test-only adaptation changes the Node assertion/test imports, storage constructor (existing native bridge), and the observation-only fake ObjectStore import to the native `IDBObjectStore`. It asserts isolated storage and zero network attempts/HTTP requests. Root will run it once with the integrated milestone, optionally reusing `PAIA_NATIVE_RELEASE_PATH`; this report does not claim that native dispatch verification has run.

## Next integration: separate typed activity Sync, not Human remove/restore

The installed Human journal still refuses this automatic lifecycle mutation. A future explicit package needs a distinct `topicActivityCommit` profile and original owner integration; the existing Human `topic-lifecycle` remove/restore schema must remain unchanged.

1. **Local atomic publication:** extract a narrow, private original lifecycle transition plan from the current owner. It must bind exact before/after Topic metadata, original activity policy/version and observation, selected Input/Source identities, complete member/protection/negative-intent dependencies, original journal intent and operation receipt. The local named owner and a typed Core outbox operation must share the same first-read-budgeted transaction and final fences. A sender's policy configuration or private grant is not remote authority.
2. **Typed graph and cold receiver:** use a versioned payload containing the exact durable lifecycle transition, full policy parameters, original decision time, canonical predecessor Topic identity/revisions, retained lifecycle history and causal Source/member/protection references. Do not serialize ephemeral capabilities, local processing receipts or secret tokens. Reject missing predecessor/negative intent/current human lock or incompatible projection. Reconstruct a receiver-only private restore capability from the complete authenticated graph and invoke the original canonical owner; never replay a bare `to:dormant` command from the wire.
3. **Finite consumed qualification:** one existing supported Topic plus a complete supported member graph, A local inactivity commit → close A → cold B original-owner restore → explicit protected local change → cold C. Add Source/grant retirement, protection conflict, malformed ancestry, lost publication return and canonical/Core/receipt rollback cases. Keep 4096 references / 2 MiB / 30 seconds; declare unsupported nonempty/merged graphs instead of latest-write replacement. Wider writer/receiver coverage and host dispatch remain separate follow-on work.

Ownership coordination: this package changes only lifecycle/session/journal files. The Sync line owns new codec/Core/checkpoint families and consumers; no shared Sync file was modified here. Production scheduling, approved default inactivity parameters, real service grants and live/cross-platform acceptance remain unimplemented/unverified boundaries, not silent defaults.
