# UX-R5 independent recovery audit — initial checkpoint

Status: diagnosis completed; product repair and certification NOT_RUN. This is an independent recovery, not v1 execution 009.

## Frozen evidence

- v1 control: `b46a2edda95424934da23784a424d47f0a44f739`; README, State, Plan and reports 007/008 read at this exact ref. State.last_run_report is `overnight/runs/008.md`; opportunities 8/8, active owner null and pending_publication null.
- Product: `6517763883c95e9a8901e5095db2a7d846da0ef6`, matching State and user; single parent `19fe4ed19bc686ff715c5604616ea7fad1eed2fa`, tree `6ded7b5ba60fec390048200b54bda8422d2aaba9`.
- Frozen baseline: `ad386c07cff59b9b3472a5aa03626fe89514f8d1`; draft open/unmerged PR #28 uses ux-r2 as head and overnight/ci-base-20260914 as base, CI only.
- Actual product AGENTS/design core/spec/status/product/architecture/roadmap and applicable runtime contracts read. No old-chat project facts were used.
- Formal R5 report absent from product rounds tree `3a5eb8d7040b79d9337279ae2ba888b0aa628ff1`; official status still says R5 READY / NOT_STARTED. Published implementation does not establish completion.

## Certification #263 (run 34871354407)

All four complete unit logs were read. They checked out synthetic PR merge `8819134105e188755478f40daa6918a313b891f7`, advertised as product 651776 into baseline ad386. Unit totals are 895: 881 PASS, 14 FAIL, 0 skipped.

| Shard | Pass / fail | Actual failing cases and messages |
|---|---:|---|
| 1/4 | 278 / 7 | ai-presentation-v072c three-Topic full chain; all six ux-r5-ai-candidates cases. Each successful wake assertion receives undefined rather than true. |
| 2/4 | 195 / 3 | ai-product-v080 provider normalization/revisions; ux-r5-ai-states cached/no-delta and single-flight. Each completed assertion receives undefined rather than true. |
| 3/4 | 163 / 1 | history-staleness-v090 time-only enrichment: INTERNAL_RUNTIME_ERROR instead of undefined error. |
| 4/4 | 245 / 3 | bounded-v081 AI maximum-three-topic action: 1 !== 3; history-long-term-v090 600 Inputs: {error: INTERNAL_RUNTIME_ERROR, phase: committing, requestCount: 1}; long-term-v081 500 Inputs/30 Topics/360 Entries: INTERNAL_RUNTIME_ERROR. |

Final jobs: Adapter/privacy PASS; Current Browser PASS; macOS secure store PASS; release build/guards PASS; Unit shards FAIL; Full Suite FAIL; aggregate Certification FAIL. Historical browser audit was optional and not executed.

Downloaded full-suite artifact 10358879243, SHA-256 `e84fe8ec5d3fc840a4c2cf7ae65a84976fa7d75a21a1b3d93bc9e0aa35c47740`: 1070 total / 1056 pass / 14 fail / 0 skipped; unit 881/14, browser 28/0, adapter 95/0, privacy 52/0. Because tests failed, this summary has no successful fullSuite/auditPassed/inputDigest certification receipt.

Report 008 correctly refused R5 completion and recorded four unit failures. Its Browser/Full Suite running states were a seal-time snapshot: final Browser is PASS, final Full Suite is FAIL. Its uncertainty is not permission to claim a final PASS. Report/State agree on published product and incomplete certification; product status is stale rather than falsely complete.

R5 artifact 10359918938, SHA-256 `5fe65061d26d5ab2eb41c10ebe5f3e9c44314232c4dd9b17cb868306ed78d8c2`, contains only on01-first-generation.png and on01-organized-cached.png. This alone does not prove the full required R5 visual matrix.

## Reproduced root cause

Category A (ON-02 implementation regression), with a post-commit exception path (E). candidateCreated is declared with let inside the foundationWrite callback, then referenced in the outer success return. The callback and durable transaction finish first; JavaScript then throws ReferenceError: candidateCreated is not defined. safe(error) converts it to INTERNAL_RUNTIME_ERROR. The failure object has no completed property; the request row remains committed because the catch rewrites only active rows. Bounded callers stop on the returned error despite committed work. Provider normalization and the completed=true success contract are not the cause.

Product runner blob `f8f4566afdf394bb588e7ee441ad2e0eb4523c12` was matched byte-for-byte to the #263 release artifact. ON-02 parent runner `b8c9a14e693b1a69e3c5b850aba1a2fe500e1a15` and frozen baseline runner `d69cb99e5af95133e5d1821bb0bff9dcd7f143ff` return completed=true without that invalid reference. The regression is introduced by the ON-02 commit.

Local Node 22.16.0 diagnostic executed the actual runner class body with explicitly synthetic snapshot/provider/transaction seams. Unmodified class returned {error: INTERNAL_RUNTIME_ERROR, phase: committing, requestCount: 1}; captured ReferenceError; durable request committed and receipt committed=1. A transaction-return patch produced completed=true/candidateCreated=false for first generation, true/true for a candidate, and STORAGE_FAILED with no presentation/receipt after injected transaction abort. This is diagnostic reproduction, not a claim that repository unit/browser/full suite ran locally.

A separate old test still expects an automatic AI revision after refresh. Spec UI-14/DELTA-06 requires a separate candidate, unchanged current draft and explicit user acceptance. Its replacement assertions must verify all of those, not simply remove the failing expectation.

## Environment and next step

Container has Node/Python but cannot resolve GitHub for clone; Remote Desktop reported no connected device. GitHub read/write and Actions artifact access are available. Release artifact digest `088a36a5444c6a457d933e4c16b9c0824a9239ce334a052c9a1fc1837640ac91` is verified. Complete repository tests will use unchanged required GitHub CI, supplemented by focused tests; no local full-suite PASS is asserted.

Next: prepare minimal UX-R5 transaction-result repair and regression tests, publish by exact-parent protocol, complete all required gates and honest canonical status. UX-R6 remains prohibited.
