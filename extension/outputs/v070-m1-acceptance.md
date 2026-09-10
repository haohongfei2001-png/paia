# PAIA v0.7.0 M1 — 最终验收 / checkpoint

日期：2026-09-07。结论：**M1 Data Safety & Core Model 完成；停在 M1。** 设计契约 `77176f5`，继承稳定基线 `2b07582`。没有真实 AI、私人正文、日常安装操作或 M2 实施。

## 1. 实际实现文件

独立工作树 `/Users/hhf/Documents/Codex/2026-09-07/paia-thought-library-v070-m1`，分支 `codex/thought-library-v070-m1`。

新增 9 个 runtime 模块：`core/thought-schema.js`、`thought-model.js`、`thought-store.js`、`thought-evidence.js`、`thought-migration.js`、`thought-journal.js`、`thought-organization.js`、`thought-maintenance.js`、`thought-runner.js`。修改 `core/idb-repository.js` 的可选 v5 DDL/连接处理，以及 `background/service-worker.js` 的 Store 接线、本地维护和只读状态命令。

新增 M1 数据/runner/Chrome 测试及 synthetic harness，扩展实际 IndexedDB 性能测试。旧浏览器夹具改用 v5 reader；旧 Thought 完整 UI 的历史回归显式运行 frozen `2b07582`，不算作 M2 UI 验收。源码测试归组在 `scripts/test-groups.mjs`。

结构与写入契约详见 [实施说明](../M1_DATA_SAFETY.md)。[144 项逐项追踪](../M1_TEST_TRACEABILITY.md) 将其中 95 行的 M1 子契约与后续 UI/Organizer 子契约分开，不声称 144 项整体已经完成。

## 2. IndexedDB v5 schema

物理 v5，共 **37 stores**：保留全部 25 个旧 store，新增 `topics/sections/placements/provenance/thoughtSuppressions/organizerJobs/organizerWorkItems/organizerSuggestions/entryRelations/librarySearchTerms/libraryMigrationItems/organizerUsage`。后者仅预留预算账本。

`thoughts` 新行 `storageSchema=2`，Family/Type/formation、五类版本号、三维状态、字段保护/作者证据独立。Topic UUID 与名称解耦；Section 持久 ID；Placement 按 Topic/layoutGeneration 独立组织、共用 Entry 正文。索引覆盖来源清理、依赖 fan-out、移除 outbox、修订分页、唯一 placement/contribution/receipt 身份。`byMaintenance` 独立选择 purge job，其他 queued jobs 不能挡住清理。

逻辑 `chrome.storage.local.schemaVersion=6` 控制指针不变，没有把它当成物理 v6。所有索引定义与逐项断言见 [schema](../core/thought-schema.js) 和 M1 数据测试。

## 3. migration 结果

v3 → v5、v4 → v5 均通过 fake-indexeddb 与 **Chrome/152.0.7977.82** 真 IndexedDB 验证。DDL abort 保持旧版本；blocked/versionchange 可恢复；旧 frozen v3/v4 二进制打开 v5 被拒绝，不能靠删库降级。

100 行批次，cursor 与 mapping 同事务，覆盖 thoughts/dependencies/thoughtHistory/verify 后中断、事务内失败、重跑、非空/未知 Thought、类别 UUID 映射。批次间允许 Input 操作；Library 映射失败后 Input 仍可捕获和编辑，新 worker 可续跑。激活前 Library 内容与历史读取关闭。

旧 Thought 正文、备注、ID、已知历史原地保留；缺失 formation/generator/精确字段作者证据不猜测。未知或来源不可追踪的行隔离；sealed 行阻止 Library 激活。没有把 Input 生成 Thought，没有 raw 副本或新整库备份。实际 schema 证据见 [Chrome 结果](v070-m1-chrome-schema.json)。

## 4. 自动测试数量 / 失败 / skipped

最终完整运行：**557 通过，0 失败，0 skipped**。其中 M1 新增 49 项，原基线 508 项仍在本轮运行；部分历史 UI 行使用明确标记的冻结 runtime。

| 分组 | 通过 | 失败 | skipped |
|---|---:|---:|---:|
| adapter contract | 95 | 0 | 0 |
| unit | 315 | 0 | 0 |
| browser E2E | 105 | 0 | 0 |
| privacy/security | 42 | 0 | 0 |

另有 **3 项补充真实隔离 Chrome 检查通过**，独立记数，不混进上述 557。证据：[完整自动结果](v070-m1-tests.json)、[补充检查](v070-m1-worker-smoke.json)、[可复现脚本](v070-m1-worker-smoke.mjs)。

最终自动输入摘要（代码/测试/工具，不是私人内容摘要）：`0c88b5b45f70b97f2a73b77108fd0fb336724da1ecd50ce00b9458d5b0ad29e7`。完整运行同时完成 package/development 审计；`fullSuite=true`、`auditPassed=true`。

## 5. invariant 结果

逐字段比较 Source 原文/身份/hash/sourceSentAt/capturedAt、Input working text/note/title、已有 Input revisions/removal markers、tombstones、Smart Filter decisions/versions、History Completion tasks/batches/evidence/checkpoints；迁移前后相等。Library 的非法请求、事务 abort、迟到提交不写这些事实。

与 `77176f5` 比较，adapter、content、UI、Import 核心、`ia-store.js/indexed-store.js/smart-filter-store.js/smart-filter.js/filter-runner.js`、manifest/package 字节不变。所有 frozen worktree HEAD 与工作状态复核未变：v060 `01a6350`、v061 `f3fa0e7`、v0611 `1e00c23`、v062 `2b07582`、设计 `77176f5`。

## 6. provenance / stale

覆盖单源、多源、primary/supporting/context_only、working body 空串、所选字段、伪造来源/版本/角色、filtered/removed/purged/branch 门禁、note-only 等价、选用 note 时 stale、未选 conversation title 不 stale。原 basedOn 版本不被“验证过新版本”覆盖，无法证明历史正文版本时标 `version_unavailable`。

移除使用持久 `lastRemovalSequence`，依赖记录 `eligibilityEpochAtUse`：Input 在 outbox 处理前删除并立即恢复，旧 AI Entry 仍 invalidated；新合法 Entry 不被旧事件误伤。多源只按当前有效非 context 依赖判断 partial/detached。

## 7. suppression

Thought 删除独立写 lifecycle、important revision、receipt 和 HMAC suppression，不改 Input removal/tombstone。相同证据换措辞/换 provider、旧事件重试、context 新增、仅 note 改动都不能自动复活。新增独立非 context 来源只返回 future eligibility；不会创建/恢复 Entry 或生成 M4 suggestion。抑制记录无正文/embedding，不随 revision 90 天清理过期。

## 8. purge

来源删除事务即时提交 tombstone、epoch/fence 和 metadata-only cleanup job；返回 `libraryCleanup=pending`，全部 cleanup 完成后 pending 计数归零。读取、历史恢复、provenance 和迟到提交都不等待队列才检查。

测试覆盖旧/新 revision、provenance、dependency、search、suggestion、staged job/work item、relation、quarantine、未知附加 payload。未知无来源历史不能形成恢复旁路。150 个其他 queued jobs 不会挡住 purge job。独立人工当前字段保留，无法安全分离的派生正文/混合历史清除；普通 remove 不冒充永久 purge。

## 9. concurrency

两 Store 实例 CAS、相同 operationId 重试/不同 digest 拒绝、写后故障原子回滚、证据验证后 Input 变化/来源 purge、outbox cursor 中断恢复均通过。

补充 Chrome：两个实际标签同时改同一 Entry，恰好一个提交成功；在第 **100** 个依赖修改已提交后停止真实 worker，重启依据持久 cursor 完成剩余 **51** 个，最终 **151** 个 affected Entry stale；Source 全字段相等。输入保存不等待后台维护的整片 fan-out。补充检查还在同一真实 Chrome v5 origin 中实际加载从 frozen `01a6350` / `2b07582` 提取的原 Store 模块，两者均 fail closed，Source 字段不变。

## 10. performance

环境：Darwin 27.0.0 arm64，Chrome 152.0.7977.82，新临时 profile / synthetic IndexedDB。各规模 Input edit 5 次；依赖事件 5 次，p95 在这样的小样本中等于最大观测值。每个 invalidation event 的 fan-out 为表中数量。

| Input | 非空 legacy Thought | fan-out/event | migration ms | edit p50/p95 ms | event p95 ms | purge ms | 写事务 p95/max ms |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,000 | 1,000 | 1,001 | 398.2 | 1.8 / 2.7 | 541.1 | 531.6 | 48.0 / 78.6 |
| 10,000 | 10,000 | 10,001 | 5958.8 | 2.1 / 3.0 | 5874.0 | 8805.9 | 79.0 / 421.4 |
| 100,000 | 10,000 | 10,001 | 11448.5 | 2.2 / 5.8 | 6881.7 | 8375.8 | 65.3 / 535.7 |

所有规模的 Input body edit 均为 **11 次 instrumented reads / 9 次 writes / 0 次 getAll scans**，不随 Thought fan-out 增长。清理前未同步修改 Thought 的持久 freshness；消费者按索引处理 affected dependencies。

观测的单事件 10k fan-out <10s、100 行事务 p95 <100ms、10k legacy Thought 迁移 <60s。存在 >500ms 的最坏写事务尾延迟，不能声称每笔事务均低于 100ms。连续 5 次编辑累积 5 个事件，清理总时长是 5 个事件之和，不作为单事件时延。

同一 Entry 的 10 个 Topic Placement 不复制正文/Entry 历史；200KiB 热文本 24 次跨窗口编辑保留全部年轻 revision；90 天 OR 最新至少 20 个 important 与 AI/user 隔离窗口通过。保留策略没有为性能降低。

[完整测量数据](v070-m1-performance.json) 的 bytes 是浏览器 origin storage estimate（在 M1 大批 Entry 种植之前的阶段采样），不是精确的最终 v5 数据体积。Input 编辑的既有按实体 revision prune 游标仍沿用旧实现；上述 O(1) 仅针对新增 Thought fan-out，不宣称任意历史长度下整个编辑都为 O(1)。UI/search、百万 revision、生产语义质量不是本轮性能结论。

## 11. privacy / permission / network audit

**3,109** 条 package guardrails 通过，覆盖 **73** 个 runtime resources；development 隐私/权限/网络审计通过。manifest 仍仅 `storage` 权限、精确 ChatGPT content 范围、`connect-src 'none'`；没有新网络、云 API、secret 字段、embedding、分析工具或新权限。

Source/Input Writer 与现有可信 sender 白名单保持；没有 Organizer/create/refresh runtime 命令。neutral generator 仅版本元数据；fixture 测试入口只追加在临时验收扩展，关闭后删除，未写入实际 runtime 文件或日常安装。错误仅现有白名单代码，不输出原始异常/私人正文。

所有 Chrome 验收仅新建临时 profile 与隔离 origin；extension network requests **0**。没有读日常 PAIA IndexedDB、用户私人正文、真实 Thought Library 或 Chrome 用户 profile。

## 12. checkpoint

本地标记：**`checkpoint-v0.7.0-m1-data-safety`**，与最终 M1 提交同指向。基线/冻结标记不动，不推送远端。标签解析到的实际 commit hash 随最终答复给出，避免在 commit 自身内写循环引用 hash。

## 13. Git working tree

本报告、源码与安全摘要一起提交在独立 M1 分支；交付前复核 `git status --porcelain` 为空，最终答复确认实际结果。没有日常部署、正式打包或修改 frozen worktrees。

## 14. 已知风险与停点

- M1 不是完整 v0.7.0：M2 UI/search、M3 Provider/Credential/Budget/lease、M4 Organizer/suggestion 和 M5 全面验收仍待授权推进。M1 不承诺 AI 语义正确率。
- 旧 Thought 在版本/作者证据不足时隔离，暂无手工纳入 UI。无法追踪来源的 sealed payload 会阻止 Library 激活；来源 purge 时只能保守撤销无法证明安全的未知 payload/历史，不能用 raw 备份保留恢复旁路。未触碰真实数据。
- Source purge 不能证明纯 AI 内容由存活来源独立支持时，会撤销整段；当前人工字段与权威存活 provenance/dependencies 保留，旧兼容 inputRefs 采取保守清理。未来正常 UI 必须使用第一等 provenance。
- 同 Input body 改动的新颖性在 M1 不自动批准，须 M4 证明；fixed-width rank 耗尽拒绝，generation rebalance 尚未实现。
- 写事务 p95 达标但有较长尾延迟；长文本/大量 important revision 仍会占用可观空间，没有做百万 revision 或生产质量验收。下一可信 wake 可恢复任务，不承诺 worker 存活或准点运行。
- v5 不能直接降级 frozen v3/v4；Library 映射错误需修复后由新 worker/重启继续，不能删库。manifest/package 仍为 0.6.2，当前只交付仓库 checkpoint。

**停止在 M1，不进入 M2。**
