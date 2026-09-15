# Capability → UI Mapping v1

基线：`c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`。所有源码短路径相对 extension/。本表的 PRESERVE / RESTYLE / OMIT 指本阶段处理，不意味着删除长期产品方向。

## 1. 参考图采用 / 不采用矩阵

四张图按用户发送顺序编号；未来 Agent 无需取得原图，下面已固定采用内容。

| 图 | 采用 | 不采用 / 原因 |
|---|---|---|
| REF-1：档案长文与右栏 | 稳定左栏；标题与搜索同属页头；宽主区、轻边框、克制绿色；辅助信息与内容分层；长文的段落节奏用于 Reader | 山水/树/水墨；虚构用户与引语；128 条/日期/分类统计；“产品研究与决策”不能变成新的 Archive 工作区；长全文卡不直接移植普通文档列表，因为该 DTO 没有正文预览；右栏分类体系全部省略 |
| REF-2：纵向思考线索 | Topic 的清楚标题；当前理解与证据时间线两级阅读；阶段旁直接核对真实片段；已有整理开关；相关材料弱于正文 | 不强制 6 阶段、固定日期或“从焦虑到成熟”的结论；不把引号内 AI 文本当用户原话；不开启开关即自动产生整理；不新增推荐系统 |
| REF-3：宽屏主题阅读 | Topic 外壳充分利用宽屏；概览用一块轻底色；章节之间明显层级；目录/证据按需；不把正文局限在一张窄卡 | 山水/鸟/风景文字；固定四张核心原则卡；横向四阶段人生进步模板；核心问题/判断/仍待确认/下一步四栏的硬编码；“下一步”复选任务系统 |
| REF-4：处理中 | 清楚的任务状态；真正未知内容的轻骨架；同一布局保持稳定；更新仅影响相应区域 | 整页持续模糊、流光/山水、每卡虚假进度条、用计时器伪造阶段或完成百分比；处理期间撤走已经保存且仍可合法阅读的稿件 |

绿色只作焦点/选中/轻强调。产品默认不生成图片里的示例内容、人物、日期、标签、金句或统计。测试 fixture 可以有明确标记的合成内容，但只能在隔离测试库中，不能是 runtime fallback。

## 2. 逐项能力映射

| ID | 参考模块 / 用户任务 | 当前真实能力与字段/控制器 | 处理与最终位置 | 无数据/不支持时 | 轮次 |
|---|---|---|---|---|---|
| C01 | 左导航 | archive.js 的 library / thoughts / memory / settings；reader-navigation 同 URL history.state | RESTYLE：档案、思想库、用于 AI；设置底部。保持原 data-view 与导航 owner | consent 未授予保持原 first-use 分支，不伪装已保存 | 01 |
| C02 | 档案内容列表 | showCollection 的 state.documents，标题/真实发送范围/messageCount/unknownCount；没有正文 snippet | RESTYLE：轻量对话行，真实标题最多两行、时间与条数一行；源类型仅在有辨识价值时显示 | 不逐文档拉全文、不生成摘要、不留空“正文卡片”；未知发送时间明示 | 02 |
| C03 | 首屏长文 | DocumentEditor、现有 Input 正文与日期分隔 | RESTYLE：进入 Reader 后连续阅读；不把首篇全文塞进首页 | 无可见输入与空库区别；保留来源/恢复入口 | 02 |
| C04 | 搜索栏 | universal-search.js → SEARCH_INPUTS；现有全页 search-task 与输入框 | RESTYLE：页头宽搜索入口，点击/Enter/Cmd-K 聚焦现有真正的搜索 input；结果仍由原控制器拥有 | 读失败不是无结果；不添加联想模型或新索引 | 01/02 |
| C05 | 当前范围搜索 | #search 的 Input search；#thought-search；#topic-search | PRESERVE，放明确命名的二级“在档案/思想库/当前主题中查找”；Topic 内可以展开紧凑搜索行 | 清除条件回同一范围；不能用局部结果宣称全库无结果 | 02/03 |
| C06 | 最近浏览 | PAIA_READER_RECENT / reading:v1；core-loop.refreshReading | RESTYLE 为“继续阅读/最近阅读”，最多显示现有返回中的少量条目，位于 Archive 辅助区 | 没有 anchor 就省略；最近收录可作为单独、有真实名称的备用入口 | 01/02 |
| C07 | 最近收录 | GET_PAGE library limit 1 / capturedAt；core-loop.refreshRecent | PRESERVE，明确“最近收录”；不改变历史表达排序或制造阅读事实 | 缺失则不绘制空卡，不改称继续阅读 | 01/02 |
| C08 | 回来看看 | RevisitService、fixed visit window、bounded new/topic/opt-in old candidates | RESTYLE 为轻入口与二级阅读页，显示真实范围/部分结果说明 | 无新增不等于清零；旧内容未 opt-in 不查/不显示主动旧推荐 | 02 |
| C09 | 右栏内容分类 | 没有 mockup 中“我的笔记42/会议18”等固定 taxonomy | OMIT 整个虚构分类树；不以关键词或模型补造 | Archive 的真实范围筛选仍可用 | 不做 |
| C10 | 统计卡 | 现有结果/分页实际数量，部分计数可能不完整；非统一总输入数 | 只在当前列表显示服务支持的真实数与单位/范围；不做新的总量仪表盘 | 无确切总量时写已显示/部分，不填 0 或 128 | 01/02 |
| C11 | Thought 主题首页 | thoughts-base.paintHome、LIBRARY_INDEX_PAGE、真实 Topic、summary/sourceHint、countComplete/countApproximate、recent | RESTYLE：稳定主题网格/紧凑列表、已有简介、真实状态；保留人工名称与选择的布局 | 无来源足以证明的摘要不写“你认为”；计数 incomplete 不当精确总量 | 03 |
| C12 | Topic Original | TOPIC_DOCUMENT_PAGE、library-entry-editor、topic-reading-state、bodyBinding/protection | RESTYLE：主题标题、排序/目录、连续原话/人工工作内容；同 Thought 多 placement 一致 | 无条目时从档案加入或写今天的新想法；不生成 AI 概览填空 | 03 |
| C13 | 当前理解 | AIReadingEditor：blockSummary、currentView；已有 presentation/revision | RESTYLE：Organized 中轻底概览；摘要与当前理解不机械重复；标已有 AI 整理与真实人工编辑信息 | Original 不强行出现；无缓存保留 Original + 显式首次生成现场 | 03 |
| C14 | 思考演化 | possibleEvolution[].text / evidenceEntryIds；evolution-model.evolutionPlan；sourceSentAt、证据读取 | RESTYLE：真实有证据的纵向线索；缺阶段时用“原话时间线”；未知日期单独标记 | 不从时间顺序推导信念变化，不固定阶段数；无证据则说明不足/省略 | 03 |
| C15 | 相关片段 | presentation.evidenceEntryIds、possibleEvolution 关联、现有 Thought 来源/绑定、GET_LIBRARY_ENTRY | PRESERVE+RESTYLE：在相应段落/线索下展开“相关原话”；未分组证据可列“相关材料” | 不做全库推荐；来源删除/受阻立即不可见，不用旧 excerpt 补齐 | 03 |
| C16 | 核心原则四卡 | 仅有可选 keyInformation / preferences / decisions / judgments 等字段，无“固定四原则”能力 | OMIT 固定模板；已有真实非空可选字段仍以其本来语义在“其他已保存的整理”披露 | 不把 preferences 自动升级为原则，不生成内容来撑满四格 | 03 |
| C17 | 核心问题/待确认 | 可选 openQuestions / judgments 等已有整理字段 | 使用真实字段的章节/折叠阅读，不强制并列四卡 | 没有就没有；不用用户材料被动创建问题/结论 | 03 |
| C18 | 下一步 checklist | 当前没有由该图支持的可持久任务完成模型 | OMIT 交互式勾选清单；已保存的文字若提到下一步仅按文字显示 | 不新增 task store、完成率或提醒 | 不做 |
| C19 | AI 整理开关 | #ai-presentation-toggle、TopicAIViewSession、switchView，原话/缓存视图 | RESTYLE 为清楚 switch，语义仍“本主题的呈现视图”，不是全局授权/自动任务 | 无 Key 可读已有稿；无结果时确认后才首次生成；切缓存 0 Provider | 03 |
| C20 | AI Processing | runtime.state prepared/sent/response_received/validated/committed；bounded state；UI pending/statusUnavailable | RESTYLE 单一任务状态区，真实阶段；未知总量 indeterminate | 状态 unavailable 不假作 running；outcome_unknown 明示需检查、无自动重试 | 03 |
| C21 | 更新比较 | ai-candidate.js staged adopt/keep；thoughts.js saveCandidateChoices；expectedRevision/CAS | PRESERVE：当前/候选逐字段比较，选择后一次 guarded save；对比布局宽屏双列、窄屏上下 | stale 禁用采用/保存并说明；已有稿不被候选覆盖，离开保护现有缓冲 | 03 |
| C22 | 用于 AI | memory.js + MaterialTray，PAIA_CONTEXT_MANUAL，明确 refs/revisions/spans | RESTYLE：本次材料 → 本机预览 → 明确复制/Markdown；现有默认手动路径不要求 Profile | expired/blocked/stale 按原 trusted state 阻断，不复制旧 DOM 绕过 | 04 |
| C23 | 授权与外部访问 | legacy Profile/Memory、PassportService、ContextPackageService；product-signals 页面 | PRESERVE：Context 的高级入口与设置低频入口；沿用现有工具页面，解释为“授权范围与外部使用” | 不画不存在的 Connector；Grant 不是普通手动复制前置条件，也不能被手动路径绕过 | 04 |
| C24 | 设置简化 | setupSettingsShell 六组、唯一既有 controls、UPDATE_PREFERENCES、原 config actions | RESTYLE：唯一页标题、局部组导航、短说明+详情、配置失败回滚 | 未知状态不先写默认；本机保存与网络授权不能合并成一个开关 | 01/04 |
| C25 | 备份/开放导出 | backup.js、r6-settings.js、OpenExportWriter；empty-store restore/validation | PRESERVE：数据与设备内明确三组操作：备份、完整 JSON/MD、恢复；scoped Source export 单列说明 | 非空库不得先清空来演示；未加密与不同格式边界保留；restore 外部访问仍 false | 04 |
| C26 | 私密内容预览遮挡 | hideContentPreviews、html.paia-hide-content-previews | 所有重排后的预览继续响应同一个设置，使用统一 preview hook；全文 Reader 不伪装加密 | 不将标题/tooltip/aria 文案变成被遮去正文的旁路复制 | 每轮 |
| C27 | 来源/版本/移除 | Source 只读；Input/Thought revisions；review / purge / tombstone | PRESERVE：低频动作放更多，但核对与恢复仍可达；三种操作不混名 | 已 purge 的来源/历史不恢复；普通移除/主题移出/永久删除仍分别确认 | 02/03/04 |
| C28 | 图标/风格/动效 | 现有 SVG、CSS、native controls、reduced motion | RESTYLE：轻图标、清楚焦点、少边框，过渡最长约 160ms 的常规反馈 | 无外部字体/图标库/风景资产、无 shader，状态含义不依赖动画 | 每轮 |

## 3. 不因 presentation 被删掉的“非参考图能力”

| 现有能力 | 新 UI 中的可达位置 | 回归证明 |
|---|---|---|
| ChatGPT live capture、pause/resume、显式 consent、历史导入/分支 review | 保留 popup / Onboarding / 内容与收录；有数据时历史导入从更多/设置可达 | UIR-01 capture smoke；UIR-02 Reader/导入入口；UIR-04 完整 suite |
| Smart Filter、手动恢复、不再自动收起 | 内容与收录与已有收起内容 review；不放 Topic 阅读页常驻 | UIR-02 与 UIR-04 |
| Input 标题/正文编辑、Undo/Redo、失败缓冲、版本恢复 | Reader 原位与页边更多；失败时保底复制始终可达 | UIR-02 + 原域断言 |
| Thought 整条/选段加入、今天新想法、独立条目、多主题、合并/重命名/结构管理 | 原有轻弹窗、Topic 更多、首页更多/空态 | UIR-03；不删除仅移到低频 |
| Thought 高级反向编辑与单次 Undo 确认 | 设置高级相关入口；当前焦点附近提示实际修改范围 | UIR-03 bindings/history |
| 有界批量 Organizer 与预算/停止后续/人工保护 | 思想库/Topic 真实任务入口；详细预算与诊断在高级 | UIR-03；不把批次限制扩大 |
| Context explicit full/span selection / edited preview / redaction / once Grant | 手动工作台与现有独立 grant-bound 工具 | UIR-04 + R4/round48 |
| Backup 与完整导出、Source scoped export、存储估计/上次备份 | 数据与设备，区分范围与不能恢复的格式 | UIR-04 + R6 |
| 数据迁移/删除 fence/local-only/权限 guards | 不改变；界面只能如实呈现 | 每轮相关检查，最终全部现有 gates |

## 4. Adapter 例外不是增功能许可证

优先 DOM/CSS 与 UI 对已有 DTO 的纯映射。若布局确实无法由当前接口支持，开发者在 round report 必须给出：已检查接口/真实缺口、为何纯 UI 不够、最小可选方案、涉及字段/路径、无新增 canonical truth/写入/权限/查询扩张的证明、对应测试。只允许当前 round 列明的只读 projection 例外。

例如 C02 已明确决定不新增普通列表正文预览，所以不能再以“还原第一张图”为理由申请新查询。新授权/持久化/付费行为永远不能通过 adapter 例外获得许可。
