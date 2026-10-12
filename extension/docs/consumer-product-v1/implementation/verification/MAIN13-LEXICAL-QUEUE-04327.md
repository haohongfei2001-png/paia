# Topic lexical read queue recovery — 0.43.27 candidate

Base main13eea846cabf0fa01ffd3c687ae4834c9c6fe559/tree65a7d33ce3a9a1c2069a96680de0ed0637e91626. This compatible reliability repair changes the lexical adapter's queue delegation, one controlled original-owner counter, the original D2 consent completion barrier, and synchronized manifest/package version. Shared BNS Core, Settings writes, Source and control publication owners and CI remain unchanged.

The original Store `run` owns its `tail`, cached control and private publisher observation. The query adapter previously inherited then forked that state, allowing its later operations to race the real Store. Delegating only this adapter to the original `s.run` keeps that publisher and queue. The canonical body facade remains bounded/read-only and final consent, generation, current-body, purge, rename and recovery fences remain strict. Do not wrap the entire multi-step query in the same queue: its nested original operations require their normal boundaries.

A synthetic real original publisher and independent SDK release gate supply the counter. The original runtime with the final all37 oracle fails `31/32` Section-reading cases (`CONTROL_PUBLICATION_CHANGED`); fixed exact payloads pass all83 in four whole unit files. The counter allows only original control revision+1 across all37 stores, preserves actual SDK preference and exact canonical body. The initial SDK gate incorrectly awaited whole-query completion and cancelled32 tests; that failed fixture is retained, replaced with a separately released SDK gate, and never counted as passing. A new-worktree attempt missing skip-worktree D6 assets failed two cases; exact original Git blobs were restored and local original D2 then passed2. Those local outcomes do not identify the unique cloud fault.

Accurate final local precommit component evidence:

| Component | Original complete coverage | Result |
| --- | --- | --- |
| Section reading, read model, control owner and recovery | Four whole files, Node22.23.3 | 83 PASS, 10713.726542ms |
| D2 durable Section and UIS-02 scoped search | Two whole files, original source and built release, headless | 3 PASS, 52761.752292ms |
| Source package | Original guard | 15862 checks,465 runtime resources |
| Standard generated release | Original build and release guard | 0.43.27,485 files;15798 source checks/461 release resources |

These final runs have zero failing/skipped/cancelled/todo cases. Checkout HEAD was main13 with the five exact frozen modified payloads; this is not a clean committed successor run. Reuse only those exact code and dependency components, never an old round label. Current-head full certification, normal reviewed integration and exact-main qualification remain pending.

Original [main Full](https://github.com/haohongfei2001-png/paia/actions/runs/38205942812) FAILED Browser4 and9 and both aggregates; [main Prompt](https://github.com/haohongfei2001-png/paia/actions/runs/38205942680) SUCCESS does not replace it. UIS diagnostics showed six reads and zero pending: current40 returned one item, metadata succeeded, expectedGeneration1 returned `STORAGE_FAILED`. The original inner cloud exception is unavailable. D2 release failed before its synthetic seed with `CONTROL_PUBLICATION_CHANGED`; waiting for the original consent acknowledgement is a finite fixture preparation repair, not a runtime security bypass or a proven unique cloud timing diagnosis.

Original raw logs, unique authenticated cloud artifact hashes, counter source, runtime vector and source/release evidence remain in private coordinator packets. No user data, private profile, credential or font binary is committed. No provider call, permission expansion, repeated deployment, installation or blanket seven-lane/Sync/visual completion is authorized by these results. PR258 originals are available; later approved amendments retain precedence.

Limited independent code/component review de5a90a48f00082fd152734265db6bd4592afcb6ad7b50a16a354885af09c8ef, binding acdfa962e44360b43eef2fc1f47cfcf98431ddf7dba9118439327bbbfa9df381 permits normal code commit d43b81b13b8c52919da28f2568227472a260a7c9. Its five payloads match the exact precommit evidence; no clean-commit rerun is claimed. Final public candidate and exact-main certification remain pending.
