# UIR-01 — Global Shell、导航与 Archive 布局框架

**状态由 ../UI_REFRESH_STATUS.md 决定。**本文件是任务书，不是完成报告。

## 1. 目的与入口状态

建立统一的应用外壳，解决重复标题、小而孤立的搜索按钮、主区过窄和侧栏工程信息干扰。先让已存在的页面像同一个产品；本轮不改Reader/Thought/Context的业务内容。

仓库 `haohongfei2001-png/paia`；分支 `chrome-ui-refresh-v1`。基线main `c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`。开始先解析远端真实HEAD，在同一SHA读取README、SPEC、STATUS和本文件，再读下列源码。STATUS必须当前为UIR-01且前置仅为文档交付；不要执行旧UX-R6状态里的下一任务。

正常首次entry的产品代码应与冻结main一致，仅增加UI Refresh文档/AGENTS指引。如本轮已有未完成代码提交，先审查其范围与报告后续做；不覆盖、不另起平行Shell、不force push。无法解释的运行代码差异先记录BLOCKED。

## 2. 必须继承

同URL导航/Back/Forward、consent与pause、history import、原有三个根页面、Settings六组、已有appearance/language/font/width/sidebarCollapsed偏好、真正继续阅读与最近收录的区分。保留来源/已移除/独立Thought/高级工具的入口。

保持SPEC P01～P14；不增加Provider调用、权限、store、路由、自动AI或数据迁移。UIR-02～04所属完整页面仍照常可用，不先隐藏它们来制造“完成”截图。

## 3. 最终结构与区域布局

| 区域 | 本轮结果 |
|---|---|
| Sidebar | Desktop224px、narrow192px/已收合64px；品牌、档案/思想库/用于AI、底部设置；导航同层同高、有icon/text/真实aria-current |
| 主工作区 | padding32/24/16px，layout max1280；不把所有页面锁为680px；正文读宽先原样保持 |
| 页头 | 单一活动主标题；必要返回；右侧搜索栏式入口与实际相关动作；去重复breadcrumb，不新增伪层级 |
| 搜索入口 | 沿用#universal-search-open button/paia:search-open；280～340px桌面宽，显示搜索提示与可用快捷键；不造第二个query input |
| Archive框架 | #core-loop-home不再重复两个档案标题；原列表作为主体；已有reading/resume/revisit节点组成轻辅助区；有数据且主区≥1000px才两列（辅助260/gap24） |
| 辅助内容 | #reader-resume真实阅读优先；#core-loop-continue仍叫最近收录，不能冒充continue；空节点不占卡片；新内容计数不当未读债务 |
| Settings标题 | 保留#ux-settings-title作为唯一可见h1；全局重复标题/路径不显示；本轮不重组其具体控制项 |
| 详情页标题 | Input以#document-title，Topic以#topic-heading h1；全局根名只作返回语境；搜索激活时只露Search主标题 |
| Popup | 只统一必要字体/按钮/间距/颜色，主回到PAIA与暂停/恢复路径不变；不改capture逻辑 |

实现移动现有节点，不克隆两个同ID控件。不在默认首页制造mockup分类、总量、用户头像或名人引语。普通Archive列表此轮仍沿用真实元信息，不补正文snippet。

## 4. 实施步骤

1. 找出archive.html静态Shell、core-loop.setupShell/createHome/setupSettingsShell、applyLabels/tuneExistingTools、ux-r1-shell-coordinator各自owner，记录将修改的标题/搜索/导航节点。
2. 在现有core-loop.css更新SPEC S3的tokens与sidebar/workspace参数。只改presentation数值，不动ux-r1-state默认值、workspace持久化枚举或旧用户偏好。
3. 可以增加一个小的ui/ui-refresh.css承接跨页layout/spacing，由现有bootstrap只加载一次。检查core-loop/r6动态样式插入与真实computed style，不能依赖错误的“HTML最后一条link总是胜出”。不要新增JS主题引擎。
4. 调整Shell DOM以及实际owner的标签更新，导航图标使用安全内联SVG/现有资源。将textContent整按钮替换改为只更新label节点，避免语言/状态刷新抹掉图标。保持事件只绑定一次。
5. 按标题矩阵处理各场景，而非全局隐藏所有h1。保留controller依赖的节点；重复展示节点可隐藏/降级，但不能使查询抛错、屏幕阅读器读两遍。
6. 将搜索launcher整合页头；点/Enter/Cmd-K都进入现有Search主input。Search打开时不残留外层重复启动栏；关闭/进Reader按原生命周期，不用第二套history。
7. 把现有Archive辅助节点排入框架，减少重复介绍。不得更改refreshRecent/refreshReading查询含义、触发顺序和锚点写入；列表加载不能被可选状态读阻塞。
8. 处理1440和1024基本布局、390根页导航与320不溢出的smoke；本轮不做最终全页面视觉矩阵。
9. 构建release，检查被精确裁剪的diagnostics等标记仍有效；实际运行产物再截图。

## 5. 状态与交互细节

| 条件 | 实施要求 |
|---|---|
| loading | Shell/已知内容保持；可选继续位置读取失败不挡档案列表；未知不显示0或假成功 |
| empty | 空库保留真实consent/导入入口；没有阅读锚点隐藏继续卡，不自动制造阅读 |
| error | 全局读取/保存错误仍在主区，必要重试可达；移除sidebar常驻本机信息不等于移除错误告知 |
| success | 原保存/复制状态沿原owner显示；导航切换不是“已保存”依据 |
| hover/focus | 导航轻底色、无位移；skip link第一可用；真实aria-current；buttons focus-visible；触屏无需hover |
| selected/editing | 原根路由仍属于library/thoughts/memory；正在编辑切页仍flush，失败不跳；不替换focused contenteditable节点 |
| language/theme | 中英标签同步且保留图标；不翻译用户正文；appearance/system与既有语言偏好不改存储 |
| responsive | <800原三项根导航保留，详情原返回可用；narrow恢复已保存收合偏好；resize不重置route、输入与阅读位置 |

普通说明减少工程术语，但consent范围/本地未加密/外部调用等关键说明不能删除。禁止新山水背景、大面积绿色、装饰动画。

## 6. 文件边界

**principal / 允许：**
`ui/archive.html`、`ui/core-loop.js`、`ui/core-loop.css`、`ui/archive.css`、`ui/experience.css`、`ui/ux-r1-shell-coordinator.js`、可新增`ui/ui-refresh.css`、`ui/popup.css`（必要时popup.html的纯结构）；本目录报告/证据；下述R1浏览器测试的必要定位/视觉断言。

**谨慎：**
`ui/archive.js`仅Shell挂载/标题场景/入口接线；`ui/universal-search.js`仅launcher与标题/focus接线，完整结果布局留02；`ui/reader-navigation.js`原则不改；`ui/popup.js`仅label/呈现；`scripts/build_daily_use.py`只在已证明marker变化时等价调整；`tests/harness/*`不为UI重做。

**默认禁止：**core/**、background/**、adapter/**、content/**、manifest.json、package.json/lockfile依赖改动、native-hosts、网站、overnight、UX旧报告/旧状态、AI/Context/Backup业务。此轮没有只读DTO例外的必要，新增“为了首页统计”的接口不允许。

## 7. 需要复用的状态/接口

`installCoreLoop`、`applyPreferences/applyLabels`、`setupSettingsShell`、`refreshReading/refreshRecent`；`GET_PAGE`、`UPDATE_PREFERENCES`、`PAIA_READER_RECENT`、`PAIA_REVISIT_STATUS`；`installReaderNavigation`、`paia:search-open`；原nav.data-view/aria-current、history.state、reader-active状态。

不要修改正常最近收录与阅读数组本身来去重视觉；只影响当前辅助区域的展示。所有query/body仍由已有服务管理。

## 8. 测试与快速gate

首用环境：在extension下`npm install --no-audit --no-fund`、`npx playwright install chromium`；保留pinned版本。设置 `PLAYWRIGHT_MODULE=playwright`、`PAIA_HEADLESS=1`；Chrome路径使用实际环境/原CI的CHROME_PATH/PAIA_CHROME，不借用户日常profile。Linux需要时用原xvfb-run。无法跑真实扩展即BLOCKED。

```sh
cd extension
export PLAYWRIGHT_MODULE=playwright PAIA_HEADLESS=1
node --test --test-concurrency=1 tests/ux-r1-shell.test.mjs tests/ux-r1-shell-chrome-e2e.test.mjs
npm run check
node scripts/check_development.mjs
npm run build:release
```

R1 unit里的roots、preference validation/migration、pause不重开、consent/onboarding断言不应变化。R1 browser可更新重复标题定位、sidebar旧像素/旧copy，新增少量单h1/搜索入口/图标不被语言刷新清掉/无重复listener断言；不能删原IME/键盘/零网络/偏好与大fixture检查。

如新建独立UIR浏览器文件，必须真正注册到现有current分类，否则不算交付；优先扩展上述现有文件。本轮不跑整套1000+作为默认门槛；共享Shell发现其他现有browser失败须修，不得称后轮负责。

## 9. 必须实际走的浏览器journey

J01：隔离干净profile打开扩展 → 显式consent/可跳过导入 → Archive；已暂停的旧fixture重新开页面仍暂停。

J02：Archive → Thought首页 → Topic → 返回 → Context → Settings → 返回，反复切换；活动主标题和nav一致、入口都可达，0隐式Provider/意外网络。

J03：点击宽搜索入口/键盘Cmd-K → 真正input获焦点 → 关闭/返回；重复调用不双重打开，不产生新的hash/query。

J04：切中文/English、light/dark、1024收合侧栏、390根页；图标、当前路由、已选偏好保持。取一个原Reader编辑fixture，跨页flush失败仍保留文字，不因Shell重排绕过。

J05：加载本轮 `work/current-release`，重复打开Archive/Settings/搜索；确认发布包中没有误带内部diagnostics工具，popup仍可回到同一PAIA场景。

## 10. 截图与视觉验收

最少after：Archive1440 light/dark、Settings1440 light（证明去重复标题）、1024导航布局、390根页。至少一张来自当前release产物。before使用基线实际浏览器或已标明来源的历史图，不能当after。

逐张打开检查：不是旧布局只换色；主列表在首屏可见；左栏不空挂版本/诊断；标题只一个；搜索像自然工具；260px辅列不挤正文；空辅列消失；无水墨/假统计；长标题无剪切；dark无白色遗留。

提交代表图到`../evidence/UIR-01/`并写VISUAL_REVIEW.md，含具体观察/修复及代码版本。已有R1矩阵可复用，不再拍重复矩阵。

## 11. 完成 / 不完成

COMPLETE：本轮结构落实；所有旧入口仍可用；focused、guards、release成功；真实journey与after图通过人工检查；代码、报告、STATUS已推送并核对。

以下不能完成：只新增CSS但重复标题/窄壳仍在；先把Thought/Context隐藏；将capture recent改叫继续；没有真实Chrome；source通过但release失败；语言刷新图标消失；已知保存/导航回归；仅上传图片未查看；沿用旧R6 PASS。

## 12. 回退、报告、下一轮

若layout破坏现有页面，回退本轮对应UI块/普通revert，不reset库或修改旧数据。导航失败先恢复owner/事件与window scroll，不改trusted sender。发布失败先恢复markers/等价transform，不能放宽检查。

提交建议`feat(ui): UIR-01 refresh shell and archive frame`。新增`UIR_01_REPORT.md`记录entry/代码commit、实际改动、保留能力、新入口、任何谨慎文件理由、命令结果/网络、release路径、截图链接和逐图检查、blocker/无blocker、最终GitHubHEAD。更新STATUS：01 COMPLETE后下一轮02；仍有失败则01 BLOCKED/IN_PROGRESS，不能推进。

UIR-02进入条件：Shell已经可用并通过本轮证据；未触碰核心模型/权限；需要Reader/Search细化而不是修未完成的Shell。停止本轮，不自动开始02。
