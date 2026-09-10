## v0.11.1 reading closure

See [READING_CLOSURE.md](READING_CLOSURE.md) for the reading contract, reproduced root cause and acceptance evidence. No new network or Provider capability.

# v0.11.0 — selected behavior

Production uses the same lexical relevance ordering with invocation-local query preparation. No embedding/model/vector store or new API path. Low coverage and incomplete scans are explained in Preview; unknown queries remain empty. See INTELLIGENCE.md for benchmark evidence, rejected alternatives, reproduction and limits. Tests run headless via PAIA_HEADLESS=1; historical test names/receipt fields saying visibleChrome do not override this run mode.

# v0.11.0 Intelligence evaluation

See INTELLIGENCE.md for the frozen benchmark, decision gates and evaluation scope. No private benchmark data, paid requests or automatic AI retries. Existing storage and authorization contracts remain unchanged.

# v0.10.1 AI Context Quality

本轮契约见 [AI_CONTEXT.md](AI_CONTEXT.md)。所有 Context 检索与分享准备均为本地零 API；新外部总开关不影响备份与授权保留。验证：固定 60 Topic / 1200 Entry / 240 query baseline 对比、currentness/去重/预算、权限/迁移/备份、many/deep 分布、合成 Chrome journeys 与完整回归。

# v0.10.0 AI Memory MVP

v0.10.0：单元验证默认拒绝、Entry/Section/共享内容排除、允许后候选、预算/确定性/来源状态、Profile/session/活动、preview freshness和copy；隔离 Chrome A–F journeys、50/500/1000 Topic 性能、冻结 v0.9.2升级、Backup v1兼容、全套回归和实际 internal/release 复验。仅合成，不读取私人数据。

# v0.9.2 加固验收计划

在 v0.9.1 clean checkpoint 的独立分支实施；当前源码必须完成全量串行回归和静态审计，再构建实际 internal/release、验证包并部署精确日常目录。不得用旧报告或 fixture 模型冒充真实验证。初审与最终证据分别见 [V092_GAP_AUDIT.md](V092_GAP_AUDIT.md)、[V092_ACCEPTANCE.md](V092_ACCEPTANCE.md)。

新增门禁：

- 保存：beforeunload flush、IME guard、AI 冲突安全重读、持续输入 maxWait、Undo/Redo、丢失回包仅一条 durable revision、快速导航最后意图、异步 Topic 重读期间禁止编辑解绑 DOM；独立内容弹窗内失败重试/冲突重读、取消保留草稿。
- 搜索：精确/部分/正文/AI 阶段排名、多页空扫描、取消、去抖/高亮/键盘；索引 catch-up 不误报空结果；1k/10k/100k Sources 与对应 Inputs 的真实 IDB/Chrome 搜索、UI 心跳。单次搜索门槛 180 秒，心跳额外间隔小于 1000 ms；报告实际耗时，不将宽上限包装为优秀体验。
- 数据：移动最后 Input 后备份恢复仍有正确原始聊天计数；完整性 7 类故障注入、干净库、取消/并发/数据变更作废。保留现有墓碑、恢复冲突/事务失败、原话忠实、AI evidence、预算/错误矩阵与重复导入测试。
- 产品：至少 1000 Inputs、51 Topics、624 Entries、人工修改/版本/墓碑/移除/stale；1440/1024/768/390 宽度无横向溢出，3/2/2/1 列；常用页面性能小于 30 秒。A/B/E 独立端到端，C/D 由长期数据和操作巡检覆盖；控制台只记录错误/警告数量。
- 升级：从冻结 v0.7.2、v0.8.0、v0.8.1、v0.9.0、v0.9.1 同路径升级；既有中断/重跑测试一并回归。
- 交付：实际 release guard 无 DEV_ONLY、fixture、内部 reload/诊断 UI，必要折叠产品诊断保留。4 个产物 ZIP CRC/文件哈希相等，实际包 Chrome smoke，部署前后哈希与冻结 checkpoint 不变，最终 Git clean。

# v0.9.1 验收计划

必须在当前源码完成受影响回归、一次完整串行回归、静态权限/包审计及实际 internal/release 包的隔离 Chrome 验证，再部署原日常目录。

- Settings：正常 Key 保存/清除、条数/每日上限；高级区默认关闭，旧用量/错误不可见。
- 待确认输入：Settings/历史来源 breadcrumb 与返回；归入已有文档、独立、忽略/恢复、暂不处理；完成回流、真实 Source 导航。验证事务失败无损、重复操作幂等、重复导入、移除/墓碑、备份恢复、最后 Source 删除清理。
- 阅读：125 条 Input 正序/倒序跨页无漏重、偏好重开保留、搜索上下文；Thought 偏好独立；整体版本历史显式入口及无重复菜单；保留单条/章节历史。
- Thought 首页：标题/搜索/创建/Tabs，建议为零隐藏、有建议带数量；AI 开关与 delta 控制更新/批量入口；Topic 阅读仍可批量更新。
- 提示：未动作时旧预算/失败不显示；显式单次、批量预算失败局部显示重置/Settings，取消不显示失败；Provider 失败才出现明确手动重试，无自动请求。
- 回归：捕获/身份/时间、编辑保存撤销、过滤、导入断点/重复、备份恢复、永久删除、预算/有界任务、迁移、1k/10k 性能与隔离 Chrome。
- 包与部署：当前 full-suite 输入摘要绑定构建；两个真实产物从入门、导入、阅读到显式整理与备份；路径和旧部署哈希预检、部署后逐文件 SHA-256 相等、Git clean、冻结引用不变。

# v0.9.0 验证计划

先增加结构 detector/adapter、分支、恶意 ZIP/JSON、Source 去重/时间/墓碑/移除和当前 Input/Thought 集成测试，再实现。覆盖新用户/旧用户/跳过/部分/完成/重启引导；预检零事实写入、逐批事务回滚、取消、丢失 ACK 与 worker 重启后同文件恢复。

500–1000 输入长链；1k/10k 导入读写和内存边界；冻结 v0.8.0/v0.8.1 非空升级；Search/Backup/Provider 零自动请求。随后受影响回归、一次当前全套回归、可见隔离 Chrome 和实际 internal/release 产物复验；记录指定文件部署哈希与 Git checkpoint。真实官方 ZIP 与真实 DeepSeek smoke 不冒充合成结果。

新增跨次导出 current path 变化、已有捕获 Input 后补分支、人工编辑/删除/确认优先回归。旧 consent/诊断回放先实际点击“开始使用”，不会直接注入同意状态。可选 100k 压力命令：`PAIA_HISTORY_STRESS=100000 node --test tests/history-scale-v090-chrome-e2e.test.mjs`；复用相同正式管线与页面响应/零网络断言，时间上限单独提高，不改变正常 1k/10k 门槛。

完整验收包含多个资源密集的真实/模拟 IndexedDB 基准，最终使用 `PAIA_TEST_CONCURRENCY=1 node scripts/test.mjs` 防止它们互相争用资源。仍执行每个测试，所有时间、事务、隐私和正确性门槛保持不变；摘要记录实际 concurrency。默认并发 4 的快速回归仍保留。

阅读可靠性增加确定性消息通道中断：Grid 搜索刷新与有界任务状态轮询分别失败；保留已显示主题、停止失败轮询、显示固定提示，重新读取可恢复且 0 Provider 请求。不能只在测试中忽略 pageerror。

# v0.8.1 acceptance additions

- Reading: 300 Entry Node projection and 150 Entry visible Chrome; Section-preserving asc/desc, 40-body pagination, off-page directory jump, local body/title/note/Section query, invalidated time cursor and persisted preferences.
- Organizer: exact bounded 3 requests / 50 Inputs; Original second-error/partial/cancel and AI maximum 3 distinct Topics; shared budget, commit-atomic progress, interrupted worker and authorization page close, no automatic replay.
- Backup: explicit format/hash chain, forbidden credentials, corrupted/truncated/unknown schema, concurrency/idempotency, purge fences, nonempty target, transactional rollback and volatile staging; 500-Input complete file download/preview/empty-profile restore/restart.
- Governance: user-controlled pin/rename/canonical merge; AI old-name redirect; container-only delete, unplaced text and restore; important merge revision remains usable after backup restore; Markdown defaults to no AI.
- Migration: frozen v0.7.2c and v0.8.0 programs, same isolated extension ID; user edits, purge tombstone, partial legacy AI cache, repeated reads and complete field equality after old cleanup settles. Existing v3/v4 migration fault/rerun matrix remains.
- Release: same runtime core; remove response probing/capture diagnostics/legacy job controls/dev reload/fixtures. Ordinary read-only error details and user usage audit remain. Both generated structures must pass synthetic capture → Organizer → Reading → Settings → Backup in visible Chrome.
- Completion: one full current-input regression + package audit/development guard, final package ZIP/hash verification, exact-path daily file deployment receipt, local checkpoint and clean worktree. No real Key/private daily database verification claim.

## v0.8.1 gates

Add targeted tests for stable per-Section time sorting/pagination and preferences, local Topic/AI search, extractive summary and empty AI sections; bounded 3-request completion, second-error stop at 2, 50-input cap, stop/restart/unknown/no auto retry; local backup schema/integrity/credential omission/source purge fences/restore preview/atomic recovery and conflict rejection; container deletion and merge preserve Entries. Use a synthetic 500 Input / 30 Topic / 300+ Entry long-term library with edits, removals, tombstones, revisions and stale AI. Test frozen v0.8.0 and v0.7.x schemas, partial migration and rerun. Run affected regressions then one complete regression, static privacy/permissions/network checks, visible isolated Chrome, internal/release package smoke and exact-path deployment hash verification. Never label synthetic Chrome or schema tests as real private daily database / real DeepSeek acceptance.

# v0.8.0 验证计划

先 canonical contract / item evidence / durable commit targeted，再受影响 UI/迁移回归，最后完成一次全套回归。隔离可见 Chrome 的结果与真实登录 ChatGPT / 真实 DeepSeek 结果分开记录。

新增定向覆盖：`ai-contract-v080`、`ai-product-v080`、`topic-quality-v080`、`topic-chronology-v080`、`organizer-controls-v080`。保留 Original simple/complete、DeepSeek、AI failure、worker interruption、权限隐私与历史迁移回归。动态批次证明 20 条短输入同请求，长输入缩小，首条超限不越过或付费；主题检索只读合格内容、建议不自动合并。

`product-v080-chrome-e2e` 使用 50 条虚构中文输入（PAIA/求职/文学/研究/AI工具），覆盖重复、演化、决定、偏好、判断、长文本、修正、短重要输入和临时操作。验证默认正文全部来自本地原话、20/20/10 三次分类、5 Topic Grid、AI 缓存/编辑/依据/修订/单 Entry delta、失败保留、Settings、每日上限、切换/刷新/重启零额外请求。独立 partial case 验证 4 条提交、1 条人工处理、5 条 Source 均保留。

`product-migration-v080-chrome-e2e` 从冻结 `102160d` 的 internal 构建在相同临时扩展路径 Reload 到 v0.8.0，比对 Source/Input/Entry/Topic/版本字段，验证旧 partial AI 仅标 stale，重复迁移幂等，升级零 Provider 请求。

可见 Chrome A–O：默认 Grid、Topic 阅读、AI toggle、缓存切换、两种更新、AI presentation、依据、partial success、失败、重试费用提示、人工保护、Settings 普通/高级、onboarding。截图只含合成数据，最终包检查无 fixtures/generator/debug-only action，release 无 self reload。

最终记录完整测试总数、运行时 inputDigest、权限差异、包目录与 ZIP/hash、精确部署路径的文件 hash 相等性。不会用 fixture 成功声称真实 DeepSeek 已成功。

---

# v0.7.2c AI Experience MVP — current authorization

Thought Library now uses Topic blocks and an AI presentation display switch. Only an explicit AI update sends one bounded Topic request; toggle/startup/rerender never send. Source/Input/Original bodies and organization remain unchanged by AI updates. Derived evidence, protected fields, session credentials and cost gates are mandatory. This supersedes earlier no-AI-presentation/dual-tab plans. Full behavior and evidence: [AI Experience MVP](AI_EXPERIENCE_MVP.md).

---


## v0.7.2b Original Organizer completion (2026-09-08)

Current authorization: Simple Original Runner only, at most five eligible Inputs and one DeepSeek Chat Completion per explicit user action. No automatic retry or continuation. Body is local working text or validated UTF-16 slices. Session budgets follow a trusted Chrome session marker; daily budgets persist. Network preflight checks trusted worker, exact granted host and CSP; credentials are omitted from cookie transport and redirects fail closed. Partial valid items commit atomically with provenance, organization, per-input receipts and progress. Unknown errors retain their phase and INTERNAL_RUNTIME_ERROR. No changes to Source/Input/Smart Filter/History Completion business semantics or AI synthesis.

Acceptance: expanded targeted/regression tests, a 20-Chinese-Input/four-batch synthetic chain, isolated Chrome success/failure/partial/retry/worker lifecycle, allowlisted internal/release packages and fixed-directory deployment. Synthetic HTTP fixtures are not evidence of live paid DeepSeek success.

## v0.7.2b Original Organizer Rescue

Targeted gates cover the DeepSeek v4 JSON request, strict no-rewrite response schema, item-level invalid isolation, five-Input bounded planning, deterministic explicit retry, per-Input and batch receipts, atomic Library/cursor/request-ledger commit, legacy-job fencing, provider error mapping, local span extraction, exact duplicate provenance, user-store immutability, baseline-to-incremental transition, and worker restart. Every failure class must retain fetch count 1 for one user action. Single-flight, Stop/credential-clear abort, repeated render/click, old retry paths, `outcome_unknown`, and late-worker commit fencing are mandatory. Isolated Chrome verifies one-click success and response-header/body-stall timeout without a second dispatch.

## v0.7.1 Dual View & Incremental Update

验证同一 Topic/Section/provenance 在原话与 AI视图中共享，原话正文严格取自 active Input 的精确引用，AI无 Provider 时保持未更新空态。验证双 checkpoint 独立、added/changed/removed delta、受影响 Topic/Entry、原话自动更新暂停/恢复、AI preview 不含正文，以及用户字段保护不被原话自动更新改变。隔离 Chrome 使用 synthetic data，验证默认视图、切换、AI预览和零网络。

## v0.7.0 M3 — Organizer Mechanics（本轮授权）

最终验收：664/664 自动测试通过，isolated synthetic Chrome 通过；本地 checkpoint `checkpoint-v0.7.0-m3-organizer-foundation`。

实现契约：[ORGANIZER_MECHANICS.md](ORGANIZER_MECHANICS.md)。验收汇总：[M3 acceptance](outputs/v070-m3-acceptance.md)。

从已批准的 `571869e` 独立开发。仅 provider-neutral Foundation；production Provider registry 保持为空。Fixture/Mock 只在 synthetic 测试包中注入，无真实模型、网络、新权限、日常部署。复用 schema v5 的预留表；InputProjectionGateway 是唯一 Provider 数据出口，LibraryCommitService 是唯一 Organizer 内容提交入口。持久任务、租约 fencing、预算、严格候选验证、ActionPolicy、建议 accept/reject 和最小 Updates drawer 纳入本阶段。完成自动安全/故障/性能检查及隔离 Chrome 验收后建立 M3 checkpoint，不继续真实 Provider 阶段。

# v0.7.0 M2 current work

Manual Library Documents from `7d5df85`; scope, schema reconciliation and acceptance contract: [M2_LIBRARY_DOCUMENTS.md](M2_LIBRARY_DOCUMENTS.md). No real Provider, new permission/network, daily deployment or M3. Source/Input/Smart Filter/import semantics remain protected.

> M1 已完成（557 自动测试通过，0 失败/0 skipped；另有 3 项隔离 Chrome 补测）。M1 实施说明：[M1_DATA_SAFETY.md](M1_DATA_SAFETY.md)。最终验收与已知风险：[报告](outputs/v070-m1-acceptance.md)。以下旧版本记录按其原阶段保留。

# v0.7.0 M1 — Data Safety & Core Model（已完成）

本轮按77176f5和新增M1授权，仅实现安全数据底座及隔离合成验收；不进入M2，不接AI/网络，不部署日常安装。实现与结果以M1报告为准，下面设计/历史不代表本轮已通过。

# v0.7.0 design-stage test plan

[完整测试矩阵](THOUGHT_LIBRARY_TEST_MATRIX.md)现有144个A–L计划用例，新增Provider/Credential/Budget/审计和失败隔离测试。[最终设计](THOUGHT_LIBRARY_FOUNDATION.md)状态 **GO**，v0.7.0全量Foundation验收用确定性fixture和U/D/V/C层完成；真实Provider的P层安排在v0.7.0.1，不是本阶段前置。本轮只更新设计/checkpoint，不编码、不执行功能/迁移/Chrome验收；历史通过数量不可充当本轮结果。以下保留冻结版本测试计划。

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

# 本轮：不依赖真实官方 schema 的必测范围

先以 synthetic adapter 验证授权前零读取、unknown adapter 后台拒绝、ZIP 全候选 CRC/目录/本地头一致与资源限额、增量 JSON/长 conversation/背压、完整内容指纹。验证预检内跨批时间冲突、提交回执丢失重放、同序号异摘要拒绝、暂停重选/Worker 重启、原子 abort/quota 不前移 checkpoint、并发 capture/dedupe、预检后永久忽略、人工 Library 标题/正文/备注/排除/修订保护与未知时间补全。

隔离 Chrome 验证“一键同步”面板、文件选择同意、格式门禁与无网络；生产无 synthetic adapter、无新增权限。旧回归继续执行。真实 schema、分支投影与真实导入验收不由这些测试替代；只有其余工作完成才请求一次真实文件。

# v0.5.1 初始验收矩阵（已执行项见 TEST_RESULTS.md）

先验证导出 schema，区分官方公开信息、纯合成 fixture、本机真实结构证据，缺真实格式证据不启动基于猜测的 ExportAdapter。先补测试再实施；全部 v0.5.0 及更早回归仍必跑。格式检查器单独测试并明确不构成导入验收。

必测：精确身份/同源同快照/同源不同快照/异源同文；重复导入及与 capture 并发；metadata 和 official_export 时间一致/冲突/导出内部冲突；Library 编辑、标题、备注、excluded 不被重置；预检后 tombstone 与逐批重查；branch/shared ancestor/missing parent/current path 不明确；Worker 终止、reload、回执丢失、重复批次、暂停/重选相同文件恢复；ZIP 超限/损坏/CRC/压缩炸弹/路径/加密/不支持格式，JSON 深度/长 token/非法 UTF-8/重复键/非法身份/assistant 和附件过滤；大文件和超长 conversation 的有界内存与背压；容量不足和事务失败不前移 checkpoint。

自动全通过后，Codex 沿用 internal 自助 reload + 电脑控制验证真实文件选择/导入、历史窗口和 sourceSentAt、重复/增量、用户编辑、永久忽略及 reload 状态。缺真实导出时明确停留在前置验证，不能使用虚构导出冒充真实样本。最终 privacy / permission / network / diff audit、Git checkpoint、internal + release ZIP 逐文件校验和运行时摘要绑定的真实证据全部齐备才交付。具体设计见 HISTORY_COMPLETION.md。

# v0.5.0 Storage Foundation

先补失败测试。冻结 v0.4.1 为对照，验证原文/时间/Library劳动/墓碑等值、迁移副本恢复、逐切换边界 crash、事务 abort/回执丢失/幂等、修订冲突/删除竞态、分页/搜索。用真实旧代码检查迁移后重新加载行为，不因 sentinel 名字声称安全降级。1k/10k/100k 为必测，百万条可选。自动测试后沿用 internal 自助 reload，真实 Chrome 内部逐字段比较只输出布尔/计数；真实成功后才能 release ZIP。独立记录实际结果、限制和 Git checkpoint。

# v0.4.1 internal — 连续文档工作区

基线 1c8a81f / checkpoint-before-v0.4.1。三个一级入口固定 Thought Library、AI Memory、Original Archive；Settings 在底部。两层都先按真实聊天窗口列表，再进连续文档。共用 userTitle，originalConversationTitle 独立且不受用户/AI标题覆盖。Library 标题和正文直接编辑并自动保存，当前文档会话 Undo/Redo；保留 source/time 边界，不拖动、重排或合并来源。日期自然分隔，时间小字号低权重，正文无卡片边框和成排操作按钮。Original Archive 原文只读；来源信息、排除与永久忽略仅低频上下文操作。

schema5 迁移保留 raw、原文/时间、所有 Library 编辑/备注/排除、稳定来源墓碑与去重。Settings autoSave=true、permanentSourceIgnore=true、联动删除=false 且本版不可开启；未来联动只能明确整 source 删除触发，普通字符/段落编辑绝不触发永久删除。旧 hidden/trash 仅一次性 Legacy Data Migration 入口，全部处理后消失；不新增隐藏/回收站产品操作。AI Memory 不变，AI规则仅预留。

保持 adapter/content/SourceTimeResolver/2MiB响应预算、capture/enrich/purge 的来源删除算法不变。新增 UI 编辑事务需后台串行、修订冲突保护与写失败保留草稿。原文删除不能被迟到编辑或撤销重新引入。所有自动回归由代理完成，再用现有 internal popup 自助 reload 和真实 Chrome 验收，不交用户机械测试。真实成功前不得正式打包或宣称完成。

## v0.4.1 验证矩阵

自动验证覆盖 schema4→5 原子迁移、重试/幂等、共享标题、原始标题不变、来源排序/unknown、直接编辑不改原文、当前会话撤销/重做、输入法、跨来源选区、全条排除/主动恢复、写失败草稿保留、多标签版本冲突、来源删除后清理缓存/撤销但保留无关草稿、Legacy 入口处理后消失、锁定 Settings、internal/release reload 隔离。所有 v0.3.x 和 v0.4.0 捕获/时间/历史/去重/隐私测试继续运行；capture/enrich/purge 方法和冻结内容文件逐字比对。

真实验收由代理原生控制：升级前后数量和旧记录的时间/哈希样本、默认导航和窗口列表、连续文档、直接编辑/自动保存/Undo/Redo、共享标题/原始只读、Settings、Library 排除重扫/恢复、虚构同文异源永久删除与重开忽略、自助 reload 后数据保留。不得记录用户私文、标题、URL或截图；无需用户机械测试。

# 自助 reload 基础设施验收

先补失败测试，再实现 internal 构建：检查开发按钮存在、release 文件列表/ZIP 不含入口、仅可信顶层自身 popup 用户点击能触发；模拟普通网页、错误扩展、frame、合成点击、无 activation、runtime message/window.postMessage 均拒绝或无效果。验证 manifest 除构建名称外逐字段相等，所有业务资源与 9918959 字节一致。

临时 Chromium 实际加载开发构建，自然 Fake ChatGPT 捕获后编辑/排除 Library，暂停捕获，修改构建磁盘标记，点击 popup 按钮。通过新磁盘版本标记及旧 Worker 堆标记消失确认真正重载，同一个扩展 ID 及 chrome.storage.local 完整持久状态逐字段不变。检查从原无按钮 popup 升级磁盘内容再重新打开能否自助部署，以及 ChatGPT 页消息不能触发 reload。测试专用临时浏览器启用开发者模式；不操作日常 Chrome 的该设置。随后运行全部 v0.4.0 回归和审计。

真实操作只通过获准的电脑控制入口，不绕过受保护 URL 策略。若入口首次部署需要用户协助，只请求一次 reload，不将产品验收交给用户；开发按钮本身也不能赋予电脑控制工具被策略禁止的页面访问能力。真实验收未通过前不生成正式 ZIP。

# v0.4.0 自动与真实验收

先新增失败测试，再实现。覆盖 schema1/2→4 原子/幂等迁移、默认 raw 引用、旧 note/editedText、隐藏/回收站、原文不可变、Library 编辑/排除/恢复、重扫不复活、来源墓碑（含变更正文）、跨聊天同文隔离、直接副本清理、edited/merged 引用解绑、日期/顺序/unknown、conversation 分组及原始/用户标题、AI Memory 默认拒绝、写失败/并发。

Fake ChatGPT + Chromium E2E：自然捕获→默认 Library→聊天文档→连续阅读→编辑→查看原文→排除→刷新/SPA/Worker 重启→不复活→恢复；Archive 回收站→永久删除→重开来源→不归档，同文不同来源保留。保留全部 v0.3.x 自动链路，旧 UI 测试显式选择 Input Archive 视图。

自动全通过后由代理电脑控制现有登录 Chrome 完成八项真实验收。隐私输出仅布尔与数量，不存真实文本/标题/URL/截图；无法验证的项目必须明确未通过。最终运行全套、静态隐私/权限/网络审计、冻结 diff 审计，真实结果绑定 runtime digest 后才能正式 ZIP。最终建立本地 checkpoint 并逐文件比对 ZIP 与提交，无远端推送。

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

## v0.2.2 internal：5 + 15 定向验收

先新增人工合成 20 条 fixture：最新 5 条 metadata 首批，较早 15 条第二批，每条有独立预期时间。自动验证 record-first 的 20 unknown → 5 high → 20 high；metadata-first 在两批均到、Worker 重启后才渲染 DOM，20 high 用于证明缓存 merge 而非覆盖。懒加载先显示最新片段，再加载较老片段；SPA 切换后仅接受当前 exact conversation，旧会话记录逐字段不变。页面立即消费原响应，沿用 clone race 回归。

后台合成旧记录覆盖保留 key、保留精确 ID 对、无 exact identity、矛盾 identity、未知顺序补齐；逐 ID 比较 originalText/capturedAt/id/contentHash，低可信冲突不覆盖 high，重复批次不增记录。全部既有测试继续执行，最终静态隐私/权限/网络审计、diff 审查、Git checkpoint 与 ZIP 字节校验。真实登录只留一次最小 smoke，不把合成通过当成私有页面兼容性证据。

## v0.2.1 internal 回填验收

先以 Fake ChatGPT/临时未登录 Chrome 复现已保存 unknown → 晚到 metadata → 正式记录升级。覆盖 DOM 仍在/已被页面移除、metadata 先到、原文/capturedAt 不变、未知顺序补齐、高可信值不被缺失或无效来源降级、精确 ID/聊天不符和 assistant 拒绝、Worker 停止唤醒、档案页关闭、诊断 lease/错误与正式缓存隔离、初始化请求在授权后返回。扩展不增加网络请求或权限。

每个修复先补测试并观察失败，再执行 targeted、全部单元/adapter/浏览器 E2E 和隐私/权限/网络检查，审查 diff，建立 v0.2.1 internal checkpoint 并核对 ZIP。真实页面的原因未经直接读取不能用合成复现冒称已确认；只把最终旧聊天的一条历史发送日期及不变 capturedAt 交用户检查。

## v0.2.0 测试优先与最终一次 smoke

先写失败测试，再实现；每次修复由代理运行测试到通过。统一 Fake ChatGPT harness 模拟 canonical user/assistant DOM、ID/聊天 identity、多行/同文不同 ID、编辑态/草稿、刷新/SPA、历史 JSON、create/update 时间、DOM/metadata 两种先后、worker suspend/wake、会话隔离、重复/畸形/schema 变化。

新增 contract、后台正式时间与排序测试，浏览器真实加载 unpacked MV3：验证自动历史补录、所有捕获门禁、重复/新快照、时间补录不改 capturedAt、所有时间异常 fail closed、持久冲突跨 worker、时间线/聊天/搜索/备注/整理版/原文不可变/回收站/恢复/JSON 与 Markdown。已有隐私、安全、存储失败、并发、墓碑、导出及诊断测试保留为回归；历史“时间仅诊断不入档案”断言按新授权改成“只有合格正式证据可补时间”。

统一运行入口输出总数、单元、adapter contract、browser E2E、privacy/security 分类及既有回归结果；分类互斥，回归为重叠说明。静态权限/CSP/无网络/无分析工具审计必须通过。最终本地 Git 检查点与 ZIP 逐文件一致。

响应竞态使用受控 ReadableStream 与完成事件验证，不用固定 sleep 等待成功：页面取得原 Response 时两个独立副本已建立，正文仍可且仅可消费一次；历史旁路超限取消或旧诊断 schema 拒绝不影响另一旁路。fetch 的 this、参数、Promise、Response 及调用次数保留。

完成本地已存在的两项存储审查失败测试：后台按批次 pageOrder 独立拒绝逆序时间；无效 schema-2 时间账本不得缓存为已成功加载，连续重试仍须失败关闭。

唯一人工 smoke：原目录更新扩展后，打开一个旧普通 ChatGPT 对话，确认可见用户输入自动补录，查看一条历史消息显示实际发送日期，并与捕获时间分开。既有 capturedAt 不应被本次补时间改写。不再要求中间版本截图、控制台操作或重复机制验证。以下均为历史测试计划。

## v0.1.3.3 自动检查与最后真实验收

- Unix 秒整数/小数、缺失/null、字符串/毫秒/非法/未来、年龄桶边界；update_time 缺失/相等/晚于 create/逆序/无效/未来。
- 精确 conversation + ID，部分/零匹配，canonical 顺序与 JSON 插入顺序不同，单消息不可比较、相等/逆序、重复响应及跨响应冲突；固定采集边界的严格比较。
- 合成历史 fixture 含 55 条消息、5 条 user、3 条 canonical；assistant/正文/凭证读取陷阱；容量/不合格候选不得 high；摘要/UI 严格脱敏。
- 人工时期未选/正确/错误/跨桶；切换同计数聊天、暂停/恢复、刷新、第二标签、canonical 改变、过期摘要撤销选择和 high。
- 临时未登录 Chrome 真加载 MV3，合成响应 MAIN→ISOLATED→后台→UI；操作时期选择、重复/冲突/清空；既有虚构记录逐字段不变，时间不写 storage，无新增请求。
- 全量既有隐私、canonical、去重并发、持久化失败、不可变性、墓碑、导出及 UI 回归；语法/权限/CSP/包审计，diff 审查，提交后 ZIP 与 Git 逐文件字节一致。

仅交用户执行真实登录时间语义黑盒：原目录更新、重新加载/刷新，只留一个普通旧聊天，在独立诊断选择当前可见消息实际时期，反馈顶部安全块。无需代码、控制台或发送新消息；合成通过不等于真实验收。

## v0.1.3.2 自动检查

- 合成 other 查询参数路径的 application/json、大小写变体及 application/*+json 可诊断，但不进入原 conversation parse/metadata 接受集合。
- origin、HTTP、redirect、JSON 类型、单普通聊天资格、声明/实际字节上限、JSON 失败门禁；认证会话路径不诊断。
- 有界深度/节点/键/条目；普通字段拼凑与过深结构不形成候选；根数组可识别但无 identity 不匹配。
- assistant ID/时间/content 与凭证/header 字段值设置读取陷阱，探测不触发；同结构不同 ID/时间仍聚为一组，UI 和后台摘要不含任意值。
- 12 组容量及候选优先保留、严格白名单、conversation + exact ID 匹配、刷新与多标签清空；心跳过期不能绕过第二个已知普通聊天。
- 无账号本地虚构 Chrome 端到端验证指纹区域、4 条精确匹配、正式 metadata 仍为 0、四条虚构既有记录逐字段不变。

真实验证仅由用户执行 README 的四步；不能将合成样本当成当前 ChatGPT 结构证据。

## v0.1.3.2：other JSON 结构指纹诊断

用户真实结果：观察 118 个响应；旧聊天类 0，发送类 1（ROOT_NOT_OBJECT），other 117（含 URL_SHAPE_NOT_ALLOWED 的同源合格 JSON）。这不能证明旧聊天没有历史元数据。本轮仅对已授权、后台确认单个活跃普通聊天、同源/HTTP 合格/无重定向/明确 JSON 类型的 other 响应增加独立诊断。URL 查询参数不再阻止此诊断分支，但不改变正式会话响应的接受条件。

副本读取最多 512 KiB、5 秒，最多一个指纹读取任务；结构深度 <=4、对象节点 <=1000、每节点键 <=64、候选消息 <=200。只输出固定字段的布尔/计数、根类型、集合尺寸/深度；不输出任意原始键或值。最多 12 个内存指纹组，超限明确计数；截断时不能确认历史候选。只有明确集合中多个消息具备 role/ID/create_time 结构才标 historical_conversation_schema_candidate；其用户 ID 与明确的同一会话 identity 仅在文档内存用于 canonical 精确匹配，绝不加入原 response metadata 接受集合或写入记录。

刷新、切换、暂停或失去单标签诊断资格即清空指纹与临时匹配身份。不新增请求/XHR/权限，不读凭证/请求头；沿用现有响应 content-type/长度的内存分类和字节计数，不保留头值。真实结果仍待用户 Chrome 反馈。

## v0.1.3.1 新增验证

验证候选 RSC 类型不 clone；JSON 语法失败、根数组、未知嵌套、身份缺失/不一致、mapping 缺失、用户 ID 不合法、时间类型错误能返回不同固定阶段/原因。区分 HTTP、origin、endpoint 与 clone 失败，未执行的阶段不得伪称失败。

验证诊断探测不读取 assistant content/ID 或未知子树；最多 2000 条。固定 schema 经 MAIN→ISOLATED→后台→UI 投影，不带出 URL、正文、原始 ID、真实时间或任意头值。A 的拒绝不能覆盖 B 的成功摘要。真实 MV3 合成测试同时确认已接受 metadata 数不因 RSC 拒绝变化、四条虚构既有记录逐字段不变、原按钮启动继续成功。

通过逐字比较核对旧 user()/parse() 接受函数不变，canonical 适配器仅升版本。历史首次 PoC 用户计数不能代替新的真实拒绝阶段验证。

## v0.1.3.1：响应结构拒绝诊断（当前阶段）

用户真实反馈 canonical=2、response metadata=0、匹配=0、接受=0、结构拒绝=1、超限=0。只能说明候选响应处理失败，尚不能确定是 content-type、clone、JSON 或 schema 阶段，也不能否定历史时间方案。

本轮只增强安全诊断，响应 endpoint/格式/字段接受规则与 v0.1.3 保持一致；不支持未知 SSE/RSC 结构。按 conversation_load_candidate、message_send_or_stream_candidate、other 分开计数并保留各类最后一条安全摘要。阶段分别报告是否尝试、是否通过；未执行不伪称失败。仅已通过原 URL/状态/类型门禁的副本才解析；拒绝后的探测只检查原有明确字段路径、最多 2000 项，不遍历未知 JSON 或读取正文。

旧聊天恢复是主要目标；发送响应没有完整元数据只表示该样本无可用来源。firstObservedAt 仍仅为近似观察语义，本轮不新增记录字段或近似时间存储。版本 0.1.3.1 diagnostic，保持 canonical、正式记录、时间线、权限与网络边界。

受控按钮独立检查：未点击的“未开始”属正常。若发现传递失败，单独记录并验证，不能通过放松响应 schema 修复。用户已确认点击后曾显示“已开始”；本轮保留控制链路，并用既有按钮集成测试再次验证。

## v0.1.3 自动验收范围

- 原 fetch 只调用一次，原 this/参数/Promise/Response 不变；请求体和请求头读取器抛错时仍成功。
- 未授权、暂停、未知路径/响应 schema、跨聊天、超大响应与并发上限拒绝；失败不污染页面原响应。
- MAIN 丢弃 assistant；跨世界只传最小 user 元数据；后台/UI 白名单剔除任意内容、ID和绝对时间。
- exact chat+ID 匹配、同 ID 冲突、null/非法时间、顺序逆序、重复扫描、容量边界、受控按钮前旧 ID 与 GET 历史样本排除。
- 真正加载 MV3 的无账号合成 Chrome 验证 MAIN → ISOLATED → 内存后台 → UI；四条虚构既有记录逐字段不变，新消息差值、刷新清空、暂停清空、无额外请求。
- 注入可选诊断抛错，正文捕获仍执行。全部现有回归继续运行。

真实 A/B/C 步骤与逐 ID 刷新稳定性限制见 README.md；该限制不能用合成测试通过替代。

## v0.1.3 response-time diagnostic PoC（本轮范围）

保留 v0.1.2 canonical DOM 捕获、去重、记录和时间线；不写 sourceSentAt 或修改 capturedAt。新诊断仅内存：MAIN 在 document_start 包装原 fetch，原参数/Promise/Response 保持，不新增调用，不读请求体、凭证或请求头。只旁路解析严格路径及结构白名单的有限响应；整包解析可能短暂接触 assistant 字节，但不提取、传递、保存其正文。授权前/暂停/临时聊天不解析；切换、刷新清空映射。

仅 conversation identity + exact message ID 与已通过 canonical 检查的用户消息匹配。单独诊断页只呈现白名单计数、粗粒度年龄、精度和受控差值；不读档案记录。受控按钮以当前 canonical ID 为基线，仅统计之后出现且来自按钮后开始的发送响应的候选；无法证明真实新发送时标为候选，不能将旧消息初次出现冒称发送。所有判断尚待真实 Chrome 验证。

严格区分观测与结论：刷新销毁 ID/时间映射，因此仅对比刷新前后计数/年龄不能证明逐 ID 时间稳定；该验收项保持未验证，不暗存时间指纹。timeSourceCandidate=chatgpt_response_create_time；high 为后续验收通过才可采用的候选可信度，本 PoC 不自动授予。无原始时间值跨刷新持久化。

# 测试计划

## 原始发送时间调查（尚未真实采样）

本轮只记录调查状态，未改变运行代码。后续在桌面 Chrome 普通旧聊天中检查受限消息 DOM 的公开时间属性，按 TIME_METADATA_INVESTIGATION.md 的来源/位置/覆盖/解析/精度/时区/一致性输出安全计数和固定枚举，不输出实际时间值或任意页面字符串。

必须区分旧消息初始加载、懒加载、刷新、切换聊天与持续观察中新发送消息；用编辑/刷新对照排除更新时间和渲染时间。日期或机器可解析格式本身不能证明原始发送语义。存在扫描上限、共享祖先或局部加载时，不得声称全部消息覆盖。模拟 DOM 只能验证诊断不泄漏，不能代替真实时间元数据样本。

后续模型/排序实现须验证 sourceSentAt 未知不回填 capturedAt；firstObservedAt 明示 approximate；pageOrder 不冒充全聊天稳定顺序；已知/未知混合排序保持一致性。历史补录、去重与不可变原文继续保留。

## v0.1.2 turn contract 回归

仅调整 role 自身 ID 与旧 turn 的依赖，所有 fixture 都为人工虚构，不能视为完整真实 DOM。至少验证：

1. 无旧 turn wrapper 的可见 user role，自身合法 ID、唯一安全正文及稳定窗口通过后可成为候选并保存；独立检查无任何 wrapper 与非 article 包装两种形态。
2. 无 wrapper 且无合法 role ID 必须跳过；即使祖先/后代存在 ID 也不新建身份兜底。
3. assistant role 即使具有合法 ID、已知正文容器也不捕获；页外 user role 不捕获，main/role 整体文本读取器抛错时仍只读已确认正文叶子。
4. 无 wrapper 时，role 自身/祖先编辑态、role 内可见 input/textarea/contenteditable/textbox 均拒绝；旧 turn 内 role 之外的编辑控件继续阻止捕获；main 内独立输入框不被读取。
5. 无 wrapper 时，未知/多个/嵌套/隐藏/不安全正文容器、busy 状态、重复 ID 和跨聊天旧节点仍按原规则拒绝。
6. 真实加载 MV3、只返回本地虚构页面，验证无 wrapper 消息保存；相同消息重复扫描、刷新、多标签不增加记录，同文不同 ID 仍分别保存。
7. 核对诊断中 turn=0、editor 可检查且通过、候选继续出现；UI 清楚显示编辑检查范围。继承 v0.1.1 的诊断白名单及原有全部测试。

## v0.1.1 结构诊断回归（历史基线；turn 预期以 v0.1.2 为准）

这是根因定位阶段，不将假设 fixture 冒称为当前真实 ChatGPT DOM。使用虚构页面分别复现：role 缺失、turn 不是 article/标记缺失、ID 在 role/祖先/后代或格式非法、普通 input 与编辑框排除、正文选择器缺失/位于 role 自身、多容器/嵌套容器、隐藏/不安全容器。验证原有捕获结果不变，计数能区分这些情况；将正文、标题与 HTML 读取器设为抛错，验证失败诊断仍可产生。

增加 schema 白名单/类型/长度/截断测试，发送端、后台持久化和 UI 都不得带出正文、URL、标题、ID 原值、哈希或任意附加字符串。验证未同意、暂停、临时聊天、无正式 ID 时不探测消息结构；旧数据可升级读取而不改记录。合成 Chrome 验证结构摘要显示与安全反馈，不读取真实页面。区分版本不一致与 DOM 不匹配。

确认混合正常/超长消息在保存后仍上报超长跳过状态；诊断发送失败后能重试。MV3 集成须核对后台持久存储中的结构计数、档案页具体字段、弹窗概览及暂停清除，不能仅断言页面包含某个数字。

用户更新后只需：重新加载扩展、刷新目标 ChatGPT 标签、等待约 5 秒、打开档案页的「捕获诊断 → 结构诊断」，反馈该块安全摘要。为避免多个标签覆盖全局最后一次诊断，定位时只保留一个待测 ChatGPT 标签；无需反馈正文、完整页面截图、URL 或 message id。根因未确定时继续保留阻断状态，不能宣布修复完成。

## 自动检查（最终执行结果另记 TEST_RESULTS.md）

只用人工虚构数据。检查全部 JS 语法、Manifest 引用/权限/CSP/本地资源；源码审计网络、键盘、Cookie、剪贴板等禁用接口。验证：默认关闭及同意代次；暂停迟到批次；来源限制；并发写；重载/重渲染去重；同文不同消息；源消息修改留旧快照；原文不可编辑；隐藏/回收站/永久删除墓碑；配额失败不损坏既有状态；导出换行与代码块；ChatGPTAdapter 合成 DOM 对 AI/草稿/临时聊天/无身份/编辑状态/不确定容器的排除。

自动测试不读取 Chrome 用户配置文件，不连接 ChatGPT，不使用登录账号。若可用，以专门的临时无账号测试环境验证扩展/UI；不触碰日常 Chrome 用户数据。所有截图/夹具只能是虚构数据。

## 必须由用户在桌面 Chrome 登录后手工验收

每步只输入虚构测试文字，自己查看结果即可，不必把正文发给开发者。尚未执行的条目一律不算通过。

1. 在 chrome://extensions 打开开发者模式，加载含 manifest.json 的项目文件夹。无加载错误，弹窗默认关闭、0 条；档案显示首次说明与未选中的同意框。
2. 同意前打开普通 ChatGPT 对话，发送虚构消息；确认记录仍是 0，草稿/AI 回复均未保存。
3. 阅读说明、勾选同意并启用，刷新已打开的 ChatGPT 标签页；发两条不同文字，档案有对应原文、聊天信息、顺序、时间、哈希；仅已显示的旧用户消息也可能被收录。
4. 输入未发送草稿、修改草稿、等待 AI 长回复；确认没有草稿/AI 内容新增。含附件消息只可抓其确认文本容器，不保存附件内容。
5. 刷新、切换聊天、打开同一聊天两个标签、等待重渲染，数量不重复增加；在同一聊天发送两条完全相同的虚构文字，两条都保留。
6. 暂停，发送文字，保持暂停时记录不增加；恢复后当前已显示的文字会补收。快速暂停/恢复，不能把上一授权代次的排队数据偷偷写入。
7. 新建 Temporary Chat 发虚构消息，记录不增加，诊断显示跳过临时聊天或等待正式聊天 ID。关闭临时模式回到普通聊天，捕获恢复。临时聊天若出现陌生 UI、误捕，立即暂停并视为未通过。
8. 普通新聊天在首页尚无 /c/<id> 时跳过，正式 URL 出现后才捕获。GPT/项目内聊天也测试；不支持的 DOM 应跳过并给出诊断。
9. 在 ChatGPT 内编辑已发送文字：编辑器里的草稿不采集；重新发送后可能新增快照，先前原文不变。刷新不会重复保存同一快照。
10. 测试中文、英文、多行、空行、引号、emoji、代码块、长文字，原文保留页面实际显示的文字和换行；查看分页/虚拟化加载的限制是否明确。
11. 时间线、聊天分组、关键词（原文/标题/备注/整理版）搜索有效；保存备注/整理版后刷新仍在，原文和哈希不变；切换记录时未保存编辑有提示。
12. 隐藏→默认列表消失→隐藏区可见→取消隐藏；删除→回收站→恢复；永久删除需确认，之后刷新 ChatGPT 不会重新捕获同一快照。
13. 导出当前范围 JSON/Markdown，核对数量/原文/备注/整理版/多行/反引号完整；默认不含隐藏或回收站，回收站禁止导出。浏览器下载不应请求 downloads 权限。
14. 弹窗总数/状态与档案一致；关闭 Chrome 后重新打开仍保留本地内容和暂停状态。扩展更新后刷新 ChatGPT；诊断时间过旧时不得误显示实时正常。
15. 在 chrome://extensions 查看权限，仅 storage 与 chatgpt.com 静态内容脚本站点范围。访问其他网站无内容脚本。扩展 DevTools Network 无扩展主动网络请求（勿把 ChatGPT 自身请求当扩展请求）。
16. 断网后档案可搜索/编辑/导出；现有 ChatGPT 页面仍可观察已显示文字。接近配额时不静默丢数据；自动测试模拟的失败不能替代真实大数据性能验收。

## 测试记录方式

只反馈条目编号、通过/失败、错误代码、Chrome 版本及适配器版本。不要提交真实正文、标题、URL、日志截图或 Chrome 配置数据。不能通过清单时保留暂停状态并回退相应 Git 检查点；回退源码不会回退/恢复已删除的扩展存储。

## Golden兼容性门禁

新增sanitizer/隐私扫描、格式导入、自检及完整MV3回放自动测试。采样器发布只需合成工具链全绿；后续候选版本发布必须存在经过再次扫描的真实Golden，并通过MAIN fetch→结构检测→buffer/drain→isolated→canonical→Resolver→store→UI，不从中间注入metadata。真实Golden缺失单独记UNAVAILABLE，不能记PASS。所有Fake回归、privacy/permission/network/diff审计仍必跑。

新默认验证顺序：主全量测试自动包含Golden（首次缺失单独SKIP）、Fake和browser回放；两类静态审计通过后绑定源码摘要。正式候选必须真实Golden已导入且回放通过；当前只交付采样工具。只有结构变化/正式发布前才请求Compatibility Self-Test，不要求每个内部版本登录或smoke。

## 当前真实 Chrome 调试（取代独立采样验收）

用户授权通过电脑控制现有已登录 Chrome 自行验证、重载并迭代；不再要求 sampler/QA 登录或人工 smoke。2026-09-06 实测：旧聊天历史 fetch 来自 `/backend-api/conversations/{id}`；现有 provider 在读取 540672 字节时触发 other JSON 的 512 KiB 上限，未到 JSON decode。只为同源、当前 conversation exact endpoint 提供 2 MiB 有界读取额度；一般 other JSON 仍为 512 KiB，身份/结构/time contract不放宽，不增加请求/权限。临时探针仅输出计数和时间/已有内容哈希，不导出正文或整个档案对象；完成后去除。真实旧聊天的 3 条 canonical 用户记录已恢复历史发送时间；刷新、重复打开和正式档案 UI 验证通过，capturedAt 与已有内容哈希不变。临时探针及显示遮蔽已移除；详情见 TEST_RESULTS.md。

## M2 final acceptance references

The complete M2 mapping is in [M2_TEST_TRACEABILITY.md](M2_TEST_TRACEABILITY.md). Final suite counts, source digest, measured performance and visible Chrome evidence are recorded in [outputs/v070-m2-acceptance.md](outputs/v070-m2-acceptance.md). `outputs/v070-m2-editor-edge.mjs` and `outputs/v070-m2-ui-review.mjs` are independent synthetic-only Chrome checks; neither is shipped in the extension.


## M2 UI polish scope

From approved `48b3405`: quieter reading chrome only. Entry/Section actions appear through keyboard-accessible hover/focus ellipsis; expanded note/provenance stays open. Topic creation stays prominent; pin/merge/history move to its menu, Undo/Redo stays available by shortcut with subdued editing-only buttons. Library maintenance and removed content move to Settings; unplaced content remains an ordinary Library filter. Source status uses natural language, technical versions sit inside advanced details. No schema/model/background/storage semantics, Provider, daily installation or M3 changes. Validate existing M2/Input regressions plus isolated synthetic visible Chrome reading/menu/focus/settings/provenance tests and screenshots; finish a separate local polish checkpoint.

Polish evidence: [M2 UI polish acceptance](outputs/v070-m2-polish-acceptance.md).


## v0.7.0 M5 final acceptance

Foundation data/UI and Organizer mechanics passed final integrated acceptance. Real Organizer intelligence is not connected; production provider registry remains empty. Only synthetic isolated Chrome validation is authorized. Dedicated Foundation artifacts use version 0.7.0, while the source manifest retains the frozen compatibility harness version. Release-structure packaging removes internal diagnostic UI and response diagnostic arming without changing capture, storage, filtering or import semantics. No daily installation or network permission changes. CLOSED / FROZEN requires the final report and all gates.

M5 final: 668/668 tests, 0 failed, 0 skipped. See `outputs/v070-m5-acceptance.md` and the final checkpoint `checkpoint-v0.7.0-thought-library-foundation`. Dedicated internal/release-structure artifacts use `scripts/build_foundation.py`; they are not deployed to the daily installation. Thought Library data/UI foundation complete; Organizer mechanics complete; deterministic/mock full-chain validation complete; real Organizer intelligence NOT yet connected.
