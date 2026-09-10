# PAIA v0.7.0 M1 — Data Safety & Core Model

实施基线：已批准设计 `77176f5`，继承稳定代码 `2b07582`。独立分支 `codex/thought-library-v070-m1`。这是 M1 实施说明；最终执行数量、测量值和 checkpoint 见 `outputs/v070-m1-acceptance.md`。

## 实际边界

本轮建立安全数据底座，没有进入 M2。未改最终 Library UI、Smart Filter 规则、History Completion adapter/事务、捕获适配器、manifest 权限或版本号。manifest/package 暂保留 0.6.2；本工作树仅用于 M1 开发验收，不作为日常安装或正式版本包。

后台使用 `LibraryFoundationStore → SmartFilterStore → IAStore → IndexedArchiveStore`。生产消息没有创建/刷新 Thought 或调用 Organizer 的命令。只有既有受信编辑入口与新增只读 `GET_LIBRARY_FOUNDATION_STATUS`；content script 无 Library 读取权限。测试直接提交确定性结构化数据，不执行 AI，不注册 fixture provider 到 runtime。

## 文件与职责

| 文件 | 实现 |
|---|---|
| core/thought-schema.js、core/idb-repository.js | additive v5 DDL、37 stores、索引；旧连接 versionchange 关闭，blocked 请求迟到成功时关闭孤儿连接 |
| core/thought-model.js | 9 个 Type / 3 个 Family、3 种 formation、UTF-8 大小校验、字段保护/作者证据、稳定 rank、HMAC |
| core/thought-store.js | 统一 Library CAS 写入、无正文 receipt、读 fence、删除/恢复/suppression、Topic/Section/Placement、旧路由安全适配 |
| core/thought-evidence.js | 当前 working Input 的版本/字段 digest、primary/supporting/context_only 门禁、提交重验、按字段判断 stale |
| core/thought-migration.js | 100 行映射批次与原子 cursor、legacy 原地 quarantine、旧 Thought revision 来源索引补全、逐阶段激活 |
| core/thought-journal.js | Library/组织实体 revision、90 天与最近至少 20 条 important、actor/fieldMask 隔离的 coalesce |
| core/thought-organization.js | Section 编辑与 Topic/Section/Placement 的当前版本修订恢复 |
| core/thought-maintenance.js | 轻量 Input outbox、indexed fan-out、断点恢复、来源 purge fence 与派生 payload 分批清理 |
| core/thought-runner.js、background/service-worker.js | 仅本地安全维护；批次让出执行、worker 重启恢复。不是 Organizer |

继承的 `core/ia-store.js`、`core/indexed-store.js`、Smart Filter 核心、Import 核心、UI、adapter/content 全部保持原文件字节。必要行为通过 subclass hooks 接管；不调用旧的 Thought 同步 fan-out。Library 专属写入不推进 Smart Filter 的并发诊断计数。

## v5 schema

保留 25 个已有 store，新增 12 个：`topics`、`sections`、`placements`、`provenance`、`thoughtSuppressions`、`organizerJobs`、`organizerWorkItems`、`organizerSuggestions`、`entryRelations`、`librarySearchTerms`、`libraryMigrationItems`、`organizerUsage`。最后一个仅预留批准设计中的预算账本；预算调度不在 M1。

`thoughts` 的新正式行使用 `storageSchema=2`，正文物理字段仍为 `thoughtText`、DTO 为 `body`。保留独立 `revision/contentRevision/fieldRevisions/organizationRevision/dependencyRevision`，以及 `lifecycle/freshness/integrity`。`hasHumanAction`、各字段 `protections/authorship` 保留人工确认，Undo 不解除保护。

Topic UUID 与名称分离；Section 持久 `sectionId`；Section/Placement 物理键带 `topicId/layoutGeneration`。Placement 一条 Entry 对应每 Topic 一行，rank 为 12 位十进制串，索引用稳定 ID 打破并列。耗尽明确拒绝；M2 再实现 generation rebalance 与完整组织界面。redirect 解析拒绝循环及旧 ID 写入；本轮不执行 merge。

第一等 provenance 只保存实际 Input 版本、所选字段 digest、贡献角色、来源关系和 provider-neutral generator 版本，不复制 Input 正文。旧 Input revision 没有可证明的精确版本号，版本不匹配时保守显示 `version_unavailable`；不能用当前 Input 冒充当时使用的文本。

完整索引定义由 `core/thought-schema.js` 单一维护，测试逐项检查存在与 compound/unique 行为。依赖 fan-out 用 `byInputTarget`，purge 用 `bySource/bySourceRecord`，outbox 用 `byPending`，历史用 `byEntitySequence/byDocumentList`。

## 迁移与安全失败

DDL 只新增 store/index，不删除或清空既有 store。逻辑控制 `chrome.storage.local.schemaVersion=6` 不变，物理库版本为 5。

映射阶段为 `thoughts → dependencies → thoughtHistory → verify → active`；cursor、映射行和计数同事务提交。每个队列片段最多处理 100 行，片段之间允许 Input 操作。Library 映射失败只关闭 Library 并保留 cursor；Input 的捕获和编辑仍可保存，新 worker 从最后提交批次继续。

旧 Thought 原行/正文/备注/已有历史保留，不把 Input 生成为 Thought，不猜 explicit/synthesized，不伪造 generator 或历史。即使旧实验行声称 `storageSchema=2`，也不能冒充已验收新行。旧人工作用字段不明时全字段保守保护，旧作者事实不重写。类别有可追踪的 UUID 映射；原 `categories` 不删。

未知结构或来源不可追踪时原地 sealed quarantine，`libraryActivation=blocked_quarantine`。任何来源 purge 都撤销这种无法证明无关的未知 payload 及其历史，不创建 raw 备份。已确认有人工作用的旧 Thought，只保留白名单当前字段并继续隔离，未知附加字段与相关历史删除。

v5 不能直接由 frozen v3/v4 打开；已测试 fail closed。Git 回退不等于数据库回退。没有删库、卸载、复用旧 backup 来恢复数据。

## 编辑、抑制与 purge

所有新写操作验证字段白名单、CAS 和 operationId/digest；Entry、provenance、dependency、revision、receipt 同事务。加密摘要与证据解析在写事务外完成，提交时再次校验 Input revision、来源身份、过滤资格、removal/tombstone 和 epoch。AI actor 不能调用人工编辑入口，inferred 不能自动成为正式 Entry。

人工保护细分 title/body/note/type/formation 与 topic membership/section/order。只改组织不自动锁 body；手工移出 Topic 留负向 membership。恢复写新 revision，不回拨版本、不恢复旧权限。

Thought suppression 独立于 Input removal 和 Source tombstone，仅保存本地 HMAC/版本关系，不保存正文、摘要或 embedding。相同来源证据、重复 capture/import、换 provider、换措辞都不能自动复活。M1 仅把新增独立非 context 来源标记为 future eligibility；同 Input body 变化是否实质新颖留待 M4 验证，备注/context/格式变化不解锁。实际 reconsider suggestion、语义新颖性证明和接受流程属于 M4。

Input 编辑只新增 O(1) outbox/epoch，不遍历依赖 Thought。移除另记持久 lastRemovalSequence，dependency 带 eligibilityEpochAtUse；即使 Input 在队列消费前立即恢复，旧 AI Entry 也不能自动复活，新证据版本不受旧事件误伤。消费者按索引分批处理；note-only 且只依赖 body 时记录等价验证，不改变原 used version、不标语义 stale。移除有效来源后按当前剩余非 context 依赖判断 partial/detached/invalidated。读取端不等待队列即可阻止不合法内容。

Source purge 先在原来源删除事务内提交 tombstone/fence 与 metadata-only cleanup job。返回 `libraryCleanup=pending`；全部派生清理完成前不声称 Library 已清干净。清理覆盖旧/新 Thought、revision、provenance、dependency、suggestion、staged job/work item、search、relation、quarantine。只保留独立人工当前字段；无法安全分离的 AI/source payload 与混合历史被清除。后台停止或崩溃后仍由 fence 阻止读取/恢复/迟到提交。

## M1 之后仍待实施

M2：最终 Library Index、Topic Document、编辑器接线、完整组织读模型与搜索。M3：正式 OrganizerProvider/CredentialProvider/BudgetPolicy、Mock 注册、任务租约/预算/审计。M4：typed extraction/候选 action policy、suggestion、精确 consolidation 等批准范围。M5：完整 Foundation 验收。v0.7.0.1：另行批准的真实 provider。M1 完成后停止，不自动进入后续阶段。
