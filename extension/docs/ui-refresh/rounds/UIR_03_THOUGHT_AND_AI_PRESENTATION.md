# UIR-03 — Thought Library、Topic 与 AI Presentation

这是实施任务书，不是完成报告。版本v1.0；执行状态只读 ../UI_REFRESH_STATUS.md。

## 1. 目的与 GitHub entry

将已有思想库、主题正文、AI整理、证据和更新比较呈现为可持续阅读的同一产品，不新增组织算法、模型、思想阶段或任务系统。沿用已定SPEC S6，不重新讨论参考图方向。

仓库 `haohongfei2001-png/paia`，唯一分支 `chrome-ui-refresh-v1`；冻结设计基线 `c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`。entry为已完成UIR-02后的真实分支HEAD，不是重新checkout基线。开始解析远端HEAD，在同一SHA读取README、SPEC、STATUS、本任务书、UIR_02_REPORT.md和列明源码。01、02均须COMPLETE，02证据可获取且无未解决前置阻塞。如03已有未完成提交，检查并接着修，不重做已完成页面。

新窗口不需要旧聊天或四张图片。缺少报告、前轮未完成、无法解释的产品改动，先写明具体差异并保持本轮BLOCKED；普通排版决定直接采用SPEC，不向用户征询多个方案。

## 2. 必须继承与不得替换的 owner

SPEC P01～P14全部有效。特别保持：Topic/Section/Thought/placement、同一Thought多主题一致、bodyBinding及首次实际编辑才解除跟随、默认不反写Input、有效完整一对一高级反写及一次性Undo确认、revision/CAS、独立人工字段保护、Source/purge谱系、今天新Thought时间、既有排序/阅读位置。

保留 `thoughts.js` 对 `thoughts-base.js` 的扩展；不能只改base而绕过子类的switchView、首次生成、候选与保存流程。保留TopicAIViewSession的主题级视图、两种视图各自位置、原editor生命周期及flush。AIReadingEditor仍拥有AI字段编辑，LibraryEntryEditor仍拥有Thought编辑；布局wrapper不是新的正文副本。

AI缓存切换、重开主题、读status、resize、theme和语言切换均不得发Provider请求。首次生成/更新仍经现有确认、预算、runner和可信服务；新结果是候选时不得冒充已采用。所有实际待决字段处理后才允许最终guarded save，不能从旧示意文字推导自动采用。

## 3. 页面结构与具体区域

| 区域 | 最终结构与布局 |
|---|---|
| Thought首页 | 唯一思想库h1、现有全局搜索、更多；已有最近阅读单独轻区；稳定主题网格/用户已选列表；独立Thought二级入口 |
| 主题卡 | 真实名称、已有summary/sourceHint、服务可证明的时间/数量/新材料；卡内20～24px，弱边框；不悬浮缩放、不常驻复选框 |
| 网格 | Desktop通常2列；主区≥1140px才允许3列；最小卡宽约300px，空间不足回单列。保留已保存grid/list，不因AI轮询重排 |
| Topic页头 | 返回来源 → #topic-heading h1与已有简介 → 一行AI整理/顺序/查找/按需目录/用于AI/更多；全局同义h1不再竞争 |
| Topic Original | #topic-body内原Thought连续正文、真实已有章节、弱日期/编辑范围、页边更多；末尾或原位置的补充今天想法入口；不放虚构当前理解 |
| Topic Organized | 同一主题外壳；已有当前理解轻底概览 → 有证据的纵向线索或原话时间线 → 相关原话 → 非空的其他已保存整理；不是固定四卡 |
| 证据 | 从现有evidenceEntryIds/绑定读取；在对应段落下展开，足够宽时可约260px辅助列；不能挤破用户640/680/720px正文行宽 |
| AI运行状态 | 单一、轻量、与当前主题关联的状态区；有效旧稿仍可读。状态未知与正在生成分开，无虚假百分比 |
| 候选比较 | Desktop两列当前稿/更新候选，≤900px上下排列；每个实际变更字段采用/保留；底部一次保存所选处理；无差异不占空卡 |
| 加入/新写/结构管理 | 沿用现有弹窗与handlers；日常加入、接着写容易进入，合并/重命名/结构管理在更多；不能直接删除非参考图能力 |

工作区继承01的1280px上限，Topic外壳不再被整页680px限制；连续长正文保持用户readingWidth。仍使用window滚动，不为时间线建立第二滚动正文。长题目自然换行，工具条可分两行但不得挤小正文。

## 4. 现有状态到新组件的映射

| 实际数据/状态 | 组件与行为 |
|---|---|
| LIBRARY_INDEX_PAGE返回Topic与countComplete/countApproximate/recent | 主题卡/最近阅读；不完整数量不显示为全库精确总量；无已有简介不调用模型补写 |
| TOPIC_DOCUMENT_PAGE、bodyBinding、人改/来源更新 | Original正文与当前编辑范围；保留查看当时记录/档案当前文字/版本/恢复跟随动作及比较确认 |
| blockSummary/currentView | Organized概览；字段仍由data-ai-field标识，避免重复摘要，不把AI推断写成原话 |
| possibleEvolution及evolutionPlan/证据 | 纵向思考线索；没有足够阶段则原话时间线；未知日期不以createdAt替代sourceSentAt，不强制六阶段 |
| keyInformation/preferences/decisions/judgments/openQuestions | 只显示真实非空字段的原本语义；折叠细节可以，不删已有人工改稿；不改造成核心原则或可勾选任务 |
| 无缓存/首次生成待确认 | 原文继续可读，局部生成入口 → 当前主题/材料范围/处理方 → 明确开始；无Key时只阻止生成，不阻止已有内容阅读 |
| prepared / sent / response_received / validated | 分别表达准备材料/正在整理/收到结果待核对/已校验待提交；来自真实状态，不用计时器编造阶段 |
| committed + candidate | 新整理已准备好·查看更新；不自动替换当前稿 |
| 首次结果真实committed | 仅用户仍在等待同主题时呈现；别的页面不抢导航、不清除原视图位置 |
| statusUnavailable / failed | 局部状态失败或真实运行失败；保留合法现有稿和可操作的恢复；不伪造0条或已完成 |
| credential_missing / budget_limited / local-only | 原流程真实限制、现有设置入口；不自动开externalAccess、不放大预算、不保存Key到正文 |
| outcome_unknown | 结果尚未确认，请先检查状态；再次发起可能计费；重开/刷新/status读取不自动重试 |
| candidate stale / revisions改变 | 禁止采用/最终保存，保留人工当前稿与可保留的暂存选择，展示核对原因；不得放宽CAS |
| Source purge / 禁止处理或输出 | 按原服务区别清理依赖正文与阻断处理/输出；不把禁止外发扩大成本地原文不可读，也不保留已purge正文 |

## 5. 实施顺序

1. 在当前SHA确认paintHome、Topic渲染、switchView、AIReadingEditor、candidate和status各自拥有的DOM；列出保留ID、data属性和事件入口，不新建页面controller。
2. 调整Thought首页卡片/列表、局部查找与更多；保留Topic ID、稳定排序和已有layout偏好。非空搜索条件必须可见/可清除，不能藏起有效过滤条件。
3. 按SPEC去重Topic标题、拓宽外壳、保留正文宽度；目录来自已有sections，不生成章节。已有Root/Topic返回与Search发起位置不改。
4. 为Original改轻日期/页边操作与焦点范围说明。不得重建正在composition或dirty的editor节点。加入主题/接着写/来源比较只改外观，不改操作对象和版本校验。
5. 重排AIReadingEditor现有字段：轻概览、纵向证据线索、其他真实字段。保留field key、revision、draft与人工保护，不能从显示文本重新推断写入对象。
6. 在现有status owner中映射状态，移除旧全文遮罩/装饰反馈，不新增poller。pending读取时保留有效旧稿；purge按原失效事件立即清理。
7. 重排ai-candidate的当前/候选布局，保留decision key、aria-pressed、staged choices、保存前flush与expectedRevision。重新打开和resize不丢选择；发生stale不得启用旧保存按钮。
8. 同步预览遮挡：Topic卡summary/sourceHint、相关材料预览的新class继续响应html.paia-hide-content-previews；不得把遮去正文放入title或aria-label。明确打开的全文沿原边界，不误遮正文。
9. 跑本轮focused gate；用同一隔离fixture拍after并实际检查。release变换失败先恢复marker或做等价修补，不调整域模型。

## 6. 交互、状态、主题与响应式

hover仅轻底色/页边动作，不改变卡高；focus-visible可见，卡片与更多各有独立可访问名称，避免嵌套按钮；触屏更多常驻。AI switch保持原aria-checked/disabled原因，选中只代表视图，不代表云端授权。

加载首页时保留仍有效旧卡，局部失败不装空；空库/无主题/主题无条目/查询无匹配分别提供真实下一步。Topic保存失败保留buffer、重试/复制保底；来源变动不是立即覆盖人改稿的理由。成功只从持久保存结果产生，暂存采用不是已保存。

Desktop保留宽概览与可读长文；1024px不挤出横向滚动；390/320单列、按需目录、原生选词与既有编辑/完成，关键按钮≥44×44。候选≤900px上下比较，控制次序与DOM阅读次序一致。resize不能切换Topic/视图、重新生成、清空dirty或滚回页首。

Light/dark覆盖概览、证据引用、candidate、无Key提示、错误、dialogs和选中动作，继承SPEC tokens；普通可见文本维持既有≥4.5对比度门槛。reduced-motion直接切换，骨架aria-hidden且不遮现有稿；无流光、山水、逐卡假进度。中文/English文案语义等价，不翻译用户正文或把工作版本当历史。

## 7. 文件范围与只读例外

路径相对extension。

**principal / 允许：** `ui/thoughts.js`、`ui/thoughts-base.js`、`ui/thought-reader.css`、`ui/thought-copy.js`、`ui/ai-presentation.js`、`ui/ai-candidate.js`、`ui/ai-first-generation.js`、`ui/memory-recomposition.js`；archive.html的Topic挂载区、既有共享样式/ui-refresh.css的小修、r6.css的预览遮挡；本目录报告/证据和下列已有测试的必要定位。

**谨慎：** `ui/library-entry-editor.js`仅呈现；`ui/evolution-model.js`只保持现有证据投影；`ui/retained-dom.js`、archive.js、reader-navigation.js、session/editor primitives原则保持生命周期算法；library-updates.js不改任务规则。改共用DOM必须检查02的Reader/Search返回没有回归。build_daily_use.py仅精确且等价的marker适配，保留fail-on-drift。新增浏览器测试的current注册仅使用现有脚本/CI最小接线。

**只读adapter例外：**仅已批准字段因现有UI接口无法合理展示时，先证明缺口再作最小已有字段投影；无新正文/写入/查询扩张/权限，报告记录与测试。不允许为了时间线新增历史推断、排名或durable层。能用现有返回实现就不改core。

**禁止：** core业务写入/思想绑定/AI runner/预算/候选/CAS算法、background/**、adapter/**、content/**、manifest、依赖升级、schema/backup format/migrations、native-hosts、根网站、overnight、旧UX状态/报告。不得新增provider、定时付费刷新、自动重试、固定思想阶段、taxonomy、任务checkbox或副本真值库。

## 8. 测试和快速gate

使用仓库pinned依赖与现有harness。新环境在extension运行 `npm install --no-audit --no-fund` 和 `npx playwright install chromium`；真实Chrome路径按实际环境设置CHROME_PATH/PAIA_CHROME，Linux需显示服务时用既有xvfb-run。隔离合成profile，不读取日常用户库/Key，不进行live付费调用。

```sh
cd extension
export PLAYWRIGHT_MODULE=playwright PAIA_HEADLESS=1
node --test --test-concurrency=1 tests/ux-r3-thought-binding.test.mjs tests/ux-r3-topic-actions.test.mjs
node --test --test-concurrency=1 tests/ux-r3-thought-chrome-e2e.test.mjs tests/ux-r5-ai-organize-chrome-e2e.test.mjs tests/ux-r5-ai-update-chrome-e2e.test.mjs tests/ux-r5-certification-chrome-e2e.test.mjs
node scripts/test.mjs "privacy/security"
npm run check
node scripts/check_development.mjs
npm run build:release
```

预期只需更新R3/R5浏览器中的标题、卡片/比较布局和更准确的locator；保留所有编辑、绑定、CAS、purge、无自动调用、F-LARGE、IME、键盘、对比度断言。域tests的expected ownership/revision/permission不因视觉而修改；不能skip、调大timeout或降threshold。新断言聚焦单h1、稳定视图、正确loading和新preview mask，不制造数百新tests。

若前轮合法改名，循git历史找到等价入口并记录，不静默省略。优先扩展已有current文件；新UIR browser文件必须在现有test-groups和必要workflow列表注册，证明npm test实际包含它。每轮不是默认跑全部1000+，但本轮导致的已有失败必须修复。最后以work/current-release真实产物再执行至少一个主journey。

## 9. 必须执行的真实browser journeys

J01 主题浏览：合成多个Topic/长标题/未加入主题Thought → 首页grid/list切换 → 打开Topic → 查找/排序/返回；非空条件、最近阅读、布局偏好和位置保持，状态刷新不全页闪烁。

J02 编辑边界：同一完整Input对应Thought置于两个Topic → 默认编辑Thought两处一致但Archive/Source不变 → Input后来变动不覆盖人改稿 → 查看比较 → 明确恢复跟随；高级反写开/关与一次性Undo确认沿用原测试。另验证今天新Thought与选段只写自身。

J03 视图/首次生成：Original → 无缓存AI入口 → 取消/无Key/local-only仍可读原话；在隔离fixture中显式确认一次生成 → 同主题Original/缓存多次切换、主题切换、语言/theme/resize，除显式生成外Provider计数不增加。

J04 运行中/失败：用现有合成Provider fixture挂起或失败一次显式请求 → 有效当前稿一直可读；显示真实阶段 → failure/outcome_unknown → 重开页面/检查status不重试；成功返回别的页面不抢导航。拦截的fixture请求与真实外网分别计数，绝不把模拟调用称live Provider成功。

J05 候选/保护：人工改AI字段 → 显式更新得到candidate → 逐字段暂存采用/保留、切窄屏，尚未保存时不改当前稿 → 一次guarded save；注入真实revision变动后旧candidate不能保存，不绕过CAS。保持取消/焦点恢复与IME。

J06 证据/删除：展开相关原话/当时记录 → Source purge → 相关旧缓存与依赖正文按原规则消失、输出受阻；独立人工note保留；未知时间不变成Topic创建日。preview mask覆盖Topic卡和材料预览且不误遮已明确打开的正文。

J07 release：加载本轮work/current-release，执行Topic Original → 已有整理 → evidence → candidate查看/保留当前稿 → 返回；确认内部诊断未漏入release、0意外外网。可复用现有release-aware harness，不另建框架。

## 10. 截图与Agent视觉检查

最少after：Thought首页1440 light/dark；Topic Original 1440 light；Organized 1440 light/dark；真实处理中仍有旧稿1440 light；candidate 1440与1024；390单列Topic/候选一张。至少一张为当前release。before可使用02完成后本轮开始的真实截图，不能把旧R5截图称新after。既有R5测试生成更多图则保留，不另强制每页全矩阵。

逐张打开检查：主标题唯一、工作区宽而长文不横跨全屏；主题名可读；无四原则/六阶段/任务假模块；真实长证据不挤到极窄列；当前/候选关系明确；选择不冒充保存；processing不盖旧稿；dark无亮白残块；无Key/失败仍可读；移动更多/焦点可用，隐私遮挡不从tooltip泄露。

代表图提交 `../evidence/UIR-03/`，配VISUAL_REVIEW.md记录图片、状态/尺寸/theme、实际代码版本、具体观察、修复前后和限制；不是只写“美观PASS”。大日志可留既有artifact，但关键图必须未来可取。

## 11. 完成标准与不完成标准

COMPLETE要求本轮结构与所有真实能力入口落地、focused/guards/release及journeys通过、实际截图已查看并修复、报告/STATUS/代表图与代码进入GitHub且HEAD复核。03 COMPLETE之后才能将04设为下一轮。

不能完成：只有换色而整页仍窄壳；删除人改字段/管理能力来减按钮；固定成长故事；切AI即隐式付费；处理中全文模糊；candidate静默覆盖；stale绕过；新生成schema；未读图片；只有source没有release；借用旧R5认证当本轮PASS；已知02的编辑/返回回归被留给04。

## 12. 修复、回退与交接

先修本轮UI owner/DOM生命周期，不通过改binding、CAS、provider重试或删除规则让测试通过。渲染抖动优先保留稳定节点；定位错位先检查window scroll和标题高度；release失败恢复marker/等价transform。需要回退用普通revert本轮相关UI提交，保留他人提交和用户数据，不降数据库版本。

建议代码提交 `feat(ui): UIR-03 refresh thought and AI presentation`。报告 `UIR_03_REPORT.md` 必须包含entry、代码commit/验证版本、实际改动与旧能力新入口、谨慎/adapter例外理由、原话/AI/候选/权限边界保持、逐命令exit/pass/fail/skip、模拟与意外网络计数、release smoke、截图与逐图审查、已修复/遗留问题和下一轮条件。随后更新STATUS并推送，核验远端HEAD；不推进04实现、不merge main、不启动旧campaign。
