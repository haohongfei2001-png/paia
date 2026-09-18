# Development Plan — PAIA-ARCHIVE-NAVIGATION-SOURCE-v1

## 0. 图、执行边界与共同定义

```text
ANS-01 Reader surfaces / order / time / current-suite registration
   ↓
ANS-02 Source relationship / lifecycle / backup / purge foundation
   ↓
ANS-03 Source adapter capability / trusted observation bridge
   ↓
ANS-04 Bounded Archive Navigator query and read projection
   ↓
ANS-05 Three-level Navigator / Reader responsive workspace
   ↓
ANS-06 Source ordering providers / Settings / real UI integration
   ↓
ANS-07 Thought Library root continuous collection
   ↓
ANS-08 Topic continuous Reader / edit-safe windowing
   ↓
ANS-09 Integration / migration / release certification
```

只有依赖完成后下一轮可 READY。虽然部分纯模块技术上可以并行，本包**不安排并行写入**；archive.js、thoughts-base.js、store、test grouping与status有共享owner，串行减少worktree遗漏风险。
上图刻意把metadata/query放在布局前，把Thought root与Topic拆开；不是按旧草图盲目先画界面再补身份和分页。

每轮默认继承 ARCHITECTURE I01–I10、SOURCE_CAPABILITIES 和 VERIFICATION 的共同 G0–G7。不得把“继承”解释为无需执行该轮测试。
文中的 `NEW` 文件是明确计划新增，不是审计认定已经存在；原文件名均以本轮开始main核对。必要内部命名调整须在receipt映射，不得改变设计契约。
每轮需有 `receipts/ANS-0N.md`：基线、actual files、commands/exit codes、计数、截图/日志、runtime commit、CI run/attempt、remote readback、已知限制；这些文件仅在相应实施轮创建。
**只执行当前 canonical READY 或经明确恢复授权的同一 IN_PROGRESS round。完结并远端确认后停止，不在本 execution 进入下一轮。**

## ANS-01 — Reader controls & quiet surfaces

**Scope:** R1/R2/R3/R9，现有Reader/Topic工具条的限域精简；新包测试进入current-browser。
**Non-scope:** Navigator、source metadata、任何schema/migration、Thought连续流、来源排序实现、AI授权或内容绑定变化。
**Dependency:** 规划文档已进入main；本轮是唯一初始READY。

**Expected files/modules**

- `ui/archive.js`, `ui/archive.html`, `ui/core-loop.js`, `ui/ux-r1-shell-coordinator.js`, `ui/reader.css`, `ui/core-loop.css`（必要时其对应现有CSS规则）。
- `ui/thoughts-base.js` 的主题菜单/选择surface；不改Topic分页/编辑机制。
- `ui/capture-time-view.js`、`ui/reader-experience.js` 只为已知时间/锚点接线所需的最小改动，不能重建编辑器。
- `scripts/test-groups.mjs`, `scripts/check-ui-refresh-ci.mjs` 或当前真实CI coverage guard；新ANS命名测试登记为current而非historical，不必改workflow来规避旧门禁。
- NEW `tests/ans-01-reader-surfaces-chrome-e2e.test.mjs`；受删surface影响的真实旧UI测试更新交互入口而不减少能力断言。

**Implementation steps**

1. 在本轮SHA重核三个精确surface和保留入口。移除 `#archive-select-materials` 生产者/布局引用及每Input `.core-loop-reuse` 生产者；清理无效样式，MutationObserver不能重新补回。
2. 把 `selectTopicMaterials` 入口放入既有 `#topic-menu` 的主题操作，删常驻 `#topic-material-select`；整主题材料仍走原确认、200项保护与固定revision逻辑。
3. 替换Input两按钮为单toggle，接已有inputReadingSort setter；保存成功才更新最终状态。打开锚点、显式切换、晚到状态的优先级按ARCH F。
4. 保留输入dirty/IME/selection与anchor；失败取消重排，不部分改变DOM与偏好。
5. 时间默认opacity1、较小字号，sourceSentAt未知文案与capture详情分开；低噪声不是低于可读对比度。
6. 更新旧test locator：通过Input更多/材料盘内部选择继续测试原材料/搜索能力，不能删掉这些journeys。登记ANS current test分类。

**Invariants / migration:** I01/I02/I05/I09；零数据迁移，已有desc偏好不重置、历史Source时间不修改。
**Tests:** 新测试验证精确surface不存在且切语言/切窗口/DOM更新不复活；单toggle asc/desc/重新打开/重启；补时/unknown；保存失败取消toggle；菜单、选段、整主题material、version/source对比继续可用。
**Browser/E2E:** 1440/1024/390/320 light/dark关键截图；键盘/200%zoom；真实扩展fixture同文不同ID；无hover时间computed可见；Topic菜单可达、超200项不静默截断。
**Acceptance gates:** V03/V04/V05/V06/V22/V23；新测试被group()识别为browser E2E且在正式launcher执行；旧材料/搜索/版本/编辑回归不降级。
**Rollback/recovery:** 失败只回退本轮surface，不触碰数据；保存/selection失败是block，不用抹缓冲修复。保持原可信材料服务。
**Documentation:** receipt记录删除/保留surface精确清单与新control semantics；更新STATUS，后续需对齐的旧UX段落记入receipt，不重写旧receipt。
**Completion evidence:** diff、全部G gates、截图已阅、runtime/main SHA与CI、远端complete读取；只将ANS-02置READY后停止。

## ANS-02 — Provenance-safe source structure foundation

**Scope:** R6/R7的关系/历史/状态reducer、可信store、backup/purge/migration保护，为R8读取元数据奠基。
**Non-scope:** 实站提取、Navigator生产UI、source排序Settings、新objectstore/DB version、新Source identity、新抓取provider。
**Dependency:** ANS-01 COMPLETE。

**Expected files/modules**

- NEW `core/source-structure-model.js`, `core/source-structure-store.js`, `core/source-structure-backup.js`。
- `core/indexed-store.js`, `core/idb-repository.js` 的既有writer/metadata/必要事务helper；`core/backup-format.js`, `core/backup-service.js`, `core/open-export.js` 的白名单/引用清理。
- 现有source purge owner/hooks（从 `beforeSourcePurge` 实际调用链定位），`core/import/contract.js` 的合法provider规则仅供验证复用。
- NEW `tests/ans-02-source-structure.test.mjs`, `tests/ans-02-source-backup.test.mjs`, `tests/ans-02-source-foundation-chrome-e2e.test.mjs`。

**Implementation steps**

1. 固定ARCH B行schema/key/validator；新增字段的真值层、权限、删除、backup、迁移、复杂度六问逐条确认。不改sourceKey/chatOf/document identity。
2. 实现 pure reducer：unknown/unassigned/project，active/confirmed_deleted、rename/move/reappear、重复与陈旧事件；来源Project删除不传播成子Conversation删除。
3. 通过既有store writer/CAS提交current row + append history；metadata不能抢先创建不存在的Conversation，前后内容hash/revision完全一致。
4. 接入实际PAIA purge：最后合法来源被删时新metadata/history/index都不泄露已清除的标题/refs；普通远端删除零purge操作。
5. 同轮完成strict backup/open-export/restore：仅durable facts往返、unknown version拒绝、restored非fresh、order与UI/cache不备份；损坏/中断事务原子。
6. **必要兼容修正：**基线import contract接受ChatGPT/Claude，但Backup sources校验仅ChatGPT。复用现有合法provider/URL/identity约束，最小修正这些已可进入档案的数据的backup/restore验证；不增加新provider、不重算旧ID，不把Claude synthetic profile标为real-export certified。合法混合档案不能因本包metadata丢失。
7. 旧档案默认unknown、metadata懒初始化；没有Project证据不全库推断；导入带此metadata时validate而非信任任意原文件字段。

**Invariants / migration:** I01–I07；仅新增meta语义，零正文迁移；合法旧backup可读；多来源existing accepted archive可往返；PAIA墓碑/人工改写优先。
**Tests:** property生成none→A→B→none；同名不同ID/跨provider/命名空间冲突；重复观察不刷历史；wrong CAS/late generation/quota/事务abort；message同文不同ID不并；Project delete≠children delete；purge后backup无残留；source metadata和mixed合法provider恢复。
**Browser/E2E:** 隔离扩展中经受控测试夹具注入既有store事实，编辑Input后move/delete/restart/backup restore；Reader源记录/版本仍可读；不开放生产UI任意observation写入口用于测试。
**Acceptance gates:** V07–V12/V20–V23的数据层断言；M01–M08；任何正文、权限或identity意外变化即FAIL。
**Rollback/recovery:** 不删除durable history；坏索引可重建，坏metadata写入暂停但原档案可读；backup恢复失败保留原空库/原事务边界，不能清用户库重试。
**Documentation:** schema六问/backup兼容覆盖/最大批次、reducer transitions和known provider limits写receipt；任何不可兼容的format选择必须先修canonical design而非静默改格式。
**Completion evidence:** lossless digest对照、fault injection结果、mixed-provider合成restore证据、G gates和remote checkpoint；ANS-03 READY后停止。

## ANS-03 — Source capability & trusted observation integration

**Scope:** R6/R7来源adapter能力、来源structure DTO admission、被动metadata reconciliation；为R8提取排序证据的能力描述。
**Non-scope:** 主动抓全账户、新权限/域、真实用户删除/移动操作、UI布局/设置、未经证据的Project接口硬编码。
**Dependency:** ANS-02 COMPLETE。

**Expected files/modules**

- NEW `adapter/source-structure-contract.js`, `adapter/chatgpt-source-structure.js`（生产能力逐项可unavailable）。
- `adapter/chatgpt-adapter.js`, `content/response-observer.js`, `content/response-bridge.js`, `background/service-worker.js`，现有capture入口所需的最小接线。
- `manifest.json`仅必要模块加载登记，禁止新增权限、host或match域。
- NEW `tests/ans-03-source-contract.test.mjs`, `tests/ans-03-source-privacy.test.mjs`, `tests/ans-03-source-observation-chrome-e2e.test.mjs`；合成fixture置既有test fixture目录。

**Implementation steps**

1. 按SOURCE_CAPABILITIES第3节执行逐能力审核；没有安全实站目标则明确记录，不读用户profile/凭据。
2. 仅对经实站结构验证的能力启用production parser；其余显式unverified→unavailable；synthetic provider与真实adapter路径分清，不用test开关默认生产true。
3. 新structure DTO分开旧time DTO，复用当前consent/epoch/tab/chat/route/临时聊天/exclusion边界；合成跨tab、wrong route、false `/g`Project、正文project文本都拒绝。
4. 接通metadata-before-DOM / DOM-before-metadata / settled-after-capture；无已有会话就有界暂存或丢弃，不造空Source；page navigation清理旧session待处理。
5. order候选仅生成带scope/completeness证据的无正文快照，尚不改变UI顺序；缺字段和截断/虚拟list不可available。
6. 单独metadata event，不广播造成原文刷新/材料stale的假ARCHIVE_CHANGED；故意source变化与真实正文变化同时发生时仍由原内容通道处理后者。

**Invariants / migration:** I01–I09；无正文/identity迁移；metadata出现只enrich真实存在的来源refs。
**Tests:** exhaustive typedpositive/negative fixtures；malformed/truncated/oversize/poisonkeys；403/404/auth/error≠delete；complete order与DOMpartial区别；时序、暂停、worker重启、late event；不取assistant/drafts/tokens。
**Browser/E2E:** 合成ChatGPT none/A/B/rename/delete/reappear与ChatGPT真实shape适配的browser证据分开；统计零扩展主动来源请求，关闭capture后metadata不入库，same-textdifferent-ID保持。
**Acceptance gates:** V07–V12/V20/V22，C01–C08；每个production verified能力有receipt；不能凭虚构endpoint过关。全部实站能力不可用时允许诚实fallback完成本轮通用管线，但receipt必须显眼声明。
**Rollback/recovery:** disable受影响capability时保持原capture/time工作；拒绝新metadata不删除旧last-known；不能绕过验证器修时序。
**Documentation:** receipt包括capability表、contract版本、脱敏方式、实站是否观察、未认证原因；同步SOURCE_CAPABILITIES的as-of事实，保留起点AUDIT。
**Completion evidence:** contract与privacy测试、real/synthetic分列、G gates/remote checkpoint；ANS-04 READY后停止。

## ANS-04 — Bounded Navigator read model

**Scope:** R4/R6/R7的可扩展Navigator projection与读取；R8共用scope/comparator基础。
**Non-scope:** 生产三列CSS/导航UI、source preference、Thought连续渲染、读正文新接口。
**Dependency:** ANS-03 COMPLETE。

**Expected files/modules**

- NEW `core/archive-navigation-index.js`, `core/archive-navigation-query.js`, `core/read-projection-keys.js`。
- `core/idb-repository.js`必要primary-key range helper；源数据变化的现有store/import/time/purge hook；`background/service-worker.js`只读query注册。
- NEW `tests/ans-04-navigation-query.test.mjs`, `tests/ans-04-navigation-migration.test.mjs`, `tests/ans-04-navigation-query-chrome-e2e.test.mjs`。

**Implementation steps**

1. 实现ARCH D确定的source/group/window descriptor、stable comparator、selectedPath、scope-bound cursor、coverage/generation；unknown与unassigned不混。
2. 从documents按100行分批构建body-free索引；准确报告building/complete，原GET_PAGE继续可用。使用可恢复checkpoint，不长事务锁全库。
3. 接入capture/import/sourceTime/document title/exclusion/remove/restore/structure/purge/backup的durable invalidation；不是靠某个打开UI的observer碰巧刷新。
4. shadow generation完成后原子切换；旧cursor明确invalid，按selected stable ref恢复；不让部分索引页成为“全部窗口”。
5. group列表和group内窗口都40条/页内部游标；多来源固定组合，archive unknown provider合法显示，无授权读取隐藏正文。
6. 生产读端必须用有界query；状态/currentSelected查询不materialize全庫。准备后续Navigatorcontroller的descriptor contract。

**Invariants / migration:** I01–I04/I07/I08；只有可重建索引迁移，清索引不清数据。已有userTitle优先。
**Tests:** 1000/10000window pagination完整去重、相同time tie-break、中文/emoji同名Projects、empty scan pages、partial rebuild、断电重启、concurrent capture/move、wrong generationcursor、removed和detached可见性；全查body读取数=0。
**Browser/E2E:** 从真实扩展worker query整份fixture而非GET_STATE；选定Window在冷索引/重启/关系变更后可重新定位；原Reader仍工作。
**Acceptance gates:** V01/V07–V13/V18/V20/V21，P01–P04；每次扫描≤100源对象；无all-record/全正文snapshot。
**Rollback/recovery:** scope index无效则旧Archive浏览/fallback；可重建指定index prefix，保留durable source facts与selection。
**Documentation:** query shape/真实primaryrange实现、索引coverage/恢复指标写receipt；记录actual changed hooks。
**Completion evidence:** query coverage与operation counts、rebuild故障注入、G gates/remote checkpoint；ANS-05 READY后停止。

## ANS-05 — Persistent Archive Navigator & responsive workspace

**Scope:** R4及R6/R7的生产导航UI，三层结构、source/project/current/deleted投影、跨窗口与来源详情。
**Non-scope:** R8设置/来源order启用、Thought连续化、正文Editor/路由重新实现、AI权限改变。
**Dependency:** ANS-04 COMPLETE。

**Expected files/modules**

- NEW `ui/archive-navigator.js`, `ui/archive-navigator.css`。
- `ui/archive.js`, `ui/archive.html`, `ui/ux-r1-shell-coordinator.js`, `ui/core-loop.js` 的frame整合；`ui/core-loop.css`, `ui/ui-refresh.css` 必要scope规则。
- `ui/reader-navigation.js`、`ui/reader-experience.js` 仅state/anchor接线；现有来源详情/版本dialog renderer。
- NEW `tests/ans-05-navigator-workspace-chrome-e2e.test.mjs` 和 `tests/ans-05-navigator-state.test.mjs`。

**Implementation steps**

1. 用一个controller消费ANS-04query；root为宽版Navigator，open Window收敛侧栏，active Window保留；保留root继续/最近/本机变化，不变成新dashboard。
2. 按ARCH E落实≥1200/800–1199/<800精确布局；保留Reader window scroll；mobile窗口sheet有focus trap、close、Esc、safe-area。
3. Source→Project→Window是projection；Project初次折叠；深链打开选中父Project，unknown/未归属有各自合理位置。
4. 所有Window切换进入原leave/navigate，处理dirty/composing/flush失败/并发；导航render不会替换Reader contenteditable。
5. source move/rename更新被选node路径；source deleted区只接受confirmed，Project deleted不推导chat deleted；详情展示last-known和观察历史。
6. scope内增量加载对用户无“只看了第一页”的假完整；键盘访问未加载项有加载反馈；搜索/Back/Forward/Material tray/Source详情returnTo保持。
7. 测试标题栏/popup/dialog stacking，不靠绝对定位把窗侧栏压到正文上；200%zoom按实际viewport自适应。

**Invariants / migration:** I01–I09；没有正文迁移；Navigator展开/scroll为session状态，不备份或写入Source。
**Tests:** currentpath、same-URLhistory、root恢复、WindowA→B→Back、移动后activeID相同、deleted未知不误分组、sublist分页覆盖、mobile关sheet不离开doc。
**Browser/E2E:** 桌面/窄桌面/手机真实交互与截图；dirty+IME+selection+save-failure分别跨Window/断点；Source/版本/材料panel在新布局仍可用；新增metadata event不抢占Reader/Thought。
**Acceptance gates:** V01/V02/V07–V13/V23，responsive/a11y RSP01–RSP06；正文始终主视觉、无第四窄列或demo卡墙。
**Rollback/recovery:** 可回旧frame但保留ANS-04query/source metadata；不能用reset/新tab丢当前未保存内容作为修复。
**Documentation:** 实际截图路径/viewport/人工检查结论、navigation state delta和低频panel行为写receipt。
**Completion evidence:** 选Window无退出Reader、4个断点、保存失败可恢复、G gates/remote checkpoint；ANS-06 READY后停止。

## ANS-06 — Follow source order module & Settings

**Scope:** R8完整模块与生产消费者，不是预留接口；补齐跨provider/group/source fallback状态。
**Non-scope:** 新capture provider/主动取order、改变Source identity/正文、复杂排序配置/手工Project拖拽、Input sort偏好合并。
**Dependency:** ANS-05 COMPLETE。

**Expected files/modules**

- NEW `core/source-ordering.js`, `ui/archive-order-settings.js`；provider registry及由ANS-03提供的source结构order证据。
- `core/archive-navigation-index.js`, `core/archive-navigation-query.js`, `core/source-structure-store.js` 的分代rank/cache读取。
- `ui/archive-navigator.js`, `ui/core-loop.js`, `ui/archive.html` 的现有reading settings接线；trusted worker preference/orderstatus入口。
- NEW `tests/ans-06-source-ordering.test.mjs`, `tests/ans-06-source-order-settings-chrome-e2e.test.mjs`。

**Implementation steps**

1. 实现ARCH D3真实provider接口、available/unavailable、project/window分别可用、complete scope/proven rank验证；没有可靠来源顺序的ChatGPT必须明确unavailable。
2. 注册非ChatGPT合成provider于测试注入边界，证明通用registry不是if(chatgpt)散落UI；生产不增加新capture来源。
3. source snapshot按scope/generation分批校验后启用；部分batch不生效；缺rank archive对象PAIA尾随，固定provider/group/deleted规则不被来源rank跨scope穿透。
4. settings已有阅读与外观组增加一项select；独立ans:ui:v1、默认paia、重启本机保留；写失败回滚。
5. fallback给明确信息但不打断浏览；未知/stale/超限/namespace冲突都可正常打开Window；没有自动网络补查。
6. 当前focus/pointer/menu期间冻结可见排列，按ARCH D4原子应用；切回PAIA恢复当前原comparator而非旧截图。
7. source order变化只改projection，编辑版本/原文/材料selection/Reader ascdesc不变。

**Invariants / migration:** I01/I02/I05–I09；不迁移正文，local顺序偏好不等于Input顺序；order缓存不backup。
**Tests:** 各scope可靠rank、无序partial DOM拒绝、重复ID/跨scope混入拒绝、TTL/clockrollback/futuretime、partialcoverage尾随、不同provider稳定组合、mode反复切换、权限关闭/重启/unavailable。
**Browser/E2E:** 从可信source observation到metadata到Navigator设置正例完整链；ChatGPT真实provider能力状态如实显示；可靠合成provider可产生正确来源顺序；后台rank更新过程中正在点击不点错窗口。
**Acceptance gates:** V15–V20、V03独立性、P02，真UI+持久化+故障恢复全部通过；不得仅写comparator测试就COMPLETE。
**Rollback/recovery:** 失效scope切PAIA，保留source preference与last-knownmetadata；不清用户档案、不自动重开网络。
**Documentation:** receipt列各provider能力/顺序availability及fallback覆盖；SOURCE_CAPABILITIES只更新实际验证事实。
**Completion evidence:** source/PAIA前后稳定ID和digest对照、Settings重启证据、G gates/remote checkpoint；ANS-07 READY后停止。

## ANS-07 — Thought Library continuous root

**Scope:** R5主题总览、总览搜索/unplaced列表的连续流与有界root查询。
**Non-scope:** Topic正文windowing、AI自动生成、改变stable root排序/主题真值、Navigator重设计。
**Dependency:** ANS-06 COMPLETE。

**Expected files/modules**

- NEW `ui/continuous-collection.js`, `core/thought-read-index.js`（root部分，复用ANS-04key/checkpoint模式）。
- `core/library-documents-store.js` rootindex/page部分、当前root查询owner；`ui/thoughts-base.js`, `ui/library-state.js`, `ui/archive.html`, `ui/thought-reader.css`必要root/sentinel规则。
- NEW `tests/ans-07-library-continuous.test.mjs`, `tests/ans-07-library-root-chrome-e2e.test.mjs`。

**Implementation steps**

1. 替换stable root每页全读topics路径为body-free、逐批可重建index；保留createdAt/id语义、生命周期/合并redirect/权限可见性。
2. 连续collection state绑定scope/query/generation，topic ID去重；sentinel累积有效结果，empty+nextCursor不误结束。
3. 移除thought-more翻下一部分逻辑；错误保留已看列表、局部重试；末尾无可点击空下一页。
4. root搜索和unplaced使用同一有界连续状态策略，保留原搜索范围与引用结果；query变更取消旧generation，但旧响应不能覆写新查询。
5. 主题grid/list切换不丢当前key/scroll；打开Topic与Back回来恢复原位置/展开，而不是总回最上面。
6. root不得重新引入最近阅读卡/AI view selector或重复一级search；不会因scroll触发AI。

**Invariants / migration:** I02/I05–I09；只读投影可重建，不迁移主题/entry正文；人工summary/tag不被索引覆盖。
**Tests:** 0/1/40/41/400topics、空中间page、queryrace/cursorinvalidate、merge/delete/rename后stablekey、独立思想列表覆盖、重启/恢复builder；不每page全读topics。
**Browser/E2E:** 连续滚过至少6批、返回/向上滚/键盘加载、搜索匹配在非首批、无下一页文案和空尾页；root打开主题返回同key；AI网络计数零。
**Acceptance gates:** V14的root部分、V23、P05/RSP；visible完整性计数需基于terminalcoverage，不把当前已加载数称总数。
**Rollback/recovery:** 保持旧domain可读；失效rootindex可重建；loading/error不清已有主题；不靠把总limit改成100000解决连续。
**Documentation:** receipt记录root读取操作数、末尾与空中间page测试、截图/scroll恢复；给ANS-08留下明确controller contract。
**Completion evidence:** rootcontinuous用户journey和操作数证据、G gates/remote checkpoint；ANS-08 READY后停止。

## ANS-08 — Continuous Topic Reader, edit-safe

**Scope:** R5 Topic原话连续文档、章节连续查询、双向windowing；保留AI/原话会话和所有编辑/材料/版本机制。
**Non-scope:** 改写Thought/Input ownership、去掉章节实体、AI自动重生成、材料限额放宽、把所有主题正文强拼一页。
**Dependency:** ANS-07 COMPLETE。

**Expected files/modules**

- NEW `ui/continuous-topic-reader.js`；ANS-07 `core/thought-read-index.js` 扩展topic descriptor投影。
- `core/organizer/topic-reading.js`, `core/organizer/store.js`, `core/library-documents-store.js`相关读路径；相关entry/time/placement invalidation hooks。
- `ui/thoughts-base.js`, `ui/thoughts.js`, `ui/library-state.js`, `ui/archive.html`, `ui/thought-reader.css`；原Autosave/Revision/TopicAIViewSession优先复用，改动须逐处说明。
- NEW `tests/ans-08-topic-projection.test.mjs`, `tests/ans-08-topic-continuous-chrome-e2e.test.mjs`, `tests/ans-08-topic-edit-preservation-chrome-e2e.test.mjs`。

**Implementation steps**

1. 用body-free generation index替换每页全扫Topic descriptors的路径；保留现有section/timeBasis/entryId的排序语义，引用正文仍走原可读entry resolver与安全校验。
2. 连接continuous-topic adapter；删除分页next/previous/resetScroll逻辑，保留正常章节outline与结构编辑；超100章节可连续取得而非空页。
3. 基于stablekey累积并双向物化、measured spacer，目标3×40chunk；pins保护dirty/IME/selection/focus/openrefs，clean离屏才dispose。
4. 全部active editor revisions分批检查，不slice掉第101项后的dirty；支持并发更新、source purge、permissions revoked，依据原服务明确fail而不是渲染旧body。
5. restore/Back/source return、排序/搜索/resize按stablecontentanchor恢复，generation冲突安全重新seek；旧请求、route revisit、THOUGHT_POSITION晚到不抢占新页面。
6. section adjacency动作调用domain query，不用挂载DOM首尾判定“已经最上/最下”；wholeTopic export/material仍走完整domain，不是只选目前DOM中的材料。
7. 原话与已缓存AI稿各自位置/搜索状态保持；切换不发API；AI人工编辑/held draft/repair路径不丢失。AI稿可局部windowing仅在同样保护下，禁止本轮另写AI truth。

**Invariants / migration:** I01/I02/I05–I09；无body迁移；所有revision/binding/permission在windowing前后相同。
**Tests:** 多批>500entries/跨100sections；source unknown/timeBasis显示不假；large entry+emoji/newline；live generation invalidation；>100编辑检查分批；跨chunkselection/IME/保存失败/purge中读/undo；firstseen与lastseen无重复/遗漏。
**Browser/E2E:** 向下10批向上回首、middle deep link、排序翻转保持anchor、主题返回恢复、route换后晚到响应、source/history/material被打开时不回收；默认one-way与显式reverseEdit的既有套件都继续通过。
**Acceptance gates:** V14完整、V22/V23、P05/P06；原话/AI历史抢占回归明确包含基线恢复的测试；DOM目标有pin例外记录而非删除用户未保存内容。
**Rollback/recovery:** 先停新物化保留edit registry，不能replaceChildren清空缓冲；index损坏重建，与domain内容隔离；后备可读路径不能露分页死角或假装最终完成。
**Documentation:** receipt列windowing/pin策略、视口内/外数量、原话AI双会话anchor测试、实际读成本和全部未通过项（未通过则不COMPLETE）。
**Completion evidence:** edited text/revisions/Source digest的前后证据、视窗回收观测、G gates/remote checkpoint；ANS-09 READY后停止。

## ANS-09 — Integration, migration & final certification

**Scope:** R1–R9集成、现有档案迁移/restore、真实provider覆盖陈述、性能/可访问性/发布包与文档对齐。
**Non-scope:** 新功能、新provider捕获、补做未授权AI/同步/品牌、删除旧worktrees、把未验证能力改成verified。
**Dependency:** ANS-08 COMPLETE且前八轮receipt均在main可读。

**Expected files/modules**

- NEW `tests/ans-09-integration-chrome-e2e.test.mjs`, `tests/ans-09-migration.test.mjs`；本包tests/fixtures和current-suite coverage guard。
- 本包真实范围内的集成bug修复，逐项映射V/M/C/P ID；不能改认证阈值隐藏失败。
- `PRODUCT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, 当前UX对应章节、`AGENTS.md` package completion路由说明及本包docs/receipts。
- 按已有release/checker规则更新必要release文档/manifest版本，不能私改许可、host、产品scope；历史Capture/UIS/UX receipt不覆写。

**Implementation steps**

1. 从全新profile装基线旧档案/旧Backup，升级候选版；比较各层content/IDs/revisions/permissions/digests；移动/删除元数据变更只能改变本包允许的meta。
2. 完整跑VERIFICATION 23用户场景以及8迁移、8来源能力、性能响应式；发现缺口回本包实际owner修复，不删除失败断言。
3. 当前源码→构建release→同等关键journey smoke；确认build manifest/modules可加载，无“源码可跑、发布漏新模块”。
4. 真实capability按receipt汇总；production verified仅有真实结构证据的能力，其他说明fallback；模块完成与来源覆盖分别报告。
5. 全量npm test、check、test:ui-refresh、current browser、build等G gates；远端对应runtimeSHA PAIA Certification全套成功后才封口。
6. 定点对齐产品/架构/UX文档：three-layer projection、外部source delete、局部排序设置、常显time、Thoughtcontinuous、保留的reuse和原话/AI语义。
7. STATUS所有轮次COMPLETE、current_round=NONE；记录final runtimeSHA、remote CI和finalreceipt。完成远端回读后停止。

**Invariants / migration:** I01–I10全检查；多来源现有合法档案包括合成Claude能lossless往返，但不把Claude真实export未认证状态涂掉。
**Tests / Browser:** 全部VERIFICATION矩阵、实际package browser、multi-tab/restart/permission/source purge/unsaved-edit故障注入；新浏览器tests必须属于current suite。
**Acceptance gates:** 无遗漏V01–V23；M/C/P/RSP和G全部有明确结果；无未解释runtimechanged、silent corruption、fake source order/deletion或隐私扩张。
**Rollback/recovery:** release fail不标complete，保留IN_PROGRESS/BLOCKED及可恢复checkpoint；任何回退不得丢sourcehistory/人工内容；不得reset旧worktree以“清洁发布”。
**Documentation:** 完整最终receipt、requirements→files→tests矩阵、provider coverage、migration兼容与受控fallback、正式release/recovery notes。
**Completion evidence:** runtime源码与releasehash、当前main CI、远端STATUS、finaldiff和已读截图；不再产生ANS-10或下一自动execution。

## 10. Round-level 文件冲突与重估

| 共享owner | 允许修改轮次 | 控制 |
|---|---|---|
| archive.js / shell / CSS | 01,05,06及09必要修复 | 串行；新Navigator独立模块；不同时在旧UI worktree开发 |
| source/store/backup/purge | 02,03,04,06及09必要修复 | source DTO、writer、index分模块；每次重新读最新main和前receipt |
| thoughts-base.js / thoughts.js | 01仅菜单，07根页，08正文，09修复 | 菜单与分页分scope；保留preemption patch |
| STATUS / receipt | 每轮 | 同一execution单作者；远端ff发布；不设并行队列 |
| test grouping / guards | 01登记，后续加本轮测试，09封口 | 新测试必须current；不得把失败测试挪historical |

若实际最新main使一个round不可独立完成，可保持同一round IN_PROGRESS由下一用户消息恢复；不得私自新开另一轮或改编号逃过acceptance。
