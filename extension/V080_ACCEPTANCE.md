# PAIA v0.8.0 — Thought Library Productization 收口记录

本轮从冻结 `102160d / checkpoint-v0.7.2c-ai-organizer-mvp` 创建独立分支 `codex/thought-library-productization-v080`。旧开发目录已有未提交改动，未纳入本轮分支；冻结 checkpoint 未修改。以下验收使用虚构内容，未读取日常 IndexedDB、真实 API Key 或私人聊天。

## 1. 实际实现

一个 Thought Library、两种共享 Topic 身份的显示：默认按主题保存原话与本地 span，AI整理显示衍生综合理解。首页 3/2/1 Grid，连续主题阅读、日期顺序、直接编辑、保存、Undo/Redo、来源回看和独立版本保留。更新中心、成本预览、Settings 使用控制、一次性 AI 引导与建议合并入口已实现。

## 2. INVALID_SCHEMA 的证据与修复

冻结 `102160d` 的 `core/organizer/ai-contract.js` 存在可精确复现的整 Topic 拒绝路径：`object()` 拒绝无害额外字段，根 `evidenceEntryIds` 必填；任一重复/外部 evidence 会使整个响应失败；缺少任一列表也失败。空数组本身原来就合法，不能把它说成历史根因。

v0.8.0 将 schema、示例 prompt、字段边界、标准化验证与 durable 提交统一到 canonical contract：可空/缺失列表补 `[]`，额外字段剥离，部分合法 evidence 保留、全非法条目丢弃，错误 Topic/不可解释顶层拒绝，零依据结果不提交。Provider 返回 JSON 经归一化后真实写入隔离 Chrome 的 IndexedDB，再由 Grid/Reading 读取，整个路径通过。

**没有取得用户那次失败的真实 raw response，因此不能断言其具体触发字段。没有读取真实 Key，也没有发付费请求；真实 DeepSeek 最后一次 smoke 尚待用户点击。** 本轮修复并验证的是上述可复现拒绝路径和完整持久化展示链。

## 3. Topic Quality

本机按名称、摘要、有限合格 Entry 文本与 provenance 评分，至多 8 个主题/章节名称进入模型候选，优先已有长期主题。常见临时动作名称不会直接建立碎 Topic。相关主题仅建议合并，用户可合并或保持分开；不会自动批量重组真实主题。匹配是有限词元启发式，合成测试不代表真实模型一定做出最佳语义选择。

## 4–5. 默认与 AI 阅读体验

默认块显示原话提示、内容数、更新日期，章节内未受人工排序保护的内容按 sourceSentAt 呈现。已编辑字段、人工章节/成员顺序优先。AI 模式原地展示摘要、核心内容/问题数、缓存或待整理提示；未生成的主题仍可见。每条综合陈述可查看依据 Entry，再进入 Input Archive。AI 字段可编辑并保护，用户修改与 AI 更新产生独立 revision。

修复了从依据进入 Input Archive 后返回时旧 AI 编辑节点仍可输入的问题。离开时废弃旧编辑节点，返回使用当前有效 editor。

## 6–7. 更新、增量和成本

- Original 推荐一次最多 20 条，小批 5 条；同时限制内容 32 KB、请求 48 KB 与约 11k tokens。20 条短输入可同请求，长输入自动减量。超限首条不会被跳过或触发付费。
- AI 一次一个受影响 Topic、最多 8 条变更 Entry，必要旧 AI context 最多 16 KB，大主题需再次点击。失败不推进 checkpoint、不改旧缓存；已完成部分只确认实际覆盖的 Input。
- 每次点击最多一次请求；timeout/429/500/非法输出/提交失败/worker 中断均不自动重试。切换、保存 Key、启动、刷新、重启为零 Provider 请求，不自动处理下一主题。
- 默认每日 20 次，两种整理共用；用户可设 1–200，另保留旧会话/输入/字节预算。达到额度明确提示，失败/未知已发送请求不退款。每日窗口沿用已有 24 小时机制。

## 8–10. 自动、合成与可见 Chrome

最终综合结果 **829/829 通过，0 fail / 0 skipped**：unit 557、adapter 95、browser E2E 134、privacy/security 43。一次完整扫描原始为 826 pass / 3 fail，失败来自两份早于 DeepSeek 授权的权限断言（含一个父子测试）；修正预期后仅复测这两份文件，24/24 通过。逐文件 hash 证明运行时、manifest、脚本与其余测试没有变化。原始与综合结果均保留。完整扫描前中止过一次未完成的预检以完成诊断折叠和视觉复核，不计为通过。另有 4,405 项静态 guardrail 与开发入口审计通过。定向阶段 95 项及受影响界面 36 项也通过。

50 条虚构中文历史涵盖 PAIA、求职、文学、研究、AI工具、重复/演化/决定/偏好/判断/长文本/修正/短重要输入/临时动作。3 次显式 Original 点击按 20/20/10 处理，产生 5 Topic、49 个默认 Entry；重复内容合并来源关系，50 个 Source/Input 保留。9 Entry 的主题用两次 AI 点击完成，再用一次点击处理单 Entry delta。500 失败保留旧缓存，预算拦截零新增请求。独立 partial case 为 4 条有效、1 条需人工处理、5 条来源全部保留。

可见 Chrome A–O 全部有对应测试/截图：默认 Grid、Topic 阅读、AI toggle 零调用、缓存切换、两种更新、AI内容、依据、partial、失败、重试提示、人工保护、Settings 普通/高级与 onboarding。浏览器为全新临时配置，网络全部路由至合成响应，外部请求为零。

## 11. 隐私、权限与网络

相对批准基线，`permissions=['storage']`、DeepSeek 唯一 host origin 与 CSP 未扩大，ChatGPT content-script 范围不变。AI 出口不含 Source 正文、assistant、draft、removed/tombstoned Input 或无关主题；本机日期读取不是 Provider 出口。日志仅白名单阶段/错误/大小/计数，没有正文、Key 或 raw response。release 不含 fixture/generator/debug-only action 或 self reload。

## 12. 迁移

已在同一隔离扩展路径从 `102160d / 0.7.2.20` Reload 到 0.8.0：Source/Input/Entry/Topic/版本字段比对一致，人工命名/正文保留，partial AI 标 stale，重复读取幂等，升级零 Provider 请求。旧 v0.6.0/v0.6.1.1 升级回归也通过。未对真实日常数据库执行检查、读取或迁移。

## 13–15. 包、部署与 checkpoint

构建来源提交：`047cb86371da7a0e5b6f6be84d76cbf23cacc5b7`。最终 checkpoint 为 `checkpoint-v0.8.0-thought-library-productization`，收口提交只补充本报告和部署证据，不改变已验证的运行时字节。实施分支 Git clean；原开发目录原有未提交源码改动保留，不纳入本轮提交。没有推送远端。

四份交付位于本工作区 `outputs/v080-artifacts/`：

- [internal unpacked](outputs/v080-artifacts/PAIA-v0.8.0-thought-library-productization-internal/)：114 文件。
- [internal ZIP](outputs/v080-artifacts/PAIA-v0.8.0-thought-library-productization-internal.zip)，SHA-256 `7743d8c0ff477a27ad92ac331ccffa34dd00d0ff83c9df6b723318e7aa859826`。
- [release structure](outputs/v080-artifacts/PAIA-v0.8.0-thought-library-productization-release/)：113 文件，无 development self-reload。
- [release ZIP](outputs/v080-artifacts/PAIA-v0.8.0-thought-library-productization-release.zip)，SHA-256 `34a8e3331d0743309397c3dcee070fc3b28682215269b3f84187863170766359`。

ZIP CRC、每个解包文件与源码/hash 对比、release 静态审计通过。两种最终包分别在全新可见 Chrome 中处理 3 条虚构 Input，各一次 Original + 一次 AI 调用，缓存切换零调用，release 确认无 Reload 入口。见 `outputs/v080-acceptance/artifacts.json` 和 `packaged-chrome.json`。

已使用 `rsync -a --delete` 部署到用户授权的精确目录：

`/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive`

部署前验证真实路径、无 symlink、仅已知扩展资产、原版本 0.7.2.20 及权限一致；部署后为 0.8.0，114/114 文件 SHA-256 与 internal 包完全一致。未读取/修改日常 IndexedDB、私有正文、Chrome 配置或 Key，没有卸载或创建新的日常扩展实例。没有替用户点击日常 Chrome Reload。见 `outputs/v080-acceptance/deployment.json`。

发布包是结构验收包；真实服务 smoke 与隔离合成验收区分。

## 16. 已知限制

- 历史那次真实 INVALID_SCHEMA 的具体字段和真实模型质量仍需用户最后一次点击确认。
- 大 Topic/长文本会触发有界分批；不会无限自动循环。超大既有 AI context 可能被本地预算拒绝，没有静默截断整份旧理解。
- 未知旧 AI 行若同时含人工保护字段，保留原字段并拒绝自动覆盖；来源删除后相关人工 AI 字段保留为隔离草稿，目前没有专用恢复 UI。
- 主题检索/合并建议使用本地词元相似度，不是 embedding；未重写大规模搜索引擎。
- 源发送时间后续补充而主题组织未变化时，日期会更新，但不强制重排已有布局。
- 日常目录只更新文件；扩展生效与真实服务最后 smoke 需要用户 Reload。

## 17. 醒来后

1. 在当前已安装扩展上点击 Reload（扩展弹窗的 internal Reload 或 Chrome 扩展管理页均可），重新打开档案并刷新 ChatGPT。保持原安装目录，不卸载、不重新安装另一实例。
2. Settings 若显示未配置，自己输入 DeepSeek API Key 并保存。
3. 在 Thought Library 打开 AI整理，选择一个待整理 Topic，点击一次“更新 AI整理”。确认出现综合理解并能查看依据。一次点击最多一次请求；失败时不要连续点击，展开本次详情即可保留安全错误码供后续排查。
