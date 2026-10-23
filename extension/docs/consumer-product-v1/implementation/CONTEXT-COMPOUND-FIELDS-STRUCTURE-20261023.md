# 当前 Context 复合证据的完整字段与 Section 接线

基线 `fd149522`，前置 `f4180c5e`、`eb031c23`。这三个既有报告仍是各自冻结测试记录；本报告覆盖其后有限接线与新的验证，不把前一阶段的拒绝边界误当永久产品规则。

## 真实合法前置

原 ContextMaintenance owner 已能创建以下当前已授权 lineage，且原 ContextCards 能编辑或恢复它们：

- 完整 Input body+note 或 note-only，与同 Topic source-free authored Entry 分别授权；bound Entry 必须额外保留其独立完整 Input body，因此 bound+note-only 不合法。
- 一个原人工改名 Section 的全部纯 Input mirror 成员，与同 Topic 的额外 plain Input、独立 bound 人工字段及 authored Entry 组合。测试把结构成员放到单独 Section，其他 Entry 在同 Topic 的其他成员位置，未伪造结构 owner 或清掉人工保护。

旧 mapper 对上述 8 个实际合法前置全部 DEFERRED（baseline.tap 0/8）。修复后针对 8/8。此前所有 Source、字段、历史、scope 和 budget 要求仍在。

## 最小完整差额

1. `context-correction` 消费原有效 typed evidence，并精确核同 Topic/完整 binding、唯一 Input/Entry、总 16 evidence；每个 bound 仍必须包含 body 的对应 Input；结构 evidence 必须为单一原 Section 或 Topic、所列全部成员有同一结构证据，结构成员仍只能 body。未注解的其他 Input 可按原明确选择 body、body+note、note-only。
2. 原 authored/bound/structural 读取 owner 各自验证，完整源集合与终态围栏原路复用。只读资格选择从实际带结构的 evidence 取原结构，不假设第一条必为结构。
3. 原 session 对 Context item 优先使用该项全部明确 evidence 的 Input 集合。旧代码先走结构分支，只会取 Section 成员，漏掉该 Context 中其他明确选择的 Input；新顺序不向任意 Topic 枚举扩权。
4. DTO 精确核全部 Input、author、bound、structure 的集合及原 mirror Entry 联合，结构只允许一个且主题一致，单 Context coverage。结构成员 Input 仍禁止附带 note；其他 note 必须通过既有完整 `inputFields` 校验。未改持久化、Sync、服务 schema 或生产 prompt。

## 原 owner 仍不能表示的情况

Topic-name 结构映射原要求其全部成员为当前、完整、未改人工字段的 Input mirror。实际正控：纯 Input Topic 改名映射存在；随后加入 source-free authored 成员则映射 null。独立反例：原 edited bound 成员也使该原映射 null。本包不把这些结果强行变成合法结构证据。Section 内若直接混入 source-free author/edited bound 也同样不能借原纯 Input 结构 owner 获取资格；合法例使用独立 Section 的完整纯 Input 成员。

多个不同结构、跨 Topic 混合、invalidated/旧正文重读不在本包放行。后续若要支持它们，先确认新的完整 owner 可表示性与精确选取，不能沿用此处单结构许可笼统准入。

## 验证

- 真实原 owner 负控 0/8 → 修复针对 8/8。
- 42/42：按 plain-note-only、bound body+note、Section+多族分别验证独立 payload/qualification 字段、结构/author/bound/Context 授权；provider 与 backup finalizer 的 Input note、Section 标题/历史/receipt/同数成员替换、bound/author 字段、Source 删除和撤销；原 response adapter + ACK 回滚、同 handle 重放与单 provider。
- 3/3：DTO 精确联合集合与结构成员 note 拒绝；两个相互独立的 Topic 原 owner 非法成员前置（纯 Input 正控保留）。
- 最终一次 14 文件完整所属批次 1103/1103，TAP 121029.127541 ms、exit 0，无 fail/cancel/skip/todo，源码前后向量一致。随后审查保留结构 topicId 与 evidence Topic 的显式相等限制，原 owner 也独立核验该关联；针对 9/9、TAP 8838.635083 ms、exit 0，单列保留，不回溯替换上述冻结批次。源码前后向量、精确命令和 exit 见 `work/context-compound-fields-structure-20261023/`。无 native/browser/build/CI/Full/真实模型/部署。原生组合资格由 root 在整合里程碑集中验证；局部 Node 结果不是整产品验收或 Linux 容量结论。
