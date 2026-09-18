# Architecture / Design

## A. 权威内容、来源关系、显示状态三者分开

```text
现有 Source records / Working Input / Thought / revisions / policies
             │                      │
             │ stable refs          │ 原有内容查询、编辑、材料输出
             ▼                      ▼
来源观察 → trusted SourceStructureService → body-free source metadata
                                     │
                 可重建 Navigator / Thought read indexes
                                     │
                 PAIA ordering / SourceOrderProvider
                                     │
                  Navigator view state + existing Reader
```

图中的结构服务和投影模块是计划新增模块，不是声称当前已经存在。
正文只通过已有 `GET_PAGE`、`GET_INPUT`、`TOPIC_DOCUMENT_PAGE`、`GET_LIBRARY_ENTRY` 及可信编辑服务读取/写入。
Navigator 不调用 `GET_STATE`、不保有全库正文，也不成为 Context 的第二套真值。

### A1. 不变量

| ID | 不变量 |
|---|---|
| I01 | 现有 document ID、platform + sourceConversationId、Source sourceKey、message ID、内容版本关系均不因 Project/顺序变化改变。 |
| I02 | 原始文字、原发送时间、历史 provenance、用户工作文字、revision 不被导航元数据写入改变。 |
| I03 | unknown membership 不等于显式 unassigned；not observed 不等于 deleted。 |
| I04 | 外部来源删除不调用 PAIA remove/trash/purge；PAIA 主动永久删除仍优先于所有新元数据、索引及 backup。 |
| I05 | 全部显式材料仍是固定 ID/revision/span；移动和排序不重选、不隐含授权。 |
| I06 | 本地浏览、切换顺序、连续滚动、恢复锚点不产生 Provider 请求。 |
| I07 | Project、来源顺序、root/topic page windows 均是元数据/投影，不新增正文实体家族。 |
| I08 | 只有经过验证、带 scope 的 provider order 能影响来源顺序；不可用只降级显示，不能阻断档案。 |
| I09 | dirty/IME/保存失败/并发冲突缓冲不得被切换 Window、游标恢复、DOM 回收或异步刷新覆盖。 |
| I10 | 一个 execution 只领一个 canonical round；仅远端已发布且验证的 checkpoint 可推进状态。 |

## B. 身份与来源结构数据契约

### B1. 稳定引用

`conversationRef = { platform, sourceConversationId }`，指向当前 `documents.byChat` 使用的既有来源身份。
对 ChatGPT，当前 `chatOf(record)` 为既有 chat key；必须复用，不能因引入通用 provider 把旧哈希改一遍。
`documentId` 是 PAIA 对象身份，`projectRef = { providerKey, namespace, projectId }` 仅为来源 relationship。
namespace 必须由已验证 contract 证明其稳定/唯一范围；未知或跨账户有歧义时不得按名称合并 Project。
多来源的一般性只要求新关系/排序服务不硬编码 ChatGPT；不在本包改造所有历史 Source identity 或新建 capture provider。

### B2. 既有 IndexedDB `meta` 的分行模型

采用以下 version=1 行，ID 为固定前缀 + 稳定引用的摘要（摘要只用于 meta key，不代替内容 identity）。摘要编码、长度和生成算法由 `source-structure-model.js` 单一实现；使用 SHA-256 + 规范 JSON 数组，不按标题哈希。

| 前缀 | 最小持久字段 | 权威性 / Backup |
|---|---|---|
| `ans:conversation:v1:<refHash>` | id, version, kind=conversation, conversationRef, membership, sourceStatus, lastObservedAt, lastEvidenceId, relationshipRevision, lastKnownSourceProject | 当前最后可靠观察到的关系；进入严格 source metadata backup |
| `ans:project:v1:<refHash>` | id, version, kind=project, projectRef, currentName, sourceStatus, lastObservedAt, lastEvidenceId, relationshipRevision | 已存档 Conversation 所关联 Project 的最小 metadata；进入 backup |
| `ans:event:v1:<subjectHash>:<sequence>` | id, version, kind=event, subjectRef, observationSequence, observedAt, evidence, change, before, after | 来源关系/名称/生命周期变化事实；追加而不改旧事件；进入 backup |
| `ans:ui:v1` | version, navigatorOrder=paia\|source | 设备本地偏好，不备份，不同于 inputReadingSort |
| `ans:order:v1:<scopeHash>:...` | provider/scope/contract、generation、rank entries、observedAt、expiresAt、coverage、reasonCode | 可丢弃来源顺序快照，分行有界；不备份、不是历史 provenance |
| `ans:index:v1:...` / `ans:index-state:v1:...` | 仅稳定 refs、排序 key、generation、cursor/checkpoint、覆盖状态 | 可重建 Navigator 投影；不备份，不保存正文/snippet |
| `ans:thought-index:v1:...` / `ans:thought-state:v1:...` | topic/placement/entry refs、source revisions、section/time sort keys、generation/checkpoint | 可重建 Thought root/topic 读投影；不备份，不保存正文或私人查询 |

`membership = {state:'unknown'|'unassigned'|'project', projectRef:null|ProjectRef, evidenceId:null|string}`。
只有 state=project 才允许非 null projectRef；unassigned 必须有明确否定归属的证据，字段缺失不得变为 unassigned。
`sourceStatus = 'unknown'|'observed_active'|'confirmed_deleted'`；`observationState='not_observed'|'not_loaded'|'temporarily_unavailable'|'observed'` 是本次读取的临时结果，不写入永久删除状态。
`lastKnownSourceProject` 只在曾有可靠归属时存在，解绑/外部删除不清除它；其名与 ref 是当次观察值，不能当成每条旧 Input 发送时的项目。
所有时间命名 observedAt/recordedAt，不能借用 sourceSentAt。worker 记录观察时刻，provider 的事件时间只有显式验证后作为单独 evidence 字段保留。

事件只在有效关系/名称/状态发生改变时追加；重复观察同事实仅刷新 lastObservedAt，不能每次扫描新增历史。
每个subject的事件key sequence取事务内递增的relationshipRevision（补零20位），与外部observation/request generation分开。Backup恢复后继续已验证的max revision+1；事件key重复但内容不同必须冲突失败，不能覆盖旧事件。
事件历史不按固定最近 N 条截断；用每事件一行与游标读取解决规模问题。排序快照和重建索引可清理，来源关系历史不能冒充缓存随意清理。
对象首次观察事件的 before 为 unknown；**不得追填“这个项目从会话诞生时就存在”**。
事件 evidence 是白名单小对象：contractId/version、channel、scope、originClass、requestGeneration、可用的 providerRevision、证据类别及摘要；不存 HTTP body/header、cookie/token、账号邮箱、完整 DOM 或 unrelated IDs。
限值：每批至多 100 个 source facts、每项 projectName 至多 300 Unicode code points、ID/namespace 至多 128 ASCII 合约字符、请求至多 128 KiB；超限返回明确 unavailable/invalid，不截断 ID 或以截断标题创建新身份。

### B3. SourceStructureService 与并发

计划新模块：`core/source-structure-model.js`（validator/keys/reducer）、`core/source-structure-store.js`（trusted transaction/读取）、`core/source-structure-backup.js`（白名单/引用校验/恢复），由现有 store/service worker 组合调用，不另开 DB。

1. source adapter 先给 typed observation；ISOLATED 核对当前 ChatGPT route、来源节点区域、consent、enabled、exact-chat capture exclusion、epoch/session、adapter contract。
2. Worker 对 sender origin/tab/frame/current route 再验证；分配受约束 request generation；只接受与现有已存档 Conversation 相连的观察。
3. 若 Input capture 尚未保存，metadata 在既有有界 session 内等 settled；不得用 Project observation 先创建空 Conversation 或 message。
4. 当前 source metadata + CAS revision + append event + 受影响投影 invalidation 在同一既有 writer 队列/事务提交；失败不半移动。
5. 有 provider revision 时严格比较；没有时只接受当前有效 request generation 内的合约事实。跨 tab 矛盾且无法证明新旧，保留 last-known，报告 conflict/unavailable；不能以回包先后强行覆盖。
6. timeout、fetch失败、会话切换、pause、logout/namespace不明的结果不得清空旧关系；迟到、重复、错 epoch 的事件是 no-op/rejected。
7. 只更新 source relationshipRevision，不改 document titleRevision/Input revision、Context材料版本、内容 digest 或授权。
8. 单独发 `PAIA_SOURCE_STRUCTURE_CHANGED`（body-free refs/generation），Reader 内容刷新与 material stale 监听不因纯 metadata 改动被触发；真正内容变化继续原 ARCHIVE_CHANGED。

原 `ENRICH_SOURCE_METADATA` 是严格 user-message/time 契约；保持其不变量。新增 `PAIA_SOURCE_STRUCTURE_OBSERVE` 的可信入口只做新关系观察；UI 不获得任意 source observation 写权限。
新增只读 `PAIA_ARCHIVE_NAV_PAGE`、`PAIA_SOURCE_STRUCTURE_DETAIL`、`PAIA_ARCHIVE_ORDER_STATUS` 和偏好 `PAIA_ARCHIVE_NAV_PREFERENCE` 均经 exact trusted UI + consent 检查。
展示请求不更改 capture enablement，也不视为联网或 AI 授权。

## C. 来源状态机与历史

```text
membership:
 unknown --明确没有项目--> unassigned
 unknown / unassigned --已验证归属 P--> project(P)
 project(A) --已验证归属 B--> project(B)
 project(P) --明确无项目--> unassigned
 任何状态 --缺失/未加载/请求失败/旧 epoch--> 原状态不变

lifecycle:
 unknown --明确观察到存活--> observed_active
 unknown / observed_active --可靠删除事实--> confirmed_deleted
 confirmed_deleted --更新、更可靠的重新出现事实--> observed_active
 任何状态 --404/403/未找到DOM/未扫描到--> 不推导删除
```

Project 改名保留 projectRef；合约支持 Project 上级移动时仅记录 metadata，不按层级路径产生新 Project 身份。本包 UI 不新增无限 Project 嵌套。
Project 已确认删除：显示“原项目已删除”，保留其最后名称与相关档案；不批量把子会话 sourceStatus 写成 deleted。子会话可靠移动/重新出现后可回普通组，历史事件仍可读。
Conversation 已确认删除：进入该 provider 的“来源已删除”区域，打开后显示“外部来源已删除，PAIA 中的内容仍保留”。此区域末尾固定，不参与正常 source order。
删除 Project 下仍未确认自身删除的 Window 标注的是父容器删除，不谎称聊天也不存在。
来源无法打开显示“来源暂不可用”，不能“确认删除”。不把 provider 返回 200 的登录页、权限错误或 SPA 空白算作重新出现。
后续 PAIA 内人工整理不得改变来源 status；本包不增加人工更改 source truth 的拖动操作。

### C1. PAIA purge 的优先级

外部删除零正文写入、零墓碑；PAIA purge 沿用真实 `beforeSourcePurge` / `refreshDoc` / dependency cleanup。
每次实际 purge 后重新核对该 Conversation 是否还有未被 purge 的来源 refs。最后一个来源被清理时，清理其新关系、事件、排序/cache/index和引用；不能借 lastKnown 保留本已要求删除的来源名称。
Project 元数据在仍有合法历史 Conversation 引用时保留；无合法引用时清理，事件不得形成孤儿隐私旁路。
只剩用户独立工作文本的 detached document 仍走现有 detached 语义，放“本机保留内容”投影，不伪称远端删除，也不恢复已清空的 sourceConversationId。
清理与正文 purge 同事务或既有持久 invalidation/fence-first 链路；读端与 backup 在 cleanup 完成前屏蔽失效关系。不得存在能从旧投影重新输出敏感标题的窗口。

## D. Navigator 查询与排序

### D1. 有界、可重建查询

计划模块 `core/archive-navigation-index.js`、`core/archive-navigation-query.js`，输出 descriptor，不输出 Input body。
`page({providerKey,groupKind,projectRef,cursor,limit:40,mode})` 返回 `{items,nextCursor,coverage,generation,effectiveOrdering,unavailableReason,selectedPath}`；分 scope 取 Project/Windows，不一次返回全库。
cursor 绑定 query/provider/group/mode/generation，携带稳定最后 key；旧 generation 返回 `cursorInvalid` + 可重新定位对象，不继续错页。
初次按现有 documents primary/bySequence 游标每批最多 100 构建；保存 checkpoint，重启幂等。初始化未完成显示“正在整理导航，已有档案仍可打开”，旧 GET_PAGE 浏览保底，不能假报没有记录。
索引行主键前缀编码顺序 key；需要扩展 `Transaction.page` 的 bounded primary-key range helper 时只添加通用只读方法，不升级 IndexedDB version 或创建新 store。单一排序 key codec 同时用于比较与 key 构造，做 Unicode/tie-break/property 测试。
key codec固定为ASCII分段：字符串采用合法Unicode的UTF-8字节十六进制+`!`终止符（空字符串亦有终止符），复合tuple按字段顺序拼接；Window的既有有符号时间sort key先用BigInt加8640000000000000偏移、补齐17位再接documentId编码。rank为非负整数补齐5位，未排名对象用单独tail前缀。编码比较必须与已冻结comparator一致；拒绝无效Unicode/超界数值，不能截断造成碰撞。Scope前缀用固定refHash分隔，可用bounded primary-key range读；这些仅是索引key，不改任何内容ID。
project rename/move/order 快照更新只重建受影响 scope，使用 shadow generation 分批写入后原子切换 pointer；旧 generation 读端不混用；没有可用新 generation 时用最近有效 PAIA 投影。
索引维护必须接入 capture/import/time enrichment、Input exclude/restore、document rename、source structure change、purge/backup restore。不要只监听 browser event；worker 重启后 durable invalidation 仍能修复。

group 固定顺序：`Projects` → `其他对话（confirmed unassigned）` → `项目未知` → `来源已删除`；无 sourceRef 的 detached 工作内容在“本机保留内容”。空组不展示。
每个Window只有一个显示路径，优先级固定：无合法sourceRef的detached → 自身confirmed_deleted → 当前父Project confirmed_deleted → 当前正常Project → confirmed unassigned → unknown。历史lastKnownProject只供详情，不让已移出的Window再次挂回旧Project；自身与父项目都删除时也只出现一次。group集合必须互斥且完整。
分组名称不创建 PAIA Topic/Source；Project 第一次折叠，Window 项 userTitle 优先于 source title。
没有 Project capability 的历史库直接在“项目未知”显示全部相关 Window，不能把 unknown 批量判定无项目。
一个来源可以省略重复 provider 大标题；多来源显示可折叠 source heading，各自顺序独立，active path 始终可定位。

### D2. PAIA ordering

Window 使用既有 `documents.libraryDisplay` 的最近可靠表达时间降序、稳定 ID；未知的 key=0/tie-break 继续原语义，不用 capturedAt 偷换。
Project 使用 `NFKC(name).toLowerCase()` 代码点比较、再 stable key；不使用运行时 localeCompare 造成跨语言设备抖动。
固定 provider 组合：已存在 ChatGPT → 已存在 Claude → 其他 providerKey 代码点升序；AI Processor DeepSeek 不因为已配置 API Key 就成为 Archive source。
切回 PAIA ordering 重新读取同一 PAIA comparator 的当前投影；不“冻结回到开启来源排序时的旧截图”，新增真实内容仍按 PAIA 规则出现。

### D3. SourceOrderProvider

计划模块 `core/source-ordering.js` + `adapter/chatgpt-source-structure.js` 的 provider-specific 提取部分。
注册契约：`getOrder({providerKey,namespace,scopeKind:'projects'|'windows',scopeRef,archiveGeneration,now})`。
返回之一：

```text
{ availability:'available', providerKey, namespace, scopeKind, scopeRef,
  orderedRefs, contractId, contractVersion, evidenceKind, observationId,
  observedAt, expiresAt, completeness:'complete_scope'|'proven_rank_subset',
  generation }
{ availability:'unavailable', reasonCode, lastObservedAt:null|timestamp }
```

available 必须验证：身份同 scope、无重复 refs、只引用合法类型、有限大小、完整性证明或 explicit rank 的严格序关系；不存在可执行脚本/URL动作。
项目列表顺序与项目内窗口顺序独立可用，一个不可用不拖累另一个。
已存档且在有效 orderedRefs 中的对象按 provider 顺序；档案中没有 rank 的对象追加到同 scope 的 PAIA 尾部，轻说明“部分窗口使用档案顺序”；不猜测缺失位置，不判删除。
`proven_rank_subset` 仅允许 provider 明确的稳定 rank 合约，不允许 DOM 可见子集靠位置冒充。
上限每 scope 10,000 refs，超过则该 scope unavailable；分批传输每批至多 100 refs，pointer 只有完整 generation 校验后切换；不能用半批已到达次序。
freshness=min(provider 合约更短有效期, observedAt+24h)；未来超过本机 5 分钟、时间无效、时钟倒退导致 observedAt>now 的快照标 unavailable。重启后缓存仍需来源 namespace/contract/generation 可验证；无法确认则 fallback。
过期不删历史、不触发网络，显示“来源顺序暂不可用，使用档案顺序”。用户偏好仍保持 source，下次被动观察到可靠数据可以恢复。

### D4. Settings 与稳定交互

“设置 → 阅读与外观 → 档案窗口排列”：二选一原生 select，`PAIA 顺序` / `按来源排列`；一行实际状态说明，不提供一页高级参数。
新 preference 独立于既有 `inputReadingSort`；写成功后 apply，失败恢复先前选项并可重试，不清空 Navigator。
外部更新到来时，不在用户点按/键盘操作 Navigator 的途中换位；Navigator 含焦点、pointer down 或菜单打开时暂存新 generation，显示低噪声“位置有更新 · 应用”。用户移开焦点后可原子应用，用户点击“应用”也可应用；active Window/Reader anchor不变。
Reader 正在编辑并不需要因为 metadata 更新先保存；只有实际切换 Window 的路由动作才经过编辑 flush。排序不能打断正文 DOM。

## E. 三层布局与路由

### E1. Desktop ≥1200px

全局侧栏默认延续 224px（已有用户折叠偏好仍可用）；Navigator 240px；余宽 Reader，正文沿用用户 640/680/720px 偏好并受容器宽度限制。
在 1200px，224+240 后仍有 736px 主工作区；正文不固定宽到溢出。
Archive root 未选 Window 时，现有列表空间呈现同一 Navigator 数据/展开状态的宽版，保留真实继续/最近收录/本机变化辅助入口；无空 Reader 大卡。
打开 Window 后收敛为左侧 Navigator，右侧 Reader；复用一个 Navigator controller、selection和游标状态，不保留两套可同时失步的列表。
Navigator 自身滚动；Reader 继续使用现有 window scroll，避免本包顺手改掉全部阅读锚点。重排时 active row 稳定 key 保留，定位 current path 不滚动正文。

### E2. Narrow desktop 800–1199px

全局导航在此断点以 64px compact 视觉投影显示，**不写回用户的 desktop sidebarCollapsed 偏好**；Navigator 208px，Reader占余宽，整体 padding 收敛。
用户可收起 Navigator；收起后标题栏一个“窗口”按钮恢复。辅助来源/版本面板 overlay，不挤出第四窄列。
200% zoom 导致实际 viewport 跨断点时按新断点重排，不缩字体塞列。

### E3. Mobile <800px

不硬塞三列。保留当前 top bar / root 底部全局导航；详情 Reader 页头提供“窗口”控制，打开 source/project/window sheet（全宽，焦点限制、Esc/关闭、scroll position保留）。
切 Window 执行原 leave/flush，失败保留 sheet/当前 Reader与缓冲；成功关闭 sheet并恢复目标锚点。关闭 sheet不改变Window，不产生新正文路由。
320px/390px 无全页横向溢出；代码块局部滚动；触屏必要按钮≥44px，不能只靠hover。

### E4. 已有 coordinator 是唯一 owner

`ui/reader-navigation.js` 扩展内部状态 snapshot，不新建 hash/query、extension 页面或平行 popstate 监听器。
新增 `ui/archive-navigator.js` controller 被 `archive.js` 协调；Navigator item 点击走原 `navigate`。
返回搜索/主题来源保持原 returnTo；点“档案”回 root 保持 Navigator 的展开与列表位置；浏览器Back/Forward恢复原 Window及其锚点。
切 breakpoint 不 dispose active DocumentEditor、不重建 contenteditable，不清 selection / material tray。
根页/Reader scoped search 保持 UIS 语义：Navigator 搜索窗口/档案范围，Reader 搜索当前 Window；不复活旧一级 Global Search。
来源详情在现有 source/provenance 面板增加“当前最后观察关系”与“关系历史”，明确这不是当时原文的重写。

## F. Reader surfaces、顺序和时间

只删除 README R1/R3 列出的生产者；`#context-menu`、原生 selection toolbar、material tray 内部查找、version history 及 `selectTopicMaterials()` 的业务路径保留。
Topic 的 whole-topic selection 移入既有 `#topic-menu` actionMenu，在当前视图下执行同一逻辑；不修改其选择数量/固定版本确认。
Input 单 toggle label 使用 `正序 · 最早在前` / `倒序 · 最新在前`，accessible name 含“输入时间顺序，点击切换…”；`aria-pressed=true` 代表 desc；Space/Enter 一次切换，不弹目录。
新用户asc，已有 preference不重置；打开有效阅读锚点可带回该文档保存sort。用户显式点击后当次 intent优先，保存新偏好和有效锚点，不让晚到的读取把它改回。
重排必须保留同一 Input ID + offset 屏幕锚点，未保存文本flush失败则取消切换并恢复按钮；source-time enrichment 仍采用原位更新，不强制跳底。
时间标签直接常显 `.block-time`，建议 12–13px / 现有meta色；禁止 opacity0。普通小字对比度至少4.5:1，不能用“弱对比”牺牲可读性。
已知sourceSentAt显示来源时间，unknown使用当前产品诚实文案；capturedAt可在详情以“收录时间”出现，但不进入伪造的发送日期/时分。
不顺手把 Topic `effectiveTime/timeBasis` 的内部排列含义改写成来源时间，也不把未知时间以本次迁移/观察时间补齐。

## G. Thought Library 连续流

### G1. UI semantics

主题总览是连续主题集合；每个主题是独立连续文档。正常“打开主题→返回总览”仍存在，不要求所有主题正文在同一 DOM。
取消 root 的 `#thought-more` 翻页生产者及 Topic 的 `#topic-next/#topic-previous/#topic-sections-more` 对用户的分页交互；章节组织和必要目录导航保留，它们不是分页。
unplaced 与 Library scoped search 同样累积连续结果；Settings 中删除记录/版本历史等行政查询不因本需求被全部重写。
状态固定为 idle/loading/ready/exhausted/error；只有后端 terminal cursor 确認且 coverage完整才展示“已显示全部内容”。有 nextCursor 的空页不表示结束。
尾部 sentinel 在1视口以内预取；键盘 Tab 到连续列表末端触发同一加载；不提供“下一页”替代按钮。错误保留前文，局部“重试加载”，screen-reader polite announce 新增数量，不抢焦点。

### G2. 有界读投影

Root stable 顺序必须保留当前 createdAt/id 的稳定语义，不能因AI生成/最近访问重排；新增 metadata index 逐批构建，而不是每页 `t.all(topics)`。
Topic 复用原 section rank + 当前 source/capture/created 明确 timeBasis + stable entryId 的排序规则；投影只存 descriptor和相关revision，不存entry.body/thoughtText/note。
从已存在 sections/placements/entry/time 逐批100构建，versioned generation + source epoch防半代可见；读正文仍用原 readingEntry/body-binding/path，删除deny仍同步过滤。
topic/root改名、placement变更、entry edit、来源time enrichment、purge、AI接受影响原话实体时，必须 durable invalidate受影响generation；不能只把 cursor 的页码加一。
初始 projection未完时有进度/覆盖说明；可沿旧可信bounded接口提供已知片段，不能把未建完读成空库。后台 continuation 只做本机索引计算，单次≤100源对象，未获AI权限也可运行。
Topic查询文本保留当前标签内存，不写入meta索引；使用已存在检索服务或扫描body-free候选后的有界文本校验，分页覆盖诚实、无全量重复读取。未来100%搜索完成不能由空中间页推断。

### G3. Windowing 与编辑

计划 `ui/continuous-collection.js`（通用请求/游标/去重/尾部状态）、`ui/continuous-topic-reader.js`（编辑安全适配），不把修改全堆进 thoughts-base.js。
一次request≤40items/256KiB，保留约3个40-item chunks的正文DOM作为目标；长条>128KiB沿现有large entry按需展开读取，不截断可输出正文。
回收远离视口的 clean chunks，用测量spacer保留高度；向上滚动按稳定cursor/anchor重新物化。不能仅“append forever”宣称windowing，也不能“替换整页”宣称连续。
内容key使用真实 placement/entry/section组合；同一Thought跨Topic不被字符串去重。root以topic ID；正反方向插入保持native DOM key与编辑器实例。
活跃IME、dirty/saving、焦点编辑、原生选择覆盖范围和打开历史/来源面板引用节点必须pin，禁止回收。超过目标DOM数量时宁可保留pin，也不丢字；批量trackedEntryIds按≤100独立验证，禁止 `.slice(0,100)` 静默漏检dirty节点。
维护编辑器registry与已有AutosaveSession/RevisionSession，卸载clean节点才dispose；用户undo/redo按原entry会话，不因虚拟化清空历史。
返回/排序/resize捕获 `{topicId, entryId, revision, existingOffset, pixelDelta, sort, view, expanded}`，以稳定内容锚点还原，不依赖page number；offset继续原服务约定，不擅自换UTF-16/字素计数。
新内容到达/游标失效：保留已渲染正文与dirty缓冲，按目标stable entry重定位新的generation，丢失目标选安全邻居并说明；不得递归全量刷新直到抢占新页面。
section entry上下移动需用domain邻接/排序查询，不能把当前挂载chunk首尾误当主题边界；章节目录可lazy装载，但不会因超100章节出现“空下一页”。
原话与已缓存AI稿保持现有TopicAIViewSession的独立位置和view选择；切换本身零Provider调用。新流不能把原话游标/scroll应用到AI稿。

## H. 迁移、Backup 与回退

### H1. 不做正文迁移

新版本首次打开旧档案：不改records/blocks/thoughts、原文字/hash/时间/人工revision/placements/权限；缺失metadata读为unknown，缺失UI偏好读paia。
不以doc title、同文、Topic名称、ChatGPT `/g`前缀推导项目。
可重建索引从稳定现存refs逐批初始化，每批checkpoint；重复/中断/重启幂等。source metadata observation可以在索引尚未完成时写入，其generation使旧builder结果失效后重算受影响scope。
Reading anchors/tray按原保留范围，不把本包位置变成Source备份。

### H2. Backup/import/export 同轮闭环

ANS-02即扩展当前 `organizationState` 的有限 `ans:conversation/project/event:v1` 白名单及严格字段validator，配套reference校验、purge过滤、generation consistency、旧backup读入。不得 `id.startsWith('ans:')` 全放行。
currentName/history、lastKnown与可靠confirmed deletion必须往返；restored evidence标`restored`、保留原observedAt，不当成刚刚live观察，来源order快照不恢复。
恢复到空库按原协议和tombstones优先；unknown newer ans metadata version显式拒绝，不能静默忽略字段后声称完整恢复。
UI preference/expanded paths/queries/order caches/indexes不进数据备份；restore明确清理本包文档规定的ephemeral prefixes（包括ans:ui:v1），不能宽泛删除全部ans namespace。恢复后默认paia，索引重建，不重开AI/外部访问。
Source export仍是Source export；完整可移植导出使用当前Backup/open-export链路，新增metadata必须以已标注关系历史方式保留，不把它拼入原始Input正文。
现有Backup对provider的已知限制在AUDIT注明；ANS-02 最小补齐当前 import contract 已接受的 ChatGPT/Claude source 校验与恢复，复用其已有身份/URL规则、不重算旧ID。不增加新provider；Claude realExportVerified=false仍保持。所有当前合法旧档案及其metadata必须lossless。

### H3. 六项耐久状态理由

1. **为什么需要持久化：**来源已经删除/移动后仍需知道最后可靠关系与历史；单次页面DOM不能重建这些事实。
2. **哪一层：**最小来源relationship/event元数据；不是新正文truth，原Source/Input/Thought不变。
3. **权限/删除：**source observation不带授权；PAIA purge清理无合法refs的元数据；external delete不清档案。
4. **Backup/provenance：**durable事实白名单往返；缓存、位置、凭据不备份；不回填旧时刻归属。
5. **迁移/人工保护：**缺失unknown，索引可重入；不改人工标题、正文、版本和选择。
6. **复杂度：**复用既有meta、writer队列、query与revision；避免新DB store/DDL、第二body库与全量对象JSON。

### H4. 回退

UI回退可关闭新导航/连续流入口，继续原可靠domain查询；不能清source history、不能恢复不安全的旧Thought反写或source purge行为。
索引损坏可丢弃重建其namespace；不能连同durable `ans:conversation/project/event`删掉。
迁移错误先停止新metadata写入、保留只读/导出，发布修正；不得通过reset/reinstall清库。
任何需要增加新objectstore、权限、改变identity或无法保证history lossless的方案变化，属于本包设计修改：相关round BLOCKED，先明确canonical design修订，禁止执行者自行扩scope。
