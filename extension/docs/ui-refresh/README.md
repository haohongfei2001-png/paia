# PAIA Chrome UI Refresh v1 — 开发入口

状态：设计已收口；UIR-01 已完成；当前实施轮与恢复点以 `UI_REFRESH_STATUS.md` 为准。日期：2026-09-16。

本次不是重新定义 PAIA，不是重新执行 UX-R1～UX-R6，也不是启动新的夜间开发系统。目标是在完整继承当前 Chrome Extension 能力的前提下，用 **4 轮**重构 presentation / interaction：先解决层级、构图、宽度、阅读与反馈，再由真实使用决定下一阶段精修。

## 1. 仓库、基线与唯一执行分支

- 仓库：`haohongfei2001-png/paia`。
- 冻结的设计/实现起点：`main @ c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`。
- 该提交的根 tree：`1d8402d8c08f075963725178ce31c32891903ac5`。
- UI Refresh 分支：`chrome-ui-refresh-v1`，从上述 main 创建。
- 后续只在此分支串行执行 UIR-01 → UIR-02 → UIR-03 → UIR-04。
- 本档案的首次交付只写文档；不代表任何 UIR 产品代码、测试或视觉验收已经完成。
- 不向 main、ux-r2、overnight 分支写入；不合并旧 PR #28；本次不部署、不发布、不自动合并。

真正的实时 HEAD 是 GitHub 的 `refs/heads/chrome-ui-refresh-v1`。状态文档中的“已核对 HEAD”是带有核对时点的快照，不可能引用包含自身修改的最终 commit SHA。每轮/每次 execution 开始重新解析真实 HEAD；结束报告记录代码提交与随后的文档提交。不要为这个普通 Git 事实建立事务协议。

## 2. 权威与冲突处理

先读 `extension/AGENTS.md`。本次用户明确授权以下**限域覆盖**：

1. `extension/docs/ux/PAIA_DESIGN_CORE_v1.0.md` 仍是最高产品约束。
2. 已确定的产品、架构、来源/人工内容所有权、授权、删除、兼容与安全规则继续有效：PRODUCT、ARCHITECTURE、相关 BACKUP / PRIVACY / AI_CONTEXT / SMART_FILTER 契约，以及旧 UX Specification 的这些语义部分。
3. **UIR 的视觉、页面 composition、交互呈现和分轮验证方式，以本目录 SPEC 与当前 round 为准。**旧 UX Specification / Tokens 的具体宽度、布局、旧轮次流程不是本阶段最终视觉/流程权威。
4. 当前真实代码、测试及有证据的提交决定“已实现什么”；截图或旧报告末尾的下一轮指令不能取代真实代码。
5. `UI_REFRESH_STATUS.md` 是本阶段唯一人工维护的执行状态。旧 `UX_IMPLEMENTATION_STATUS.md` 只用于理解已交付能力，不负责派发 UIR。

基线 main 已合入 UX-R1～R6；旧 UX 状态仍保留“在 ux-r2 进行最后回归”的历史交接文字。本阶段**不因此返回旧恢复流程**，也不将那份历史状态改写成 UIR 状态。基线核对及证据边界见 BASELINE_AUDIT。

只有产品定义、所有权、删除/授权/隐私边界、新 durable schema、新付费/外部 AI 行为，或最高产品约束之间无法调和的实质冲突需要停止并交由用户决定。常规 UI 选择直接按 SPEC 实施。

## 3. 阅读顺序与文档职责

| 文档 | 用途 |
|---|---|
| [SPEC](PAIA_CHROME_UI_REFRESH_SPEC_v1.0.md) | 唯一设计裁决、布局与状态标准、保持不变的行为、共同验收 |
| [STATUS](UI_REFRESH_STATUS.md) | 当前轮次、前轮结果、已核对 HEAD、阻塞、execution handoff 与下一轮 |
| 当前 `rounds/UIR_0N_*.md` | 该轮可直接执行的范围、文件、步骤、命令、journey、截图与交接 |
| [CAPABILITY_TO_UI_MAPPING](CAPABILITY_TO_UI_MAPPING.md) | 四张参考图逐项采用/拒绝；真实数据与控制器的对应关系 |
| [IMPLEMENTATION_PLAN](PAIA_CHROME_UI_REFRESH_IMPLEMENTATION_PLAN_v1.0.md) | 四轮依赖、验证层级、提交和回退约定 |
| [BASELINE_AUDIT](BASELINE_AUDIT.md) | 已核对代码入口、发布耦合、现有能力与历史证据的边界 |
| [DEVELOPER_RUN_PROMPT](DEVELOPER_RUN_PROMPT.md) | 用户每次 execution 复用的短指令 |

新窗口先解析 GitHub 当前分支 HEAD，在**同一个固定 SHA**读取 README、SPEC、STATUS、当前 round；它们已经包含执行所需裁决。按 round 的源码清单补读同一 SHA 的实现与相关契约，不依赖聊天或四张图片仍可见。映射/审查文档用于解释来由，不能扩大当前轮次。

## 4. 四轮固定范围

| 轮次 | 交付 | 任务书 |
|---|---|---|
| UIR-01 | 全局 Shell、导航、搜索入口、tokens、去重复标题、Archive 布局骨架 | [UIR_01_SHELL_AND_ARCHIVE_FRAME.md](rounds/UIR_01_SHELL_AND_ARCHIVE_FRAME.md) |
| UIR-02 | Archive 真实列表、全局/局部 Search、Revisit、Input Reader 与来源/版本呈现 | [UIR_02_ARCHIVE_SEARCH_READER.md](rounds/UIR_02_ARCHIVE_SEARCH_READER.md) |
| UIR-03 | Thought 首页、Topic Reader、Original / Organized、证据与 AI 状态/候选比较 | [UIR_03_THOUGHT_AND_AI_PRESENTATION.md](rounds/UIR_03_THOUGHT_AND_AI_PRESENTATION.md) |
| UIR-04 | Context、Settings、低频工具、共享状态、最终响应式/视觉/完整回归 | [UIR_04_CONTEXT_SETTINGS_AND_ACCEPTANCE.md](rounds/UIR_04_CONTEXT_SETTINGS_AND_ACCEPTANCE.md) |

不增加第五轮作为默认“再收尾”。前轮留下的本轮范围内缺陷，在其完成前修复；最终跨页一致性归 UIR-04。若完整证据证明四轮无法合理执行，在 STATUS 写具体问题，不能自行扩成十几轮。

**正式 round 与单次 ChatGPT execution 从现在起解耦。** UIR-02/03/04 仍是上述四轮中的正式 round；一个 round 可以由多次短 execution 完成。不得为了规避执行时长把产品路线重新编号成大量新 round，也不得因为一次 execution 结束就把当前 round 误标 COMPLETE。

## 5. 所有轮次共同的工作方式

1. 拉取远端、确认分支与真实 HEAD，检查干净工作树；阅读前轮报告并核对已提交代码。只续做本轮，不根据“上次说完成了”推进。
2. 默认只改列明 UI 与必要的现有测试。先调整 DOM/样式的现有 owner，不能另造第二套页面、导航、编辑器、主题引擎或状态数据库。
3. 完成当前 execution 预算内一个**自洽、可验证、可提交**的本轮子集；运行相应 focused gate 与必要 release/browser smoke。只有准备封口当前 round 时才执行该 round 规定的最终完整验收。
4. 用隔离合成数据的真实扩展浏览器渲染需要的截图，自己打开图片检查。截图不是 HTML mockup；截图文件存在不等于已经看过。
5. 每次 execution 在停止前都优先持久化正确成果：提交并 push 已完成的自洽代码/测试，更新 STATUS 的已完成/剩余/验证/handoff；若当前 round 尚未满足全部 acceptance，则保持 `IN_PROGRESS`，不得为了“本次有结果”写 COMPLETE。
6. 当前 round 所有要求通过后，再提交 round report、最终证据与 STATUS=COMPLETE。必要时可同一提交；报告必须明确实际验证的代码版本。发布文档提交后核对其没有偷偷改变被验证的运行代码。
7. 推送普通开发分支；核对 GitHub 内容和 HEAD。仅向用户报告本次 execution 结果、当前 round 状态、验证/限制和下一继续点，不重写产品分析。

不 force push，不用 reset 抹去他人工作。若远端已有本轮未完成提交，先核对并续做；若出现无法解释的产品改动，记录具体差异后停止。这里是普通串行 Git 协作检查，**不是 lease / owner / pending-publication 协议**。

### 5.1 多 execution 时间边界与可恢复性规则

- **可恢复性高于单次完成整轮。** 不要求一次 ChatGPT 执行把一个正式 UIR round 全部做完。
- 单次 execution 的目标时长约 **35–45 分钟**。到约 **30–35 分钟**后，不再开启新的大型子任务，转入 focused 验证、commit/push、STATUS 和 handoff。
- 若一个子任务本身已经开始且接近完成，可以完成其最小闭环；不要为了凑满 round 继续开启下一大块。
- 每次 execution 开始先审计当前真实 HEAD 与 STATUS；若 round 已 `IN_PROGRESS`，先核对自上次 handoff 后的真实提交，**不重做、不回退正确工作**。
- 每次 execution 只选择当前 round 中一个自洽剩余子集。可以按真实依赖自然形成 Archive/Search、Reader/Revisit、visual/final acceptance 等子集，但这些只是 execution scope，**不是新的正式 round ID**。
- 开发中的 execution 默认运行 focused tests、相关 guards、必要 release smoke/browser smoke；不要每次都无意义地重跑 Full Suite。当前 round 的最终封口和 UIR-04 最终验收仍按任务书/计划执行完整 gate。
- execution 未能封口 round 时，STATUS 必须记录：已完成、剩余、已跑验证及结果、未跑验证、当前远端 checkpoint、下一次继续点。可以写独立 execution handoff，也可以把 handoff 放在 STATUS；不得要求用户记住聊天中的进度。
- 若工具/会话开始出现停止思考、长时间无进展、执行通道失效等迹象，优先收口当前已完成工作并停止，而不是继续消耗到不可恢复。

## 6. 完成状态与证据

状态仅用 `NOT_STARTED / IN_PROGRESS / BLOCKED / COMPLETE`。`COMPLETE` 同时要求：行为正确、规定 gate 通过、真实截图、Agent 视觉检查、修复完成、证据和报告进入 GitHub。没有浏览器环境不能以静态截图替代；没有通过最后完整回归不能写整体完成。

代表性截图与视觉检查表放 `extension/docs/ui-refresh/evidence/UIR-0N/`，仅使用虚构测试数据；其余原始日志可保留现有 work 输出或既有 Actions artifacts，报告写实际链接与有效期。不能只给一个未来窗口无法取得的本机路径。旧截图只作 before，不作新 UI 的 after。

现有测试有结构/选择器断言。允许随真实 DOM 改动更新定位方式和旧视觉常量；不得移除行为断言、降低对比度/点击目标标准、增加 timeout 掩盖竞态、将失败测试移入历史组。

## 7. 不变项与明确不做

全部继承：ChatGPT capture、历史导入、Source/Working Input、Reader/阅读位置、Universal Search、Revisit、Thought bindings/revisions/human protection、AI 原话/整理视图与候选/CAS、Context 手动与 Grant 路径、Passport、Smart Filter、设置持久化、Backup/Restore、JSON/Markdown 导出、local-only、权限/删除/tombstone、IndexedDB 兼容、release 与 privacy guards。

不新增：模型能力、思想成长结论、任务清单、自动分类法、推荐排名、全量浏览历史、AI 流水线、授权概念、数据库表、持久化正文副本、云同步、外部 API/MCP、付费重试、调度器、控制分支、CI carrier、夜间 campaign、大状态 JSON。无山水、树、水墨、虚构统计、引语、用户身份或示例内容注入真实库。
