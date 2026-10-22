# 候选成为当前 AI 阅读版本：一页实施契约提案

**PROPOSED / 未批准、未启用。** PR313任务6336391399-C；独立基线 `8715c310c9dbd8a366defe3e4f360c56908edc26`，分支 `codex/organize-current-contract-20261022`。仅本文；不改变权威计划或执行产品规则。依据：[AI_USAGE_ARCHITECTURE](../AI_USAGE_ARCHITECTURE.md) §10–11、[AI_ORGANIZE_STYLE_CONTRACT](../AI_ORGANIZE_STYLE_CONTRACT.md) §4–5、[Topic当前计划](../TOPIC_ARCHITECTURE_PLAN.md) 05.7、[#314](https://github.com/haohongfei2001-png/paia/issues/314)。保留其原授权、人工保护、原事务、4096读取/2MiB/30秒及费用规则。

**已有实现，复用而不重写：** `core/organizer/ai-presentation.js::editAIPresentation(candidateDecisions)` 经 `foundationWrite` 复验 revision、candidate key、材料/Source绑定、manifest及base generation，原子写派生版本、journal、精确checkpoint和operation receipt；`aiPresentationOperationOutcome` 可按同一操作/epoch查询结果。`ai-candidate.js::applyAIPresentationCandidate` 已支持首版/后继、adopt/keep及增量版本；**这不等于已授权自动全采用**。当前 `ui/ai-candidate.js` 明确只读，无采用/生成handler；`topic-workspace.js` 的现有生成/更新动作只报告candidateCreated。`ai-presentation.js` 的编辑器 UndoJournal用于字段编辑；版本历史目前可读，**没有因此证明整版本恢复已接通**。不恢复旧逐字段采用管理入口，不把hidden Topic formation candidate与AI阅读版本混为一物。

| 项目 | 已批准边界 | 建议合同（均待D1/D2确认后才编码） |
|---|---|---|
| 入口/意图 | 普通阅读切换、打开历史、年份/Section选择不写入；生成不隐含覆盖人工内容 | **方案A，推荐：** 复用现有“生成/更新AI整理”动作，点击前明确“成功后成为当前AI阅读版本，人工冲突不覆盖”，绑定本次Topic与完整candidate身份；已有合法候选只做本地发布，不发模型。**方案B：** 生成仍仅保存，另由获批的现有版本区域提供一次明确发布；具体入口必须由owner选择。两者都不能通过恢复退役Compare/Adopt按钮实现。服务/权限未就绪保持现状，不擅自解除现有可用性门。 |
| 采用单位 | 派生内容不是Source/Working/Entry正文，也不是耐久Section；可见年份不定义授权范围 | 一次已获授权、完整且精确绑定的**Topic AI派生版本**，内部复用changedFields/manifest，不把当前Section或可见片段伪装成完整Topic。无候选、部分/缺失证据、stale候选拒绝发布；不临时读取额外旧证据补齐。 |
| 人工/事务 | dirty/IME/保存未ACK、撤权、Source变化、保护冲突均不能覆盖；不变块与人工顺序保留 | 推荐全部拒绝，保留旧当前稿和合法候选；不把protected字段静默all-adopt，也不把逐字段keep混成“完整新版本”。沿原adoption事务保存版本、历史和receipt，原精确ACK条件继续。不得修改原手动采用的作者/保护语义来伪造自动发布资格；如需不同actor，单独审查原owner扩展。 |
| 取消/错误/未知结果 | 关闭或失效不接受晚结果；付费attempt/ledger保留，失败不重发付费请求 | 发本地commit前检查原action/route/currentness，原事务内最后CAS；失败显示未发布、旧稿保留。提交后回信丢失只查询同一operationId/epoch，不重新生成、不换操作重发；unknown保持未确认。已实际提交但界面退役时不更新新页面，也不自动回滚他人后续工作。拒绝码沿原安全映射。 |
| 撤销 | 原字段编辑undo继续；被删除或撤权的历史不得恢复；不退款、不退配额 | 推荐一次明确“撤销本次版本替换”，仅在当前版本仍是本次提交结果时，经原owner/历史/最终CAS原子恢复上个**仍合法**派生版本；首版则回到无当前稿。历史与计费不删。后来有人编辑、保护/权限/证据变化即拒绝并保留现稿。尚需接通的整版本undo属于待批准实现，不靠逐字段连写冒充原子撤销。 |

**批准后最小验收：** 首版/后继完整发布、重复同操作只一个receipt；全37表证明Source/Working/Entry/人类组织不变；任一人工保护/dirty/IME/Section切换/撤权/Source删除/晚返回均拒绝；commit前失败全部回滚；commit成功回信丢失只查询原结果且零模型请求；整版本undo成功、随后编辑/撤权拒绝、首版撤回；三风格/增量未变块与全部证据、真实Source/release native IDB及原预算负控。先原owner针对测试，再由dot安排合并候选完整检查，不以mock或旧SHA绿替代。本文无运行时变更，无测试/CI调用。

**最少待决：D1** 选择方案A还是B，并明确已有离线候选的发布入口/可用性边界；**D2** 是否采用“完整版本原子发布、任一人工冲突整次拒绝、同一版本CAS撤销”的组合语义。建议A+D2，均不是已获批准。跨来源仍保持现范围，关联/旧字段授权由dot补齐；自动Topic生命周期的政策版本、证据窗口/阈值和活动owner仍见#314；真实principal/consent/entitlement、合格model/template/tokenizer、可信endpoint与ledger仍默认拒绝，不用此提案开启。只读核对确认这些决策前没有可独立接通的新生产调用链；不为持续开发添加其他功能。
