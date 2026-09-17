# UIR-02 — Archive、Search、Revisit 与 Input Reader

本文件是当前轮任务书，不是完成声明。状态见 ../UI_REFRESH_STATUS.md。

## 1. 目的与entry

把UIR-01外壳里的真实内容做成可扫描的档案与可持续阅读的正文，完成查询/返回/复用和回访的presentation。不是新增归档分类、摘要、推荐或阅读模型。

仓库`haohongfei2001-png/paia`，分支`chrome-ui-refresh-v1`。开始解析真实HEAD并固定ref读README/SPEC/STATUS/current round；01须COMPLETE且报告/代码/截图可核对。基线仍是c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e，但本轮entry是已完成01的实际远端提交，不退回main或重做Shell。

读01报告与当前src的navigate/refresh/leave，确认没有未解释改动。新窗口只凭上述文档与真实源码即可执行，不需要四张图或旧聊天。

## 2. 必须继承的行为

Input编辑/标题、500ms autosave、IME、Undo/Redo、保存失败复制、独立Source/工作版本、跨Input只允许安全复制不合并身份；Reader位置3秒/明确保存、字符与revision、排序/展开/邻近fallback、新收录提示；Search query/filter/page/selection/返回、stale intent与historicalSource；Revisit固定window/有界候选/old opt-in；Smart Filter恢复、删除/tombstone、Context加入真实refs/spans。

SPEC P01～P14有效。此轮不得为美化列表增加正文DTO、每行读取全文、生成摘要或大库全扫描。

## 3. 页面最终结构

| 场景 | 从上到下/各区域 |
|---|---|
| Archive | 单一标题+全局搜索 → 轻工具条（在档案中查找/已有范围、已显示数量、更多）→ 文档行 → 原cursor分页；有真实阅读辅助内容则采用01的260px辅助区 |
| 文档行 | 真实userTitle优先/原平台标题，允许两行；下一行真实发送范围/未知状态/messageCount；必要类型标签；没有虚构正文摘要、默认平台Logo或厚卡 |
| Reader | 返回/紧凑操作 → 文档h1 → 日期/asc-desc → 连续Input正文；页边更多/复制/用于AI/加入主题；来源与版本在按需面板 |
| Search | 唯一主query → 全部结果/按时间看 → 范围筛选details → 结果/明确选择工具 → 分页；不是dialog模态，仍是现有search-task |
| 历史模式 | 原始Source文字/真实来源时间；两条对照保留各自标识，不画AI成长结论 |
| Revisit | 返回档案 → 唯一h1 → 真正继续 → 本次新增 → Topic新材料 → opt-in后才有旧内容；空区省略/局部失败明确 |
| 来源/版本/恢复 | 三种模式分开命名：当时记录、工作版本、已移除；删除语义在真实动作现场解释 |

读宽640/680/720保持用户已选；工作区宽度不受该值限制。主列表行高度随内容，不用固定高度裁标题。跨页多选不因新布局清空。

## 4. 逐步实施

1. 检查archive.js `showCollection`的真实state.documents和signature。删除重复泛化subtitle，保留真实title/time/count与data-document-id；普通DTO没有snippet，直接不加。不得使用Source正文代替工作版预览。
2. 保持原cursor/上一页下一页与当前query语义；label写“已显示N个对话/当前范围”，不能把docs.length当整个库。修复纯呈现造成的列表抖动时继续用现有稳定signature/retained DOM，不另写新缓存。
3. 把`#search`放进清楚标范围的工具区；非空query/筛选始终可见，清除返回相同页面。原Input search可以返回内容命中，不错误标成只搜标题。
4. 改Reader header/body/日期/页边操作CSS与必要DOM。保持data-edit-id、blockId、selection range、editor host与window scroll。围绕这些节点加layout wrapper可以，复制/替换正在输入的节点不行。
5. Source/revision/review面板统一标题/按钮层级和危险确认；原来源只读、恢复建立新版本等文案保留。手机更多可见；不把垃圾桶简化成含糊叉号。
6. 在universal-search owner内重排结果和filters，保留selected/compared Maps、intent、origin/readerReturn、lastScroll、pages、composition。Search启动栏已由01完成，不重造第二栏；本轮统一真正结果表面。
7. Search → Reader → 返回恢复query/滚动/选择；历史Source与当前版本对照不被新的普通snippet组件混用。存在partial/indexing时显示真实限制。
8. 重排Revisit为轻分区，无新ranking/policy。排除后正确focus邻项，保留固定visit window与旧材料opt-in。
9. 对所有移动/新class的预览同步r6 mask规则；不把被隐藏文字放tooltip/aria-label。此轮Reader全文不受preview mask误伤。
10. 跑focused/guards/release与journeys；修复实际截图问题再提交。

## 5. 状态、响应式、copy

| 状态 | 具体行为 |
|---|---|
| 列表加载/翻页 | 保留已有效行；尾部loading或局部busy；不先绘制一屏空卡；当前query结果过期时禁用误选 |
| 真空/筛选空 | 真空给收录/导入；筛选空给清条件；失败/partial不能写没有记录 |
| Reader编辑 | 焦点内显示编辑范围，native selection不被按钮pointer事件破坏；手机用既有编辑/完成 |
| 保存失败 | 保留真实buffer，重试/复制当前文字仍在可视区域；不自动reload覆盖，不把失败归到普通notice隐藏 |
| 新收录 | 原“有新内容/查看”可达，不自动跳末尾、不抢锚点 |
| 旧响应 | 不得落回旧页面或释放错误navigation；保留R2 refresh ownership，已过时失败不显示到新页面 |
| Search已选 | 用实际checkbox/计数，全部页与本页分开；进入Reader不丢；点击snippet默认不是截断的复用材料 |
| Revisit空闲 | 没新内容不显示清空/已读任务，不调用AI填充；old未开不出现以前内容 |
| Purge | 当前Reader/来源/历史/搜索/派生预览依既有消息失效，不能为了视觉保留旧正文 |
| Hover/focus | 行轻底色无高度跳变；更多在focus-within可达，触屏常驻；关闭面板恢复触发focus |
| Responsive | 1024侧栏可收；辅助列上移；390/320单列，长URL/代码局部处理；不把window scroll换掉 |
| Light/dark | Reader、Source pre、搜索高亮、selected行、错误/更多菜单都消费同一tokens，无白底漏块 |

用户侧术语优先“当时记录/当前工作文字/恢复这个工作版本/这条输入的更多操作”。明确的技术范围可以放详情，但unknown时间、不可撤销和权限失败不能藏。

## 6. Principal / 允许 / 谨慎 / 禁止

**允许主文件：**`ui/archive.js`的showCollection/渲染与相关DOM接线、`ui/archive.html`相关区域、`ui/archive.css`、`ui/reader.css`、`ui/reader-experience.js`纯呈现、`ui/revisit.js/css`、`ui/universal-search.js/css`、`ui/search-experience.js`、`ui/input-search.js`呈现、`ui/revision-preview.js`、`ui/review.js`、`ui/r6.css`预览遮挡、现有UI shared样式与本目录报告。

**谨慎：**`ui/library.js`只编辑器呈现、不改save/history模型；archive的leave/refresh/navigation和`reader-navigation.js`原则保持算法；`session-lifecycle.js`、`editor-primitives.js`默认不改；`reading-actions.js`不改授权/有效内容复制路径；`material-tray.js`只必要入口label，工作台重排留04；build_daily_use精确marker仅等价修补。

**默认冻结：**core、background、capture/adapter、manifest、provider/authorization/backup/migration/native-hosts/网站/overnight。唯一可讨论的本轮只读projection例外是`core/archive-query.js`对**已获准现有字段**的展示投影，必须先证明缺口、无写入/查询扩张并补测试；不包括普通列表snippet、总量仪表盘或排序语义新设计。

**禁止新增能力：**分类法、推荐、阅读位置新store、完整浏览历史、自动摘要、数据迁移、新授权/外发。

## 7. 复用点与不可改变的底层tests

复用DocumentEditor/ReaderExperience、PAIA_READER_SAVE/RECENT、现有reader-state/revisit；SEARCH_INPUTS/paged与source-time projection；`paia:search-open`/`paia:navigate`；现有Source/revision/remove/purge commands；getMaterialTray().add与flush后真实refs。

既有域tests关于grapheme/offset/restore、stale response ownership、purge/migration、fixed visit window/exclusions、Source不变、500ms/IME/Undo、manual-vs-Grant不能降断言。仅旧DOM选择器/视觉常量随呈现调整，必要新regression扩展原文件。

## 8. 快速验证命令

先确认环境：extension内pinned npm依赖与Playwright；`PLAYWRIGHT_MODULE=playwright`、`PAIA_HEADLESS=1`；真实Chrome路径沿用现有harness/CI；Linux按需xvfb，不使用真实用户profile/Key。

```sh
cd extension
export PLAYWRIGHT_MODULE=playwright PAIA_HEADLESS=1
node --test --test-concurrency=1 tests/ux-r2-reader-revisit.test.mjs tests/universal-search-round46.test.mjs tests/revisit-round47.test.mjs
node --test --test-concurrency=1 tests/ux-r2-reader-revisit-chrome-e2e.test.mjs tests/ux-r4-search-reuse-chrome-e2e.test.mjs
node scripts/test.mjs "privacy/security"
npm run check
node scripts/check_development.mjs
npm run build:release
```

先核对真实文件；这些是基线现有入口，不创建同名空测试。若前轮合法调整文件名，追踪git记录映射，不静默跳过。单文件运行用node --test，不能`npm test 文件名`。若新增UIR浏览器文件，接入现有current分组。

预期更新：R2实际DOM位置与移动更多、R4Search filters/结果/返回定位；保留它们的dwell、保存失败、IME、zero-network、F-LARGE、explicit selection与purge检查。可加少量“新的预览class仍被mask隐藏”的断言，不重写harness/造几百测试。

## 9. Browser journey

J01：100k合成库/既有大fixture加载Archive分页；界面只用bounded数据，无每个文档全文N+1。标题/计数/未知时间真实，工作区不被680px限制。

J02：读A中段、停留保存 → 收录B → 返回Archive仍继续A → 重开定位字符；切asc/desc、长输入展开、删除锚点用安全邻近；不变成最新B或文首。

J03：中文IME、多行/长URL，编辑→Undo/Redo→实际保存失败→复制buffer/重试→跨页；不要用未聚焦合成input掩盖focus回归。

J04：Search查询→筛选→跨页选3项→打开Reader→Back，query/page/scroll/3项仍在；过期异步查询不能覆盖；全选本页与全结果边界分清；在历史模式今天改稿不改变旧Source。

J05：Revisit固定窗口返回/刷新不清掉眼前内容；未开old不主动显示；精确排除阻止关联预览；没有新材料仍可继续阅读。

J06：来源核对/普通移除恢复/永久删除三路径，purge后旧来源、历史、Search和材料预览不可继续输出。只用隔离fixture。

J07：本轮release产物实际走Archive→Search→Reader→返回；dark/390/键盘可操作，意外网络0，非显式Provider调用0。

## 10. 截图要求与人工检查

最少：Archive1440light（元数据列表与辅助区）、Reader1440light/dark、Search1440light、Revisit1440light、Reader390编辑/保存失败。优先复用现有真实测试图，至少一张为当前release运行图；最终全matrix留04。

检查重点：真实内容在第一屏有重量，不是大空卡；标题/时间/条数不反复重复；全文没有每段厚边框；工具不挤文字；恢复锚点在固定条下可见；Search过滤范围清楚；dark高亮可读；移动保存失败/更多不被键盘遮；preview mask仍覆盖已改DOM。

提交`../evidence/UIR-02/`关键PNG与VISUAL_REVIEW.md，写实际发现和修复，不以tests绿代替视觉。旧before/过期after分清。

## 11. 完成、回退与handoff

COMPLETE条件：本文件全部范围落地、focused+guards+release通过、journey证明原阅读/搜索/回访/安全不退化、真实截图已看并修、报告/STATUS推送。

不完成：制造snippet/假总量；把最近收录当继续；保存buffer丢失；换scroll容器后位置错；Search选择被重新检索替换；Source删除后残留；只有静态稿；仅source通过release失败；已知不可读留给Phase B。

回退优先对应UI diff/普通revert；位置失败恢复原scroll/DOM身份，不改reader-state归零；权限/复制失败修入口不得拼旧DOM绕过；release失配恢复marker。

提交`feat(ui): UIR-02 refresh archive search and reader`；写`UIR_02_REPORT.md`，包含entry/代码版本、改动/保持/旧入口新位置、DTO/发布例外证明（没有则无）、逐命令/实际网络/截图/视觉修复、blocker与下一轮。STATUS只有通过后02 COMPLETE/下一轮03。不自动执行03。
