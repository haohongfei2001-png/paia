# PAIA 七计划当前源码只读对账 — 2026-10-25

## 范围与结论

只读检查父任务提供的独立 checkout `work/final-development-takeover-20261025/checkout`，Git HEAD `b7c6ecd`；其前一个开发提交为 `27ddcd1`（三项 Settings），再前为 `510d2c7`。本报告没有访问网络，没有测试、构建、浏览器、安装、运行时修改或候选应用。附件完整性/远端身份由 root 单独核验。本报告不对未执行检查给 PASS。

以用户此次本地完整接管、已批准的七计划及最新已发布源码为准。`extension/AGENTS.md` 和 `MASTER_PLAN.md` 顶部仍主要保存 10 月 17/18 日检查点；`STATUS.md` 顶部仍保存 10 月 24 日早期本地消费者检查点。旧 Sync 暂停、原负责人及旧缺口文字不能覆盖用户后续明确解除本地暂停或 dot 的实际已发布增量。`work/dot-cloud-takeover-20261024/QUEUE.md` 的后部提供较新增量，但最后“Settings 尚未发布”也已被 `27ddcd1` 覆盖。建议 root 更新一个新的接管入口指向本次精确树，不改写这些历史证据。

**选定下一条主线应是已有库安全激活的 Context 冷状态/UNKNOWN/enrollment 闭环，同时独立推进失败 Source 后续发布的最小修复。** 这是产品完整恢复的确切未完成消费者；无需重写已存在的 Context、Sync、Prompt 基础。父任务已安排这两线，本报告不另开同文件任务。其它可并行工作优先做本次源码/已验证范围/真实外部条件映射与受限验收准备；本次只读未证明新的独立 Archive/Settings/R3 运行时缺陷，不能为并行数量凭空造修复。

## 已替代的缺口：必须保留现有实现

1. **不能再报告 reconcileTail 未接到 recovery-session。** `extension/core/browser-native-sync/recovery-session.js:74–104` 已有 ordinary Source/Working family 和 purge-only negative family 的真实因果 tail 分类、完整原始 graph/revision 校验、逐步原 owner `reconcileTail`、durable stage checkpoint 和同一 work ticket。`53–59` 原 Store queue 等待也已实现。原来的“所有 tail 均缺消费者”已过期。
2. **不能报告所有不可比较头完全不支持。** 同文件 `245–265` 已支持恰好两个同一直接父、完整独立 Source-bootstrap sibling 的有限 union；保留所有历史 revision，返回原私有 union selection/proof。`248` 和 `267` 对其它形状仍拒绝；一般多分支冲突、union 后后续 Source 新增/编辑并未由此解决。队列 144–152 行记录 `6668b38` 已发布这一范围。
3. **不能再开发一套 Prompt durable receipts。** `extension/background/prompt-insertion-receipts.js:74–92` 已在物理 dispatch 前保存 body-free pending；receiver 精确身份、same-domain、500-claim/512-KiB retained /128-KiB admission、原 action/event work ticket、16条恢复 ACK、pending/UNKNOWN 不驱逐均存在。`extension/background/service-worker.js:79,246–249` 已真实构造并路由；`extension/adapter/chatgpt-composer.js:284` 在原 composer guard 前执行 QUALIFY。不是 fixture-only owner。`6668b38` 的128文件2744/2744是发布证据，旧 report 的“unpublished”是历史。
4. **Assist/Next warm-task 持有并非缺失。** `extension/background/prompt-assist.js:185–199` 与 `prompt-next.js:250–264` 已追踪真实任务、原会话 hold/fence/release 和 sticky insertion UNKNOWN。map 清空不再被当静止。仍缺完整全局消费资格，不能用这些局部 token 解锁 selection。
5. **三项 Settings 不重做。** `27ddcd1` 已改 `settings-feedback.js`、`settings-details.js`、`settings-preferences.js`，保留原216/216和260/260证据。后者 `presentSettingsPreferences`（143行）和 group intent owner 保持关闭/新导航意图。`510d2c7` 已有 pending 中 Sync Pause/Disconnect 安全可达；`06910cd` 已有 Context post-dispatch focus/typing/selection/Undo 完成保护。
6. **Topic identity 不是无底层。** `topic-lifecycle-policy.js:3–14`、`topic-lifecycle-consumer.js:4–24` 已有显式版本化策略、单任务所有权、clock regression、原 meaningful activity；`core/ai-usage/topic-identity-source-processing.js:33–89` 是原 identity + field/body 双资格路径。`1632908` 发布了默认关闭的实现；合成 grant/handle 不等于生产 issuer/同意。

## 七计划对账

| 计划 | 已有实现，保留而不重做 | 当前确切本地工程缺口 | 仅原生/外部/验收缺口与依赖 |
| --- | --- | --- | --- |
| Topic / Thought（TOPIC-01–06） | 原 Root/Section/Entry/年阅读、完整人类编辑/恢复、Source/Input consumer、保存 AI/Current及 typed lineage；默认关闭的 lifecycle policy/dispatch/identity双资格。原引用 `core/topic-lifecycle-consumer.js`、`core/ai-usage/topic-identity-source-processing.js`；新版 queue79–85。 | 生产路径 genuine structural prepared-handle acquisition 仍未资格化，不能以合成对象接通；这一项应接原 worker/field owner，不重写完整 lifecycle。20Topic184祖先超过128的旧报告是历史风险，只有精确当前复现或新源码证据才可宣称仍在/已解决；本次未重跑。 | 真实许可/issuer/观察窗口与新权限选择；真实模型语义、完整视觉/使用。已有默认关闭实现可本地继续，真实启用独立决定。 |
| Context 四卡（CTX4-01–07） | YEAR-HARMONY 四卡、搜索退役、人工Item/CAS/IME、qualified query/full-read、原维护 owner；`548983c` pre-delete/connection UI与 `06910cd` completion保护已发布。 | 正面 cold Context hold/enrollment、遗留/未知曝光与插入证据对全局静止的处理、完整 Source→Working→Human→automatic Context因果恢复及其消费者尚未闭环；附件未独审候选不可直接合。此主线由另一线负责。 | 真实受控 bridge/client 完整读取/撤销、物理 IME/Source+Release、全部22状态/20-50-144Topic完整范围、当前设计和真实效果。native準备17 pure tests 不是17 native，8产品native仍 NOT_RUN/NOT_READY。 |
| Settings（SET2-01–05） | 六组22动作与原偏好/同意/恢复/辅助页面；external authority失效、Sync pending stop、feedback焦点/监听、detail close lifetime、最新分类意图已发布。三项修复不重做。 | 现有库 selection 的 ACTIVATE/CONTINUE/RESTART 被 `background/application-selection-commands.js:22` 精确拒绝，缺的是**消费真实完整 editor/source/host quiescence证据**，不是再造 UI。必须依赖 Context/receipt全局闭环后接通。 | 原260合成通过不能证明实际浏览器焦点/剪贴板/IME/六组所有恢复情况；desktop/narrow/dark/200%/真实支持系统和真实账号恢复独立。 |
| AI Usage（AI-COST-01–07） | 原 Semantic Delta/job/ledger/subset ACK、OrganizeCurrent/保护、Maintenance有限 facets、Assist原会话settlement、签名服务/HTTP/SQL默认关闭模块均存在。`assist-service-configuration.js:4`、`organize-service-configuration.js:4`、`maintenance-service-configuration.js:4` 明确 return null。 | 原 source settle 与 durable receipt已经有实现，后续工作是完整 consumer/global accounting/UNKNOWN 组合资格，不可再次造账本。既有明确不支持facet须逐项按原请求owner确认，不能把 broad“AI尚未完成”当新模型/私密读取授权。 | actual issuer/entitlement/profile/tokenizer/endpoint/SQL/真实模型cost-quality及billing。按 `AI_USAGE_PLAN.md:126` completion taxonomy 分开，本地机械工程不需先启付费服务。 |
| Prompt / NIB / Stage3A | R3实际 `core/prompt-surface-layout.js:8–23` 已是48anchor、328board、272×48 capsule；Family/manual/Archive快速复用/Next原无Send路径保留。原插入durable receipt与receiver/producers已发布。 | 全局 selection消费、旧/冷/UNKNOWN插入关闭资格仍未完成；不把新 prospective receipt当旧失败自动补证。无需恢复旧 Popup、重新做B/R1/R2或另一插入引擎。此缺口与主线共享owner，不能独立放宽。 | actual host Source/Release/no-send/undo/IME、真实视觉R3、native latency/120Hz/持续使用；S3真实service权益/预算资格。 |
| Input Archive（IAH当前年阅读） | 原 main-app唯一检索、source-aware query、bounded annual reader、Back/exact target、Working editor、freeze注册。代码拥有者 `ui/archive.js`、`archive-year-requalification.js`、`reader-navigation.js`、`continuous-root-reader.js`，不重建旧Home或Reader搜索。 | 本轮未找到可独立证实的新 Archive runtime gap；主要当前依赖为恢复后的真实新freeze/Sync inherited data交互，随完整恢复主线检查。不要把尚未验收等同缺代码。 | full reader/date/order/unknown dates/长文本/原生undo/IME/搜索→精确目标→Back及恢复交互；大数据/视觉新执行额度单列。 |
| Browser Native Sync（SYNC01–06） | Core/grouped/source+working+human、Saved/Prompt/Context有限组合、合法tail/negative continuation、empty enrollment、两Source sibling union已发布。旧“互斥单Source/Human/缺Prompt底层”不能复活。 | 普通general incomparable head冲突/更多family合法tail、两Source union后新增/编辑与后继发布、完整 existing-generation继承/反向、automatic Context正面冷恢复、global hold/drain consumer；参数profile完整恢复闭环证据仍缺。Source主线由另一线审阅原FAIL。 | 64/256/1024KiB×1k/50k/500k矩阵是受限资源验收，不可擅跑；Chrome/Edge真实OAuth/新独立设备/CloudKit containing-app/签名/账户/发布均外部。所有129groups/Full/100k机会维持已消耗。 |

## 主线实施顺序及可以独立完成的准备

1. 核完整附件与当前published tree后冻结精确开发基线。reviewed published代码直接复用；Context/Sync未复核patch逐项解释实际反例、owner与依赖，不能整包应用。
2. Context 冷状态/UNKNOWN/enrollment先保留 fail-closed，形成一个可以供 selection 使用的真实原owner证据链。最终 consumer 必须考虑 `application-selection-commands.js:43–51` activity drain不能等待自身、所有入口先hold、后fence及失败release。不能直接移除22行拒绝。
3. 并行修 Source continuation：先区分已支持同父2sibling union与未支持后续新增/编辑，原失败实验保留；以原唯一work ticket和完整因果历史为验收点，不用“只要拒绝就通过”替代必需恢复。
4. 本次可独立准备**验收来源矩阵/源码向量**：把已发布151/3234、Context16/426、SyncUI89、Settings260等准确绑定对应提交；prepared138未跑、17pure不算native、旧build不对应本次head。这是集成准备，不制造重复运行。参数profile矩阵先写精确corpus/预算/停止条件提案，不能启动规模测试。
5. 待上述完整consumer稳定后进行一次有意义的小型本地组合/构建/允许的原生验证；现有预算或一次性额度不自动继承给新运行。所有计划仍 NOT_COMPLETE。

## 真正需要用户决定的事项（集中，且不阻塞独立本地工程）

- **额外读取与生产 Topic policy/issuer**：新增cross-source旧Input/Entry/Source正文读取仍需精确字段级独立处理授权；既有默认关闭双资格不授予它。若生产自动生命周期引入新同意、后台节律或真实grant，要给版本、触发、窗口、撤销、restart、保护及停止条件；不能按旧文档一句“待dot”永久搁置本地工程。
- **超已批准预算/耗尽验收额度**：当前 ordinary4096refs/2MiB/30s不变；一次129恢复例外已耗且整体FAIL。大矩阵、Full/cloud、原规模seed或C/phase重跑需新的有限预算与停止条件。当前没有授权自动调整18m/10jobs，也不是永久产品设计。
- **真实外部启用**：具体账户/身份、模型/服务/region/retention/秘密位置、金钱预算、数据库/部署、CloudKit app签名、安装和真实数据访问。可以完成源代码、合成契约、失败恢复准备，但不能伪造这些真实资格或以“整个计划授权”扩用。
- **实际人类/设备验收**：R3/四卡/Settings精确视觉、physical120Hz/IME和真实设备使用须明确可用设备/交付候选及执行范围。现有原型或fake DOM通过不提供该证据。

没有发现“必须请用户重新批准三项Settings”或“必须等待dot指令”的理由；本次用户已明确完整本地接管。
