# v0.7.0 Thought Library Foundation — Test Matrix

日期：2026-09-07。**本文件是测试设计，不是已执行报告。** 对应 [工程设计](THOUGHT_LIBRARY_FOUNDATION.md)。本轮零 runtime 修改、零 migration 执行、零真实 Provider 调用、零私人库操作。

## 执行层与退出规则

| 层 | 环境/工具 | 能证明什么 |
|---|---|---|
| U | vanilla JS pure tests，固定时钟/UUID、typed fixtures | validator/policy/diff/rank/签名的机械行为；不证明真实语义质量 |
| D | 已随仓库提供的 fake-indexeddb；受信后台 harness；事务故障注入 | atomicity、CAS、幂等、迁移/删除/索引不变量 |
| V | 现有 UI harness，人工构造 DOM | rendering/editor/焦点/安全消息与状态；不能替代 Chrome IME |
| C | 独立 Chrome 扩展 origin，只放合成内容，不复用日常用户库 | 真 IndexedDB/worker 停止/IME/可见连续文档/升级行为 |
| P | v0.7.0.1另行批准的真实Provider/正式凭证方案，held-out人工样本 | 真实语义/网络/费用质量；不属于v0.7.0退出gate |

所有MUST safety/invariant tests必须0失败；permission/source/input/filter/import冻结回归必须通过；性能按设计§20报告实际硬件/bytes/p50/p95。v0.7.0的M1–M5完整工程验收只需U/D/V/C与确定性Mock/fixture provider，不要求真实云AI、真实本地模型或真实credential。表中P标签均表示v0.7.0.1额外真实复测，不是本阶段必选层；语义样本在Foundation阶段验证预期typed输出/grounding/policy的机械契约，不宣称模型质量。v0.6.x历史通过数不计作本轮执行。

## A. Extraction / 内容语义

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| A01 | explicit fact：人工样本“样例项目采用离线存储。” | Information/fact、primary evidence、exact used version；不改 Input | U/D/P |
| A02 | explicit event，两个不同时刻同一句陈述 | Information/event；事件 scope 不同，不被全文 equality 合并 | U/D/P |
| A03 | explicit preference，短句“我偏好纯文本。” | Thinking/preference，短文本不能只因长度丢弃 | U/P |
| A04 | decision：明确选择一个方案 | Thinking/decision；proposal 与真正决定区分，不能补造时间 | U/P |
| A05 | judgment：带条件和不确定性的判断 | 保留条件/否定/置信措辞，不升级为 fact | U/P |
| A06 | idea：尚未执行的构想 | Thinking/idea，不误判成已经发生 Event | U/P |
| A07 | goal/plan 与 reflection | goal_plan/reflection，family 映射唯一；未知 type 拒绝 | U/P |
| A08 | creation：诗/代码样式纯文本段落 | Creation/creation；保留换行/措辞，不被空白 normalization 改写 | U/V/P |
| A09 | mixed Input | 可输出多个独立 Entry；同 Input 无关 assertion 不被任意拼成总结 | U/D/P |
| A10 | short important：一个简短明确拒绝/决定 | 可提取，依 context 才能判定的短句只能用授权 context | U/P |
| A11 | 两个明确 Input 的综合内容 | synthesized，≥2 非 context 来源；每个贡献可定位 | U/D/P |
| A12 | inferred-only candidate | 只 pending；从 auto commit 入口强行提交仍拒绝；接受后保留 inferred | U/D/V/P |
| A13 | 空 body、超长 body、输出多余字段/类型 | 空 Input不自动造内容；超限按有界规则，不静默截取成完整作品；未知字段拒绝 | U/D |
| A14 | model confidence=1 但引用偏移无效/无 primary | 不自动提交；原文验证独立于模型分数 | U/D/P |

## B. Provenance / 读取资格

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| B01 | single Input | InputBlock ID + basedOnContentRevision + actualVersion/digest + role/type/version 完整；不只有 sourceIds | U/D |
| B02 | multiple Input | 同一 Entry 多贡献；依赖 byInput/owner 查询一致；Source/输入实体仍独立 | D |
| B03 | 输入 rev3 被读取，commit 前到 rev4 | CAS 拒绝旧结果；不能把 evidence 偷改为 rev4 后提交 | D/P |
| B04 | context_only 普通邻居 | 同 document 可见 anchor；最多2条、4KiB且总预算有效；实际版本有证据 | U/D |
| B05 | filtered neighbor | 只能 context；单独作为 primary/唯一依据被拒绝；批次多个 anchor 不超总额 | U/D |
| B06 | user_removed | selection/Gateway/Provider/accept/重试均不能读取，即使有旧 provenance | D/P |
| B07 | source tombstoned | 原 ID/新 ID/同 source 新快照/旧缓存都拒绝；零 Provider bytes | D/C/P |
| B08 | branch_pending/无可信身份 | fail closed，不通过“context”绕过 | U/D |
| B09 | 实际旧版本 revision 已 prune | evidence 标 version_unavailable；不显示最新 Input 冒充历史；不永久 pin 原文 | D/V |
| B10 | libraryText 空串或手工改过 | Gateway 只解析当前 working text，空串不 fallback Source | D/P |
| B11 | 来源只读关系与 Provider capability | Provider DTO 无 Source raw/title/url/IDs，不能直接查询 repository | U/D/P |
| B12 | note/title 不在 selectedFields | 请求不带其内容；曾选 note 则 noteDigest 参与验证 | U/D/P |

## C. Editing / authorship

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| C01 | Topic 文档 body/title 直接输入 | 无 Edit 按钮；纯文本、空正文仍 active | V/C |
| C02 | 750ms debounce/3s max wait、失焦/切页 | 调度可测；dirty 不丢；IME 期间不提交半成品 | U/V/C |
| C03 | 保存中继续输入；回执后还有变动 | saved 只推进已提交 patch；继续下一轮 autosave，不吞后续字符 | D/V/C |
| C04 | Undo/Redo，快捷键/菜单/跨 Entry selection | 同一数据 Entry、文本空不整条删除；单操作正确分组，composition 不抢快捷键 | V/C |
| C05 | body/title/note/type 分别编辑 | 只保护实际人工 changed fields；Undo 不解除保护 | U/D |
| C06 | 只改 Topic、只移 Section、只排序 | body 不自动永久锁；人工正负 membership/order 意图保留 | U/D/V |
| C07 | 用户编辑期间 AI task 完成 | AI base/protection 不匹配拒绝；stale suggestion 不能覆盖草稿 | D/V/C |
| C08 | 两标签同字段修改 | 一个成功一个 conflict，败方草稿可看/复制由用户处理；不 last-write-wins | D/C |
| C09 | 两标签不同字段修改 | 不提交未变字段；刷新 base/新 operation 后可安全提交，旧 request digest 不乱用 | D/C |
| C10 | 独立 authored Entry、无 Input refs | 能保存/搜索/保留；不能伪造 AI evidence | U/D/V |
| C11 | 旧 userEdited=true，字段证据缺失 | 全字段保守保护、legacy evidence；不能猜未编辑正文 | D |
| C12 | write quota/事务中断/回执丢失 | 保草稿；重试 id+digest 幂等，不多 revision；不同 digest 拒绝 | D/V/C |
| C13 | saving 时 remote notification | deferred version 处理，不能因为早返回永远漏更新 | V/C |
| C14 | paste/drop 富文本/HTML/script/长文本 | 当文本显示/限长；不执行 HTML，不读取系统剪贴板 API | V/C |

## D. Topic / Section / Placement

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| D01 | 一个 Entry 多 Topic | 一个 body 行、每 Topic 独立 placement；任意页编辑其他页反映同 revision | D/V/C |
| D02 | Topic rename | UUID 不变，搜索 owner postings 更新，provenance/revision 不丢 | D/V |
| D03 | 用户 Topic merge，包括同名 Section/重复 Entry | redirect 无环，正文不 merge/不复制，保护合并、结构 revision 可解释 | D/V/C |
| D04 | Section create/rename/merge/reorder | 持久 ID/正确 Topic归属；无固定 Facts/Ideas 分组；人工结果不撤销 | D/V |
| D05 | pin/unpin 与 rename | pin/title 两个保护独立，Index 稳定排序 | U/D/V |
| D06 | manual Entry order 后 AI 插入 | 不改变既有人工相对序，新 Entry 插到安全锚点 | U/D/V |
| D07 | rank collision/exhaustion/rebalance | stable ID tie-break；generation 发布原子；相对次序和人工锚点不变 | U/D/C |
| D08 | AI late output 指向已 merged Topic/Section | canonical redirect + organizationRevision 校验；不重建旧命名实体 | D |
| D09 | 手工移出某 Topic 后再 extraction | denied membership 生效，AI 不静默加回 | D/V |
| D10 | merge 中断/结构并发/正文编辑 | checkpoint恢复；结构冲突明确；不锁不相关正文编辑 | D/C |

## E. Duplicate / evolution

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| E01 | 相同 Input/version/candidate retry | 1 Entry、1 contribution、同 receipt，不多计数/历史 | D |
| E02 | 同 assertion/body 不同来源 | 一 Entry，provenance consolidation，两个 Source/Input 不合并 | U/D/P |
| E03 | 同文字不同事件/条件/主体 | 不因全文相同合并；scope 不可证时只 possible related | U/D/P |
| E04 | 相似但演化/否定词/数字/态度变化 | 不 exact merge、不自动 supersede；保留独立候选 | U/D/P |
| E05 | mock hash collision | 复核实际 body/scope，不能错误合并 | U/D |
| E06 | 人工改过 body 或组织的 existing Entry | exactKey 更新；不能覆盖 body/title/人工 Topic/order；新增证据可受控合并 | D |
| E07 | 多个独立人工同文 Entry | 不按 unique hash 强制折叠 | D |
| E08 | relation schema self-loop/重复/对称/有向 | relationKey/方向正确，reserved action 不可执行，思想演化不被去重抹掉 | U/D/V |

## F. 删除 / suppression / purge

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| F01 | 用户 delete Thought | lifecycle/search/placement/read同步隐藏；重要 remove revision；Input/Source未变 | D/V |
| F02 | 相同证据/不同措辞/换 provider 重新提取 | suppression 阻止 auto resurrection；不能 hash miss 就重建 | U/D/P |
| F03 | 同文 recapture/import 新临时 ID | 稳定 source lineage 命中 suppression，不算新证据 | D |
| F04 | 真正新增 independent non-context evidence | 只产生 reconsider_removed pending，关联旧删除；接受/拒绝有 lineage | U/D/V/P |
| F05 | 仅新 context/note/title/格式变化 | 不打开新证据通道，不反复推送 | U/D |
| F06 | 同 Input 多 assertion 其中一个已删 | 无关 assertion 可验证区分则保留；不明时阻止 auto并去重 pending，不能复活被删项 | U/D/P |
| F07 | 唯一有效 Input 整条 remove | 未人工 AI Entry invalidated，Topic/search 即时不显示；context 不算剩余来源 | D/V |
| F08 | 多源 remove 一条/最后一条 | 有剩余→partial stale；无剩余且无人改→invalidated，不能旧 multiSourceOrigin 永久存活 | D |
| F09 | 用户修改后所有 Input 消失 | 当前 authored content 保留 detached；Input原文不可读 | D/V |
| F10 | permanent Source purge 全路径 | old/new revisions、provenance、candidate/suggestion、search、job、Undo、quarantine 无原文恢复通道 | D/V/C |
| F11 | purge 的混合 authored/AI 历史 | 当前独立人工内容保留；不能安全分离的历史 payload删除，不以备份保存旧 Source | D |
| F12 | 10k fan-out purge 中断/重启 | fence立即阻止读/late commit；checkpoint 清理可恢复，未完成不报成功 | D/C |
| F13 | removed Thought restore vs purged Source | 用户 restore可恢复安全工作内容；不能恢复 purged dependency/body快照 | D/V |
| F14 | prune 90天之后重新提取 | removal suppression依旧有效，不因 revision清理复活 | D |
| F15 | 来源已发到远端后 purge | 本地不再发送/提交；UI/consent 不声称追回远端数据 | P/V |

## G. stale / refresh / suggestion

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| G01 | Input body rev 改变 | 仅关联 dependencies stale；Entry旧正文保留，used baseline不偷推进 | D |
| G02 | note-only且只用过body | 原 Input contentRevision照常增；body digest等价，Entry不语义stale，记录equivalence验证 | D |
| G03 | note-only且task用过note；title-only未用title | 前者stale，后者不stale；未知legacy保守stale | D |
| G04 | multi-source一条更新/一条remove | staleReasons不丢；partial与freshness独立 | D |
| G05 | detached authored Entry | 正常阅读/编辑，不自动从已删输入重建依赖 | D/V |
| G06 | 微小否定/数字/条件变化 | 字符少也不能auto refresh；必须suggestion | U/D/P |
| G07 | 可证明无语义变化、未人工改body | allowlist通过才auto；独立ai_update revision；字段保护保留 | U/D |
| G08 | stale + 人工body编辑 | 只suggestion；type/topic等未保护metadata操作仍须单独policy | D |
| G09 | accept suggestion 时 base变化 | expired/BASE_CHANGED，禁止旧patch应用；successor重新生成 | D/V/C |
| G10 | 重复accept/reject、reject后late accept | 终态CAS/receipt；无重复正文/revision/notification | D/V |
| G11 | pending inferred/无Topic候选 | drawer可找到，弱入口计数distinct；没实现的reserved action无Accept | V/C |
| G12 | filter mode/late decision改变 | 不删除已有Thought；新任务资格重验；reading session不被重排 | D/V |

## H. AI failure / queue / policy

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| H01 | timeout / 429 / 5xx | 有界退避/Retry-After/次数上限，Input保存不等待，无偷偷换服务 | U/D/P |
| H02 | invalid JSON/未知字段/超大响应 | bounded parser/validator失败；不保存raw error/output，不放宽schema | U/D/P |
| H03 | prompt injection-like Input | 当数据处理，无库/网络工具；scope无法扩大，无执行HTML/指令 | U/D/P |
| H04 | late result after edit/delete/purge/cancel | input/base/lease/epoch各门禁独立拒绝 | D/C/P |
| H05 | lease过期接管，旧worker返回 | fencing token防旧提交，同workItem receipt至多一次 | D/C |
| H06 | 每个阶段中断/结果后commit前中断 | checkpoint只承认已提交成果，重启重取合法Input，不能replay旧prompt | D/C |
| H07 | commit后回执丢失/多标签重复wake | idempotent；operationId不同digest拒绝；job不能重复创建无限队列 | D/C |
| H08 | optional enqueue失败/漏通知 | Input仍成功；持久revision/sequence差量重建待处理项，不整库常扫 | D |
| H09 | worker idle/no alarm | 不承诺准点重试；下一可信wake可恢复，有待运行状态可见 | C |
| H10 | Provider outages/credential失效/撤销consent | 暂停/awaiting credential；无泄露key；已存Library照常读写 | D/P/V |
| H11 | policy版本/人工保护变化 | commit重新判定；自然语言policy预留不能override产品禁止项 | U/D |
| H12 | AI请求改Input/Source/永久delete/purge | action enum/command/capability均拒绝，即使user policy或model高分 | U/D |
| H13 | 输出重复调用可能重复计费 | 本地receipt至多一次、usage记录只数字；不虚称provider只调用一次 | D/P |

## I. Privacy / security

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| I01 | content script伪造Library/read/provider命令 | 受信sender/path/schema白名单拒绝，不能读档案 | D/C |
| I02 | DTO inspection with synthetic sentinel fields | Source/assistant/attachment/credential/url/unrelated text均不在请求 | U/D/P |
| I03 | removed/tombstone写后立刻Gateway读 | 即便outbox未处理也无泄露 | D/C |
| I04 | 任意URL/redirect/SSRF式provider输出 | endpoint固定且scope不扩展，不执行provider URL/工具建议 | U/P |
| I05 | console/error/diagnostic/receipt/job snapshots | 仅allowlisted codes/数字；无正文/标题/URL/私有hash/原始响应 | U/D/P |
| I06 | 默认未启用provider/empty registry | no network；Recommended不等于外传同意；fixture不进正式包 | D/C |
| I07 | CredentialProvider权限/撤销/句柄失效 | fixture secret/handle不进IDB/local/revision/URL/log，content script不可读；撤销阻止迟到请求；正式public存储方案不由此测试预设 | D/C/P |
| I08 | Library search postings/purge | 多Topic只一份正文索引；token哈希仍作为私人数据治理、无日志 | D |
| I09 | task scope/额度 | 整批target/context/byte/output限制；长文分段版本明确、不过量上传 | U/D/P |

## J. Migration / invariants / downgrade

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| J01 | v0.6.0物理v3→v5、v0.6.1/.1/.2物理v4→v5 | store/version/marker准确；local schema6不是IDB6；已存在filter决策不重置 | D/C |
| J02 | 空thoughts | 不把Input自动生成Thought，不造Thought历史 | D |
| J03 | 非空旧thoughts、user_created/edited/multi-source | id/正文/备注/历史保留，未知字段证据保守保护，类型不乱猜 | D |
| J04 | categories名称绑定ID→UUID | 一致映射、别名可追溯、多Topicplacement不复制正文 | D |
| J05 | 未知实验schema/孤儿依赖/无法purge追踪 | 隔离且无raw副本；必要时停止Library激活；Source/Input不被重置 | D |
| J06 | DDL/mapping/verify/activate每处crash | 原子DDL、有界checkpoint、重跑幂等；不能半激活读模型 | D/C |
| J07 | migration期间Input正常edit/capture | 迁移零重写Input；按revision journal对账合法新变化，不覆盖人工 | D/C |
| J08 | 完整invariant preservation | 逐字段Source/time/Input/title/note/removal/filter/tombstones/revisions/import账本一致，不只对count | D/C |
| J09 | migration中quota/error | Library未激活；旧数据保留，无clear整库/备份复活通道 | D/C |
| J10 | blocked connection/versionchange | 旧连接退出、可恢复提示；不卸载/删库解决 | C |
| J11 | 旧frozen二进制打开v5 | fail closed；Git回退不伪称数据回退 | D/C |
| J12 | 隔离区内容关联Source purge | 旧Thought/revision也受fence与清理，不能从兼容reader复活 | D |

## K. Read model / search / scale

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| K01 | 1k/10k/100k Input + 1k/10k Entry | 按固定负载报p50/p95/reads/writes/bytes，不声称基于fixture真实质量 | D/C |
| K02 | 每Entry 1/3/10 Topic | 正文/revision/search正文索引不乘Topic数；placement计数正确 | D |
| K03 | Topic分页同时insert/move/merge | keyset绑定结构generation；失效重锚无静默漏页/重复；active editor稳定 | D/V/C |
| K04 | 10k fan-out stale/purge | 编辑事务有界、read fence即时、消费O(affected)，無全Thought扫描 | D/C |
| K05 | 中文/英文/单字/长句/type/topic/section搜索 | postings+join+最终正文复核；不漏dirty owner；结果定位完整路径 | U/D/V |
| K06 | Topic/Section rename &多Topic搜索 | 只重索引owner metadata，结果Entry去重 | D/V |
| K07 | 搜索index构建中/高频token/取消 | 明确未完整/继续检索；不能首批零结果冒称全库无命中 | D/V/C |
| K08 | 200KiB Entry/32KiB batch/byte cap | 按bytes而非条数控制；不截断后autosave覆盖完整正文 | D/V/C |
| K09 | 90天+20重要revision、热点长文 | ALL recent OR newest20 important；AI/人工窗口隔离；配额失败不删历史 | D/C |
| K10 | 普通edit/prune/index/Organizer同时进行 | 交互优先，短事务/yield；无网络在写锁内，无长任务冻结编辑 | D/C |
| K11 | continuous document accessibility | keyboard/IME/焦点、弱metadata、无卡片墙、Updates drawer关闭返回原焦点 | V/C |

## L. Provider / Credential / Budget / audit Foundation契约

以下14项全部属于v0.7.0，不依赖真实Provider/网络/secret。

| ID | 场景 | 必须断言 | 层 |
|---|---|---|---|
| L01 | 两个不同标识/版本/能力的fixture adapters切换 | core/UI不按厂商分支；Entry/Topic/Placement/revisions不重建，旧任务按binding重验 | U/D/V |
| L02 | 生产registry为空 / NoProvider / 未支持task schema | UI正确显示未接入，job paused/unavailable；完整Foundation数据/编辑/迁移可独立验收，无假AI正文 | U/D/V/C |
| L03 | NoCredential/FixtureCredential ready/missing/expired/revoked | 只neutral profileRef/status/opaque handle；未配置真实key也能运行fixture，撤销后无新请求或旧结果提交 | U/D |
| L04 | 混入Source/assistant/removed/tombstone/无关conversation或Topic | Gateway每层拒绝，context_only不提升为target，比较Entry只允许必要字段；输出审计无内容 | U/D |
| L05 | 8targets+2context/32KiB/4KiB context/48Ki估算/4比较Entry边界 | count、UTF-8 bytes、完整序列化estimate分别校验；超1项即queue/pause，无扩scope降门禁 | U/D |
| L06 | 多tab/worker同时reserve最后额度 | window检查/并发lease/reservation同事务，只有一个成功；active job/request各≤1 | D/C |
| L07 | session额度达到/换tab/worker restart/开始新session | 持久session不因worker重置；新session不重置daily；checkpoint保留，限额只暂停Organizer | U/D/C |
| L08 | daily边界/回拨/前跳后回拨 | 同window额度不重复发放，注入clock可复现；异常保守暂停，不扩大数据范围 | U/D |
| L09 | 重试/多stage/子任务绕过预算 | 每次Input呈现和全部请求bytes/estimate都记账；≤3 retries，总≤4；invalid output≤1修正且计总额 | U/D |
| L10 | reserve后未发/发出后timeout/crash/cancel/未知结果 | 未发可release，已发或未知保守消耗；恢复不复制额度/并发槽，不二次settle扣账 | D/C |
| L11 | budget exceeded或policy限额下调 | job queued/paused，安全读/删除/人工编辑继续；不清Library、不重扫全库、不自动上调预算 | U/D/V |
| L12 | 全部标准失败码 | unavailable/timeout/invalid/rate_limit/credential/budget映射retry_wait/paused/failed；逐字段对比证明Input/Source/已有Library不变 | U/D/C |
| L13 | 每次fixture请求的safeAudit与恶意descriptor/error | task/data categories/count/size/provider/model/version完整；无正文/标题/URL/sourceID/hash/secret/raw错误；未知descriptor拒绝不原样日志 | U/D |
| L14 | 无破坏Provider升级、usage归档、货币字段未配置 | 旧Entry/history/suppression/预算窗口保留；终态明细清理不返额度，monetary null不授权付费；未来adapter不要求实体重构 | D/V |

## 真实 Provider 质量 gate（v0.7.0.1 P1，非Foundation前置）

在接入批准后固定任务 schema/prompt/model版本，使用训练/调参集之外、人工标注的≥500个distinct输入，包含至少100个对抗/边界样本，按A类分层统计；不足样本的类别保持suggestion。报告高置信auto提交的grounded precision、类别precision、inferred错误自动率、合法内容遗漏率/覆盖率、来源跨度正确率；不要只报平均accuracy。推荐高置信auto grounded precision≥99%，并报告Wilson 95%置信下界（目标≥98%，样本不足不得宣称满足）；Source/Input修改、人工覆盖、无来源自动推断、已删除内容复活、scope泄露这几类必须观察零失败，否则阻断auto发布。

上述实测仅决定v0.7.0.1真实Provider能力是否可发布，不影响用确定性fixture完整验收v0.7.0 Foundation。fixture不宣称真实生成质量；单一固定小集零错误不证明生产零错误。未来真实质量gate之外，运行时仍逐请求验证。真实私人语料验收不由本矩阵自动授权。

## 报告模板与未执行声明

实施阶段每个milestone报告：代码checkpoint、冻结资源diff、合成case IDs/通过失败数量、Chrome版本/隔离origin、数据完全虚构的声明、数据库物理/逻辑版本、故障点、性能负载字节、实际p95、遗留风险。报告只含安全摘要；私人正文/标题/URL/摘要hash不可放进截图/日志/Git。

本轮M0检查范围：承接01a0130源码审计证据，更新最终GO决策、v0.7.0/0.7.0.1分期、三接口/预算/请求审计、144个A–L计划用例与文档一致性。**U/D/V/C/P均未执行新功能验收，因为本轮仍不编码。** M5实施验收通过后可判定v0.7.0 Foundation完整工程交付，P1另行推进。
