## v0.11.1 reading closure

See [READING_CLOSURE.md](READING_CLOSURE.md) for the reading contract, reproduced root cause and acceptance evidence. No new network or Provider capability.

# v0.11.0 — selected behavior

Production uses the same lexical relevance ordering with invocation-local query preparation. No embedding/model/vector store or new API path. Low coverage and incomplete scans are explained in Preview; unknown queries remain empty. See INTELLIGENCE.md for benchmark evidence, rejected alternatives, reproduction and limits. Tests run headless via PAIA_HEADLESS=1; historical test names/receipt fields saying visibleChrome do not override this run mode.

# v0.11.0 Intelligence evaluation

See INTELLIGENCE.md for the frozen benchmark, decision gates and evaluation scope. No private benchmark data, paid requests or automatic AI retries. Existing storage and authorization contracts remain unchanged.

# v0.10.1 AI Context Quality

本轮契约见 [AI_CONTEXT.md](AI_CONTEXT.md)。所有 Context 检索与分享准备均为本地零 API；新外部总开关不影响备份与授权保留。验证：固定 60 Topic / 1200 Entry / 240 query baseline 对比、currentness/去重/预算、权限/迁移/备份、many/deep 分布、合成 Chrome journeys 与完整回归。

# v0.10.0 AI Memory MVP

v0.10.0 Memory 新增元数据授权/本地检索。用户显式点击 Copy 时仅写剪贴板，不读剪贴板；显式 Markdown 导出。临时权限仅 session；所有分享前重新校验拒绝/排除、删除和版本。没有新网络/权限、后台请求或正文缓存数据库。详见 AI_MEMORY.md。

# v0.9.2 隐私与部署边界

本次无新增 manifest 权限、host、网络路径、遥测、同步或 Provider；AI 只沿用明确点击授权的 DeepSeek 请求。API Key 保存在 chrome.storage.session，不进入 local、IndexedDB、备份、导出或日志。默认 Thought 正文与 capture 的 Source-only 约束不变。

完整性检查使用本机只读分页事务，UI 只接收类别、数量、进度和临时检查会话 ID；不返回记录 ID、正文、Key 或响应。检查不触发过滤、Organizer 或自动修复，数据 generation 变化使旧结果作废。

搜索排序/高亮、编辑生命周期、撤销、版本预览和 Settings 按需读取均无模型调用。幂等保存回执仅含请求摘要与结果，不另存正文。Provider 输出失败保留旧结果，未知结果不重发。导入/备份文件流关闭时释放 reader，下载 URL 限时撤销；不保留原始导入文件。

验收只在临时独立 Chrome 使用虚构数据/模拟 Provider，未读取用户 Profile、私人 IndexedDB、真实导出或凭证。日常部署只覆盖用户指定的精确扩展文件目录，保留路径/身份，不卸载、不清库、不自动重新加载用户扩展。实际权限/网络与构建证据见 [V092_ACCEPTANCE.md](V092_ACCEPTANCE.md)。

# v0.9.1 本轮隐私边界

没有新增权限、网络端点、后台自动 AI、自动重试或事实数据库副本。所有新提示使用白名单状态码与固定文案；技术统计只在高级区。原有用户明确授权的单次/有界 DeepSeek 请求流程不变。

待确认归属只调整 Input 的工作文档与索引，Source 身份、正文、时间及 provenance 不变；移除、永久墓碑与重复导入保护持续有效。最后一条 Input 移走后，原始聊天的 Source 仍能读取；随后隐藏、恢复、永久删除时其文档索引同步更新。排序只增加既有控制元数据的可选偏好，无 schema 升级。

测试只使用合成导出、虚构正文与 deterministic Provider。交付仅覆盖已授权日常 unpacked 文件夹的已核验代码资产；不访问私人 IndexedDB、真实 Key、用户 Chrome profile 或其他导出文件。

# v0.9.0 主动历史文件读取

仅在可信扩展页、用户本次明确同意并主动选择 ZIP/JSON 后读取该 File。关闭/重选/暂停清除授权与文件引用；重启后必须重新选择同一文件。文件仅本机流式解析，不上传、不扫描目录，不读取浏览器配置、Cookie、Keychain、下载目录或其他文件。ZIP 路径仅在内存校验，不落盘解压。

只持久化可靠 user 文字与必要 Source 身份/时间/分支证据。JSON 键顺序未知时，单节点候选文字只在有界内存短暂等待角色判定；确认非 user 立即丢弃，已知非 user 正文不物化。预检只保存哈希、计数、时间/关系证据与断点，不保存 assistant/tool/system 正文、文件名、完整导出或原始错误。导入调用网络次数固定为零；DeepSeek 仍只受现有显式整理授权控制。

# v0.8.1 隐私与有界授权

权限、唯一 DeepSeek 域名与 CSP 均保持 v0.8.0 不变，没有遥测、新 Provider 或额外网络。捕获、阅读、搜索、主题管理与备份均在本机进行。备份读取仅限用户主动选择的文件；校验和预览不写入正文，恢复必须明确确认。API Key 不进入备份、诊断或 Git，仍只在 Chrome session storage 保存。

单次普通更新最多一次请求。连续整理需要独立的本次授权：Original 最多 5 次 / 50 条 Input，AI 最多 3 次 / 3 个主题；错误、部分结果、取消、未知结果和重启均不得自动续跑。后台在预算保留和内容提交的同一事务内验证授权上限及进度。

AI prompt 增加的时间信息仅为当前必要 Entry 的表达时间及 source/capture/created 基础，不包含来源 URL、聊天标题或请求头；用于区分当前判断和可能演变。Body 出口仍是既有 InputProjectionGateway / 受限 Topic Entry DTO。JSON 结构和证据验证不能替代对模型语义质量的真实验收。

导出排除本机当前已永久删除的来源，恢复同时检查备份和目标库墓碑。扩展无法回收已下载的旧外部文件，也无法在全新数据库中获知另一个已删除数据库的后续墓碑，详见 BACKUP.md。首版恢复仅空库、64 MB 上限。v0.8.1 无破坏性 schema 迁移，不额外复制私人数据库。

本轮只用合成数据、临时 Chrome 实例和确定性网络响应。日常部署只覆盖指定 unpacked 程序文件，不重载日常扩展、不读取或删除其 IndexedDB、不使用真实 API Key。

以下为旧版本记录；与 v0.8.1 不同处以上述契约为准。

# v0.8.0 隐私与网络边界

保留已有 `storage` 权限、唯一 DeepSeek host permission 与 CSP origin；未新增网络、权限、Provider 或遥测。只有受信扩展 UI 的明确更新点击才能经后台发送一次请求。保存 Key、显示状态、切换缓存和后台重启不调用 Provider。

Original 出口仅为当前合格 Input working text/本地 span 分类数据，以及至多 8 个本地检索出的主题名称和章节名称。AI 出口仅为一个受影响 Topic 的合格默认 Entry 变更、必要旧 AI 缓存和无正文 delta 元数据。相关性评分、候选 Entry 摘录只在本地短期内存计算，不建立重复正文数据库或新 durable 搜索索引。

发送门禁排除已移除、tombstoned、失去来源的 Input/Entry 和无关主题。Source Record 正文、AI 回复、草稿、附件内容、URL/标题来源元数据、真实 API Key 与原始 Provider 响应不进入诊断日志。Source 时间元数据仅用于本机时间阅读；Source 正文不送模型。Key 仍仅保存在 `chrome.storage.session`。

AI 派生缓存和独立版本建立来源索引；来源不可读时隐藏旧缓存/相关版本，删除清理会移除生成内容。人工保护字段保留为不可自动覆盖的本地草稿，不作为删除内容复活通道。日常部署只覆盖用户明确授权的固定 unpacked 路径，不读取或迁移真实 Chrome 配置、IndexedDB、私有正文或凭证。

本轮自动与 Chrome 验收全部使用人工构造资料、deterministic HTTP fixture、全新临时浏览器配置以及网络拦截；真实付费请求数为零。

---

# v0.7.2c AI Experience MVP — current authorization

Thought Library now uses Topic blocks and an AI presentation display switch. Only an explicit AI update sends one bounded Topic request; toggle/startup/rerender never send. Source/Input/Original bodies and organization remain unchanged by AI updates. Derived evidence, protected fields, session credentials and cost gates are mandatory. This supersedes earlier no-AI-presentation/dual-tab plans. Full behavior and evidence: [AI Experience MVP](AI_EXPERIENCE_MVP.md).

---


## v0.7.2b Original Organizer completion (2026-09-08)

Current authorization: Simple Original Runner only, at most five eligible Inputs and one DeepSeek Chat Completion per explicit user action. No automatic retry or continuation. Body is local working text or validated UTF-16 slices. Session budgets follow a trusted Chrome session marker; daily budgets persist. Network preflight checks trusted worker, exact granted host and CSP; credentials are omitted from cookie transport and redirects fail closed. Partial valid items commit atomically with provenance, organization, per-input receipts and progress. Unknown errors retain their phase and INTERNAL_RUNTIME_ERROR. No changes to Source/Input/Smart Filter/History Completion business semantics or AI synthesis.

Acceptance: expanded targeted/regression tests, a 20-Chinese-Input/four-batch synthetic chain, isolated Chrome success/failure/partial/retry/worker lifecycle, allowlisted internal/release packages and fixed-directory deployment. Synthetic HTTP fixtures are not evidence of live paid DeepSeek success.

## v0.7.2b Original Organizer

Production Original Organizer sends no connectivity test, health check, model listing, synthetic smoke, or second-pass request. One explicit action can send at most one bounded batch. Its local request ledger contains only opaque request/batch/action IDs, lifecycle state, input count, approximate bytes, provider/model, and timestamps; it never stores text, prompt, response, key, title, URL, or source/message identity.

The Simple Original Runner does not log request/response bodies and stores only safe status/count metadata plus opaque operation receipts. A malformed item records only its opaque request-local input reference and safe terminal code. The DeepSeek request is fixed to `POST https://api.deepseek.com/chat/completions`; no additional host permission or origin is added.

The DeepSeek key is held only in trusted-context `chrome.storage.session`, never in `chrome.storage.local`, IndexedDB, receipts, logs, or content-script messages. It survives an MV3 service-worker restart and is cleared when the browser session ends; disable and explicit clear remove it immediately. Before an Original Organizer request, PAIA locally narrows data to the post-checkpoint active, Smart-Filter-eligible Input delta from one conversation, subject to BudgetPolicy. A request contains only approved working text and the minimal affected Topic/Section candidate names. It never contains Source Records, original snapshots, assistant replies, user-removed Input, tombstoned sources, unrelated conversations, or the full database. Request audit records keep only task type, data categories, counts, approximate size, provider and model/version; no body or key is logged. DeepSeek returns classification and source spans; PAIA locally extracts every Library body from the approved working text. Provider failure cannot alter Input Archive or existing Thought Library content and leaves the work pending.

## v0.7.1 Dual View & Incremental Update

Delta Planner 仅在扩展本地保存 opaque Input revision/removal tokens、计数、关联 ID 和近似字节数；preview/UI API 不返回 Input 正文或 checkpoint 内容。原话视图读取现有 Input Archive/provenance，不复制到新的事实库。AI整理没有 production Provider、凭证、请求、遥测、host permission 或 network policy 变化；其更新按钮只计算本地 delta，不能发送数据或宣告 AI 结果。

## v0.7.0 M3 — Organizer Mechanics（本轮授权）

最终验收：664/664 自动测试通过，isolated synthetic Chrome 通过；本地 checkpoint `checkpoint-v0.7.0-m3-organizer-foundation`。

实现契约：[ORGANIZER_MECHANICS.md](ORGANIZER_MECHANICS.md)。验收汇总：[M3 acceptance](outputs/v070-m3-acceptance.md)。

从已批准的 `571869e` 独立开发。仅 provider-neutral Foundation；production Provider registry 保持为空。Fixture/Mock 只在 synthetic 测试包中注入，无真实模型、网络、新权限、日常部署。复用 schema v5 的预留表；InputProjectionGateway 是唯一 Provider 数据出口，LibraryCommitService 是唯一 Organizer 内容提交入口。持久任务、租约 fencing、预算、严格候选验证、ActionPolicy、建议 accept/reject 和最小 Updates drawer 纳入本阶段。完成自动安全/故障/性能检查及隔离 Chrome 验收后建立 M3 checkpoint，不继续真实 Provider 阶段。

# v0.7.0 M2 current work

Manual Library Documents from `7d5df85`; scope, schema reconciliation and acceptance contract: [M2_LIBRARY_DOCUMENTS.md](M2_LIBRARY_DOCUMENTS.md). No real Provider, new permission/network, daily deployment or M3. Source/Input/Smart Filter/import semantics remain protected.

> M1 已完成（557 自动测试通过，0 失败/0 skipped；另有 3 项隔离 Chrome 补测）。M1 实施说明：[M1_DATA_SAFETY.md](M1_DATA_SAFETY.md)。最终验收与已知风险：[报告](outputs/v070-m1-acceptance.md)。以下旧版本记录按其原阶段保留。

# v0.7.0 M1 — Data Safety & Core Model（已完成）

本轮按77176f5和新增M1授权，仅实现安全数据底座及隔离合成验收；不进入M2，不接AI/网络，不部署日常安装。实现与结果以M1报告为准，下面设计/历史不代表本轮已通过。

# v0.7.0 design-stage privacy boundary

本轮仅更新 [最终设计](THOUGHT_LIBRARY_FOUNDATION.md)，未处理私人正文/真实IndexedDB，未编码、调用云Provider、安装模型、修改manifest/权限或部署。v0.7.0采用最小task数据scope、无正文请求审计、provider-neutral credential与有界BudgetPolicy；不默认将长期secret存入chrome.storage.local。真实Provider、公用凭证/backend/BYOK与网络consent安排在v0.7.0.1另批，不阻塞Foundation设计GO；本次批准不授权数据外传。以下历史无网络边界继续有效。

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

# 本轮增量：本地导入基础设施（真实格式未验证）

只有扩展档案页上的明确本次授权与主动文件选择才能读取选中的 ZIP/JSON；不读文件名、不扫描目录，不新增权限或网络。流式背压、总字节/解压比/条目/深度/键/token/单条正文/批次预算均硬限制。预检只持久身份哈希、批次摘要和必要时间冲突证据；原始 ZIP、混合 JSON、assistant 内容不写库。暂停、重选、关闭后清除文件引用/会话授权；重新选择与同意并校验完整内容指纹后才能恢复。

真实适配器尚未注册：真实文件只能容器与语法检查，后台拒绝导入。测试用格式不能通过正式后台。Auto History Sync 不接入产品，用户已确认日常捕获恢复。

# v0.5.1 本地导出文件授权 — 准备中

本轮只允许用户逐次阅读同意并主动选择的官方 ZIP/JSON。不扫描目录/磁盘，不读取浏览器配置、Cookie/凭证、剪贴板、浏览历史，不调用 ChatGPT 私有 API，不上传，不加载 CDN，不新增权限或 telemetry。ZIP 检查只解压 conversation JSON 命名候选，真实命名覆盖仍待验证；正式导入须通过已验证 adapter 门禁。其他文件不解压；混合结构只在有界内存中经过，投影后丢弃非 user 内容。业务持久写入仍只在后台 IndexedDB 事务中完成。

开发格式检查仅在本地页面内存输出固定字段名称、类型、枚举角色分类、数量和关系校验布尔；不显示真实文件名、聊天标题、正文、URL、ID、精确时间、未知键或原始异常。不下载或保存原始/混合/脱敏导出文件，不读取 PAIA 存储，关闭或重选清空。当前用户尚无官方导出样本，检查器只能进行合成验证；它不是已实现的 History Completion。

永久来源墓碑在每批实际提交时重查并优先于所有事实/关系/默认 Library 写入；暂停/取消/重选与中断均不留下可复活已删除来源的原始 staging。真实采样与真实验收仅输出安全摘要，不将私人正文存入日志、截图、fixture 或 Git。完整契约见 HISTORY_COMPLETION.md。

# v0.5.0 本地存储授权增量 — 已实现

用户批准扩展来源 IndexedDB 保存档案事实、用户劳动、时间证据和墓碑，后台仍为唯一写入入口。local 仅控制信息。不新增网络、权限或 unlimitedStorage，不实施文件导入。迁移副本仅存在本地迁移区，恢复/逐字段验证后激活，激活前清除旧私人副本。真实数据比较在扩展内部完成，输出仅状态、版本、计数与布尔，不输出正文/标题/URL/实际哈希或截图。永久删除清理相关证据和引用，不保留可复活来源的隐藏备份。

# v0.4.1 internal — 连续文档工作区

基线 1c8a81f / checkpoint-before-v0.4.1。三个一级入口固定 Thought Library、AI Memory、Original Archive；Settings 在底部。两层都先按真实聊天窗口列表，再进连续文档。共用 userTitle，originalConversationTitle 独立且不受用户/AI标题覆盖。Library 标题和正文直接编辑并自动保存，当前文档会话 Undo/Redo；保留 source/time 边界，不拖动、重排或合并来源。日期自然分隔，时间小字号低权重，正文无卡片边框和成排操作按钮。Original Archive 原文只读；来源信息、排除与永久忽略仅低频上下文操作。

schema5 迁移保留 raw、原文/时间、所有 Library 编辑/备注/排除、稳定来源墓碑与去重。Settings autoSave=true、permanentSourceIgnore=true、联动删除=false 且本版不可开启；未来联动只能明确整 source 删除触发，普通字符/段落编辑绝不触发永久删除。旧 hidden/trash 仅一次性 Legacy Data Migration 入口，全部处理后消失；不新增隐藏/回收站产品操作。AI Memory 不变，AI规则仅预留。

保持 adapter/content/SourceTimeResolver/2MiB响应预算、capture/enrich/purge 的来源删除算法不变。新增 UI 编辑事务需后台串行、修订冲突保护与写失败保留草稿。原文删除不能被迟到编辑或撤销重新引入。所有自动回归由代理完成，再用现有 internal popup 自助 reload 和真实 Chrome 验收，不交用户机械测试。真实成功前不得正式打包或宣称完成。

文档编辑键盘处理仅绑定可信扩展档案页的编辑器根节点，用于会话 Undo/Redo；不会在 ChatGPT 内容脚本或全站监听键盘。原文用 textContent，Library 用 plaintext-only 编辑面；粘贴和渲染不会执行 HTML。编辑草稿、会话撤销仅在可信页面内存，持久修改仍由后台唯一串行写入 chrome.storage.local。来源永久删除会使相关页面缓存和撤销失效，不通过编辑事务恢复原始私文。冲突和写失败不记录原始异常或私人正文。

真实验收仅通过原生电脑控制操作已登录 Chrome；自动浏览器脚本仅运行隔离的虚构 ChatGPT harness。原始用户文字没有进入文件、截图、测试样本或 Git，验收记录只保存版本摘要、数量和布尔结果。

以下旧版章节为历史记录；旧版本章节只作历史记录；当前存储架构以 v0.5.0、STORAGE_FOUNDATION.md 和 TEST_RESULTS.md 最新章节为准。

# 开发 reload 控制边界

internal 候选的 popup 按钮仅调用本扩展 chrome.runtime.reload()，不读写 storage，不读取用户正文，不使用网络，不接受网页/内容脚本/外部扩展命令。不新增权限、web_accessible_resources、externally_connectable 或后台消息类型。release 构建完全排除该 UI 和脚本。原始档案与思想库由原有存储流程保留；重载与卸载不同。

# v0.4.0 隐私增量

Thought Library 与 Input Archive 只存 chrome.storage.local，由原后台唯一串行写入。原文通过记录引用读取；用户整理版独立，不覆盖事实层。Library 排除保留原档案且跨重扫持久。永久删除使用稳定来源哈希永久忽略，不以文字判断；清除该来源的原文、备注、旧整理字段及时间证据，用户主动整理/合并后的 Library 内容按要求独立保留并解除原文引用。旧快照墓碑继续保留。

AI Memory 仅 disabled 访问层和空占位，不生成/缓存上下文，不读外部账户，不调用 AI、MCP、网络或云同步。权限与网络策略和 v0.3.1 相同。真实验收仅记录布尔/数量，禁止记录真实正文、标题、URL、响应或截图。

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

## v0.2.2 internal：分批回填边界

本轮只验证并补足同一 conversation 的旧历史精确来源回填，不新增权限、网络、telemetry 或正文入口。不同批次只合并已确认 user 的最小身份和时间证据；后台仍是唯一持久写入口。禁止用正文、标题、近似日期或 capturedAt 匹配和构造发送时间；无法证明身份保持 unknown。自动测试只使用人工 20 条 fixture 与临时未登录 Chrome，保留原有解压目录，不读取真实档案。

## v0.2.1 internal 回填边界

正式后台 enrichment 仅接受可信内容脚本传入的已通过 canonical 的最小聊天/消息 ID、顺序和时间证据；不能通过该消息读取档案、创建正文或覆盖 originalText/capturedAt。暂停、旧授权、错聊天、错误消息身份、assistant 和不可靠来源拒绝或保持 unknown。文档中的待匹配证明不含正文，后台仍是唯一持久写入口，精确来源之外不猜测身份。

不新增诊断页、权限、网络请求、请求体/凭证读取。仅在授权确认后读取已经到达的合格响应副本；早于确认完成的响应不保留。诊断 lease 撤销不等于正式捕获暂停，两条通道分别执行已有的门禁。

## v0.2.0 正式时间通道

用户本轮授权将已确认用户消息的 sourceSentAt 与来源/可信度/顺序保存到 chrome.storage.local，后台仍为唯一写入口。只在已授权普通聊天的既有被动响应副本中提取最小用户时间字段，不提取 assistant ID/时间/正文，不读取草稿/凭证/请求体。文档内匹配缓存在暂停/刷新/切换清空，正式通道仅携带已通过 canonical 的来源 ID 与最小时间证据，后台重新验证。诊断通道继续只收安全摘要，日志不打印原始值。

不存在新网络请求、分析工具、主机权限或后台服务；manifest 仍仅 storage。旧记录不以 capturedAt 补成发送时间。发现冲突后撤销该来源不可信的发送日期但不改原文/首次捕获时间。永久删除最后一份来源快照同时清除该来源时间证据，留下原哈希墓碑。

两个旁路仅对同一个已有合格响应分别 clone，保留各自大小/超时/授权门禁；其中一个取消或拒绝不消费页面原正文，不触发重试请求。

自动测试全部使用本地 Fake ChatGPT 与临时无账号浏览器，HTTP(S) 请求被本地 fulfil/abort，阻断外部网络；不使用日常 Chrome profile、Cookie、登录状态、Keychain。只有最终真实兼容性 smoke test 由用户完成，无需提供私人内容。以下为历史诊断限制，与本轮正式时间授权不同处以上述说明为准。

## v0.1.3.3 当前诊断边界

在 v0.1.3.2 已授权的 other 历史 JSON 候选中，额外保留 user 的数值 create_time/update_time 与缺失/无效标志，仅用于文档内精确匹配和时间比较。assistant 的 ID、时间和正文不提取；不读取 content、凭证或请求参数。无效类型只传固定分类，不传原始字符串/对象。沿用指纹读取上限，语义身份最多 2000 条，超限不得 high。

本次诊断采集时刻来自 canonical 入口首次观察，仅留内存，不是读取旧档案 capturedAt。后台/UI 仅接收白名单统计与年龄桶；人工时期只存在 UI 内存，不写 storage。暂停/刷新/切换/单标签资格撤销清空时间、身份和冲突；过期摘要不得继续显示 high。

不新增网络请求、遥测、权限或正式字段，不写 sourceSentAt，不修改 capturedAt、原文、时间线或 canonical 捕获。新诊断不显示正文、原始 message/conversation ID、URL、JSON 或精确 timestamp。以下旧版说明以本节为准。

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

# 隐私说明

新增发送时间调查目前仅处于文档阶段，扩展采集行为未变。后续时间元数据诊断仅允许在用户消息受限 DOM 内局部判定公开属性，不输出或持久化实际时间值、原始属性字符串、正文、ID、URL 或标题；不访问私有 API、网络响应、Cookie 或 React 内部属性。未来 sourceSentAt 记录字段与官方文件导入不在本轮实施范围。

本扩展只在你主动同意后，从 https://chatgpt.com 的普通聊天对话区域读取已发送、已显示的用户文字及其聊天标题、聊天标识和页面顺序。启用/恢复时，当前页面中已显示的旧消息也可能收录。Temporary Chat 和不能确认普通聊天身份的页面跳过。

不会读取未发送草稿、不会监听键盘、不会收集 AI 回复、附件内容、Cookie、账号凭证、密码、浏览历史、其他网站、Chrome 配置文件、Keychain、系统剪贴板或其他本地文件。页面适配异常时停止该次捕获，不抓取整页。

正文仅保存在本机 chrome.storage.local。扩展不发网络请求，不上传，不用分析工具、外部脚本、CDN 或 chrome.storage.sync。ChatGPT 自身的网络活动不由本扩展控制。唯一声明的 API 权限是 storage；静态内容脚本范围只有 https://chatgpt.com/*，不需要 tabs、cookies、history、webRequest、clipboardRead、downloads、unlimitedStorage 等权限。

点击暂停后停止新增捕获，已存内容保留；恢复后扫描当前显示的用户消息。你可独立保存备注和整理版，原文不会被这些操作修改。隐藏只改变列表可见性；回收站仍保存内容；永久删除才移除正文，留下防止重复捕获的哈希墓碑（无正文、标题、URL）。源消息内容改变可能形成新快照。

JSON/Markdown 导出只在你点击按钮后，通过浏览器下载生成本地文件。文件可能包含敏感文字，导出后由你管理，已不在扩展存储的保护范围内。扩展不会读取导出文件。导出文件、真实测试文字不要放入源码或 Git。卸载扩展会清除其本地存储，请先导出需要保留的资料；本版本不支持导入还原。扩展存储未提供应用层加密。

诊断仅包含白名单状态/错误代码、时间、适配器版本和数字计数，不收集正文、标题、URL、聊天 ID 或异常堆栈。没有遥测或日志上传。代码中不打印真实正文；合成测试只使用虚构字符串。

v0.1.1 结构诊断另提供有限的布尔状态和计数（最多 20 个可见用户节点的明细），用于区分消息节点、turn、ID 位置、编辑状态与正文容器规则。只检查标签/属性是否符合已知条件，不输出任何属性原值、HTML、消息 ID、文字或哈希。新增诊断不放宽捕获规则。安全摘要需要你主动手动反馈，不会自动上传、下载或访问剪贴板。

v0.1.2 保留上述诊断，仅取消对旧 conversation-turn 包装的强制要求。已显示 user role 节点自身必须具有合法格式的消息 ID；正文仍仅来自该节点内唯一安全的已知容器。缺少旧 turn 时在该 role 子树检查编辑控件，编辑祖先检查继续生效；有旧 turn 时保留原范围。不会改为读取新包装或整页文字。真实页面与编辑布局兼容性仍待手工验证。

临时聊天与页面消息的识别依赖 ChatGPT 页面标记，网页改版后可能需要更新适配器。遇到异常请暂停并只反馈错误代码，勿发送私人消息、存储内容或含正文截图。

实现参考（开发期间查阅；扩展运行不请求这些地址）：
- [Chrome 本地存储、配额与访问限制](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [静态内容脚本匹配与隔离世界](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [扩展消息与来源验证](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)

## 开发样本例外

仅显式开发包观察已发生的有限JSON副本并立即脱敏；导出由用户点击触发且先扫描。真实ID/正文/标题/URL/账号字段/原始时间不得进入fixture。允许有界文档内身份映射以保持DOM-response exact关系，刷新/退出清空，不进入档案或诊断存储。未知schema键可能携带私人文本，拒绝导出。QA登录自动化已停止，Chrome原profile不读取、不复制、不删除。

## 当前真实 Chrome 调试（取代独立采样验收）

用户授权通过电脑控制现有已登录 Chrome 自行验证、重载并迭代；不再要求 sampler/QA 登录或人工 smoke。2026-09-06 实测：旧聊天历史 fetch 来自 `/backend-api/conversations/{id}`；现有 provider 在读取 540672 字节时触发 other JSON 的 512 KiB 上限，未到 JSON decode。只为同源、当前 conversation exact endpoint 提供 2 MiB 有界读取额度；一般 other JSON 仍为 512 KiB，身份/结构/time contract不放宽，不增加请求/权限。临时探针仅输出计数和时间/已有内容哈希，不导出正文或整个档案对象；完成后去除。真实旧聊天的 3 条 canonical 用户记录已恢复历史发送时间；刷新、重复打开和正式档案 UI 验证通过，capturedAt 与已有内容哈希不变。临时探针及显示遮蔽已移除；详情见 TEST_RESULTS.md。

## M2 manual Library privacy

All new commands require the exact trusted extension UI context; new Library commands also require consent. Runtime creation forces user authorship and rejects provider/generator/evidence injection. No Provider is invoked. Search reads only Library entities; provenance metadata loads on explicit expansion, with Input/Source removal gates. Token postings are a local index, not an encryption guarantee. Layout staging stores IDs/ranks/protection metadata and never Entry body copies. Existing Source purge fences also cover search and active editor caches. The manifest, ChatGPT adapter, capture modules, filter rules and import adapters are unchanged from M1.


## M2 UI polish scope

From approved `48b3405`: quieter reading chrome only. Entry/Section actions appear through keyboard-accessible hover/focus ellipsis; expanded note/provenance stays open. Topic creation stays prominent; pin/merge/history move to its menu, Undo/Redo stays available by shortcut with subdued editing-only buttons. Library maintenance and removed content move to Settings; unplaced content remains an ordinary Library filter. Source status uses natural language, technical versions sit inside advanced details. No schema/model/background/storage semantics, Provider, daily installation or M3 changes. Validate existing M2/Input regressions plus isolated synthetic visible Chrome reading/menu/focus/settings/provenance tests and screenshots; finish a separate local polish checkpoint.


## v0.7.0 M5 final acceptance

Foundation data/UI and Organizer mechanics passed final integrated acceptance. Real Organizer intelligence is not connected; production provider registry remains empty. Only synthetic isolated Chrome validation is authorized. Dedicated Foundation artifacts use version 0.7.0, while the source manifest retains the frozen compatibility harness version. Release-structure packaging removes internal diagnostic UI and response diagnostic arming without changing capture, storage, filtering or import semantics. No daily installation or network permission changes. CLOSED / FROZEN requires the final report and all gates.

M5 final: 668/668 tests, 0 failed, 0 skipped. See `outputs/v070-m5-acceptance.md` and the final checkpoint `checkpoint-v0.7.0-thought-library-foundation`. Dedicated internal/release-structure artifacts use `scripts/build_foundation.py`; they are not deployed to the daily installation. Thought Library data/UI foundation complete; Organizer mechanics complete; deterministic/mock full-chain validation complete; real Organizer intelligence NOT yet connected.
