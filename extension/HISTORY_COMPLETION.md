# v0.9.0 正式产品契约（优先于下方历史限制）

OfficialExportProvider 为首选历史补全路线。用户允许缺少真实导出样本时完成基于明确 ChatGPT mapping 结构的受限适配与合成端到端验收；未知结构仍拒绝提交。supported profile 与 real export verified 是两个独立状态，不能用前者冒充后者。历史 Auto History Sync R&D 保留，不进入 runtime。

支持结构：单 conversation、conversation 数组、明确 conversations 容器及有界 data 包装；每个 conversation 需稳定 id/conversation_id、mapping 与 message.author.role。current_node/parent/children 可证明路径时才给当前分支顺序。user content_type=text 的字符串 parts 合并为原文；混合/附件/空/缺失身份内容保守跳过。update_time 不替代 create_time。明确时间单位按 profile 解释，异常/未来时间保持未知。

复用 64 KiB 读取、1 GiB 文件/总展开、512 MiB 单候选、10k ZIP 条目、128 JSON 候选、200 倍比例、32 行/512 KiB 提交上限。每个 conversation 最多 4096 个节点、8192 个 children 关系、4 Mi 字符的候选用户文字；每条消息最多 1024 个纯文字 parts、合并后最多 200000 字符。图/会话候选文字超限只跳过该 conversation；不合格消息跳过并计数。损坏容器、路径穿越、加密/嵌套 ZIP 或不可支持压缩整体拒绝。完整检查完成前不写 Source。

分支信息来自来源事实。首次或再次补全确认某未编辑 Input 属于其他/冲突分支时，事务内同步待确认状态、Input delta 和列表索引；不写入用户删除墓碑，不改正文或人工版本。用户已经编辑、移除、保留或明确确认的 Input 继续以本地工作状态为准。该策略也覆盖此前通过页面捕获、随后首次得到分支证据的 Input。

任务保存 adapter/profile/version、匿名文件指纹、计数/状态/时间和有界批次哈希；不保存文件名/整个导出。每批数据与 receipt 原子提交。关闭/暂停、崩溃、worker 重启后需重新同意并选择同一文件；取消持久化且不自动恢复，已写数据保留。重新开始导入依 Source 身份去重。所有批次重查墓碑/人工移除，旧人工字段与 Thought/revisions 不覆盖。

首次引导不会要求 Key。完成导入立即可读；本地增量进入待整理，只有明确普通/有界更新才允许 AI。PAIA Backup 独立识别并引导到恢复入口。官方导出获取步骤以 [OpenAI 帮助](https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data) 为准（2026-09-08 核对）；未读取真实私人导出，实际兼容待一次 smoke。

# 历史 v0.5.1 记录：schema-neutral foundation（不代表 v0.9.0 状态）

本轮用户明确授权先实现所有不依赖官方字段映射的基础设施；下方“因此不开始产品导入写入”指真实文件准入，不再禁止规范化导入框架和 synthetic tests。真实适配器注册表保持空，不实现猜测的官方 mapping/messages ExportAdapter。

内部中间协议是 PAIA 自己的 user-source-v1（conversation、message identity、精确保留文本、时间证据与 current/other/ambiguous 关系），不是官方 export schema。只有经真实验证的 adapter 能产生正式来源；测试依赖注入只在测试构建发生。完整预检计算所有来源的跨批时间冲突与批次摘要，读取到完整 EOF/CRC 后才允许提交；提交重读并核对指纹/摘要。未知格式可以完成语法检查，结果 unsupported，不能伪装完成导入。

IndexedDB 采用附加 importTasks/importBatches/importEvidence/importSources 四个 store 的 version 2 升级，不改变现有业务实体的 schema6。没有混合正文 staging。任务关闭/重启后需要重新授权选择原文件；同一批 records/索引/来源事实/checkpoint 在同一事务提交。来源墓碑和旧快照墓碑每次预检和提交都优先；永久删除清理 source-indexed import evidence/provenance。任务已提交的哈希回执只用于幂等，不能复活原文。

## 已实现的基础设施与真实格式门禁

当前开发分支 `codex/official-export-history-foundation` 从 `86f086b` 延续。`3cbd0ee` 稳定基线、`86f086b` Official Export Fallback Preparation 和独立 R&D 的 `7d05696` 均保留。此源码尚未部署到日常 internal 安装，也未生成正式版本。

| 部件 | 当前责任与边界 |
| --- | --- |
| `ui/history-completion.js` | 两层窗口列表共用面板；本次同意后实际文件选择；预检与确认写入分开；暂停、关闭和续传提示；只显示固定状态与计数，不显示文件名 |
| `core/import/reader.js`、`json-tokens.js` | 全文件指纹；ZIP 目录和完整候选 CRC；原生 deflate-raw 流；增量 UTF-8/JSON token；不会整包或整 conversation JSON.parse |
| `core/import/registry.js` | 正式已验证 adapter 注册表为空。无开关绕过，无 synthetic fallback；完整容器检查成功仍为 SCHEMA_UNVERIFIED |
| `core/import/contract.js` | PAIA 自定义 user-source-v1 DTO。仅 user、sent、text、精确 identity；时间已归一为 ISO；parent/branch 是明确投影结果。不是官方字段声明 |
| `core/import/coordinator.js` | 页面内 File 与临时授权；完整预检后等待确认；重读同文件、串行有界批次、出错暂停并释放文件 |
| `background/import-handler.js`、`core/import/ledger.js` | 仅可信档案页顶层文档；后台唯一持久写入；按 documentId 绑定短期授权；预检摘要、断点、批次回执、去重与墓碑原子提交 |
| `core/import/official-time.js` | 与 DOM/response 分开的时间 provider；未知值补全、可靠旧值保留、跨分片/跨批冲突记录；后续页面扫描不能抹掉可靠 official_export 时间 |

完整预检会产生身份哈希、完整文件指纹、批次摘要和必要时间冲突证据，不产生 archive/Library 正文。新正文 UTF-8 字节数只估算原文规模，不含索引、元数据和 Library 副本，也不保证可用容量。预检后才允许确认提交；导入过程中其他已授权捕获/编辑继续由同一后台串行调度，预检估计可能因此变化。

每批最多 32 条且正文加标题最多 512 KiB；原子事务同时提交业务记录、索引、来源事实、默认 block、计数和 checkpoint。回执丢失后相同序号/摘要重放，不重复计算。新内容快照不会覆盖已有原文，也不猜测版本先后；已有来源不会重建用户 Library。other/ambiguous 仅新默认 block 进入带“导入分支待确认”标记的已排除区；已有人工排除和编辑不受影响。预检汇总跨批分支/父关系冲突，冲突的新来源保守标记 ambiguous；跨文件冲突不会悄悄替换为确定关系。最终分支投影和图语义须由真实 schema 决定。

暂停不撤销已提交事务；边界是下一批不再启动。页面关闭/Worker 重启丢失内存授权，任务显示待重新选文件。用户重新同意并选择**完全相同内容**后，从头有界重读以重建投影、核对所有批次摘要，跳过已提交回执；断点不是跨会话保留 File 或任意字节 seek。任务列表每页 20 项，可继续翻页。授权有效期 30 分钟，过期保守停止并重新授权。

文件指纹是固定 64 KiB 块的 domain-separated SHA-256 链，末尾绑定文件总长度；不是标准整文件 SHA-256。不使用文件名、修改时间或部分首尾采样代替内容绑定。

## 明确资源边界

- 选中文件最多 1 GiB；候选解压总量最多 1 GiB，单候选 JSON 最多 512 MiB。
- ZIP 目录最多 16 MiB、10,000 条目、128 候选；解压比最多 200；仅 stored/deflate-raw。加密、ZIP64、多磁盘、不支持压缩、危险路径、重复文件名、目录/本地头/描述符不一致、CRC 错误均拒绝。资产不解压、不落盘。
- 当前 conversation JSON 候选命名规则只用于容器检查，仍待真实样本确认，不能认定覆盖所有官方分片形式。
- 单次读取最多 64 KiB；JSON 深度 48；每个对象最多 8,192 个唯一键，键长 256；保留的单字符串最多 200,000 字符；最多 1,000,000 条规范化 user source。超大 mapping 对象可明确触发限制，不声称支持所有长聊天。
- 提交前，同 source 快照候选及同聊天旧身份候选各最多 2,048；超限停止，不调用无界旧记录物化。
- 限额只能收紧。非选中字符串逐块丢弃，不累积长正文。合格 user 字符串与单批仅在处理内存保留；浏览器解压缓冲由其流实现管理，本阶段未宣称精确峰值内存或百万条导入性能。

## 下一道真实证据门

目前需要用户取得一次官方导出包，并在本机再次主动同意和选择；先复用保留的只读结构检查器验证脱敏结构。不得上传 ZIP、原始/混合 JSON、正文、标题、ID 或精确时间到任务、日志或 Git。随后才能确定真实分片规则、节点/消息身份关系、user 文本投影、时间单位与父子/current path，以及实现真正 ExportAdapter。那之后仍需真实导入、重复/增量、恢复和隐私验收，才能标记可用与发布。这些后续工作依赖真实格式，不以合成测试代替。

Auto History Sync 保持 **technically promising / R&D / unverified for production**，未进入本阶段 runtime；本轮未调试、未删除研究结果。用户已确认捕获恢复；本轮没有读取或改动真实用户数据库，也不补造此前观察的数据库相等证明。

# 86f086b 历史记录：v0.5.1 格式准备

状态：格式准备，未实现产品导入，未升级运行时版本，未正式打包。稳定基线 `3cbd0ee`，tag `checkpoint-v0.5.0-storage-foundation-verified`。2026-09-06 用户确认尚未取得官方导出包。此文是待实现契约，不是测试通过声明。

## 格式证据与开始条件

已阅读 3cbd0ee 的 PRODUCT_SPEC、PRIVACY、README、TEST_PLAN、TEST_RESULTS、STORAGE_FOUNDATION、AGENTS 与 Git checkpoint。旧报告记录 385/385 自动测试和真实 Chrome 验收；本阶段新增测试结果另行记录，不能复用旧报告宣称导入通过。

官方公开资料（2026-09-06 实际打开核对）：

- [官方导出步骤](https://help.openai.com/en/articles/7260999-how-do-i-export-my-data)：在 Settings / Data controls 发起导出，下载 ZIP，其中还有账户等私人数据；处理可能最多 7 天，链接 24 小时有效。
- [官方导出文件说明](https://help.openai.com/en/articles/9106926)：ZIP 内存在 conversations.json；大导出可能包含编号 conversation JSON 文件。未公布编号命名语法、字段完整 schema、identity/branch/时间语义。

现有页面响应/DOM Golden 不是 export schema 证据。不能因为网页历史有 mapping/message/create_time 就推断官方文件完全相同。合成 fixture 只验证检查器与后续明确规则；真正格式证据必须来自用户主动选择的官方文件，只输出脱敏结构。当前无此证据，因此不开始 ExportAdapter 或产品导入写入，不展示“可用”。电脑控制打开本地 file:// 采样页另被浏览器 URL 策略阻止，未绕过；隔离 Chrome 合成交互不能替代真实检查。开发检查器独立于安装版和数据库，不替代最终“一键同步”产品 UI。

待验证：根容器；单文件/编号分片实际命名；conversation identity 字段及一致性；mapping key/node id/message id 的关系；user role、text parts、已发送/附件/工具信息的区分；create_time 类型/单位；current_node、parent、children 的关系与缺失状态。若未知形状，记录固定 unknown 计数并保守停止，不输出未知键或内容。

## 固定范围与接受规则

Thought Library 和 Original Archive 窗口列表共用“一键同步”。首次空库 CTA“补全历史输入”。正式能力就绪后面板为“补全 ChatGPT 历史 / 可用”和“多设备同步 / 即将支持”。有官方获取说明和本次本地读取同意。用户选文件不等于开始提交，先完整有界预检，显示窗口数、预计新增/已存在/永久忽略/问题与估算容量。预检是估计，实际写入再次验证。

仅可靠 conversation + user message identity 与已发送 user text 可投影。原始正文逐字符保留，不 trim、不清理 Markdown、不相似配对。复用 identify/identifySource：同 source/snapshot 幂等，同 source 不同正文独立快照，不猜版本先后；异 source 同文都保存。新版导出缺少消息不删除旧档案。

original conversation title 是来源事实；现有 userTitle、libraryText、note、excluded 和人工整理永不重建。新来源可创建默认 block；已存在来源只 enrich provenance/facts。用户编辑修订号、undo 冲突语义不受导入重置。

Original Archive 保存可靠 user source，包括非 current branch。只存必要 user 来源与父节点/路径关系证据，不能保存非 user 正文或账户信息。不可证明路径的来源标记 branch-ambiguous，不能无提示线性拼进 Library 普通文档。shared ancestor 按稳定 source 只保留一次；关系缺失/冲突不能伪造顺序。最终表示法由真实格式证据决定。

official_export 是独立时间 provider。exact identity + 合格 create_time + 无冲突可使 unknown → official_export/high。已有可靠值一致时保留现值并记一致证据；冲突保留现有可靠结果并记录 conflict。导出内同 source 多个冲突时间不给未知来源猜值，跨分片也必须先识别冲突。捕获时间不充当发送时间；原有 DOM/response 仲裁规则保持。

## 事务和恢复设计约束

目标流程：用户选文件 → 有界读取 ZIP 目录/选定 JSON → 流式 token → message 级安全投影 → 有界批次 → 后台验证 → IndexedDB 原子提交。不能整 ZIP 解压，不能整 conversations.json 或超长 conversation JSON.parse；非 user payload 不进入数据库、local、日志或任务回执。

预检可只持久必要的身份摘要/冲突证据，不能保留原文 staging 或完整关系混合 JSON。提交再次从选择文件读取。大 conversation 的图证据也需要分记录/有界算法；不能用 conversation 数量分批掩盖单聊天无界内存。ZIP 解压必须背压并对实际解压量、比例、CRC、条目、深度/token 设置明确预算；超限有独立结果，不声称全部恢复。

import task/checkpoint 与本批 records/index/default blocks/事实/关系/计数在同一 IDB 事务提交，成功回执只能在 transaction complete 后返回。每批重新检查 source tombstone，忽略来源不写正文、时间、Library 或 provenance。永久删除必须清理新增来源证据，并阻止同文件/不同包/迟到批次复活。

批次有不可重用的任务身份、序号和摘要；重复回执请求不重复累计，不同内容复用批次号拒绝。文件匹配不能只靠文件名/大小/修改日期；按有界内容校验识别同文件。暂停/关闭/Worker 终止/reload 只承诺恢复已提交断点，页面关闭后不承诺无限后台运行。重新选择文件与当次同意后可从头流式重放至断点，不承诺压缩流随机寻址。任务状态恢复不能把 running 当作仍在读取。

状态显示阶段、已处理 conversation、新增/补时间/重复/忽略/问题。完成结果分 completed / partial / unsupported / failed；读到 EOF 不等于所有来源成功导入。容量估算不是保证，事务 quota/abort 失败不推进断点；成功批次保留，用户可重试剩余部分。

## 验收与交付

TEST_PLAN.md 顶部矩阵为必测。需要增加后台入口来源/字段白名单和同意门禁测试；保留全量 v0.5.0 回归、1k/10k/100k 存储检查。产品实现后真实 internal reload 验证必须使用用户所选真实导出，助手/正文/标题/URL/ID/精确时间不离开本机业务环境。只持久安全验证摘要。

正式完成必须：自动全绿、真实 Chrome 导入/重复/编辑/永久忽略/增量/reload 证据、privacy/permission/network/diff audit、v0.5.1 internal checkpoint、internal/release ZIP 校验。前置检查器 checkpoint 不冒充版本完成；不推送远端。
