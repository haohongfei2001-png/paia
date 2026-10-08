# UX-R4 — 固定的本次材料与精确输出

本节是 DELTA-04/05、MIG-07/08/10 的当前契约。下面保留的 Round 8 / v0.10 / v0.11 检索、预算与 Profile 规则继续约束旧的允许范围检索及 Grant-bound 路径；它们不再要求新手动选择先进入 Thought 或开启未整理 Input 自动检索。

`ContextPackageService.manual()` 在可信主路径内拥有 `ManualContext`。只有经过精确扩展页面和 consent 检查的本次操作可以创建标签页绑定的 `manual_selection`。Input、Thought、可核验的 Source snapshot、既有 AI 字段均保留稳定 ID、saved revision、完整/选段范围、角色与依赖版本。正文仅存于有界的 worker 短期内存：最多 20 个会话，每个固定 15 分钟、200 项、400 万材料字符；达到限制明确拒绝，不截断选中正文。重启/过期须重新选择，不从旧 DOM 或 Backup 重建授权。

新材料盘保留明确选择、顺序、本次排除、逐段 override、遮挡和独立的本次说明。默认未授权不等于明确禁止；显式 deny/never、Input/Entry/Section 排除及相关 Topic 的继承禁止继续阻断。受阻项保留占位，正文不可输出；修改限制只确认并修改对应来源规则，不以单项允许覆盖继承禁止。建议沿用 Memory 的已允许候选范围与 lexical ranking，默认未选，排除本次已删材料并应用本次遮挡，不能替换固定项。

Preview 确认后，输出必须匹配同一 generation，重新核验 Source/工作版本/来源生命周期/限制后释放用户检查的完整文本。手动输出不调用旧 `MemoryService.share()` 重新组装正文；复制与 Markdown 文件逐字一致。编辑变为 dirty；源编辑使快照 stale；删除、purge、禁止使其 blocked 并清除受阻正文；worker 重启与 15 分钟期限产生 expired。重新预览保留改写/遮挡，不能自动恢复未遮挡原文。遮挡是字面规则，不声称能发现全部同义或间接身份信息。

`externalAccess=false` 仍禁止连接/旧受控输出；它不再阻止本次固定手动复制或文件导出。新增可选严格 boolean `localOnly` 缺失时补 false，保留旧设置；开启后停止正在运行的 Organizer，且 Provider 实际请求前及 Passport 授权前再次拒绝网络/连接访问。关闭不重放任务，不创建 Grant。现有 Profile、Grant 的消费者/用途/范围/到期/撤销/一次消费检查保留。manual 的会话 ID 不能绑定或替代 Grant 包。

MIG-07 无持久正文迁移；旧 Preview 保留旧身份与失效规则，不能升级为新手动授权。MIG-08 只补缺失配置，旧 false 保持连接关闭，旧 true 不创建消费者或 Grant。MIG-10 严格 Backup whitelist round-trip `localOnly`/`externalAccess` 与现有禁止规则，临时材料、query、正文 override、遮挡、Passport Grants、凭证和游标都不导出。

Search 使用同一 provider-neutral lexical 基础及现有 Source/Input/Thought owner。分页绑定查询和筛选；后台变化明确标示覆盖变化，全结果选择必须完成稳定枚举再确认。指定文档使用现有 blockIndex；普通分页最多检查 200 行、返回 40 项。历史阅读在 Source 原文上匹配，未知时间单列，不使用今天工作版冒充过去；独立 Thought 与 AI 稿不被混入此 Source 范围。

# Retained allowed-scope retrieval: Round 8 — Thought 不再是 Context 的准入门槛

Round 8 保留既有 Topic/Profile 授权语义，但允许用户在 Settings **明确开启**后，让尚未进入 Thought Library 的有效 Input 直接参与本地 AI Context 检索。默认关闭；旧配置缺少该字段时原子补 `false`，不会因为升级扩大可用范围。

直接 Input 候选必须同时满足：Input 当前 active、Source 未永久删除、Smart Filter 未过滤、未被用户移除、未被单条长期排除，并且没有任何仍存在的 Thought 以非 context-only provenance 表示该 Input。后一条是权限边界：一旦 Input 已进入 Thought Library，就继续服从 Topic 的 allow/deny/never 与 Entry/Section 排除，不能借“未整理 Input”路径绕过被拒绝的 Topic。移除后再恢复也使用持久 provenance 判定，不因依赖暂时失效而重新变成授权旁路。

直接 Input 的正文只在 Build/Preview/Share 时从当前工作正文读取；不建立新的持久正文副本。活动记录只保存 Input ID、Topic/Entry ID 与 query digest，不保存 query 或 Context 正文。Preview 后 Input 被编辑、删除、过滤、永久删除或授权状态变化时，Share 必须以 `MEMORY_STALE` 拒绝旧预览并要求重建。直接 Input 的长期排除可在 Settings 一次性恢复；Source 永久删除会清理对应排除 metadata。Backup 保存“是否允许未整理 Input”与单条排除，但不保存 Preview/Context/query。

UX-R3 将 Round 8 的完整引用改为明确的 `bodyBinding`：可证明的一对一完整引用先跟随 Input，默认第一次实际 Thought 正文编辑在既有 Thought 内解除跟随并保护人工正文，Input 与不可变 Source 不变。高级反写设置首次引入和 Backup 恢复后均关闭；仅显式开启后、仍跟随完整单一 Input 且两侧版本匹配的未来编辑可原子修改两侧。局部摘录、多 Input 综合、AI 稿和独立 Thought 始终不反写。恢复档案当前文字须单独对照确认；历史版本恢复只修改 Thought。Context、Search 和 evidence 读取同一现有 Thought 正文，解除跟随不解除来源、删除或拒绝策略。

---

# v0.11.0 — selected behavior

Production uses the same lexical relevance ordering with invocation-local query preparation. No embedding/model/vector store or new API path. Low coverage and incomplete scans are explained in Preview; unknown queries remain empty. See INTELLIGENCE.md for benchmark evidence, rejected alternatives, reproduction and limits. Tests run headless via PAIA_HEADLESS=1; historical test names/receipt fields saying visibleChrome do not override this run mode.

# AI Context v0.10.1

用户侧使用 AI Context / AI 上下文。内部 memory route、class、meta namespace 保留。AI Context 管理 AI 可使用的思想，并在用户明确复制或导出前展示实际上下文；不会自动记住、发送或注入全部档案。

## 数据与授权

Thought Library 是正文来源。Memory durable state 仅保存授权、排除、Profiles、使用偏好和活动 metadata；不建立第四份正文事实库。IDB 5、Thought schema 2、Memory meta v1 保持不变。

默认 Topic 未授权。先检查当前 Profile 的允许/禁止、跨 Profile 的 never、Entry/Section 排除、共享 placement 的禁止路径、Source 存在性与墓碑、Input 可用性，再读取候选 Thought。临时允许不能突破 deny/never；结构合并后需重新授权。未授权或删除内容不会成为召回兜底。

Settings 的独立连接访问开关继续控制旧受控 SHARE；新固定手动选择按本文件 UX-R4 主契约输出。Local-only 是额外的主动网络限制，手动本机输出仍可用。两个开关都不扩大 Topic 权限。

config 的可选 boolean `externalAccess` 兼容旧行。旧行缺字段时原子补 true，保持 v0.10.0 已有显式分享能力，绝不新增 Topic 授权；false 不被初始化覆盖。重复初始化安全、失败回滚。备份保存开关/授权/排除/Profile，不保存 API Key、session grant、query 或 Context cache 正文；空库恢复与既有大小限制不变。

## 本地检索与排序

所有 Context Build、Search、Ranking、Preview、分享准备均为 0 Provider / 0 API。无 embedding、向量库、local LLM、同义词词典、自动 AI compression、自动重试或外部 AI 集成。

NFKC、exact phrase、Latin token、中文 2/3 字 n-gram 构成主要词面信号。弱单字重叠只在已有正文词项命中时使用，不能独立放行一个不相关条目。正文、条目标题、章节和 Topic 并行加权，Topic 不是 Entry 召回前置门槛。多条授权路径选与问题更相关的路径。

相关性先于人工编辑/确认、置顶、证据与时间。明确当前表述只在相关性相同时优先，不让新近或置顶把无关内容推到高位。已有 AI presentation 只有在所有依据/版本均有效时提供排序信号，不默认成为对外事实正文。

候选以原 Unicode 文本的重叠窗口定位相关内容，最多保留 2000 字；不会把 200 KB 长文全部累积到候选池。不建立持久检索索引。最多扫描 20000 placements；达到上限明确提示部分结果。

## 当前状态、去重与组织

freshness 仅表示数据版本有效性，不表示用户当前相信什么。日期更新、内容新近或人工编辑不能自动宣布 Current。只对开头明确的本人当前决定/选择、不再等原话使用“明确当前表述”；历史开头标“历史表述”，疑问、假设、可能、引述、混合叙述或截断丢失线索时保守标“状态未确认”。没有关系 metadata 时不推断 superseded 或自动解决冲突。不同观点没有替代证据时保留不确定说明与时间。

只合并同 Topic、章节、标题、类型、时间和状态的相同完整候选。保留全部 evidence，优先人工编辑/确认的来源；截取过的长条目保持独立，跨章节/标题不合并。不同条件、否定、判断与历史阶段不做近义合并。原章节与条目标题随正文提供，以保留其中的条件。

Builder 只做选择、排序与轻量标签，不生成新的用户结论。三档 hard caps 沿用：简洁 2400 字/1800 估算 tokens/6 项、标准 6000/4500/16、详细 12000/9000/32；单项分别最多 450/900/1600 字，选择相关窗口。预算包括标题、标签、使用偏好与提示。容纳不了相关内容时给出预算建议，不误称没有相关结果。长文窗口不等于完整原条目，完整原话可从来源查看。

## 预览与安全失效

连续阅读优先，弱显示类型、状态、Topic、章节/标题、时间和来源。选择原因使用普通语言，不展示 score 或内部权重。仅本次移除不改变长期授权；长期排除不修改 Thought 正文。移除后重新计算剩余内容的冲突说明。

分享前重建并检查 generation、session revision 与文本 hash；Thought 编辑、删除、来源失效、授权撤销或并发本地维护导致版本变化时拒绝旧预览，提示重新生成。预览只保留有限时间的临时引用/问题/hash，不持久保存正文。只有 Default Profile 时隐藏普通选择框，直接输入问题即可构建；高级 Profile CRUD/CAS 与草稿保护保留。

## 验证与能力上限

固定 benchmark 为 60 Topics / 1200 Entries / 240 queries，120 deterministic 与 120 held-out wording。后者由本任务编写，是措辞隔离的合成集，不是独立盲评；不代表真实用户总体满意度。另仅改变类型标注复跑，事实/偏好/决定/判断/计划各 48 个正向查询，正文、问题与 relevance labels 不变。隐私由实际 MemoryService 与 Chrome 流程单独验证，预先过滤的 benchmark pool 不能替代安全证明。

整体 Top-1、Top-3、MRR 提升，Recall@10 小幅下降，精确检索保持；详细数据见验收报告。真正没有共同词面的同义改写仍会漏检。停止增加题目专用规则；本版只有 local lexical/structural relevance，不宣称语义理解。
