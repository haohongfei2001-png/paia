# C · Ownership Map

**最终原则：Settings 只展示和调用真实 owner，不复制其状态。**

| 控制或事实 | 唯一状态 / 行为 owner | Settings 的角色 |
|---|---|---|
| Settings 组、返回、焦点、滚动 | AppShell / 现有 RouteSession 的有界 view state | 提供六组导航，不建第二个 router。 |
| 保存我的 AI 输入 | Capture 的 CONSENT / SET_ENABLED 与 store | 消费当前状态，明确同意，失败回退。 |
| 智能过滤 | SmartFilterUI / FILTER_MODE 等 store 操作 | 显示 light/off 为开/关，保留人工保护。 |
| 外观、语言、正文尺寸、时间格式 | 原 UPDATE_PREFERENCES 与现有规范化 | 标签映射、即时生效、狭窄写入。 |
| 预览遮罩 | r6 隐私 owner / hideContentPreviews | 单次挂载；不复制字段、不在读失败时露出正文。 |
| AI Context 状态 | AI Context / Passport 的只读摘要 | 仅“AI 与提示词 → AI 上下文”一处状态与入口。 |
| 四卡、Global/Card/Topic Access、Connections | AI Context | 不提供任何副本、矩阵、按钮或权限写入。 |
| Topic / Section / Entry、组织与局部 AI Organize | Thought Library / PT-1 | 不进入 Settings；仅兼容合法恢复。 |
| Prompt 文本、pin/order/edit/hide/split、插入 | Prompt Surface / PromptReuseService | 不管理、不复制列表。 |
| Prompt 状态与位置 | PromptSurfaceCommands / promptSurfaceV1 | 显示必要适用事实；调用其受限 position-only reset。 |
| 下一句建议权限与生命周期 | 现有 Stage 3A 计划对应的真实 Prompt owner | 独立显式开启入口，不放进 UX preference 副本。 |
| 档案窗口排序 | ArchiveOrderPreferenceService | 迁入 Archive Navigator，同一偏好与回退。 |
| 历史导入 | initHistoryCompletion / ImportHandler | 同一导入 flow 的低频入口，非同步。 |
| 存储占用 | 浏览器 estimate，由现有 r6 数据呈现 | 一个数据详情入口，未知不编造 0。 |
| 已有备份恢复 | BackupPanel / BackupService / worker recovery fence | 原流程的新呈现，不实现新备份引擎。 |
| 已移除内容发现 | 对不同已有 query 的组合 read/presenter | 聚合入口和分页，不创造 universal restore。 |
| Input 恢复 | InputReview / 对应 Input 命令 | 保留 source 与人工编辑保护。 |
| Topic/Entry/Placement 恢复 | 对应 Thought owner 与身份/关系操作 | 逐类型调用；不复制正文、不开放权限。 |
| 原始来源 / 具体 Source 永久删除 | OriginalSurface/ArchiveOriginalQuery；Source 预检与 purge owner | 来源入口保留；删除仍在具体对象，B-02 拒绝保留。 |
| 版本历史 | 当前 Input / Thought / Entry 的历史 owner | Settings 无入口或说明。 |
| 数据/索引修复 | maintenance-recovery / IntegrityPanel / 对应 store | 真实故障才呈现，不能增加平时的维护后台。 |
| 版本 / 更新 / 法律与帮助目的地 | manifest、现有更新生命周期、已确认内容/渠道 | 只消费真实事实与可用动作，不制造能力。 |

## 依赖未接通时

Context route/state、撤销兼容以及 Stage 3A 开启/撤销接口必须由各自模块提供。缺失时只显示真实不可用，不以 Settings local boolean 伪装接通。完整 Thought UI 不是 Settings 前置；缺少未来模块不阻挡本地阅读偏好、输入保存、导入与合法恢复。

旧 local-only/deny/revoked/session 保护不因 UI 删除而被清空。最后一个可用撤销入口必须等 Context owner 提供可达替代后再移除。不会为 Settings 重新设计四卡或重启 Passport 控制台。
