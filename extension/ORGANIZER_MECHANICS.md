# PAIA v0.7.0 M3 — Organizer Mechanics

从 `571869e` / `checkpoint-v0.7.0-m2-ui-polish` 的独立 worktree 开发。当前范围是合成验收可运行的 Organizer Foundation；不是已接入真实模型的产品版本。不升级 schema（仍 v5 / 37 stores），不新增权限，不部署日常安装。

## Provider 与凭证

`core/organizer/contracts.js` 定义 OrganizerProvider、CredentialProvider、版本化 descriptor、固定错误集合与空 production registry。M3 使用 `organize.v1` 的一次有界批处理：`execute(request, {signal, credential})` 返回 extract/type/topic/section/refresh 候选。任务内每条候选独立 ActionPolicy，批次在一个事务中提交。关系、embedding、语义合并没有实现，也不会接受 Provider 返回的 relation 字段。

Descriptor：providerId、adapterVersion、capabilityVersion、modelVersion、executionKind、supportedTaskSchemas、credentialRequirement。Request：requestId、taskKind、schemaVersion、scopeToken、inputs、entries、allowedTopicRefs、allowedSectionRefs、budget、locale。Response：requestId、schemaVersion、providerVersion、modelVersion、result。未知字段拒绝。

CredentialProvider 的 describeRequirements/getStatus/acquire/revoke 保持 provider-neutral。当前无凭证实现只提供 ready/null；未来 acquire 可提供不可序列化的 task-scoped opaque handle，传输适配器负责消费和撤销。没有 key 字段、secret 存储、backend、BYOK public architecture。生产 registry 为空，生产后台不调度提取；未来 Provider 接入还需要独立授权和传输/凭证实现，不能把本次 fixture 验收当成真实 Provider 验收。

## 唯一投影出口

InputProjectionGateway 接受 coordinator 明确选择的最多 10 个 Input（最多 8 target、2 context）。`selectOrganizerInputs` 按单 document 的 blockIndex 索引分页，每页最多 8 行，不扫描全库。Gateway 重新读取 working Input 与当前版本、过滤/移除/墓碑状态。底层复用 M1 当前 Input resolver：未编辑 Input 的 working body 仍由 immutable 来源引用解析；这不向 Provider 暴露 Source Record DTO、originalText 字段或独立原始快照。Provider 收到的字段只有 selected body/note，内部证据映射不会外传。即便候选未逐项引用 request context，context 仍保留为 context_only dependency；建议的来源清理索引覆盖整个 task scope。

同一请求只能属于一个 conversation。context_only 必须同 conversation、近邻、有 primary anchor，总大小 4 KiB；filtered Input 不能作 target。比较 Entry 最多 4 个且必须依赖本任务 Input；Topic 必须通过这些比较 Entry 的当前 membership 相关联；Topic/Section 共用各自 20 项上限。外部只见 i0/e0/t0/s0 临时引用，不见持久 UUID、conversation title/URL、来源身份、数据库对象。Provider 是受信适配器接口，不是可执行恶意插件沙箱；其返回数据一律不可信。

## 持久任务、预算与原子提交

OrganizerStore 复用 organizerJobs、organizerWorkItems、organizerUsage、operationReceipts。Job 有明确输入集合、consentEpoch、sourceRecordIds、attempts、fence、owner、leaseUntil、nextAttemptAt。WorkItem checkpoint 为 selected → dispatched → committed。organizerUsage 为每一次 dispatch 保存独立 requestId 和 body-free audit（task/data categories/count/size/provider/version），不只保留 job 的最后一次审计。无持久 Provider request/response 私人正文日志；待确认建议正文作为用户可读业务内容存在 suggestions 中，由来源清理索引保护。

Claim、usage reservation、candidate commit 分开事务。Provider promise 在 `store.run` 和 IDB transaction 外等待；每次 dispatch 已计费，超时/崩溃/取消不返还逻辑用量。过期租约可由新 worker 接管；每次 claim 生成新的 requestId/scopeToken，旧缓存响应不能冒充新尝试。旧 fence/owner/consentEpoch 或不匹配 policyVersion 不能提交。取消递增 fence；重试有退避和总次数限制；空 registry/unavailable/credential/budget 暂停，陈旧结果失败后需重新生成。完整提交与 job 完成、WorkItem checkpoint、receipt 同事务，局部写失败全部回滚。

BudgetPolicy 是纯 evaluate；BudgetLedger 在事务中累计 session 与滚动 24h 用量。默认总 Input 10、target 8、context 2/4 KiB、内容 32 KiB、请求 48 KiB、输出 32 KiB、候选 12、并发 1、重试 3（总尝试 4）、超时 30 秒。session 上限 256 inputs / 2 MiB / 128 requests；daily 1024 inputs / 8 MiB / 512 requests。session 跨 worker 持久保守累计；不会因为 resume 或时钟回拨重置。monetary 槽为 null，真实计费尚未实现。

## 候选、安全策略与提交

CandidateValidator 验证 schema、版本、精确字段集合、type/formation/action enum、文本字节/长度、候选数量、Input refs、field 与合法非空 offsets、Topic/Section refs 及相互归属。explicit 必须有有效非-context contribution；synthesized 至少两个不同的非-context Input；context-only 不能独立形成 Entry。confidence/关系/越权 ID 均不是授权。

ActionPolicy 唯一返回 allow/suggest/deny。低风险 create/classify/assign/exact 可自动；inferred、ambiguous、受保护字段刷新或分类/组织调整进入建议；非法 action 和同证据 suppression deny。自动 refresh 仅限无人工操作的 AI Entry、explicit、正文直接对应非-context 的完整引用片段；否则建议。用户接受通过同一 policy 的 user actor 分支执行。

LibraryCommitService 是唯一 Organizer 内容提交入口。它重验所有任务 evidence、eligibility、filter、墓碑、consent、lease/cancel、Entry revision/organization/dependency CAS、Topic/Section 当前 revision/generation/redirect/layout busy。提交内再次读 suppression 和 protections，Placement 已有保护/removed membership 不被 AI 改写。没有 AI Input/Source/delete/purge 操作。所有正文渲染继承 M2 纯文本边界。

Exact key = 本机 HMAC(type、完全相同正文、非-context source scopes)。同文字不同来源事件不合并；相似/演化/相关不处理。exact 只合并缺少的 provenance/dependency/evidence，不改正文、人工 Topic、Section 或 order。来源贡献具有稳定唯一 contributionKey。人工编辑使旧 exact key 失效，避免按旧正文归并。

## 建议与 suppression

建议具有 pending/accepted/rejected/expired/superseded、logicalKey、baseRevision、policyVersion、consentEpoch、证据与目标 base。Accept 重新检验证据、目标/组织 CAS，以 user actor 写 journal 和 protections；接受 exact 一致的已有内容也写用户确认保护；陈旧建议在接受时标记 expired。目标发生新 revision 后产生的新同类建议将旧 pending 标记 superseded。Reject 的同版本 logicalKey 不重复创建。状态检查是惰性的，不需要无限后台扫描全 suggestions。

同一旧证据任务在投影前阻止 dispatch，换文字/加入 context 无法绕过。旧证据与新非-context evidence 混合时允许生成候选，但提交保守地继承整个任务的 suppression：即便候选省略旧贡献或换措辞，也只能 reconsider_removed suggestion，不能自动恢复。用户接受可创建明确确认的新内容，旧 removed Entry 不会被自动恢复。

## 自动组织名称的来源清理

M3 自动 Topic/Section 名称也是派生内容。新建时记录 sourceRecordIds；queueSearch 同时维护 libraryMigrationItems 中的持久清理 locator，布局复制也保留它。OrganizerStore 对索引、文档、路径、搜索和 Provider 组织上下文统一做来源门禁：来源不可用时，未人工确认名称显示为中性占位，用户改过的名称保留。purge cleanup 物理清理生成名称与旧版本，字段 revision 同步前进；journal 的 Topic/Section before/after 来源索引防止人工改名后旧 AI 名称藏在历史中。布局批次在复制前重新应用门禁，不能把已清理名称复制回新 generation。该补强只作用于带派生来源的组织行，沿用 schema v5 预留表和现有 purge 工作流。

## M2 UI 与运行边界

只增加弱 Updates N、侧边 drawer、accept/reject、Settings → Thought Library 的整理任务状态/取消入口。没有 Entry AI 按钮、dashboard、card wall、生成测试数据控制或 debug 文案。Updates/jobs 查询不会广播内容变化，避免刷新循环。沿用原有 M2 internal 版本标识（manifest 与包版本未升级）。

## 验证与限制

测试 fixture 位于 `tests/fixtures/organizer/`，不在 production import graph。可见 Chrome 使用临时扩展副本，将 fixture 仅注入测试 service worker；全部数据人工合成，独立临时 profile、离线网络路由。真实 Target.closeTarget 终止 worker 后检查新 generation 并恢复过期租约。性能夹具直接播种 1k/10k 索引数据，测有界 selection/commit/exact/pagination/fan-out/large Topic；该播种不是官方导入验收。Provider 延迟单独模拟统计。

最终证据、截图、完整回归摘要与 checkpoint 见 `outputs/v070-m3-acceptance.md`。真实 Provider 可用性、真实 token/金额、公有凭证方案、私有 ChatGPT 页面兼容性及日常部署不属于本次通过范围。
