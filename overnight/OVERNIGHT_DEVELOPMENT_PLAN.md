# Independent UX-R5 recovery and continuation checkpoint

Campaign `paia-continuation-20260915-v2`; predecessor v1 at `b46a2edda95424934da23784a424d47f0a44f739`, permanently EXHAUSTED / HISTORICAL (8/8). This is not execution 009 and creates no schedule.

## Scope and authority

Only audit, diagnosis, necessary UX-R5/ON-02 repairs, associated tests/contracts/docs, full certification and checkpoint publication are authorized. No UX-R6 implementation in this session, even if R5 succeeds. Use GitHub alone, pinned refs, actual product AGENTS authority order. Control-branch extension snapshot is never source authority. Inherited v1 plan/reports are read only at the pinned predecessor ref.

## Root-cause repair

Reproduce the actual runner class on synthetic dependencies and inspect the real transaction contract. Fix the post-commit lexical-scope regression by returning the candidate result from the atomic transaction, not by fabricating success, normalizing every failure to success, weakening assertions, or retrying the provider. Add tests for initial generation, candidate update, durable receipt/result agreement and rollback. A pre-R5 test expecting automatic AI revision after update must instead prove candidate preservation and explicit user-authored acceptance under Spec UI-14/DELTA-06; retain and strengthen its normalization, evidence, protection and request-count assertions.

## Ownership and prepare / publish / seal

Active owner must equal State.active_owner. Recheck owner, product HEAD and control HEAD immediately before remote writes. Create an unreferenced product candidate C with exactly one parent H and record its tree T, purpose and allowed changed paths in State.pending_publication. Then recheck and non-force fast-forward ux-r2 from H to C; read it back and seal expected_head=C with pending cleared. If interrupted, only the exact prepared H/C pair may be resolved. Unknown HEAD/owner drift stops all writes. Never reset, rebase, overwrite unknown commits, merge, or force push.

## Required validation (unchanged acceptance)

Read and execute current repository commands/configuration: four unit shards and unsharded unit coverage, adapter contracts, privacy/security, npm run check, development guards, release build/guards, actual-worker current browser suite, unsharded npm test with fullSuite=true/auditPassed=true/inputDigest, mandatory macOS secure-store and aggregate GitHub Certification. Independent lint/typecheck are NOT_CONFIGURED if absent, never PASS. Historical pre-migration browser evidence stays separate. Only controlled synthetic provider/data tests; no real keys or user profile.

Close all applicable UX-R5 UI-13/UI-14, DELTA-06, MIG-09/10 and G-01 through G-08 requirements, including current draft protection, stale CAS, provenance/deletion/history/backup, actual request/state outcomes, first generation/cached/failed/stopped/outcomeUnknown flows, required viewport/theme/accessibility and inspected screenshots. Missing evidence is NOT_RUN/BLOCKED, not PASS. Tests that are still running are WAITING_CI.

## Certification and stop

Only complete actual PASS evidence permits official UX_R5_REPORT.md and UX_IMPLEMENTATION_STATUS.md to claim VERIFIED_COMPLETE. Record tested source and reviewed doc-only handoff delta separately; recheck final handoff CI and final product HEAD. Otherwise publish an honest recovery checkpoint with R5 incomplete and exact blockers. V2 records predecessor refs, repair commits, certified source, authority, frozen baseline, PR, evidence and next action. Set next_allowed_slice=UX-R6 only if R5 truly passes, but never start it here. Release owner and stop. No new opportunity count or automation is inferred.

## Precisely registered publication RP-01

- Parent H: `6517763883c95e9a8901e5095db2a7d846da0ef6`.
- Candidate C: `6bda0643443595874b9f43cf39e4ea0dfcfa1ae2`.
- Tree T: `21a22861d0228ae0150d485a5cf366620462fc31`.
- Owner: `recovery-20260915-651776-6c94b7e1`.
- Target: `ux-r2`, single-parent fast-forward only.
- Allowed files: `extension/core/organizer/ai-presentation.js`, `extension/tests/ai-product-v080.test.mjs`, `extension/tests/ux-r5-ai-result-contract.test.mjs`.
- Purpose: post-commit ReferenceError repair and stronger current/candidate/receipt/rollback assertions, with the old automatic-revision test aligned to approved R5 explicit adoption.
- Certification before publication: NOT_RUN. Product remains uncertified until the complete required gates actually pass.
- Exact recovery: with matching owner, if HEAD=H publish C after rechecking refs; if HEAD=C verify the single-parent/tree pair and seal State.expected_head=C. Any other HEAD or owner stops writes. Once sealed, the record is historical and cannot authorize unrelated drift.
