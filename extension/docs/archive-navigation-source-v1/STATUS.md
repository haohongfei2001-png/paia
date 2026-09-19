# Canonical Status — PAIA Archive Navigation & Source Structure v1

## Package

- package_id: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- package_status: `READY`
- planning_round: `COMPLETE`（完整规划已发布至main并回读；证据见PUBLICATION）
- implementation_started: `true`
- current_round: `ANS-04`
- current_round_status: `READY`
- execution_id: `NONE`
- baseline_main_sha: `38804b99153074f54148f875e2e09c76568bc1cd`
- planning_commit_sha: `dc92647d9d937f86d8e57c0040edec330e9f7e7f`
- canonical_branch: `main`
- canonical_head_at_execution_start: `0a32abc8731823ea13c6b15a574875ff0f3ebe30`
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

本文件是本包唯一执行队列。ANS-03 已完成：可信 source observation admission/bridge 已进入 main，并在 exact runtime head 上通过 candidate 与 main required PAIA Certification。ANS-04 仅推进为 READY；当前 execution 到此停止，不实现 ANS-04。

## Round queue

| Round | Status | Dependency | Goal | Runtime/evidence |
|---|---|---|---|---|
| ANS-01 | COMPLETE | Canonical planning publication | Reader选择surface精简、单排序切换、时间常显、测试登记 | certified `91941891…` · runtime CI #362 success · closure CI #363 success on `0f394d66…` · `receipts/ANS-01.md` |
| ANS-02 | COMPLETE | ANS-01 COMPLETE | 来源关系/历史/生命周期、purge与Backup兼容基础 | implementation `6de0f4a5…` · certified/published `a9fd811a…` · candidate CI #366 attempt 3 success · main CI #367 attempt 2 success · `receipts/ANS-02.md` |
| ANS-03 | COMPLETE | ANS-02 COMPLETE | adapter逐能力证据审核、可信source observation管线 | implementation `82c49a55…` · certified/published `2a4851ff…` · candidate CI #372 attempt 3 success · main CI #373 attempt 3 success · `receipts/ANS-03.md` |
| ANS-04 | READY | ANS-03 COMPLETE | 有界Navigator读模型、索引/覆盖/游标/迁移 | NOT_STARTED |
| ANS-05 | PLANNED | ANS-04 COMPLETE | 三级工作区、持续Navigator、响应式与安全切Window | NOT_STARTED |
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

ANS-03 execution `ANS03-20260919-0633` 已完成。实现从 `main@3adf402f83d9446ca9a1184b0b1109e607102590` 的已领取状态继续，在 candidate branch `ans/v1/ANS-03-20260919-0633` 上形成 runtime head `2a4851ffd9ab734b90802aee58f3306f3ebdf85a`。

本轮新增 body-free source-structure contract、ChatGPT current-conversation presence adapter、isolated content bridge、trusted admission validator，并将已存在 Source 才允许 enrichment 的 observation 接入 worker/store。Production capability 逐项声明；只有 conversationIdentity=verified，其余 Project/order/move/delete 相关能力保持 unverified/unavailable。没有新增权限、host、主动来源请求、凭据读取、AI授权或正文存储。

Candidate exact head 的 PAIA Certification #372 / run `35407564216` / attempt 3 全部 required jobs success。随后 PR #33 / main 以 fast-forward 方式发布，GitHub 记录 merge SHA 即 `2a4851ff…`，没有改变已测试 runtime tree。

Main exact runtime head `2a4851ff…` 的 PAIA Certification #373 / run `35411623422` / attempt 3 最终全部 required jobs与 Certification gate success。最终 Full Suite 为 1155/1155；Current Browser 为 54/54。此前同 SHA 的失败 attempt 暴露的是旧 ANS-01 focus 时序断言；未修改 ANS-03 runtime、未降低断言/timeout/privacy/security/certification gate，失败 job 重跑后通过。

详见 `receipts/ANS-03.md` 与 `SOURCE_CAPABILITIES.md` 的 ANS-03 as-of 记录。

## Completion protocol

合法状态PLANNED→READY→IN_PROGRESS→COMPLETE，或BLOCKED；同时最多一个可执行round。
本轮完成：tests/certification→runtime commit/main publication→远端CI核对→receipt与STATUS更新→commit/push→GitHub回读→停止。
同execution不进入下一READY。失败/中断保留当前轮、evidence与恢复点，不擅自推进下一轮。

## Next action

下一次独立产品所有者/监督器 execution 可领取 `ANS-04`。开始时必须重新解析远端 main、读取本文件和 ANS-04 计划，并建立新的 execution ID / candidate branch；当前 ANS-03 execution 到此停止，不实现 ANS-04。
