# 候选成为当前 AI 阅读版本：一页实施契约提案

**PROPOSED / 未批准、未启用。** PR313任务6336391399-C；原提案 `796c88c9e3d681cd3a61ecdbb0596b0cf5653218` 基于 `8715c310c9dbd8a366defe3e4f360c56908edc26`。本次按[独立审查6338604880](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6338604880)在 `codex/organize-intent-contract-correction-20261022` 修正文档，直接父提交为原提案；原历史保留。仅本文；不改变权威计划、授权或运行时。依据：[AI_USAGE_ARCHITECTURE](../AI_USAGE_ARCHITECTURE.md) §9–11、[AI_ORGANIZE_STYLE_CONTRACT](../AI_ORGANIZE_STYLE_CONTRACT.md) §4–5、[Topic当前计划](../TOPIC_ARCHITECTURE_PLAN.md) 05.7、[#314](https://github.com/haohongfei2001-png/paia/issues/314)。保留原授权、人工保护、原事务、4096读取/2MiB/30秒及费用规则。

**已有实现，复用而不重写：** `core/organizer/ai-presentation.js::editAIPresentation(candidateDecisions)` 经 `foundationWrite` 复验 revision、candidate key、材料/Source绑定、manifest及base generation，原子写派生版本、journal、精确checkpoint和operation receipt；`aiPresentationOperationOutcome` 可按同一操作/epoch查询结果。`ai-candidate.js::applyAIPresentationCandidate` 已支持首版/后继、adopt/keep及增量版本；**这不等于已授权自动全采用**。当前 `ui/ai-candidate.js` 明确只读，无采用/生成handler；`topic-workspace.js` 的现有生成/更新动作只报告candidateCreated。`ai-presentation.js` 的编辑器 UndoJournal用于字段编辑；版本历史目前可读，**没有因此证明整版本恢复已接通**。不恢复旧逐字段采用管理入口，不把hidden Topic formation candidate与AI阅读版本混为一物。

**审查纠正：** 字段级人工保护、最终 revision/Source 检查、原子提交和失败保留 Current 已是要求，不等待重新批准。原提案把整版本 Undo、历史候选晋升、额外发布入口与这些要求合并为 D2，并称没有其他可执行链路，范围过宽；撤回这一通用前置条件。当前仅“新请求的结果是否及如何成为 Current”的运行时接线继续暂停，等待精确意图边界；不以可选范围尚未决定冻结其他已有明确授权的增量工作。本审查评论本身不授权新运行时。

| 项目 | 已批准边界 | 待澄清或独立可选范围 |
|---|---|---|
| 本次明确新请求（D1） | 现有 UPDATE_AI_PRESENTATION 保存 candidate 并保留 Current；普通阅读切换、打开历史、年份/Section选择不写入；生成不隐含覆盖人工内容 | 需明确：现有“生成/更新AI整理”动作是否仅生成候选，还是其明确意图同时覆盖**本次请求精确绑定的新结果**成为 Current。后者仍需原 scope/action/currentness 和最终人工保护校验，不自动覆盖人类内容；不能借此认领旧候选。具体意图未定前保持现状，不默认加入第二入口。 |
| 历史/离线候选 | 有效缓存和历史可读不等于已获本次发布授权；授权、Source合法性、revision、candidate key仍独立复验 | 历史或离线候选晋升是独立可选范围，不能继承另一次新请求的意图。若将来批准，另定候选身份、明确入口和离线可用性；本地采用不增加模型请求，但“不花钱”也不授予内容写权限。它不是新请求接线的必需前置功能。 |
| 发布范围 | 派生内容不是Source/Working/Entry正文，也不是耐久Section；可见年份不定义授权范围；增量未变块与全部证据保留 | D1需精确绑定本次已获授权结果的范围与身份，不把Section或部分覆盖伪称完整Topic，不临时读取额外旧证据补齐。不把“完整版本替换”预设成唯一发布单位；其与现有增量changedFields/manifest及保护规则的关系须由明确合同限定。 |
| 人工/事务/作者 | dirty/IME/保存未ACK、撤权、Source变化、保护冲突均不能覆盖；最终校验和原子提交失败保留 Current；不变块与人工顺序保留 | editAIPresentation(candidateDecisions) 记录用户决策，原aiJournal的actor为user。其CAS/receipt机制可参考复用，**调用它不构成自动作者授权**；不可静默all-adopt、伪造用户决策或更改保护语义。精确人工冲突的拒绝/保留依原合同，不将整版本全部拒绝当作新批准的通用策略。 |
| 取消/错误/未知结果 | 关闭或失效不接受晚结果；付费attempt/ledger保留，失败不重发付费请求 | 发本地commit前检查原action/route/currentness，原事务内最后CAS；失败显示未发布、旧稿保留。提交后回信丢失只查询同一operationId/epoch，不重新生成、不换操作重发；unknown保持未确认。已实际提交但界面退役时不更新新页面，也不自动回滚他人后续工作。拒绝码沿原安全映射。 |
| 可选整版本撤销/额外入口 | 原字段编辑undo继续；被删除或撤权的历史不得恢复；不退款、不退配额；不恢复退役Compare/Adopt控件 | 整版本Undo和额外发布界面分别是待批准的可选范围，不是D1接线的通用前提。若以后选择整版本Undo，可评估同一结果版本CAS恢复仍合法前版（首版回到无当前稿），但不能称其已实现或已批准。人工编辑/权限变化后的保护仍需独立验证。 |

**D1明确后按批准范围验收：** 本次新结果与历史/离线候选严格分离，不伪造candidateDecisions或user作者资格；首版/后继及原增量结果保持精确范围，重复同操作只一个receipt；全37表证明Source/Working/Entry/人类组织不变；人工保护/dirty/IME/路由失效/撤权/Source删除/晚返回遵循原拒绝规则；commit前失败全部回滚并保留Current；commit成功回信丢失只查询原结果且零模型请求；三风格/增量未变块与全部证据、真实Source/release native IDB及原预算负控。只有另行批准历史晋升、额外界面或整版本Undo时，才增加各自实现和验收；不把它们计入本次新请求的必需通过项。先原owner针对测试，再由dot安排合并候选完整检查，不以mock或旧SHA绿替代。

**本接线最少待决只有D1：** 本次明确生成/更新动作对其精确绑定的新结果授予什么发布意图和范围；历史/离线候选不随之授权。旧D2不再作为组合前置条件：现有安全要求继续执行，整版本Undo、历史晋升、额外发布界面分别留作可选范围，不要求现在做决定。跨来源仍保持现范围，关联/旧字段授权由dot补齐；自动Topic生命周期及真实principal/consent/entitlement、合格model/template/tokenizer、可信endpoint与ledger仍见#314，不用此文开启。其他有明确授权和证据的独立工程工作可继续，不能由此文推定全部开发阻塞。

**本次验证与交接：** 在原提案基线上重读当前权威合同和实际UPDATE_AI_PRESENTATION/candidateCreated、editAIPresentation/candidateDecisions/user journal调用链；远端main核对为4349189451821db1e408a669cee5b64b140844f6，原提案远端仍为796c88c9。仅本Markdown改动，链接和diff静态核对；没有测试、构建、CI或模型调用，不改变PR313验收分支。运行时接线仍暂停，Linux Search诊断及整合由dot负责；历史MEMORY_STALE/STALE_BASE仍UNKNOWN。
