# 同 Topic 多组 Input 与 Bound Entry 的 Context 人工修订

基线 `eb031c23df9b680dcde99db73cd232450e1294f0`。本包只补当前已授权材料的消费闭环，不改变原 Context lineage、持久化、Sync 或真实服务权限。

## 原缺口与实现

真实原 TopicFormation 创建两组完整 Input mirror Entry，原 editEntry 独立写入 title/note，原 placeEntry 确认成员。原 ContextMaintenanceService 能创建两组复合 evidence 的 Context，随后原 ContextCards 的 edit 和 delete→restore 均产生有效人工修订；旧 correction mapper 仅允许一对，所以两例实际 `DEFERRED`、无 provider、无 ACK（baseline.tap，0/2）。

现在只接受同一个 Topic、同一个完整 binding 中 1–8 个独立配对：每个 Bound Entry 有唯一完整 Input body，所有 Input/Entry ID 唯一；最多 16 条 evidence，沿原 owner 上限。逐 Entry 复用 readBoundEntryContext 与精确历史/字段/成员证明，逐 Input 使用原完整字段和 Source qualification。原 session、adapter、终态围栏已有数组语义，因此没有新增共用框架或改写事务。

DTO 要求 Input、mirror Entry、boundEntry 及 Context correction 的各 ID 集合精确闭合，单一 Context coverage；禁止额外 Topic coverage、结构、人工 Entry 族、Input note 借权或缺失配对。人类 Context 内容与 Entry/原文/归属保持原样，原 Context owner 返回受保护 NO_CHANGE，并在原事务写入独立 receipt/ACK。Topic facet 不在本包放行。

## 验证

- 旧实现真实 owner 负控 0/2；修复针对 2/2。
- 扩展针对 38/38，包含原 edit/restore、8 pair 上限、第二 pair 的独立 qualification/payload 授权、provider 与 backup finalizer 阶段来源/正文/人工字段/历史/成员/撤销漂移、原 source response adapter 正负、ACK 原子回滚与单次 provider 重放、精确 DTO 与失效 lineage。
- 9 pair 超过原 16 evidence 的拒绝另加入完整所属批次，保持原 owner 拒绝，而不是放宽上限。
- 最终 14 文件完整所属 Node 合批 1009/1009，exit 0，TAP 70237.306209 ms，无 fail/cancel/skip/todo，源码前后向量相同；结果见 `work/context-multi-bound-correction-20261023/owning.tap`、`exit.json`、`command.json` 和前后源码向量。无 browser/native/build/云/Full。

## 仍未覆盖

本包不是跨 Topic、混合 authored/bound/plain family 或 invalidated 历史内容的通用放行。跨 Topic 与 invalidated 仍拒绝；合法混合材料作为下一有限包继续，必须保留每个族独立的原 owner 与字段授权。Node 正确性不代表原生性能、Linux 容量或最终产品验收。
