# Canonical Status — PAIA Archive Navigation & Source Structure v1

## Package

- package_id: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- package_status: `IN_PROGRESS`
- planning_round: `COMPLETE`（完整规划已发布至main并回读；证据见PUBLICATION）
- implementation_started: `true`
- current_round: `ANS-05`
- current_round_status: `READY`
- execution_id: `NONE`
- baseline_main_sha: `38804b99153074f54148f875e2e09c76568bc1cd`
- planning_commit_sha: `dc92647d9d937f86d8e57c0040edec330e9f7e7f`
- canonical_branch: `main`
- canonical_head_at_execution_start: `NONE`
- ans04_execution_start_sha: `b0b3038a79e479314dfa8505cb8dbfb62fcf67d3`
- ans04_implementation_commit: `54e6ddb3568a2c1431b0c1235854d20febf91371`
- ans04_certified_head: `3ac136b694055dc2fb17613f4757dddbe4a527c3`
- ans04_main_certification: `PAIA Certification #381 / run 35429870723 / attempt 1 / success / head 3ac136b694055dc2fb17613f4757dddbe4a527c3`
- completed_ans01_branch: `ans/v1/ANS-01-20260918-1845`
- ans01_implementation_commit: `7947c869ccffcbda9d2a0a77fdafbb498b4eb0d5`
- ans01_certified_head: `91941891ecb4002690312959677e9975f590c0c1`
- ans01_certification: `PAIA Certification #362 / run 35360097931 / attempt 1 / success / head 91941891ecb4002690312959677e9975f590c0c1`
- ans01_closure_certification: `PAIA Certification #363 / run 35362881392 / attempt 3 / success / head 0f394d66bf8e84e82eb3dd72a45c05e1d17152b1`
- completed_ans02_branch: `ans/v1/ANS-02-20260919-0109`
- ans02_implementation_commit: `6de0f4a525b181562b9873f7ee3da220d8b18d79`
- ans02_certified_head: `a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b`
- ans02_candidate_certification: `PAIA Certification #366 / run 35386445629 / attempt 3 / success / head a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b`
- ans02_main_certification: `PAIA Certification #367 / run 35394493831 / attempt 2 / success / head a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b`
- completed_ans03_branch: `ans/v1/ANS-03-20260919-0633`
- ans03_implementation_commit: `82c49a5572eb58b215947b194524bd466176056c`
- ans03_certified_head: `2a4851ffd9ab734b90802aee58f3306f3ebdf85a`
- ans03_candidate_certification: `PAIA Certification #372 / run 35407564216 / attempt 3 / success / head 2a4851ffd9ab734b90802aee58f3306f3ebdf85a`
- ans03_main_certification: `PAIA Certification #373 / run 35411623422 / attempt 3 / success / head 2a4851ffd9ab734b90802aee58f3306f3ebdf85a`
- verified_baseline_ci: `PAIA Certification #357 / run 35322458613 / attempt 3 / success / head 38804b99153074f54148f875e2e09c76568bc1cd`
- blocker_requiring_product_owner_decision: `NONE`
- runtime_modified_in_planning: `false`

本文件是本包唯一执行队列。ANS-04 已完成：有界 body-free Navigator read model、分代索引/coverage/cursor、durable invalidation 与 lossless rebuild 已发布至 main，并在 exact runtime head `3ac136b6…` 通过 PAIA Certification #381 / run `35429870723` / attempt 1。ANS-05 仅推进为 READY；本 execution 不实现 ANS-05。

## Round queue

| Round | Status | Dependency | Goal | Runtime/evidence |
|---|---|---|---|---|
| ANS-01 | COMPLETE | Canonical planning publication | Reader选择surface精简、单排序切换、时间常显、测试登记 | certified `91941891…` · runtime CI #362 success · closure CI #363 success on `0f394d66…` · `receipts/ANS-01.md` |
| ANS-02 | COMPLETE | ANS-01 COMPLETE | 来源关系/历史/生命周期、purge与Backup兼容基础 | implementation `6de0f4a5…` · certified/published `a9fd811a…` · candidate CI #366 attempt 3 success · main CI #367 attempt 2 success · `receipts/ANS-02.md` |
| ANS-03 | COMPLETE | ANS-02 COMPLETE | adapter逐能力证据审核、可信source observation管线 | implementation `82c49a55…` · certified/published `2a4851ff…` · candidate CI #372 attempt 3 success · main CI #373 attempt 3 success · `receipts/ANS-03.md` |
| ANS-04 | COMPLETE | ANS-03 COMPLETE | 有界Navigator读模型、索引/覆盖/游标/迁移 | implementation `54e6ddb3…` · certified/published `3ac136b6…` · main CI #381 success · `receipts/ANS-04.md` |
| ANS-05 | READY | ANS-04 COMPLETE | 三级工作区、持续Navigator、响应式与安全切Window | NOT_STARTED |
| ANS-06 | PLANNED | ANS-05 COMPLETE | source ordering provider、设置、fallback与生产UI接线 | NOT_STARTED |
| ANS-07 | PLANNED | ANS-06 COMPLETE | Thought Library总览/搜索/独立思想连续列表 | NOT_STARTED |
| ANS-08 | PLANNED | ANS-07 COMPLETE | Topic连续Reader、双向windowing与编辑安全 | NOT_STARTED |
| ANS-09 | PLANNED | ANS-08 COMPLETE | 全包集成、lossless迁移、release认证与文档对齐 | NOT_STARTED |

## Requirements

R1–R9 全部有正式实施路径；详见README映射与VERIFICATION V01–V23。
R8不是延期需求：ANS-06必须实现模块、设置、消费者、持久偏好、可靠provider正例与unavailable fallback。
ANS-03 只认证了现有 current-conversation identity / presence 的可信生产路径；ChatGPT Project identity/name、membership、Project/window order、rename/move、conversation/project deletion 仍为 unverified → unavailable。Synthetic lifecycle/order 只证明通用 admission/reconciliation 安全性，不构成 ChatGPT 实站认证。
本包无新provider捕获、无新AI联网授权、无Source identity变化、无旧worktree清理。

## Current execution record

ANS-04 execution `ANS04-20260919-exec01` 已完成。领取起点为 `main@b0b3038a79e479314dfa8505cb8dbfb62fcf67d3`，claim commit 为 `40afc703cc7953ada4516ce26e705b36da2579dd`。实现以 `54e6ddb3568a2c1431b0c1235854d20febf91371` 建立 bounded Navigator read model，并以 `df86ecf8bd64ae0ccb0a09505eaf0f2db5d8ae73` 补齐并发 writer / release parity 证据；最终 certified runtime head 为 `3ac136b694055dc2fb17613f4757dddbe4a527c3`。

本轮新增可重建、无正文的 Navigator projection/index，documents cold build 与 dirty reconciliation 每批最多 100 源对象，scope query 每页最多 40 item；coverage 区分 building/complete，cursor 绑定 scope hash + generation + mode，shadow generation 完成后才原子切 active generation，旧 cursor 明确 invalid。capture/import/title/exclusion/remove/restore/source structure/purge/Backup 等 durable writer 通过 transaction-level invalidation 使索引失效；清索引/重建不修改 Source/Input/Thought truth。

本地 targeted evidence：ANS-04 data/query/migration/concurrency/worker tests 17/17；Chrome query/release 2/2。1000-window evidence 为 body reads=0、full scans=0、max batch=100、30 次 warm p95≈9.20ms；10000-window 为 body reads=0、full scans=0、max batch=100、30 次 warm p95≈13.29ms；真实 Chrome 1001-window 为 body reads=0、full snapshots=0、max batch=100、30 次 warm p95≈58.19ms。并发 writer evidence 记录 402 windows、capture≈15.79ms、edit≈10.46ms，rebuild 可中断/恢复且 stale generation 不发布。

Certification 收口期间发现旧 ANS-01 与 UX-R5 焦点断言会受四路浏览器进程 OS foreground 竞争影响。没有降低 assertion/timeout/concurrency；ANS-01 改为同页面原子 focus + keyboard press，UX-R5 在 change event 边界固定用户 focus-restore intent，并在切换完成瞬间验证 focus。两条临时本地 focus-contention fixture 仅用于压力验证（8/8），未提交。最终 exact head `3ac136b6…` 的 PAIA Certification #381 / run `35429870723` / attempt 1 全部 required jobs success：Current Browser 56/56，Full Suite 1174/1174，package guardrails、privacy/network audit、release build 与 secure-store 均通过。

详见 `receipts/ANS-04.md`。本轮没有新增 object store/DB version、Source/Input/Thought ownership、capture/provider permissions、host permissions、主动来源请求或 AI authorization。ChatGPT Project/order 等未认证 provider 能力仍保持 unavailable/fallback。

## Completion protocol

合法状态PLANNED→READY→IN_PROGRESS→COMPLETE，或BLOCKED；同时最多一个可执行round。
本轮完成：tests/certification→runtime commit/main publication→远端CI核对→receipt与STATUS更新→commit/push→GitHub回读→停止。
同execution不进入下一READY。失败/中断保留当前轮、evidence与恢复点，不擅自推进下一轮。

## Next action

下一次独立产品所有者/监督器 execution 可领取 `ANS-05`。开始时必须重新解析远端 main、读取本文件和 ANS-05 计划，并建立新的 execution ID / candidate branch；当前 ANS-04 execution 到此停止，不实现 ANS-05。
