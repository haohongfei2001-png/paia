# Canonical Status — PAIA Archive Navigation & Source Structure v1

## Package

- package_id: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- package_status: `READY`
- planning_round: `COMPLETE`（文档内容已完成；实际远端发布证据见PUBLICATION）
- implementation_started: `false`
- current_round: `ANS-01`
- current_round_status: `READY`
- execution_id: `NONE`
- baseline_main_sha: `38804b99153074f54148f875e2e09c76568bc1cd`
- planning_commit_sha: `RESOLVE_FROM_PUBLICATION`
- canonical_branch: `main`
- canonical_head: `RESOLVE_GITHUB_REF_AT_EXECUTION_START`
- verified_baseline_ci: `PAIA Certification #357 / run 35322458613 / attempt 3 / success / head 38804b99153074f54148f875e2e09c76568bc1cd`
- blocker_requiring_product_owner_decision: `NONE`
- runtime_modified_in_planning: `false`

本文件是本包唯一执行队列。`planning_round=COMPLETE`不表示任何产品功能实现完成；九个实施轮均尚未执行。

## Round queue

| Round | Status | Dependency | Goal | Runtime/evidence |
|---|---|---|---|---|
| ANS-01 | READY | Canonical planning publication | Reader选择surface精简、单排序切换、时间常显、测试登记 | NOT_STARTED |
| ANS-02 | PLANNED | ANS-01 COMPLETE | 来源关系/历史/生命周期、purge与Backup兼容基础 | NOT_STARTED |
| ANS-03 | PLANNED | ANS-02 COMPLETE | adapter逐能力证据审核、可信source observation管线 | NOT_STARTED |
| ANS-04 | PLANNED | ANS-03 COMPLETE | 有界Navigator读模型、索引/覆盖/游标/迁移 | NOT_STARTED |
| ANS-05 | PLANNED | ANS-04 COMPLETE | 三级工作区、持续Navigator、响应式与安全切Window | NOT_STARTED |
| ANS-06 | PLANNED | ANS-05 COMPLETE | source ordering provider、设置、fallback与生产UI接线 | NOT_STARTED |
| ANS-07 | PLANNED | ANS-06 COMPLETE | Thought Library总览/搜索/独立思想连续列表 | NOT_STARTED |
| ANS-08 | PLANNED | ANS-07 COMPLETE | Topic连续Reader、双向windowing与编辑安全 | NOT_STARTED |
| ANS-09 | PLANNED | ANS-08 COMPLETE | 全包集成、lossless迁移、release认证与文档对齐 | NOT_STARTED |

## Requirements

R1–R9 全部有正式实施路径；详见README映射与VERIFICATION V01–V23。
R8不是延期需求：ANS-06必须实现模块、设置、消费者、持久偏好、可靠provider正例与unavailable fallback。
R6/R7实站能力可能unknown；Project/order/delete要逐项实证。当前没有已认证的ChatGPT结构合约；不能声称实站同步已实现。
本包无新provider捕获、无新AI联网授权、无Source identity变化、无旧worktree清理。

## Current execution record

没有领取任何implementation round。规划执行只写本目录Markdown，并做现有实现的只读/隔离UI检查。
下一条明确执行消息才可领取ANS-01；本规划execution不得自动开发它。

## Completion protocol

合法状态PLANNED→READY→IN_PROGRESS→COMPLETE，或BLOCKED；同时最多一个可执行round。
本轮完成：tests/certification→runtime commit/main publication→远端CI核对→receipt与STATUS更新→commit/push→GitHub回读→停止。
同execution不进入下一READY。失败/中断保留当前轮、evidence与恢复点，不擅自推进下一轮。

## Next action

`ANS-01`，严格按DEVELOPMENT_PLAN对应section与EXECUTION_PROTOCOL执行。
当前planning到此停止。
