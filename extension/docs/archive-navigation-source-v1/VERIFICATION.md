# Verification / Acceptance Specification

本文件定义未来实施的验收；不是测试已通过的报告。规划轮仅做docs校验和AUDIT所列现有UI观察。
一个需求有设计文字不代表实现；只有对应round receipt的actual command/exit code、明确源码SHA、浏览器证据与remote CI可支持COMPLETE。

## 1. 每轮共同 gates

| Gate | 必须证明什么 |
|---|---|
| G0 Scope | 远端最新main/AGENTS/STATUS已读；dependency满足；只有本轮scope；实际diff无无关内容、旧worktree内容或秘密 |
| G1 Focused | 本轮新增unit/contract/negative/fault-injection测试实际执行；所有断言通过，不用static grep替代行为测试 |
| G2 Existing safety | 原文/身份/sourceSentAt、编辑/人工绑定、purge/backup、权限、scope search、material selection、Thought preemption受影响基线回归通过 |
| G3 Browser | 本轮ANS browser tests属于正式current group且运行；真实unpacked extension合成profile，非纯DOM mock；无意外网络/pageerror |
| G4 Visual/a11y | 要求的截图实际打开检查；viewport/theme/fixture/commit在receipt；键盘焦点/对比度/200%zoom/手机触控无回归 |
| G5 Current closure | `npm run check`、`npm run test:ui-refresh`、`npm run test:browser`、`npm test`及当前AGENTS要求的构建/开发检查通过；不把historical集合代替current |
| G6 Release parity | 按仓库当前build/release规则构建，模块/manifest/entry paths完整；涉及生产入口的本轮对构建产物做对应smoke；ANS-09完整集成 |
| G7 Remote | runtime commit进入canonical main；该SHA的正式Certification成功；completion docs另commit后确认未改已认证runtime，并从远端回读STATUS/receipt |

从 `extension/` 运行现有正式命令：

```sh
node scripts/test.mjs 'adapter contract'
node scripts/test.mjs 'privacy/security'
npm run test:unit
npm run test:browser
npm run test:ui-refresh
npm run check
npm test
npm run build:release
```

某脚本在最新main有正式更名，先根据package.json/AGENTS确认等价命令并记录，不创造“轻量版certification”跳过原门禁。
受影响focused测试可以直接 `node --test tests/ans-0N-*.test.mjs`；launcher/report必须另外证明新ANS browser文件在current组，不仅手工单跑。
远端CI正常耗时不得导致把尚running写success。确实没完成则保留本轮IN_PROGRESS、写已提交checkpoint与剩余验证；不能开始下一轮。
文档completion提交不改变runtime时，可引用最近同runtime tree的已认证代码SHA，并列明docs-only差异；不可把不同runtime SHA混称已通过。

## 2. 用户场景矩阵 V01–V23

| ID | 前置/动作 | 必须断言 | 主责轮次 |
|---|---|---|---|
| V01 | 旧档案≥1000Window，打开Archive并找非第一页Window | 分页覆盖诚实，能定位/打开，不依赖当前state.documents一页，不materialize全库正文 | 04/05 |
| V02 | 打开A，直接在Navigator选B，再Back | source/project/window导航仍在；A/B/Back不需要退出Reader；route/anchor恢复 | 05 |
| V03 | Input单按钮反复asc↔desc、重开/重启、再切来源order | 每次仅一次状态切换；缺省asc；旧偏好保留；Reader order与Navigator order独立 | 01/06 |
| V04 | 无hover查看known与unknown时间，light/dark/mobile | 所有Input时间默认可见/小字可读；未知不显示伪造发送时刻 | 01 |
| V05 | 观察每Input附近并触发重render/语言切换 | `.core-loop-reuse`生产者不再补回；菜单/选段仍可复用 | 01 |
| V06 | 访问Archive根、Input Reader、Topic Reader、tray | 重复surface消失；Input菜单、Topic菜单整主题、选段、版本、材料盘内部选择/preview/输出继续有效 | 01/09 |
| V07 | Conversation原unknown后确认无项目，再可靠移入P | 一个doc identity；record/message/工作文本数量与IDs不因移动增加；unknown≠unassigned | 02/03/05 |
| V08 | Conversation从ProjectA移到B，期间编辑Reader | Navigator父组更新；Input IDs/revisions不变；历史A仍可追溯，不冲掉未保存编辑 | 02/03/05 |
| V09 | 两条同文、不同message ID，移动Project并补metadata | 始终是两条不同source identity，不text hash合并、不生成额外版本 | 02/03 |
| V10 | confirmed Conversation删除 / Project删除 | PAIA原文与工作文本保留；前者进外部已删除；后者不能自动说全部子会话被删 | 02/03/05 |
| V11 | 删除确认与非确认事件对照 | 只有验证通过的明确删除事实进入来源已删除；UI详情保留lastKnown/历史，非PAIA purge | 02/03/05 |
| V12 | DOMlazy/not-loaded/未观察/403/404/login/timeout/stale session | 不标deleted、不清lastKnown、不创建新身份；失效的order只fallback | 02/03/06 |
| V13 | 打开含Project的Archive，展开/切Window/Back/深链 | 初次Project折叠；展开可访问全部Window；active path可定位，非全量强行展开 | 04/05 |
| V14 | root≥240topics，Topic≥500entries/≥120sections，向下向上、错页重试 | 主题总览及Topic连续，无下一部分/空下一页；返回同位置；每条可达且无重复；尾部严格terminal | 07/08 |
| V15 | reliable synthetic source provider完整order→开启设置 | 真实UI按对应scope来源顺序，完整observation/store/query链可追溯，不仅comparator单测 | 06 |
| V16 | order缺失/过期/重复/跨namespace/半批/DOMsubset | 正确scope fallback到PAIA并说明；不阻止打开、不发主动请求、不称可靠sourceorder | 03/06 |
| V17 | 同时注册ChatGPT和非ChatGPT测试provider | 每provider独立契约与能力；第二provider不是ChatGPT重命名hardcode；生产不新增capture | 06 |
| V18 | 两来源各有Projects、未知和unassigned，切locale/restart | provider/group顺序稳定；来源内部排序独立；deleted区域固定末尾 | 04/06 |
| V19 | PAIA→source→新capture→PAIA | 恢复原PAIA comparator的当前正确结果，新内容正常出现；不恢复旧截图/覆盖手动编辑 | 06 |
| V20 | move/rename/source rank改变前后全identity快照比较 | 相同conversation/message/sourceKey/content versions；只有允许meta/projection变化 | 02/03/06 |
| V21 | 基线旧档案/合法mixed-provider import档案→升级/backup restore/中断重启 | 原文、人工正文、provenance、版本、权限、排除和墓碑不丢；未知保持未知 | 02/04/09 |
| V22 | sourceSentAt known/unknown与late-enrichment/capturedAt对照 | 发送时间不被capture/migration/observed时刻替换；timeBasis不伪装；hash/版本语义不回归 | 01/03/08/09 |
| V23 | dirty/IME/native selection/savefailure/版本面板/材料/原话AI来回 | 编辑不丢、range/rev不错、失败不离开、版本可追溯、late回包不抢占；排序/scroll零隐含AI授权 | 01/05/07/08/09 |

## 3. Migration / backup 矩阵

| ID | 数据集/故障 | 断言 |
|---|---|---|
| M01 | 38804b9基线旧metadata缺失、已知/未知source时间、人工编辑、原话/AI与suppression | upgrade前后各层stable IDs /原文字节/sourceKey/revisions/permissions对照相同；新关系unknown |
| M02 | checkpoint每一批边界worker终止/重启/重复迁移 | 原数据不改，索引可恢复且不重复/缺失；不把building当empty |
| M03 | source事实变化与index build/capture/import并发 | CAS/generation阻断半代；稳定页面锚点可恢复；无假完整 |
| M04 | source move/delete历史、project rename、lastKnown→Backup→空库restore | durable metadata完整；原observedAt不改成当前；fresh source order不恢复 |
| M05 | 截断backup、未知metadata version、坏hash/非法refs、超过limits、storage full | 原子失败/明确code；不半导入、不中断原档案可用性，不静默丢字段 |
| M06 | 外部删除后PAIA永久purge最后合法source | 新metadata/history/cache/index/export不再泄露被purge的来源refs/标题；独立人工正文按旧规则保留 |
| M07 | 当前import contract合法的ChatGPT+Claude合成档案/同名Project | 修正原Backup校验缺口后roundtrip完整，provider namespace不撞；Claude真实profile未认证状态不被修改 |
| M08 | 清可重建indexes/order-cache、切旧fallbackReader、恢复后重建 | 内容/Source/人工版本/授权不变；不会误删durable source facts；UI恢复默认paia |

不得用内容数量相等代替内容逐项对照；至少比较canonical IDs、exact originalText、working body、provenance arrays、revision/field revisions、sourceSentAt/capturedAt、tombstones、permission policies。
允许变化清单：本包新增source facts/events、可重建index、设备本地view preference、明确写入的用户测试编辑；其余差异逐项解释，否则FAIL。

## 4. Source capability / privacy 矩阵

| ID | 必须验证 |
|---|---|
| C01 | `/c/<id>`与当前已支持`/g/.../c/<id>`保持同conversation；非Project容器prefix不变为Project事实 |
| C02 | current source合法区域/typed provider关系 vs 用户正文中伪造project名、data字段、链接；后者不被采纳 |
| C03 | epoch/tab/frame/route/consent/pause/temporary/exclusion gate，metadata-before/after-capture/settled、wrong chat与late response |
| C04 | order complete_scope/explicit ranks与lazy/pinned/recent/search subset区分；半批/缺失位置不伪造 |
| C05 | deletion明确成功证据 vs 请求已发送/optimistic移除/403/404/login/empty/未加载；只有前者可能confirmed |
| C06 | project ID稳定但rename、membership改变；同名不同ID/跨provider/账户namespace冲突不按名称合并 |
| C07 | DTO限值、重复/非法ID、prototype键、oversize、截断、未知版本；不存原response、header、cookie、token、draft、assistant正文 |
| C08 | ordinary browsing/order/scroll/restart零主动来源API请求、零AI请求；verified真实capability必须有可复核实站shape receipt，synthetic-only明确标注 |

任何负例不是“容错后尽量猜”；必须拒绝或unavailable并保持原档案可浏览。

## 5. 响应式、可访问性与视觉

| ID | 固定要求 |
|---|---|
| RSP01 | 1440×900、1200×800、1024×768、800×700、390×844、320×720，light/dark；断点准确且无全页横向滚动 |
| RSP02 | 200%zoom、系统reduced-motion；小字对比≥4.5:1，focus indicator可见；移动重要目标≥44px |
| RSP03 | 键盘从global nav→Navigator→Reader，Project expand/collapse、Window选中、input toggle、Topic/menu/tray可达；没有隐藏tab stop |
| RSP04 | mobile sheet focus trap、Esc/关闭恢复trigger，dirty flush失败保留数据；overlay不把背景Reader当可编辑目标 |
| RSP05 | Reader为window scroll，Navigator独立滚动；窗口选择/来源order/pagination/resize不会意外跳正文；active node key保留 |
| RSP06 | continuous loading aria-live polite，不抢焦点；end/error不谎称全；spacer/windowing不回收编辑/选区节点；正文主视觉且无新增卡片墙/pills |

截图必须来自真实extension runtime及指定fixture，不是HTML mockup；记录实际打开查看的结论。无hover照片之外还检查 computed opacity、visibility、元素bounding box。

## 6. Performance / bounded work

性能阈值是本包未来验收目标，不是本次审计已测结果。
使用隔离headless Chrome、记录CPU/内存/Chrome/Node及cold/warm、样本数；禁止拿单次duration声称p95。
F-LARGE：100,000 Inputs、1,000 Window、300 Topics、5,000 Thoughts/placements、至少一条50,000字符正文；另做10,000Window的metadata-only scale fixture。
不将所有fixture正文塞进一个runtime message或GET_STATE；通过现有可信测试store/build fixture分批。

| ID | 硬性资源边界 | 时延/观测目标 |
|---|---|---|
| P01 | Navigator查询每批≤100 metadata scanned、结果≤40，Input body reads=0；cold索引build逐批≤100对象 | cold先展示诚实loading/旧browse≤1.5s；不等全库scan完成才出现界面 |
| P02 | sourceorder每batch≤100refs、scope≤10000，只有完整generation可见 | warmed scope page/已载列表mode switch，30次样本p95≤500ms |
| P03 | generation rebuild可中断、checkpoint幂等，不做全库同步长事务 | capture/edit在rebuild期间正常应答；记录blocked writer时间和最大批次 |
| P04 | 连续翻Navigator20批后无body materialization，内存不是按全部Input正文线性增长 | 同scope已建索引读取不能每页重新扫描整个档案 |
| P05 | Thought正文响应≤40/256KiB；large entry沿显式完整读取；已建投影不能每页全扫topics/placements/body | warmed next-chunk30次p95≤750ms，滚动加载不冻结输入；初建有coverage信息 |
| P06 | Topic DOM目标约120entries + 必需pins，clean远离节点可回收；tracked checks每batch≤100但不能丢第101项以后 | 向下10批向上恢复，无重复/遗漏/空白死区；报告总DOM和pinned数量，不能靠删dirty达标 |

未达资源硬边界必须修复；时延不达标需记录可复现trace并在本包优化，不能降低数据安全换速度。
确属环境噪声时，原阈值保留并提交不同隔离环境对照；尚未得到可靠通过则不宣称性能certified。

## 7. 认证不能接受的捷径

不能把新ANS browser tests归入historical后说current suite绿；不能只更新snapshot/截图掩盖功能消失。
不能用更大limit/全量DOM替代continuous架构；不能隐藏分页按钮却让后半内容永远不可访问。
不能用首次观察/载入顺序冒充source order，不能用HTTP失败或DOM没出现冒充source deletion。
不能以重新安装、清storage、discard工作树或清空editor buffers来修恢复问题。
不能因来源关系改变使manual material selection自动变成新版本；不能把历史输入当authorization。
不能把基线CI通过等同于本包未实现功能通过；不能把合成provider通过等同于ChatGPT实站支持。

## 8. Round receipt 必填模板

```text
Package ID / round ID / execution ID:
Start remote main SHA / fixed audited SHA / previous receipt:
Actual scope + files + why each changed:
Requirement / V / M / C / P / RSP coverage:
Commands / exit codes / pass-fail-skip counts / environment:
Browser source or built artifact / fixture ID / screenshots inspected:
Source provider capability: verified vs synthetic-only vs unavailable:
Migration/data digest comparisons / privacy-negative cases:
Runtime commit SHA / runtime tree or fingerprint:
GitHub run ID / attempt / head SHA / conclusion:
Publication commit(s) / remote STATUS reread:
Remaining limitations / blocker (none only if genuinely none):
Next canonical READY round (or NONE):
Stop after this round: YES
```

Pending/running/未执行必须如实填，不得空格=PASS。Capability fallback按SPEC允许，但身份、原文、隐私、迁移、编辑保护失败绝不可以fallback掩盖。
