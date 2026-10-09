# Human graph shared quota — local integration evidence

2026-10-09. **Pure local qualification only; no native, projection or recovery authority.** Base actual main `62970f0044b11c1f3e5236610d9846a2f0950df3`. Before restoration, Graph, its owning test and value helper were verified byte-identical to approved877; the three service paths were absent. Approved service commits693374/592181/90387 were restored by normal cherry-pick as `c6bddd88`, `51a48124`, `409ceb71`. No overlap was applied blindly. Service code/test remain byte-identical to their independent review.

Integration code commit `c59f4e06b8d57160928550fcf775e42033a1892b`, tree `3bdb50252dd76f8553c22cdfc70eae856032d462`. This receipt is a subsequent documentation-only addition. Changes against main are the three approved new service paths, modified existing Graph/owning test, and this new receipt. No Core, Repository, Plan, CI, version, schema, permissions, provider or UI change.

## Reviewed design and exact implementation

External integration design `work/HUMAN_GRAPH_SHARED_BUDGET_INTEGRATION_DESIGN_20261009.md`, SHA256 `2ce3b5f6c08b2d58621dff6f32321f013cf0d1aa491089fb552882326ea15278`, received Root and independent safe_batch_scope finite DESIGN APPROVE before implementation. Review is `work/HUMAN_GRAPH_SHARED_BUDGET_INTEGRATION_DESIGN_REVIEW_20261009.md` (coordinator reference2834e89d). This does not confer code acceptance or approve Stage2 native reads.

Graph retains exactly its three public exports, primitive canonical source intake, original validators/helpers, all-head summary and unchanged S/W/M/H/F formulas and8MiB/4MiB bounds. It imports the exact four-export numeric service at one literal canonical URL; nonce Graph instances share that service. Wrong arity/type still refuses first without inspection. Beginning fixed F preserves synchronous BUSY-before-source-length ordering; S+F is reserved before scanner allocation and original B before parse/reflection/helpers. The new retry helper evicts only this Graph instance's oldest live handles, at most its initial own live count<=8, and only on shared LIMIT. BUSY or domain failures never cause eviction; another Graph instance or projection occupancy cannot be revoked.

Each record carries its actual retained ticket. Revocation removes both Graph registries, clears raw operations/summary/ticket bindings, then releases quota. Inner qualification tracks its pending handle/record before either Graph registry insertion, with service retain preserving the active work ticket. Its finally drops snapshot/parts/groups/request/graph/summary/operations local bindings without mutating retained arrays. Outer cleanup drops source/parsed/measurement bindings before work release. Success returns only after this cleanup. Failure, including partial publication, revokes the pending record and retained ticket plus work. An explicit failed flag handles null rejection independently of error truthiness. Cleanup exceptions still reach a work-release finally; primary and unexpected cleanup errors are retained in an AggregateError rather than silently replaced.

This is controlled-reference accounting, not GC timing/physical heap certification. Record links, scalar identifiers and body-free retained summaries are distinguished from raw payload bindings. Future Stage2, true owner projection, pre-read native size guarantees, semantic recovery and persistent effects remain separate gates. No graph result grants storage/read/write/restore capability.

## Original coverage and preserved failed observation

All24 original test names and94 extracted original assertion expressions remain present. The original full3000-padding/eight-admission fixture and near-workspace bad-hash assertions are unchanged. Test cleanup pairs each returned handle with its actual Graph module's public release function; successful nonce-module results are registered outside the active spy window. There is no service reset, counter getter or caller release of internal Graph tickets.

First combined whole run had **44/45 PASS,1FAIL,0skip/cancel**,2738.359959ms. Raw `/tmp/human-graph-shared-budget-node22-first.log` SHA256 `8d15c49efa4e064367f9bf0ebcde1ade7a2a9a8bb55df3c3e85e9ecbf8e22eb5`. All original24 and all service16 passed; the new nonce-eight-slots test incorrectly assumed its creation-plus-edit fixture retained eight handles before legitimate byte eviction. That new test now uses the same actual producer's minimal creation group to isolate slot pressure. No original fixture, cap or assertion was reduced.

Second whole run **45/45 PASS**,2576.100875ms, `/tmp/human-graph-shared-budget-node22-second.log` SHA256 `c45cccf7a0e92589e1d72383e666760f54b6c7c55c54897c7e16018a266c5b30`. Subsequent self-review added the explicit failed flag and a null-rejection subcase, so this earlier pass is not substituted for final-code evidence below.

## Final exact local evidence

Verified Node **v22.23.3** at `/private/tmp/paia-ci-node22/node-v22.23.3-darwin-arm64/bin/node`. One final combined whole-file command from extension/: `node --test tests/human-conflict-graph-qualification.test.mjs tests/human-qualification-budget.test.mjs`. **45/45 PASS,0fail/skip/cancel/todo**,2858.556458ms, exit0: Graph29 (original24 plus5 new) and unchanged service16. Raw `/tmp/human-graph-shared-budget-node22-final.log`, SHA256 `08501071cf1afc7b1ec812f4c716beb76b40c2cb92c0a9caa9587145fe6a7c09`. Runs took place immediately before code commitc59f; committed code/test bytes are the tested bytes.

| Source | SHA256 |
| --- | --- |
| Integrated Graph | `32ef02d77f6eebc33f09731905e116eee9f28d30956ab0b6164e71160e8f1fe0` |
| Integrated Graph owning test | `275ef2b3d4c37fd816446f1d549c0f469c85f066d0872c1cf92201c7ef762f5f` |
| Unchanged service | `721a5523d86a0c9ef93e7ddbe43c487ea6a7f547a29b91b765134b797bc4af4f` |
| Unchanged service owning test | `864d3a9437d30edfe322138a5802813495f755c67d84955a5335794ce82db1e2` |

New cases cover real shared numeric occupancy, synchronous error precedence/no hash, full projection numeric occupancy refusal without peer eviction, two nonce Graph instances sharing slots but not cleanup authority, pending-hash global work, and post-retain publication errors including null/cleanup-error subcases. Publication fault wraps original Map.set only for synthetic Graph record insertion, after its real insertion; service ticket registration is unaffected. An optional one-shot Graph Map.delete error exercises work-release finally and later complete pending-ticket cleanup. Attempted handles cannot describe or release afterward; fresh full8MiB work then succeeds. These controlled faults add no production hooks or weakened assertions.

Source audit `/tmp/human-graph-shared-budget-source-audit-final.json` SHA256 `788fdb8b0aab7da33f6f8208c867b716a1945707cfc195355cc407c74e1a5da1`:42-module closure/357854 bytes; the only changed/new runtime members against actual base are Graph and reviewed service, all40 existing dependencies remain exact. It records the24 names and94 preserved assertion expressions. No helper codec/body validator was copied or relaxed.

Final fresh-process import with storage/browser/fetch/clock/UUID/digest throwing reports exact3 Graph plus4 service exports,0 effects, and full8MiB work admission after import. Log `/tmp/human-graph-shared-budget-import-final.log`, SHA256 `4f2e359407ac82a3c015e47bbd59bc14fbfd181892a901766427aa6ced73c291`. The earlier import output happens to be byte-identical; neither is a browser/native or physical-memory proof. `git diff --check` passed.

Independent integrated CODE/EVIDENCE/resource review remains pending at this receipt. No browser, Full CI, build, merge, release package, deployment, account/model use, installation, complete Sync or actual projection validation is claimed. Existing failure logs and the separate blocked retention branch remain preserved.
