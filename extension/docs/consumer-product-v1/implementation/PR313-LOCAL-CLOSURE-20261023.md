# PR313 bounded local closure and capacity ledger — 2026-10-23

Tested source HEAD: `3541ed0ebfdef985b66d9d0f1f1ab23f9538ba0c`. Evidence-only successor branch: `codex/pr313-local-closure-20261023`. No implementation change. This follows dot's specific local closing-check coordination, superseding the preceding planning-only restriction only for these checks. No new Full authorization.

## Results and reuse

The final complete `cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` ran with no name filter and concurrency1. **4/4, exit0, zero fail/cancel/skip/todo**, including imported lifecycle Source/Release and both main Source/Release cases. SHA256 before and after: `a021305857cd6ce5e6e7b462d1964df31b34d686b69594556eb1219ec592a943`; Git blob `079b601d25c45af0b8117534377760fb50cbeba6`.

| Final case | Duration ms |
| --- | ---: |
| Source lifecycle | 8936.705417 |
| Release lifecycle | 10440.374750 |
| Source main | 24955.100083 |
| Release main | 26572.698666 |
| Whole invocation | 71042.473791 |

All four native phase journals are retained, including each phase duration and cleanup end. Original protection refusal, independent legacy owner controls, complete exactMultiCache matrix, lifecycle and quiet-network assertions executed. Original harness, test timeouts and release fixture builder were unchanged. This direct owning-file invocation does not claim the entire Browser3 shard or the `scripts/test.mjs` package/development tail-audit gate.

Final actual environment: Node24.19.0, macOS arm64, Playwright1.63.0 from existing extension/node_modules, Google Chrome155.0.8059.85, Python3.12.14. Explicit PATH points python3 to the existing Python3.12 libexec directory; explicit PLAYWRIGHT_MODULE selects the original approved version. The environment is recorded in execution.json. No external visible window, new launcher or security-argument change.

One preceding invocation was incorrectly bound by this closing-check wrapper: with PLAYWRIGHT_MODULE absent, the unchanged harness selected bundled Playwright1.62.1; the builder's literal python3 found Python3.14.7 despite PYTHON naming3.12.14. That invocation also returned4/4 in71003.6155ms, but is retained separately as **environment mismatch, not designated closure**. Its complete log, execution metadata and four journals remain. Correcting the invocation (not tests/harness) justified the one subsequent complete run above. No further repeat.

Entry reuse index corrected after checking the original execution order: the initial `browser8-after.log`4/4 completed at2026-10-22T22:34:11.882Z, **before** the22:36:06.640Z Entry edit that preserved primary errors through cleanup, ensured release removal, added quiet-network/error assertions and removed unused bindings/imports. Therefore that initial log and its17539.806ms must not qualify the final bytes merely because a final source-vector was later committed beside it. The old log remains unchanged as the initial result.

The actual final-file evidence is `evidence/pr313-contract-native-followup-20261023/browser-final.log`, SHA256 `5780cdaabe38c60b0a7f581819ca2c4bdd770a16c5876583308bb7e281eba68b`. The original command event follows the final edit at22:38:45.002Z and completes at22:39:56.753Z. It runs both complete owning files, with all four Entry cases passing: Source5994.791750ms, Release7316.592000ms, negative Source1114.044459ms, negative Release2560.825708ms. **The combined invocation is6/8, exit1, total71635.945125ms**, retaining the two original Browser3 main failures; its full duration is not an Entry-only duration. No separate final Entry-only invocation duration is available.

Current Entry SHA256 `ee9e0d163e5d00d0c1c061be19477ff271495f8abaa49ba3a6c34bb8c1bdac98`, blob `0b4b7536f683c083752a8667c0921a9ec9166230`, matches implementation712a5d1a and retained44803422 source-vector. `source-and-reuse-proof.json` records the checked edit/execution sequence, final log hash and exact case durations. This corrects the prior572f0b47 report and PR3136353492981 item2; source-vector coexistence alone was insufficient evidence for the earlier association. No tests or logs were edited, and no execution occurred for this correction. Other local results, environment and capacity unknowns are unchanged.

## Requested Node22 compatibility check

Inspected PATH, Homebrew Cellar/opt, bundled Codex runtime and common installed version-manager locations. Found Node26.8.2/npm11.19.1 and bundled Node24.19.0 (no bundled npm executable in its bin). **Node22.23.3/npm10.9.9 was not found in these locations**; this bounded inventory is not a whole-disk absence proof. Installed versions and inspected locations are recorded in tool-inventory.json.

Per the conditional instruction, did not install anything, alter the system, or run the three contracts on a substitute version. `sync-node-preflight-ci.test.mjs`, `d5-full-browser-partition.test.mjs` and `cpv1-02-hosted-browser-setup.test.mjs` remain unchanged; their historical144/144 is Node24 evidence, not Node22/Linux. Exact requested Node22/npm environment remains a qualification gap for dot to coordinate. If that environment is later supplied and execution authorized, one combined invocation of those three complete files suffices; no name filters, no real APT/service and no automatic retry.

## Frozen-run capacity ledger

`capacity-root-ledger.json` enumerates every one of the101 current browser roots with the actual unchanged router: shard counts **11/14/10/16/9/13/4/12/11/1**. Router/runner/workflow remain byte-identical to frozen02144bcc. The ledger binds run39860568299 attempt1, testedmerge0ed6516f82f6c095883566c069b4403efff2e9aa, rather than this local successor.

Execution evidence is deliberately weaker than the static assignment proof. The retained PR3136352528630 report and dot's frozen-log account establish complete shard summaries for2/7/8/9/10 (299/300 total), not a newly extracted per-file census. Their42 assigned roots are marked as associated with a complete shard summary; the ledger does not invent individual case counts. Browser3's main Source/Release failed at styleV3 before cancellation, with subsequent phases unentered. For the other58 roots in shards1/3/4/5/6, this task lacks per-file cloud start/end events: **UNKNOWN**, not “not started” or “passed.” No root is labeled proven-not-started. The27 raw logs are held by dot; no duplicate download or execution was used to manufacture missing classifications.

| Shard | Roots | Frozen job conclusion | Available execution boundary |
| --- | ---: | --- | --- |
| 1 | 11 | cancelled | Per-file completion/interrupt/start absent here |
| 2 | 14 | cancelled |82/82; package21218/607 and development audit passed; artifact completed |
| 3 | 10 | cancelled | Main Source/Release fail UNAVAILABLE before cancellation; no full shard summary |
| 4 | 16 | cancelled | Per-file completion/interrupt/start absent here |
| 5 | 9 | cancelled | Per-file completion/interrupt/start absent here |
| 6 | 13 | cancelled | Per-file completion/interrupt/start absent here |
| 7 | 4 | success | Complete shard summary reported |
| 8 | 12 | failure | Complete summary includes original release Entry failure |
| 9 | 11 | success | Complete shard summary reported |
| 10 | 1 | success | Complete shard summary reported |

Keep setup, actual tests and tail audit separate. Dot's Browser2 decomposition110+963+7=1080seconds leaves zero margin against18minutes, before any additional unaccounted boundary/overhead; this is a reported rounded decomposition, not a new measurement. Directly retained Browser2 timestamps are22:09:25.257 summary,22:09:28.691 package,22:09:28.732 development audit,22:09:32.217 artifact finalize. Its canceled job cannot be relabeled test/upload failure. Browser1 signed plan about141s and Browser4 about212s show why prior native24.862s is not a setup upper bound. No complete new per-shard cold setup/test/tail table can be computed from absent logs.

Six canceled jobs and Unit1 shutdown remain separate UNKNOWN-cause accounts. “Operation canceled,” near-limit duration and later orphan cleanup do not prove timeout/OOM/manual cancellation. Browser3's earlier failures survive its canceled job conclusion. Missing completion is an elapsed lower bound, not a duration forecast. The four test repairs and local71-second owning-file result do not fix or prove Linux shard capacity. No timeout, scheduling, jobs, concurrency, cache or gate change is proposed as already justified. Preserve tenjobs/concurrency1/18m. Dot can index existing raw annotations and file events before any narrower capacity proposal; no rerun for collection.

## External main provenance and integration boundary

Direct GitHub commit and associated-PR APIs identify `ebb25414d18f3b27270d67326bfcbd9cc46431e6` as PR316's recorded merge result, merged2026-10-22T23:04:24Z. It has one parent1f3c826c0c49f9d8fd60156182883866971bb8c3. PR source commits are db6d3cef8963d09ddf8e727a33736a3ce5cf1f11 (parent1f3c) and0fb57ed000856878bbb85d74d2703491ab83d5ee (parentdb6d). Commit/author metadata does not establish the actual human operator.

`main-provenance.json` lists all37 website paths. Both the frozen PR313 delta from1f3c and this test successor delta from02144 have zero direct path intersection with those37. No extension/services/workflow path changed in that main advance. This proves only path non-overlap, not semantic independence, a constructed combined tree or combined acceptance. Preserve all website changes in any future dot-owned exact integration; this task neither rebased nor merged them. Final readback still found acceptance02144bcc and mainebb25414.

Evidence is limited to this report/directory. All earlier A/B, negative controls and failures remain unchanged. No runtime/shared harness/helper/workflow/router/version/acceptance/main mutation; no Node contract rerun, extra fresh-service fixture, real APT/font/service/model, cloud CI/Full/deploy or automation change. PR312's two Full opportunities and PR313's first are already consumed. This closing evidence does not authorize another Full.
