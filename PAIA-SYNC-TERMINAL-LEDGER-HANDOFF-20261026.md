# PAIA Sync 终态账本交接 · 2026-10-26

## 供 dot 使用的入口

交接分支：`codex/sync-terminal-ledger-handoff-20261026`。仅交付既有差额与工程证据，不是完整项目、main 合并候选或同步整体验收。

| 身份 | 完整 SHA |
| --- | --- |
| dot 原交接 | `14d6910303523021679e1b332a2265c4e1c2a221` |
| 包内 development-source 身份 | `4ca6121aba860856d749f2dc788a77e9c3eb8947` |
| 754 文件选择闭包的本地根快照 | `832fd2ac6c694a58821700cf831dc05500d7a9ef` |
| 本次实现 | `14d876ffb73f3e3308ed25fcc8c18808a184fe55` |
| 原验证证据 | `8a5b691ed1400484dba91a275775063971968621` |

**不要 merge 此交接分支或根快照。** 根快照没有完整项目和原 Git 历史，也不包含 workflow。只在 dot 当前准确源码上核对两路径补丁；HELD、旧候选和不相关改动没有作为本次实现交付。

## 读取顺序

1. [原报告与失败分类](work/terminal-ledger-contract-20261026/REPORT.md)。
2. [精确补丁](work/terminal-ledger-contract-20261026/terminal-ledger.patch)及[验证记录](work/terminal-ledger-contract-20261026/VERIFICATION.json)。
3. [coordinator 缺口、建议签名与调用点](work/terminal-ledger-contract-20261026/COORDINATOR-INTERFACE-DELTA.md)。
4. [原证据校验清单](work/terminal-ledger-contract-20261026/SHA256SUMS)；所有失败 TAP 保留。
5. [本次发布前 CI 检查](work/terminal-ledger-contract-20261026/PUBLICATION-PREFLIGHT.json)。

原证据提交中“未推 GitHub / remotePush: NOT_RUN”是当时状态，保持原文；本入口是后续发布交接。以实际远端 ref 确认是否发布，不能把文档文本当上传回执。

## 已交付差额与验证边界

实现仅修改 `extension/core/browser-native-sync/canonical-generation-task-ledger.js`，新增 `extension/tests/canonical-generation-terminal-ledger-contract.test.mjs`，126 增 / 3 删。实际现有 phased-Human publication 消费新终态 admission/receipt 校验，不是新建无消费者 helper。原消费者本来就保留整张 publication pending 预付；此前“已发生终态漏计费”的诊断已在报告更正。

最终定点 Node 22.23.3 / macOS arm64：22/22，645.066834 ms，无失败/取消/跳过/todo。20 项边界替身契约、2 项原 owner + 未改 Repository + fake-indexeddb；不是真实浏览器或真实账户验收。保留原基线 3/18 与各中间结果。此次仅发布与补文档，没有重跑测试、安装、构建、云 CI、Browser、Full 或规模验收。

`idb-repository.js`、coordinator、worker、AI、Settings/UI、Port、workflow、版本均未改。本次不需要 IDB hunk。整动作 selection 持久计量和阶段预留仍缺 dot owner 接口，不能据本补丁开放全局切库、移除原拒绝门或宣布 Sync 完成。

## 精确整合方法

补丁 SHA256：`8a3c7c071384a6f522e3a3bff1d24803be902c339bbe3aa909b5441072319cc6`。

原 ledger blob：`d05cef46829c5e2d2827a5b70bdc96c45e603a84`。原新测试路径不存在。对这两个前提的 `git apply --check` 已通过；dot 当前有新差额时必须逐 hunk 整合，不能覆盖文件或强套。

在独立整合工作树保存已有工作后，先核对：
```sh
git hash-object extension/core/browser-native-sync/canonical-generation-task-ledger.js
git apply --check /absolute/path/to/terminal-ledger.patch
```
只有基线和差额一致时才应用补丁；或在 fetch 后只 cherry-pick 实现提交 14d876ff，不 cherry-pick 根快照。证据按独立文档移交，不用证据分支带入全树。合并后的所属验证由 dot 在现有许可内安排，本次不新增验收额度。

普通 4096 refs / 2 MiB / 30 秒、原期限、不清 UNKNOWN、冷恢复只读、失败留存等边界不变。原 qualified-Human 特例未扩大或移用于普通 selection。
