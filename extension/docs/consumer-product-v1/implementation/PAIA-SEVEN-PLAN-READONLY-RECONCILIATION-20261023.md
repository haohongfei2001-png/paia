# PAIA 七条当前计划：只读复核及集中决策草案

日期：2026-10-23（Asia/Shanghai）。本报告核对的集成源码为 `82d6a4f108db3b2ec2051fc3ea38c4ffafde975c`，实际最新运行时冻结为 `872e23b00e141f9f2d0a192d763ae91e9ba3e171`。这是源码、当前权威文档与既有证据的只读复核，不是新的测试结果、最终产品验收或外部执行授权。

报告在独立 Saved 工作树 `codex/saved-mixed-incremental-20261023` / `70916271` 上记录；两处既有未提交 `group-checkpoint-plan.js` / `group-checkpoint.js` 保留。未修改集成工作树、当前队列、历史报告、运行时、测试、版本、CI 或其他项目。报告写入前按文件名与任务相关文档清单确认没有同名中断报告。

## 1. 当前依据及冲突处理

直接用户指令已把整个 PAIA 当前计划交由本聊天统一推进，dot 不再是审批或调度依赖。用户明确解除新增 Sync 的暂停，仅限本地实现与合成验证。普通本地工程继续执行；已耗云额度、真实账户/用户数据、凭据、付费调用、安全设置、安装部署和不可恢复操作没有因此获得新增授权。

当前入口是 [STATUS](../STATUS.md)、[总队列](PAIA-TAKEOVER-QUEUE-20261023.md)、[验收矩阵](PAIA-ACCEPTANCE-MATRIX-20261023.md)，配合 [AUTHORITY](../AUTHORITY.md)、[MASTER](../MASTER_PLAN.md) 与各计划明确保留的完整前版。短版视觉修订只覆盖其明确冲突，不能删掉数据一致性、恢复、人工意图、隐私及验收要求。

- Thought / Context / Archive 采用 YEAR-HARMONY、各自当前 1.7 / 1.7 / 1.8；Settings 为 SET2-UI-1.4；Prompt 为 PAIA-FLOAT-UI-1.3 / R3。旧 B / R1 / R2、全年度默认展开、退役 Reader / Thought / Context 搜索、New Topic 等不是新待办。
- MASTER、AGENTS、AI_USAGE_PLAN 开头保留的历史“Sync 暂停”“NO_RUNTIME”与旧 main / PR / 下一步，不能覆盖最新用户授权、当前 STATUS 与后来真实消费者。
- 总队列 §4.1 明确是接管初期历史缺口。§4.2 及若干旧报告的 remaining 也要逐项与后续实际消费者对账，不把 dated prose 当当前源码事实。
- PRD03–06、CPR03 已纳入当前产品计划；ANS01–09 是已有结果，没有新 ANS10 或第八条产品计划。本次不涉及 VAIWL 或其他项目。

## 2. 七条计划的真实入口、剩余工程和验收

以下“已有”指可定位的消费路径及其各自历史证据，不是仅凭文件存在宣告全阶段完成。本次没有执行表内测试。

| 当前计划 | 已有真实入口 / 消费者及证据 | 当前本地工程剩余；不要重复的工作 | 仍须分账的验收 / 外部条件 |
|---|---|---|---|
| [TOPIC01–06 / 05.1–05.8](../TOPIC_ARCHITECTURE_PLAN.md) | 原 Topic / Section 阅读、原编辑、人工组织与恢复；`ui/thoughts.js`、`ui/topic-year-requalification.js`。`core/topic-lifecycle-dispatch.js` 的私有 Maintenance 选择→原 `TopicProcessingAuthority`→原 lifecycle consumer/writer 是实际本地路径；[生命周期与 Context 组合](../../../../work/takeover-composed-native-20261023/REPORT.md) 保留其 18 个原 case 的 Source/Release 结果。原 authored / bound / structural / multi / mixed 与 Topic reconciliation 后继已接入。 | 没有新确认的、独立于已记录后继的非 Sync UI 缺口。不能重新开发年度 Reader、candidate / promotion 或已接通的人工字段路径。独立源端 Topic identity issuer、真实 prepared-handle 的资格链与默认触发/窗口/重启策略仍需分别闭合；dispatcher 合成 receipt 不等于已有真实 issuer。 | 最终源/包组合、人工 keep/pin/never-recreate、视觉/键盘/真实用法与模型质量。身份授权及默认调度语义不能由 field grant 或 fixture 推导。 |
| [CTX4-01–07](../AI_CONTEXT_CARDS_V2_PLAN.md) | 原四卡、详情、访问选择、合格全量读及连接状态继续消费原 owner。`core/ai-usage/local-maintenance-session.js` 实际调用 `context-correction.js`、authored/bound/structural mappings；`maintenance-batch.js` 使用其资格集合决定各 facet。组合证据包含 43 个 mixed + 51 个 compound 原 case / 每个 Source/Release，见上述组合报告。 | 先前“authored/bound/structural/multi/mixed 一概未实现”已过期。source-free manual Context 尚无原语义等价证明与允许自动 ACK 的合同：保持有理由的 DEFER，不能以全部人工保护、CRUD 成功或没有 provider 来伪造成功。无证据不另开重复 UI 工作。跨来源额外读取不能从已有字段范围自动扩展。 | 原 22 类状态、完整读/续读/撤销/重连、视图与缩放以及真实外部 Context 客户端/身份/传输。实际连接尚未通过时保持 truthful unavailable。 |
| [SET2-01–05](../SETTINGS_CONSUMER_V2_PLAN.md) | 22 项实际操作的可达清单在验收矩阵。Sync 是其中 Data 行（表内第 13 行），不是“第 22 行缺失”：`ui/settings-details.js` 调用 `mountSettingsSync`，由 `ui/settings-sync.js` 挂载真实不可用状态；原 Settings / Import / Backup / typed removed / history / About owner 保留。Settings Sync 专项 Source/Release 2/2 已记录；[独立后段](../../../../work/settings-independent-20261023/REPORT.md) 2/2 覆盖目录/history/focus、跨控件、About、离线样式。 | 不重写 Sync 行或原恢复 UI，不制造 enable/login/recovery 假成功。provider-backed Sync 的实际恢复尚未完成，应在 Sync owner 中收口，不当成第二套 Settings 数据实现。没有新确认的其他独立本地 Settings 缺口。 | [完整 Settings 历史 4/6](../../../../work/takeover-ui-milestone-20261023/REPORT.md) 的两处 pinned headed-touch 资格失败保留；后段 2/2 不能拼成 6/6。真实 touch、物理 IME/屏幕阅读器、安装更新和最终视觉另账。 |
| [AI-COST01–07](../AI_USAGE_PLAN.md) | 原 Delta/Job/Receipt、service/UNKNOWN、Filter、Assist、Organize Current、人工保护和 ACK/CAS 路径保留。`local-maintenance-session.js` constructor 的原 Foundation committers 实际消费 authored/placement/structural/context-edit 资格；不是无调用 helper。原四个服务-native 根已在验收矩阵明确独立入口及历史 30 leaves，不能继续声称没有入口，也不能当最新全部源码的 real SQL/model 结果。 | 有限人工语义映射的旧总缺口由新消费者逐项覆盖。没有新确认的独立非 Sync 映射需要立即重做。继续处理真实集成反例；manual DEFER 不得 blanket ACK；真实身份/entitlement/profile/tokenizer 和安装配置不能用本地 tier 标记伪造。 | 金融 unknown/replay/refund、真实 SQL、真实模型质量/费用、真实账户/签名权限、服务部署分别验收。默认 null / default-deny 是边界，不是可绕过的故障。 |
| [Prompt / NIB S0–S4](../NARROW_INPUT_BOARD_V4_PLAN.md) | `content/prompt-surface.js`→`background/prompt-surface.js`→`ui/prompt-surface.js` 的原私有 frame 与 receiver；R3 三态原生 2/2 是有限证据。`ui/prompt-surface.js` 实际有 representative / split 选择、保存、过期拒绝及工具入口；`core/prompt-family.js` 消费 splits / representative，并非 Family 纠正整体缺失。 | 不重做 R3 连接研究、Family 纠正、原 archive search、插入/undo/no-send。真实差异出现时在原 owner 修。remote Stage3B 不因自动本地推进而新增。 | 当前真实网站兼容、真实 IME、动画/120Hz/50ms、当前设计图逐项视觉与源/包一致性，不能由固定三态两 case 或旧原型证明。没有未经授权的真实回复读取/发送。 |
| [ARCHIVE-HOME01–06 / IAH1.8](../INPUT_ARCHIVE_HOME_PLAN.md) | `ui/archive.js` 实际调用 `requalifyArchiveYear` 和 `installArchiveArrival`，通过原 GET_PAGE / SEARCH_INPUTS、Reader state/editor/session 与导航恢复消费年度、精确目标、空根和编辑返回；`archive-year-requalification.js` 逐项核原 Input/revision/日期/邻接边界。已有 Archive / year / arrival / Source/Working tests 是原 owning 路径。 | 年度、根、目标和编辑返回不是整体缺失。Browser2 子进程已正常退出，不能继续开发“收尾子进程挂住”假设；对象构造耗时子集不是主因。容量和真实规模证明待整合，原 scale / 原数据量 / 断言不删。 | 原文完整 copy、日期不变、source切换/filter/purge/recovery、真实源与Linux容量。100k 本地已耗播种证明不是 Linux 提升；已有只读分析不需要再跑同样大 seed。 |
| [SYNC01–06](../BROWSER_NATIVE_SYNC_PLAN.md) | 原 local coordinator、Core、当前 mixed exporter、原 Source/Working/Human/Saved/Formation/purge owners、非空增量、同批 Human+Working、Saved非空后继、冷启动 phased continuation、发布后复制清理均有实际消费者。[最新冻结报告](../../../../work/phased-human-integration-20261023/REPORT.md)：115/115完整 Node，669 文件 build，Source/Release8/8 parents；每variant25+34+18+13原 case；零网络。 | **仍有真正工程：**大图在原预算内的端到端恢复、明确被现有消费者拒绝的必要混合族（下节逐项列出）、既有 active-generation 替换与完整负向事实继承、实际 application database 切换；逐项确认 current compiler / owner 消费边界后实施。发布前副本消费仅为优化候选，不是独立强制交付物。65/129预算拒绝未解决；发布后清理及少一次读不是容量证明。SYNC01不是完成；默认生产 Sync off 符合本地合成范围。 | 真实Chrome/Edge/Safari账户/provider、最小scope、跨设备及平台恢复、最终完整一致性/视觉/性能/Full和实际启用。OAuth/云scope/真实数据不能由本地注入适配器替代。 |

上表 Sync 的阶段名称为 **SYNC01**；整个计划仍为 PARTIAL / NOT_ACCEPTED。静态复核未确认新的独立非 Sync 功能缺口，只表示不应重复已经实现的消费者，不证明所有非 Sync 计划已经验收。

## 3. 必须保留的工程风险与证据边界

1. `CANONICAL-HUMAN-FROZEN-COVERAGE-DESIGN-20261023.md` 仍是设计：每页过去通过，不代表 publication 线性化时全部行正确。裸 IndexedDB 可发生不增加 repository revision 的晚修改；简单缓存/版本证书不得代替原最终完整行及计数封口。如何在预算内完成是工程，不是要求用户放宽安全性的借口。
2. 最新 115/115 和 native8/8 绑定 `872e23b0`。先前 65 组成功因 semantic closure 缺口被撤销，修正后 65/129 拒绝仍保留；没有重跑或扩大预算。本次报告不合成一条无限容量成功。
3. 原 PR313 `02144bcc` / Full39860568299 失败、PR312两次Full、Browser2诊断39878678889及原规模seed机会已耗。82测试与尾审通过、14子进程正常退出，与整个job取消可同时成立；平台取消原因 UNKNOWN。
4. 原报告中老 main hash 是各自时间点事实。集成报告记载 `f2b8db27` 官网28路径经正常merge保留；本次没有新增远端API核对，不把本地记录宣称为刚确认的最新远端 main。Root在最终整合前重新读取，保留后续官网成果。
5. 旧总队列 §4.2、“仍缺 Source purge / mixed export / multi Saved / cold continuation”的旧 report remaining 已由后继限定范围覆盖；其旧失败和其他未覆盖 family 仍保留。不能重写历史，也不能把新有限绿扩大到整个产品。

## 4. 一次性后续决策草案（尚未执行）

这些是需要越出现有边界的项目；**不是**普通修复、测试准备、原 owner 接线和合成验证的逐项审批表。先完成不依赖它们的工程、冻结可审查候选，再由 root 汇总必要选项一次性提交。以下所有默认值均为“不执行外部动作”。

| 决策项 | 必要条件 / 精确范围 | 预算、停止条件和默认行为 |
|---|---|---|
| 独立 Topic identity issuer | 用户已收到的[独立源端 issuer 提案](TOPIC-IDENTITY-SOURCE-ISSUER-PROPOSAL-20261023.md) 尚无答复；仅拟允许原 private selection 的 Topic身份/revision/lifecycle/locks、已映射Input/Source及restore/grant事实。不得读body/note/title/history，不扩展原 field issuer，不安装 scheduler，不接账号/model。结构/placement/bound prepared-handle源端缺口单独说明，不能伪装成已有。 | 本地合成 implementation + owning Node +下一个有意义的 native milestone；共用原4096refs/2MiB/30s，现有至多20Inputs/8Topics请求界限，不每callback重置。拒绝旧/复制cap、错scope、撤销/迟到、预算耗尽；默认issuer空。不要重复逐函数询问。 |
| 新一轮云 Full /容量配置 | 等真正集成冻结，列exact SHA/workflow和所有真实job。现有证据可支持讨论仅 current-browser 18→24分钟、保留10片/并发1/原数据断言/冷字体/尾审/所有gates；或在有完整目标片容量证据后搬完整文件。两者不是已批准实现或必然成功。 | 若采用24分钟，browser上限240 runner-min，相较原180增加60；其他jobs逐项另加，账单金额UNKNOWN不杜撰。每命名workflow一次，candidate与后续exact-main分别分配；不得自动retry、重复大seed、删支重建或换PR变相Full。失败/取消保存后停止远端，继续本地修复。 |
| Settings touch 环境匹配 | 当前既有helper要求headed touch Chromium155.0.8059.39与指定诊断archivehash；本地156/headless不满足。先确认其原证据资格仍是当前合同，选择一个可提供相符条件的隔离环境；不得删assert或改launcher/security伪绿。 | 一个批次合并Source/Release实际touch及独立后续必要项目；现有完整Settings4/6与补充2/2保留。外部环境成本/最长job需在选定后填写，未定即0执行。若只能抢占可见浏览器或需要下载旧browser，集中列明后取得授权；不静默启动。 |
| 真实provider / 模型 / 账户 / Context客户端 | 先给服务、endpoint、principal/audience/tenant、独立scope、合格profile/tokenizer/template、模型版本、合成数据与日志脱敏策略；真实SQL、AI模型、Sync账户和外部Context各自有不同资格。不能一次“允许测试”涵盖全部。 | 默认0付费调用/0真实用户记录/0凭据获取。提交前需给精确请求数、每次/总tokens与用户可批准的货币硬上限、账户及删除/保留方案；缺一不启动。UNKNOWN不重发，账单或scope异常立即停。可继续本地fake transport/原ledger一致性验证。 |
| 安装、启用、部署及正式交付 | 有唯一版本/commit/tree/包hash，所需完整gates、独立数据安全审查、明确未验项目，原路径升级/备份可恢复性/回退限制与使用说明。真实用户profile先备份、核当前版本，不卸载或新建替代数据库。服务部署与本地扩展安装分开。 | 默认0安装/reload/生产部署/main发布。若批准，一次指定包/环境动作，读回实际manifest与生效runtime；copy不算active，部署响应丢失先查receipt，不能重复发布“确认一下”。检测迁移/权限/数据风险立即停，不带风险强行合并。 |

如果用户只允许某个局部外部动作，其余项继续关闭；本地已获准的工程不因此等待。18分钟与10分组不是永久产品设计，但变更仍须用实际资源范围、覆盖不损失及停止条件说明。

## 5. 连续队列建议与完成定义

1. 优先完成当前 Sync 原 owner 的真实剩余恢复链：原预算内大图、已定位的 populated mixed 原 owner 拒绝与已有 active 库替换/实际消费。不得将“发布前副本处理”升级为必须实现的单独子计划。沿一条端到端 A→coldB→原编辑→coldC 的消费者闭合，不把新增一个未消费校验器当里程碑。
2. 并行保留非 Sync 已完成消费者并审查实际集成差额；只对新的源码反例或当前计划明确但未接入的结果开工。manual DEFER 保留，身份issuer等集中决策不冒充普通实现卡点。
3. 每个有意义冻结做完整所属、安全rollback/native源包组合；未改部分按exact依赖复用证据，不为文档或新commit重复build/全套。
4. 最终必须交付可运行包、全部七条计划逐项实现/验收/明确外部缺口、原失败及最终证据、剩余风险和升级/使用/回退方法。局部绿、报告commit或默认关闭的服务不能称“整个产品完成”。

本报告仅静态核对与新增文档；未运行Node、browser、build、APT、云CI、Full、provider/model、安装或部署。没有修改原计划、安全guard、测试断言或历史证据。


## 6. 当日后继：当前 Sync01 必做消费者与明确优先级

本补记静态读取 root `4c0d4d62`。官网 main `9d7200555b315e1d89509f12bf78bf62e16418ae` 经正常 merge `5e6f4f728d286eeabdf626e48d4ee3ac3e6d0ba6` 保留；root 报告23条官网路径逐字节不变，本线核对 merge 双亲，未重跑官网或产品测试。`4c0d4d62` 选择了 `3a5a2ba5` 的实际 synthetic collection 消费者和8/8既有证据；不再将计划旧段“performedDeletion:false”泛称当前没有实际 collection。该有限 fake transport 结果不等于物理远端删除或整个 compaction 合同完成。

[Sync计划](../BROWSER_NATIVE_SYNC_PLAN.md) §3 明确要求独立虚拟安装通过 fake cloud 恢复/合并全部已填充 canonical families；§3.2要求非空B、阶段中本地编辑、失效后旧数据可用、原子激活/恢复、清理后re-export与后续双向编辑，参数实验不推迟到provider阶段。因此以下三类仍是**本地获准工程**。不能因当前 unsupported 就全推迟到真实账户验收，也不能不看真实消费者便将所有 unsupported codec 一次泛化实施。

| 优先工作包 | 确定当前消费者 / 拒绝 | 自主实施的有限闭环与边界 |
|---|---|---|
| 最高：既有 mixed B 的 Saved successor 与 resident AI jobs 共存 | `saved-work-bootstrap.js:403` 的 `prepareSavedMixedRetention` 在421直接拒绝任何 `organizerJobs`。原 `ai-usage/semantic-invalidation.js` 已有真正的 job/usage/domain-result失效 owner；当前拒绝避免漏掉它，但普通使用过AI的B不应永远不能接收合法Saved后继。 | 使用原Saved编辑+原semantic invalidation owner，**写入前**推导所需jobs/usage/meta/receipt变化，再原生终态完整比对。A→非空Source/Human/Saved B（原真实本地Job）→Saved编辑到达→原状态失效/UNKNOWN费用保留→cold B→原编辑→C；错receipt/迟到/callback裸改/超预算全回滚。不得删除Job、重写费用、用后写快照当预期。此为local fake-cloud，不调用模型。先核原失效依赖后决定是否抽取实际owner共用的纯投影；不要建立第二个失效实现。 |
| 随后：Saved mixed 消费者接收真正新 Human groups | `group-checkpoint.js:345` 当前要求incoming仅为单操作`savedWorkSuccessor`；`browser-native-sync-saved-mixed.test.mjs` 的“existing mixed B refuses incoming new Human groups”明确证明现状。通用mixed Human+Working已实现，不能把它重做或当成含Saved的证明。 | 在Saved既存物理/mapping/history/receipt闭包保留前提下，消费原Human计划/写入/协议；拓扑/分配/计数/semantic终态预期在写前完成，B本地Saved与Human/outbox不能丢。源端完整manifest→coldB→新Human→本地Saved编辑→coldC是有限验收。禁止只扩allowlist或跳过Saved闭包；shared coordinator由root统一整合。 |
| 并行：existing-active replacement / application database选择 | `canonical-generation-publication.js` 的原`#sealCheckpoint` 对 `packet.sourceBase.root.active!==null` 拒绝 `GENERATION_EXISTING_SOURCE_OWNER_REQUIRED`，注释正确指出freshness不证明canonical/negative继承。`background/service-worker.js:61` 仍用原默认`IndexedArchiveStore`；已有手工原active binding不等于应用真实选择。 | 先在两个虚拟安装中用原registry/原store factory完成已有active迁移、旧canonical/负向事实/未完成编辑继承，publication中断/并发编辑保留旧可用库，cold新consumer读取/编辑；不直接移除拒绝。**本地可注入应用选择与真实默认worker启用分开**：Sync01要证明真实应用owner消费所选库，不需对真实用户profile打开Sync。root已另派writer，本线不抢文件。 |
| 并行：scale /预算内完整恢复 | 65最终seal及129原owner累计预算拒绝仍在；版本/缓存不能代替完整原行/计数封口。没有可用的已通过完整规模包。 | scale writer处理checkpoint preparation/重复工作与原owner消费，保留4096refs/2MiB/30s和原累计账。发布前副本消费并非计划独立强制要求；最新scale分析报告129在owner前已约12.65MiB，额外消费/冷重验增加累计成本，root已决定不为final表面变小实现该复杂支线。此数字为scale writer报告，本线未重测。先做有实际降低工作的工程，再按冻结差额选择必要测量；不重复已耗100k播种或云Full。 |

分工建议：本线以独立树所有 `saved-work-bootstrap.js` 保留证明及必要的原 `semantic-invalidation.js` 共用投影、独立所属测试；不改 Saved旧树两处shared patch。root统一coordinator及原生桥；另两线分别active replacement和scale。权限、scope和预算不扩展时这些工作无需新的逐步批准。若确认某普通状态目前没有原写入/映射合同，先提供具体欠缺和合理实现包，而非把整类一律留作外部验收。
