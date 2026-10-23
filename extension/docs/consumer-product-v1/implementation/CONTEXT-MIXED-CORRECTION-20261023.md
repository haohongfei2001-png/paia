# 同 Topic 当前混合材料的 Context 人工修订

基线 `f4180c5e`，前置 `eb031c23`。只补现有有效计划内当前已明确选择材料的组合消费，不扩展权限、源范围或历史正文读取。

## 原 owner 证明与有限实现

真实原 TopicFormation / editEntry / placeEntry 建立 Input mirror 与人工字段；真实 createEntry 建立 source-free 人工 Entry，并经原人工成员 owner 放入同一 Topic。原 ContextMaintenanceService 已可在同一个 Context 中接受上述独立证据，原 ContextCards edit 和 remove→restore 也都有效。旧 correction 仍按族互斥：plain+authored 与 bound+authored 的两种原操作合计 0/4，均 DEFERRED，未调 provider。原始结果在 baseline.tap。

本包只组合已有合法 owner：同 Topic、同 binding、总 evidence 1–16；所有 Entry ID 与 Input ID 唯一，Bound Entry 必须具备同 Topic 的唯一完整 Input body，人工 Entry 保持 source-free typed evidence。允许额外独立完整 plain Input body，也允许多个 authored/bound 原 owner。每一家分别进行 qualification 与 material grant，原 session 的既有数组路径、原 Source closure、Context receipt、保护、ACK 与 terminal facts 不改。

DTO 保留现有字段，精确核对全部 ID 集合、单一 Context coverage、逐原 owner 的所选字段、同 Topic 和总规模；人工 Entry 不能伪装 Input，Bound 的 note/title 不能借 Input grant，反之亦然。原人类 Context 由原 owner 保持 NO_CHANGE，原文、人工字段、归属不被 AI 改写。

## 验证与边界

- 原实现 0/4，保留实际旧 DEFERRED。
- 修复后首次针对 2/4：plain 两例实际已经 COMMITTED，但新测试误认为省略的空 `boundEntries` 必有数组；修正断言。下一针对 38/40 中同两例又在省略的空 `entries` 断言失败，再修正测试，不改变生产代码。
- 修正及额外 plain/DTO 边界 5/5：plain+authored edit/restore、额外 plain 与 bound（有/无 authored）、全部三族完整 DTO 集合。所有中间结果单独保留。
- 实际负控涵盖各家的授权缺失、完整历史/人工字段缺失、provider 与原 backup finalizer 尾部的 Source/Input/author 字段/历史/同数成员替换/receipt/撤销、原 source response adapter、ACK 回滚后保留响应单次 provider 重放。
- 原 owner 建立跨 Topic Context 后，correction 仍在任何 material grant 前拒绝；invalidated 也拒绝，无旧正文读取。
- 最终 14 文件完整所属批次 1052/1052，exit 0，TAP 92500.453666 ms，无 fail/cancel/skip/todo，前后源码向量相同；见 evidence 的 owning.tap、command.json、exit.json 和前后源码向量。未执行 native/browser/build/云/Full。

## 后续范围

本包 compound plain 字段固定完整 body。纯 Input correction 的既有 body+note / note-only 路径不变；与 Entry 家族混合的 Input note 尚未在本包资格化。结构 lineage（Section/Topic）单族已有原 owner 闭环，结构与人工 Entry 混合仍拒绝。跨 Topic 联合选择、invalidated 旧文本、真实用户数据与服务语义不因本包而授权。Node 正确性不代表 native 或 Linux 性能、容量及最终验收。
