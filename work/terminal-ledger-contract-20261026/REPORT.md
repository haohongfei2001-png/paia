# CPV1-SYNC-01 终态账本契约加固交付

2026-10-26。仅本地开发；不是同步整体完成、真实浏览器验收或 main 集成。

## 精确基线与接收

用户指定交接分支 `handoff/dot-to-codex-sync-20261026` / `14d6910303523021679e1b332a2265c4e1c2a221`。36 分片校验、18,737,881-byte ZIP SHA256、包内 2228 项 SHA256 和 2222 个原始 Git blob 全通过。ZIP SHA256 为 `be1fb2882a114d702c021ffd965f7b67b2103f9bd1cf70d4c8a3a2ff98a0d1d9`。

采用包内 `development-source` 精确选择闭包，源提交身份为 `4ca6121aba860856d749f2dc788a77e9c3eb8947`，并非取得该提交的完整 Git 历史或全项目。独立仓库的本地快照基线为 `832fd2ac6c694a58821700cf831dc05500d7a9ef`；不得将这个根快照提交合并到 main。HELD/history 未作为运行时代码导入。原解包及其他工作树均保留。

本地分支 `codex/sync-terminal-ledger-20261026`。实现提交 `14d876ffb73f3e3308ed25fcc8c18808a184fe55`，仅两路径：
- `extension/core/browser-native-sync/canonical-generation-task-ledger.js`：现有账本 21 行差额。
- `extension/tests/canonical-generation-terminal-ledger-contract.test.mjs`：新定点测试 108 行。

精确 `terminal-ledger.patch`：126 additions / 3 deletions。对原始文件及缺失新测试路径的 `git apply --check` 已通过。不要将补丁套在未知后续版本上；先核对原文件 blob/差额。

## 更正先前诊断

先前只读审查曾认为 terminal=true 清 controlPending 会漏记终态事务。进一步沿真实消费者核实，该说法不成立：`canonical-generation-phased-human.js` 原消费者以整张 publication pending 的 bytes/ms 调用 `originalGenerationTaskSettle`，保留全额 publication 预付；publication 与 Repository 已将实际准备/事务/尾审限制在该原 envelope 内。

本提交修复的是账本边界缺少强制一致性校验，不是已证明发生过的丢账，也不是普通 selection 整动作持久化完成。原始失败、前述更正与未完成状态保留。

## 已实现及真实接线

现有 `CanonicalGenerationPublication.sealOriginalPhasedHumanCheckpoint` → 原 phased-Human activation → `prepareOriginalGenerationControl(... terminal:true)` → 原 Repository 提交/尾审 → `completeOriginalPhasedHumanPublication` → `completeOriginalGenerationControl` 路径直接消费新检查，没有新 helper 或替代发布入口。

终态 admission 必须来自原 version2/applying/publication pending；after 必须精确等于原 pending 全额保留后的 verified 行。拒绝无 before、错误阶段/种类、减少 bytes/ms、改票数/burned/transport、旧版本及大于30秒的 duration。此检查发生在结算旧 control debt 之前；原合法 control receipt 的退款规则原样保留，不额外扣费或减费。

完成检查使用现有 `readOriginalCommittedTransactionWork` 原 scope 回执，对照复制并冻结的 publication envelope，检查 bytes、references<=4096 和 activeMs。先校验再消费 plan/receipt；越界后不能再标成功。此检查是 **提交后回执一致性检查**，不声称回滚已提交事务；拒绝不会产生新的写入、期限或额度。

全部额度常量不变。原普通 4096 refs / 2MiB / 30秒不变；既有 qualified-Human 特殊 profile 没有扩展，也未移用到普通 selection。新增验证没有运行129组、浏览器、云或Full。

754 个开发闭包原文件比对，仅上述账本文件改变。`idb-repository.js` SHA256 `9dfbfb085063b096d2f45ee34ac9eab114197e371eae038b73c6cd4dc9b3c811` 前后相同。本次不需要 IDB hunk。worker/coordinator、AI、UI、Port、workflow、版本均未修改。

## 实际验证与失败保留

环境：原已下载 Node22.23.3，macOS arm64；未安装依赖。精确命令在 `VERIFICATION.json`。

- `baseline.tap`：3/18，15 fail。14 项证明旧账本缺少新边界检查；另1项是新测试的冷重开错误选用 ArchiveRepository（版本低于 LibraryDocumentsStore 的 schema），不是产品故障。已仅修正新测试为原 LibraryDocumentsStore。
- `after.tap`：18/18，运行时检查与冷重开夹具修正后。
- `final.tap`：21/21，增加旧 control debt、丢失回执与旧版本测试后。
- `final-duration-guard.tap`：最终22/22，0 fail/cancel/skip/todo，645.066834ms；增加30秒边界后。不能将四次合成一次结果。

最终22项：20项只替换 Repository 权限/回执边界的合成契约测试；2项使用未改 Repository、原 stage/restore/publication owner 和 vendored fake-indexeddb 的一组 Human 集成测试。成功路径实际经历准备、预留、发布、结算、持久行读取及冷重开；失败路径在原终态 task put 注入失败，验证事务回滚、原 pending 完整保留和 registry 未发布。均非真实 IndexedDB/浏览器或账户验收。

独立差额审查（gpt-6-astra/ultra）未发现新增阻断；未重复运行测试。另加30秒防御性校验后重新执行上述最终定点文件。没有旧 Full、Browser 或规模回归。

## 剩余阻塞：selection 整动作持久账本

当前 scope 的真正完整计量仍由只读的 `extension/background/application-selection-reservation-coordination.js` 私有 r.references/r.bytes/deadline/pending 等持有；IDB 单 scope 回执不含 admission/member/native/local/preparation 的所有成本，不能相加伪造整动作累计值。

下一项需要该 coordinator 原 owner 提供：
1. 绑定原 action/operation/owner/原 deadline 的不可伪造只读 accounting/settlement 回执，包含所有计量来源及未决 SDK/transaction 状态。不能重新起钟、退款或清 UNKNOWN。
2. 将账本持久化、finalizer 与终态检查纳入原 phase admission/prepayment；仍受原4096/2MiB/30秒限制。不能 consumer 自行扩 phase、用布尔 ready 或固定虚构成本代替。

上述文件由 dot 负责，本次不写。用户维持文件分工，因此不能越过 coordinator 造一个孤立账本或仅改 IDB 冒充接通。接口具备后才能继续普通 selection stage/lease 与冷只读消费者整线开发；原冷观察协议、过期拒写与 UNKNOWN 保留不变。这里只提供准确接口依赖，不将未实现接口冒充可套用 hunk。

## 状态与恢复

- 已实现：原终态 ledger admission/receipt 契约加固及真实现有消费者接线。
- 仅本地验证：22项 Node 合成/原owner fake-IDB，精确补丁可应用检查。
- 未验收：真实浏览器、跨平台、整条同步、整动作持久账本。
- 需协调：上述 coordinator 接口；非申请扩大预算、重跑云验收或开放冷写。

交付时远端 main 已前进至 `d4d45db78a2e0f9b72102d4e27ce8f3171d456ab`；本地主 main 仍 `5dcabcab23545583da0afe22e965ecf47f1e6c0f`。未核新 main 内容，不推定其检查结果；原 main 检查修复由 dot 负责，本线未合并/重基。主工作树 tracked/staged 干净且原4 stash身份不变。

恢复：在本独立仓库继续即可；需要移交时只交 `terminal-ledger.patch`、本报告、VERIFICATION及日志。不要合并整个快照根提交。当前仅本地提交，未推GitHub、未触发任何CI。
