# Fixed live transport coordination preliminary review

2026-10-25. Read-only pre-review of root uncommitted transport coordinator and source coordinator private factory registry. No tests or runtime edits by reviewer.

## Preliminary result

No definite blocking issue identified in the proposed two-file local composition. This is not a final frozen-candidate verdict: PromptInsertionReceipts hold/failure methods are being implemented separately and are not present in the checked root receipt source, so current transport identities correctly refuse rather than granting qualification. Actual worker wiring and combined tests remain unreviewed.

- The source registry uses module-private WeakMap identity plus the original store and original current-source predicate. A spread copy cannot self-certify. Capture uses its original factory helper and exact API; receipts use the captured original prototype methods, exact prototype and original private source predicate. Instance source callbacks are not accepted as substitutes.
- Original method dispatch uses captured Reflect.apply. The original fixed three owners are held before any aggregate drain await. The transport token/state remains private and ready is only set after all original attempts settle successfully. No pluggable owner list, new RPC or public proof DTO is introduced.
- Failed capture/receipt acquisition errors only become failed-release leases. They cannot satisfy current or fence. The exact original error identity must be accepted by the corresponding original owner; copies/errors from a foreign invocation must fail. A release refusal closes the transport coordinator rather than forging release success.
- The aggregate wait observes already-started promises before enforcing elapsed time. It has one outer deadline established at hold, reused by every fence. Timeout does not cancel original work or clear its tracking. Late successful original tokens are released once by their lease; late original rejection runs the original failure release when available.
- cleanup clears active only when it equals that exact state, and releaseLease has a per-lease released marker. Old callback cleanup therefore does not clear a newer active hold. Cleanup failure can permanently close the coordinator, which is conservative but must not be mislabeled as successful reusability.
- Failed original source fences may already have released their inner state; the subsequent transport release can refuse and permanently close transport. This is fail-closed, not a global quiet proof or automatic recovery guarantee.

## Required frozen review controls

Read the actual final receipt error-capability contract and the actual worker fixture evidence. Cover original factory versus copied/foreign objects; acquisition failure and timeout; late original success/error after the outer timeout; old callbacks after a later attempt; original pending tasks remaining tracked; one outer 30000ms maximum across acquire and all fences. Inner owner deadlines do not add another allowance. Verify release never replays tasks or supplies cold absence proof.

This remains a fixed LIVE transport preparation only. All-page editor/host protection, other writer ingress, cold/legacy receipt completeness and Context UNKNOWN remain independently required. No activation/continue/restart gate should be enabled by this package.

## Files read

- extension/background/application-transport-coordination.js: afad5d4ba2e9a1a2a5c02614271183cc9193a1785a00f10205323c8d43f954dc
- extension/background/application-worker-coordination.js: 2e8ead75e924f169a1f6d184263ca251ae4afdd5633f58e437d87fadbd29939e
