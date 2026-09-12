## v0.11.1 reading closure

See [READING_CLOSURE.md](READING_CLOSURE.md) for the reading contract, reproduced root cause and acceptance evidence. Current version is 0.11.1. Earlier version sections below are historical; this contract takes precedence. No new network or Provider capability.

# v0.11.0 — selected behavior

Production uses the same lexical relevance ordering with invocation-local query preparation. No embedding/model/vector store or new API path. Low coverage and incomplete scans are explained in Preview; unknown queries remain empty. See INTELLIGENCE.md for benchmark evidence, rejected alternatives, reproduction and limits. Tests run headless via PAIA_HEADLESS=1; historical test names/receipt fields saying visibleChrome do not override this run mode.

# v0.11.0 Intelligence evaluation

See INTELLIGENCE.md for the frozen benchmark, decision gates and evaluation scope. No private benchmark data, paid requests or automatic AI retries. Existing storage and authorization contracts remain unchanged.

# v0.10.1 AI Context Quality

本轮契约见 [AI_CONTEXT.md](AI_CONTEXT.md)。所有 Context 检索与分享准备均为本地零 API；新外部总开关不影响备份与授权保留。验证：固定 60 Topic / 1200 Entry / 240 query baseline 对比、currentness/去重/预算、权限/迁移/备份、many/deep 分布、合成 Chrome journeys 与完整回归。

# v0.10.0 AI Memory MVP

当前版本为 v0.10.0 AI Memory MVP：在 AI Memory 授权 Topic，按任务本地生成可预览上下文，再显式复制/导出。默认未授权，不需 DeepSeek Key，生成预览零 API。数据/隐私契约见 [AI_MEMORY.md](AI_MEMORY.md)；验收与部署见 [V0100_ACCEPTANCE.md](V0100_ACCEPTANCE.md)。下方 v0.9.x 及更早章节保留历史信息；当前行为以本节和 AI_MEMORY.md 为准。

# PAIA v0.9.2 — Product Hardening & Quality

当前行为以本节及 [V092_ACCEPTANCE.md](V092_ACCEPTANCE.md) 为准，下方版本章节保留为历史记录。

- Input、Thought、AI 字段在导航前保存；页面隐藏/离开时尽早 flush。AI 字段支持会话撤销/重做、持续输入最长 3 秒提交，以及保存回包丢失后的幂等重试。并发冲突保留草稿，由用户明确选择重读；独立内容弹窗内可直接重试本地保存或重读，取消时不会丢弃草稿。
- 搜索支持输入去抖、匹配高亮、方向键/Enter 和 Cmd/Ctrl+F。按精确标题、部分标题、正文、已保存 AI整理分层；正文同一有界结果页内按新近时间排序。AI 搜索每主题最多一个结果；不调用模型。
- 所有非首页均有返回入口或可关闭的弹窗。Settings、阅读和 Thought 首页采用统一轻量状态与焦点样式；菜单可直接点击，删除内容可撤销，删除主题保留正文与 Source。
- Settings 中整理诊断只在展开高级区或主动整理时读取，默认不扫描整库。额度与重试提示跟随主动操作，连续/批量整理仍以明确上限开始、错误即停止。
- “高级数据诊断 → 检查数据完整性”只读检查 7 类引用关系，分段显示进度、可停止，返回聚合数量；不自动修复、不导出正文或 ID。
- 备份仍为带版本和完整性校验的 PAIA 格式。大库分段导出；本版单次恢复仍限空库、64 MB / 100000 项，Source、Input、版本等各算一项。超范围导出会明确提示保留原库，不能把这类文件视为本版可恢复备份。

v0.9.2 不改变物理 IndexedDB schema 5、逻辑 schema 6、Source/Topic identity、捕获与导入语义。API Key 仅留当前 Chrome 会话，未新增后台 AI、自动重试或遥测。这里的验证全部使用隔离 Chrome 和合成数据；未读取私人数据库或真实 Key，未调用真实模型。

部署使用原日常 unpacked 路径的 release 构建，保留同一扩展身份。完成部署后只需在 Chrome 扩展管理页对原扩展点一次重新加载，不要卸载或另装。

# PAIA v0.9.1 — UX & Reliability

本轮在 v0.9.0 上整理日常界面，保持既有数据、导入与备份兼容。当前行为以本节为准；下方版本章节为历史记录。

- Settings 的 AI 区默认显示 Key、处理条数、每日上限与使用说明；高级设置与诊断默认折叠。保存 Key 不调用 API。
- Thought Library 首页依次为标题与 AI 开关、搜索、写下内容/新建主题、主题 Tabs。合并建议带数量按需出现；AI 更新与批量更新只在有待更新内容时出现。
- 额度、失败和重试提示只跟随你刚触发的动作。受限时给出重置时间或调整上限入口；不会自动发起请求或重试。
- Input Archive 与 Thought Library 原话阅读分别记住正序/倒序。Input 跨页按同一排序读取，切换前先保存编辑。AI 综合阅读保留语义章节顺序。
- 文档、主题和独立内容阅读保留显式版本历史。章节和单条内容的历史属于各自对象，仍在各自操作菜单中。
- Settings / 历史补全中的“待确认与已移除输入”可返回原入口。待确认输入可归入已有整理文档、保留为独立文档、忽略或暂不处理；完成后直接打开对应文档。调整整理归属不会改变原始聊天、Source 身份、正文或时间。
- 待确认输出建议说明其用途，接受后可查看对应内容，并可返回思想库。

本次仅部署扩展文件到原日常 unpacked 路径；不读取私人库、不卸载或新建扩展。需要在现有扩展上点一次 Reload 才激活新代码。验收与证据见 [V091_ACCEPTANCE.md](V091_ACCEPTANCE.md) 和 [TEST_RESULTS.md](TEST_RESULTS.md)。

# PAIA v0.9.0 — History Completion & First-run Onboarding

当前行为以本节和 PRODUCT_SPEC.md 的 v0.9.0 契约为准；下方旧版本章节保留为历史记录。测试结果与验收边界见 [TEST_RESULTS.md](TEST_RESULTS.md)。

保存、整理并重新阅读你在 AI 中表达过的信息和想法。新安装通过轻量引导了解 Input Archive、Thought Library 与本机优先；可选择补全历史或稍后再说，无需 API Key。已有用户不被重新引导打断。

“补全历史输入”接受你主动选择的 ChatGPT 导出 ZIP/JSON，在本机检查、预览，再由你确认写入。未知结构不提交。暂停/关闭后重新选择同一文件继续，取消保留已完成部分。导入不会调用 DeepSeek；思想库更新仍须另行明确点击。实现契约见 HISTORY_COMPLETION.md，起点审计见 V090_GAP_AUDIT.md；真实官方 ZIP 与合成验收分别标记。

# PAIA v0.8.1 — Daily Use, Reading Experience & Reliability

本轮从冻结的 v0.8.0 `b1708bd` 独立开发。当前行为以本节、PRODUCT_SPEC.md 的 v0.8.1 契约与 [BACKUP.md](BACKUP.md) 为准；下方旧版本章节保留作历史记录。差距审计见 [V081_GAP_AUDIT.md](V081_GAP_AUDIT.md)，最终证据与边界见 [V081_ACCEPTANCE.md](V081_ACCEPTANCE.md)。

Thought Library 保留 3/2/1 列主题首页。默认摘要选取有代表性的原话，优先人工维护内容；阅读页按章节组织，支持章节内时间正序/倒序、弱日期、章节目录、主题内本地搜索和直接编辑。排序与 AI 显示偏好在本机记忆，切换视图不调用 API。

普通“更新思想库”或“更新 AI整理”仍最多一次请求，无自动重试。“连续整理”须再次明确选择 1/3/5 次请求和最多 50 条 Input；AI 批量更新最多 3 个不同主题/3 次请求。任何错误、部分成功、停止、授权页面关闭或后台重启都停止后续请求，不自动续跑。两种整理共用默认 20 次额度，范围 1–200；沿用 24 小时计费保护窗口，Settings 显示下次重置时间。

Settings 的“数据备份”在本机创建正式 PAIA Backup 文件，不含 API Key。恢复必须经过校验、预览和明确确认；首版支持最多 64 MB 的空库恢复，保留人工工作、来源关系、重要版本和删除标记。现有工作不被覆盖。主题 ··· 可置顶、重命名、选择保留主题后合并、仅删除容器、导出 Markdown；已删除主题在 Settings 恢复，独立正文始终保留。

AI 提示与结构验证已通过确定性测试；真实 DeepSeek 返回质量和历史 INVALID_SCHEMA 原响应仍缺少真实 Key/样本，不能声称实时云端验证完成。所有 Chrome 验收使用临时隔离实例及人工合成内容，未访问日常私人数据库。

内部文件部署后，请在 Chrome 扩展管理页 Reload **已有的 PAIA 扩展**，随后按原方式使用。不要卸载或加载成另一个实例。API Key 保持当前 Chrome 会话语义；完全退出 Chrome 后需按需重新输入。

# PAIA v0.8.0 — Thought Library Productization

当前实现从冻结 `102160d` 的独立工作区开发。旧版说明在本文件后部保留作为历史记录；行为以本节和 `PRODUCT_SPEC.md` 的 v0.8.0 契约为准。验收与限制见 [TEST_RESULTS.md](TEST_RESULTS.md)。

Thought Library 首页按主题展示，宽/中/窄窗口为 3/2/1 列。默认阅读保留用户原话或经验证的本地 span，章节内优先按发送时间呈现；可直接编辑、自动保存、撤销/重做和查看来源。人工标题、置顶、成员与排序优先。

点击“更新思想库”才调用现有 DeepSeek 分类：推荐最多 20 条，小批最多 5 条，长文本按字节预算缩小。点击“更新 AI整理”才为一个主题生成综合理解；切换 AI整理仅显示本地缓存。AI 依据可回看默认内容并进一步进入 Input Archive，人工编辑的 AI 字段不被后续更新覆盖。

Settings 可保存/清除当前 Chrome 会话的 API Key、选择批次和设置每日请求上限（默认 20，范围 1–200）。两种整理共用预算；已有会话输入数/字节限制仍生效。高级诊断默认折叠。完全退出 Chrome 后可能需要重新输入 Key，保存 Key 不调用 API。

内部包更新后，使用已有扩展的 Reload，再重新打开档案并刷新 ChatGPT 页面。不要卸载扩展或重新加载到另一个目录。来源档案保存在原扩展 IndexedDB，发布包不含任何用户档案。正式服务的最后一次用户 smoke 与隔离合成测试明确区分。

---

# v0.7.2c AI Experience MVP — current authorization

Thought Library now uses Topic blocks and an AI presentation display switch. Only an explicit AI update sends one bounded Topic request; toggle/startup/rerender never send. Source/Input/Original bodies and organization remain unchanged by AI updates. Derived evidence, protected fields, session credentials and cost gates are mandatory. This supersedes earlier no-AI-presentation/dual-tab plans. Full behavior and evidence: [AI Experience MVP](AI_EXPERIENCE_MVP.md).

---


## v0.7.2b Original Organizer completion (2026-09-08)

Current authorization: Simple Original Runner only, at most five eligible Inputs and one DeepSeek Chat Completion per explicit user action. No automatic retry or continuation. Body is local working text or validated UTF-16 slices. Session budgets follow a trusted Chrome session marker; daily budgets persist. Network preflight checks trusted worker, exact granted host and CSP; credentials are omitted from cookie transport and redirects fail closed. Partial valid items commit atomically with provenance, organization, per-input receipts and progress. Unknown errors retain their phase and INTERNAL_RUNTIME_ERROR. No changes to Source/Input/Smart Filter/History Completion business semantics or AI synthesis.

Acceptance: expanded targeted/regression tests, a 20-Chinese-Input/four-batch synthetic chain, isolated Chrome success/failure/partial/retry/worker lifecycle, allowlisted internal/release packages and fixed-directory deployment. Synthetic HTTP fixtures are not evidence of live paid DeepSeek success.

# v0.7.2b Original Organizer

The cost-safe runtime enforces one explicit user action → at most one DeepSeek HTTP request, with zero automatic provider retries. Startup, capture, rerender, timers, and completed batches cannot dispatch Original organization. A request ledger stores only opaque IDs, state, counts, approximate bytes, provider, model, and timestamps. Worker restart after `sent` becomes `outcome_unknown` and never retries automatically. Settings offers Stop, shows that Retry makes another paid request, and keeps the 28-second provider deadline plus 30-second UI watchdog. Production runtime contains no connectivity test or synthetic smoke request.

The rescue runtime uses a direct five-Input Simple Original Runner. It plans from the persisted bootstrap cursor, derives a deterministic batch ID from opaque Input IDs/revisions, checks operation receipts, calls DeepSeek once, validates each item, locally slices the working text, and atomically commits Library data, per-Input terminal receipts, and cursor progress. Legacy Original `organizerJobs` are fenced and ignored; they are no longer an execution prerequisite. Initial Build and later incremental batches advance only through separate explicit user actions in this internal MVP.

DeepSeek is an internal, session-only Original Organizer provider. Before a call, the local Delta Planner selects only active, Smart-Filter-eligible added or changed Input from one conversation after `originalOrganizerCheckpoint`, subject to the existing batch and BudgetPolicy limits. The request carries working text plus only affected Topic/Section candidates; it never reads Source Records, original snapshots, assistant replies, removed Input, tombstoned sources, unrelated conversations, or the full database. The model returns classification and exact spans only. PAIA locally slices `workingText[start:end]` into the Library body, consolidates only exact duplicates' provenance, and preserves user edits. Provider failure leaves Archive and Library unchanged and keeps the delta pending. The only added network scope remains `https://api.deepseek.com/*`; keys are held in trusted-context `chrome.storage.session`, so they survive an MV3 worker restart but are cleared when the browser session ends.

# v0.7.1 Thought Library Dual View & Incremental Update

从冻结 `2517a21` 的独立 worktree 开发。Thought Library 的 Topic、Section、placement、provenance、dependency、Source 和时间证据继续只有一份事实层；顶部默认“原话整理”，以 Input Archive 原文或精确 provenance 引用显示内容。原话更新在本地按增量自动推进，用户编辑保护保持不变。

“AI整理”是同一事实层上的派生只读视图。v0.7.1 只建立独立的 `aiOrganizerCheckpoint`、delta 预览和 provider-neutral hook；production Provider registry 仍为空，因此界面准确显示“AI整理尚未更新”，不会伪造结果。无真实 Provider、API key、网络、权限或日常部署。

# v0.7.0 Thought Library Foundation — CLOSED / FROZEN

M5 集成验收通过。Thought Library data/UI foundation complete；Organizer mechanics complete；deterministic/mock full-chain validation complete；real Organizer intelligence NOT yet connected。最终证据见 `outputs/v070-m5-acceptance.md`。未部署日常 PAIA；不进入 v0.7.0.1。

## v0.7.0 M3 — Organizer Mechanics（本轮授权）

最终验收：664/664 自动测试通过，isolated synthetic Chrome 通过；本地 checkpoint `checkpoint-v0.7.0-m3-organizer-foundation`。

实现契约：[ORGANIZER_MECHANICS.md](ORGANIZER_MECHANICS.md)。验收汇总：[M3 acceptance](outputs/v070-m3-acceptance.md)。

从已批准的 `571869e` 独立开发。仅 provider-neutral Foundation；production Provider registry 保持为空。Fixture/Mock 只在 synthetic 测试包中注入，无真实模型、网络、新权限、日常部署。复用 schema v5 的预留表；InputProjectionGateway 是唯一 Provider 数据出口，LibraryCommitService 是唯一 Organizer 内容提交入口。持久任务、租约 fencing、预算、严格候选验证、ActionPolicy、建议 accept/reject 和最小 Updates drawer 纳入本阶段。完成自动安全/故障/性能检查及隔离 Chrome 验收后建立 M3 checkpoint，不继续真实 Provider 阶段。

# v0.7.0 M2 current work

Manual Library Documents from `7d5df85`; scope, schema reconciliation and acceptance contract: [M2_LIBRARY_DOCUMENTS.md](M2_LIBRARY_DOCUMENTS.md). No real Provider, new permission/network, daily deployment or M3. Source/Input/Smart Filter/import semantics remain protected.

> M1 已完成（557 自动测试通过，0 失败/0 skipped；另有 3 项隔离 Chrome 补测）。M1 实施说明：[M1_DATA_SAFETY.md](M1_DATA_SAFETY.md)。最终验收与已知风险：[报告](outputs/v070-m1-acceptance.md)。以下旧版本记录按其原阶段保留。

# v0.7.0 M1 — Data Safety & Core Model（已完成）

本轮按77176f5和新增M1授权，仅实现安全数据底座及隔离合成验收；不进入M2，不接AI/网络，不部署日常安装。实现与结果以M1报告为准，下面设计/历史不代表本轮已通过。

# v0.7.0 Thought Library Foundation — engineering design only

工程设计见 [THOUGHT_LIBRARY_FOUNDATION.md](THOUGHT_LIBRARY_FOUNDATION.md)，测试计划见 [THOUGHT_LIBRARY_TEST_MATRIX.md](THOUGHT_LIBRARY_TEST_MATRIX.md)。最终设计状态 **GO**：产品决策已收口；v0.7.0完成Foundation + OrganizerProvider/CredentialProvider/BudgetPolicy，Mock/deterministic fixture足以完成全部工程验收；真实Provider安排在v0.7.0.1。设计基于`2b07582`，本轮只提交Markdown设计更新/checkpoint，未编码、迁移真实数据或部署，未宣称功能已实现。以下保留冻结基线及历史实现记录。

---

# v0.6.2 Light Filter Coverage Improvement internal — 2026-09-07

实现与隔离评估完成：508/508 自动测试、2878 静态 guardrails 通过。新整句语法、分层 metadata 门禁、当前/升级前匿名原因统计已实现。固定合成集 2432 例零误过滤，观察覆盖率由 0.78125% 提升至 11.47204%；不是实际档案覆盖率。离线语义原型不合格，未进入 runtime。真实 125 条 uncertain 分布和阅读改善仍未验证，未部署日常环境。详见 outputs/v0.6.2-acceptance.md 与 LIGHT_FILTER_COVERAGE.md。以下为历史记录。

---

# v0.6.1.1 Smart Filter Diagnostics internal — 2026-09-07

独立实现与隔离验收完成：502/502 自动测试和 2875 静态 guardrails 通过。已修复历史漏排队、自动续跑及最近过滤分页边界；Settings 新增非敏感聚合状态与恢复入口。Light 规则与捕获/时间/导入边界不变。未部署到日常安装，未引入模型或 Thought Organizer。完整结果见 outputs/v0.6.1.1-acceptance.md；技术契约见 SMART_FILTER_DIAGNOSTICS.md。以下旧版本内容为历史记录。

---

# v0.6.1 Smart Filter internal — 2026-09-07

独立实现与隔离验收完成：490/490 自动测试通过，2829 静态 guardrails 通过。默认轻度 / 关闭、完整搜索、Settings 恢复、永久人工保护、增量迁移和安全阅读快照已实现。未引入分类模型、网络或新权限，未部署到日常 Chrome。

完整结果、迁移 marker、对抗评测局限和性能见 [v0.6.1 验收报告](outputs/v0.6.1-acceptance.md)，设计与技术边界见 [SMART_FILTER.md](SMART_FILTER.md)。以下旧版本段落为历史记录。

---

# v0.6.0 IA Refactor internal — verified implementation contract

Acceptance complete: 470/470 automated checks and isolated visible Chrome acceptance pass (see TEST_RESULTS.md). Daily installation and user IndexedDB are unchanged. This isolated worktree implements the approved Information Architecture. Primary navigation is Input Archive (default), Thought Library, AI Memory. Existing Library documents and blocks become Input Archive without rewriting source facts or authored fields. Source Records remain immutable to editors and are accessible through a source side panel and Settings > Data. New Thought Library starts empty with “尚未整理思想内容”.

Input is a continuous editable conversation document: weak date separators, small light-gray sending times per input, direct title/body edits, autosave, undo/redo. Empty text remains an active empty block. Only explicit whole-block removal changes membership; a persistent source suppression marker prevents recapture/import revival. Filtering policy is separate and disabled.

Revision policy: retain all revisions within 90 days and at least the latest 20 important revisions per entity. Baseline, removal, restore, significant edit, and future AI update are distinct important revisions. Ordinary input coalesces within 60 seconds. Permanent source purge deletes affected revision payloads and wins over all restore/undo paths. Independently authored content is preserved detached; a source purge is not a purge of all independently authored text.

Thoughts have topic/type categories, input-version dependencies, editable text/title/notes, user protection, freshness and dependency integrity. provenanceType supports input_derived and user_created (empty inputRefs allowed only for the latter at creation). No UI creation, Organizer, filtering, generated classification, Memory access, MCP, network, new permissions, sync provider, or multi-device feature is added.

Migration adds an IA schema marker and auxiliary stores; existing blocks/documents remain the physical Input storage for lossless compatibility. Migration is resumable in batches, adds no permanent raw backup, and initializes baseline revisions. Physical IDB version 3 blocks v0.5.x runtime downgrade. Existing v0.5.1 import stores and schema gates are preserved. Daily installation and its IndexedDB must not be opened or changed for acceptance: use isolated Chrome and synthetic data.

# 当前开发：Official Export History Completion 基础设施

从 86f086b 继续 v0.5.1 产品开发；真实 export schema 仍未验证。已实现不依赖具体 schema 的一键同步 UI、安全读取与事务协调；验证结果和限制见 TEST_RESULTS.md / HISTORY_COMPLETION.md。正式适配器未注册时入口显示“格式尚待验证”，不写入真实文件的档案。日常已安装 v0.5.0 不更新。

Auto History Sync 固定为 technically promising / R&D / unverified for production；7d05696 研究保留为未来第二 provider，本轮不调试、不进入 runtime。Official Export 是本阶段唯一接入的 provider 方向，但本阶段基础设施完成不等于真实导入已交付。用户已确认 PAIA 捕获恢复；历史观察缺失的数据库 before/after 证明仍不补写。

# 86f086b 历史记录：格式准备，未交付

稳定基线为 `3cbd0ee` / `checkpoint-v0.5.0-storage-foundation-verified`。本轮只做“一键同步 → 补全 ChatGPT 历史”，多设备仅未来占位，AI 整理不在范围。先取得当前官方导出格式证据，再实施产品导入；已有 v0.5.0 运行时和安装目录不改动。用户确认尚未取得官方导出包，因此真实 schema 与真实导入验收尚未完成。

官方获取：ChatGPT 个人菜单 → Settings → Data controls → Export data。收到通知后下载 ZIP；处理可能最多 7 天，下载链接通常 24 小时失效。[官方获取说明](https://help.openai.com/en/articles/7260999-how-do-i-export-my-data)。不要把私人 ZIP 上传给代理或提交 Git。后续在本机同意并选择文件，由代理检查脱敏结构并完成机械验收。开发结构检查器不导入、不访问 PAIA 数据库，不是新的产品入口或已完成版本。

完整目标、验收矩阵及格式证据缺口见 [HISTORY_COMPLETION.md](HISTORY_COMPLETION.md)。以下 v0.5.0 为当前已验收版本记录。

# v0.5.0 Storage Foundation — 验收通过

本阶段只升级 IndexedDB 分记录本地存储，保留 v0.4.1 捕获、时间、编辑、排除和删除行为。不开始官方导出导入。升级前保存当前编辑，不卸载扩展。自动迁移期间短暂阻止写入，安全副本恢复与逐字段验证通过后才激活。激活前清理旧私人副本；激活后不支持直接降级原 v0.4.1，代码备份不等于数据回滚。容量不再受原10MiB整份档案限制，但仍取决于浏览器和磁盘，不新增 unlimitedStorage。v0.5.0 自动测试 385/385 通过，真实 Chrome 自助 reload、50 条原文/51 条 Library 内容逐字段迁移和编辑/排除/重扫验收通过。完整边界见 PRODUCT_SPEC.md，实际覆盖见 TEST_RESULTS.md。本阶段已停止，未开始 v0.5.1。

详细验收与性能：[TEST_RESULTS.md](TEST_RESULTS.md)。存储、恢复和降级边界：[PRODUCT_SPEC.md](PRODUCT_SPEC.md)。本地检查点：`checkpoint-v0.5.0-storage-foundation-verified`。

# v0.4.1 internal — 连续文档工作区，真实验收通过

自动测试365/365通过，真实Chrome验收完成；代理已自行重载最终release和internal版本，50条原始记录、6个活跃文档及已有整理/排除状态保留。最终检查点：checkpoint-v0.4.1-internal-real-verified。正式ZIP无开发reload入口，日常开发安装保留自助reload。完整结果见TEST_RESULTS.md。

基线 1c8a81f / checkpoint-before-v0.4.1。三个一级入口固定 Thought Library、AI Memory、Original Archive；Settings 在底部。两层都先按真实聊天窗口列表，再进连续文档。共用 userTitle，originalConversationTitle 独立且不受用户/AI标题覆盖。Library 标题和正文直接编辑并自动保存，当前文档会话 Undo/Redo；保留 source/time 边界，不拖动、重排或合并来源。日期自然分隔，时间小字号低权重，正文无卡片边框和成排操作按钮。Original Archive 原文只读；来源信息、排除与永久忽略仅低频上下文操作。

schema5 迁移保留 raw、原文/时间、所有 Library 编辑/备注/排除、稳定来源墓碑与去重。Settings autoSave=true、permanentSourceIgnore=true、联动删除=false 且本版不可开启；未来联动只能明确整 source 删除触发，普通字符/段落编辑绝不触发永久删除。旧 hidden/trash 仅一次性 Legacy Data Migration 入口，全部处理后消失；不新增隐藏/回收站产品操作。AI Memory 不变，AI规则仅预留。

保持 adapter/content/SourceTimeResolver/2MiB响应预算、capture/enrich/purge 的来源删除算法不变。新增 UI 编辑事务需后台串行、修订冲突保护与写失败保留草稿。原文删除不能被迟到编辑或撤销重新引入。所有自动回归由代理完成，再用现有 internal popup 自助 reload 和真实 Chrome 验收，不交用户机械测试。真实成功前不得正式打包或宣称完成。

使用：从 Thought Library 或 Original Archive 的聊天窗口列表进入文档。Library 标题与正文点击即可输入，自动保存状态在页顶；当前会话可使用撤销/重做快捷键。日期为自然分隔，时间默认弱化，可在 Settings 改为仅日期。右键正文或打开文档操作菜单查看来源信息；Library 整条移除仅排除，Settings 的“已排除内容”可主动恢复。Original Archive 原文只读，永久删除在上下文菜单中二次确认，按稳定来源永久忽略。JSON/Markdown 导出保留在 Original Archive 窗口列表的低频入口。

Settings 中自动保存、永久来源忽略固定开启；联动删除固定关闭且不可启用。没有当前会话之外的版本历史：公开测试前补充轻量修订历史，v0.5 分批/增量/导入式历史补全与后续多设备规划见 ROADMAP.md。

schema5 由后台原子迁移，首次失败不提交半完成数据，再次打开可重试。v0.4.0 的原始记录、Library 整理/备注/排除、去重和墓碑继续保留。旧 hidden/trash 不自动恢复，也不被永久删除；仅一次性兼容入口让用户明确纳入 Library 或继续排除，处理后入口消失。schema5 不能直接用 v0.4.0 运行时打开，代码备份不等于用户数据回滚。

开发安装目录仍为 outputs/Personal-AI-Input-Archive/。internal candidate 保留自助 reload，正式 ZIP 完全排除开发入口。基线 checkpoint-before-v0.4.1 / 1c8a81f 与旧检查点保留；自动测试和真实验收范围见 TEST_RESULTS.md。

以下旧版章节为历史记录；旧版本章节只作历史记录；当前存储架构以 v0.5.0、STORAGE_FOUNDATION.md 和 TEST_RESULTS.md 最新章节为准。

# v0.4.0 internal — 自助 reload 与真实 Chrome 验收通过

保留 9918959 的全部 Thought Library 业务及捕获代码，新增独立 internal candidate 构建。开发 popup 提供 “Reload development extension”，由扩展自身重新从磁盘加载。没有新增网络、权限、后台命令或网页消息入口；正式包的运行资源完全不含开发按钮和脚本。

**无需最后一次人工 reload。** 真实 Chrome 重新打开 popup 即读取新磁盘资源；代理已通过原生 Chrome 工具栏菜单点击该按钮，完成首次部署、v0.4.0 升级和后续自助重载。没有访问 chrome://extensions，没有卸载扩展或复制 Chrome 用户配置。重载后重新打开档案；已有 ChatGPT 页需刷新以加载新内容脚本。

自动测试 **355/355 PASS**，隐私/权限/网络/冻结链路审计通过；八项真实 Chrome 验收通过。现有开发目录仍为 `outputs/Personal-AI-Input-Archive/`，已部署带自助 reload 的 internal 构建。独立候选由 `PAIA_NODE=/path/to/node python3 scripts/build_internal.py` 生成到 `outputs/PAIA-v0.4.0-internal-candidate/`；正式 ZIP 由 `scripts/package.py` 生成，自动检查当前全量报告、真实证据及 release 资源白名单。不要用正式包覆盖日常开发目录，否则开发按钮会按设计消失。

本地检查点：`checkpoint-v0.4.0-internal-real-verified`；原 `9918959` 和 v0.3.1 检查点保留。结果及证据范围见 TEST_RESULTS.md。

# Thought Library

默认打开 Thought Library（个人思想库），按真实聊天窗口组织。点击聊天进入日期、时间、连续正文文档；发送时间未知单列，捕获时间不会冒充发送时间。用户标题独立保存，原始聊天标题保留；摘要位置预留，本版无 AI 整理。

Library 可编辑、查看原文、移除及恢复。移除只是排除，重新打开 ChatGPT 不会复活。Input Archive 保留原有检索、时间线、回收站和导出；从回收站永久删除会清除同一来源消息的原始快照并永久忽略来源。用户已编辑/合并的 Library 文本保留，删除原文引用；未编辑直接副本一并移除。不可撤销的来源忽略不影响其他来源的相同文字。

现有档案自动迁移：原文保留，未隐藏/未回收记录默认进入 Library，旧备注和整理版不丢失。直接正文引用原档案；编辑只保存 libraryText。AI Memory 目前为空的访问层，默认关闭，无外部 AI、MCP、云同步或新权限。

冻结基线：79b2856 / checkpoint-before-thought-library-v0.4.0。本轮相对 9918959 未修改任何 adapter、content、background、core、ui 或根 manifest 运行资源。真实迁移保留 46 条旧档案，最初形成 5 个聊天文档；验收只编辑和删除专用虚构样本。最终 48 条原始记录包括原有 46 条、重开旧聊天补录的 1 条及保留的 1 条虚构样本。另一个测试来源已永久忽略，其独立整理文本在 Library 排除区。

schema4 数据不能直接由旧 v0.3.x 打开；Git 源码回退不等于数据回滚，永久删除不可恢复。已安装 v0.3.1 的代码备份在忽略的 `work/reload-infrastructure/stable-v031/`，不含用户数据。当前 JSON/Markdown 导出范围仍为 Input Archive。

---
# 历史：v0.3.1 internal — 真实旧聊天历史时间修复

现在由代理通过电脑控制当前已登录Chrome完成验证，不再要求独立sampler、QA profile、登录自动化或逐版本人工smoke。现有采样/Golden工具保留为历史工具，不是本轮验收前提；真实Golden回放移到tests/optional显式运行。

真实根因：`/backend-api/conversations/{id}` 的历史响应解压后为672430字节，旧512KiB other JSON限制在JSON解码前截断。修复仅把同源、当前conversation精确历史endpoint的读取预算设为2MiB；普通other JSON仍为512KiB。身份、schema、时间可信度、存储不可变性、网络和权限规则不变。SourceTimeResolver及adapter协议版本仍为0.3.0，本次包版本为0.3.1。

已在真实旧聊天观察到三条exact-matched记录恢复历史发送日期；刷新、重开、UI和最终自动验收结果见TEST_RESULTS.md。正式打包要求当前代码的全量测试/审计及本地真实Chrome验收记录，不以合成测试替代真实成功。

---
## 历史验证说明（v0.3.0 internal，已被当前流程取代）

加载本包并同意启用后，打开同一个旧普通 ChatGPT 聊天，再在档案中打开至少一条自动补录的历史记录。只查看“时间来源摘要”：DOM candidate、response candidate 是否 present，两源时 agreement 是否 agree，以及 sourceSentAt 是否为历史日期（或明确 null/conflict）。摘要只显示日期，不显示候选精确时间、消息 ID 或正文；无需旧诊断页、控制台或私人截图。单源通过严格校验也可 high，两源不存在则保持 unknown，不能保证真实页面一定暴露 DOM 时间。

以下各版本段落仅为历史记录；当前行为与验收以上方 v0.3.1 说明及 TEST_RESULTS.md 最新章节为准，无需用户重复执行下文手工步骤。

## v0.3.0 internal：统一 SourceTimeResolver

仅canonical用户消息的conversation identity + exact message ID可关联候选。DOM和response都产生候选，后台统一Resolver为唯一正式时间仲裁入口；capturedAt和originalText永远不改。支持chatgpt_dom、chatgpt_response_create_time；official_export与firstObservedAt只预留接口，本期不导入、不采集firstObservedAt，后者将来只可approximate且不能覆盖high/very_high。

容差1000ms（含边界）。两源有效且在容差内：使用response原时间，dom+response / very_high；只有一源：该来源/high；两源有效但差异超限：null / conflict，保留候选及来源状态；均缺失：null / unknown。无效/低可信输入不降级已有可靠候选。响应来源自身的旧持久阻断继续保留；拒绝的response证据不是有效候选，不能否决单独有效DOM，也不能降级已有high/very_high。两个有效来源之间的矛盾必须撤回正式时间，优先于v0.2.3的单源high保留规则。

DOM只检查已稳定通过canonical的user role自身、最多3层后代及最多3层带相同message ID且仅包含该role的祖先，后代扫描最多64节点，另查最多3个祖先，合计最多8时间值；不进入正文容器、编辑器、附件或其他role。接受明确data-message-created-at/data-message-sent-at，以及具有发送/创建语义标记的time[datetime]，title/aria-label仅接受完整“Sent at/Created at/发送于/创建于 + 含时区ISO机器时间”。无时区、人类日期、更新时间、正文内日期均不采纳；同来源多值冲突保守跳过。候选不直接赋值sourceSentAt。

新增矩阵与临时Chrome DOM+fetch→bridge→Resolver→store→archive UI全链路测试，覆盖同值/亚秒/几秒/大冲突/单源/无源/非法/错identity/assistant/重复ID/迟到/低可信。来源候选原值只留本地时间账本，档案仅额外显示安全状态摘要（来源存在性、一致性、最终日期/可信度，无正文、ID或精确候选timestamp）。不新增权限、网络、遥测。自动全通过后仅一次真实旧聊天smoke。

## v0.2.4 internal：正式结构历史响应识别

修复 other JSON 中结构消息集合只能被旧诊断识别、未进入正式时间解析的缺口。对未知命名的数组/字典或 messages 字典执行严格历史契约，再按当前聊天 + canonical exact message ID 写入时间。不直接接受所有 other JSON，不根据正文、标题、顺序或相近时间配对。

现有已知 JSON、正文捕获、缓存、去重和存储逻辑保持。没有可靠时间/身份、错聊天、非法/重复用户ID、超限等情况仍失败关闭。旧 fingerprint 统计不足以还原真实 JSON，自动 fixture 复现统计与代码分叉，真实当前页面仍待一次 smoke。

包 outputs/Personal-AI-Input-Archive-v0.2.4-internal.zip，检查点 checkpoint-v0.2.4-internal。最终只做同样的干净安装验证：使用新的解压目录加载并启用，打开同一个旧普通聊天，查看3条历史输入是否直接显示真实发送日期；捕获时间仍是本次时间。保留原有扩展与档案，不需要诊断页、控制台或私人截图。完整链路证据见 TEST_RESULTS.md 顶部。

## v0.2.3 internal：legacy 记录去重后补身份与时间

修复旧记录已存在、重复扫描被去重后遗漏完整 identity/time 的情况。有可靠来源证明时，同一条旧记录补齐 sourceMessageId、sourceKey 与历史发送时间；原文、首次捕获时间保持不变。metadata 先缓存或后到均自动处理。已保存 high 日期不被后续冲突覆盖，矛盾时间不能用于未知记录。

只有历史片段序号、没有可靠来源证明时仍显示未知；当前唯一的 #3 不能保证就是历史 #3。旧持久时间阻断不会擅自清除。未读取你的真实记录，自动通过不等于已确认当前私有页面兼容。

交付包为 outputs/Personal-AI-Input-Archive-v0.2.3-internal.zip；检查点 checkpoint-v0.2.3-internal。更新原扩展目录并重新加载（不卸载）后，保持捕获启用，打开原普通聊天及同一条旧档案记录，确认发送时间从未知变为历史日期，捕获时间和原文保持原值。不要求诊断页、控制台或私人截图。自动测试结果见 TEST_RESULTS.md 顶部，以下均为历史版本记录。

## v0.2.2 internal：较老历史分批回填

本轮从本地 v0.2.1 检查点恢复，只完成“最近 5 条 metadata 先到、更早 15 条后到”的正式回填验证。两批按 exact conversation + message ID 合并；已有记录的原文和 capturedAt 保持首次值。无可靠身份/时间继续显示未知，不用捕获时间代替。

安装包 `outputs/Personal-AI-Input-Archive-v0.2.2-internal.zip`，检查点 `checkpoint-v0.2.2-internal`。全量 265 项通过，1920 项静态审计通过；现有生产逻辑已通过新增回归，本轮保持逻辑不变。完整结果见 TEST_RESULTS.md 顶部；以下旧版本的人工诊断步骤不再执行。最终只需原目录更新并重新加载扩展（不卸载），打开旧普通聊天并向上加载更老消息，查看一条此前 unknown 的较老记录是否补上符合实际时期的发送日期，原文和捕获时间仍为原值。不需要诊断页、控制台、私人截图或发送新消息。

## v0.2.1 internal：历史发送时间回填

本轮针对 v0.2.0 真实 smoke 中“正文已保存但发送时间未知”修复正式元数据链路。metadata 晚到时可按精确来源 ID 补写已有记录，原文与首次捕获时间不变，未知顺序可补齐；档案页无需保持打开。已有可靠时间不被更低可信的缺失/无效样本覆盖，身份和时间冲突仍严格拒绝。

安装包为 `outputs/Personal-AI-Input-Archive-v0.2.1-internal.zip`，本地检查点为 `checkpoint-v0.2.1-internal`。260 项全量自动测试已通过，完整生命周期审查见 TEST_RESULTS.md。

最终仅更新原扩展目录并重新加载（不卸载），确认启用后打开一个旧普通聊天，查看一条历史消息是否显示实际发送日期，同时本次已捕获记录的 capturedAt 保持原来的今天时间。无需诊断页、控制台或提供私人内容。

## v0.2.0：正式发送时间与本地自动验收

本版将历史 response 的 create_time 通过 exact conversation identity + message ID 与 canonical 用户消息匹配，正式保存发送时间/来源/可信度/顺序。先捕获到的消息可显示“发送时间未知”，合格 metadata 到达后自动补时间；捕获时间仍保留首次值。冲突、非法、顺序/更新关系异常会保守拒绝或撤回发送时间。high 表示通过当前 contract；真实 ChatGPT 页面兼容性只需最后一次冒烟验证。

时间线优先显示发送日期，未知时间独立标注，不把捕获日期冒充发送日期。聊天顺序指当前已显示 canonical 片段的首次确认顺序，不承诺未加载历史或分支的绝对位置。旧档案默认未知，可在打开原聊天时补齐；原文、备注、整理版和首次捕获时间保留。

开发测试使用共享 Fake ChatGPT harness，浏览器将 chatgpt.com 的虚构路径全部在本地拦截，不连接真实服务；没有真实账号、日常 profile、Cookie/Keychain 访问或扩展测试后门。支持自动 DOM/metadata 先后、异常响应、多聊天、刷新/SPA、worker 停止与重新唤醒。测试运行入口与分类结果见 tests/README.md 和 TEST_RESULTS.md。运行扩展无需安装测试依赖或启动服务器。

已保留响应竞态修复：历史时间与旧诊断各自先建立副本，再独立读取；页面可立即读取原响应，扩展不增加请求或等待正文解析后才返回页面。

最后只做一次真实 smoke：把 `outputs/Personal-AI-Input-Archive-v0.2.0-internal.zip` 更新到 Chrome 原来加载的扩展目录并重新加载（不要卸载），确认已启用后刷新一个旧普通 ChatGPT 对话；确认用户输入自动补录，一条历史记录的发送日期符合实际时期，并与捕获时间分开显示。既有 capturedAt 保留首次值，本次首次补录才显示今天。无需再测试中间诊断页或发送截图中的私人内容。

本轮不扩展 manifest 权限、不新增请求/遥测。更多模型和错误处理见 PRODUCT_SPEC.md；以下为历史版本记录，旧人工诊断步骤不再要求执行。

## v0.1.3.3 diagnostic：source time semantic validation

用户提供的 v0.1.3.2 安全统计已确认历史 JSON：55 条消息、5 条 user，5 条均有 ID 与可解析 create_time，当前 3 条 canonical 全部精确匹配。本版只验证时间语义，不写 sourceSentAt，不改 capturedAt、档案、时间线或 canonical 捕获。

### 最后真实 Chrome 测试

1. 将 `outputs/Personal-AI-Input-Archive-v0.1.3.3.zip` 内文件覆盖到原来加载的扩展目录，保持目录不变、不卸载；在 `chrome://extensions` 重新加载，确认 **0.1.3.3**。若直接加载本项目目录，只需重新加载。
2. 保持捕获启用，只留一个普通旧聊天标签，刷新并等 5–10 秒；打开并刷新独立「响应时间诊断」。不用发送新消息或点击旧受控按钮。
3. 在顶部 **source time semantic validation** 选择当前可见用户消息实际所属时期（today / 1–7天 / 1–4周 / 1个月以上），只反馈该块安全摘要；截图不含地址栏或 ChatGPT 正文。有不同年代聊天时，在同一标签依次打开、等待、重新选择；优先数周前或一个月以上的样本，没有对应时期无需新建。

### 诊断含义

只有非空 canonical 100% 精确匹配、均有可解析 create_time、至少一对可比较顺序且无逆序、全部严格早于本次诊断采集边界、update_time 合理、同 ID 无冲突、无容量截断、人工时期一致，才显示 `timeSourceCandidate = chatgpt_response_create_time`、`timeConfidenceCandidate = high`。缺项 unknown，异常 fail，零样本不能通过。high 仅适用于当前可见样本及本次会话，不证明跨刷新逐 ID 稳定。

本次诊断采集时刻固定于该 ID 首次通过 canonical 采集入口（后续 CAPTURE 保存之前）。它不是旧档案已存 capturedAt 的读数；本版不读取记录，不能宣称验证旧记录精确时间。比较的是早于本次采集边界，不用加载时间冒充发送时间。顺序只取 canonical DOM 顺序，JSON mapping 插入顺序不作依据。

create_time 只接受有限数值 Unix 秒，范围从 2000 年至检查时刻后 5 分钟；仍须严格早于采集边界才通过。update_time 缺失/null 单列为未提供，允许通过可选关系检查；提供时须可解析、>=create_time 且不晚于检查时刻。已见 create_time 缺失/无效、同 ID 不同数值及不合理 update_time 在本次会话保留失败证据，后续好样本不能抹去。

时期按时长而非日历：today <24h；1–7天为 [1,7) 天；1–4周为 [7,28) 天；“1个月以上”为 >=28 天。全部匹配消息须在所选桶；旧聊天近期续聊可能跨桶，不要按聊天创建日期选择。选择只存 UI 内存，刷新/切换/暂停/多标签失去资格/canonical 范围变化后清空。

仅现有合格 other 历史候选中的 user 最小时间元数据参与，路径/类型/身份/有界读取门禁保持，最多 2000 条语义身份，超限不能 high。后台/UI 仅收固定统计与粗分类，无原始身份、精确 timestamp、JSON 或正文。无新增网络请求、权限或遥测。授权未就绪的早期响应可能漏观察，不补请求。

自动结果见 TEST_RESULTS.md。以下均为旧版记录；本次只执行上面三步。

## v0.1.3.2 diagnostic：本次安装与反馈

安装包：outputs/Personal-AI-Input-Archive-v0.1.3.2.zip。将包内文件更新到 Chrome 原来加载的同一个扩展目录，在 chrome://extensions 重新加载并确认版本 0.1.3.2；不要移除原扩展或更换目录。已打开的诊断页也需刷新。

接下来只需：

1. 刷新一个普通 ChatGPT 标签（捕获已启用，只保留一个待测普通聊天标签）。
2. 打开一个已有历史的旧聊天，让 ChatGPT 自己加载。
3. 等待 5–10 秒。
4. 打开独立“响应时间诊断”，截取 **other JSON structural fingerprints / historical candidate** 区域。

本次不需要点击受控时间验证。截图不要包含地址栏、ChatGPT 正文或完整档案页。若没有指纹，也反馈该区域的单标签资格、失败/超限与丢弃计数；不能把没有样本解释为没有历史时间。

### 本版诊断含义与边界

- 指纹只针对 other 分类中，同源、HTTP 合格、无重定向、明确 application/json（大小写不敏感）或 application/*+json 的响应。可以包含 URL 查询参数；这不改变正式 conversation 响应的路径/参数/结构门禁。认证、令牌、登录会话路径额外排除，不解析其正文。
- 基于内容脚本注册与后台的普通聊天文档状态授予单标签诊断资格。第二个已知普通聊天即使心跳过期也继续阻止指纹；关闭标签或文档退出会撤销注册。无法确认资格时跳过，资格变化后清空。扩展启动/路由切换时尚未获授权的早期响应仍可能漏观察，不补发请求。
- 每个副本读取最多 512 KiB、5 秒；同时一个指纹读取任务。实际字节数超限即丢弃，不仅相信 content-length。仅沿用响应类型/长度判定，不读取请求头、Cookie、token 或认证字段值，不显示或保存任何 header 原值。JSON 副本在内存解码后只做结构选择，不保存整包。
- 对象深度最多 4（根为 0）；最多 1000 个对象节点、每节点 64 个键、200 个候选消息。content/parts/text/title/body/附件，以及 token/authorization/cookie/credential/password/secret/header/session 等字段不下钻、不取值。原始键名不进入分组或 UI；只计指定字段名单。
- depth-limited 表示还有超出本次深度窗口的子结构，不能声称调查整份 JSON；resource-truncated 表示节点/键/条目资源不足，此时不确认历史候选。只在已观察范围中明确找到消息集合、至少两条同时具有 author.role / id / create_time 结构的消息时，标 historical_conversation_schema_candidate。名字与结构相符不证明发送时间语义。
- mapping/messages 命名集合、明确包装 message 的字典、以及直接消息对象数组/字典都可以形成诊断指纹；不会因此成为正式会话响应。只读取候选 user 条目的 ID 和时间类型/可解析性。候选精确匹配需要其明确的 enclosing conversation_id 与当前 canonical 聊天一致；不能从根 id、URL、正文、顺序或近似时间推测 identity。
- 指纹聚类键只由根类型、顶层键数、固定字段计数、集合尺寸、深度和布尔值组成。最多 12 组；满额优先保留历史候选，丢弃/替换会增加丢弃数。JSON fingerprint 编号仅为当前内存列表序号，刷新后不稳定，也不代表 endpoint。
- occurrence 是同一结构本次累计出现次数；候选详情、用户数量和匹配数对应该组最近一次响应。所有匹配按 conversation identity + exact message ID，匹配数去重。原始 ID 仅在文档内存中等待 canonical 出现；后台和 UI 只接收安全摘要。
- 指纹失败/超限单独计数；正式接受的 response metadata 数不因指纹增加。刷新、切换、暂停或失去单标签资格清空。源消息原文、capturedAt、时间线、正式记录模型、canonical 捕获与原响应解析器保持原状。

以下为此前版本的操作与调查历史，当前指纹范围以本节为准。

## v0.1.3.2：other JSON 结构指纹诊断

用户真实结果：观察 118 个响应；旧聊天类 0，发送类 1（ROOT_NOT_OBJECT），other 117（含 URL_SHAPE_NOT_ALLOWED 的同源合格 JSON）。这不能证明旧聊天没有历史元数据。本轮仅对已授权、后台确认单个活跃普通聊天、同源/HTTP 合格/无重定向/明确 JSON 类型的 other 响应增加独立诊断。URL 查询参数不再阻止此诊断分支，但不改变正式会话响应的接受条件。

副本读取最多 512 KiB、5 秒，最多一个指纹读取任务；结构深度 <=4、对象节点 <=1000、每节点键 <=64、候选消息 <=200。只输出固定字段的布尔/计数、根类型、集合尺寸/深度；不输出任意原始键或值。最多 12 个内存指纹组，超限明确计数；截断时不能确认历史候选。只有明确集合中多个消息具备 role/ID/create_time 结构才标 historical_conversation_schema_candidate；其用户 ID 与明确的同一会话 identity 仅在文档内存用于 canonical 精确匹配，绝不加入原 response metadata 接受集合或写入记录。

刷新、切换、暂停或失去单标签诊断资格即清空指纹与临时匹配身份。不新增请求/XHR/权限，不读凭证/请求头；沿用现有响应 content-type/长度的内存分类和字节计数，不保留头值。真实结果仍待用户 Chrome 反馈。

## v0.1.3.1 diagnostic：安装与本次反馈

新包：outputs/Personal-AI-Input-Archive-v0.1.3.1.zip。将包内文件更新到 Chrome 原来加载的同一扩展目录，不移除扩展、不更换目录；在 chrome://extensions 重新加载，确认版本 0.1.3.1。刷新 ChatGPT 和已打开的独立诊断页。此前 ZIP 和 Git 检查点保留。

**先做 B：打开已有旧聊天。** 保持捕获启用，只留一个普通 ChatGPT 标签。让页面正常加载一段已有历史的聊天，等待约 5 秒（已有流式副本可能最多等待 15 秒读取窗口）。打开“响应时间诊断”，找到新增的“响应结构拒绝原因诊断”。截取该块开头的 observedFetchResponseCount，以及“B. 打开已有旧聊天”完整块；如果 B 数量为 0，也反馈“其他 endpoint”块。不要提供地址栏、原始 URL、消息 ID、时间值或正文。

**再做 A：新消息发送。** canonical 数量稳定后点击“受控时间验证”，看到“已开始”再发一条虚构消息。查看“A. 新消息发送”块的最终 stage / reasonCode。SSE/RSC 等响应不包含完整元数据，并不否定 B 历史加载来源；未获 create_time 时只可继续保留 firstObservedAt 的 approximate 观察语义，本版不把它写入正式记录。

用户已确认此前点击按钮后曾显示“已开始”，本轮没有更改按钮、后台控制命令或启动门禁。原有真实 MV3 合成测试再次验证按钮可启动。刷新/切换聊天/暂停会清空受控状态；不凭“未开始”推断按钮失败。

### 如何解读新增数字

- observedFetchResponseCount 只计当前有效授权及聊天上下文中，观察器见到 Promise 成功返回的响应；HTTP 错误也可能计入。未授权、挂钩前或旧聊天迟到的结果不计。处理中计数可能先增加，完成摘要稍后到达；计数为 0 不证明页面没有该类数据。
- endpointClass 仅按原路径模式分类；originAllowed、URL 形态、HTTP 合格、重定向门禁独立显示。其他 endpoint 不 clone、不解析正文。只对 response content-type 做 json / event_stream / text / other 分类，不保存头值；RSC 可能落入 text 或 other，不因此获得支持。
- clone / JSON / root / identity / collection 均区分“是否尝试”与“结果”。显示“未执行”时不能把后续的 0 计数当作第二个失败原因。
- root schema 和 conversation identity / mapping 只指原契约中的 conversation_id、mapping、message 路径；false 不证明别的未知字段绝对没有时间。拒绝样本的计数探测最多检查 2000 条明确路径项，不搜索未知嵌套结构，不影响接受判断。
- messageEntryCount 是已检查项中非 null 的 message 槽位数（含不合法槽位）；userRoleEntryCount 只计明确 author.role=user。有 ID/时间指值非 null/缺失，另列 ID 格式合法数和 Unix 秒可解析数。不会读取 assistant 的 ID、时间或 content。
- SSE 可以含多个事件：JSON 成功值数量和条目计数只代表遇到失败之前已经检查的前缀，结构布尔值属于最近检查的 JSON 值；不补解未知 delta，也不将部分元数据作为成功批次送入匹配。
- 每类独立累计接受/拒绝/跳过数量，保留最近一条完成的安全摘要。A 的发送拒绝不会覆盖 B 的加载摘要。同一分类后续响应会更新其最近摘要；定位时尽量一次只触发一个业务动作。
- 固定 reasonCode 示例：CONTENT_TYPE_NOT_ALLOWED（类型门禁）、CLONE_FAILED（副本建立失败）、JSON_PARSE_FAILED（不是可解析 JSON）、ROOT_SCHEMA_UNKNOWN（不符合已知根结构）、CONVERSATION_ID_MISSING / MISMATCH（身份缺失/不一致）、USER_MESSAGE_ID_INVALID、CREATE_TIME_TYPE_INVALID。均不包含页面字符串。

此次不扩大 endpoint、JSON/SSE 格式或字段接受范围；未知结构继续拒绝。刷新即清空元数据与新诊断计数。原记录、capturedAt、时间线与 canonical 捕获不变。真实发送时间是否存在仍待本次新摘要定位，不声称方案已成功或失败。

以下保留 v0.1.3 操作说明和更早历史，当前版本差异以上述说明为准。

## v0.1.3.1：响应结构拒绝诊断（当前阶段）

用户真实反馈 canonical=2、response metadata=0、匹配=0、接受=0、结构拒绝=1、超限=0。只能说明候选响应处理失败，尚不能确定是 content-type、clone、JSON 或 schema 阶段，也不能否定历史时间方案。

本轮只增强安全诊断，响应 endpoint/格式/字段接受规则与 v0.1.3 保持一致；不支持未知 SSE/RSC 结构。按 conversation_load_candidate、message_send_or_stream_candidate、other 分开计数并保留各类最后一条安全摘要。阶段分别报告是否尝试、是否通过；未执行不伪称失败。仅已通过原 URL/状态/类型门禁的副本才解析；拒绝后的探测只检查原有明确字段路径、最多 2000 项，不遍历未知 JSON 或读取正文。

旧聊天恢复是主要目标；发送响应没有完整元数据只表示该样本无可用来源。firstObservedAt 仍仅为近似观察语义，本轮不新增记录字段或近似时间存储。版本 0.1.3.1 diagnostic，保持 canonical、正式记录、时间线、权限与网络边界。

受控按钮独立检查：未点击的“未开始”属正常。若发现传递失败，单独记录并验证，不能通过放松响应 schema 修复。真实点击情况仍待用户反馈。

## v0.1.3 安装与真实 Chrome 手工验证

本包为 response-time diagnostic PoC。现有记录结构、capturedAt、去重和时间线不变；适配器仅升版本号，canonical 规则不变。正常开启的捕获仍会保存新用户消息，因此新消息测试可能增加记录数，但不会覆盖原有四条。代理没有读取或操作用户的真实记录。

### 更新

1. 解压 outputs/Personal-AI-Input-Archive-v0.1.3.zip，将包内文件更新到 Chrome 当前加载的同一个扩展目录。不要在 Chrome 中移除扩展，也不要另换加载目录，避免改变扩展身份及看到另一套本地存储。
2. 在 chrome://extensions 找到原扩展，点击重新加载，确认版本 0.1.3。
3. 保持捕获启用，只留一个待测普通 ChatGPT 标签；刷新该标签，等待约 5 秒。刚加载且授权状态尚未到达的响应可能漏观察；不主动补请求。
4. 从弹窗「捕获诊断」或档案页「结构诊断」点击「打开响应时间诊断」。这是独立安全页面，不读取档案记录。
5. 只截取「响应时间诊断」页内容，不包含地址栏、ChatGPT 正文或完整档案页。允许反馈界面中的数字、固定分类和差值。

### A. 新消息时间测试

先在普通旧聊天等待 canonical 数量稳定，点击「受控时间验证」。看到“已开始”后返回同一聊天发送一条虚构文字，等待正常回复完成及约 5 秒。不要滚动加载旧消息、切分支、编辑旧消息或切换聊天。

查看 canonical 数量、response metadata、精确匹配数、可解析数、冲突数和候选差值秒数。差值是 first canonical observation 减去响应 create_time；例如几秒是业务一致性的候选证据，包含渲染和 2 秒扫描延迟，不是点击发送按钮的精确时钟。仅按钮后开始的发送类响应参与；GET 历史加载响应不参与。按钮前已观察的 ID 即使编辑也排除。

若差值“尚无合格样本”，不能判为 0 秒或通过。当前发送响应可能不提供 user 的完整 create_time、采用未知流格式、超过时间/大小上限或在授权前开始。本 PoC 不追请求、不猜匹配、不扩展到未知格式。

### B. 刷新稳定性测试（有限观察，不能完成逐 ID 验收）

发送测试后先截图安全摘要；刷新 ChatGPT，等待诊断重新连接，再截图同一摘要。刷新会清空所有 message ID、create_time、firstObservedAt、受控基线和冲突映射。诊断页最近摘要可短暂延迟更新，等待 canonical 与响应计数重新出现再比较。

比较相同可见消息范围内的匹配数、可解析数、冲突数和年龄分类；差异需要调查，相同只说明粗粒度结果一致。根据“刷新即清空所有元数据”的本轮约束，不保留逐 ID 时间基线或哈希。因此“同一 ID 刷新前后时间完全一致”明确为 unknown，不能用这些截图代替该项验收，不能据此授予 high。未来若需要自动完成这一项，需单独授权跨刷新、仅内存的比较基线；本轮没有这样做。

### C. 旧聊天历史时间测试

打开至少数周前的普通聊天，让页面自然加载。切换会清空前一聊天的内存数据；仅当前聊天匹配。查看 canonical、metadata、精确匹配与可解析数，最早/最晚年龄是否出现 weeks_ago 或 older，冲突数是否为 0，以及 DOM 相邻可比较对中的逆序数。

年龄以距当前时刻的时长分组：today 小于 24 小时，days_ago 小于 7 天，weeks_ago 小于 28 天，older 至少 28 天；未来值为 unknown。这不是日历日期。年龄只针对精确匹配、可解析且没有冲突的消息。

若本次首次补录旧消息，其 capturedAt 是当前保存时间而候选显示 older，则支持“候选不是加载时间”；对此前已有记录，不自动读取其 capturedAt 做比较。相邻顺序仅使用已匹配 ID 的当前 canonical DOM 顺序进行诊断，不以顺序匹配、不改排序、不承诺全聊天分支顺序。没有响应元数据或无法精确匹配即未知。

### 响应契约与资源边界

候选路径仅限同源、无查询/片段、未重定向的 /backend-api/conversation/<当前聊天ID>，以及 /backend-api/conversation、/backend-api/f/conversation。路径是待真实采样检验的候选白名单，不是官方 API 契约。仅接受 application/json，或发送类路径的 text/event-stream；快照要求 conversation_id 与当前聊天一致、mapping 内 message.id/author.role/create_time 结构明确；流只接受完整消息 envelope，未知 delta 格式整体拒绝。

create_time 仅接受数值 Unix 秒或 null/缺失；不转换字符串、不猜毫秒单位。解析后的候选范围为 2000 年起、不超过本机现在 5 分钟的未来；范围通过不证明原始发送语义。非 user 条目不读取 content 字段、不送入桥接。整包 JSON 解码会临时经过其他内容，不能声称从未接触 assistant 字节；没有正文或完整 JSON 的持久化/日志/诊断输出。

同时最多 2 个副本读取，每个最多 2 MiB、15 秒读取窗口；每次最多 2000 条元数据，单页最多保留 2000 个 ID、最多展示 20 个差值。读取超限、格式变化、冲突或路由/授权变化时跳过。副本消费存在内存/CPU 开销，不承诺零开销；不等待解析再返回原 Promise、不取消原响应、不读取请求体或请求头。

MAIN/ISOLATED 两侧与后台都校验固定协议。后台仅内存保存安全摘要及路由令牌；诊断页只能取摘要/请求受控验证，没有 GET_STATE 读取权。页面来源仍可伪造；本版业务证据候选不作密码学或法律保证。timeSourceCandidate 固定为 chatgpt_response_create_time；只有全部业务验收满足后才考虑 timeConfidenceCandidate=high，当前不自动评定。


以下为此前版本和调查历史；与 v0.1.3 不同处以上述当前说明为准。

## v0.1.3 response-time diagnostic PoC（本轮范围）

保留 v0.1.2 canonical DOM 捕获、去重、记录和时间线；不写 sourceSentAt 或修改 capturedAt。新诊断仅内存：MAIN 在 document_start 包装原 fetch，原参数/Promise/Response 保持，不新增调用，不读请求体、凭证或请求头。只旁路解析严格路径及结构白名单的有限响应；整包解析可能短暂接触 assistant 字节，但不提取、传递、保存其正文。授权前/暂停/临时聊天不解析；切换、刷新清空映射。

仅 conversation identity + exact message ID 与已通过 canonical 检查的用户消息匹配。单独诊断页只呈现白名单计数、粗粒度年龄、精度和受控差值；不读档案记录。受控按钮以当前 canonical ID 为基线，仅统计之后出现且来自按钮后开始的发送响应的候选；无法证明真实新发送时标为候选，不能将旧消息初次出现冒称发送。所有判断尚待真实 Chrome 验证。

严格区分观测与结论：刷新销毁 ID/时间映射，因此仅对比刷新前后计数/年龄不能证明逐 ID 时间稳定；该验收项保持未验证，不暗存时间指纹。timeSourceCandidate=chatgpt_response_create_time；high 为后续验收通过才可采用的候选可信度，本 PoC 不自动授予。无原始时间值跨刷新持久化。

# Personal AI Input Archive

一个无需构建、仅本地运行的 Chrome Manifest V3 扩展。只归档 ChatGPT 已发送且已显示的用户文字，帮助检索和整理自己的输入。

新增发送时间要求已记录，见 [时间元数据调查状态](TIME_METADATA_INVESTIGATION.md)。历史补录继续保留；当前 v0.1.2 只有捕获时间，尚未实现原始发送时间字段和新排序。本轮未获得桌面 Chrome DOM 时间样本，不能判断时间元数据是否存在；没有修改代码或生成新安装包。

当前 v0.1.2 为 turn 调整诊断版：已确认旧 turn 包装要求阻断了自身具有合法 ID 的可见 user role。本版仅解除该前置条件；保留编辑、正文、可见性、稳定窗口和去重检查。真实捕获效果仍由你手工验证。更新时在 `chrome://extensions` 重新加载原扩展，再刷新 ChatGPT 和档案页；不要卸载，以免清除原本的本地存储。使用 ZIP 时覆盖原来加载目录中的扩展文件后重新加载，避免换目录生成另一个扩展身份。

## 本次更新与诊断反馈（v0.1.2）

已有扩展的用户按以下步骤更新，不必重新安装或重新同意：

1. 如果原来直接加载本项目目录，文件已更新，跳到下一步。如果原来加载的是解压目录，先解压 `outputs/Personal-AI-Input-Archive-v0.1.2.zip`，把其中 `Personal-AI-Input-Archive` 文件夹里的文件复制到原先加载的目录，替换同名扩展文件。保持原目录路径，不要卸载扩展。
2. 在 `chrome://extensions` 找到原扩展，点击重新加载按钮。确认版本为 **0.1.2**。然后刷新已有档案页。
3. 定位时只保留一个待测 ChatGPT 标签页，避免其他标签覆盖全局最近诊断。使用普通、非 Temporary Chat 的对话，发送一条虚构测试文字，确认它已显示在对话区。若已暂停，主动恢复捕获。
4. **刷新这个 ChatGPT 标签页**，等待约 5 秒。扩展重新加载不会自动更新旧页面里的内容脚本，即使档案页已显示 0.1.2，也仍需这一步。
5. 打开独立档案页，展开底部 **捕获诊断 → 结构诊断**。确认收集时间是刚才，时效显示最近一分钟内；若过期，刷新目标 ChatGPT 后重新打开档案查看。
6. 反馈适配器版本、最近状态/错误代码、记录数，以及下方整个安全结构摘要的文字。可以手动选中后使用浏览器自己的复制操作；扩展不访问剪贴板。不用提供正文、标题、URL、消息 ID 原值或整页截图。

重点数字和布尔值如下，按页面原样反馈即可，不需要自己判断根因或修改代码：

| 页面字段 | 需要反馈的值 |
| --- | --- |
| main | 存在、可见、忙碌三个是/否 |
| user role 节点 | 总数、可见数 |
| turn | 合法 article turn 数、有 turn 标记祖先数 |
| message id | role 有属性数、role 格式合法数、祖先有合法 ID 数、后代有合法 ID 数 |
| 检查通过 | editor 数、非忙碌数 |
| 最终候选数量 | 数字，包括 0 |
| 每个节点的 editor | 可检查、位于编辑区域、自身可编辑、检查通过；编辑控件总数及 input/textarea/contenteditable/textbox 数 |
| 每个节点的正文容器 | 选择器匹配、归属本 role、可见、不安全祖先、不安全后代、安全容器数；role 自身是否匹配正文选择器 |
| 每个节点的结果 | 成为候选、重复身份、身份已变化；同时保留忙碌与 ID/turn 的是/否 |
| 逐节点明细 | 行数、是否截断（最多 20 行） |

总览的 turn/ID 数是符合相应条件的可见 user role 节点数，不是去重后的 turn 或 ID 数。无旧 turn 时编辑检查范围为已确认 user role 子树，有旧 turn 时保留旧范围；摘要会标明范围。编辑控件分类可能重叠，不能相加当作总数。最终候选是结构筛选数量，不等于已保存数量；稳定窗口、空文本、超长或保存失败仍可能影响保存结果。若显示「暂无结构诊断」，反馈该提示、状态和版本即可，不需要打开控制台或读取页面 DOM。

本版中合法 turn 数仍可能为 0，但 role 自身 ID 合法时应继续检查 editor 与正文容器。请特别反馈 editor 可检查/通过、检查范围内编辑控件数、正文安全容器数、最终候选及实际记录数；刷新一次后检查数量是否重复增加。v0.1.1 的 editor=0 由 turn 依赖强制产生，不能证明编辑态本身失败。当前没有宣称真实 ChatGPT 捕获已修复。

## 安装（不需要写代码）

1. 使用桌面 Google Chrome 114 或更新版本。
2. 地址栏输入 `chrome://extensions`，打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目中含 `manifest.json` 的文件夹（不要只选某个文件）。
4. 在 Chrome 扩展菜单中固定 Personal AI Input Archive，点击图标，然后「打开档案」。
5. 阅读完整说明，勾选同意框，再点击启用。未同意前不会采集正文。
6. 刷新已经打开的 ChatGPT 标签页，进入普通聊天并用虚构消息完成 TEST_PLAN.md 手工清单。Temporary Chat 默认跳过。

见 TEST_RESULTS.md 的实际检查结果与 outputs/交付说明.md 的交付清单。无需 npm install、服务器、API Key 或账户凭证。也可解压 outputs 中的 ZIP，选择解压后含 manifest.json 的 Personal-AI-Input-Archive 文件夹加载；Chrome 不能直接加载 ZIP。

## 日常使用

弹窗查看数量、暂停/恢复，点击「打开档案」使用独立完整页面。时间线和聊天视图检索已捕获记录，打开原文并另存备注/整理版。隐藏不删除；删除先进入回收站；永久删除不可恢复。

启用/恢复会收录当前页面已显示的旧用户消息，包括暂停期间发送而恢复时仍显示的消息。不会抓取服务器历史或自动滚动。页面捕获时间不是消息实际发送时间；页面顺序为当次已加载用户消息顺序。ChatGPT 页面改版可能漏捕，需要看诊断并完成手工验证。

导出 JSON 或 Markdown 的范围为当前筛选结果；回收站不导出。用户主动下载的文件请存放在源码目录外；不要提交到 Git。没有自动备份与导入功能，卸载前先导出。

## 工程约定

先阅读 AGENTS.md、PRODUCT_SPEC.md、PRIVACY.md、TEST_PLAN.md、DECISIONS.md。代码分为 adapter/、content/、background/、core/、ui/；tests/ 只放虚构夹具。所有资源本地打包，唯一 API 权限是 storage，仅在 chatgpt.com 注入静态内容脚本。

以下开发检查仅适用于完整源码目录。纯 Node 检查：`node --test tests/store.test.mjs tests/background-security.test.mjs tests/capture.test.mjs tests/export.test.mjs`。

包审计：`python3 scripts/check_package.py`；打包：`python3 scripts/package.py`。完整检查：`node --test tests/*.test.mjs`，其中浏览器测试需要开发环境提供 Playwright、桌面 Chrome 及启动浏览器的系统许可。可用 `PLAYWRIGHT_MODULE` 指定 Playwright 模块路径，`CHROME_PATH` 指定测试 Chrome 可执行文件。浏览器测试只在全新临时、未登录的配置中运行，以拦截响应提供虚构页面，不加载日常 Chrome 配置或真实 ChatGPT 对话。真实扩展集成测试使用较新 Chrome 的 CDP 测试接口，Chrome 114 的运行兼容性不等于开发测试接口可用性。

检查工具只用于开发，使用扩展不需要 Node、Python 或 Playwright；没有 npm 依赖、构建或服务器步骤。测试与运行时文件分开；ZIP 仅含扩展资源及说明文件。

## Git 回退

文档阶段标记 `checkpoint-docs`，第一版代码标记 `checkpoint-v0.1`，结构诊断文档检查点为 `ddad81f`，诊断版交付标记 `checkpoint-diagnostics-v0.1.1` / `checkpoint-diagnostics-v0.1.2`。代理完成后提供实际提交 ID。如需回退，直接让代理执行即可；无需你亲手改代码。回退源码不等于回退 Chrome 本地数据，永久删除的正文不会被 Git 恢复。本地仓库不配置远端、不上传。

## v0.7.0 M2 — Library Documents checkpoint

This independent worktree adds the fully manual Thought Library: write first or create a Topic, organize natural Sections, share one Entry across Topics, edit directly with autosave/Undo/revisions, and search locally. Source details stay folded until requested. No AI Provider or daily deployment is included.

Review the [M2 acceptance report](outputs/v070-m2-acceptance.md), [schema reconciliation and scope](M2_LIBRARY_DOCUMENTS.md), [32-area test mapping](M2_TEST_TRACEABILITY.md), [Library Index screenshot](outputs/v070-m2-ui/library-index.png) and [Topic Document screenshot](outputs/v070-m2-ui/topic-document.png). Screenshots contain explicitly invented data. Do not treat a Git rollback as a database downgrade; physical v5 remains the M1 boundary.


## M2 UI polish scope

From approved `48b3405`: quieter reading chrome only. Entry/Section actions appear through keyboard-accessible hover/focus ellipsis; expanded note/provenance stays open. Topic creation stays prominent; pin/merge/history move to its menu, Undo/Redo stays available by shortcut with subdued editing-only buttons. Library maintenance and removed content move to Settings; unplaced content remains an ordinary Library filter. Source status uses natural language, technical versions sit inside advanced details. No schema/model/background/storage semantics, Provider, daily installation or M3 changes. Validate existing M2/Input regressions plus isolated synthetic visible Chrome reading/menu/focus/settings/provenance tests and screenshots; finish a separate local polish checkpoint.

Polish evidence: [M2 UI polish acceptance](outputs/v070-m2-polish-acceptance.md).


## v0.7.0 M5 final acceptance

Foundation data/UI and Organizer mechanics passed final integrated acceptance. Real Organizer intelligence is not connected; production provider registry remains empty. Only synthetic isolated Chrome validation is authorized. Dedicated Foundation artifacts use version 0.7.0, while the source manifest retains the frozen compatibility harness version. Release-structure packaging removes internal diagnostic UI and response diagnostic arming without changing capture, storage, filtering or import semantics. No daily installation or network permission changes. CLOSED / FROZEN requires the final report and all gates.

M5 final: 668/668 tests, 0 failed, 0 skipped. See `outputs/v070-m5-acceptance.md` and the final checkpoint `checkpoint-v0.7.0-thought-library-foundation`. Dedicated internal/release-structure artifacts use `scripts/build_foundation.py`; they are not deployed to the daily installation. Thought Library data/UI foundation complete; Organizer mechanics complete; deterministic/mock full-chain validation complete; real Organizer intelligence NOT yet connected.

Current final closure: [Original Organizer Complete acceptance](ORIGINAL_ORGANIZER_COMPLETE.md).
