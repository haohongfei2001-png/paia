# PAIA Chrome UI Refresh Specification v1.0

日期：2026-09-15。状态：**设计收口，供 UIR-01～04 实施**。

基线：`main @ c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`。开发分支：`chrome-ui-refresh-v1`。

## S0. 目标、权威与完成口径

本阶段只把已有成熟能力整理成统一、可读、可用的桌面界面。目标是先达到可进入实际使用的 60～70 分基础，不把第一阶段变成最终品牌精修。本文授权 DOM/CSS/文案/视觉分组/交互状态变化，不授权数据、权限、AI 行为或产品定义变化。

设计核、PRODUCT、ARCHITECTURE 与现有安全/迁移契约继续有效；旧 UX Specification 的固定语义保留。本文覆盖旧规范中的**视觉与本次执行流程**，不撤销长期方向。README 规定阅读顺序；当前 round 决定本次范围；STATUS 决定是否可推进。图片只提供视觉参考，不能证明功能存在。

验收不是一条“看起来接近参考图”，也不是 tests 全绿。必须同时满足：任务可完成、既有行为不回归、真实 Chrome 截图、Agent 实际查看并修正、证据进入 GitHub。最终用户实际使用评价另属 Phase B，不伪称本阶段已证明留存或价值。

## S1. 固定的保持项

| ID | 必须保持 |
|---|---|
| P01 | Source 原始事实不被编辑、AI、同步或 UI 重排覆盖；未知时间不以 capture/import 时间补造。 |
| P02 | Working Input 是档案工作正文；Thought 是现有思想正文/组织；Reader/Search/Revisit/AI/Context 不产生新 canonical truth。 |
| P03 | Thought 默认编辑仅修改该 Thought；完整一对一引用的高级反写仍默认关闭且 restore 后关闭；revision/CAS、原子 Undo/Redo 与一次性确认均保留。 |
| P04 | 用户编辑、人工保护、明确选择、排除优先。来源关联不因改稿而抹掉；独立人工 note 与依赖正文的删除规则保持。 |
| P05 | 主题移出、档案移除、Smart Filter、回顾排除、禁止用于 AI、永久删除是不同动作；tombstone 优先于缓存/历史/重导入/备份。 |
| P06 | 3 秒可见阅读停留/明确记住的现有锚点规则、grapheme offset、固定 visit window、bounded 查询和旧内容 opt-in 不变。 |
| P07 | Search 仍是既有本地服务，分页/索引 partial/选择身份不变；历史视图读当时 Source，不把今天改稿投回过去。 |
| P08 | AI 开关只是当前主题的原话/已有整理视图。缓存切换、读状态、resize、theme、reopen 不调用 Provider；首次生成/更新仍显式授权。 |
| P09 | 新整理成为 candidate，不自动覆盖人工稿。暂存采用/保留与最终 guarded save 分开；stale 与 outcome_unknown 不自动重试。 |
| P10 | manual_selection 与 grant_bound 保持可信服务分离。Context 预览 edits/redactions/order/exclusions/refs/revisions 不能被排版或重新查询替换。 |
| P11 | local-only、external-access 默认关闭、精确 trusted sender、预算和 credentials/session 边界不变。手动复制/文件导出不是外部连接授权。 |
| P12 | Backup、完整 JSON/Markdown export、scoped Source export 分开；空库恢复/验证/保留与排除字段不变，恢复不重开 external access/Grants。 |
| P13 | 真正的保存/复制/下载结果才可显示成功；保存失败保留编辑缓冲。来源失效优先于“保留旧画面”，禁止旧预览继续泄露/输出。 |
| P14 | 既有 consent/capture/import、设置持久化、模型/迁移/发布/隐私 tests 保持。UI 不能新增网络、站点权限或更换框架。 |

以上与原有契约发生冲突时保留更严格的既有安全边界，并报告具体冲突；不要为视觉自行改 trusted main path。

## S2. 页面与信息架构

### S2.1 一级空间

固定：**档案 / 思想库 / 用于 AI**。**设置**放左栏底部。不要新增首页、知识图谱、任务、AI 管理台、Passport 一级入口。

原来的 `data-view=library/thoughts/memory/settings`、`ui/archive.html`、同 URL history.state 与当前导航 owner 不变。Search 是临时任务；Revisit、Reader、Topic、来源/版本、材料预览是二级场景。Source、已移除、独立 Thought、低频工具仍可到达，不需成为一级导航。

桌面左栏只保留品牌、主要导航、设置。版本/诊断/存储细节移入设置高级；正常本机状态不占一排解释。真实存储/保存错误不能因收起状态而隐藏：在当前工作区及相关设置显示可操作错误。

### S2.2 唯一可见主标题

| 场景 | 唯一主标题 | 需要去重的旧内容 |
|---|---|---|
| Archive root | `#view-title`：档案 | 首页 eyebrow/h2 重复“档案”、空泛产品介绍、重复“浏览档案”大标题 |
| Thought home | `#view-title`：思想库 | 页面内再次解释 Thought Library 的大标题 |
| Input Reader | `#document-title` | 全局档案 h1 降为返回路径，不与文档标题竞争 |
| Topic | `#topic-heading h1` | 全局思想库 h1 与 Topic 重复路径 |
| Search task | 现有 Search 主标题提升为该场景 h1 | 其下只保留一个主要 query input；隐藏外层重复页标题/启动搜索栏 |
| Settings | `#ux-settings-title`：设置 | 隐藏全局重复 h1 / 重复 breadcrumb；保留 Settings 自己的返回与状态 |
| Context | 外层用于 AI h1；材料/预览为任务 h2 | 不再同时展示 legacy Memory 首页与当前 MaterialTray |

不是删除所有 heading。内部章节保持 h2/h3；只是不能三个同义大标题堆在第一屏。保留既有 controller 依赖的节点/ID，必要时隐藏非活动标题而不是让查询报错。活动场景切换在已有 owner 内处理，不用扫描全 DOM 的新定时器。

## S3. 布局与视觉参数

### S3.1 尺寸

| 参数 | v1 固定设计值 / 行为 |
|---|---|
| Desktop | viewport ≥1200px；左栏 224px；主区左右 padding 32px；内部 layout max-width 1280px |
| Narrow desktop | 800～1199px；左栏 192px，沿用已存 sidebarCollapsed 时 64px；主区 padding 24px |
| Mobile-like viewport | <800px；主区 padding 16px（320px 可 12px）；沿用三项根导航和详情返回，设置为明确辅助入口；不声称原生手机 App |
| 内容列 | 工作区、Topic 外壳、Search 与 Context 框架可用全部主区宽度，`min-width:0`；不要给整页套 680px 限制 |
| 正文行宽 | **保留现有 readingWidth 值与含义：640 / 680 / 720px**；在可用空间内限宽，不改变已保存枚举/用户设置。概览和时间线容器可宽，内部长文分别限行宽 |
| 正文字号 | 保留现有 16 / 17 / 19 / 21px preference；标准17px、line-height约1.85；不缩小正文来塞工具条 |
| 主标题 | Desktop 34～36px；narrow约30px；mobile26～28px；line-height1.25～1.35；不固定高度截字 |
| 章节标题 | 20～22px；小标题16～17px；正文辅助文字13～14px，不用浅灰极小字藏重要信息 |
| 间距 | 4 / 8 / 12 / 16 / 24 / 32 / 48px；章节间32，卡片内20～24，紧凑行内12～16 |
| 控件 | 常规桌面最小36px高，主要操作40px；<800px及触控关键动作≥44×44px；禁止缩小现有更强测试标准 |
| 圆角/边界 | 输入/按钮8px；必要分组容器10～12px；一层轻边框；常规卡片无悬浮大阴影 |
| 过渡 | 普通常规反馈120～160ms；reduced-motion直接切换；无等待动画最低时长、无流光/模糊全文 |

**窗口是正文滚动容器。**不能给 main/document/Topic 新增独立 y-scroll 来实现固定侧栏；Reader 的 window scroll、锚点与历史返回仍工作。左栏自身超高可滚；长代码/长URL局部换行或横向滚动，不拉宽整页。

大标题可随正文滚动。需要固定的只是紧凑 Reader 操作带；其高度约48～64px，不遮住恢复到约140px的文字锚点。避免整个巨大页头 sticky 占去半屏。

### S3.2 色彩、字体与 tokens

保留现有 `--paia-*` token 命名和 `data-paia-theme` / language / preference owner，更新实际消费点，不新增主题存储。

| 用途 | Light | Dark |
|---|---|---|
| canvas | #F8FAF8 | #171D19 |
| surface | #FFFFFF | #1E2721 |
| sidebar | #F2F6F2 | #1A221D |
| primary text | #202B24 | #E7EEE8 |
| secondary/meta | #58665D | #B5C2B8 |
| accent / focus | #46644E | #AECAB3 |
| on accent | #FFFFFF | #18251C |
| selected / hover | #E8F0E9 / #F0F5F0 | #2E3B32 / #263229 |
| subtle border | #DCE4DD | #3A4B3F |

危险/警告沿用现有语义 token 并实测对比度；不能一律变成绿色。以上是实施目标，最终必须在真实合成背景下测量，不能只计算 hex 就宣称所有文本通过。普通可见正文/重要说明至少沿用现有4.5:1门槛；focus/control边界可辨；错误/选中不能只靠颜色。

字体用系统 UI / 中文字体回退，不下载字体、引入外部 icon CDN、用图片画文字。图标16～20px，stroke一致、aria-hidden；有文字的按钮以文字做 accessible name。图标不得因 applyLabels 的 textContent 更新而消失。

`core-loop.css` 仍是共用 token owner。可增加一个 `ui/ui-refresh.css` 放本次跨页布局/spacing 工具，并由现有 bootstrap 只加载一次；页面专用规则在现有 reader/thought/reuse/r6 CSS 修改。不能另做 token JSON/主题引擎，也不能无边界追加数百条 !important。必须检查动态插入 CSS 的顺序与 computed styles。

## S4. Shell、搜索入口与导航交互

### S4.1 桌面构图

左栏：PAIA 标识 → 三个主导航 → 弹性空白 → 设置。导航44px左右、图标和文字对齐，实际选中态有 `aria-current=page`；鼠标 hover 不移动文本。去掉“用于 AI”前过重分割线和双倍高度，让它与前两项属于同一产品。

主区页头：左标题/返回，右搜索与当前页必要动作。没有动作的页面不放一串禁用图标。宽屏搜索入口约280～340px，窄屏可压缩为180px；详情窄屏用明确搜索图标按钮。

### S4.2 搜索不是第二套实现

`#universal-search-open` 保留为**搜索栏外观的 button**，内容为放大镜、短提示“搜索档案与思想…”、可用的快捷键提示。它的真实作用是打开已有主区搜索，并聚焦唯一 query input；不能伪装 `role=textbox`。无需复制 query 状态到第二个输入框。

现有 `paia:search-open`、Ctrl/Cmd+K 只绑定一次；先核对现有 shortcut listener，不能再叠加。返回/关闭恢复触发位置，进入 Reader 时遵守既有 search return 逻辑而非强制聚焦启动按钮。Search task 内隐藏外层入口，主 query 为唯一首要输入。

Archive 的 `#search` 保留在展开的“在档案中查找”工具中；Thought 的本地搜索用“在思想库中查找”；Topic 搜索使用“在当前主题中查找”。这些是现有不同范围，不用第二个算法，也不把它们排成三个相邻大搜索框。已存在非空 query 时必须显示其范围与清除动作，不折叠后让用户看不见正在生效的条件。

### S4.3 跨断点/状态

resize、主题切换、语言切换只改呈现，不导航、不重新索取授权、不重建 dirty editor。保留 sidebarCollapsed；<800px不能强迫用户操作已隐藏的桌面按钮。底部导航不遮正文/软键盘；详情保留明确返回/搜索/更多。Tab顺序按视觉顺序，skip-to-main仍可用。

## S5. Archive / Search / Reader / Revisit

### S5.1 Archive 首页 composition

页头“档案”下不再有第二套欢迎口号。主区为真实对话列表；当可用主区≥1000px且有真实辅助内容时，可以显示右侧260px的阅读辅助列，gap24px。辅助列只承接既有 `#reader-resume` 与 Revisit 入口，不创建新的“最近浏览”服务。没有内容则该列收起，主列使用全宽；<1000px按 DOM 顺序变成紧凑顶部条，不横滑。

主列：轻工具行（范围/可展开局部搜索、已显示数量、更多）→ 真实文档行 → 原分页。每行：两行以内标题、真实时间范围/输入条数、确有必要的来源类型。去掉每一行都重复“连续输入文档”的无效副标题。条数是该文档真实 messageCount，不能当独立 Thought 数；结果数说明当前加载范围，不把 `docs.length` 称为总库数量。

**不新增普通文档正文预览。**当前普通 DTO 没有 snippet；不用每行 GET_PAGE 文档、全库扫描或模型补造。搜索结果的已有 snippet 可以显示，但遵守预览遮挡。参考图的长文阅读节奏在 Reader 落实。

辅助区：真正有锚点时显示主“继续阅读”和最多两个次项；没有锚点可以显示一个真实“最近收录”，两者不混名。Revisit是轻操作“回来看看”，不显示红点、欠账、读取任务。完整文档列表仍包含所有真实文档，不为首屏去重改变 canonical 数据。

### S5.2 Input Reader

文档标题与日期/顺序在上，正文用既有 `.library-block` 连续排版。无每段厚卡、头像气泡或常驻 Source ID；日期分隔轻量。真正的源文本与工作改稿核对在更多/来源面板。

保留 `#document-body`、编辑 target、稳定 Input ID、data-edit-id、native selection 与 textarea/plaintext editor语义。页边动作在 hover/focus-within出现，触屏保留更多。操作柄不挤正文、不能通过CSS pointer-events禁止选词。排序保留原 asc/desc，选择后尊重原锚点/刷新ownership。

长文本的展开只是显示选择，不截断保存/复制/导出；搜索/编辑/继续目标强制展开。新收录提示仍明确“查看新内容”，不自动滚到底部。原有500ms Input autosave、IME suppress、Undo/Redo与失败复制保底不改。

来源/版本面板：桌面适度覆盖/并列但正文不被压到不可读；窄屏单列。当前来源、当时原件、工作版本、普通移除、永久删除分别标明。永久删除初始焦点在取消；清除后的文字不能残留在另一面板。

### S5.3 Search task

使用现有 `#universal-search-dialog` section与search-task。页头返回 → 搜索主输入 → 模式“全部结果 / 按时间看” → 折叠范围筛选 → 结果/明确选择 → 分页。筛选使用真实 source/topic/date/types/includeRemoved字段，不增加 taxonomy。

每条结果显示类型/范围、真实已有 snippet、来源/日期；打开与选择分开。全选本页、完整枚举后的全选结果、加入本次材料不混用。分页、过期请求、IME、返回与selected Map仍由当前owner处理。加载新查询时旧结果可以保留但 inert，不允许全选旧范围；失败明确未查完，不能写成零命中。

“按时间看”使用当时 Source 与有效发送时间；未知来源/日期显式说明。对比只是并置，不能自动写“你的思想进步了”。

### S5.4 Revisit

单一页标题、真实继续项、新增窗口、Topic新材料、明确opt-in后旧内容。复用现有分区和候选限制，不改扫描量/顺序/visit边界。空分区可省略，但状态读取失败需单独说明，不能装空。

排除使用原 action；回访取消不等于删除/不允许用于AI。移除后焦点到安全相邻控件，来源相关的预览遵守同样排除。没有新材料时保留继续/返回档案，不展示“全部处理完成”。

## S6. Thought Library / Topic / AI

### S6.1 Thought 首页

单一思想库标题。主要内容为既有稳定主题网格：Desktop默认2列，确有空间（主区≥1140px）可3列；窄屏按最小卡宽约300px回到1列。沿用用户现有 grid/list preference，不把选择清零。

卡片：真实主题名、已有简介/原话线索、实际有依据的时间/条数/新材料标记；计数不完整就不显示精确总数。不得根据 createdAt捏造主题表达跨度。已有最近阅读轻量分开；不因AI状态轮询重排所有卡片或闪烁。

人工新建/重命名/合并/导出/结构管理/独立条目不删；放首页更多、Topic更多或既有空态，避免占满首屏。组织新内容现场仍能显式调用 existing bounded workflow；无Key/拒绝AI不妨碍人工加入主题与阅读。

### S6.2 Topic Original

返回 → 真实主题h1/已有简介 → 单行工具（AI整理、顺序、查找、目录、用于AI/更多）→ 原话/人工Thought连续阅读。目录用真实sections，不凭空生成；短内容可以收起目录入口。Original不出现虚构“当前理解”总评。

保留 `#topic-body`、原话/AI pane、各自位置/session、Topic editor、bindings与来源动作。整条/选段加入、今天新Thought、未加入主题内容、移出当前placement、版本恢复仍沿用现有handlers。当前焦点附近明确“只修改这条思想”或实际开启的“同时修改档案”，不能仅把文案藏在设置。

### S6.3 Topic Organized

页面外壳可以宽；正文仍有可读行宽。按真实已保存内容组织为：

1. **当前理解**：现有 blockSummary / currentView；一块轻底，左正文，不放风景。短摘要可作弱引导，避免同义重复大标题。AI/人工修改标签来自实际状态。
2. **思考线索/演化**：有 possibleEvolution与证据时呈现纵向阶段，证据原话就在相关段落下展开；无阶段时降级“原话时间线”。不固定节点数，不编起点/终点。
3. **相关原话/材料**：仅现有 evidenceEntryIds 与绑定来源，按现有有界读取；没有“相似度推荐”。来源失效不可点击旧缓存继续读。
4. **其他已保存的整理**：原有非空可选字段以其本义折叠呈现；不强制核心原则/判断/问题/下一步四卡。

证据辅助列只在足够宽时使用约260px；否则展开于段落下，不增加全局第三栏。分组不复制正文和revision；data-ai-field仍指向原字段，由AIReadingEditor保存，保留人工保护和draft恢复。

### S6.4 开关、运行、候选状态映射

| 真实状态/条件 | 必须显示 | 禁止 |
|---|---|---|
| Original | 原话/人工Thought | 把进入主题当生成授权 |
| 已有有效 presentation + 切到AI | 已保存整理，必要的来源/覆盖信息 | Key不足时挡住已有稿；切缓存调Provider |
| 无缓存 | Original继续可读；局部“生成AI整理”入口与明确当前主题/处理方/范围确认 | 空白整页、自动生成、示例理解 |
| 缓存本地读取中 | 仅未知区域轻骨架；保留已有可读内容 | 说成模型正在生成 |
| runtime prepared | 准备本次材料 | 虚假百分比 |
| runtime sent | 正在整理；已发请求不能承诺撤回 | 每个卡片装独立进度；自动补发 |
| response_received / validated | 正在核对整理结果 | 在可信提交前说已保存 |
| committed且有candidate | 新整理已准备好 · 查看更新 | 说当前稿已经被更新/替换 |
| committed且真实已保存首次结果 | 当前主题仍在等待时可以显示新结果；其他页只轻通知 | 抢当前页面导航 |
| statusUnavailable | 部分状态暂时无法读取，已有内容仍可读 | 把未知算成running/empty/0条 |
| credential_missing / budget_limited / local-only | 保留原稿，明确不能开始的原因与现有设置入口 | 自动开权限、改预算、索要Key才能看原话 |
| failed | 错误原因/本次保留内容；真实可用重试需新的显式动作 | 无限自动重试、吞掉失败 |
| outcome_unknown | 结果尚未确认，检查状态；明确再次发起可能另计费 | 普通“刷新即重试” |
| candidate stale / 材料revision变化 | 停止采用和保存，保留人工当前稿/选择缓冲，要求核对 | last-write-wins或静默merge |
| source purge / 受限依赖 | 依照原服务立即清理受影响展示/输出；可证明独立人工内容按原规则保留 | 为保持画面稳定继续显示被清理片段 |

常规等待只一个轻状态区，`role=status`；状态读不启动新的计时轮询。沿用现有运行中状态读取机制；不用新的全局scheduler。骨架 aria-hidden，状态文字可读；无现有稿的未知区域可以占位，有现有稿不模糊、不盖住编辑。

候选比较 Desktop两列“当前稿/更新候选”，每个实际变更字段有采用/保留；≤900px上下排列。保持 `[data-ai-candidate]`、field/decision key、aria-pressed与焦点恢复。当前实现要求所有待决字段处理后才能最终保存，继续沿用，不以旧示意文字改成自动采用。选择只是本地暂存；最终按钮“一次保存所选处理”调用原 guarded save。没有真实差异就不画空比较卡。

## S7. Context / Settings / 低频工具

### S7.1 Context 工作台

当前默认是 MaterialTray，不能按 archive.html 的旧静态 Profile首页重新设计。任务顺序：选择具体材料 → 检查/调整 → 本机预览 → 明确复制/Markdown。

页头“用于AI”；任务h2与一句“只在本机准备，尚未发送”。无材料：从档案/从主题两个入口、可选本次说明；不要求Profile/Grant。已有材料：真实条数、列表与来源角色、移除/上移/下移、说明、预览；不做三张功能介绍卡。

预览是现有按材料映射的可编辑正文，不换成一个丢失身份的大字符串。显示只影响本次输出、最终校验/确认、实际字数/条数。Copy成功只说已复制尚未发送；文件仅说明开始下载。blocked/stale/expired不提供旧DOM复制旁路。

抽屉继续是同一个MaterialTray root的移动，不克隆工作台。桌面约400px非模态，窄桌面覆盖但不挤压正文；**≤600px沿用现有modal/inert边界**，全屏可返回，焦点限制/恢复正确。不要只改CSS成全屏却漏掉原resize/keyboard逻辑。其他断点不会改变selected refs、draft、sourceEpoch或权限。

高级入口保留原 memory legacy授权范围；Passport和grant-bound工具仍从既有本机工具进入，不新建权限页/Connector。可改入口文案为“授权范围与外部使用（高级）”，但不把7天/30天权限说成外部副本可收回。

### S7.2 Settings 六组唯一控件归属

Settings自身一个标题+返回+局部反馈。Desktop组导航180px，正文minmax(0,840px)，gap32px；不嵌套第二个App sidebar。窄桌面收紧间距。<800px把同一组导航折叠为“当前组/切换分组”，选组后显示同一正文，保留焦点与位置；不复制六份表单。

| 分组 | 保留且重新分层的内容 |
|---|---|
| 内容与收录 | 真实consent/capture状态、暂停/恢复、历史导入、精确会话排除、Smart Filter轻度/关闭、收起内容恢复 |
| 阅读与外观 | 已有字号/宽度/主题/语言/时间显示、旧内容回顾opt-in、已有排除管理 |
| AI | 实际Provider配置/session credential、预算/上限；任务细节折叠，日常整理入口仍在Thought现场 |
| 隐私与对外使用 | local-only、external access、AI范围/长期禁令、hideContentPreviews；说明各自作用不同，不合成“隐私模式”万能开关 |
| 数据与设备 | 创建Backup、完整开放JSON/Markdown、Backup恢复、Source scoped export、已移除/旧内容入口、真实存储估计/上次备份、明确当前无设备同步 |
| 高级 | 反向编辑等既有高级控制、原管理/完整性/迁移/版本修剪/诊断、本机工具与Passport、版本信息 |

原代码中的具体控件由各owner重排；以原读写handler为唯一持久化入口。说明优先短句，技术细节进details；涉及删除、外发、恢复、未加密、Key寿命的关键说明必须仍在操作现场。普通设置保存失败恢复真实旧值并显示失败，不能保留一个看似已开启但服务拒绝的开关。

Backup与完整导出清楚分组：Backup用于现有空库恢复；完整JSON/Markdown用于带走内容；当前范围Source export不是全量。保留真实限制、校验/预览/确认、未加密与卸载风险；不得为截图清空真实用户库。恢复后偏好立即重投影，external access false、reverse write false、不恢复Grant/credentials等约束照旧。

### S7.3 Popup / 本机工具

popup仅统一字体、按钮、间距与颜色，主动作回到PAIA、现有暂停/恢复不变。保留内部/发布构建差异。

product-signals既有独立页面在高级可达，本阶段只做必要可读性/主题与窄屏一致性，不重写Passport控制器或把统计移到首页。页面没有现成跨页主题状态消费时，可复用既有preference只读入口或系统主题；不能新增主题存储。禁止为了“更现代”新增数字仪表盘、背景网络或Grant快捷绕过。

## S8. 共享状态与可访问性

| 状态 | 表现与交互要求 |
|---|---|
| 初始加载 | 只对未知区域占位；Shell稳定；不在未读到偏好时写默认值；加载失败与真空库分开 |
| 已有数据刷新 | 原内容仍有效才保留，局部busy；对可能失效的选择/输出按owner禁用；purge/deny例外立即清除 |
| 空库 | 一句说明+一个主要入口；可用导入为次动作；不硬塞示例数据 |
| 无匹配 | 保留query/范围/清除条件；不说用户从未表达过 |
| 失败 | 对象旁说明失败范围、保留什么、实际可行恢复；非敏感短错误码可在详情，不打印私人正文/Key |
| 保存中/成功 | 沿用真实编辑状态；成功只在服务成功后；自动保存不反复大toast抢注意 |
| Disabled | 原禁用语义保留，可读原因与相关下一步；必要说明通过邻近文本/aria-describedby，不让disabled按钮成为唯一说明 |
| hover/focus | 鼠标轻底色；keyboard focus-visible 2px+offset；动作不能仅hover出现；重排不丢焦点 |
| selection | native文字选择、actual checkbox/aria-pressed保留；颜色+勾选/文本，不混入当前active路由 |
| modal | 真实标题、Esc（dirty需确认）、Tab范围、关闭恢复focus；危险动作默认Cancel |
| reduced motion | 状态含义靠文字；移除平移/缩放/流光，不人为延迟渲染 |

预览遮挡必须覆盖所有被重排的snippet与新展示的预览。为预览添加统一的presentation hook是允许的，但继续响应现有html.paia-hide-content-previews，不另建设置。不得把被遮挡的正文搬进title tooltip、aria-label或无障碍隐藏副本；这不是加密，不承诺阻止OS截图。完整Reader与明确打开的正文沿用原边界。

## S9. 修改边界

**普通允许：**当前round列明的ui/DOM/CSS/文案、既有浏览器测试定位、少量视觉断言、docs/ui-refresh报告/证据。无新依赖，无框架迁移。

**谨慎：**archive.js刷新/navigation；editor DOM；thoughts.js/base的状态协调；material-tray的sourceEpoch/输出状态；r6 mask；build_daily_use标记；test-groups/现有CI接线。修改前说明owner和保持的状态，修改后跑对应已有journey。

**默认冻结：**core业务写入、background、adapter、content、manifest、存储schema/migrations、provider、authorization、backup格式、native-hosts、网站、overnight。不因一次UI失败扩成底层重构。

仅允许round明确指出的最小**只读DTO/UI adapter**例外：证明现有接口无法支持已经批准的UI、只投影已有字段、无新写入/新正文/更大查询范围/权限变化，并在报告记录测试。C02的普通列表snippet已裁决不做，不能用例外绕回。

## S10. 每轮验证与截图

每轮：规定的focused测试、`npm run check`、`node scripts/check_development.mjs`、`npm run build:release`；真实扩展browser journey；至少主要Desktop before/after及after dark。若相关现有browser测试自动产生更大矩阵，保留它们，不为本阶段删减断言。未触及domain不为每轮额外要求无意义重跑全部1000+ tests；仓库真实CI已要求的门槛不能降低。

截图须来自本轮代码构建/运行的扩展页面，非静态设计稿。保存代表性PNG到GitHub evidence目录，配一个简短 VISUAL_REVIEW.md：文件名、页面/状态、viewport/theme、代码commit、实际观察、发现/修复、仍存限制。记录代码验证版本与文档checkpoint的区别，不把本次文件写入称为浏览器已验收。

人工视觉检查的最低问题：是否只有一个活动页主标题；内容是否首屏可达；宽屏是否仍整页窄在680px；是否出现假数字/大空卡；操作/文本是否遮挡；长标题/错误/无Key/空态是否可读；dark是否仍有亮白块；焦点/移动更多是否可用；敏感预览是否泄露；AI等待是否挡住有效旧稿。

## S11. 最终验收矩阵与完整回归

UIR-04必须在最终代码上运行现有完整current suite与release；记录实际unit/browser/adapter/privacy分组结果，不硬编码1088为通过标准。完整suite已含当前browser时，本地可复用其结果，避免无意义重复；既有CI的显式browser/full/native gates全部保留并通过。

最终视觉矩阵不要求每页做全笛卡尔积；复用本轮已有有效截图即可：

| 覆盖 | 场景 |
|---|---|
| 1440×900 light/dark | Archive、Input Reader、Thought首页、Topic Original、Topic Organized、Context预览、Settings数据/隐私关键区 |
| 1024×768 light/dark | Archive/侧栏收合、Topic Organized/候选比较、Settings分组 |
| 390×844 与320×720，各light/dark | Reader编辑、Topic/AI状态、Context材料或预览、Settings数据操作；用同一图可覆盖多项但不得漏关键操作 |
| 200% text | 至少Reader与Context/Settings一条任务；实际文字放大并验证computed font/可操作性，不以deviceScaleFactor或放大PNG冒充 |
| Keyboard/focus | skip/nav→search→结果→Reader→更多/模态→返回；candidate选择/保存；mobile更多；关键焦点可见图 |
| Reduced motion / IME | 实际行为检查与必要记录；无额外装饰动画；输入中不丢字、不误提交 |

最终还需：无横向页面溢出（沿用现有≤2px tolerance）、关键触控target≥44px、现有4.5对比度断言、真实release smoke、完整Copy/Markdown等值、Backup/Restore/权限/删除回归。不能把已知视觉缺陷留作“Phase B”而标完成；Phase B只接真实使用后的精修，不接未完成的基本可读性与行为安全。

## S12. 交付和非目标

每轮输出代码/测试commit、round report、STATUS、代表性截图与视觉检查。整体只有四轮，不建scheduler/control/lease/campaign/pending-publication/大state JSON。不引入山水、虚构用户/日期/统计/金句、分类/排名/思想成长算法、任务管理、数据库/AI pipeline、同步或外部Connector。最后只完成可使用基础与回归，是否合并/发布由用户另行决定。
