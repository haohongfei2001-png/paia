# v0.5.0 Storage Foundation

本阶段只升级存储，产品仍是 PAIA。History Completion / 官方导出导入、多设备、sourceRelations/importCommits、复杂全文索引和最终流式加密备份未实现。未来导入必须遵守：**Sync enriches facts; it never resets user work.** 可靠 user 分支输入将进入 Original Archive；current path 不确定必须保留 ambiguity，不伪装连续文档。本版没有导入和分支展示入口。

## 持久化边界与版本

- `chrome.storage.local.personalAIArchive`：逻辑 schemaVersion 6、databaseId、Settings/授权、偏好、白名单诊断、尚未启用的空规则/AI访问策略。无原文、Library 文本/标题/备注、来源时间、墓碑或全库数组。
- 扩展 origin 的 IndexedDB `paia-archive`：物理数据库版本 1。后台 Service Worker 的 IndexedArchiveStore 是业务持久写入入口；UI 只发送已验证命令、接收查询页。
- `core/store.js` 是冻结的旧 schema 规范化/测试对照实现，不是激活后的业务写入路径。旧的 8 MiB 软停止线只存在于旧实现，未用于新库，也未增加 unlimitedStorage。
- schema 升级由 `onupgradeneeded` 建结构；`versionchange` 关闭旧连接。连接阻塞或格式/数据库身份不符时失败关闭，不初始化空库覆盖旧记录。

| Object store | 内容和主要索引 |
| --- | --- |
| records | 原始记录，主键 id；value 保持旧字段形状，单条更新 |
| recordIndex | 无正文元数据；source、conversation/message、legacyChat、unique dedupe、unique sequence、分页时间/顺序、hidden/trash/known |
| blocks | Library 内容、note、exclusion、revision、provenance；用户劳动独立于原文 |
| blockIndex | document、multiEntry record references、sequence、分层分页顺序、时间、排除、是否仍有来源 |
| documents / libraryDocuments | 共享 conversation 目录与兼容 Library 元数据；不存巨大的 sourceRecordIds 数组；三层各自的日期排序索引 |
| sourceCounts | 每 document/source 的分层计数与首末时间索引；避免编辑一条就遍历整个聊天正文 |
| times | 按稳定 source key 的原有时间账本/evidence，复用冻结仲裁器 |
| tombstones | source identity hash 永久忽略和旧 snapshot dedupe hash；不含已删正文 |
| meta | migration 状态、sequence、授权 epoch/enabled 门禁镜像；激活后无控制状态私人副本 |
| migrationBackup | 激活前的完整旧 schema5 安全副本；校验恢复完成并激活时清除 |
| operationReceipts | 编辑 operationId、请求摘要、结果；丢回执后重试不重复修改 revision |

## 无损迁移与恢复

1. 第一次后台读写先进入串行迁移。冻结的旧 loader 规范化 schema1–5；保留全部旧 records、library、conversations、settings/preferences、sourceTimes、tombstones。
2. 一笔 IDB 事务写入完整 schema5 安全副本、摘要、databaseId 和 copying/cursor=0。尚未修改旧 local 档案。
3. 从副本经过旧 loader 做恢复 round-trip，逐字段确认；每 100 个目标实体为一个复制事务，同事务写 cursor。崩溃重启从已提交位置继续，未提交批次由 IDB abort 回滚。
4. 重建逻辑 schema5，将所有字段、数组顺序与副本深比较。不是只核对数量或哈希。verified 状态持久化前必须通过。
5. 再比较一次 verified 目标与备份，然后把 local 原档案替换为 schema6 小型控制状态。这里不声称跨 local/IDB 有原子事务。
6. 最后一笔 IDB 事务删除临时备份和控制副本，写入 gate、active。若在 local 替换后崩溃，仍有 verified+backup，启动会完成激活；若 active 已提交，正常打开。
7. copying/verified 目标损坏时，档案页显示“从迁移安全备份重试”。先验证备份摘要，只清理尚未激活的目标，重新复制校验；不丢弃备份。损坏备份或缺库身份不符则停止，绝不以空库继续。
8. active 之后拒绝 migration recovery。安全副本不作为永久保留的旧私人数据，不会在永久删除后使原文复活。正常运行后的全库灾难恢复体系不属于此迁移备份。

原始迁移对象量被 v0.4.1 的旧容量限制所约束，因此本阶段允许一次完整读取旧状态与安全副本；正常 capture/enrich/edit/exclusion/delete 不走此路径。未来大数据备份不能沿用它。

## 事务与 Worker 生命周期

每个命令在后台队列中运行；读取/验证后，相关事实行、索引、时间证据、默认 block、墓碑在同一个 IDB readwrite 事务提交。异步 SHA-256 等工作先完成，再进入事务；事务内只等待 IDB 请求，避免 await 网络/计时器造成自动提交。成功响应在 transaction complete 后返回，使用 strict durability 提示。强制断电仍受 Chrome/OS/硬盘保障约束，不承诺绝对物理持久性。

编辑按 block/title revision 检查冲突；operationId 回执与编辑同事务提交。若回执丢失，相同 ID/摘要返回上次结果，不多写一次；重复 ID 携带另一请求拒绝。capture 依赖持久化 unique dedupe，合法同文不同来源仍分别保存。enrich 只更新来源事实和 evidence；existing block 不通过默认初始化重写。暂停/epoch 在写事务再次校验；local 与 IDB gate 不一致时失败关闭，用户恢复开关可重新协调。

Worker 终止/reload 不依赖内存变量恢复进度。重新连接 IDB，验证 active/databaseId；旧迁移按 checkpoint 恢复，编辑按 receipt/revision 恢复，捕获按 dedupe 重试。UI 自己的未保存草稿只在页面内存，关闭前有未保存提示，失败可重试。永久忽略清理对应原文的全部快照、时间与索引；已人工整理的 block 按冻结 detachSources 规则保留但解除来源。跨页/跨标签发现来源删除会清理受影响撤销与缓存。

## 查询、容量与性能边界

集合页与文档页使用 IDB 游标，不返回全库。文档默认每部分 100 条，可按日期/顺序前后翻页；编辑只保存改变的 block。跨部分保留当前文档的有界撤销栈；切换文档结束该会话。GET_STATE 仅保留最多 1000 原文的兼容调试读取，产品 UI 使用 GET_PAGE。

搜索保持标题/可见正文/备注的大小写不敏感包含语义；每次扫描至多 100 个目录元数据，聊天正文每批 50 个扫描，不做复杂全文索引。更多目录通过下一部分继续，因此大库查询可能分几部分；当前部分可能零命中，用户需继续下一部分；本版不提供全库命中总数。索引/计数不在设置页伪装成实际磁盘容量。容量取决于 Chrome origin 配额和本机磁盘，单次文本修改不复制整份档案。现有 JSON/Markdown 导出经分页收集用户请求的原文，最终文件仍在内存生成；不是大规模流式全库备份。

主要门槛 1k/10k/100k：真实隔离 Chrome 的 IndexedDB，构造多聊天、长短混合文本，检查重新打开后的数量、查询读取范围、编辑/capture 行读写数和计时、搜索与 local 无正文。计时是本机单次样本而非 P95。百万条仅可选非阻塞，本次未执行。无需 unlimitedStorage；以后根据真实容量测试单独决策。2 MiB 被动 response 副本限制原样冻结，与本地 IDB 总容量无关。

## downgrade 与权限

真实冻结 commit 7af4c0e 从临时目录安装到真实 Chrome，构造数据后迁移新版本，再在同一扩展 ID/安装目录覆盖回原 v0.4.1 并自助 reload。旧 GET_STATE、CONSENT、SET_ENABLED 拒绝，页面自然捕获没有改写 local 或 IDB；再重新装新版本数据仍相等。

这个实测只是证明所测旧代码失败关闭，**v0.5 激活后不支持直接降级 v0.4.1**。不宣称旧代码能识别新增 sentinel，也不提供“复制旧 ZIP 就能恢复”的操作。代码 checkpoint/代码备份不等于数据回滚。卸载扩展可能丢失扩展存储，不应作为升级步骤。

manifest API 权限仍仅 storage；ChatGPT matches、CSP、被动 response 白名单、捕获/时间解析、开发 reload 基础设施保持。无新主动请求、凭证访问、本地文件导入、云/同步数据库或遥测。测试 fake-indexeddb 6.2.2 只放 tests/vendor，许可证保留，正式包和 internal 包都不包含该测试依赖。
