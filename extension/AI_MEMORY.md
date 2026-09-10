# AI Context compatibility

用户侧名称为 AI Context / AI 上下文。内部 memory route / model / service 保留，避免破坏已有授权和备份。当前产品行为见 [AI_CONTEXT.md](AI_CONTEXT.md)。以下为 v0.10.0 基线记录，若与当前行为冲突，以 AI_CONTEXT.md 为准。

# AI Memory MVP — v0.10.0

AI Memory 是 Thought Library 上的授权、检索和显式分享层，不是第四份正文数据库。

## 数据与权限契约

- 复用物理 IndexedDB v5 的 meta，添加版本 1 memory 命名空间；迁移事务仅创建默认配置/Profile，不改 Source/Input/Thought/AI 正文。旧 schema 与 identity 不变。
- 持久：默认拒绝策略、Profile（名称/详细度/简短使用偏好）、Topic 决策、全局 Entry 排除、可选 Section 排除、有限活动元数据。没有 query 全文、context 全文、源文副本、API Key。
- 新 Topic 默认未授权。普通 denied 属于当前 Profile，“永不提供”对所有 Profile 生效；Entry 排除和 Section 排除同样全局优先；共享 Entry 若属于明确禁止 Topic，则保守禁止从其他 Topic 绕过。合并/新布局不自动继承来源 Topic 的 allow。
- 临时 allow 只在 chrome.storage.session，绑定 Profile + Topic，Chrome session 结束失效，不进入备份。显式 deny/never 不能被临时 allow 绕过。
- 默认 Profile + 可创建/重命名/删除自定义 Profile；Entry 排除对所有 Profile 生效，撤销入口明确。

## 本地 Context

- 授权门禁在读取 Thought 正文为检索候选之前执行。只读 Thought/组织/来源索引与状态；不扫描 Source Record 原文或 Input 正文。
- 复用 NFKC 规范化/本地词法；标题与 query 关联优先，再按人工确认、有效性、置顶、依据与稳定时间/ID排序。默认优先当前有效记录；AI possibleEvolution 仅在历史查询中加入。仍有效的旧 Thought 不被猜测删除；不同表述明确提示未确认，不断言新旧自动替代。
- AI synthesis 仅在证据全部可用/授权且版本一致时辅助检索/展示，排位低于 Thought，不能覆盖人工编辑。
- 简洁/标准/详细都有硬字符与保守 token 上限、数量上限；去重/截断是确定性本地操作，零 API。
- 预览按主题连续阅读、可移除本次条目、永久排除分开；每项可跳转 Thought Entry，有选择原因和时间。
- Context 正文只在当前预览内存。分享须明确点击；后台重新校验授权/来源/版本，过期预览拒绝分享并要求重建。清空/离开/重启不从持久缓存恢复正文。
- Copy 仅写 clipboard，绝不读取。Markdown 下载同样显式点击；不注入 ChatGPT 草稿，不自动发送，不做 AI 压缩。

## 备份、安全和验证

- 在既有 versioned Backup v1 的 organizationState 中扩展严格白名单 memory 元数据；兼容旧备份，无 context/session cache。空库恢复/64 MB/100000 项限制不变，非空冲突和墓碑优先。
- 完整性检查增加授权/Profile/Entry 引用检查，只读无 repair。
- 必测授权泄漏、排除/共享绕过、stale preview copy、墓碑/来源移除、当前编辑、session 重置、无 Key、A–F journeys、50/500/1000 Topic 性能、迁移和备份。

## 非目标

无云同步、多来源、embedding、LLM/Provider 依赖、自动 ChatGPT 注入、AI 压缩或记忆正文复制。

## 明确边界与使用限制

- 简洁：2400 字符 / 估算 1800 tokens / 6 项；标准：6000 / 4500 / 16；详细：12000 / 9000 / 32。字符限制按完整格式计算，token 为本地估算而非计费精确值。
- 每次最多扫描 20000 个授权范围内的 placement，分 100 项分页并让出执行；达到上限明确提示缩小范围。每主题最多取 8 项已有 AI 综合辅助材料。不会扫描原始聊天正文。
- 最多 20 个 Profile。授权列表分页显示，可全选当前搜索结果（最多 1000 个），批量允许必须确认。名称去重、保存版本冲突保留草稿，可重新读取。
- 活动默认保留 30 天，可设为不记录/7/30/90 天或随时清空。界面只显示保留期内最近 20 条；持久最多 200 条，写入下一条活动或修改保留期时清理过期记录。活动是本机构建/准备分享记录，不证明用户已发送给外部 AI。
- 预览句柄只保留 query、选择 ID、版本/哈希等易失元数据，最多 10 个、15 分钟；正文不存入 IndexedDB 或 session。其他数据变更也可能保守停用预览，重新构建即可。
- “仅本次”指 Chrome 浏览器会话，不是一次按钮点击；Worker 重启仍保留。可立即撤销所有临时授权。
- 全局单条排除绑定稳定 Entry ID。主题合并或布局代际变化不自动扩大已有 allow，需重新核对。普通条目编辑仍使用最新内容，不移除主题授权。
- 本地检索不能证明自然语言观点的逻辑替代；提示保留不确定性。无自动注入、embedding、实时上下文联想或 AI 压缩。
