# v0.9.2 Full Product Gap Audit

起点：`990566ba802487a71ab957903ef6bd7f5d6cc47b` / checkpoint-v0.9.1-ux-reliability，独立工作区 clean。日常代码为 v0.9.1，135 文件与冻结回执相等。实际建库代码物理 schema 5；chrome.storage.local 逻辑 schema 6。未打开私人数据库。已读 v0.9.0/v0.9.1 验收、PRODUCT_SPEC、STORAGE_FOUNDATION、PRIVACY、HISTORY_COMPLETION、THOUGHT_LIBRARY_FOUNDATION 与 BACKUP；历史章节按新契约解释。

起始 2026-09-08 13:01:57 UTC；功能冻结 17:31:57 UTC；硬截止 17:51:57 UTC。最后 20 分钟只做回归、构建、部署和 checkpoint。无子代理、无真实 Provider/私人数据访问。全量回归至少预留 30 分钟并尽早冻结代码。

## P0 / 数据与收费风险优先

| 发现 | 现有证据 | 处理 |
|---|---|---|
| 关闭/刷新只警告，不主动 flush；IME 尚未 collect 时 dirty 可能为 false | archive beforeunload、Document/Metadata/AI editor | 增加统一生命周期保存保护，先复现后修复；不宣称硬杀进程能保存未提交输入 |
| AI 字段重读冲突入口只处理普通/独立 Entry，未处理 aiEditor | archive reload-document | 补齐 AI 草稿保护和明确重读路径 |
| AI 字段只有 debounce，没有 maxWait；监听器未统一释放 | AIReadingEditor | 复用 AutosaveSession、AbortController，测试连续输入、并发编辑与关闭 |
| 大量删除/迁移/索引引用缺少只读自检入口 | 无 integrity checker | 有界只读检查来源、成员、修订、身份、checkpoint、redirect；仅聚合安全结果，无自动修复 |
| 请求结果未知的普通提示不够明确 | actionFailure + runtime 白名单 | 明确未知结果与防重复收费；保留既有 ledger/single-flight，无自动重试 |

既有费用预检、单次/有界上限、session Key、墓碑、Source-faithful、AI evidence 验证、原子写入和迁移 fence 已有覆盖；作为必回归项，不能凭旧报告标成本轮通过。

## P1 / 核心流程与状态

- 搜索：Input 每键立即读取；Thought 搜索按 postings 页顺序、AI 按字段重复，缺少统一排名/高亮/键盘导航；空中间页和索引 catch-up 需保留真实状态。
- 状态：Library 仅 8 态；全局读取、保存、History、Backup 各自文字无共同语义映射；缺少轻量加载占位。
- 导航：v0.9.1 已修待确认；仍需检查低频 Data/legacy、Revision、独立内容、Backup/History modal、搜索回流及 onboarding。
- 错误/反馈：部分按钮 Promise catch 吞掉错误或设置清除 Key 抛出未处理 rejection；成功修改有些仅靠列表变化判断。需安全自然文案和局部成功确认。
- Backup：已有 versioned v1、分块导出、空库冲突预览、64 MB/100k item 恢复限制。需 10k/100k 规模响应性证据，不盲目扩大恢复范围。
- 删除：Source 永久删除已有二次确认，Input remove 有会话 Undo；Topic/Entry remove、AI 派生状态、恢复冲突和 Revision 再做全链路确认。

## P2 / 阅读与产品一致性

统一 back/breadcrumb、按钮/输入/焦点/状态样式；3/2/1 Grid、1440/1024/768/窄屏布局与截断；统一空态和中文动作词。低频技术代码进入 Advanced；release guard 排除测试工具、自重载及敏感调试。不新增依赖或设计系统。

## 用户条目覆盖与执行计划

| 条目 | 审计/实施范围 |
|---|---|
| 1–10 | 所有页面导航/状态/加载/空态/错误、删除与保存/dirty；优先补上述 P0/P1 |
| 11–13 | Input/Thought/Topic/AI 搜索去抖、排名、去重、高亮、键盘与 1k/10k/100k 响应性 |
| 14–18 | Grid/主题身份/碎片候选/合并/零请求切换，复用并强化既有质量策略 |
| 19–27 | 原话/AI/有界成本状态机、未知结果、Key、错误矩阵、schema/evidence/忠实正文与提示约束 |
| 28–35 | 历史 ZIP/JSON/分支/时间/恢复幂等、备份 v1/冲突/大库、v0.7/0.8/0.9 迁移 |
| 36 | 必做只读数据完整性检查；按页，有进度/取消，不返回正文或稳定 ID |
| 37 | 可选 repair plan；不在没有明确安全证据时自动修复 |
| 38–44 | worker/页面/浏览器会话、capture、权限/CSP/隐私及 rejection/listener 检查 |
| 45–54 | 基础可访问性、快捷键、modal、响应式、轻 tokens、v0.9.2 footer 和 release guard |
| 55–58 | A–E Journeys；至少 1000 Inputs/50 Topics/600 Entries 长期混合数据；性能门槛和明显泄漏检查 |
| 59–65 | 所有 durable action 局部成功/失败反馈；中文文案；隔离 Chrome 页面/按钮/菜单系统性检查 |
| 66–72 | 不新增大功能；4 个产物、精确唯一日常目录部署、checkpoint、Git clean、21 项最终报告 |

## 验收状态

初审后新增发现并修复：异步 Topic 重读后旧 DOM 接受未收集输入；AI 保存回包丢失产生重复版本；备份恢复遗漏移走最后 Input 的原始聊天计数；全空/无依据 AI 返回可能覆盖旧缓存；Settings 的 Organizer 及过滤定时全库诊断导致大库读队列堵塞；菜单在悬停前没有可点击区域。另修复定时刷新打断慢搜索、造成结果迟迟不能完成的竞态。最后补齐独立内容弹窗内的保存失败/冲突恢复入口，并修复索引 catch-up 时被覆盖成“无结果”的提示。所有发现均有新增回归或故障复现。完整回归执行中，最终结果见 V092_ACCEPTANCE.md。不得将代码检查、旧通过记录或合成 Provider 当成真实用户数据/模型质量验证。
