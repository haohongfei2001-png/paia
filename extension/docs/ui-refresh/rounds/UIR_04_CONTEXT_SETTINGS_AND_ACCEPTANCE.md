# UIR-04 — Context、Settings、共享状态与最终验收

版本v1.0。本文件是最后一轮任务书，不代表实现完成；状态由 ../UI_REFRESH_STATUS.md 维护。

## 1. 目的、entry与退出边界

完成既有用于AI工作台和六组设置的presentation，统一低频页面与跨页状态，在最终代码上关闭完整回归和真实视觉验收。本轮预留完整验证时间，不新增默认第五轮，不把基础不可用缺陷丢给Phase B。

仓库 `haohongfei2001-png/paia`，分支 `chrome-ui-refresh-v1`；设计基线仍为 `c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`。entry为03 COMPLETE后的实际远端HEAD。开始固定SHA读README、SPEC、STATUS、本任务书、UIR_03_REPORT.md及相关现有源码/安全契约。01～03均须已提交并有有效证据；不回main重新实现，不按旧UX状态执行夜间恢复。普通git差异无法解释时记录BLOCKED，不覆盖、不force push。

终点是本分支四轮COMPLETE、最终证据可核对、等待用户决定合并。**不自动merge、部署、替换用户正在加载的扩展目录、发布商店版或进入Phase B。**

## 2. 必须继承的功能与信任边界

SPEC P01～P14全部有效，尤其保留MaterialTray唯一实例/root、当前标签selected refs/revisions/spans、sourceEpoch/rechecking、draft/IME、顺序/移除/遮挡、ephemeral preview生命周期、实际最终输出校验。手动材料不要求Profile/Grant；grant_bound不允许降级成manual绕开权限。local-only/externalAccess/never规则各自独立；禁止项不能靠普通DOM复制按钮绕过。

Settings继续通过现有handler持久化，同一控件不复制。保留consent/pause、精确会话排除、Smart Filter及用户恢复优先、字号/读宽/语言/主题、反向编辑默认关闭、session credential寿命、预算和真实失败回滚。Backup/完整开放JSON或Markdown/scoped Source export三种格式与用途不能混名；空库恢复、校验预览确认、tombstone、权限不复活、未加密与下载事实保持。

Passport/Grant、Source review、独立Thought、数据完整性/历史修剪/诊断和既有本机工具仍可达，不移到首页抢主视觉，也不另造授权/统计后台。

## 3. 最终页面结构与区域布局

| 区域 | 最终呈现 |
|---|---|
| 用于AI页头 | 唯一h1用于AI；必要返回/全局搜索；任务h2与只在本机准备、尚未发送的短说明；不再叠legacy Memory首页 |
| 空材料状态 | 从档案选择/从主题选择两个真实入口，可选本次说明；没有Profile/Grant前置问卷，没有虚构示例、统计或三张介绍卡 |
| 材料工作台 | 真实所选N项、每项身份/来源角色与必要日期、上移/下移/移除、说明、找相关补充/预览；建议保持未选，不能替换显式材料 |
| 材料抽屉 | 同一root移动而非克隆；桌面约400px非模态，空间不足覆盖但不挤正文；≤600px保留当前modal/inert/focus边界，单列全屏可返回 |
| 输出预览 | 640/680/720用户读宽内连续文档，内部仍逐材料映射；提示只影响本次输出、真实字数/条数、重建/确认/复制/Markdown；不铺授权仪表盘 |
| 高级授权 | 现有legacy Memory入口可命名授权范围与外部使用（高级）；保留原Profile/Passport与grant-bound工具，不创建Connector或已连接假状态 |
| Settings框架 | 自身唯一h1与返回/局部反馈；Desktop180px组导航+minmax(0,840px)正文、gap32；不是第二个App sidebar |
| Settings窄屏 | <800px同一分组导航折叠为当前组/切换分组，切换显示同一控件与正文；保持焦点/分组位置，不复制六份表单 |
| 数据与设备 | Backup、完整导出、从备份恢复清楚分组；scoped Source export单列范围说明；真实存储估计/上次备份/当前无设备同步 |
| Popup/本机工具 | 沿01已有统一基础补必要可读性/主题/窄屏；主回到PAIA、暂停/恢复与Passport等原动作不变，内部与release差异保留 |

不对材料/预览另造router、查询引擎或持久store。组导航、页面宽度、主体滚动沿01～03；长错误可换行，输出按钮不能被软键盘/底部导航挡住。

## 4. 六组控件归属与不得省掉的说明

| 组 | 唯一归属与说明 |
|---|---|
| 内容与收录 | 真实收录/暂停/恢复、支持来源与历史导入、精确会话排除、轻度/关闭过滤、收起内容恢复；暂停不删除，恢复的实际收录范围不能隐瞒 |
| 阅读与外观 | 既有font/readingWidth/appearance/language/timeDisplay、旧内容回顾opt-in与排除管理；保存枚举不变，不根据截图重置用户偏好 |
| AI | 实际Provider/session Key与清除凭证、使用/预算上限；日常生成/更新仍在Thought现场；保存Key本身不发请求、不回填明文 |
| 隐私与对外使用 | local-only、externalAccess、AI材料限制、hideContentPreviews；预览遮挡不是加密，不承诺OS截图防护；外发后副本无法收回 |
| 数据与设备 | Backup/完整JSON和Markdown/恢复、scoped Source、已移除入口、真实存储/上次备份；未加密与空库恢复限制在动作现场，不藏到无关页面 |
| 高级 | 原高级反向编辑、完整性/迁移/历史修剪/诊断、本机工具/Passport、版本；危险动作保持原确认，普通用户不用理解底层对象表 |

每个现有控件逐项登记旧selector/owner、新组/入口、是否在release、行为验证。记录在本轮报告即可，不新建控件注册系统。没有位置的控件不能当作删掉；已在正确组的只调版式不搬来搬去。

## 5. 状态、交互与渐进披露

| 真实状态 | 显示与操作 |
|---|---|
| tray无材料 | 两个选择入口，保留可选说明；不能显示0条授权等同无内容 |
| 已选/建议 | 固定显式材料与未选建议分开；加入新项不抢原正文选区；拖动保留上移/下移键盘替代 |
| building/rechecking | 保留材料与人工buffer，标本机准备/核对，禁用未完成输出；不写AI正在生成 |
| ready/dirty | 展示当前可检查输出及原确认步骤；dirty不是已保存到Archive，人工删改不能在重新准备时静默恢复 |
| stale/blocked/expired/error | 对象旁解释范围与恢复；按原服务禁用输出，旧HTML不得成为程序化旁路；Source purge优先清除依赖片段 |
| copy/download成功 | 只在实际成功后显示已复制，尚未发送或真实下载提示；不声称外部AI收到、文件永久安全或Grant已授权所有材料 |
| 设置读取中 | 未知不先写off/默认，局部不可操作与loading；其他已知组仍能阅读 |
| 设置写入失败 | 原handler失败回滚到真实值，保留可修输入并解释，不用绿色开关假装成功 |
| restore/导出 | 实际检查→预览→确认→执行→结果；无真实总量不填百分比；取消行为按原事务能力说明 |
| 无同步/无配置 | 诚实能力事实，不画一排未来按钮；无Key不妨碍原文或已有AI稿 |

说明默认短句+必要details；权限、删除、未加密、Key寿命、恢复范围、再次计费等重要限制必须在操作现场。危险确认默认Cancel；Esc遇dirty仍遵循原确认，不能靠关闭overlay丢稿。

hover/focus/selected继承SPEC S8，state变化不抢光标。所有重排后的preview继续受既有mask控制，无tooltip/aria-label泄露；明确打开的Reader/Topic正文不被万能隐私模式误遮。light/dark覆盖表单、pre、确认、错误、授权工具，既有对比度/target要求不得降低。200%文字和reduced-motion真实检查，不能以放大PNG替代。

## 6. 实施顺序

1. 固定entry后核对memory.js默认打开MaterialTray的路径，确认legacy Memory是高级兼容入口，不按静态HTML误做第二个首页。
2. 在MaterialTray owner内重排同一个root。保留事件、refs/maps、sourceEpoch、recheck/expiry、modal阈值与focus生命周期；只加presentation hook，不cloneNode复制工作台。
3. 将材料→预览的层级与实际编辑范围说清楚；检查顺序/移除/遮挡/重建和最终输出按钮仍调用原PAIA_CONTEXT_MANUAL/可信服务，不能从DOM重新拼正文。
4. 保留advanced Profile/Passport动作，统一低频入口命名与危险说明；不移动授权判断到UI，不把grant_bound接口换成manual。
5. 依据core-loop.setupSettingsShell与各controller搬动实际控件，形成六组清单；处理动态重排/语言刷新顺序，不追加定时DOM修正器。
6. 统一Backup/恢复/开放导出、真实数据状态、版本/低频工具；严格保留发布构建的diagnostics、filter-advanced、library-organizer-jobs和popup-internal-tools等裁剪锚点或等价transform。
7. 检查01～03全部页面的shared tokens、标题、间距、loading/empty/error、预览遮挡与responsive。只修最终一致性缺陷，不重开产品设计；修复跨页代码后重跑受影响前轮gate。
8. 先focused验证本轮journeys，再冻结最终runtime/test代码运行完整suite、release及既有mandatory CI。最后从同一有效版本补齐最终视觉矩阵并逐图审查。
9. 只有所有要求通过才提交最终报告与STATUS四轮COMPLETE。缺浏览器、CI、合法release或基本可读性即保持04 BLOCKED/IN_PROGRESS；不伪造PASS或宣称后台以后会完成。

## 7. Principal files与修改边界

**允许主文件：** `ui/memory.js`、`ui/material-tray.js`、`ui/reuse.css`、`ui/r6-settings.js`、`ui/r6.css`、`ui/backup.js`、`ui/smart-filter.js`的呈现、`ui/core-loop.js/css`设置分组、`ui/archive.html`相关区域、`ui/product-signals.html/js/css`必要外观、`ui/popup.html/js/css`必要外观、现有页面CSS/ui-refresh.css的最终统一、本目录报告/证据与现有browser locator。

**谨慎：** MaterialTray的sourceEpoch/selection/draft/focus/expiry逻辑只保留或修真实呈现接线；memory/Profile/Passport的handler不改变语义；archive.js/navigation/editor仅为已证明跨页问题最小修复。r6-settings恢复后重投影和mask不能丢。build_daily_use.py仅等价精确marker修补，测试分组/现有workflow仅必要current文件注册或证据上传，不增新CI系统/门槛绕过。

**默认禁止：** core业务写入、ContextPackage/Memory/Passport授权与最终输出算法、Backup格式/restore/tombstone/migrations、background/**、capture/adapter/content、manifest/站点权限、依赖升级、native-hosts代码、根网站、overnight、旧UX执行状态。无新durable state、scope概念、云同步、加密声称、自动Provider、外部Connector或任务系统。

本轮没有新增DTO的预设任务；仅已批准现有字段确实缺UI投影时可按SPEC S9先证明、最小只读调整、补原测试和报告。普通展示错误不是扩大授权或查询范围的理由。

## 8. 测试入口与focused gate

使用当前pinned依赖与现有隔离harness。新环境按计划安装依赖/Chromium；设置真实Chrome路径，Linux需要时用既有xvfb-run。只允许合成Provider fixture，不使用用户profile/凭证/私人库，也不进行真实付费试调。

```sh
cd extension
export PLAYWRIGHT_MODULE=playwright PAIA_HEADLESS=1
node --test --test-concurrency=1 tests/ux-r1-shell.test.mjs tests/ux-r3-thought-binding.test.mjs
node --test --test-concurrency=1 tests/ux-r4-search-reuse-chrome-e2e.test.mjs tests/ux-r6-release-chrome-e2e.test.mjs tests/release-certification-round48-chrome-e2e.test.mjs
node scripts/test.mjs "privacy/security"
npm run check
node scripts/check_development.mjs
npm run build:release
```

R1偏好与R3绑定断言作为设置不改变底层语义的focused护栏；R4复用、R6数据退出、Round48 Passport/跨页面journeys保持原断言。可以更新控件位置/可访问名称/旧视觉常量；不可删once/revoke、manual/Grant分离、exact preview、redaction、stale/purge、restore默认关闭、IME、target/contrast、F-LARGE断言。最终full还必须覆盖既有全部域测试。

优先扩展原current browser文件。新UIR文件必须加入现有current分类与必要的显式CI列表，证明npm test收录，不能落入historical组。修复过程中多跑focused可行，最终没有必要为计数好看在本地反复跑同一全套；现有CI本来要求的重复jobs不删。

## 9. 本轮真实browser journeys

J01 手动复用：未组织Input从Search/Reader加入真实整条与选段 → 换查询/分页/Topic仍保持所选 → 调序、移除、补充说明 → 本机预览；不要求Profile、不增加未来权限、不自动请求Provider。

J02 精确输出：在预览编辑、遮去合成姓名、移除材料 → 返回/重新准备 → 人工改动和排除保留 → 原确认/最终校验 → 复制与Markdown逐字核对（仅原格式约定转换）；不能用旧Memory重拼覆盖当前预览。

J03 stale/blocked/expired：修改源revision、禁止材料、purge、worker重启分别触发原状态 → 输出阻断并解释；旧预览/DOM不能泄露已清除内容；有效用户缓冲不被无关loading抹掉。

J04 抽屉与键盘：宽屏非模态中继续选正文 → 1024/390/320切换，≤600保持modal/inert/focus → 编辑/IME/返回/关闭；同一个材料root、选区/顺序/draft不丢，软键盘不挡输出动作。

J05 设置：六组逐项定位 → 修改字号/宽度/主题/语言/预览mask、暂停/恢复、Smart Filter与恢复显示 → 即时反映、重开保持；注入保存失败回滚；已暂停不被打开设置重新启用；preview mask不是加密。

J06 Backup/数据退出：隔离fixture创建Backup、完整JSON/MD与scoped Source export并核对格式/范围 → 损坏文件/非空库恢复拒绝 → 独立空测试库校验预览确认恢复 → 偏好立即重投影，externalAccess和reverse write为false、无Grant/Key复活；不清空任何真实用户库。

J07 高级权限：由现有入口打开本机工具 → existing Grant的once/expiry/revoke等原journey → local-only/外部访问关闭仍阻止受控外发但不剥夺合法本机手动导出；不能通过新版manual按钮释放Grant包。无真实Connector时没有已连接状态。

J08 release整链：加载最终work/current-release，capture/Archive→Search→Reader→Thought/已有AI稿→本次材料→预览/导出→Settings/Backup路径能走通；发布裁剪仍有效、0意外外网。测试源扩展不替代此产物smoke。

## 10. 最终完整gate（必须执行，不是建议）

最终代码冻结后，确认无shard且使用当前源码，运行：

```sh
cd extension
export PLAYWRIGHT_MODULE=playwright PAIA_HEADLESS=1
unset PAIA_TEST_SHARD
npm run check
node scripts/check_development.mjs
npm run build:release
npm test
```

记录实际环境、exit、unit/browser/adapter/privacy数量，检查 `work/test-summary.json` 的fullSuite=true、auditPassed=true、0 fail/0 skipped及source digest未变化。不能把旧1088写成目标固定数字或复制旧receipt。当前npm test包含完整current browser时本地可复用这一结果；既有CI要求的独立browser/full/native jobs原样保留。76份historical browser证据单独说明，不混称PASS或把新失败移入其组。

在本分支使用现有 `.github/workflows/paia-certification.yml` 的workflow_dispatch，或已存在且对应最终代码的普通PR认证。**不为认证建立新control/carrier/frozen-base分支，不用PR#28，不merge。** 现有Unit shards、Adapter/privacy、Current Browser、Full Suite、release、macOS Secure Store、aggregate等所有mandatory jobs必须实际success；最终报告记录run ID、实际tested SHA及其与分支代码的一致关系。若测试之后又改runtime/tests，先重跑受影响gate，最终full/CI必须覆盖最终代码，docs-only后续提交可明确说明运行代码等值。

无法dispatch/读取CI或浏览器环境缺失时保留完整已完成内容和证据，写04 BLOCKED及具体缺口，不宣称总体验收完成；不新增模拟认证替代现有门槛。

## 11. 最终截图矩阵与逐图人工检查

不是每轮全矩阵，本轮按SPEC S11统一关闭。截图必须来自最终真实extension、worker和合成IndexedDB；复用仍与最终代码等值的图时说明等值证据，若布局改变则重拍。

| 尺寸/模式 | 必须覆盖的页面/状态 |
|---|---|
| 1440×900 light/dark | Archive、Input Reader、Thought首页、Topic Original、Topic Organized、Context预览、Settings数据与隐私关键区 |
| 1024×768 light/dark | Archive/侧栏收合、Topic Organized与candidate比较、Settings分组 |
| 390×844和320×720，各light/dark | Reader编辑、Topic/AI状态、Context材料或预览、Settings数据操作；按钮与文字完整可达 |
| 200%真实文字 | Reader及Context/Settings至少一条完整任务，检查computed字体与可操作性；不是deviceScaleFactor或PNG放大 |
| Keyboard/focus | skip/nav→search→结果→Reader→更多/模态→返回；candidate选择/保存；移动更多，保留关键焦点图 |
| Reduced motion/中文IME | 实际行为与记录，无需把无动画状态凑成许多重复图；composition不被重排打断 |

最少本轮主页面desktop before/after及after dark，至少一个主after为当前release。原测试已有的更大矩阵不得为省事删除，允许复用输出避免重复拍摄。代表性图进入 `../evidence/UIR-04/`；其余图可为真实可访问artifact，记录有效期与版本，不能只有未知本机路径。

每张图实际打开；VISUAL_REVIEW.md记录：唯一h1、首屏主任务/信息密度、工作区与正文宽度、空区/重复控制、长标题/长错误、表单与选择层级、dark残留、焦点/遮挡、隐私预览、有效旧稿保留。测量页面横溢≤现有2px tolerance、关键触控≥44×44、可见文本维持≥4.5。发现基础问题先修复并重拍，不能标Phase B后仍COMPLETE。

## 12. 完成/不完成与回退

COMPLETE必须同时具备：Context/Settings全部现有能力新入口可追溯、四轮基本视觉一致、focused与最终完整gate通过、真实release整链smoke、最终矩阵/人工检查通过、隐私/保存/输出/恢复未回归、代码/报告/STATUS/证据已推送且远端核验。没有未解决基础视觉或行为阻塞；下一轮为无，等待用户合并决定。

不能完成：只运行focused；仅复制旧CI/截图；没有远端mandatory gate；产品代码测试后又变；把原高级工具藏到不可达；preview复制绕过校验；restore重开权限；修改依赖/schema/Provider来修UI；删除测试或放大timeout；把实际缺陷留到第五轮/Phase B；只有本地未提交成果。

失败优先定位到DOM/handler/样式与原owner，恢复正确入口、焦点、markers或稳定节点，不修改可信授权/正文算法。需要回退用普通revert本轮相关UI提交；不清库、不还原旧schema、不重写共享Git历史。跨页修复重新验证受影响轮次，并使最终证据覆盖修复。

## 13. 报告、提交和用户交接

建议代码提交 `feat(ui): UIR-04 refresh context settings and final presentation`，报告 `UIR_04_REPORT.md`。记录：entry和最终验证代码SHA、各控件旧/新位置与保留结果、所有谨慎/adapter/build/CI接线例外、逐命令exit/pass/fail/skip、完整suite receipt/digest、CI run/tested SHA/各mandatory job、release版本与smoke、合成Provider及意外网络计数、Backup/preview/Grant验证、完整截图索引与逐图检查、修复链及真实限制。

更新STATUS四轮状态、最后完成04、下一轮无/等待用户决定、最后验证与blocker；文档/证据commit须说明与已验证代码关系。推送后重读GitHub HEAD并核对diff只在获准范围。向用户只报本轮结果、最终分支HEAD、验证/限制和等待合并决定，不自动执行发布或新一轮。
