# Worker activity original-dispatch preparation — independent review

2026-10-25. Read-only review of frozen candidate fec08a3b8e729a77d2bcc546b52a3db0d9734900 in worker-activity-checkout. Reviewed both runtime diffs, the complete activity owner, the complete new test, unchanged worker response chain context, existing test evidence and source-vector hashes. No test/native/browser/network execution and no candidate edits by reviewer. Worktree was clean.

## Conclusion

No blocking finding was identified for this limited local preparation package. It can be integrated as identity-bound bounded activity accounting; it does not implement or qualify global generation selection.

- application-selection-commands.js:67–74 registers the exact accepted promise before invoking the callback. A synchronous invocation of the internal drain therefore sees the real accepted request and excludes only that identity. Worker service-worker.js:646–675 returns the existing full response/error/successor chain through dispatch. Child work continues to use trackApplicationWork, and unrelated accepted requests remain in the task set.
- Module-private originalActivities, selectionActivities and activityControls bind the exact original selection object, original activity factory and dispatch record. Only one original selection owner binds a factory. The helper rejects a copied owner or forged/missing/foreign/dead control; public ordinary drain ignores any extra argument and cannot borrow an exclusion. No request DTO or sender prefix supplies this identity.
- The original monotonic deadline is captured at dispatch and reused when the selection-specific drain starts. Constructor limits are positive integers no larger than 30000ms. The private draining identity rejects overlap without releasing the current operation. Completion/failure/expiry consumes the control.
- Timeout clears only its timer and private drain ownership. Real pending tasks remain tracked until actual settlement; there is no task-set clearing, cancellation claim, forged success or revived late control. The settle helper intentionally observes rejection as settlement, which was also the old activity behavior; activity drain is consequently not a success/failure receipt for the original owners. Those owners must independently retain and validate their failure states.
- Captured Promise constructor/resolve/then and Reflect.apply dispatch avoid the new owner depending on mutable own call properties or a later Promise.resolve replacement. Synchronous callback throws and rejected callbacks settle the accepted promise through the same registered path.
- Existing production gates at commands:22 still reject ACTIVATE, CONTINUE and RESTART; the new third argument is internal and unused by the command body. The declared unavailable/canActivate:false/canContinue:false/canRestart:false/productionActivation:false behavior remains. Existing sender/shape checks and editor admission rules were not relaxed.

## Evidence checked

Reported first owning batch 25/25 (1296.186709ms), then final four-file batch 36/36 (3761.643584ms), zero fail/cancel/skip/todo. Read the complete new 16-case source and final TAP summary; the three pre-existing owning tests are unchanged from base. All six current source-vector entries recomputed and match. Source SHA256 values:

- application-selection-commands.js: 2b3832cf41564b3430c0ca354a2f152ad63307557e3a96b697f14d172aa553fd
- service-worker.js: 346932de5cb66b7a79a098f8b48e04e4d83248fd7f1a4b75d8a9e56762b2a82a
- application-worker-activity-control.test.mjs: e9de84a7992a0d2a3c412337946e1bb34311541de05fc4547a8a194e2744e71c

These are existing local synthetic/harness-worker results, not a reviewer rerun or browser acceptance. No failed result is reported for this package; failures from other packages remain separate.

## Integration boundary

A future activation consumer must acquire all real ingress/editor/host/source holds first, and use one operation-wide remaining deadline across hold, drain and fence; this activity deadline alone does not compose those owners or grant another 30-second stage. It must revalidate the original reviewed cut and all owner failure/currentness evidence after draining. Rejected tasks being settled does not prove safe state. Capture recovery, cold Context/Prompt UNKNOWN, receiver receipts, cross-page editor coverage and actual physical external operations still require their original proofs. No consumer should call this helper and use its undefined return as a global quiet receipt. None of those broader claims is made by this candidate.
