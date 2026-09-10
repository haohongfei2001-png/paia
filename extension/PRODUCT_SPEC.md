## v0.11.1 reading closure

See [READING_CLOSURE.md](READING_CLOSURE.md) for the reading contract, reproduced root cause and acceptance evidence. No new network or Provider capability.

# v0.11.0 — selected behavior

Production uses the same lexical relevance ordering with invocation-local query preparation. No embedding/model/vector store or new API path. Low coverage and incomplete scans are explained in Preview; unknown queries remain empty. See INTELLIGENCE.md for benchmark evidence, rejected alternatives, reproduction and limits. Tests run headless via PAIA_HEADLESS=1; historical test names/receipt fields saying visibleChrome do not override this run mode.

# v0.11.0 Intelligence evaluation

See INTELLIGENCE.md for the frozen benchmark, decision gates and evaluation scope. No private benchmark data, paid requests or automatic AI retries. Existing storage and authorization contracts remain unchanged.

# v0.10.1 AI Context Quality

本轮契约见 [AI_CONTEXT.md](AI_CONTEXT.md)。所有 Context 检索与分享准备均为本地零 API；新外部总开关不影响备份与授权保留。验证：固定 60 Topic / 1200 Entry / 240 query baseline 对比、currentness/去重/预算、权限/迁移/备份、many/deep 分布、合成 Chrome journeys 与完整回归。

# v0.10.0 AI Memory MVP

v0.10.0 将 AI Memory 空壳实现为默认未授权的本地上下文产品。核心界面为授权、准备上下文和分享前预览；零 Provider、正文仍属于 Thought Library。正式契约见 AI_MEMORY.md。

# v0.9.2 产品加固契约

保留既有架构与数据兼容，具体证据见 [V092_ACCEPTANCE.md](V092_ACCEPTANCE.md)，初审见 [V092_GAP_AUDIT.md](V092_GAP_AUDIT.md)。

统一状态值：idle、loading、ready、empty、saving、saved、updating、partial、stale、failed、paused、budget_limited、credential_missing、offline。普通界面显示自然语言，技术细节只在默认折叠的 Advanced。加载超过 180 ms 才出现安静占位；失败保留已保存内容并说明下一步。

导航与保存：Input/Topic/AI 阅读、Settings、低频档案页有明确返回；History、备份预览、Revision、单条内容有关闭/取消。最后一次导航意图生效。已解绑且尚未重读的编辑区不可编辑，避免写入无人收集的旧 DOM。Input/Thought/AI 在导航前 collect/flush，页面隐藏或离开尽早 flush；正在 IME 组合或未 durable save 时才阻止无提示离开。浏览器硬杀未提交 IME 的边界不能消除。

搜索使用本机数据：Input/Thought 180 ms 去抖、可取消后续扫描、匹配高亮与键盘导航。精确标题优先于部分标题，再到正文、AI；排名阶段跨分页稳定，时间排序只在有界页内，不声称全库相关度排名。索引未追平时显示轻状态，AI 内容每主题只出现一次。

删除边界：Source 永久删除仍需确认，墓碑优先；Input remove 保留 Source；Entry 删除可立即撤销并从 Settings 恢复；Topic 删除需明确容器范围且保留 Entry、Source、版本。会话 Undo 与持久 Revision 分开，Revision 普通预览只展示自然字段变化。

AI 成本/内容：保存、阅读、切换、排序、搜索、重渲染均零模型请求。未知结果暂停等待明确重试；现有 preflight、single-flight、ledger、每次/每日/批量上限不变。无依据或完全空白的 Provider 输出不提交覆盖旧内容，允许有依据的部分条目与可选空数组。默认正文来自工作 Input/exact span，AI 综合字段保留证据跳转。

Settings 默认仅读取轻量配置；组织诊断按需展开，备份期间暂停无关定时读取。完整性检查每页最多 100 条，只读检查 7 类关系，数据变化则结果作废，无自动修复。备份格式 v1、64 MB /100000 项空库恢复边界不变；导出超限会说明当前无法直接恢复。

# v0.9.1 UX 产品契约

优先修正现有 UI，不改事实模型、捕获身份、物理 schema 5 或本地 schema 6。Settings 保留 Key 保存/清除、单批条数、每日请求数与连续整理/AI 说明；估算、用量、phase/HTTP/trace 等放入默认关闭的高级区。未触发动作时不显示旧失败、预算用尽或重试要求。

思想库首页四层：标题/副标题与 AI 开关、搜索、高频创建操作、已置顶/最近更新/全部主题。合并建议仅有建议时带数量出现，批量 AI 仅开启 AI 且有待更新主题时出现。Topic 阅读保留相同批量能力。显式单次或有界请求失败后局部显示固定安全文案；预算/Key 前置失败不建议付费重试。失败后离开页面再进入不重新展示过期提醒，也不自动继续。

待确认输入复用现有分支/移除索引，不另建事实库。已有文档归属或独立文档操作在后台一个修订检查事务内完成，同一 operationId 幂等；Input id、正文、provenance、Source 原文/身份/时间保留，工作文档及修订的查询索引随归属更新。忽略写入已有移除标记，暂不处理不写入。重放导入、备份恢复与永久墓碑继续保护用户选择。原始来源入口始终按真实原始聊天定位。

Input 与 Thought 原话的排序偏好独立保存在既有 organizer-controls 元数据；默认正序。Input 使用有向索引游标进行全局分页，并保持当前阅读快照。搜索上下文、保存和撤销继续正常。AI 综合页由语义字段组成，保持其既有阅读顺序。

文档/Topic/独立 Entry 仅一个显式整体历史入口，移除对应重复菜单项；章节和内嵌 Entry 各自历史不是整体历史的重复。待确认输出建议提供返回思想库、接受/不采用和接受后的内容链接。

# v0.9.0 契约 — History Completion & Onboarding

首次体验：简短定位、三项说明、明确本机保存同意，然后历史补全或跳过。已有数据/授权用户不强制重走。引导状态保存为本机小型元数据。常驻入口统一叫“补全历史输入”，数据备份为另一个独立入口。

主动选 ZIP/JSON → 有界完整检查 → 数量/时间/分支预览 → 明确提交 → 可读 Input Archive。只有可信 user text 与稳定聊天/消息身份可写；当前分支须由 current_node/parent 图证明，其他或不明分支置于待确认。未知时间不编造。相同 Source 的新正文是新快照，不重置旧工作；删除墓碑与人工移除优先。事务内保存事实、工作层索引与断点；任务不保存原文件/全量 payload。新输入进入本地 Delta Planner；导入、首次启动和页面重开零 AI 请求。

支持范围、容量与恢复边界详见 HISTORY_COMPLETION.md；真实官方文件验证非阻塞，不夸大兼容性。

# v0.8.1 daily use contract

Topic → Sections → Entries remains the reading structure. Persist global source time ascending/descending and last AI view; query stays local to the current Topic. Sorting uses actual source time then capture/creation fallback, never AI generation time, without rewriting human organization. Reading is paginated, plain-text editable prose, grouped weak dates and collapsed evidence. Default Grid summaries quote representative user content. AI sections hide empty values and separate decisions, questions and tentative change.

Explicit continuous actions authorize a hard maximum (Original 1/3/5 requests and at most 50 Inputs, AI 1/3 Topics and requests). Single action remains default. Errors/partial/unknown/cancel stop; worker restart never resumes. Budget applies to all dispatches.

Backup is an explicit versioned local PAIA interchange document, includes recoverable user work/provenance/revisions/settings and deletion fences, excludes credentials and removed source text. File validation and preview precede explicit restore. Restore must reject incompatible/corrupt backups and conflicts with existing user work; no silent overwrite or purge resurrection. Implemented recovery is empty-library-only, bounded to 64 MB, fully validated and transactionally applied; interrupted settings application uses an idempotent recovery marker. External old copies cannot learn later tombstones from another erased database; see BACKUP.md. Topic deletion only removes the container and memberships, preserving Entries as unplaced. Human merges remain canonical.

以下为历史契约；与 v0.8.1 冲突处以上节为准。

# v0.8.0 产品契约

一个 Thought Library 共享 Topic 身份、成员与 provenance；默认内容和 derived AI presentation 是同一主题的两种显示。用户界面不使用“原话整理”作为产品名称。AI 不写 Source Record、Input working text 或默认 LibraryEntry 正文。

- 默认首页是 3/2/1 Topic Grid，显示原话提示、内容数、更新时间。AI Grid 显示综合摘要、核心内容/问题数与待更新状态。
- 默认连续阅读含发送日期、章节、可直接编辑正文、自动保存、Undo/Redo、独立版本与折叠来源。未被人工排序的章节按 sourceSentAt 排序，未知时间排在末尾并保留稳定顺序。
- Topic Quality 在本机按主题名、摘要、有限可读 Entry、provenance 评分，最多发送 8 个候选的主题/章节名称供既有 DeepSeek 选择。新主题提示强调长期语义，有限临时操作名称回落到“未归入主题”。可能重复的主题仅提供合并/保持分开建议；用户点击才执行合并。
- canonical AI contract 位于 `core/organizer/ai-contract.js`，prompt、Provider 验证和持久化提交共用该定义。缺失列表补 `[]`、无害字段剥离、非法 evidence 按条过滤。未知 topicId/不可解释顶层仍拒绝；没有依据的结果不能提交。
- Overview 根 evidence 可省略，此时范围为本次提供的有效主题依据；明确提供的非法根 evidence 不会被猜测修复。模型不得自行更名 key、推断未表达心理属性或把可能变化写成确定事实。
- 更新中心分别显示已整理/待整理/人工处理数量，以及有变化的 AI 主题数。一次 Original 点击最多 20 条且受 32 KB 内容、48 KB 请求与估算 tokens 约束。AI 一次一个主题、最多 8 条变更 Entry，既有 AI context 最多 16 KB；大主题需再次点击。
- 每次点击最多一次付费请求，自动 retry 为零；切换、启动、刷新、worker 重启和下一主题均不触发 Provider。失败保留旧结果且 checkpoint 不前进。手动重试明确提示会再次调用 API。
- AI 更新产生独立 AI revision；人工字段修改产生独立 user revision，不合并。受保护字段保留。缓存、历史读写和再次发送均受当前来源可读性约束。
- 迁移只增补 AI schema/stale 状态和本地元数据，不新增事实库；不重置 Topic/Entry/用户编辑。未知旧 AI 状态标待更新。
- 合成测试不能证明真实模型主题选择质量或历史某次响应的具体违约字段；真实模型 smoke 在用户自己的会话中最后确认。

---

# v0.7.2c AI Experience MVP — current authorization

Thought Library now uses Topic blocks and an AI presentation display switch. Only an explicit AI update sends one bounded Topic request; toggle/startup/rerender never send. Source/Input/Original bodies and organization remain unchanged by AI updates. Derived evidence, protected fields, session credentials and cost gates are mandatory. This supersedes earlier no-AI-presentation/dual-tab plans. Full behavior and evidence: [AI Experience MVP](AI_EXPERIENCE_MVP.md).

---


## v0.7.2b Original Organizer completion (2026-09-08)

Current authorization: Simple Original Runner only, at most five eligible Inputs and one DeepSeek Chat Completion per explicit user action. No automatic retry or continuation. Body is local working text or validated UTF-16 slices. Session budgets follow a trusted Chrome session marker; daily budgets persist. Network preflight checks trusted worker, exact granted host and CSP; credentials are omitted from cookie transport and redirects fail closed. Partial valid items commit atomically with provenance, organization, per-input receipts and progress. Unknown errors retain their phase and INTERNAL_RUNTIME_ERROR. No changes to Source/Input/Smart Filter/History Completion business semantics or AI synthesis.

Acceptance: expanded targeted/regression tests, a 20-Chinese-Input/four-batch synthetic chain, isolated Chrome success/failure/partial/retry/worker lifecycle, allowlisted internal/release packages and fixed-directory deployment. Synthetic HTTP fixtures are not evidence of live paid DeepSeek success.

## v0.7.2b Original Organizer Rescue

首次原话整理由直接 runner 每次处理最多 5 条 eligible Input，不再经过 legacy job/lease/retry recovery。DeepSeek `original_classification` 只返回逐 Input 的 Topic、Section、Type、related candidate、uncertain 与精确 span；正文始终由本地 working text 产生。批次使用 deterministic ID 和逐 Input receipt；Library 写入与 bootstrap cursor 在同一 IndexedDB 事务提交。单项无效会进入待人工处理终态，其余有效项可提交；请求级失败不写 Library、不推进 cursor。

## v0.7.1 Dual View & Incremental Update

原话整理与 AI整理共享 Topic、Section、Input provenance、dependency 和 source/time evidence，不能形成第二套事实数据库。原话整理按 Topic → Section → 时间/演化顺序呈现 Input Archive 用户原文或精确 provenance span；允许分类、排序、精确重复折叠和极轻格式，不自动重写、综合或压缩思想演化。派生 AI整理保留未来 synthesis、演化和摘要的 schema/read model，但本版没有 Provider 时只显示未更新状态。

Delta Planner 从 `originalOrganizerCheckpoint` 与 `aiOrganizerCheckpoint` 分别计算 added、changed、removed Input 及受影响 Topic/Entry 和近似大小。原话 checkpoint 默认本地自动推进；AI checkpoint 仅在未来获得 Provider 并经用户主动更新后推进。AI更新按钮只显示本地 delta preview，不发送正文、不假装完成；原话层和 Input Archive 均不会被派生层覆盖。

## v0.7.0 M3 — Organizer Mechanics（本轮授权）

最终验收：664/664 自动测试通过，isolated synthetic Chrome 通过；本地 checkpoint `checkpoint-v0.7.0-m3-organizer-foundation`。

实现契约：[ORGANIZER_MECHANICS.md](ORGANIZER_MECHANICS.md)。验收汇总：[M3 acceptance](outputs/v070-m3-acceptance.md)。

从已批准的 `571869e` 独立开发。仅 provider-neutral Foundation；production Provider registry 保持为空。Fixture/Mock 只在 synthetic 测试包中注入，无真实模型、网络、新权限、日常部署。复用 schema v5 的预留表；InputProjectionGateway 是唯一 Provider 数据出口，LibraryCommitService 是唯一 Organizer 内容提交入口。持久任务、租约 fencing、预算、严格候选验证、ActionPolicy、建议 accept/reject 和最小 Updates drawer 纳入本阶段。完成自动安全/故障/性能检查及隔离 Chrome 验收后建立 M3 checkpoint，不继续真实 Provider 阶段。

# v0.7.0 M2 current work

Manual Library Documents from `7d5df85`; scope, schema reconciliation and acceptance contract: [M2_LIBRARY_DOCUMENTS.md](M2_LIBRARY_DOCUMENTS.md). No real Provider, new permission/network, daily deployment or M3. Source/Input/Smart Filter/import semantics remain protected.

> M1 已完成（557 自动测试通过，0 失败/0 skipped；另有 3 项隔离 Chrome 补测）。M1 实施说明：[M1_DATA_SAFETY.md](M1_DATA_SAFETY.md)。最终验收与已知风险：[报告](outputs/v070-m1-acceptance.md)。以下旧版本记录按其原阶段保留。

# v0.7.0 M1 — Data Safety & Core Model（已完成）

本轮按77176f5和新增M1授权，仅实现安全数据底座及隔离合成验收；不进入M2，不接AI/网络，不部署日常安装。实现与结果以M1报告为准，下面设计/历史不代表本轮已通过。

# v0.7.0 Thought Library Foundation — approved product, proposed engineering

用户已批准并收口 [v0.7.0最终工程设计](THOUGHT_LIBRARY_FOUNDATION.md)，状态 **GO**。Foundation包含LibraryEntry/Topic/Section/Placement、编辑/证据/依赖/删除保护/任务/迁移，以及provider-neutral OrganizerProvider、CredentialProvider和BudgetPolicy；确定性fixture可完成全部Foundation工程验收。真实Provider及正式public credential/backend/BYOK/费用接入留到v0.7.0.1，不是本版阻塞项。当前仍仅设计，runtime继承`2b07582`未变，Source/Input/Light Filter/History Completion/R&D冻结；以下保留原版本契约。

---

# v0.6.2 Light Filter Coverage Improvement — approved contract

Independent worktree from 1e00c23; no daily deployment. User-reported baseline: active 126, evaluated 126, filter 0, uncertain 125, failed 0, idle. Actual reason distribution is unavailable, not inferred from this total. Add anonymous all-decision and uncertain reason counters; only stable enum keys and numbers cross the diagnostics boundary.

Relax unknown attachment metadata only for context-independent whole-input pure-control grammar. Known attachment/reference, user edits/restores/keep overrides and substantive or reference-sensitive clauses always preserve visibility. Existing legacy_unknown authorship may qualify only with no positive edit evidence; missing/invalid authorship is still uncertain. Never manufacture metadata. Expand anchored Chinese/English continue/start/retry/regenerate productions; unknown expressions abstain.

Bump policy/rules versions for resumable re-evaluation; keep filterVersion and Source/Input/deletion/revision/time/import semantics. Semantic spike uses synthetic inputs only, no runtime provider/model/network/permissions; no general importance or memory judgment. Fixed adversarial set has priority over coverage. Synthetic coverage is not actual coverage or a statistical population precision guarantee. Do not claim the real-reading product target achieved before a separately approved real rollout.

---

# v0.6.1.1 Smart Filter Diagnostics — implementation contract

Independent branch from frozen f3fa0e7; no daily deployment. Repair historical queue initialization, add resumable bounded background processing and Settings-only numeric/enum aggregate diagnostics plus low-frequency recovery. Light rules/provider/presence algorithms remain byte-identical. No Source/Input/time/revision/import changes, new permissions/network or semantic/Thought work.

Counters: active = checked + pending; checked = keep + filter + uncertain. User protected is a subset of keep, failed a subset of pending. Filter counts represent valid Light decisions even in Off, so Off retains decisions. Removed/branch inputs are excluded. Aggregation scans bounded pages, yields between them and rejects mixed-mutation samples; responses contain only an explicit numeric/enum allowlist. No bodies/titles/URLs/identities/hashes in diagnostics. Last check is a task timestamp, never source time.

Repair adds diagnosticsVersion=1 inside existing Smart Filter metadata; incomplete and incompatible historical decisions are automatically queued, including v0.6.1 rows mistakenly marked done without evaluation. User protection remains keep. Worker processing yields between batches, persists pending/failure state, resumes on worker startup and accepted activity; Settings polling keeps progress observable. Recovery repairs only missing/stale/failed work and never clears valid cache. No reading-page controls.

Acceptance: tests for legacy migration enqueue, restart/failure recovery, counters, recent list/empty state, Off/cache, protected input, sanitized responses, permissions/network and isolated synthetic Chrome. Never claim private runtime verification.

---

# v0.6.1 Smart Filter — approved implementation contract

Independent worktree based on frozen 01a6350. No daily deployment or database access. MVP Light (default) / Off; deterministic complete-utterance high-precision filtering, provider-neutral classifier contract and adversarial benchmark. No semantic model is required or installed. No Organizer, Memory, Standard/Strong, new export provider, permissions or network.

Capture saves immutable Source and editable Input first. Minimal trusted attachment/reference presence metadata contains only enums and confidence, never attachment bodies/names or assistant text. Unknown legacy attachment/authorship evidence remains visible. AI-filtered, user-removed and source-tombstoned are independent. User edits, explicit keep and restores permanently protect Input, including undo back to original and same-source recapture. Filtering never changes source/time/content revisions or import checkpoints.

Default reading hides valid decisions using a per-document safe snapshot; late results cannot remove visible text during editing, autosave, focus changes or pagination. Full-text search includes every non-user-removed Input including filtered text, labels search hits subtly, and opens temporary context without granting keep. Settings owns mode and recent-filtered browsing/restoration. Upgraded nonempty archives receive one weak home-only notice consumed once; fresh installations do not.

Migration uses additive indexed stores and resumable batches, retains old logical schema6 and all v0.5.1 stores. Filter workflow/policy/classifier versions and content/presence versions invalidate cached decisions conservatively. Failure/unknown means keep; queue work is bounded and never blocks capture correctness. Filter visibility changes do not remove or rewrite existing Thoughts. Future candidate/context-only access is internal and respects removals/purge.

Tests: lossless upgrade/restart, keep latch and undo/revision, search/context, lifecycle precedence, cached incremental work, late commits, fixed snapshots, one-time onboarding, unknown metadata, adversarial affirmative/choice/constraint/poetry/reference cases, 1k/10k/100k migration/query/evaluation, trusted-context security and zero network. Real Chrome scope is isolated synthetic, never private live evidence. Record benchmark precision and coverage separately; no unearned confidence claims from duplicated fixtures.

---

# v0.6.0 IA Refactor internal — verified implementation contract

Acceptance complete: 470/470 automated checks and isolated visible Chrome acceptance pass (see TEST_RESULTS.md). Daily installation and user IndexedDB are unchanged. This isolated worktree implements the approved Information Architecture. Primary navigation is Input Archive (default), Thought Library, AI Memory. Existing Library documents and blocks become Input Archive without rewriting source facts or authored fields. Source Records remain immutable to editors and are accessible through a source side panel and Settings > Data. New Thought Library starts empty with “尚未整理思想内容”.

Input is a continuous editable conversation document: weak date separators, small light-gray sending times per input, direct title/body edits, autosave, undo/redo. Empty text remains an active empty block. Only explicit whole-block removal changes membership; a persistent source suppression marker prevents recapture/import revival. Filtering policy is separate and disabled.

Revision policy: retain all revisions within 90 days and at least the latest 20 important revisions per entity. Baseline, removal, restore, significant edit, and future AI update are distinct important revisions. Ordinary input coalesces within 60 seconds. Permanent source purge deletes affected revision payloads and wins over all restore/undo paths. Independently authored content is preserved detached; a source purge is not a purge of all independently authored text.

Thoughts have topic/type categories, input-version dependencies, editable text/title/notes, user protection, freshness and dependency integrity. provenanceType supports input_derived and user_created (empty inputRefs allowed only for the latter at creation). No UI creation, Organizer, filtering, generated classification, Memory access, MCP, network, new permissions, sync provider, or multi-device feature is added.

Migration adds an IA schema marker and auxiliary stores; existing blocks/documents remain the physical Input storage for lossless compatibility. Migration is resumable in batches, adds no permanent raw backup, and initializes baseline revisions. Physical IDB version 3 blocks v0.5.x runtime downgrade. Existing v0.5.1 import stores and schema gates are preserved. Daily installation and its IndexedDB must not be opened or changed for acceptance: use isolated Chrome and synthetic data.

# v0.5.1 Official Export History Completion — schema-neutral foundation

本轮开发统一“一键同步”面板、本次文件授权、ZIP/JSON 安全流式读取、ImportCoordinator、后台批事务与恢复。来源适配与基础设施分离；未注册真实验证的 export adapter 时，只能完整检查容器/JSON，显示“格式尚待验证”，不能提交用户档案。Synthetic adapter 仅存在 tests，不打入产品。当前已安装 v0.5.0 不更新。

导入与页面自动捕获使用独立授权：暂停捕获不撤销本次文件导入，暂停导入也不更改长期 capture Settings。预检不持久正文；逐批事务原子写 checkpoint、档案/索引/来源事实。已有 Library 编辑始终保留；非 current 或 ambiguous 默认内容放入明确标记的待整理区，不混入普通连续文档。后台与 UI 双重格式门禁，内容脚本不能请求导入。

# v0.5.1 初始需求记录（实际实现状态以上方及 HISTORY_COMPLETION.md 为准）

统一入口“一键同步”，Thought Library / Original Archive 窗口列表均可进入；空库 CTA“补全历史输入”。面板显示“补全 ChatGPT 历史 / 可用”和“多设备同步 / 即将支持”，但只有正式导入能力真实验证后才标记可用，不声称自动从服务器拉取。只在本地处理用户本次同意并主动选择的官方导出文件。

冻结 3cbd0ee 的 IndexedDB、捕获、Original Archive、Library 编辑/排除、permanent ignore 及现有时间语义。新增通道严格遵守 Sync enriches facts; it never resets user work。历史正文只进入 Original Archive，人工 libraryText/userTitle/note/excluded 不重建；关系不明确的可靠 user 来源保留原文，但不能无提示拼接进普通连续思想文档。原始 ZIP、混合 JSON、assistant/附件正文与账户资料不持久保存。

详细接受规则、事务设计、暂停恢复、冲突及实际状态以 [HISTORY_COMPLETION.md](HISTORY_COMPLETION.md) 为本阶段契约。以下旧阶段“无导入”描述仅表示 v0.5.0 实际能力。

# v0.5.0 Storage Foundation — 验收通过

基线 7af4c0e / checkpoint-before-storage-v0.5.0。只升级本地存储。IndexedDB 分记录保存原文、Library、时间证据和墓碑，local 只控制状态。分页查询，搜索保持既有标题/正文/备注包含语义。编辑仅改相关实体，原文/捕获时间/时间仲裁结果不变。Sync enriches facts; it never resets user work.

迁移冻结写入、备份旧 schema5、分批复制、逐字段校验、封存旧入口、激活新库；崩溃按持久状态继续。迁移安全副本仅供激活前恢复，激活清除。激活后不支持直接降级 v0.4.1。History Completion、sourceRelations/importCommits、多设备和最终大规模备份均不在本阶段。未来统一入口“一键同步”，首次 CTA“补全历史输入”。

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

---
# v0.4.1 internal — 连续文档工作区

基线 1c8a81f / checkpoint-before-v0.4.1。三个一级入口固定 Thought Library、AI Memory、Original Archive；Settings 在底部。两层都先按真实聊天窗口列表，再进连续文档。共用 userTitle，originalConversationTitle 独立且不受用户/AI标题覆盖。Library 标题和正文直接编辑并自动保存，当前文档会话 Undo/Redo；保留 source/time 边界，不拖动、重排或合并来源。日期自然分隔，时间小字号低权重，正文无卡片边框和成排操作按钮。Original Archive 原文只读；来源信息、排除与永久忽略仅低频上下文操作。

schema5 迁移保留 raw、原文/时间、所有 Library 编辑/备注/排除、稳定来源墓碑与去重。Settings autoSave=true、permanentSourceIgnore=true、联动删除=false 且本版不可开启；未来联动只能明确整 source 删除触发，普通字符/段落编辑绝不触发永久删除。旧 hidden/trash 仅一次性 Legacy Data Migration 入口，全部处理后消失；不新增隐藏/回收站产品操作。AI Memory 不变，AI规则仅预留。

保持 adapter/content/SourceTimeResolver/2MiB响应预算、capture/enrich/purge 的来源删除算法不变。新增 UI 编辑事务需后台串行、修订冲突保护与写失败保留草稿。原文删除不能被迟到编辑或撤销重新引入。所有自动回归由代理完成，再用现有 internal popup 自助 reload 和真实 Chrome 验收，不交用户机械测试。真实成功前不得正式打包或宣称完成。

## 编辑与状态

schemaVersion=5，conversations 为跨两层共享标题目录，userTitle 独立可变，originalConversationTitle 继续从原始来源保留；library.documents 保持兼容引用。每个 Library block 的 revision 与 provenanceSignature、每个标题的 titleRevision 用于多页冲突检查。后台单事务校验整批修改，编辑请求只允许 libraryText、note、excluded 和 userTitle，不能提交来源身份、原文或发送时间。

编辑状态为读取→就绪→修改→保存中→已保存；写入失败保留当前草稿并允许重试，版本冲突保留草稿并阻止覆盖，明确重新读取才丢弃本地未保存修改。停止输入约750ms保存，持续输入约3秒提交一批；输入法 composition 不拆开提交。跨 block 选区删除由一个事务提交，部分正文修改仍是编辑，整条清空/移除才进入排除；没有原文联动删除。

Undo/Redo 只保留当前文档会话，最多50个事务或约2MiB编辑历史预算，导航/重载后不保证保留。一次多 source 选区编辑按单次操作撤销，source/time 边界不可拖动或重排。外部永久删除来源后，相关缓存与撤销历史清除，剩余无关草稿保留；迟到编辑不能重新建立已删除原文引用。

Settings schemaVersion=1（settingsVersion）：autoSave=true、permanentSourceIgnore=true、libraryDeleteAlsoDeletesOriginal=false，均由后台锁定；timeDisplay 默认 date_and_time，可选 date_only/date_and_seconds；timeEmphasis 默认 subtle，可选 standard。aiEnabled=false、aiExecutionMode=suggest_only 固定，既有 classificationRules/filterRules/aiSuggestionStatus/mergedSourceIds/memoryAccessPolicy 仅预留，无 AI 执行。

原文永久删除继续复用 v0.4.0 的稳定来源 purge 算法；UI 内部先标记再执行永久删除，若持久化失败则显示失败，遗留标记交一次性兼容入口处理，不显示正式回收站。整来源的未编辑直接副本移除；已编辑或 merged 文本保留并解除被删关系。所有来源均删除时清除原来源元数据，保留用户整理及 userTitle，延续既有隐私语义。

以下旧版章节为历史记录；旧版本章节只作历史记录；当前存储架构以 v0.5.0、STORAGE_FOUNDATION.md 和 TEST_RESULTS.md 最新章节为准。

# 开发基础设施增量：受控 UI 自助 reload

本轮冻结 9918959 的全部 v0.4.0 业务与捕获代码。新增独立 internal 构建器，只在生成的 popup 内加入 “Reload development extension”；源码根目录保持 release 资源，不包含 reload 入口。开发按钮仅在自身扩展的顶层 popup、internal 构建标志、可信用户点击和当前 user activation 下调用 chrome.runtime.reload()。不添加后台命令、网页消息桥接、window.postMessage 监听、网络或权限；不访问正文或 storage。

开发候选与正式包分离：internal candidate 只需当前全量自动测试与审计；正式 ZIP 仍需当前运行时真实 Chrome 八项证据，且完全不含开发文件与按钮。reload 不卸载扩展、不清空数据，加载磁盘修改后需刷新已有 ChatGPT/档案页面。首次部署若当前 popup 未能读取新磁盘资源，允许用户只手动重载一次以安装该开发入口；以后由代理点击自助入口。

# v0.4.0 internal — Thought Library

本节优先于历史版本说明。v0.3.1 基线 79b2856 已由用户及既有报告确认真实 Chrome 验证；冻结 adapter/、content/、时间 resolver/record-time/history-time、dedupe 和网络入口。存储层仅新增三层迁移、Library 操作与稳定来源删除门禁。

Layer 1 Input Archive 是不可变事实层；Layer 2 Thought Library 是默认主页，以 platform + conversation identity 分组为 conversation document。保留 originalConversationTitle，userTitle 独立。摘要、分类/过滤规则、aiSuggestionStatus、mergedSourceIds 仅预留，不执行 AI。

schemaVersion 4：library.documents、library.blocks、classificationRules、filterRules；memoryAccessPolicy 默认 disabled。AI Memory 是从 Library 取授权上下文的访问接口，目前始终拒绝生成上下文，无第三份事实数据、外部调用或权限。

直接 block 的 libraryText 为 null，通过 sourceRecordId / originalTextReference 读取原文；编辑后 libraryText 独立持久化，editedAt 记录修改。note 独立保留。provenance 只含来源记录 ID。日期→时间→连续正文使用 sourceSentAt 升序，同时间 conversationOrder 升序，unknown 单列并只按 conversationOrder/稳定 ID 排列，永不以 capturedAt 排序或冒充发送日期。

schema 1/2 自动原子迁移到 4，raw records 保留；每条 raw record 创建可追溯 block，hidden/trashed 默认排除，editedText/note 优先迁移。已有 Library 不重建，不覆盖排除/编辑。刷新、worker 重启、再次扫描与迁移幂等。存储失败不发布半完成状态。

Library 移除只设 excluded=true / excluded_by_user，主动恢复可清除排除。Input Archive 回收站仍可恢复；永久删除时，以已有 sourceKey（SHA256(platform+conversation+message)）或明确身份生成最小来源墓碑：sourceIdentityHash、deletedAt、permanently_ignored。无可靠身份则拒绝永久删除。旧不可反推的内容快照墓碑保留兼容。

永久忽略同一源消息，包括其已归档快照与后来修改版本；不影响其他消息或聊天的同文记录。删除其 raw 私人字段及时间账本。单源未编辑直接 block 移除；edited/merged block 保留整理文字与用户备注，解除被删 sourceRecordId、originalTextReference、mergedSourceIds、provenance。无来源且无用户整理的空 document 清除。清除引用后不能查看已删除原文。

## v0.3.0 internal：统一 SourceTimeResolver

仅canonical用户消息的conversation identity + exact message ID可关联候选。DOM和response都产生候选，后台统一Resolver为唯一正式时间仲裁入口；capturedAt和originalText永远不改。支持chatgpt_dom、chatgpt_response_create_time；official_export与firstObservedAt只预留接口，本期不导入、不采集firstObservedAt，后者将来只可approximate且不能覆盖high/very_high。

容差1000ms（含边界）。两源有效且在容差内：使用response原时间，dom+response / very_high；只有一源：该来源/high；两源有效但差异超限：null / conflict，保留候选及来源状态；均缺失：null / unknown。无效/低可信输入不降级已有可靠候选。响应来源自身的旧持久阻断继续保留；拒绝的response证据不是有效候选，不能否决单独有效DOM，也不能降级已有high/very_high。两个有效来源之间的矛盾必须撤回正式时间，优先于v0.2.3的单源high保留规则。

DOM只检查已稳定通过canonical的user role自身、最多3层后代及最多3层带相同message ID且仅包含该role的祖先，后代扫描最多64节点，另查最多3个祖先，合计最多8时间值；不进入正文容器、编辑器、附件或其他role。接受明确data-message-created-at/data-message-sent-at，以及具有发送/创建语义标记的time[datetime]，title/aria-label仅接受完整“Sent at/Created at/发送于/创建于 + 含时区ISO机器时间”。无时区、人类日期、更新时间、正文内日期均不采纳；同来源多值冲突保守跳过。候选不直接赋值sourceSentAt。

新增矩阵与临时Chrome DOM+fetch→bridge→Resolver→store→archive UI全链路测试，覆盖同值/亚秒/几秒/大冲突/单源/无源/非法/错identity/assistant/重复ID/迟到/低可信。来源候选原值只留本地时间账本，档案仅额外显示安全状态摘要（来源存在性、一致性、最终日期/可信度，无正文、ID或精确候选timestamp）。不新增权限、网络、遥测。自动全通过后仅一次真实旧聊天smoke。

## v0.2.4 internal：结构历史响应正式契约

本轮只接通旧诊断已支持而正式 parser 遗漏的结构消息集合。other JSON 已在旧 URL 拒绝前旁路读取；分叉在解码后：fingerprint 识别未知命名数组/字典，正式只识别 mapping/messages 数组。统计不能还原 fingerprint #12 原始 JSON，合成 fixture 仅复现其 55 消息/5 user/3 exact canonical 的已知特征与契约缺口，不冒称真实 payload。

保留已知正式契约；另设严格结构入口：同源、HTTP/JSON/无重定向、非认证路径、512 KiB/5 秒旁路限制；根 object，明确合法 conversation_id 与当前聊天一致，有界深度4/节点128/键64，唯一集合2–64项，每项明确 author.role 和 ID 结构，user 的合法 ID 与 create_time 有效、update_time 合理，无重复 ID 冲突。非 user 只辨角色，不取其正文/ID/时间值。禁止正文、标题、顺序、近似日期匹配。投影仅在当前文档等待 exact canonical ID，只有 exact 命中后 resolver 才能进入后台写记录；无命中不得写时间账本。不新增网络、权限、UI 或其他产品功能。

先补 clean-install 浏览器测试：页面真实 fetch other 查询路径，本地响应55项，DOM仅3项，断言 observer分类、结构投影、正式3条时间、UI时间线、原文/capturedAt、assistant与重复排除。反例涵盖错聊天、缺时间、非法ID、零exact、超限和冲突，不从中间注入 metadata。全量验证后仅一次真实 clean-install smoke。

## v0.2.3 internal：legacy identity 最后一跳

修复 dedupe 命中后未补 identity 的路径；CAPTURE 与 ENRICH 共用精确来源解析。允许保留 sourceKey、聊天+消息 ID，或验证持久 dedupeKey == SHA256([当前 exact sourceKey, 已存 contentHash]) 的来源绑定证明；不读取旧正文或计算正文相似性。仅 order 的唯一位置不能跨懒加载/分支证明历史身份，仍 fail closed。缺失/null/unknown 时间均可在可靠证据下升级，原文/capturedAt 不变。metadata 已缓存时同次 canonical 扫描完成身份与时间补写，不要求重新打开聊天。

按本轮 F 要求，已保存 high 的发送日期不被后续冲突覆盖或清空；冲突账本仍阻止未知快照取得矛盾时间，不消除旧持久阻断。此规则优先于历史版本的 high 撤回说明。不新增 UI、权限或网络。

## v0.2.2 internal：分批旧历史时间回填

沿用 v0.2.1 正式链路，唯一范围为同一 conversation 的较老用户消息后续得到可靠 metadata 时，按 exact identity 补 sourceSentAt。最近 5 条先到、更早 15 条后到必须合并保留；两种 DOM/metadata 到达次序、懒加载、Worker 唤醒和 SPA 切换均自动验证。legacy 记录只从现存精确 sourceKey 或聊天与消息 ID 证明补缺失身份，无法证明则 unknown。enrichment 不改变 originalText、capturedAt；只补未知 conversationOrder，保留已确认片段顺序，不推断全会话序号。缺失/非法输入不覆盖 high，真实有效数值冲突仍失败关闭。

## v0.2.1 internal：正式来源元数据回填修复

用户真实 smoke 已确认历史正文可补录，但发送时间未知；这不构成 UI 文案问题。本轮只修复正式 backfill 生命周期，保留 v0.1.2 canonical、原文和 capturedAt。记录身份为规范化 chatId + sourceMessageId 及其 SHA-256 sourceKey；禁止正文、标题、近似日期匹配。

已通过 canonical 的最小 ID/顺序证明在当前已授权聊天文档中有界保留，晚到 metadata 使用独立元数据消息到后台补写现有精确来源，不要求消息仍在 DOM、档案页打开或重新传送正文。metadata 先到仍缓存到后续 canonical 保存；后台串行处理、重验来源/代次/时间。可信来源字段与用户编辑接口分离，unknown 时间/顺序允许升级；缺失、无效或容量不足不覆盖已有可靠时间，真实数值冲突及明确顺序/更新关系异常仍保守撤回。

正式缓存和读取生命周期与旧诊断 lease 分离；暂停/换聊天/换授权仍清空，诊断错误不清除正式证据。首次授权初始化前发起、授权确认后才返回的已有响应可在返回时建立旁路；返回时仍未授权的响应不读、不缓冲、不补请求。已有字段只允许依据当前 canonical 的精确来源证明恢复，身份矛盾或无稳定依据跳过。

## v0.2.0 正式历史时间与自动测试（当前规范）

本轮以 a603291 为基线；v0.1.3.2 已提供历史 JSON、user ID/create_time 与 exact conversation+message ID 匹配的业务证据，无需用户重复验证机制。保留 canonical 正文提取规则，不增加产品功能；诊断界面不再作为常规验收步骤。

正式快照新增 sourceSentAt（UTC ISO 字符串或 null）、timeSource（chatgpt_response_create_time / unknown）、timeConfidence（high / unknown）、conversationOrder（已确认 canonical 片段中的正整数顺序或 null）。capturedAt 永远是首次保存此正文快照的时刻，时间补录、刷新、worker 重启不覆盖；旧 schema 1 可读取并按未知时间补齐默认字段。相同来源的新正文独立快照，原文和原快照 capturedAt 保留。

被动历史响应通过现有同源、状态、类型、大小、授权门禁后，只投影明确 conversation identity、user message ID、数值 create_time/update_time 和固定无效标志。正式 adapter contract 要求明确消息集合、user author.role 和合法 ID；不以正文、近似时间或顺序猜身份。仅与已通过 canonical 的用户消息匹配；metadata 先到留有界文档内存，DOM 先到可先保存 unknown 再补时间。后台对字段、来源聊天、版本、同意代次与数值范围再次校验。

Unix 秒从 2000 年起、不得在未来；update_time 可缺失，存在则有效且 >=create_time、不得在未来。当前 canonical 顺序上的匹配时间无逆序；缺失/非法、同 ID 冲突、更新关系错误、schema 不合格不填正式时间。已出现的冲突/错误为保守失败证据，后台持久保存同一来源的固定阻断状态；发现后撤回该来源已有 sourceSentAt/high，避免刷新或 worker 重启抹去冲突。原文/capturedAt/备注不变。永久删除最后一份来源快照时清除该来源时间证据，保留原去重墓碑。

通过 contract fixture 的精确匹配时间标 high，表示符合当前 adapter contract，不是对 ChatGPT 私有接口永恒不变的保证。conversationOrder 只标当前已显示 canonical 片段顺序，保留首次确认值，不承诺跨分支或未加载消息的全局序号。时间线已知发送时间优先、按发送时间倒序，同聊天同时间用 conversationOrder；未知发送时间单列“发送时间未知”，不把 capturedAt 显示成发送日期。聊天组以确认顺序为主，未知顺序用已知发送时间和捕获时间作明确兜底。JSON/Markdown 导出包含这些正式字段，发送和捕获时间分开标注。

Fake ChatGPT 仅在测试中本地拦截公共 origin，所有路径/正文/ID/时间均虚构，扩展仍只匹配 chatgpt.com。独立临时未登录 profile，无远端服务、账号、Cookie 或 Keychain 访问；运行时无测试开关或测试后门。历史响应与 DOM 到达顺序、刷新/SPA/多聊天/worker 销毁重启均自动验证。以下诊断版说明为历史记录，本节优先。

页面开始消费原 Response 前同步建立合格历史与旧诊断的独立副本；旁路异步有界读取，互不等待，不延迟原 fetch Promise，不改变页面原响应的单次读取语义。

## v0.1.3.3 source time semantic validation（当前范围）

用户提供的 v0.1.3.2 真实安全统计：历史 candidate=true，消息 55，user 5，user 有 ID/create_time/可解析均 5，canonical 3，conversation identity + exact ID 匹配 3。已证实该样本存在可精确匹配的历史用户时间，尚未证实发送时间语义；不保留真实 JSON。

只扩展现有合格 other 历史候选诊断：user 的 create_time/update_time 与身份仅驻留文档有界内存。按当前 canonical 顺序验证全覆盖、时间存在/可解析、无逆序、严格早于本次诊断采集时刻、update_time 合理和同 ID 无冲突。JSON 字典顺序不作为会话顺序；至少两个可比较 canonical 消息才评定顺序。update_time 缺失/null 计为未提供；存在时必须是可解析 Unix 秒、>=create_time 且不晚于检查时刻。create_time 冲突及已见缺失/无效值保留本次会话失败证据。

本次诊断采集时刻固定于各 ID 首次通过 canonical 入口时（后续 CAPTURE 保存之前），只是本次采集的时间边界，不是旧档案已存 capturedAt 的读数。诊断不读取档案；无边界、无样本、匹配不全、不可比较或资源不足不得 high。

人工选择当前可见用户消息所属时期：today <24h、1–7天 [1,7)、1–4周 [7,28)、1个月以上 >=28天，按距检查时刻的时长。全部匹配消息落入所选桶才通过；跨时期聊天不能用创建日期替代可见消息日期。选择只存在诊断 UI 内存；刷新、切换、暂停、多标签失去资格、canonical 集合/顺序变化后清空。

仅当当前样本全部自动业务校验与人工时期比对通过，显示 timeSourceCandidate=chatgpt_response_create_time、timeConfidenceCandidate=high。它不证明跨刷新逐 ID 稳定；不写 sourceSentAt，不改 capturedAt、正式模型、时间线或 canonical 捕获。输出仅固定状态/计数/粗时间桶，无正文、原始 ID/URL、JSON、精确时间戳。以下仅为旧版记录，本节优先。

## v0.1.3.2：other JSON 结构指纹诊断

用户真实结果：观察 118 个响应；旧聊天类 0，发送类 1（ROOT_NOT_OBJECT），other 117（含 URL_SHAPE_NOT_ALLOWED 的同源合格 JSON）。这不能证明旧聊天没有历史元数据。本轮仅对已授权、后台确认单个活跃普通聊天、同源/HTTP 合格/无重定向/明确 JSON 类型的 other 响应增加独立诊断。URL 查询参数不再阻止此诊断分支，但不改变正式会话响应的接受条件。

副本读取最多 512 KiB、5 秒，最多一个指纹读取任务；结构深度 <=4、对象节点 <=1000、每节点键 <=64、候选消息 <=200。只输出固定字段的布尔/计数、根类型、集合尺寸/深度；不输出任意原始键或值。最多 12 个内存指纹组，超限明确计数；截断时不能确认历史候选。只有明确集合中多个消息具备 role/ID/create_time 结构才标 historical_conversation_schema_candidate；其用户 ID 与明确的同一会话 identity 仅在文档内存用于 canonical 精确匹配，绝不加入原 response metadata 接受集合或写入记录。

刷新、切换、暂停或失去单标签诊断资格即清空指纹与临时匹配身份。不新增请求/XHR/权限，不读凭证/请求头；沿用现有响应 content-type/长度的内存分类和字节计数，不保留头值。真实结果仍待用户 Chrome 反馈。

## v0.1.3.1：响应结构拒绝诊断（当前阶段）

用户真实反馈 canonical=2、response metadata=0、匹配=0、接受=0、结构拒绝=1、超限=0。只能说明候选响应处理失败，尚不能确定是 content-type、clone、JSON 或 schema 阶段，也不能否定历史时间方案。

本轮只增强安全诊断，响应 endpoint/格式/字段接受规则与 v0.1.3 保持一致；不支持未知 SSE/RSC 结构。按 conversation_load_candidate、message_send_or_stream_candidate、other 分开计数并保留各类最后一条安全摘要。阶段分别报告是否尝试、是否通过；未执行不伪称失败。仅已通过原 URL/状态/类型门禁的副本才解析；拒绝后的探测只检查原有明确字段路径、最多 2000 项，不遍历未知 JSON 或读取正文。

旧聊天恢复是主要目标；发送响应没有完整元数据只表示该样本无可用来源。firstObservedAt 仍仅为近似观察语义，本轮不新增记录字段或近似时间存储。版本 0.1.3.1 diagnostic，保持 canonical、正式记录、时间线、权限与网络边界。

受控按钮独立检查：未点击的“未开始”属正常。若发现传递失败，单独记录并验证，不能通过放松响应 schema 修复。用户已确认点击后曾显示“已开始”；本轮保留控制链路，并用既有按钮集成测试再次验证。

## v0.1.3 response-time diagnostic PoC（本轮范围）

保留 v0.1.2 canonical DOM 捕获、去重、记录和时间线；不写 sourceSentAt 或修改 capturedAt。新诊断仅内存：MAIN 在 document_start 包装原 fetch，原参数/Promise/Response 保持，不新增调用，不读请求体、凭证或请求头。只旁路解析严格路径及结构白名单的有限响应；整包解析可能短暂接触 assistant 字节，但不提取、传递、保存其正文。授权前/暂停/临时聊天不解析；切换、刷新清空映射。

仅 conversation identity + exact message ID 与已通过 canonical 检查的用户消息匹配。单独诊断页只呈现白名单计数、粗粒度年龄、精度和受控差值；不读档案记录。受控按钮以当前 canonical ID 为基线，仅统计之后出现且来自按钮后开始的发送响应的候选；无法证明真实新发送时标为候选，不能将旧消息初次出现冒称发送。所有判断尚待真实 Chrome 验证。

严格区分观测与结论：刷新销毁 ID/时间映射，因此仅对比刷新前后计数/年龄不能证明逐 ID 时间稳定；该验收项保持未验证，不暗存时间指纹。timeSourceCandidate=chatgpt_response_create_time；high 为后续验收通过才可采用的候选可信度，本 PoC 不自动授予。无原始时间值跨刷新持久化。

# Personal AI Input Archive v0.1

## 已确认新要求：历史补录与原始发送时间（待调查后实施）

打开旧对话时继续自动补录当前已加载、已显示的用户消息，这是预期功能。未来每条记录须严格区分 sourceSentAt（原始发送时间）与 capturedAt（首次本地保存时间）；主时间线优先原始发送时间和聊天内确认顺序，capturedAt 只用于审计/诊断及最终排序兜底，不冒充历史发送日期。

在真实 DOM 时间来源获得证据前不迁移模型或改排序。未知历史时间须为 null/unknown；firstObservedAt 只有近似观察语义，不得替代 sourceSentAt。调查状态、受限属性诊断要求、模型及排序建议见 TIME_METADATA_INVESTIGATION.md。该报告明确区分“未采样”与“真实页面不存在”。以下 v0.1.2 信息模型和界面部分仍描述当前实际实现，尚未满足新时间线要求。

## v0.1.2：user role 自身 ID 作为消息锚点

用户的 v0.1.1 真实反馈为 user role=3、可见=3、role 自身合法 ID=3、合法 turn=0、editor 通过=0、候选=0，确认旧 article conversation-turn 要求阻断后续捕获。仅移除此项硬性依赖：消息仍须为 main 内可见的 user role，自身 data-message-id 符合原有格式；祖先/后代 ID 继续只诊断，不用作兜底身份。

旧 turn 存在时继续用它检查可见编辑控件及 busy；没有旧 turn、role 自身 ID 合法时，以该 role 为编辑检查范围。编辑控件选择器、可见性、编辑祖先排除、正文选择器与过滤、唯一容器、稳定窗口、路由身份及去重规则均保留。正文始终仅从该 role 的受限子树获取，不扩大到新包装节点或页面正文。未知的页面编辑布局仍需真实手工验证。

结构诊断继续显示合法 turn 数，0 不再必然阻止捕获。沿用诊断 schema 1；为兼容保留 `visible*InTurn` 字段名，其计数范围由行内 `turnFound` 与 `editorCheckAvailable` 确认：有 turn 为旧 turn，否则为已确认的 role 子树；不可检查时计数为 0，UI 明确标注范围。非忙碌通过数同样不再以 turn 存在为必要条件。

v0.1.1 的结构探测在候选筛选前执行，但 `editorCheckAvailable=Boolean(turn)`，并且 `editorPassed=Boolean(turn) && ...`；turn=0 时未查询 turn 内编辑控件，editor 通过数必为 0。不能据此声称编辑器真实存在或 editor 已真实失败。v0.1.2 的实际捕获效果待用户手工验证。

## v0.1.1 结构诊断阶段（历史范围）

用户报告 v0.1.0 在普通对话中返回 ADAPTER_MISMATCH 且 0 条记录。此码同时覆盖 DOM 筛选无候选与内容脚本版本不一致，现有信息不足以确认具体 DOM contract 失败项。v0.1.1 先作为结构诊断版：保持既有抓取规则和 fail-closed 行为，不宣称已修复真实 ChatGPT 捕获。

诊断仅新增固定字段名对应的布尔值与有界整数：main 状态、user role 总数/可见数、合法 article turn、turn 标记祖先、role/祖先/后代上是否存在合法格式 ID、editor 检查、busy 状态、原始/安全正文容器数量及最终候选数量。逐节点明细最多 20 行，其余仅计数并标注截断；不保留节点引用、选择器原值、HTML、文字、URL、标题、ID 原值或内容哈希。探测其他 ID 位置/turn 标记仅用于诊断，不能成为新的捕获依据。

同一份白名单 schema 在内容脚本发送前、后台存储前、UI 展示前过滤；拒绝字符串冒充数值，忽略额外字段。未同意、暂停、临时聊天和身份不明的页面不做消息结构探测。档案页显示可手动选中反馈的安全摘要，弹窗显示结构概览；不使用剪贴板 API、不导出诊断文件、不记录控制台日志。版本不一致使用独立固定错误码。收到结构摘要并确定失败规则后，才补充对应真实结构的虚构 fixture 并修改适配器。

诊断不得被发送节流掩盖：相同错误码下结构计数变化应及时更新；同次扫描既有可保存消息又有超长消息时，保存完成后仍须显示 MESSAGE_TOO_LARGE 及结构摘要。最终候选数量是结构筛选结果，不代表已持久保存数量。

## 目标与边界

把自己在 ChatGPT 中已经发送并显示在页面上的文字留在本机，供日后检索整理。仅支持桌面 Chrome 114+ 的 https://chatgpt.com；不抓取历史接口、不自动滚动、不读取 AI 回复、草稿或附件。

首次打开弹窗时保持关闭。完整知情说明与未预选复选框位于独立档案页，用户勾选并点击启用后才开始读取消息。启用和恢复后会扫描当前已加载、已显示的普通聊天用户消息，因此可能包括过去发送或暂停期间发送、恢复时仍显示的消息。暂停是停止捕获，不是按发送时刻划定永久排除区间。捕获时间不是服务端发送时间。

Temporary Chat、带临时聊天 URL 参数的页面、缺少持久聊天 ID 的新聊天首页一律跳过。等待普通聊天生成 /c/<id>（含 GPT 路径）后才扫描。结构不明时跳过，不退化为抓取整页文字。识别属于页面 DOM 启发式，必须完成真实网页手工验收；平台改版可能造成漏捕，诊断提示用于发现问题。

## 信息模型

每条不可变快照：id（随机 UUID）、platform=chatgpt、chatId、chatUrl（仅规范路径，不保留查询/片段）、chatTitle、sourceMessageId、pageOrder（当次页面所显示用户消息的 1 起始序号）、capturedAt（ISO 时间）、originalText、contentHash（SHA-256）、dedupeKey。

附属可变字段：note、editedText、hidden、deletedAt、updatedAt。原文字段从不在编辑接口内。ChatGPT 内编辑已发送消息时，如来源 ID 相同但内容不同，保存另一个快照，旧原文保留。同文不同消息 ID 为两条记录；同聊天同消息 ID 同哈希重复只记一次。页面序号仅说明捕获当时已加载页面中的顺序，不能承诺所有历史消息的绝对顺序。

移入回收站保留内容，可恢复。永久删除移除正文与元数据，保留不含正文/标题/URL的哈希墓碑，防止刷新又收回同一快照。永久删除不可恢复；哈希不等于加密，墓碑只用于去重。

## 页面与交互

- 弹窗：默认关闭/捕获中/已暂停，未删除记录总数（含隐藏）、打开档案、暂停/恢复、精简诊断。
- 档案：左侧时间线/按聊天/隐藏/回收站；关键词匹配原文、标题、备注、整理版；列表选中后完整只读原文和独立备注/整理版编辑区。
- 默认列表排除隐藏与回收站；隐藏区可以取消隐藏；回收站可恢复或二次确认永久删除。
- JSON/Markdown 导出当前筛选结果，点击前显示数量及范围，回收站导出禁用。JSON 包含原文和所有记录字段；Markdown 清楚分开原文、整理版和备注，正文安全包裹为纯文本代码块。
- 诊断：全局最近一次扫描状态/时间、最近错误代码/时间、适配器版本、扫描/新增数量、存储用量；不含正文、标题、聊天 ID/URL。

## 实现契约

Manifest 仅 storage 权限，静态内容脚本仅匹配 https://chatgpt.com/*、顶层、ISOLATED。后台 ES module 是唯一写入口；chrome.storage.local 仅 TRUSTED_CONTEXTS。扩展页 CSP 禁止网络连接/远程资源。无主机网络权限、无下载权限、无外部通信接口。

内容脚本通过 runtime 消息查询状态，启用才执行独立 ChatGPTAdapter；MutationObserver 加节流扫描，并周期核对状态/URL，后台在写入前重验同意状态与会话代次，拒绝暂停或旧授权周期的迟到消息。存储串行读改写，以单一状态对象原子 set 持久化正文与去重信息；失败保留先前状态并明确报错，不宣称保存成功。

不申请 unlimitedStorage，接近本地配额提示导出/清理。无自动云备份、导入、加密、全文索引、AI 整理或跨平台支持。第一版搜索/存储采用简单本地集合，适合个人小型档案。

## 验收

所有用户要求以 TEST_PLAN.md 为准。合成 DOM/存储测试只能证明测试条件下的行为，不能证明当前登录版 ChatGPT 的 DOM 兼容性。正式可用前完成手工清单。

## 开发兼容性工作流（取代逐版本人工 smoke）

仅开发包提供脱敏结构Sampler与四项Compatibility Self-Test。一次真实样本经隐私扫描成为Golden，后续代码修改均离线全链路回放；只有真实结构疑似更新或正式release前运行一次自检。未取得真实样本时明确UNAVAILABLE。正式SourceTimeResolver行为不变；开发采样不请求网站、不读取登录数据。具体格式/边界见development/compat/README.md。

## 当前真实 Chrome 调试（取代独立采样验收）

用户授权通过电脑控制现有已登录 Chrome 自行验证、重载并迭代；不再要求 sampler/QA 登录或人工 smoke。2026-09-06 实测：旧聊天历史 fetch 来自 `/backend-api/conversations/{id}`；现有 provider 在读取 540672 字节时触发 other JSON 的 512 KiB 上限，未到 JSON decode。只为同源、当前 conversation exact endpoint 提供 2 MiB 有界读取额度；一般 other JSON 仍为 512 KiB，身份/结构/time contract不放宽，不增加请求/权限。临时探针仅输出计数和时间/已有内容哈希，不导出正文或整个档案对象；完成后去除。真实旧聊天的 3 条 canonical 用户记录已恢复历史发送时间；刷新、重复打开和正式档案 UI 验证通过，capturedAt 与已有内容哈希不变。临时探针及显示遮蔽已移除；详情见 TEST_RESULTS.md。

## M2 manual Library Documents

A user may write independent content before choosing a Topic, or write directly within a Topic's persistent default Section. Topic summaries, natural Section headings and shared Entry bodies form a continuous document. Manual rename/pin/merge/membership/order, direct editing, local literal search, deleted-content management and revision restore are available. No AI Organizer button or execution is introduced. See [M2_LIBRARY_DOCUMENTS.md](M2_LIBRARY_DOCUMENTS.md) for the implemented boundaries and [outputs/v070-m2-acceptance.md](outputs/v070-m2-acceptance.md) for final evidence.


## M2 UI polish scope

From approved `48b3405`: quieter reading chrome only. Entry/Section actions appear through keyboard-accessible hover/focus ellipsis; expanded note/provenance stays open. Topic creation stays prominent; pin/merge/history move to its menu, Undo/Redo stays available by shortcut with subdued editing-only buttons. Library maintenance and removed content move to Settings; unplaced content remains an ordinary Library filter. Source status uses natural language, technical versions sit inside advanced details. No schema/model/background/storage semantics, Provider, daily installation or M3 changes. Validate existing M2/Input regressions plus isolated synthetic visible Chrome reading/menu/focus/settings/provenance tests and screenshots; finish a separate local polish checkpoint.


## v0.7.0 M5 final acceptance

Foundation data/UI and Organizer mechanics passed final integrated acceptance. Real Organizer intelligence is not connected; production provider registry remains empty. Only synthetic isolated Chrome validation is authorized. Dedicated Foundation artifacts use version 0.7.0, while the source manifest retains the frozen compatibility harness version. Release-structure packaging removes internal diagnostic UI and response diagnostic arming without changing capture, storage, filtering or import semantics. No daily installation or network permission changes. CLOSED / FROZEN requires the final report and all gates.

M5 final: 668/668 tests, 0 failed, 0 skipped. See `outputs/v070-m5-acceptance.md` and the final checkpoint `checkpoint-v0.7.0-thought-library-foundation`. Dedicated internal/release-structure artifacts use `scripts/build_foundation.py`; they are not deployed to the daily installation. Thought Library data/UI foundation complete; Organizer mechanics complete; deterministic/mock full-chain validation complete; real Organizer intelligence NOT yet connected.
