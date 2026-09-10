# PAIA v0.7.0 M3 Organizer Foundation — 验收报告

基线：`571869e` / `checkpoint-v0.7.0-m2-ui-polish`。
独立分支：`codex/organizer-foundation-v070-m3`。
工程目录：`/Users/hhf/Documents/Codex/2026-09-07/paia-organizer-foundation-v070-m3`。

本报告只描述 mock-only Foundation；没有真实模型、embedding、私人数据测试、日常安装或正式发布。完整契约见 [ORGANIZER_MECHANICS.md](../ORGANIZER_MECHANICS.md)。

| 项 | 实际结果与证据 |
|---|---|
| 1. 修改文件 | 新增 `core/organizer/{contracts,budget,gateway,validator,policy,commit,store,runner,metadata}.js`、`ui/library-updates.js`、3 个 M3 test 文件及 `tests/fixtures/organizer/provider.mjs`。`library-search`/`library-layout`/`thought-journal`/`thought-maintenance` 增加 AI 组织名称的来源门禁、清理 locator 和历史/复制保护。后台接入 OrganizerStore 与空 registry runner；M2 UI 增加 Updates/低频任务管理；测试分组注册浏览器验收。README/PRODUCT_SPEC/PRIVACY/TEST_PLAN/AGENTS 与本契约同步。[逐文件清单](v070-m3-changed-files.txt)。没有更改 schema、捕获/导入/过滤实现或冻结 M1/M2 worktree。 |
| 2. OrganizerProvider | `organize.v1` 有界 request/response，adapter/model/schema 标识；只有本地映射的临时 refs。productionProviders 固定为空。CredentialProvider 无具体厂商字段或 secret 存储；Fixture 位于 tests，不在生产导入图。 |
| 3. InputProjectionGateway | 单 conversation、当前 eligible working Input、最多 8 targets + 2 有限近邻 context；Smart Filter 排除 target；最多 4 个依赖相关 Entry、20 Topic/20 Section。通过底层当前 Input resolver 解析 working body，Source DTO/原始快照/assistant/无关内容不进入 Provider envelope。 |
| 4. Jobs | 持久 selected/dispatched/committed checkpoint，owner/fence/lease、每次尝试独立 requestId/scopeToken、退避 retry、resume/cancel、请求去重、原子结果 receipt、逐次审计/逻辑用量 reservation。Provider 等待在 store 串行队列和 IDB 事务外。Chrome 实际终止 worker 后，新 generation 可接管并完成持久任务。 |
| 5. CandidateValidator | 严格字段/schema/enums/count/bytes、Input/Topic/Section refs、有效 offsets；context-only 禁止成文；synthesized 至少两个独立非-context Inputs；inferred 仅 suggestion。未知字段、confidence 授权、relation、跨范围 ID、部分候选失败都拒绝。 |
| 6. ActionPolicy | 唯一 allow/suggest/deny；创建/分类/组织/精确证据合并低风险路径，inferred/ambiguous/protected refresh/reconsider suggestion，非法修改与旧证据 suppression deny。接受建议通过 user actor 分支。 |
| 7. LibraryCommitService | 同事务重验 evidence、consent、filter/removal/tombstone、lease/cancel、Entry/Topic/Section CAS、layout generation/redirect、protection/Placement。陈旧结果不覆盖；中途失败回滚 Entry、Topic、provenance、receipt。AI Topic/Section 名称也受来源硬门禁与物理清理，用户改名保留，旧名称历史与布局复制不能绕过。 |
| 8. Exact duplicate | HMAC 完全一致正文 + type + 非-context 来源范围；不同事件同文字不合并。只追加证据/provenance/dependency，不改人工正文和组织。无 semantic duplicate/related/evolution 功能。 |
| 9. Suggestions | pending/accepted/rejected/expired/superseded；baseRevision 必须匹配。用户接受有 journal/protection（exact 一致内容也确认保护），拒绝保留版本化 logicalKey，旧 base 接受时过期；新 base 的同类建议将旧 pending supersede。Updates N/drawer 支持 accept/reject。 |
| 10. Suppression | 投影前与提交前检查；旧证据、换措辞、context-only 增加均不能自动恢复。真正新增非-context evidence 仅 reconsider_removed suggestion；删除仍是用户行为。 |
| 11. Stale/refresh | M1 invalidation 继续生效；未人工处理 AI Entry 只对 directly grounded explicit 正文自动 refresh；人工正文只建议。note-only 未被依赖不 stale；未被候选显式引用的 request context 仍保留 context dependency，修改不提升为 primary。 |
| 12. BudgetPolicy | input/context/content/request/output/candidate/retry/concurrency/session/daily 全部有上限；跨 worker 保存，时钟回拨不补充预算，dispatch 后不退款。monetary 接口预留，未实现真实 billing。 |
| 13. 自动测试 | **664/664 通过，0 fail / 0 skipped**；原 592 项 + M3 72 项（70 unit、1 可见 Chrome、1 Chrome performance）。[匹配代码摘要](v070-m3-test-summary.json)；fullSuite/auditPassed=true，inputDigest 一致性门通过。原有 Input Archive、Smart Filter、History Completion、M1/M2 UI/存储测试均继续执行。 |
| 14. Fault injection | timeout、429 分类、5xx/crash 安全错误、invalid JSON/schema、oversize/enum/ref/unknown fields、prompt-injection-like text、stale base、late/duplicate/partial response、事务中断、取消、租约接管、真实 Chrome worker 重启。 |
| 15. 性能 | [机器可读性能报告](v070-m3-performance.json)：1k/10k Inputs 按索引选择固定 8 个（80 reads），有界批次、exact/provenance 提交、resume、40 条建议/大 Topic 分页、100 条 stale fan-out；单独报告模拟 Provider delay，不作为 IDB 延迟。夹具为直接播种的 synthetic 索引，非官方导入数据。 |
| 16. isolated Chrome | [验收状态](v070-m3-ui/acceptance.json) 与下方截图。独立临时 profile、测试副本注入 fixture、完全 synthetic。自动创建、exact、Topic/Section、Updates accept/reject、人工正文保护/stale、删除 suppression、实际 worker 终止/新实例恢复均执行。 |
| 17. 隐私/权限/网络 | manifest 权限仍仅 storage；没有新网络、厂商 SDK、secret 字段或读取用户 profile。Chrome 记录 extensionNetworkRequests=0、page errors=[]；package 审计 3747 项 guardrails / 92 runtime resources 通过；development 审计通过。审计日志只含 task/data category/count/size/provider/version，候选正文只存在业务内容/待确认建议中并受来源清理约束。 |
| 18. Checkpoint | 本地 tag：`checkpoint-v0.7.0-m3-organizer-foundation`，指向包含本报告与全部证据的 M3 提交。不 push。具体 commit hash 随最终交付消息给出。 |
| 19. Git 状态 | 提交全部 M3 文件及合成验收证据后复核 working tree clean；冻结 M2 polish worktree 已复核 clean，HEAD 保持 `571869e`。 |
| 20. 已知限制 | 真实 Provider/public credentials/网络 transport/token 与 money billing/embedding 均未实现。自动调度不在空 registry 上运行，测试通过显式 scoped coordinator 与 runner 驱动。预算 session 保守跨 worker 累计。建议 expired 是接受时惰性检查。现有 internal 标签仍显示 M2（没有升级 manifest/包版本）。本次不声称真实私人 ChatGPT 页面或日常部署验收通过。 |

## 真实隔离 Chrome 截图

所有文字均为人工合成；使用 M3 实际 runtime UI，fixture 只在测试副本后台注入。

1. [自动生成的 Topic Document](v070-m3-ui/01-topic-document.png)：低风险 Entry 自动创建、Topic 与 Section placement、连续正文、弱 Type。
2. [Updates drawer](v070-m3-ui/02-updates.png)：inferred 建议，接受/不采用入口。
3. [人工正文受保护与来源更新](v070-m3-ui/03-protected-stale.png)：用户正文保持，弱 stale 提示，Updates 1。
4. [接受刷新建议](v070-m3-ui/04-accepted.png)：用户确认后的正文与建议状态。
5. [Settings 整理任务](v070-m3-ui/05-jobs.png)：低频状态管理，未引入 Entry AI 按钮或 dashboard。

完成 checkpoint 后停止在 M3，不进入真实 Provider 阶段。

## 本轮性能实测

下列 commit/exact/resume 为有界本地流水线耗时（含投影/验证/实际提交），Provider 为即时 fixture；单独的模拟 delay 不混入这些数值。不是纯 IDB API 延迟。

| 数据量 | 选择 8 Inputs | 本地创建流水线 | exact 流水线 | 40 条建议分页 | 40 条大 Topic 文档 | 100 条 stale fan-out | resume | 单独模拟 Provider delay |
|---|---|---|---|---|---|---|---|---|
| 1000 | 3.6 ms | 8.7 ms | 5.2 ms | 2.5 ms | 33.8 ms | 48.9 ms | 7.3 ms | 27.6 ms |
| 10000 | 8.7 ms | 9.8 ms | 7.1 ms | 26.7 ms | 38.3 ms | 54.2 ms | 9.4 ms | 27.0 ms |

选择读取量在 1k 与 10k 均为 80，未随库大小扩张。M1/M2 原有大库、迁移、编辑、布局、搜索与导入回归也包含在 664 项中。
