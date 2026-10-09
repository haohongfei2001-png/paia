# Shared Human qualification budget — isolated local candidate

2026-10-09. **Standalone numeric service only; no graph, plan or native integration.** Base `877f93490534e0bbc4ca18f9abae4afa7c3f1f8f`, tree `61b963eaef1fbfb1798c289dab6b33c956d458e5`. Code commit `693374240695dc30b8b597b068f4057802c41991`, tree `5fd3b41e857fcb92e5a2abccdca1327011c87652`. This receipt is a later documentation-only addition. Exactly three NEW paths relative to the base: `human-qualification-budget.js`, its single owning test and this receipt. Existing files are unchanged; the new service has no production importer.

The original external design remains byte-preserved at `work/SHARED_HUMAN_QUALIFICATION_BUDGET_DESIGN_20261009.md`, SHA256 `9053936ce47dfa40bf4b0bcd7bc15fe0007cae84c26bf9cb21f07b4e80afa05a`. Root identified the retained-first zero-residual work bookkeeping gap before implementation. The separate combined escrow amendment `work/SHARED_HUMAN_QUALIFICATION_BUDGET_ESCROW_AMENDMENT_20261009.md`, SHA256 `dc846785727a19120270012917922b84a4f90fba637a25f193f57985cfddd9ac`, received Root plus independent safe_batch_scope finite DESIGN APPROVE before this code. The amendment preserves residual scratch by transferring fixed128, not a `128-B` deficit. Design approval is not code approval.

## Actual interface and state

Four synchronous exports only: begin work, resize uncommitted work, retain into a distinct ticket, release an exact ticket. Begin accepts primitive kind graph/projection and integer bytes256–8MiB. Retain accepts256–4MiB. Private branded empty frozen leases carry no exposed data. No counters/query/reset/factory, callback, reader, clock, UUID, storage, native, account or provider entry is exported. Bad arity/type/range does not coerce or reflect caller input. WeakMap/Map lookups on foreign/proxied leases do not invoke their traps.

One work record spans both kinds; all retained records share count<=8 and sum<=4MiB; retained plus residual work charge<=8MiB. A successful retain splits its requested charge from existing work into a new retained ticket with total unchanged. The work stays committed and BUSY, including residual0, until separately released. It cannot resize or retain twice. Failed resize/retain leaves the original work valid for a later legal operation or release.

Each private pair links only two service records. Retained-first release subtracts its complete A from retained accounting and adds fixed128 to its still-live paired work, detaching both links. Total falls by A-128>=128; pre-existing residual scratch remains intact. Work-first release detaches both links and clears work; the retained ticket remains fully and conservatively charged. Unrelated retained release cannot clear active work. Repeated release rejects without repeating escrow transfer. Independent arithmetic review must verify these private transitions; tests deliberately receive no counter-inspection backdoor.

The 128-unit per-record bookkeeping convention is a conservative **logical accounting model**, not JavaScript engine allocator/RSS measurement. Minimum256 covers own record plus pair escrow; graph/plan owners will need to include this inside their reviewed H/F/cut formulas. This service neither measures payload sizes nor knows whether a caller clears raw references before releasing a lease. Actual owner cleanup, unchanged graph formulas, cross-owner eviction refusal and future provisional-cut transitions still require a separate integration and review. No numerical ticket grants data or recovery authority.

## Exact local evidence

Executable `/private/tmp/paia-ci-node22/node-v22.23.3-darwin-arm64/bin/node` was checked as **v22.23.3**. Command from `extension/`: `node --test tests/human-qualification-budget.test.mjs` using that exact executable. One whole owning run: **16/16 PASS,0fail/skip/cancel/todo**,86.869834ms.

Raw log `/tmp/shared-human-qualification-budget-node22-first.log`, SHA256 `fd1468ec20521f2ce29acb056025fe271d168520e762887e92d854eb3b2a09cd`. The run was made on the two new code/test files immediately before commit693374; their exact bytes below were unchanged by that commit. No claim that a later receipt commit was reexecuted is made.

| Source | SHA256 |
| --- | --- |
| New `core/browser-native-sync/human-qualification-budget.js` | `721a5523d86a0c9ef93e7ddbe43c487ea6a7f547a29b91b765134b797bc4af4f` |
| New `tests/human-qualification-budget.test.mjs` | `864d3a9437d30edfe322138a5802813495f755c67d84955a5335794ce82db1e2` |
| Sole original direct dependency `core/browser-native-sync/value.js` | `bcc5468f8f365ad7a712ea16f7d00c4f8110ab29930f04f2dc557accb76613c1` |

The complete relative source-import closure is these two runtime modules; `value.js` has no imports and is byte-exact to the base. The owning test imports Node's test/assert/child_process libraries and the actual service. It holds real issued leases for cleanup via the actual release export, with no module reset or test-only internal access.

Coverage includes exact exports/empty frozen brands; all strict argument shapes; ordinary and revoked Proxy refusal with0traps; both-kind BUSY; canonical repeated import sharing; resize/retry boundaries; shared4MiB/8MiB; eight mixed retained slots/ninth refusal/legal retry; both release orders at residual0 and512; unrelated ticket release; simulated post-commit caller failure cleanup; and absence of owner callback invocation. The final test starts one fresh Node22 child only for import/effect isolation, stubbing fetch, indexedDB, chrome, localStorage, encoders, Date.now, UUID and crypto digest to throw, then imports the actual service and performs one lifecycle. It returns `ZERO_EFFECTS_4_EXPORTS` with zero observed effects. This is an import/numeric check, not a workaround to reset the shared service during owning cases.

The private residual arithmetic cannot be independently measured through this deliberately four-export interface. Behavioral tests prove continued BUSY, exact retry/release semantics and full8MiB admission after cleanup; independent source review proves fixed128 preservation and sum monotonicity. The synthetic caller-failure test is not a production graph-publication test. The test retaining an unrelated raw sentinel proves that this numeric service does not invoke arbitrary cleanup, **not** that a real graph owner has actually released its raw references.

## Remaining gates

Independent CODE/EVIDENCE review is pending at this receipt. No Stage1 24-case rerun, Stage2 implementation, raw-owner cleanup proof, native transaction/read guarantee, browser test, release build, Full CI, public PR, merge, package, deployment or user installation is claimed. Frozen PR232 and the separate blocked retention work are unchanged. Future graph integration must preserve its three exports,24 assertions, exact source-derived formulas and failure history; no global allowance increase follows from this service.
