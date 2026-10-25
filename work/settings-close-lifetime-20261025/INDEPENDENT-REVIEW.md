# Independent Settings close lifetime review

Result: scoped source and pure DOM-fixture review PASS. No remaining blocker found in the original Settings row-open route. This is not native browser, full-product, integration, main, or release acceptance.

Reviewed change: one runtime file, `extension/ui/settings-details.js`. Each original row opening receives a new lifetime; each pending guarded close has an identity. The guard dispatch, success and rejection are checked against the current attempt/opening, and cleanup only releases its own attempt. The new opening synchronously resets its own Close state. There is no added close-event handler, so a delayed close event from the prior presentation cannot release a new pending close. Keyboard containment and browser-owned focus behavior are unchanged. No backup/controller or persistent state changes.

The existing four-test whole file plus the new six-test whole file ran once independently: 10/10 passed, zero failures, skips, cancellations or todo; 93.010196 ms. Command: `timeout 30s node --test tests/settings-details.test.mjs tests/settings-detail-close-lifetime.test.mjs`. Exact source and both test hashes were verified unchanged after execution. No native/browser/OS/network operation was performed.

Coverage: positive held acknowledgement and duplicate suppression; refused/rejected guard and explicit retry; stale allowed and rejected results after close/reopen; a new guard while the old one remains pending; old finally not releasing new pending Close; queued old close event; invalidation before the guard microtask; unchanged read-only destinations and Tab boundary behavior.

Limit: fixture close events are synthetic, not browser timing evidence. The lifetime advances through the existing row-opening route; no direct externally introduced showModal route is qualified by this review.

The author's first baseline 1/6 pass and 5/6 failures remain in its evidence directory, not relabeled by this pass. No publication was performed.

## Exact identities

c72f7f1a328488559ce531d8937c6e596ce44d7aa524d453ebe0e6c3378d8044  ui/settings-details.js
0d4c8100be504fcdfe460705b0bf8ad1bd59262be1b216595b13d8428ba899ce  tests/settings-details.test.mjs
bed34d966ef3f96384efd002f14371bf764dc07eed9210cffbdd41b98563b686  tests/settings-detail-close-lifetime.test.mjs

Independent log SHA256: 7238796be2265e534fa39af571c1d951068fc6261b7550f640403cf5629f23f9
