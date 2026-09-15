# Baseline Audit — PAIA Chrome UI Refresh v1

核对日期：2026-09-15。以下是设计阶段的源码/已有产物审查，不是新产品实现或新一次 Chrome 认证。

## 1. 固定事实与证据来源

| 项目 | 已核对事实 |
|---|---|
| GitHub main | `c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`，设计写入前再次读取，未变化 |
| 根 tree | `1d8402d8c08f075963725178ce31c32891903ac5` |
| 新分支 | `chrome-ui-refresh-v1`；创建前查询没有同名分支，从上述 main 创建 |
| main 提交说明 | 明确合入已认证 UX-R1～R6；提及 integration `0c8852b6dad04d01d694a02739cc8a2576ddfa88` / Certification #274。此处引用提交说明，不将它冒充本次重跑 |
| R6 精确认证代码 | `2d5de7e19d4756ecf90babf5101ff0127d7c6d50`；当前 R6 报告记录 #272 / run `34903574502` |
| R6 → main compare | main ahead 86；extension 内仅 UX 状态与 R6 报告改变，其他差异为根目录网站；未发现 extension 运行代码差异 |
| 旧测试结果 | R6 报告：1,088 PASS，909 unit / 32 browser / 95 adapter / 52 privacy；76 historical browser files 单独保留。**不是本阶段测试结果或未来固定应有数量** |

权威文档通过固定 SHA 读取：`extension/AGENTS.md`、`docs/ux/PAIA_DESIGN_CORE_v1.0.md`、PRODUCT、ARCHITECTURE、ROADMAP、旧 UX Specification、UX_IMPLEMENTATION_STATUS、UX_R1～UX_R6 当前报告。相关安全/导出约束继续由现有 BACKUP、PRIVACY、AI_CONTEXT 等契约约束。

源码入口同时通过 GitHub 固定 SHA 与 GitHub 的既有认证 release 产物交叉检查。下载的 release artifact：`10371522875`；R6 visual artifact：`10371638768`，均来自现有 R6 证据。release 的 archive.html/archive.js 等经过真实 build transform，**不能当作所有文件的逐字 main 源码**。已读取 `scripts/build_daily_use.py` 核对这些变换；关键原始 DOM、测试入口、构建/分类脚本另从 GitHub 源码读取。

可复核的 Git blob 对照：archive.css=`7d82f4c9fd66728cbc0048c155392528cf7193a5`；ai-presentation.js=`592bc981b17e5e2de729b7bf4cda50ddbb207ab1`；AGENTS=`858688dbe484a7bb1a782004a7555825313ecd54`；PRODUCT=`d573b760f5638a95f80f7b938ea870b4f09a1172`；ARCHITECTURE=`f70691da122c72c52612ea40a2d78282d1e879f5`。对应已检查的 release 文件与固定 main blob 一致。

现有 `data-1440x900-light.png` 已直接查看：设置页重复出现全局“设置”和分组壳“设置”，并列出现多处返回/路径，搜索为孤立小按钮，主区层级和空间利用不佳。这个结论只针对已查看的现有合成截图；未声称已打开用户日常 Chrome 或重跑当前 main。

## 2. 代码所有者与可改范围

所有短路径相对 `extension/`。

| 领域 | 已检查入口 / owner | 对 UIR 的约束 |
|---|---|---|
| 全页 Shell | ui/archive.html、archive.js；core-loop.js 动态安装 Shell/Settings/Home；ux-r1-shell-coordinator.js 同步语言/授权/导入现场 | DOM 既有静态部分又有运行时重排。不能只改 HTML，也不能再叠一个负责相同区域的 observer |
| 主题/字号 | core-loop.js 的 applyPreferences / preferenceSelect / applyLabels；core-loop.css 动态插入；experience.css、reader.css、thought-reader.css、r6.css 等共同级联 | 继续使用现有 preference 与 theme 属性。新样式必须处理加载顺序和 specificity，不能 body 全局换色后遗漏弹窗/候选 |
| 根导航/Reader | archive.js 的 navigate / refresh / refreshPage / leave / showCollection；reader-navigation.js 的 same-URL history coordinator | 不新增 Router、hash、query、可信 URL；保留 editor flush、返回对象、搜索现场与异步 intent |
| Archive 集合 | showCollection 使用 state.documents；真实字段为 id、userTitle、originalConversationTitle、sourceConversationId、first/lastSourceSentAt、messageCount、unknownCount | **普通列表没有现成逐文档正文 snippet**。一期不用 N+1 读取每篇正文来仿参考长卡，也不生成 AI 摘要 |
| Input 阅读 | library.js DocumentEditor；reader-experience.js；editor-primitives/session-lifecycle/reading-actions | window scroll / offset / native selection 是现有定位基础；不改成独立滚动正文容器 |
| 继续阅读 | core-loop.js refreshReading → PAIA_READER_RECENT；reader-experience 保存 PAIA_READER_SAVE | 与 refreshRecent 的最近收录分开。正文停留 3 秒或明确记住位置才构成现有阅读记录 |
| Revisit | ui/revisit.js；core/revisit.js、reader-state.js | 固定 visit window、旧内容 opt-in、精确排除、bounded 候选保持；不是未读计数 |
| Search | ui/universal-search.js 安装主区 search-task；input-search.js、search-experience.js；SEARCH_INPUTS | 名叫 universal-search-dialog 的节点实际是主区 section，不应误改为模态 dialog。本地和全局范围必须说清楚 |
| Topic | ui/thoughts.js 扩展 thoughts-base.js；library-entry-editor；topic-actions | 保留 TopicAIViewSession、当前主题、分别的 view 位置、bindings/placement/revision；不要仅改 base 后绕过子类覆盖 |
| AI 文档 | ui/ai-presentation.js AIReadingEditor；evolution-model.js；retained-dom.js | 当前理解/演化/证据已有真实结构；不需要新增“思想真值” |
| AI 运行/比较 | thoughts-base.updateViewStatus；thoughts.js first generation/switchView/candidate save；ai-candidate.js | staged adopt/keep 与最终 guarded save 不变；运行完成不等于候选已采用 |
| 手动 Context | material-tray.js MaterialTray；memory.js 协调；PAIA_CONTEXT_MANUAL | 当前默认路径已是本次材料，不是旧静态 Profile 首页。须保留 sourceEpoch、rechecking、expired、draft/IME、最终输出检查 |
| Grant/Passport | ui/product-signals.html/js 里的真实本机工具、Passport 与 grant-bound package | 低频入口继续可达，不复制进另一个授权实现；当前没有真实远程 Connector，不得画“已连接” |
| Settings/数据 | core-loop.setupSettingsShell 六组重排；r6-settings.js；backup.js；smart-filter.js；memory.js | 移动节点而非复制控件/ID；先查动态 owner，保留唯一 handler、提交/失败回滚 |
| 隐私遮挡 | r6-settings.js 的 hideContentPreviews → html.paia-hide-content-previews；r6.css 明确作用于某些预览 selector | 换 class/新增预览必须同步 mask selector；不能把原先受保护的 preview 改成新 DOM 后泄露 |
| 低频页面 | popup.html/css/js、product-signals.html/css/js、review.js、revision-preview.js | 统一必要样式，保留入口/权限；不是另建 dashboard 或批量重构这些能力 |

## 3. 已查明的四个主要 presentation 问题

### A. 重复标题是 owner 冲突，不只是字太大

archive.html 的 `#view-title`、core-loop 创建的首页 eyebrow/h2、`#document-title`、`#topic-heading h1`、动态 `#ux-settings-title` 各自可能成为视觉标题。UIR-01 建立清楚的“当前页唯一可见 h1”规则，保留原节点/handler 需要的生命周期；不再用连续 CSS hide 补丁碰运气。

### B. Topic 外壳与正文共享了过窄上限

`.document-page` 使用 `--paia-prose-width`，原有默认仅 680px；Topic 的概览、演化、比较区也容易受同一上限约束。UIR 将**工作区/主题页面宽度**与**正文行宽**分开，保留已有 640 / 680 / 720 的阅读偏好，不必修改 durable preference 枚举。

### C. 同一功能的呈现由多个文件共同维护

core-loop 的 applyLabels/tuneExistingTools 会写导航和搜索按钮 textContent；随意给按钮加图标后，语言刷新可能把图标抹掉。Settings 在 JS 中重排控件，静态 HTML 调整可能被启动流程搬回。新逻辑必须修改实际 owner，而不是增加第三层轮询/MutationObserver。

### D. 内容看起来像控制台，不是因为缺少功能

Search、Reader、Thought、AI candidate、Context、Backup 已有较完整的边界。主要应收起重复说明与低频管理项、把主操作放在当前任务、增加清楚的留白/反馈。不能把移除过多控制当作简洁；每个保留能力必须有可追溯的新入口。

## 4. 真实能力对 mockup 的限制

- Archive 普通列表只有文档元数据，没有用于长卡的工作正文 DTO。只美化真实标题/时间/条数；全文感交给 Reader。无需新增 preview store。
- `currentView`、`blockSummary`、`possibleEvolution`、`evidenceEntryIds` 是现存 AI presentation 字段。演化可有证据阶段，也可降级为原话时间顺序；不能强制六阶段或线性成长。
- `keyInformation / decisions / preferences / judgments / openQuestions` 是已有可选字段，不等于人人都有四项“核心原则”或可勾选“下一步”。一期没有新任务数据模型。
- 最近阅读来自 bounded anchors，不是完整浏览历史。页脚名人引语、用户名字、128 条和分类计数均不采用。
- 首次整理、已有稿、候选、状态无法确认、outcome_unknown 必须分开。无原结果时可占位；有原结果时保留可读稿。隐私删除/禁止使内容失效时必须清除，不能以“保持阅读”继续显示受阻正文。

## 5. 两个必须写进任务书的工程耦合

### 5.1 Release 不是原样拷贝 HTML

`build:release` → scripts/build_current_release.py → build_daily_use.build_release。以下源标记受精确替换/裁剪约束：

- archive.html：`details#diagnostics`、`details#filter-advanced`、`button#library-organizer-jobs`。
- popup.html：`details#popup-internal-tools`。
- archive.js / popup.js：structure diagnostics import 及对应代码段。
- smart-filter.js 的 diagnostics timer/listener/method、library-updates.js 的 jobs handler。
- service-worker 的内部 diagnostics 路径在 release 构建时被去除。

规则：默认保留标记及其语义。确需改 DOM 时，允许最小等价调整 build transform，使 release 仍移除同样内部功能；保留 count=1 / fail-on-drift。**不得把 guard 改宽泛、删检查或把内部诊断带入发布包。**每轮都运行当前 release build，并在产物上 smoke，而非只看源码页面。

### 5.2 测试文件命名会改变认证归属

当前 scripts/test-groups.mjs 的 current browser 由三份显式 current 文件及 `ux-r\d+-.*-chrome-e2e.test.mjs` 识别；其他 `*-chrome-e2e.test.mjs` 默认可能进入 historical。

优先扩展当前 UX 文件，保持它们进入现有认证入口。新增 UIR 浏览器文件时必须小范围注册到现有 CURRENT_BROWSER（必要时现有 workflow 显式列表），并证明 `test:browser` / npm test 包含它；不能只有单独跑过却在 full suite 漏掉。该修改是测试接线，不是新 CI 系统。

当前 test.mjs 只接受 category，不支持随意把测试文件名追加到 npm test。focused 文件运行用 `node --test`；final 用现有 `npm test`。

## 6. 旧证据与本阶段验收分开

本审查没有重跑 1,088 tests，没有访问真实用户库、真实 Key 或 live Provider，没有修改产品代码。R6 release/视觉证据仅解释基线。每个 UIR 必须生成自己的真实浏览器 after 图与验证报告；最终新增 UI 只有通过完整回归后才可标 COMPLETE。新 UI 的审美质量不能从旧认证的 PASS 推导。
