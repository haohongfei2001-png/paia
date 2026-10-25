# Selection review restriction and Sync reservation — independent review

2026-10-25. Read-only review; no runtime modification or test/browser/cloud execution by reviewer.

## Reviewed identities

- Root uncommitted `extension/core/browser-native-sync/application-generation-selection.js`: SHA-256 `996deaa8f93bd6e7511e75b02a65e2e46085b9f736e3f3716953035d5c995caf`.
- Root new `extension/tests/application-selection-review-restriction.test.mjs`: SHA-256 `7247a174b5517441dc92863eff4f6e3b31e61ae12b3b72fb1721e19ef226364e`.
- Lifecycle frozen commit `9f94fd794c6752669f6f9d357986937af9229e14`, base `ccb8db8`; it intentionally depends on the above separately uncommitted core.
- `extension/background/sync-local-lifecycle.js`: SHA-256 `068ad9fcb4f18a663eba99b203e025a1810efa2cb06a7594c8c7eac567d4123f`.
- `extension/tests/sync-local-lifecycle.test.mjs`: SHA-256 `ba0cb0b72d615dfdbbdc8ac2ee5d585d06ba14a8123e10df480951b643c81c62`.

## P2 — original owner entries accepted before hold are not all tracked

At core lines 160–162, status/continue/cancel check the restriction only at entry and directly return the async original helper; none sets busy or records a pending invocation. Hold at lines 66–72 checks busy, prepared identity and attempted provenance, so it can succeed while one of those same-owner operations is already awaiting its original read. That already-accepted operation resumes without observing the new restriction.

`continue` can enter the original cold SDK publication path; `status` can settle a selected receipt and clean durable markers, and `cancel` writes markers. An existing original durable marker can be created by another actual original owner after this owner's prepared review. Starting this owner's continue before hold then pausing its read is therefore not covered by the attempted bit, which is only set by this owner's activate. Even where no marker exists, a genuine same-owner pending invocation is being misclassified as idle.

This is narrower than the explicitly deferred problem of all other owners/global writers: the missing entry accounting is on this exact restricted owner. Its false idle result undermines the new lifecycle safe-release premise. Root accepted the finding and is preparing a separate correction and negative controls.

Minimum correction: synchronously track these three original accepted operations (or serialize with original busy), reject hold while any remains pending, and retire only on actual original promise settlement. Close, timeout and errors must not clear a still-running invocation or another invocation. Do not rewrite the original cold helpers, mark a pending operation cancelled, or manufacture a successful SDK result. Deferred-read controls for each of status/continue/cancel should show hold refusal, then permit a fresh hold only after true settlement if its unchanged prepared review remains eligible.

## Other chains reviewed

No additional blocker identified in the reviewed scope:

- Module-private restriction records bind exact original owner and private prepared object/lifetime, with original store/core/local and SDK identity. Tokens are empty frozen objects; copying/prototype substitution cannot supply a record. Observed identity loss is sticky, so replacing an SDK method back cannot revive a failed restriction.
- The attempted bit is advanced before invoking the original marker transaction, remains true after rollback, and cannot be reset by requalification of that same review. Hold refuses an in-flight activate and an already-attempted review.
- New admission to all six original stateful entry points is refused while held. Close invalidates the prepared/lifetime rather than unlocking; exact release checks currentness and only removes that token's restriction. It grants no activation permit.
- Lifecycle private entries are added before original bodies and deleted by original promise settlement. Pending reconcile, stop, attach, resume and status maintenance prevent reservation. The separately tracked release read survives a timeout until it truly settles.
- Held lifecycle views are intentionally synchronous state reads. Genuine PAUSE/DISCONNECT retain their original restrictive save and invalidate the old reservation before the async save. Failed/expired release conservatively suspends and keeps the core restriction.
- Foreign/stale/duplicate release is rejected before task registration, so it does not transiently invalidate a newer holder. Successful release compares the actual original ROW using captured get, rechecks same private review/serial/host/config/database/SDK and original deadline, then synchronously releases the matching core restriction before clearing lifecycle admission, with no intervening await.
- No core-to-background dependency, dynamic import, arbitrary authority registration or caller readiness callback is introduced. Marking a phase only reduces releasability. The fixed lifecycle phase token remains unconsumed as activation authority. Other owners/static cold helpers/full host inventory remain independent, unproven global inputs.

## Evidence boundary

Lifecycle final six-file result at the reviewed dependency is 164/164, exit 0, no failure/cancel/skip/todo, TAP 26873.523125 ms; final log was independently read. This does not cover the P2 deferred owner-entry controls identified above. Historical 163/163, fixture failures, cycle failure and later focused corrections remain separately recorded in the candidate report. No real browser, provider account, CI, or complete-plan acceptance follows from these synthetic results.

Status: pending root's P2 follow-up; do not label the above core restriction as fully independently cleared until the follow-up is reviewed.

## P2 closure — final root dependency reviewed

Root's follow-up is independently checked. Each of status/continue/cancel now checks restriction and busy synchronously, sets busy before invoking its original helper, awaits that actual helper, and clears busy only in finally after true fulfillment/rejection. No other invocation can enter the same busy section. Close still does not clear busy. The original cold helper and SDK implementations are unchanged. Thus a hold cannot begin while one of those original accepted operations remains pending.

Three new controls defer the actual original database inventory read in each entry, prove hold is rejected while that promise is pending, then prove a fresh exact hold succeeds only after the original operation settles. The initial implementation failed all three controls (0/3); final complete restriction file passes 8/8, no failure/cancel/skip/todo, TAP 4060.118916 ms. The final source and log were independently read; no test was rerun by reviewer.

Final root dependency hashes, superseding the core/new-test hashes above:

- core: `90c38ced258d1ac4168abeab27dc242b465fd8337d5fae70bc41af4ea0415056`
- restriction test: `cf08c5d23c47faba6f197411f776f3c0ca6df7543b190873a24f25a961d5e0a0`

Lifecycle commit and its two source hashes remain as listed above. Its 164/164 run used the earlier `996deaa8...` dependency; the final follow-up 8/8 is separate evidence and must not be presented as a new combined 164/164 execution.

Final scoped conclusion: P2 closed; no remaining blocker identified for this original-owner restriction and idle lifecycle reservation package. This remains restriction-only, not a guarded activation/global silence capability. All limitations and historical evidence above remain effective.
