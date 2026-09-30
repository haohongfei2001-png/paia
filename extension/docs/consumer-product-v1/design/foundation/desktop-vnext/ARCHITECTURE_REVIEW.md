# Desktop vNext Architecture Review

状态：PROPOSED / OWNER_APPROVAL_PENDING。事实基线和源码定位见 [REVIEW_EVIDENCE](REVIEW_EVIDENCE.md)，逐项覆盖见 [TRACEABILITY](TRACEABILITY.md)。这是 implementation architecture，不是新产品设计或运行认证。

## 1. 审查结论与硬边界

保留 MV3 extension、原生 ES modules 和当前 build/release 路径；按已冻结的 surface 逐步替换 presentation orchestration。采用显式 mount/update/dispose 的组件和 page controller，不引入全框架迁移。每个 action、route、可编辑 body 和 effect 各有唯一 owner。继续使用 worker 验证/dispatch → 现有 domain service → canonical storage 的路径。

主要可复用资产是 Source/Working 分离、Editor primitives、revision/operation receipts、Topic binding/placement、bounded navigation/read indexes、candidate CAS、ManualContext manifest/release、Passport、purge/recovery fences、Backup/import。主要需替换的是 `archive.js` 的页面级 DOM/事件混合职责，`core-loop`/shell chrome/UX coordinator 的重排与 observer，以及 MaterialTray drawer presentation。领域保护不能随这些 UI 删除。

已确认的实现缺口包括：Conversation Original/Remove 的明确全范围接口；operation acknowledgement 查询；可靠 expression-year coverage；first-generation candidate stage；generation scope 的精确确认；Context 编译、确认、输出编辑和 stale reconcile 的独立边界。它们是 D，不能通过 UI 假成功解决。

不会添加第二份 Source、Working Input、Thought、AI 或 Context body truth。暂态 UI draft/DTO、现有 recovery draft、现有 AI candidate/revision 是已有职责内的状态，不成为新的 canonical body/database。路由、navigation history、year descriptors、review decisions、operation 查询结果只保存引用和元数据。现有 AI presentation 保持既有 derived owner；新 UI 不另建 AI 文档库。

当前 lexical/fuzzy/filter 是稳定 Search；实验 semantic 不进入检索或 Context。当前没有真实通用 AI connector；Context Release 只有用户主动 Copy/Export。新 permission/provider、reply reading、remote upload、paid service、cloud authority、sync、destructive policy 均不在 D1～D4。

## 2. 当前 main 的具体发现

| 事实 | 实际位置 | 架构结果 |
|---|---|---|
| route 已经集中，但保存状态仍分散在页面 controller | `ui/app-shell-state.js:appShellRoute`；`ui/reader-navigation.js:installReaderNavigation`；`ui/archive.js:navigate/leave/routeStates/documentSearchStates` | 扩展同一个 route owner；不能另建 router 与旧 popstate 同时运行 |
| 多个脚本修改同一 shell/settings DOM 并观察 hidden/lang | `ui/core-loop.js:setupShell/setupSettingsShell`；`ui/ux-r1-shell-coordinator.js`；`ui/archive-shell-chrome.js`；`ui/archive-navigator.js:place` | 显式 composition 替换 DOM relocation/MutationObserver；保留纯 preference/localization/health 服务 |
| Working editor 的 composition、revision、history、recovery 已有 owner | `ui/library.js:DocumentEditor`；`ui/library-entry-editor.js`；`ui/editor-primitives.js`；`ui/session-lifecycle.js` | 适配现有 sessions；禁止路由/异步 refresh 写入 dirty DOM |
| direct editing 在旧 narrow path 仍通过 Edit 按钮开启 | `ui/reader-experience.js:mount/mountRows/onResize` | D1 改为冻结直接编辑；断点变化不切换 body authority、不移除编辑 DOM |
| Original 当前以局部 `state.records` 和单 Input provenance 读取；History 可以列 document 对应的多 owner revisions | `ui/archive.js:info/showRevisions`；`GET_REVISIONS`/`RESTORE_REVISION` | 加入显式 target 的全序列 Original 与 Input-owner selector；不发明 Conversation 原子历史 |
| header menu 已修复为 document scope；Source export 已有 generation fence | `ui/archive.js:openDocumentMenu`；`ui/source-export.js:readSourceExport`；`ui/document-search-page.js` | 必须保留 #106 的目标隔离、40+4分页 intent 重建和最终 export 复核 |
| whole Conversation Remove 没有现成 header command；现有 exclude 是 Input 级 | `ui/archive.js:openMenu`；`core/indexed-store.js:editDocument`（最多1000 blocks） | 不把可见页 remove 当整 Conversation remove；新增 bounded domain plan/commit |
| purge/recovery 有强 fencing，但本次未找到一个可直接复用的 B-02 mixed-derivative preflight/refusal DTO | worker `purgeWithRecovery`；`core/thought-maintenance.js:beforeSourcePurge/purgeBatch` | D1 新增可信 preflight/refusal。模糊情况不调用 purge；不凭 disabled button 推断后端拒绝 |
| Topic 原话支持 bounded descriptor pages、source scope、anchor 和 partial index | `core/organizer/topic-reading.js`；`core/thought-read-index.js`；`ui/continuous-topic-reader.js` | 复用 reader；这些年新增 body-free year projection。不得把 capture fallback 当 expression year |
| descriptor/current position ordering 可以 fallback 到 capturedAt/createdAt | `describePlacement`；`core/topic-reading-state.js:readingOrder` | 保留老字段；新 expression-year predicate 只用可靠 source time 或可核验独立 human creation time，unknown/摘取副本不能借createdAt补造日期 |
| Topic root 当前可能展示 summary/AI sourceHint，root collection 累积已读取 rows | `ui/thoughts-base.js:paintHome`；`core/organizer/source-summary.js`；`ContinuousCollection.items` | 可信 exact excerpt/human cue + attribution；bounded window/LRU；不能把 DOM bounded 宣称为 memory bounded |
| AI update stage 可复用，first generation 会直接写 Current | `core/organizer/ai-presentation.js:AIPresentationRunner.run` 的 `if(topic.presentation)…else…` | D3 必须改 trusted stage。`createAIPresentationCandidate` 当前要求已有 Current，不能伪造空 Current |
| generation pool 最多8项，byte/budget还可进一步缩小；status 扫描所有 Topics | 同一 runner `selected`；`readAIPresentationStatus/snapshot` | 精确 scope confirmation；Topic-scoped status query避免全库读取；显示真实批次/排除/剩余 |
| provider validator会过滤无效evidence/list items并填默认空字段，不能把该normalize结果当完整response原样采纳证明 | `core/organizer/ai-contract.js:validateAIPresentation` | Q7加入整response admission：当前contract合法默认保留；明确无效/丢失的内容需拒绝或标未接受，不能默默凑valid Candidate |
| 候选选择按 canonical fields 原子 commit，但 UI save catch 没有单独 unknown-ack readback | `ui/thoughts.js:saveCandidate`；`core/organizer/ai-candidate.js`；`editAIPresentation` | 复用 candidate key/CAS/receipts，补 stable operation + readback，禁止盲目新 UUID 重试 |
| Context 已有200项/4,000,000 UTF16硬边界、15分钟期限、20 sessions；worker内存持有 | `ManualContext.dispatch`；`context-manifest.js` | 120项设计fixture可覆盖；>200整组拒绝不能缩小为prefix；worker restart也可能失效，无 durable task承诺 |
| `preview` 同时 hash并设置 confirmed；无独立 purpose/confirm/full-output edit/refresh API | `core/manual-context.js:ACTIONS/preview/edit/note` | D4 扩展同一暂态 owner，编译不等于用户核对确认；不另建 body store |
| 全 Topic枚举含human Thoughts、authored note和已有AI fields | `core/context-containers.js:readContextContainer` | 保留实际role/scope，选材明确显示；不把含AI的现有scope伪装成纯用户原话或默默重定义 |
| 当前 MaterialTray的body/fallback清除与sourceEpoch是关键安全机制 | `ui/material-tray.js:invalidateOutput/refresh/share` | 改 presentation和owner接线，保留这些race/refusal；不可永久drawer与新Context并存 |

## 3. 唯一 ownership 与模块边界

以下新模块名是建议的实施位置，不表示当前已经存在。消息 wire spelling 在 approved slice 中确定，语义/owner/preconditions 以本节为准。

| Owner | 拥有 | 不拥有 | 当前资产 / 拟实施位置 |
|---|---|---|---|
| AppShellController + RouteSession | 当前 space/object/view，history，导航 intent，return target；在leave成功后publish route | body、persistence、authorization | 扩展 `app-shell-state.js`/`reader-navigation.js`；提取 `ui/app-shell.js` |
| Page view session | 独立 query/sort、loaded extent、year expansion、key anchor、focus ref、布局模式；bounded in-tab LRU | 正文、grant、永久阅读truth | 从 `archive.js`/ThoughtWorkspace 的 maps提取 `ui/view-session.js`，唯一state容器 |
| ArchiveController | 当前 Conversation read snapshot、search coordination、事件到view admission；唯一editor adapter | Source变更/过滤/Topic authority | `ui/archive-workspace.js`；保留 `archive-navigator` service adapter |
| NavigatorSession | provider/project/group descriptors、expanded/loaded/selectedPath；body-free snapshot | routing效果、内容Search、Project membership推断 | 拆 `ArchiveNavigatorState` 与 renderer；显式 mount root或reader slot |
| EditorRegistry | 同一canonical owner/ref恰好一个active session；flush/leave/pin/dispose协调 | 存储/冲突裁决 | `ui/editor-session.js`作为 existing DocumentEditor/LibraryEntryEditor/AIReadingEditor adapter |
| Domain editors | Working Input、已支持Thought/saved-AI修改、revision/human protection、operation idempotency | 新B-01 meaning | existing `indexed-store`/`ia-store`/`library-edit`/`thought-binding`/`ai-presentation` |
| TopicController | Topic原话/这些年/saved AI各自view session；Root→Topic导航；AddThought adapter | 心理变化推断、旧Thought新写权限 | 拆 `thoughts.js`/`thoughts-base.js`，拟 `ui/topic-workspace.js` |
| OrganizerRequest/ReviewSession | domain request/job/scope/candidate；UI仅存candidate-key+field choices、next-undecided | 新Current/body store、automatic paid retry | existing runner/candidate/ledger；拟 `ui/organize-review.js` |
| ContextPackageService.ManualContext | task/selection/container snapshots、eligible suggestions、output draft、review binding、fresh release | Source/Thought写入、cloud/connector permission | existing `core/manual-context.js`；拟 `ui/context-workspace.js`作为stage controller |
| Passport/Memory | policy、deny/exclusion、grant purpose/scope/expiry/consume/revoke | body truth、UI Ready status | existing `core/passport.js`/`core/memory/service.js`/`manual-materials.js` |
| DialogStack/StatusPresenter | menu→close→modal、inert/focus、dirty close guards、局部真实status | 领域success判定 | 拟 `ui/components/dialog-stack.js`/`status.js`；迁移 existing helpers |

Route projection升为versioned body-free contract：space和现有兼容view、document/topic refs、Topic subview、Context selectionId/step、return target、viewSessionKey、route generation。query text仍仅bounded local session，正文/候选proposal/output/秘密不得入history、URL或logs。读取旧 `paiaReader/paiaShell` history时按现有validator解析；不认识或过期ref安全回对应root，绝不隐式create/build/authorize。增加Topic/Context anchor kind，不套用当前只接受 `inputId` 的anchor validator。

导航流程：捕获原view session → 当前transient owner close guard → EditorRegistry安全flush/reconcile → 新intent read → 校验route/ref/generation → publish唯一route → 显式mount新slot → 复核并恢复anchor/focus。失败保持原页；popstate回退同样走guard。无body为新对象的stale flash；新capture只提供有新内容，用户显式刷新才替换read snapshot。

## 4. 编辑、autosave、conflict、recovery

复用 `PlainTextSurface/AutosaveSession/UndoJournal/RevisionSession`；DocumentEditor继续按Input边界读写Working body，以editor持有的revision和Source availability提交。LibraryEntryEditor继续保留field/input双preconditions和每批40实际ack结果；跨批已保存不冒充全体原子成功。AIReadingEditor继续使用既有field protections/recovery lifetime。

Registry用canonical owner key注册，页面/modal不得同时开两个session修改同一个body。一个Conversation中的多个Inputs可由同一个DocumentEditor协调，但每个Input独立revision和selection ref。dirty/composing/saving/selected body必须pin；禁止祖先replaceChildren、detach/remount、route refresh重写caret/native undo。跨Input编辑仍拒绝；跨Input Copy保持原生selection文字，Add必须显式逐项。

mutation/reuse顺序：记录logical range+原text+revision → composition结束 → collect/flush → 从session/可信service读最新body/revision → grapheme boundary和exact substring复核 → domain command。不能用flush前捕获的body发送Topic/Context；range改变则明确重选。

Saved只来自durable receipt。uncertain transport不是已失败：保留same operationId + digest，先Q1 readback，得到committed/known-not-committed/unknown；只有确定未提交才重发同一logical attempt，不同body必须新operationId。comparison拿local与persisted两份，用户明确reconcile后新precondition；不silent LWW。

Recovery复用 `RecoveryDraftSession`/worker recoveryFence，保留 #106 epoch、purgeRevision、owner lifetime、restore purge清理。TTL是lazy load/save/prune，不承诺截止时立即物理删除；现有32 drafts/单份1250KiB/总4MiB仍实际生效，失败必须Stay/Copy/显式discard，不能承诺所有长draft硬退出可恢复。新独立AddThought使用existing CONTINUE_THINKING同一attempt；当前compose draft仅tab-local，不为本UI新增recovery kind/body DB。历史与native undo职责仍分开。

B-01未定时，仅保留已支持、现有明示保护的操作；新Topic默认原话reader不会激活旧Thought直接mutation/reverse write。独立新Thought不假装Conversation Input。移走edit affordance不删除旧revision/binding。

## 5. 必需的新接口（D ledger）

所有命令继续trusted extension caller + consent验证；strict bounded DTO，finite errors，version、operationId、revision/generation preconditions。UI interfaces只是adapters。以下是本foundation需批准的有限domain工作，不包含外部许可或owner产品决策。

| ID / slice | Contract / preconditions / 返回 | 在哪里实现与复用 |
|---|---|---|
| Q1 / D1，共享 | `OperationOutcome.read({version,namespace,ownerRef,operationId,requestDigest})` → committed(receipt result) / not_committed / unknown；opaque minimal metadata，无body/任意receipt枚举。unknown不得自动重试，未读到receipt不等于确定未提交 | existing operationReceipts及serialized write队列后读取；requestDigest遵循各namespace现有receipt规范，keyed/internal指纹由可信端生成handle，不统一重算或重写历史receipts；考虑receipt保留期与in-flight，worker narrow handler，core service只暴露指定owner/namespace |
| Q2 / D1 | `OriginalSequence.page({target:conversation|input,ref,cursor,expectedGeneration,limit})` → immutable user Source rows + true send-time/availability/coverage；original Copy读取全范围并最终fence，不能用可见DOM代表完整会话 | 优先组合 GET_PAGE archive(documentId) / GET_INPUT / existing source provenance；确有缺签名时增加query adapter，保持Source identity，不扩展capture |
| Q3 / D1 | `ArchiveRemoval.plan/commit({target,expectedSnapshot,operationId})`；全Conversation/单Input明确target、全部member ref/revisions、impact/undo capability；commit atomically preserves Source/revisions，recapture/import不会撤销negative intent | Input路径reuse EDIT_DOCUMENT。Conversation路径不能向1000 block cap发送prefix；可信域使用分页游标处理全范围、一个原子现有storage事务和receipt，或拒绝未核验范围，不创建removal body副本 |
| Q4 / D1 | `SourcePurge.preflight/commit` → unambiguous / owner_gate_required(B-02) / unavailable；fresh dependency/human protection/recovery assessment；未知、mixed rewrite一律无副作用refusal；commit再次评估并保持现有purge fences | existing sourcePresent/dependencies/provenance/human protections + worker withRecoveryFence。不得改写人工派生的保留/删除政策，不能仅UI检查 |
| Q5 / D2 | `TopicTimeline.page/overview({topicRef,scope,sort,year,query,cursor,expectedReadGeneration})` → full coverage or partial、knownYearCounts、unknownCount、observedInterval、bounded exact attributed excerpts；full-year入口定位exact refs | 扩展thought-read-index/topic-reading query，同generation的body-free descriptors；独立human current createdAt须由creation/provenance证明，不能把user_created摘取副本createdAt当表达时间；capturedAt不能算expression year。读模型metadata，可重建，无新store |
| Q6 / D3 | `OrganizeScope.read` → topic revision/layout/material-version binding、exact proposed batch/full intended count、excluded/unavailable/remaining、existing provider。`start`必须携带确认的scope binding，实际pool变化拒绝，未明确whole coverage不宣称whole | runner planner复用budget/ledger/local-network-policy；Topic-scoped status与snapshot读，避免整库原文扫描；UI不自行plan request |
| Q7 / D3 | `Candidate.stage/decide/status`统一first/update：base none或currentRevision、candidate key、material versions、canonical changedFields；complete decisions + operationId/digest → atomic new Current/revision or stale；无Current时Keep表示该字段仍未生成，全Keep不创建Current；mixed采用只在commit构造canonical合法空默认+已采纳fields，并以已采纳内容的evidence复核，不先持久化伪Current | refactor ai-presentation/ai-candidate既有owner。保留现有contract合法默认（如允许root evidence omitted）；明确无效字段/ref不能在normalize后伪装完整response，应整candidate拒绝/未接受并给safe error。base-none proposal必须存在可验证的existing metadata envelope，不能伪造Current满足isStored。无新object store；Backup/version/recovery guards须兼容新候选envelope |
| Q8 / D4 | 扩展 `PAIA_CONTEXT_MANUAL`：`task`(purpose)、`compile`(readable unconfirmed output)、`confirmReview`(exact output+manifest binding)、`editOutput`、`reconcile`(fresh explicit ref/container diff)。所有mutations检查selectionId/generation/owner；share必须domain reviewed=true且最终fresh | 同一ManualContext sessions/manifest；purpose与note区分角色，可进入同一output wrapper。现有item edits/redactions继续可用；不添加persistent task/body/grant |

Q3的全范围不可用、Q4无法证明安全、Q5年份coverage未完成、Q6 scope变化、Q7缺review-boundary、Q8 binding未确认均fail closed；可以显示partial/read-only/原稿，不得假成功。每项接口的具体限额和返回类型由实施测试固定；若仍需新durable entity/schema或超出本ledger，返回foundation review，不能以批准D1～D4自动扩权。

## 6. Topic Reader / 这些年

原话和这些年都读取同一Topic placement/binding/Working projection。内容是complete eligible chronologic view，分页到真实end；这些年是确定性、有披露的bounded preview，Q5返回每年真实count/显示数/余数以及unknown。不复用 `evolutionPlan(possibleEvolution)` 的AI inferred stages作为普通年视图，也不把EVOLUTION_ENTRY_LIMIT80当全部Topic。

年份只来自可靠sourceSentAt或可证明为独立新human expression的creation time。`user_created`本身不足以证明：`addThoughtExcerpt`会继承该类型，但新的createdAt只是摘取时间；有exactKey/摘取来源时沿可核验原expression refs取时间，不能解析哈希猜原对象，无法证明则unknown。Q5以现有provenance/creation journal/role判定独立表达，不改写旧createdAt。失去time evidence后进入unknown，capture/import/edit时间只保持其原角色。2022已知空只能在完整且observed interval包含该年时显示没有已收录记录；partial时不能断言空。scope过滤改变counts/interval；quoted third party仍有role，矛盾表达共同保留，不推断belief变化。

Root用bounded exact attributed excerpt或明确human cue；`sourceFaithfulSummary` extractive机制可参考，但其trim/slice140无grapheme/attribution DTO，不能直接称exact quote。Q5/read summary返回ref+revision+range+time precision，文本为精确substring；ellipsis作为presentation另列。机器summary不做root默认cue，事实meaningfulContentAt不解释为观点变化。

这些年、内容、saved AI各自anchor/query/expanded/extent，Back保留root session。Search通过domain scan/index查未mounted year/input，展开exact match，close恢复原year expansion。F-09只迁移 `thought-layout:v1` 的deprecated grid到list，保留各body/order/anchor/dark/size；不设置reverse permission，不重写旧receipt。

## 7. AI Organize lifecycle

saved output viewing不请求provider；生成只在具体Topic经过Q6 review再启动现有provider runner。一个用户确认绑定一个实际bounded scope/请求意图；默认最多8及byte bounds继续，剩余未处理明确显示，继续批次需用户明示现有授权，不能背景付费重试。

状态：none → scope-confirmed → pending → candidate-valid → partially/fully-decided → committing → committed。no-change保持Current；failed/cancel/unknown留原话/最后Current可读。job owner持有实际provider状态，UI离开仅取消render，明确Cancel调用runner，不能撤销已发外部请求。

Q7 first generation不能先写Current，再放review弹窗。候选base-none和update共用同一metadata/receipt/validation边界；Current在首次complete decision commit才产生。全部Keep保留no-current并明确终态；部分Adopt以canonical field值和evidence验证，不能空字段拼成invalid Current。8个既有AI_FIELDS是单位；长field中视觉子段只负责阅读/定位，不获得独立commit权限。

choices只在tab map `{topicId,candidateKey,baseRevision,decisions}`；候选/基底变化立即stale，旧choices只解释不重放。save single-flight、stable operation、Q1 readback。current human edit protections/AI revisions/purge evidence fence必须保留，existing generation checkpoint表示已处理而非用户已adopt，两者不能混淆。

compare明确human evidence、structure-only、AI新写；proof来自引用exact range/evidence，并保留不确定、否定、归属、条件、情绪、因果、时间和未解决矛盾。schema/evidence pass不保证semantic fidelity。DFG-009保持未认证；Keep不能把失真candidate判PASS。preview动画只在validated candidate的独立只读render树中进行，绝不移动live editor；reduced motion遵循冻结包。

## 8. Context task / selection / retrieval / review / release

AppShell只路由selectionId/step；ContextController持有唯一in-tab task view；ManualContext domain持有唯一短期selection/output binding。进入或incoming selection只创建/加入显式refs，不自动build、grant或send。purpose空保留selection/draft，禁止compile；task purpose不是historical quotation。

Q8将现有preview-confirm混合拆成compile(unconfirmed) → review/edit → confirmReview → Ready。UI按钮disabled不是trusted review证据；share校验confirmed binding。task/selection/output/redaction/budget/package更改增加generation，清review。output editor拥有one transient output overlay + manifest dependency refs，existing item overrides与whole-output overlay不能同时变成两个editable truth；切换必须明确compile/review并使旧overlay失效。完整output edits本期tab-local，不入Backup、不写Archive。

Whole selection复用readContextContainer完整枚举；当前包括Topic note和saved AI fields，role和intended coverage须明确。分组签名/每条revision包含未mounted成员；unknown/overcap不选择prefix，禁止用前20 lexical supplements代替whole intent。Material hard cap与advisory预算分开：200/4M仍拒绝，budget split保留所有grapheme和tail，所有包按顺序拼接才能覆盖整体，单包是contiguous fragment，不能叫完整Topic。UI仅给包命名/覆盖解释，不能改现有bounds或省略尾部。

retrieval只调用manual suggest + existing Memory eligibility + lexical ranking；20 unselected suggestions/partial inspection明确披露；选中才addSupplement，origin为retrieval。显式选择不会被rank移除，但denial/purge/eligibility仍优先。Profiles是现有可选范围配置，不强制创建人格/profile。现有Passport controls仅管理metadata，无法凭grant变成真实connector。

reconcile用新refs与旧selection做diff，preserve unrelated allowed manual output，变动相关的quote/overlay需用户重新核对；无法可靠定位受禁来源与freeform overlay时清除受影响的整个overlay，保留可以证明独立的purpose/unrelated safe work。旧container snapshots也必须换新，不能只替item revision却留旧signature。无法取得current snapshot则继续stale/blocked，不自动批准。

release先flush composition/drafts → confirm binding(current task/full intended set/output/package hash) → domain share最终revision/policy/tombstone/expiry检查 → UI检查同route/session/generation仍有效 → 一次clipboard.writeText或download initiation。任何已检测变化必须在effect前拒绝。系统clipboard跨应用没有分布式原子事务；稍后变化报告而不承诺recall。failed clipboard的full-text fallback也绑定同snapshot并在deny/purge清空；不得从缓存恢复blocked text。Export明确download started，不宣称saved file或sent。unknown effect ack不自动重复。

worker terminate、session eviction、15分钟到期或tab结束会使selection expire；允许独立safe in-tab draft的warning/copy仅在其内容仍可证明eligible时出现，无法复核就隐藏/清理derivatives。不得为期望连续性扩展durable task、remoteauthority或复用#99 detached reader。

## 9. Stale invalidation

复用既有content/data generations、input/field revisions、layoutGeneration、provenance、policy/session revision、purgeRecovery epoch和candidate key。新增统一UI InvalidationAdapter只是消息分发+cache eviction，不另建持久dependency engine。domain继续以transaction fresh-read作为最终authority。

| Cause | UI即时处理 | Domain最终边界 |
|---|---|---|
| Working edit / source time / membership | Reader active session不覆盖；search/Topic/year cursor invalid；candidate/context relevant binding stale | input revisions/provenance；topic read generation；candidate materialVersions；manifest复核 |
| Topic placement/note/saved AI human edit | year/whole-Topic scope重核；candidate choices失效；Context review/ready停用 | organization/layout+field revisions+container signature |
| selection/task/output/budget修改 | 清Ready/review；取消旧suggestion/compile响应 | ManualContext generation、output+manifest digest |
| restriction/grant revoke/expiry/local policy | 清affectedDOM/fallback/overlay，release停用；不发paid rerun | Memory/Passport双检查、temporary policy、fresh materialRead |
| Source purge/restore/owner lifetime变化 | recovery/history/body projections不可恢复受禁text；clear stale privateDOM | tombstones/sourcePresent/recoveryFence+epoch/cleanup/Backup fences |
| broadcast cause缺失或无法判断 | 暂停derived output并做一次bounded authoritative recheck，不静默忽略 | fresh query checks，持续不确定则retry/blocked，无循环poll |

只读缓存必须有scope/generation/dependency签名与LRU边界。所有异步callbacks绑定route intent和owner lifetime；关闭dialog/dispose订阅立即失效。重复消息合并为一次pending refresh；不自动paid recompute、不重新request已经sent的job。

## 10. Shared components / responsive / accessibility / scale

组件合同及literal tokens严格使用冻结 `UI_SYSTEM.md`/`tokens.css`；实现到production-owned token file，不运行时import docs specimen。components只渲染DTO和emit intent，禁用storage/provider/Passport写入。shared `ScopeSearch`、`OverflowMenu`、`DialogStack`、`InlineStatus`、`Prose/Time`、`ContinuousList`、candidate radiogroup和CopyExport状态保证一control一listener。见TRACEABILITY 19 rows。

断点统一采用冻结1440/1024/768：宽rail184/nav280，1024–1439为160/240，768–1023 icon rail64+临时Navigator sheet，<768 stacked、无side columns。Root/Context不占empty Navigator；compare在<1024stack。现有799/1200/600规则按surface cutover移除，不能叠加。resize仅layout，dirty/composing DOM不变；保留字体/暗色/locale即时应用与失败rollback。

语义nav/headings/native controls；Skip to content；非application reading region；menu关闭后modal，inert+trap+exact invoker/fallback heading；Escape不implicit discard；Cmd/Ctrl+F仅current scope，编辑/IME/native快捷键不抢占；keyboard text selection可在不丢logical range下进入toolbar。Adopt/Keep每field native radiogroup无默认选择；disabled release须可读原因，aria-live只announce真实phase。headless keyboard/合成IME与physical IME、screen reader、200%text、320reflow分开证据，不从静态specimen宣称WCAG/设备120Hz PASS。

长列表复用paged services（40 items/响应byte bound）和ContinuousTopicReader的120cleanDOM+pins；Archive复用当前page window/seek/compact。补root window与bounded LRU，清理ContinuousCollection/TopicReader的累积body DTO，仅保留附近pages、pins和body-freeextent/descriptors；返回/搜索从authority seek精确ref，不通过load此前所有页。动态高度用实际measurements+key/relative block offset；不会用index anchor。pin数量超过预算时安全停paging并提供flush/stay，不牺牲work。显式Load more始终可用，cursorInvalid/partial是重核而非end；长Input仍通过existing full-body读取并精确定位range；不在live contenteditable内部拆DOM或按visiblepage裁正文。未来若需更大body的新chunk editor须单独证明native undo/IME/selection并回架构审查。future scale测全100k/10k及长会话memory峰值，不能把160fixture算scale认证。

## 11. 迁移、删除和rollback

切换粒度是route family，所有共享domain不复制。编译期composition选择使每个family恰好一个active controller；迁移中的未切换Topic/Context可通过同一个AppShell和临时LegacyPageAdapter挂载。该adapter不注册router、不复制body、不监听已切换action，每个slice有到期删除条件；不得留下双writer或双coordinator。

D1新Archive及shared shell通过验证后，移除该路径旧shell/bootstrap/observer和CSS覆盖；未切换功能所需的settings/locale段先提取纯controller，不能整文件删掉capability。D2移除Topic root/card/synthetic evolution path，保留canonical saved-AI字段。D3移除旧自动first-generation/current renderer path。D4移除MaterialTray drawer和old task renderer，仅保留现有eligibility/permissions等service adapter；同commit测试只一次action/effect。详细删除清单与slice evidence见roadmap。

没有canonical body或DB version迁移。明确的迁移只有route/session version兼容、F-09 display preference、D3 existing metadata内candidate envelope的version与Backup compatibility。新增元数据必须回答ARCHITECTURE schema问题；未审查的新entity/store不得进入。

每slice保留一个验证过的parent release Git边界，route-family composition可回到这个parent实现；不是用户可见旧visual option。rollback不逆转用户已保存revisions、tombstones、exclusions/authorizations，不恢复旧body快照覆盖新work。D2偏好receipt记录old value，自动回滚不删除content；D3含base-none envelope的库不得运行未知旧decoder，只在既有derived cleanup规则明确允许时清理可重建未adopt候选，否则维持新safe reader并拒绝降级，旧Backup按explicit compatibility验证；D4停止新task并清安全暂态bindings，无durable body要迁移。

跨schema/identity/storage的future changes另需recovery point与Migration Receipt；signed same-ID rollback仍DFG-001，不能拿源码revert当consumer update认证。

## 12. Owner / deferred boundary

| Gate | 本架构依赖 | Fail closed / 明确不声称 |
|---|---|---|
| B-01 / DFG-002 | 新旧Thought direct mutation/reverse edit meaning | D2不激活新mutation；保持现有受保护operations，独立AddThought可做 |
| B-02 / DFG-003 | mixed human derivative permanent Source purge | Q4 worker refuse未知/mixed；不选保留/删除新policy；Input/Topic可逆remove不等于purge |
| B-03/B-05 / DFG-006 | residency/sync/service/真实connector deployment | 全部关闭/不加入slice；Context只Copy/Export，无new remoteauthority/cost |
| B-04 / DFG-008 | AI replies读取/留存/外部处理 | disabled；Source body只user-sent，quoted text是data非权限 |
| DFG-009 | actual generated output独立meaning review | D3机械engineering可验，不宣称fidelity complete；失真为acceptance failure |
| DFG-001/004/005/007 | signed update/current live/private official export/device | 保留对应evidence pending；不从synthetic套PASS；不扩大本desktop scope到mobile/voice |
| DFG-010/011（当前STATUS记录，ledger尚无独立标题） | rejected semantic source / detached minimal taskContext approval | semantic不激活；#99 local reader不能变production connector |

本review结束后停在owner approval。后续任何Work都必须引用批准的foundation head、冻结DVN-1.0、授权slice及仍open gates；不能重新提出Shell/Reader/Topic/Organize/Context视觉或恢复Inspector/Dashboard/第四列/重复Search/永久MaterialTray。
