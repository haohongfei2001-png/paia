# Developer Run Prompt — PAIA Chrome UI Refresh v1.2

以后每次 execution 只需发送下面同一段。Agent 必须以 GitHub 实时分支、`UI_REFRESH_STATUS.md` 和 `CI_WORKFLOW.md` 为事实来源，不依赖旧聊天。

```text
继续 PAIA Chrome UI Refresh。先解析 GitHub 仓库 haohongfei2001-png/paia 的 chrome-ui-refresh-v1 真实 HEAD，并在同一固定 SHA 按 extension/docs/ui-refresh/README.md 的权威顺序读取 SPEC、UI_REFRESH_STATUS.md、CI_WORKFLOW.md、上一轮报告和 STATUS 指定的当前 round 任务书。

只处理 STATUS 指定的当前 round。若 round 已 IN_PROGRESS，先审计当前 HEAD 自上一个 checkpoint 以来的真实提交与 diff，续做尚未完成部分，不重做、不回退正确工作。一个正式 round 可以由多次 execution 完成。

开发 execution 默认使用 CI_WORKFLOW.md 的 Draft development mode：确认 CI-only PR #31 保持 Draft；做一个自洽子集后 push 普通 runtime/test commit，只以自动 PAIA UI Refresh Development Gate 作为远端快速 gate，并运行任务书要求的本次 focused/视觉验证。不要每个 execution 重跑完整 PAIA Certification。

只有当前 round 的 runtime/tests 已冻结、快速 gate 已通过并准备最终封口时，才由 Agent 自己把 PR #31 临时切为 Ready for review，触发完整 PAIA Certification。所有 mandatory jobs SUCCESS 后立即把 PR #31 切回 Draft，再完成 report/evidence/STATUS。若完整认证失败，先切回 Draft再修复，不让后续开发 commit 反复触发 full certification。

到约 30–35 分钟后停止开启新的大型子任务，转入验证、commit/push、STATUS 和 handoff。工具/消息出现超时后先从远端 HEAD、Actions、STATUS 恢复审计，不重做已经提交/通过的工作。

不得自动进入下一 round、merge main、部署或发布。不得删除/skip current tests、降低断言/阈值、扩大 test timeout 掩盖竞态，也不得用快速 gate 替代 round final certification。

最后只报告：本次完成内容、当前远端 HEAD、当前 round 状态、快速/最终 gate 结果、限制、剩余项和下一继续点。
```

## 自动解释

- PR #31 是 CI-only，永不 merge。
- Draft = 快速开发；Ready = round final full certification。
- Draft/Ready 切换由 Agent 完成，不需要用户操作。
- `CI_WORKFLOW.md` 是 2026-09-16 用户授权的执行节奏覆盖；它只覆盖旧文档中与 CI cadence 冲突的文字，不扩大任何产品或安全范围。
- UIR-04 仍需最终完整 suite / release / mandatory CI /视觉矩阵；只是这些不再在每个小 execution 重复。
- docs-only closure 在明确不改变已认证 runtime/test tree 时可使用 `[skip ci]`。
