# Context / Sync held candidate — independent source review, 2026-10-25

Status: **HOLD. Source review only; no candidate execution or merge approval.**

## Scope and identity

Read the package README, complete MANIFEST, all five runtime changes in the full 06910cd→b30 patch, final runtime files, the three new owning test files, the two original-race reports/controls, and settlement v1/v2/v3 report/diffs. Historical commands were treated as evidence and were not executed. No tests, native browser, build, cloud, provider, or GitHub mutation was performed. Only this report was written.

Package candidate: `b30b87aca02805bf7f468579f962e42e7093ab1c`, tree `72d7c8b540a482687dd039fc2412433724e48192`, prerequisite `06910cd81d6a6176a10d1b78d759aa8802027554`. The locally fetched checkout was `b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac` at inspection. All five changed runtime paths in that checkout are byte-identical to the prerequisite; this is a narrow path-level comparison, not approval to replace the current checkout with the held tree. Published Settings changes must remain intact.

Final runtime SHA256 values independently read:

| Path under extension/ | SHA256 |
| --- | --- |
| background/sync-local-lifecycle.js | 93c9c2442b7a71138b0a9208cd7bac5597725552c7fd768bf547cd8825b77924 |
| core/browser-native-sync/context-desired-journal-owner.js | e49ee8fc0ea05c2040b34210d210f52765b16b62ca787ce7fdbcc7c294a6150c |
| core/browser-native-sync/context-mutation-journal-owner.js | bd4e816a5ee056ef9cc38cd7650d647741665929ccdbacf26eb57424e4c7d0ae |
| core/idb-repository.js | 1636b273dc59d62f255a48497ac1285b1b07dc7773cedfed1720593c7690ee7c |
| core/indexed-store.js | 8ddbdc1b57faa0b8b5abc733cc249d08d55fda71c6fd7e5be33489e7c0345198 |

Line references below identify final files in `held-context-sync/Context-Sync-UNREVIEWED/changed-files/`, not the current published files.

## Findings

### 1. Capturing SDK / Promise functions does not capture their invocation path

**Source-confirmed provenance defect; block claiming SDK/Promise substitution resistance.**

- `extension/background/sync-local-lifecycle.js:84,89,99,106-107,232` captures SDK get/set and compares their object identities, but executes `this.#localGet.call(...)` and `this.#localSet.call(...)`.
- `extension/core/indexed-store.js:525,539` similarly checks the captured get identity and then dispatches through `bound.get.call(...)`.
- `sync-local-lifecycle.js:38,106-107` and `indexed-store.js:516-519` call the captured original Promise `then` through its mutable `.call` property.

A function object can acquire an own `call` property without changing the function's identity or the SDK object's get/set descriptor. The present identity checks still pass, while the newly added invocation calls that property instead of the captured SDK function. This is a direct JavaScript dispatch fact, not a demonstrated content-export exploit. The same dispatch gap exists in the new original-Promise helpers. Existing tests replace SDK method identities, public `race`/`finally`, or a tail Promise's chaining/species result; they do not cover own `.call` redirection on the captured functions.

Repair: capture a trusted invocation primitive once (for example the original `Reflect.apply`) and invoke the captured SDK / Promise functions directly with the intended receiver and argument list. Do not look up `.call` or `.apply` on the target function. Preserve the exact owner/descriptor checks, post-await checks and actual readback comparison. This narrow repair does not require relaxing any guard or adding a public hook. Add bounded synthetic controls for own-call redirection and Promise dispatch separately; retain all previous failed controls. Do not claim this primitive alone solves all mutable-Promise/species behavior.

### 2. Enrollment still borrows a repository-global active ticket without proving the caller owns that invocation

**Source-confirmed identity gap; wider concurrent consequence requires a new bounded control, not a claim of observed native failure.**

`sync-local-lifecycle.js:215` captures `currentOriginalRecoveryWork(repository)` on entry to Resume. `idb-repository.js:97,120,122-136` shows this is one WeakMap slot per repository, held across awaits; it is not async-call context. `indexed-store.js:528-530,557` likewise selects any active ticket as inherited, and validates only ticket equality/liveness. A second independently entered operation while the first operation's window is live is indistinguishable here from a genuine nested child of the first. A reused ticket's resource consumption and refusal can therefore be attributed to the wrong invocation; the caller cannot infer inheritance merely from temporal overlap.

V3 narrows the window around lifecycle SDK persistence, which addresses the recorded ordinary same-worker failure. It does **not** eliminate the registry's general ambiguity: the `withOriginalRecoveryWork(..., read)` at indexed-store.js:561 still covers the two control SDK waits inside `read` at lines543/550. Same-store queue serialization limits some paths, but no per-invocation proof appears in the new inheritance path, and original Core/repository entry points are not all this queue.

Repair options, to decide from original call graph: (a) reject/queue an external Resume when another unrelated original window is active, rather than borrowing it; or (b) pass a private source-owned invocation token from the actual admitted owner, and validate both token and ticket for deliberate nested reuse. A DTO or arbitrary current ticket must not confer lineage. Keep aggregate budgets, and do not finish an inherited ticket. Test two independent concurrent owners versus a genuine nested owner as separate cases. This is not permission to introduce Node-only async-local machinery into browser runtime or to broaden the 4096/2MiB/30s limits.

### 3. Crash/cold restart can erase enrollment uncertainty

**Confirmed incomplete failure-state behavior, already disclosed in the held report; no new run claimed.**

`sync-local-lifecycle.js:245` persists an active lifecycle row before the second Context observation at247. Refusal after a dispatched write only sets private volatile fields (`#uncertain`, `#blocked`, `#contextSettled`, lines255-260). `checked` at75-79 has no durable enrollment phase/attempt marker; `reconcile` at189-203 only handles existing publication/checkpoint tasks. After restart, `attachContextService` at146-160 can mark Context settled using represented current rows or a matching old empty receipt. Consequently, a process ending after SDK commit but before verified settlement is not durably distinguishable from a completed enrollment. An original represented Context mutation during persistence makes the pre/post observations differ; after restart the current represented state can qualify even though the previous invocation never completed settlement.

This does not establish unauthorized export: later canonical export guards remain present. It does mean the new process cannot honestly claim that the interrupted enrollment attempt is known to have settled, and a durable UNKNOWN requirement is not fulfilled. Do not fix this by rolling back the lifecycle row, replaying the SDK write, or treating current-state qualification as evidence that an old write completed.

Repair design needed before marking enrollment complete: an original-owner durable pending/confirmed record bound to the exact lifecycle revision, binding/generation and settlement attempt; a cold process must leave pending/ambiguous attempts unknown. If such schema work is outside the accepted narrow candidate, keep this item explicitly incomplete rather than silently broadening this patch. Any new durable protocol needs targeted interruption/lost-ACK/cold-read controls and compatibility handling, not reuse of old native preparation.

## Checks that improve on the old implementation

- The Context predicate now executes in the final original readonly transaction, after both control SDK reads. This closes the demonstrated final-control-read window at the source level; it is not cross-storage atomicity.
- `qualifiedPortableRow` reads Item/head/revision/epoch in the same transaction; the desired owner wrapper reuses the original proof and does not mint write/export authority. Original restrictive conflict and epoch checks remain.
- An owned enrollment ticket is explicit through both observations and lifecycle persistence; the ordinary byte/reference/deadline ceilings are unchanged. Borrowed tickets are not finished by this consumer.
- A dispatched-but-unconfirmed SDK write is not rolled back or retried; confirmed durable readback remains the completion criterion for that SDK row.
- The Pause/Disconnect path preserves ordered stop persistence when the SDK row was confirmed before interruption. The source checks distinguish this case from a write whose readback is unresolved. This is source inspection plus historical author evidence, not fresh execution.
- A deadline retiring the observation prevents late SDK continuation from installing a new owner. Cleanup may await an entered original transaction's settlement; there is no source-level promise of a strict wall-clock upper bound independent of native cleanup. Do not equate timer firing with native teardown completion.
- STATUS only demotes the in-memory enrollment flag; it does not itself perform bootstrap or lifecycle writes. However this does not fix the cold uncertainty gap above.

## Remaining verification, not established defects

1. Original 11/11 is an author ordinary-functional result only. It does not cover the omitted budget-exhaustion control or independent adversarial qualification of the final five-file composition.
2. Foreign API/SDK facade present before lifecycle construction versus SDK object replacement after binding must be separated. The control-read owner does check its original Store SDK binding; merely saying “foreign facade” is not yet a proven bypass.
3. Mutable Promise constructor/species side effects and late rejection handling still need bounded independent examination after trusted invocation dispatch is repaired. The current held tests already cover a specific tail species result substitution; do not repeat that as new coverage.
4. Held lifecycle SDK write at deadline, pending original native scope at deadline, queued read deadline, Pause before dispatch, Pause after committed write, and provider revoke are distinct cases. Preserve precise outcomes; a generic rejection does not prove all of them.
5. Full canonical/causal export remains separately responsible for complete history and automatic lineage. Enrollment's current-row comparison is not a replacement.

## Suggested next mainline work package

1. Keep the entire b30 candidate held; do not cherry-pick it as an approved bundle.
2. On the verified current development baseline, first make the narrow SDK/Promise dispatch correction, with source-owned invocation and unchanged guards. Review this exact diff independently.
3. Resolve ticket inheritance admission explicitly and test bounded local concurrency without starting native/cloud/large-scale runs.
4. Decide/implement durable enrollment UNKNOWN using the original owner, or leave enrollment explicitly incomplete; no receipt rollback or automatic replay.
5. Only then run one consolidated set of authorized local ordinary/negative owning checks on that final composition, recording its exact runtime hashes and every failure. No exhausted Full/native/large recovery allowance is revived by this recommendation.
6. Keep the published Settings fixes and unrelated programme work untouched; no whole-tree replacement from the historical prerequisite.

## Prior execution restriction

The settlement report says the independent runner returned a generic execution restriction without identifying the triggering operation. The outer README says the last confirmed success was a read-only diff and the interruption cause is UNKNOWN. Neither supplies an exact policy rejection that identifies this new read-only source review as prohibited. No prior restricted execution was retried or rerouted. If the original refusal text becomes available it must be evaluated before authorizing the affected execution; this review supplies no such authorization.
