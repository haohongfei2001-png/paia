# PAIA Codex → dot：GitHub 交接入口（2026-10-25）

用户已明确要求将本地成果写入 GitHub，后续由 dot 继续。此入口覆盖历史交接中“尚未推送/待同步”的状态；代码和验收事实不变。当前分支 `codex/codex-to-dot-20261025` 是独立交接分支，不是 main，也未合并进 dot 原开发分支。请先读取当前实际远端、工作树、未提交修改与 stash，避免覆盖其他任务。

## 阅读顺序

1. [完整交接说明](work/local-seven-plan-continuation-20261025/DOT-HANDOFF.md)
2. [当前状态](work/local-seven-plan-continuation-20261025/CURRENT.md)
3. [有效七计划总表](work/local-seven-plan-continuation-20261025/SEVEN-PLAN-LOCAL-STATUS.md)
4. [逐项工作队列及原始证据索引](work/local-seven-plan-continuation-20261025/QUEUE.md)

本地整合冻结为 `9bdef371f06666e123ff6fab7735408166c44b08`；当前发布后继只增加本入口和完整交接归档，没有修改运行时代码。原发布基线 `b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac`，main 同步前只读核实 `8522134ac23a8e563161b4e3633d56e858e01d5c`。不要重新开发已发布的三项 Settings 修复。

## 可完整恢复的归档

[完整 ZIP](work/github-handoff-20261025/PAIA-Codex-to-Dot-Local-Handoff-20261025.zip) 包含已整合源码差额与提交 bundle、三个明确 HELD 候选、收到的原始交接包、原始失败、离线构建及清单。SHA256：`7761ee9fb3325bddbeee7cd5dcf4b50e4df60d184372a72c9fad27c35be3fad8`。1437项校验及四个提交 tree 恢复已通过；这是完整性证明，不是产品验收。ZIP 内9bdef371之后新增的本入口与归档提交不改变源代码，旧“未推送”说明由本入口覆盖。

三个候选已分开归档，不能盲合；其准确差额基线与失败见各报告和 ZIP 的 CANDIDATE.json：

- [codex/codex-to-dot-20261025-held-mixed](https://github.com/haohongfei2001-png/paia/tree/codex/codex-to-dot-20261025-held-mixed)：`7eabab1259b935ac8908185f5ceceabf2b779f5d`，HELD。

- [codex/codex-to-dot-20261025-held-reverse](https://github.com/haohongfei2001-png/paia/tree/codex/codex-to-dot-20261025-held-reverse)：`f19171d3c3f612c298fa3dd84e9d1a1f79934601`，HELD。

- [codex/codex-to-dot-20261025-held-assist](https://github.com/haohongfei2001-png/paia/tree/codex/codex-to-dot-20261025-held-assist)：`c7846285863e58f05a167673c4ab77f8a5f52bf4`，HELD。

## 下一项主线与权限

优先核实全局切库的旧/可恢复文档全集、原责任组件与 reservation 接线，再推进资源/冷恢复结算合同、混合多头 Source/Human/Context、真实 Topic/AI 资格以及原生验收准备。按七计划总表完整续开发，不重设计、不重复已完成测试，不把局部成功写成整体验收。详细缺口已在交接说明和独立报告列明。

最后运输协调修复为20/23加修正测试预期后针对3/3，原失败保留；离线构建87项语法、24886静态检查、708文件通过，未安装、未原生验收。全局切库仍关闭。所有七计划仍NOT_COMPLETE。

普通4096引用/2MiB/30秒保持，已耗尽Full、Browser2、大seed和129组额度不续。此次仅授权GitHub同步，不增加浏览器、云CI、付费模型、凭据、真实账户数据、安装、部署或main合并权限。更大预算/冷超期写入/外部资源需要具体方案和明确授权。保留UNKNOWN与原始失败；不reset/clean/覆盖未提交工作，不把HELD证据分支整条合并。此次不创建PR、不派发workflow。
