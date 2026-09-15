# Developer Run Prompt — PAIA Chrome UI Refresh v1.1

以后每次 execution 重复发送下面同一段，不附加轮次号、不重述聊天背景。Agent 必须使用 GitHub 实时分支与本目录 STATUS 决定当前正式 round，并允许一个 round 由多次短 execution 完成。

```text
在 GitHub 仓库 haohongfei2001-png/paia 的 chrome-ui-refresh-v1 分支，解析真实 HEAD，并在同一固定 SHA 按 extension/docs/ui-refresh/README.md 的权威顺序读取 SPEC、UI_REFRESH_STATUS.md 和当前 round 任务书。只处理 STATUS 指定的当前 round；若该 round 已 IN_PROGRESS，先审计当前 HEAD 自上一个已知 checkpoint/handoff 以来的真实提交与 diff，续做尚未完成部分，不重做、不回退已有正确工作。

本次是一个有时间边界、以可恢复性优先的开发 execution，不要求单次完成整个正式 round。目标时长约 35–45 分钟；到约 30–35 分钟后停止开启新的大型子任务，转入 focused 验证、必要 release/browser smoke、commit/push、STATUS 和 handoff。本次只完成当前 round 中一个自洽、可验证、可提交的剩余子集。

不重新设计、不超范围、不改变产品或安全语义。开发中优先运行与本次改动相关的 focused tests、guards 和必要真实浏览器验证；不要每次都无意义重跑 Full Suite。只有当当前 round 的全部功能、截图、逐图视觉检查和该 round 规定的最终 gate 都完成后，才可提交 round report 并把 STATUS 标记 COMPLETE。

如果本次不能完整封口当前 round，不得硬撑到卡住，也不得标记 COMPLETE。停止前必须尽量把已完成且自洽的正确代码/测试 commit 并 push；把 UI_REFRESH_STATUS.md 保持为 IN_PROGRESS，精确记录本次已完成、剩余、已运行验证及结果、尚未运行验证、当前远端 checkpoint 和下一次继续点。推送后重新核验 GitHub HEAD。

最后只报告：本次完成了什么、当前远端 HEAD、当前 round 是否 COMPLETE、验证限制、还剩什么、下一次从哪里继续。不得自动进入下一 round、合并 main 或部署。
```

## 执行解释（无需用户额外发送）

设计交付必须先在 STATUS 标 READY。NOT_STARTED 开始指定 round；IN_PROGRESS/BLOCKED 只续做该 round 及其真实阻塞修复；前轮未完成不能越过。**正式 round 与单次 execution 解耦**：UIR-01～UIR-04 的产品路线不增加新编号，单次 execution 只是当前 round 的可恢复工作切片。

每次 execution 开始必须重新解析远端真实 HEAD。若 STATUS 落后于已存在的本轮提交，先依据真实 Git 历史和 diff 修正 STATUS，再继续，不得把已经存在的产品代码当成 NOT_STARTED 重做。

本轮准入、principal files、保持项、两级 gate 与截图要求已在 README/SPEC/任务书。普通 UI 选择已经冻结，不重做 baseline 审查或请用户选择方案；只因产品/数据所有权/删除/授权/隐私/新 durable 数据/新付费外部行为或最高约束冲突才要求决策。

开发 execution 默认 focused gate，不要求每次跑完整 1000+ suite。当前 round 准备 COMPLETE 时按其任务书执行最终验收；UIR-04 仍承担最后完整回归。不得降低断言、skip 失败、扩大 timeout 掩盖问题。

只在上述普通开发分支串行提交，不启动旧 ux-r2 恢复或 overnight/CI carrier/control/lease 流程。缺执行证据不算通过，旧 UX 认证不是 UIR 认证。四轮均 COMPLETE 时不启动新工作，只核对并报告等待用户合并决定。
