# Default Organize warm-owner independent review

2026-10-25. Frozen candidate `64d158d627c7591ef3bc174054529ff546d131ba`, base `5274854`. Read four runtime files, new owning test, report and retained evidence. Reviewer did not execute tests or modify runtime. **One P2 blocks integration of this candidate as a quiet-admission proof.**

## P2: closure-based factory methods can bypass the original owner's admission

`application-selection-owner.js:12-19,27` creates object wrappers using `records.get(this)`. The configured runner's original methods use the factory-closed `store`, `runner` and session rather than `this`. Consequently `const status = ai.status; await status(...)`, `ai.status.call({})`, or `{...ai}.status(...)` executes the original real `aiPresentationStatus` and its compatibility/Foundation maintenance without finding the original owner record. The same bypass avoids pending registration. An original held token can therefore continue reporting current while that original closure is executing work.

This is distinct from rejecting a copied owner as a capability input: a copied/extracted original closure still reaches the real store. The exact original instance and its registered method values remain unchanged, so `intact` cannot detect this path.

Smallest correction: object instrumentation must capture the original target for registry lookup and task accounting, independent of the call-site receiver. Keep prototype instrumentation receiver-bound for genuine class methods. Preserve the prior closure method's ordinary detached-call compatibility rather than introducing a broad new public restriction. Add held detached/spread-call refusal controls and an unheld detached status deferred-maintenance control proving it blocks a hold until its original promise settles. No native run is needed for this local owner correction.

## Reviewed behavior without additional findings

Idle-only holds refuse busy tasks without cancellation, timeout clearing, or replay. Both status methods are included because they can maintain Foundation/compatibility state. Pending registration occurs before the original callback, so original default local work is visible despite public running fields. Strict-null configured birth and exact unavailable Simple dependencies are enforced, with configured sessions still unsupported after invalidation. The bounded owner synchronously holds its two original children under one deadline and releases only its own partial acquisitions. Expiry/observed identity loss invalidates the token without reopening admission before exact release.

The actual worker awaits original store status before constructing these owners; the captured repository/database birth therefore does not add a production initialization blocker. Historical UNKNOWN rows remain unmodified and deliberately do not prevent this narrowly scoped warm proof; a future global consumer must independently reject unresolved durable outcomes. No financial, legacy-host, or global activation qualification follows from the proposed token.

## Evidence accounting

Candidate records 18/18, then 35/36 (existing three files 17/17, one new configured invalidation expectation failed), corrected 1/1, final hold file 19/19, and compatibility 1/1. These are separate invocations, not a final aggregate 20/20 or product acceptance. The failure is retained and runtime was not changed to match the mistaken service available flag expectation.

## P2 closed in frozen successor

Re-reviewed successor `1644f5dc8bc074f6f4a7f53c000dbe3b33b8b233`, parent `64d158d627c7591ef3bc174054529ff546d131ba`; worktree is clean. The initial P2 above is retained as review history and **is closed for the two-commit candidate**. No remaining blocking issue identified within this scoped default warm-owner package.

`instrumentObject` now passes the exact original target privately into `wrap(method, owner)`. Admission and pending lookup use that fixed target, irrespective of detached, foreign-receiver or copied-object invocation. The original method still receives the caller receiver through captured Reflect.apply, preserving factory closure compatibility; prototype wrappers retain their original class-receiver behavior. The actual promise is still observed to completion and only its own task is removed.

Read retained new baseline **0/4**, 309.813875 ms, and final complete owning file **24/24**, 611.25825 ms. The held detached, foreign call and spread-copy cases cover both maintenance status and wake. The fourth case holds a detached maintenance promise unresolved, verifies original-owner hold refusal, then allows a new hold only after actual settlement. This new file pass remains separate from the earlier 35/36 whole combination and other candidate evidence. No native or reviewer-run tests occurred.

Final two changed-file SHA256:
- `extension/core/organizer/application-selection-owner.js`: `a63a20af9e8d589c2be0a1c3404e5f30445e8b9e2be32f01b83e8cb949db2651`
- `extension/tests/organize-application-selection-hold.test.mjs`: `738e031a0d3f98bf8a4c8ccb28a0ee6b761536289842e7bc35f886af10022476`

Root may compose the original bounded owner into sources-only worker admission through its captured original hold/current/release functions, with its private registry doing the final identity check. Such composition must continue to distinguish live admission from the preserved historical UNKNOWN/financial/global gaps; it needs no new placeholder coordinator or gate relaxation.
