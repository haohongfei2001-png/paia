# Independent read-only review: original known-document receipt driver

Reviewed frozen commit `1f4107cf9ef765865575b94f97fc5af7a314463a`, parent `34cc9bf462476a6663bd533c93aa384bf1060dbb`, in `prompt-known-document-hold`. Runtime SHA256 `4d6850ced49b6b4030f23473f43eaa1ad746c5a7d7131698d2fe7c44a56b5e90`; owning test SHA256 `24e41a652baab5c0163e477bf2e3efd6bd04b34c4254ca4999ce4edacf52b76c`. Working tree was clean. Compared with approved `reviews/prompt-known-receiver-driver-design.md` and actual adapter protocol from `4235752`. No runtime edits or test execution during this review.

## Findings: changes required before integration

### P2 — Wrapper rejection is treated as actual HOLD settlement

`extension/background/prompt-insertion-receipts.js:157-159` assigns `e.raw` to the **wrapper** returned by `#track`. At line 48, failure to attach captured `Promise.prototype.then` to the original Promise sets trackingUnknown and immediately rejects that wrapper; it does not settle or observe the original transport. Both wrapper outcomes at line 159 nevertheless set `e.settled=true`. The acquisition catch sets cleaning, then line 141 accepts this flag and line 143 issues the one permitted RELEASE.

Concrete reachable chain is already constructed by the final test at lines 118-125: original sendMessage returns an unresolved native Promise whose constructor Species getter throws during observation. The returned wrapper rejects immediately, while the original HOLD can still be in flight. RELEASE can therefore reach the adapter before HOLD is installed; adapter lines 30-32 correctly return released:false when no matching holder exists. A later HOLD can install its holder, but cleanupStarted is now permanently true and the original Promise was never observed, so no actual-late-settlement cleanup is possible. trackingUnknown correctly prevents worker admission reopening, but it does not make this early cleanup ordering correct. The test currently checks the former only.

Keep the original raw Promise and an explicit observation-established/actual-settled record separate from task-observer wrappers. An observation failure must remain unresolved rather than mark physical HOLD settlement. Do not issue RELEASE merely because the wrapper rejected. Extend the existing small control to assert no premature cleanup on an unobservable raw pending acquisition. This requires no new budget, retry, public proof or adapter change.

### P2 — Fixed tab charge omits unbounded frozen URL operands

`#knownTab` at line 137 charges 512 bytes before reading the tab, irrespective of its URL. The original registration at line 69 accepts any URL whose origin is chatgpt.com and stores the full tab.url without a length bound; the driver copies that full URL into every frozen entry at line 167, and compares it repeatedly in `#knownCurrent` and `#knownTab`. The current 1,024-byte proof charge and actual serialized HOLD/RELEASE messages do not include the URL.

Thus a genuinely registered receiver with a long original ChatGPT URL, or the bounded receiver set containing many such URLs, consumes only fixed 512-byte tab charges for potentially much larger operands. The receiver-count limit does not bound the cumulative URL bytes to the original 2 MiB ticket. This contradicts the approved actual-operand accounting; this is a source-level missing bound, not a claimed real-browser performance result.

Charge the exact frozen receiver/URL vector before accepting the driver and the exact bounded tab identity fields compared after each tabs.get using the same work ticket. Validate their types/shapes before encoding; do not charge irrelevant tab title/body fields or invent an expanded URL allowance. Retain the fixed original deadline and references ceiling. A small synthetic long-URL budget control can establish fail-closed accounting without native execution.

## Original pending FENCE/tab/snapshot after cleanup

Root specifically requested examination of cleanup's wait set, which includes HOLD and RELEASE but not every tracked FENCE/tab/snapshot task. I did not find a separate write/admission safety blocker from that alone:

- Explicit successful release can race a fence only after the driver token was returned. Those fence operations are original tab reads, remote FENCE and readonly ledger snapshots. RELEASE immediately sets d.cleaning and invalidates its internal hold. A late tab result fails `#knownCheck`; a late FENCE result fails the same check inside `#knownProof`; a late snapshot fails the final current predicate. None of these continuations can dispatch HOLD/insert/reconcile or write a ledger.
- During acquisition the token is not returned. A timed-out acquisition makes its work.failed sticky and failed cleanup returns false, so it cannot open admission while raw acquisition work remains. Dispose sends saved exact cleanup but marks the identity disposed; subsequent normal work qualification fails.
- The actual raw tasks remain in the original task Set until their observer settlement, and a new acquisition still drains that Set. This does not prove they terminated, nor does cleanup claim global quiet.

The wrapper-observation problem above is different because it specifically changes the record used to decide that a possibly installing HOLD has settled.

## Other verified boundaries

The receiver set comes only from the original private nonempty map; caller subsets or arbitrary issuers are not accepted. Registration rechecks the held admission after its tabs await, and registration/removal/dispose changes the frozen version. Exact original class/store/repository/db/API primitives are checked. Driver and receipt-only tokens/errors are separated; the old generic failed-release method cannot use the new acquisition's returned error to bypass document cleanup. Negative HOLD responses retain a possibly installed binding and receive exact cleanup; unknown or false cleanup stays closed and does not retry. One work/deadline spans acquisition/fence/snapshots, and full pending claims remain blocking irrespective of local document quiet. Existing insertion ACK settlement can complete during acquisition, while readiness rejects new settlement entry. No legacy coverage flag is cleared, no receiver discovery or global activation gate is added.

## Evidence limits

Existing reported invocations remain separate: baseline 0/1; initial combined 40/41; timeout followup 1/1; new driver 25/25; final observability followup 1/1. The final 26-case source has no full 26/26 result, and this review did not run one. These are synthetic protocol/IndexedDB checks, not host or native browser acceptance. Full related owning validation should follow the narrow corrections and be reported as a new exact-source invocation.

## P2 successor static follow-up

Read-only follow-up reviewed runtime SHA256 `f2f6ca682b76ce6f39635315f6317284236be067da185984ad5b0adf2741b285` and test SHA256 `023620bd2ec0bc27e8e2c7b9c1d1fa0169eed98af93a655b69d4ec8633d52987`, still uncommitted at review time. Both findings above are addressed in these exact bytes:

- The actual original SDK Promise is retained in `e.transport`. Only handlers attached directly using the captured original observer mark the physical acquisition settled. The tracked bridge can reject on observation failure, but no wrapper callback marks e.settled; synchronous send uncertainty also remains trackingUnknown. The amended unobservable test asserts no premature RELEASE before or after unresolved observer loss. The existing actual-late-result path still schedules exactly one saved-binding cleanup.
- The frozen receiver/URL vector is charged by actual UTF-8 encoding before the driver takes admission; each subsequent original tabs identity read charges its actual compared id/windowId/url/incognito/discarded fields under the same work ticket. An initial oversized vector refuses before any HOLD is sent or worker admission is changed. A later cumulative overrun keeps its already-created holder closed and unknown, with no new budget or retry.

No FENCE restructuring or old receipt-only release semantic change was introduced. The implementation agent reported original-candidate negative controls **0/3** in `review-negative.log`; I did not run them. I approved proceeding to one complete related receipt+driver combination at these exact source bytes. Final commit/output binding remains to be appended after the producer freezes it.

## Final frozen follow-up: approved local candidate

Final reviewed commit is `9cf34945d1d22d4c9adc00c400b5db27a9f4f0bc`, parent `1f4107cf9ef765865575b94f97fc5af7a314463a`. I independently re-read its runtime/test hashes: both exactly match the static-follow-up bytes above. Working tree is clean; all 19 evidence manifest entries verify. Both P2 findings are resolved, and no additional blocking defect was found in this limited review. Root may integrate the exact candidate, retaining its known-subset limitation and closed global activation gate.

I read the final logs rather than combining summaries: the seven-file invocation remains **131/132**, exit 1, TAP **43190.571667 ms**. Its only failing file could not import the existing `pg` dependency and executed no producer cases. After documented reuse of existing PAIA dependencies with matching lockfiles, the previously unexecuted producer file separately reports **42/42**, exit 0, TAP **4119.498458 ms**. The new driver in the first invocation reports **28/28**. No single all-green aggregate is claimed. I did not execute or repeat tests. The implementation agent's exact commands, dependency reuse record, intermediate 0/3 failures and final source vector are committed in `work/prompt-known-document-hold-20261025/REVIEW-FOLLOWUP.md` and its accompanying evidence.
