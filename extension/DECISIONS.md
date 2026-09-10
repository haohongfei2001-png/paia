# v0.8.1 decisions

- Time order is a read projection within each Section. It never rewrites manual placement ranks; local query and pagination use the same ordering and invalidate when time/membership order changes.
- AI view and reading order are global local preferences. Switching views is always free of Provider calls. Empty AI sections remain absent. Only protected user fields from invalid old caches can be explicitly recovered as a standalone user Entry.
- Continuous work is a finite explicit authorization, separate from normal one-request updates. Durable reservation and progress share the existing budget/content transactions. Worker restart and authorizing page loss stop the action.
- Backup uses a versioned domain NDJSON stream, limited staging and full referential/integrity validation. Restore is an atomic empty-library operation; it rejects existing newer work and known deletion conflicts. No major schema rewrite is needed in this release. Details: BACKUP.md.
- Topic delete is a reversible container/membership action. A later model suggestion for a manually merged old name follows the canonical redirect; no silent splitting or automatic rename/merge.
- Release strips active diagnostic controls and probing tools, retains useful read-only error details/usage audit, and contains no test-only injection or development reload. Daily deployment is only to the explicitly authorized path; Chrome Reload remains user-owned.

# 2026-09-06 · v0.4.1 连续文档与共享标题

按用户批准修订实施，基线1c8a81f，先建立checkpoint-before-v0.4.1。采用原生plaintext-only编辑，保留source/time block边界、日期分隔与低权重时间，不增加卡片、跨source拖拽/重排/合并或富文本框架。userTitle在共享conversation目录中唯一管理，两层同步；原始标题和原文不被编辑事务覆盖。

自动保存通过原后台唯一串行事务提交；块revision和titleRevision保护多页面修改，provenanceSignature保护来源删除后的迟到编辑。当前会话Undo/Redo有条数和容量上限，不冒称跨重载历史。写失败或冲突保留草稿，来源永久删除清除相关引用/撤销内存并保留无关草稿。以上边界先以自动回归复现再修复。

Settings固定autoSave=true、permanentSourceIgnore=true、libraryDeleteAlsoDeletesOriginal=false；保留禁用联动字段/UI，未来只能明确整source删除触发。旧hidden/trash仅一次性Legacy兼容，正式产品不再出现隐藏/回收站。永久删除原始来源继续使用v0.4.0算法和稳定身份墓碑；来源时间、响应预算、网络权限和捕获链路冻结。

本轮只开发已批准的阅读编辑及设置结构。公开测试前补充轻量Library修订历史；v0.5单入口规划分批/增量/导入式历史获取与后续多设备同步，不依靠不断提高单response上限。AI规则及Memory仅保留既有禁用接口。

最终365/365自动测试和隐私/权限/网络/冻结链路审计通过。用户解锁后，代理继续从4a721e8完成最终release自助reload、真实ChatGPT重开/刷新、编辑/自动保存/撤销重做/共享标题/设置及数据样本复验；恢复internal入口并再次自助reload后仍50条、6个活跃文档、原有排除整理保留。本轮未重新开发业务。checkpoint-v0.4.1-internal-real-verified绑定最终交付，正式ZIP排除开发入口，候选和正式包均与checkpoint逐文件核对；不推送远端。

---
# 2026-09-06 · 自助 reload 基础设施与真实验收闭环

按用户明确要求冻结 9918959 的全部业务运行资源，仅新增独立 development/reload 脚本、internal 构建器、release 允许列表与测试。按钮只存在于生成的 internal popup；使用自身 URL、顶层 frame、internal 标志、event.isTrusted 和 userActivation 校验后调用 chrome.runtime.reload()。没有后台 reload 命令或 postMessage 通道；正式包拒绝夹带任何开发 reload 运行资源，不增加权限或网络。

首次 bootstrap 利用 unpacked popup 重新打开会读取磁盘文件的已实测行为；代理通过原生 Chrome 扩展工具栏菜单完成，不需要用户最后一次人工 reload。先在稳定 v0.3.1 代码上验证保留 46 条与暂停状态，再由已打开开发 popup 重载逐字匹配 release 源码的 v0.4.0，使真实证据可直接绑定正式包运行时摘要。八项真实验收完成后恢复带开发按钮的 internal 安装并再次自助 reload 验证持久性。

自动 355/355 PASS；真实仅操作专用虚构编辑/排除/永久删除样本，现有旧档案保持。日期/原文不可变真实证据明确限定为样本与整体数量，完整存储等值用隔离 Chromium 验证。保留 9918959，最终 checkpoint-v0.4.0-internal-real-verified；生成分离的 internal candidate 与不含开发入口的正式 ZIP，不推送远端。

---
# 历史：2026-09-06 · v0.4.0 internal Thought Library 自动验证阶段

从 79b2856 继续，先建立 checkpoint-before-thought-library-v0.4.0 并完整验证 334/334。原有两份未跟踪解压目录保留。正式捕获与时间/响应模块全部逐字冻结；后台只在既有 trusted UI 分支增加 Library/Memory 命令，store 添加原子迁移、默认来源表示、Library 操作与永久来源忽略。

采用 schema4 的 sourceRecordId 引用型 direct block；只有用户整理才独立持久化 libraryText。原始聊天标题独立，AI 字段为空预留。AI Memory 固定 disabled，无第三份正文库。永久删除按稳定消息来源处理所有本地快照；选择此语义是为防止同一源消息变更文字后重新归档，不影响别的来源。同源已整理或合并 Library 文本保留并解除被删原文关系。

最终 351/351 全量自动测试、2305 静态规则及冻结 diff/语法检查通过。真实 Chrome 的扩展页访问被浏览器工具安全策略阻止，未尝试替代路径绕过，未操作真实私人数据或安装目录。正式 ZIP 门禁按预期拒绝；checkpoint-v0.4.0-internal-auto-verified 只标记自动验证完成，不冒称真实验收成功。后续恢复原连接后继续八项真实流程，不将此访问问题转成用户手工测试。

---

## v0.3.0 internal：统一 SourceTimeResolver

仅canonical用户消息的conversation identity + exact message ID可关联候选。DOM和response都产生候选，后台统一Resolver为唯一正式时间仲裁入口；capturedAt和originalText永远不改。支持chatgpt_dom、chatgpt_response_create_time；official_export与firstObservedAt只预留接口，本期不导入、不采集firstObservedAt，后者将来只可approximate且不能覆盖high/very_high。

容差1000ms（含边界）。两源有效且在容差内：使用response原时间，dom+response / very_high；只有一源：该来源/high；两源有效但差异超限：null / conflict，保留候选及来源状态；均缺失：null / unknown。无效/低可信输入不降级已有可靠候选。响应来源自身的旧持久阻断继续保留；拒绝的response证据不是有效候选，不能否决单独有效DOM，也不能降级已有high/very_high。两个有效来源之间的矛盾必须撤回正式时间，优先于v0.2.3的单源high保留规则。

DOM只检查已稳定通过canonical的user role自身、最多3层后代及最多3层带相同message ID且仅包含该role的祖先，后代扫描最多64节点，另查最多3个祖先，合计最多8时间值；不进入正文容器、编辑器、附件或其他role。接受明确data-message-created-at/data-message-sent-at，以及具有发送/创建语义标记的time[datetime]，title/aria-label仅接受完整“Sent at/Created at/发送于/创建于 + 含时区ISO机器时间”。无时区、人类日期、更新时间、正文内日期均不采纳；同来源多值冲突保守跳过。候选不直接赋值sourceSentAt。

新增矩阵与临时Chrome DOM+fetch→bridge→Resolver→store→archive UI全链路测试，覆盖同值/亚秒/几秒/大冲突/单源/无源/非法/错identity/assistant/重复ID/迟到/低可信。来源候选原值只留本地时间账本，档案仅额外显示安全状态摘要（来源存在性、一致性、最终日期/可信度，无正文、ID或精确候选timestamp）。不新增权限、网络、遥测。自动全通过后仅一次真实旧聊天smoke。

## v0.2.4 internal：fresh-install 结构发现路径考古

基线 72b805c / checkpoint-v0.2.3-internal。跟踪文件干净，仅原有 outputs/Personal-AI-Input-Archive/ 未跟踪；保留不读取/覆盖。用户新证据是 clean-install 3条正文/顺序成功、3条正式时间未知，与 legacy 迁移无关。本轮不改 legacy、dedupe、store、时间线或缓存总体架构。

v0.1.3.2（c8216fd）完整诊断路径：content/response-observer.js inspect 在旧 URL/endpoint 拒绝前对合格 other 调 fingerprint，clone 后有界解码；adapter/json-fingerprint.js walk/collection 接受显式集合及任意命名的直接数组/字典、message 包装，inspect 生成 candidate 和 user matches；content/response-bridge.js ingest 到 JSONFingerprintProtocol.Model；core/json-fingerprint.js summary 用 chat + canonical ID Set 计 exact matches；后台/UI只接安全计数。该路径不写正式记录。

v0.2.3 正式路径：同一 other 旁路在 URL_SHAPE_NOT_ALLOWED 之前启动，不因 other 被阻断；解码后改调 ChatGPTHistoryContract.parse，仅认 mapping字典/messages数组；成功才 emitHistory → bridge history.ingest → evidence(history.match canonical IDs)/flush → CAPTURE或ENRICH → 后台校验 → applySourceTime → archive UI。diagnostic inspect 独立执行，candidate=true 并不意味着 parse 成功。这是确认的契约分叉。

已有 FakeChatGPT 的 fixture-history 查询URL本来就是 other，页面 fetch 确实走 MAIN，不是直接注入 metadata；但正式断言用已知 mapping/messages数组。已有55项 source-time-integration只断言诊断语义及原文字段不变，没要求结构候选最终写正式日期。因此缺的是未知命名结构/messages字典到 archive UI 的正式链路，不是完全没有 other discovery E2E。

仅凭 fingerprint #12 计数不能还原真实 JSON 的集合键名/数组字典类型。本轮构造三个与统计一致的受限形态：55条、5 user、3 canonical、conversation_id，先旧诊断通过且 v0.2.3 正式3/3未知，再修复。不能把合成 payload 宣称为取得了真实 response 或证明唯一线上根因。

实现 parseStructural 独立严格契约并接在原 parse 失败后，保留原 parse 逐字不变。不将 diagnostic candidate flag 直接信任为正式时间。新结构入口重验当前聊天、唯一完整集合、结构/范围/角色/user ID时间和冲突，有界最小投影；没有 canonical exact 命中时仅文档待匹配缓存，不能向后台写时间账本。首次授权前就已返回的响应仍不读/不补请求。

最终全量287项通过、1920项静态审计通过；62个JS/MJS及2个Python语法通过。结构入口之外生产逻辑不变；checkpoint-v0.2.4-internal与提交后ZIP逐文件核对，不推送。

## v0.2.3 internal：最后一跳调查与修复

基线 ddc0519 / checkpoint-v0.2.2-internal，跟踪文件干净，既存未跟踪解压目录保留。真实 smoke 仅据用户反馈得知 order 已补而时间仍未知、原文与捕获时间不变；未读取真实档案、DOM 或 metadata cache，所以不能报告真实 sourceMessageId/sourceKey 存在与否，也不能认定本轮代码缺口就是该条记录唯一根因。

代码证据：applySourceTime 先补 conversationOrder，再判断 evidence，因此无时间、不可用时间或 sourceTimes 持久阻断都可能呈现有 order/无发送时间。enrich 已按 exact ID 查询，无 legacy 标志跳过；赋值不依赖旧 sourceSentAt 必须是 null。真正复现的缺口在 CAPTURE dedupe 命中：原先仅 applySourceTime 按 sourceKey 过滤，未修 identity；缺少 sourceKey 的旧记录会去重但不能补时间，缺少 sourceMessageId 的记录也不在该分支修复。

统一来源解析用于 CAPTURE 去重及 ENRICH。旧 sourceKey 或 exact chat+message ID 仍是直接证明；若缺失，持久 dedupeKey 与当前 exact sourceKey、已存 contentHash 的组合 SHA-256 必须一致且该 dedupeKey 唯一，所有已存身份不得矛盾。它证明来源绑定，不比较旧正文、不使用正文哈希相等猜测来源。记录不因 enrichment 新建；tombstone 不复活；同次 CAPTURE 使用缓存时间立即补写。

仅凭 order 的 A 变体不安全：order 属于首次显示片段，当前唯一 #3 不能证明历史 #3 属于同一消息，故仅 order 仍 unknown，已有可靠来源证明的 A 变体自动通过。按用户本轮 F，high 日期保持不被冲突覆盖或清空；旧 high 撤回测试改为保留 high 且阻断未知/新快照，旧持久阻断不清除。该最新规则优先于历史文档。

先复现 3 项 legacy 红测试，另复现无账本 high 对新快照污染的红测试，再修复；定向 35 项通过，全量 273 项通过、1920 项静态审计通过。浏览器只用合成记录与临时未登录 Chrome，在同一文档验证两种 metadata/identity 时序。不新增 UI、权限、网络、正文或时间兜底。

## v0.2.2 internal：断线恢复，以当前磁盘为准

恢复时 HEAD=925919d（checkpoint-v0.2.1-internal），已查最近 8 个提交、staged/unstaged diff 均为空，仅 outputs/Personal-AI-Input-Archive/ 为既存未跟踪目录，保留不读写。实际最近完整测试日志 work/v0.2.1-full-final.txt 及 test-summary.json 为 260 通过、0 失败/跳过、1920 静态审计；没有找到用户所述 5+15 fixture 的本地实现或更新测试日志，不能假定它已执行。

已存在独立 enrichment、精确 identity 修复、metadata merge、SPA fixture 清理、Worker heap 重启检查和同步 clone race 修复；不重新开发或撤销这些实现。先补 5+15 定向回归，以实际失败决定是否需要生产修复。仅最终私有页面兼容性由用户一次 smoke；不推送远端。

新增 5 项定向测试在生产代码未改动的 v0.2.1 上通过；包含已有回归的定向运行共 18 项通过。实际证据支持保留现有逻辑，本轮只增加明确回归、版本和交付文档，不声称发现或修复了新的生产根因。首次执行的 6 项浏览器失败是沙箱启动 Chrome 被拒；在获准的临时浏览器执行环境下 18 项全通过。最终全量 265 项通过、1920 项静态审计通过；24 个测试文件无失败/跳过。仅版本字符串发生运行资源变化，交付检查点 checkpoint-v0.2.2-internal，ZIP 提交后逐字节核对。

## v0.2.1 internal：真实 smoke 后的生命周期调查

基线 0e4df44 / checkpoint-v0.2.0-internal，已跟踪文件干净；保留原有未跟踪解压目录。真实页面未被代理读取。审查确认旧 schema 及当前正式记录均使用 chatId/sourceMessageId/sourceKey，不臆造 conversationId 字段改名迁移。现有 store 已允许 enrichment；调查集中于到达时序、canonical 后续可见性、正式与诊断生命周期耦合、候选结构及证据降级。

只补足安全回填与自动测试，不扩展产品功能；每个推断通过人工合成 fixture 检查，不能宣称获得真实响应 JSON。最终自动验收、检查点、ZIP 字节核对后只需用户一次真实 smoke。

最终 260 项全量自动测试、1920 项静态审计与语法/diff 审查通过。检查点命名 checkpoint-v0.2.1-internal；生命周期 A–F 结论、22 项新增测试和真实边界详见 TEST_RESULTS.md，提交后 ZIP 与 Git 逐字节校验。

## v0.2.0 测试优先策略与正式时间

- 本地 HEAD=a603291，已跟踪文件干净，仅一个用户已有未跟踪 outputs/Personal-AI-Input-Archive/，保留不覆盖。用户明确用正式 sourceSentAt 要求取代旧诊断版禁止写时间限制；不重复询问已授权行为。
- 不从安全计数编造真实 JSON。把已知机制写成受限 contract 与人工合成 fixtures；未知 schema 失败关闭，最终只需一次真实旧聊天兼容性 smoke。
- 保留 canonical 正文规则；最小时间证据随 canonical 批次到后台，串行合并同一来源证据、跨重启保留冲突；晚到 metadata 通过重复扫描补录而不重建记录。诊断通道继续脱敏。
- 测试 harness 使用浏览器本地 route fulfil，不启动远端/本地依赖服务器，不更改扩展站点权限。测试先于实现，所有自动测试由代理完成；不自动推送远端。

- 本次断线恢复以全部本地文件为准：已有 clone 竞态修复及 233 项绿色日志，同时存在后来追加的两项 storage-review-red 失败测试。保留并完成这些未完项，不回滚、不重新开发。竞态测试改为事件/受控流验证，并在临时副本证明旧 await 变体会失败。
- 后台批次时间逆序和无效时间账本加载重试均先复现再修复；最终 238 项自动测试、1919 项包审计与语法/diff 审查通过。检查点 checkpoint-v0.2.0-internal；提交后打包 internal ZIP 并与 Git 成员/字节一致性核对。仅最终私有页面兼容性 smoke 交用户，详情见 TEST_RESULTS.md。

## v0.1.3.3 恢复与实施决定

- 完全以本地为准：HEAD=c8216fd，tag=checkpoint-json-fingerprints-v0.1.3.2。已检查最近 8 个提交、manifest 与运行代码；跟踪文件无未提交 diff。两个既有未跟踪解压目录保留且不覆盖、不提交、不打包。未执行 reset/checkout/restore 或删除现有修改。
- 用户本轮安全统计确立历史候选可匹配，不推测实际 JSON。独立时间语义模块，不改原 response-parser、v0.1.2 canonical 规则、存储、导出或时间线。
- 采集边界使用 canonical 入口内存观察时刻，不读取旧档案 capturedAt，不混称；high 是当前可见样本与人工时期通过后的候选，不包含跨刷新稳定性声明。
- 人工时期只在 UI 内存比较年龄摘要；后台提供固定数字代次清除过期选择，不收原始身份或时间。代理执行全部自动检查，真实登录语义最后交用户。

- 最终 197 项全量自动测试通过；只把登录后的真实语义验收交用户。检查点命名 checkpoint-source-time-semantics-v0.1.3.3；ZIP 在提交后逐文件核对，不推送远端。详见 TEST_RESULTS.md。

## v0.1.3.2 实施决定

- 从 da27e83 恢复，跟踪文件无未提交改动；本地未跟踪目录 outputs/Personal-AI-Input-Archive /（名字末尾含空格）保留，不读取、不打包、不覆盖。
- 新指纹分支在 other 的原 URL 形态拒绝前执行，只接受诊断资格，结果通过独立字段传递，绝不进入原 parse/Model.ingest。原 response-parser 文件保持不变。
- 分组只使用白名单结构；原始用户 ID/明确会话 identity 仅在文档内存匹配，时间只输出可解析计数。结构深度窗口和资源截断分别标注，不能冒称扫描完整 JSON。
- 单标签资格不因第二个已知文档心跳超时而自动恢复；标签关闭/退出撤销。初始化尚未知的早期响应宁可漏诊断，不补请求。
- 全量 181 项测试通过；真实 ChatGPT 指纹仍待用户反馈，不宣称发现历史发送时间。

## v0.1.3.2：other JSON 结构指纹诊断

用户真实结果：观察 118 个响应；旧聊天类 0，发送类 1（ROOT_NOT_OBJECT），other 117（含 URL_SHAPE_NOT_ALLOWED 的同源合格 JSON）。这不能证明旧聊天没有历史元数据。本轮仅对已授权、后台确认单个活跃普通聊天、同源/HTTP 合格/无重定向/明确 JSON 类型的 other 响应增加独立诊断。URL 查询参数不再阻止此诊断分支，但不改变正式会话响应的接受条件。

副本读取最多 512 KiB、5 秒，最多一个指纹读取任务；结构深度 <=4、对象节点 <=1000、每节点键 <=64、候选消息 <=200。只输出固定字段的布尔/计数、根类型、集合尺寸/深度；不输出任意原始键或值。最多 12 个内存指纹组，超限明确计数；截断时不能确认历史候选。只有明确集合中多个消息具备 role/ID/create_time 结构才标 historical_conversation_schema_candidate；其用户 ID 与明确的同一会话 identity 仅在文档内存用于 canonical 精确匹配，绝不加入原 response metadata 接受集合或写入记录。

刷新、切换、暂停或失去单标签诊断资格即清空指纹与临时匹配身份。不新增请求/XHR/权限，不读凭证/请求头；沿用现有响应 content-type/长度的内存分类和字节计数，不保留头值。真实结果仍待用户 Chrome 反馈。

## v0.1.3.1 交付决定

- 只新增诊断探测，原 user()/parse() 接受函数逐字保持；探测不会向匹配提供被拒绝响应的部分 metadata。
- 顶层 observed 响应计数先发，最终固定阶段摘要后发；origin/endpoint/HTTP/content-type 只分类，不存原值。A/B/other 分组保存，避免发送响应掩盖历史加载场景。
- 新诊断使用现有内存中继，不接 ArchiveStore。控件此前真实启动成功，保留启动逻辑；不将“未开始”归因于 schema。
- 全量 172 项测试通过；检查点与 ZIP 在审查后生成，真实新摘要待用户反馈。

## v0.1.3.1：响应结构拒绝诊断（当前阶段）

用户真实反馈 canonical=2、response metadata=0、匹配=0、接受=0、结构拒绝=1、超限=0。只能说明候选响应处理失败，尚不能确定是 content-type、clone、JSON 或 schema 阶段，也不能否定历史时间方案。

本轮只增强安全诊断，响应 endpoint/格式/字段接受规则与 v0.1.3 保持一致；不支持未知 SSE/RSC 结构。按 conversation_load_candidate、message_send_or_stream_candidate、other 分开计数并保留各类最后一条安全摘要。阶段分别报告是否尝试、是否通过；未执行不伪称失败。仅已通过原 URL/状态/类型门禁的副本才解析；拒绝后的探测只检查原有明确字段路径、最多 2000 项，不遍历未知 JSON 或读取正文。

旧聊天恢复是主要目标；发送响应没有完整元数据只表示该样本无可用来源。firstObservedAt 仍仅为近似观察语义，本轮不新增记录字段或近似时间存储。版本 0.1.3.1 diagnostic，保持 canonical、正式记录、时间线、权限与网络边界。

受控按钮独立检查：未点击的“未开始”属正常。若发现传递失败，单独记录并验证，不能通过放松响应 schema 修复。用户已确认点击后曾显示“已开始”；本轮保留控制链路，并用既有按钮集成测试再次验证。

## v0.1.3 实施与验证决策

- 使用 MAIN 专属解析文件，避免同一共享脚本在不同 world 声明时，本次合成 Chrome 实测出现 MAIN 全局未初始化。原 canonical 适配器只改版本号。
- 响应记录只留 MAIN/ISOLATED 有界内存，后台仅留安全摘要及路由令牌，不进入 ArchiveStore。独立诊断页只允许 RESPONSE_VIEW/RESPONSE_ARM，不能读取档案。
- 发送类路径支持有限的完整消息 JSON/SSE envelope，不接受猜测式增量合并；未知 schema 或超限整次样本丢弃。
- 首轮集成失败修复后最终 168 项全量测试通过。真实用户手工验证仍待执行；跨刷新逐 ID 时间不保存基线，因此 unknown。

## v0.1.3 response-time diagnostic PoC（本轮范围）

保留 v0.1.2 canonical DOM 捕获、去重、记录和时间线；不写 sourceSentAt 或修改 capturedAt。新诊断仅内存：MAIN 在 document_start 包装原 fetch，原参数/Promise/Response 保持，不新增调用，不读请求体、凭证或请求头。只旁路解析严格路径及结构白名单的有限响应；整包解析可能短暂接触 assistant 字节，但不提取、传递、保存其正文。授权前/暂停/临时聊天不解析；切换、刷新清空映射。

仅 conversation identity + exact message ID 与已通过 canonical 检查的用户消息匹配。单独诊断页只呈现白名单计数、粗粒度年龄、精度和受控差值；不读档案记录。受控按钮以当前 canonical ID 为基线，仅统计之后出现且来自按钮后开始的发送响应的候选；无法证明真实新发送时标为候选，不能将旧消息初次出现冒称发送。所有判断尚待真实 Chrome 验证。

严格区分观测与结论：刷新销毁 ID/时间映射，因此仅对比刷新前后计数/年龄不能证明逐 ID 时间稳定；该验收项保持未验证，不暗存时间指纹。timeSourceCandidate=chatgpt_response_create_time；high 为后续验收通过才可采用的候选可信度，本 PoC 不自动授予。无原始时间值跨刷新持久化。

# 工程决策与恢复记录

## 原始发送时间：先调查，运行行为保持 v0.1.2

- 历史补录是明确产品要求。sourceSentAt 与 capturedAt 必须分开；未知历史发送时间保持 null/unknown，不以首次观察或保存时间冒充。
- 当前代码只有 capturedAt/pageOrder，主时间线使用捕获时间，尚不符合新要求。本轮只记录待实现要求与候选模型，不迁移数据、重构时间线或加入导入功能。
- 浏览器能力检查仅发现内置浏览器连接，未取得用户桌面 Chrome 的 DOM 访问；未读取真实页面。时间元数据数量为未采样/未知，不能报告 0 或不存在。
- 完整调查状态、受限属性诊断规范、可靠性判据、模型与排序建议见 TIME_METADATA_INVESTIGATION.md。下一步需要真实 Chrome 的安全结构摘要，现有 v0.1.2 摘要并不含时间字段。

## 2026-09-05：v0.1.2 仅解除旧 turn 前置条件

- 从 `6770eee` 开始；跟踪文件无改动，存在用户新解压的未跟踪 `outputs/Personal-AI-Input-Archive/`，保留且不纳入提交或 ZIP。只记录用户提供的计数，不复制其截图或真实页面内容到项目。
- 用户反馈确认可见 user role 与自身合法 ID 均为 3，旧 turn 为 0。本次仅接受 role 自身的原格式 ID 为锚点；正文选择器、editor 控件类型与安全过滤、去重持久化代码不变，不采纳祖先/后代 ID。
- 缺少旧 turn 时 editor 范围使用已确认 role；存在旧 turn 时保留旧范围。诊断 UI 按范围标注，保留 schema 字段，避免把 role 子树计数错误称为 turn 内计数。
- v0.1.1 的 editor=0 是 turn 耦合造成的必然结果：结构探测已运行，但 turn 内控件查询未执行，editorPassed 又被 turn=false 强制置 false；不能断言实际编辑状态失败。
- 版本升至 0.1.2，全量自动测试后建立 `checkpoint-diagnostics-v0.1.2`，再生成新版 ZIP。真实捕获效果由用户手工验证，不宣称已通过。

## 2026-09-05：从本地未提交的结构诊断实现恢复

- 恢复开始时分支为 `main`，HEAD 为 `ddad81fd1386daf8ce59f9bbad0067d572ff67c1`。仓库只有 4 个提交：`ddad81f`、`00470d0`、`cb0bcec`、`25ee863`。当时没有 DECISIONS.md，Git 历史也未找到此文件；本文件是本次新增记录，不是找回的旧决策。
- 先读取约束与产品/隐私/测试/交付文档，逐项审查全部未提交 diff 和新增文件。原有 17 个已跟踪修改文件、7 个新增文件全部保留；未执行 reset、checkout、restore 或删除现有修改。
- 第一版功能及其合成测试已存在。`ddad81f` 已提交结构诊断阶段文档；适配器细分计数、共享白名单、发送/后台/UI 链路、v0.1.1 版本号和回归测试已在工作区实现，尚未提交。恢复工作沿用这些实现。
- 用户报告的真实情况：扩展可加载、主动同意后已启用，普通消息仍为 0 条，显示 ADAPTER_MISMATCH。真实 DOM 根因未知；不把合成页面通过当作修复证据，不猜测或放宽选择器。
- 本次范围是完成诊断审查、相关自动检查、必要的诊断链路修正、文档和安装 ZIP。保持 storage 单一 API 权限、无扩展网络请求、无键盘监听、不读整页正文、不收 AI 回复及 fail-closed。
- 检查结果见 TEST_RESULTS.md；真实反馈所需数字与更新步骤见 README.md。完成后建立本地 `checkpoint-diagnostics-v0.1.1` 检查点，不推送远端；ZIP 不加入 Git。

## 兼容性采样决策

按用户最新指令停止真实QA登录策略，改为一次正常Chrome脱敏采样、离线Golden回放。保留未完成QA文件但停用运行入口，保留其profile且不读取/删除。SourceTimeResolver不改。开发manifest构建时注入采样/受控metadata buffer及安全自检后台分支；正式manifest与正式provider不增加这些能力。公共schema未知键fail closed；不能以匿名化任意键来伪称保留了真实结构。真实样本尚未收到。

## 当前真实 Chrome 调试（取代独立采样验收）

用户授权通过电脑控制现有已登录 Chrome 自行验证、重载并迭代；不再要求 sampler/QA 登录或人工 smoke。2026-09-06 实测：旧聊天历史 fetch 来自 `/backend-api/conversations/{id}`；现有 provider 在读取 540672 字节时触发 other JSON 的 512 KiB 上限，未到 JSON decode。只为同源、当前 conversation exact endpoint 提供 2 MiB 有界读取额度；一般 other JSON 仍为 512 KiB，身份/结构/time contract不放宽，不增加请求/权限。临时探针仅输出计数和时间/已有内容哈希，不导出正文或整个档案对象；完成后去除。真实旧聊天现有 3 条 canonical 用户记录已恢复 2026-08-30 历史时间（high）；刷新、离开后再次打开均保留原 5 份记录/快照，capturedAt 与已有内容哈希一致。另 2 份不同 identity 的旧快照继续 unknown。临时探针已移除。
