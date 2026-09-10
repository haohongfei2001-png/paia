# v0.11.0 — selected behavior

Production uses the same lexical relevance ordering with invocation-local query preparation. No embedding/model/vector store or new API path. Low coverage and incomplete scans are explained in Preview; unknown queries remain empty. See INTELLIGENCE.md for benchmark evidence, rejected alternatives, reproduction and limits. Tests run headless via PAIA_HEADLESS=1; historical test names/receipt fields saying visibleChrome do not override this run mode.

# AI Context v0.10.1

用户侧使用 AI Context / AI 上下文。内部 memory route、class、meta namespace 保留。AI Context 管理 AI 可使用的思想，并在用户明确复制或导出前展示实际上下文；不会自动记住、发送或注入全部档案。

## 数据与授权

Thought Library 是正文来源。Memory durable state 仅保存授权、排除、Profiles、使用偏好和活动 metadata；不建立第四份正文事实库。IDB 5、Thought schema 2、Memory meta v1 保持不变。

默认 Topic 未授权。先检查当前 Profile 的允许/禁止、跨 Profile 的 never、Entry/Section 排除、共享 placement 的禁止路径、Source 存在性与墓碑、Input 可用性，再读取候选 Thought。临时允许不能突破 deny/never；结构合并后需重新授权。未授权或删除内容不会成为召回兜底。

Settings 的“允许向外部 AI 提供 AI 上下文”由“保存 AI Context 设置”提交。持久关闭后，后端 SHARE 在复制与 Markdown 导出前拒绝操作；本地 Build/Preview、既有授权、Input/Thought 和 Backup 不受影响。重新开启不扩大 Topic 权限。这不是全产品 closed mode，不改变已有 Organizer 的单独授权流程。

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
