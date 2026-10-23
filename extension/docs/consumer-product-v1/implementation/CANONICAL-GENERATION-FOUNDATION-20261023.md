# Canonical generation publication：有限基础与规模恢复接口

日期：2026-10-23。实施基线 `29e825aaaecf1cef2dd8b3965dd02c187eb87989`。这是默认未接线的独立基础，不是已完成规模恢复、真实设备同步或可发布版本。

## 已观察问题与现有边界

集成线已有的规模观测：65 Human / 195 operations 在 activation 触及 4096 references；129 / 387 operations 在 staging 触及 2 MiB。这里引用集成线证据，未在本包重新运行该规模。不能提高限额、减少数据、按页重置同一个逻辑图验证预算后再声称全图通过。

原 `group-checkpoint.js` 的 `stageItems → readGroupRows → compile` 收集完整集合，`activate` 在一个原事务写 canonical 后切 BNS namespace。`group-page-reader.js` 的同一预算 ticket 跨迭代累计；分页不意味着无限量。`BackupService.restore` 同样不是 shadow-generation owner。当前 BNS namespace 仅隔离协议 meta；Topic / Entry / Input / revision 等 canonical 表仍是平面表。直接把既有 apply 循环拆成多次公开写，再切 namespace，会暴露半恢复图。

`ArchiveRepository` 已有指定 IDB `name` 与原严格 readwrite transaction、私有预算登记、原生尾读 fence。`IndexedArchiveStore` 构造原 repository，原 local control 同时绑定 databaseId、migration、gate、epoch、publication reservation；写后还存在 `chrome.storage.local` 发布、SDK ACK 和 readback。`canonical-readiness` 是收集/检查能力，不是完整 shadow graph 封存能力。不能把修改 repository 的 name 或 databaseId 当作安全集成。

## 本包实现

新增 `core/browser-native-sync/canonical-generation-publication.js`，只由专属测试导入；没有产品默认导入、设置开关或 recovery-session 接线。新增测试使用原 ArchiveRepository + vendored fake IndexedDB；没有改原 Repository、IndexedArchiveStore、Sync 格式、session 或 journal。

持久 registry IDB 与每个 generation IDB 分离。registry 的一个原事务发布 active identity 与 publication receipt，因此这两条记录原子提交；整个多 IDB 协议和 chrome.local **不是**跨库原子事务。

| 接口 | 本包保证 | 不提供的能力 |
| --- | --- | --- |
| `attach(repository, {generationId,databaseId})` | 原 Repository 类型、同 factory / 实际 DB name 一致；gate 持久绑定 registryName；generationId / databaseId / DB name 三唯一 catalog；初始所有 store 为空（仅允许原新 thought-library DDL marker）；旧准确 gate 可恢复 | 不导入既有真实库，不创建原应用权限 |
| `stagingWrite(handle, originalOwnerCallback)` | 私有 handle、原 gate 仍 staging；首事务步骤登记原预算；回调和 gate revision 原子；尾 fence 防 gate 被覆盖 | 不验证回调的产品授权，也不允许应用读 staging |
| `seal(handle, metadata)` | 冻结 staging 写；封存 sealId / manifestId / graphDigest 身份并返回私有 capability | **不验证 hash 对应真实完整图**；未来 trusted graph validator 仍必需 |
| `reserve(sealCapability, operationId)` | 固定当前 registry revision、原 active 完整 gate / writeRevision、准确 sealed target；同一时刻单 pending；不可复用已终结 operationId | 不自行生成新 graph，不证明 target 已包含 seal 之前全部源写 |
| `advance(operationId)` / `recover()` | 原库退休 → 目标就绪 → registry active+receipt；每一步可按 durable 状态继续；每次 recover 最多三步；响应丢失可读 receipt | 不盲重试外部错误，不声称未知步骤已回滚 |
| `active()` | 一致读取 registry / generation gate / durable receipt；pending 明确可见，包括首次无旧 active 的发布 | 不替代所有产品 reader 的 read qualification |
| `activeWrite(handle, originalOwnerCallback)` | registry 无 pending 且准确 active；同 generation 的原事务先核 active gate，再写并递增 writeRevision；退休后的旧 handle 拒绝 | 不能约束绕过此 owner 的 raw Repository 写；默认应用尚未统一接入 |
| `prepareDeletion(handle)` | registry 先持久 deletion tombstone；active / pending 两端拒绝；之后 generation gate deleting；禁止同身份复建；崩溃可恢复准备 | 不调用 deleteDatabase，不删除真实资料；物理删除 owner 尚未实现 |

seal 的 graphDigest 是 publication metadata，不是用户读权、产品资格或图验证的证明。测试用的固定 synthetic digest 也仅验证协议身份，不冒称产生了规范图。

## 正常并发与中断

1. 尚未预留：旧 active 可以正常写，staging 不对应用可见。
2. registry 写入 pending：新 activeWrite 拒绝。一个更早通过 registry 检查的旧 writer 可能尚未进入 generation TX。
3. 同库 gate 事务串行化旧 writer 与 retirement：若 retirement 先成功，旧 writer 在其原事务看到 retired 后拒绝；若旧 writer 先提交导致 writeRevision 变化，必须拒绝过期候选。
4. 后一种情况将目标 gate 写为 `invalidated`，再在 registry 原事务移除 pending 并写该 operation 的 `reservation-invalidated` durable outcome。旧 active 完整保留且恢复可写；目标不能通过换 operationId 重新发布。失效出口中断可继续，不能把 pending 消失解释为 committed。
5. 原库已退休时，目标就绪仍不对 activeWrite 开放；registry 最终 active+receipt 提交后才可写新 generation。中断期间允许明确暂停写，而不是暴露半图。
6. 以上隔离依赖所有正常 generation 写走同一个 gate owner。跨库外部 raw 写不在此有限基础的保证内；默认系统接线前不可启用产品功能。

已处理独审发现：旧 writer 在预留后推进 revision 会令早版 pending 无恢复出口；另一 registry attach 同一 generation 会误把别人的 active 改为 deleting。已增加真实 held-writer 两种顺序和两个 registry 的控制，不把这两项静态发现称为曾运行过的原版本失败记录。随后补齐 falsy active/pending、旧 gate 身份漂移、首次 pending 状态、active receipt 前读与末端封闭。

## 预算口径

本模块每个实际 readwrite TX 的第一步骤调用原 `registerRepositoryWorkLimit`，固定最多 4096 references / 2 MiB 物理请求与结果计量 / 30 秒，包含末端读与原 finalizer。登记不能重置同事务已消费预算。publication 元数据阶段各自是独立、常数规模事务；这不是通过循环重建 ticket 验证全量 canonical graph。

本模块不遍历完整图，**没有**实现全图累计验证 ledger。未来大图 verifier 要同时区分：每 TX 有界工作、每条完整操作不可被截断，以及持续存在的 manifest/分页位置/完整集合/重复与缺失证据。必须用不可变外部页或 IDB 暂存索引累计图证明，不能把全部 rows 留在 JS 数组再改名叫 streaming。若单个合法 operation 自身超过现行封套，仍精确拒绝，另列能力限制。

## 接下来可实施的接口与文件影响（未实施）

### A. 分段认证与不可见原 owner materialization

建议新独立 `canonical-generation-stage.js` / `canonical-generation-validator.js`，由现有 `group-checkpoint` 的显式恢复路径调用；不替换原小图兼容路径。契约如下：

- `beginVerifiedGeneration(manifestRef, sourceBaseCapability)`：原可信 manifest/设备 namespace 校验后创建新 generation；sourceBase 由原 active selector 捕获 registry revision、旧 gate writeRevision、原 control fence/epoch 与备份 generation。必须在取图依据时捕获，不得在已构建旧 target 后重新捕获新基线。
- `appendVerifiedPage(stageCapability, page, cursor)`：每页固定排序、链 hash、页序号/总数；完整 operation-group 通过原 codec、owner 与 ancestor/receipt 校验后才提交。每页的 cursor、observed identities、必要 frontier 与新 canonical rows 同事务提交，重复页可查询已提交 receipt，而不是重做未知写。
- 原图依赖通过 generation 私有索引、pending-edge 表、实际唯一键与计数累计验证。跨页同实体冲突、丢祖先、重复 group、墓碑和 typed lineage 不因分页而弱化。
- `validateAndSeal(stageCapability)`：消费完 manifest 精确总量后，分页做完整 canonical/protocol/readiness 闭合；产生私有 graph seal，绑定确切 target writeRevision 和 begin 捕获的 sourceBase。当前 foundation 的元数据 `seal` 只能由这个可信适配层调用，不能直接接用户 DTO。
- `publishValidatedGeneration(graphSeal)`：发布前再次核 sourceBase；不匹配时废弃候选并保留原库。不能使用当前 foundation 的 reserve-time source snapshot 代替 graph 的原始基线。

预计影响 `group-checkpoint.js`、`group-checkpoint-plan.js`、`group-checkpoint-scope.js`、`canonical-readiness.js`、分页 helper、新 stage/validator 及相关恢复 tests；这些现有文件由集成负责人另行分配，本包没有修改。

### B. 全产品单一 canonical selector / 写 gate

新增统一 factory 才能接上述 registry：`openPublishedArchive(local, originalOptions)` 返回已 qualified 的 generation repository，不从用户任意 name 接线。旧默认库的首次注册需要专门 migration / rollback owner；本包 `attach` 的空库要求故意拒绝已有真实数据。

`IndexedArchiveStore` 构造与所有派生 Store、background、UI 独立 reader、worker 和恢复 session 必须统一使用 selector。每个原写入口的第一 TX 步骤核同库 gate；旧在途写已经绑定的 repository 不能随便替换对象，须完成/拒绝后重新 qualification。只改 Sync session 或只改一处 constructor 不够。原数据库留存用于恢复与迁移读，不默认清理。

### C. chrome.local 原 control 发布协作

不能把新 canonical pointer、local databaseId、migration、gate 与 SDK ACK 假称同一原子事务。沿原 `local-control-publication.js` 的 reservation / beforeDigest / afterDigest / fenceDigest / nonce、`IndexedArchiveStore.run/saveControl/publish/recover` 的 unknown 状态机，新增明确跨库 publication intent，绑定旧/new generation 与原 control proof。

发布期间 selector 必须区分 `pending` / `needs-original-control-recovery` / `ready`；只有原 SDK ACK + readback + 当前 control fences 对齐新 generation 才开放正常写。旧库的 source/control identity 不改写，所有 interruption 节点分别做冷启动恢复。具体顺序必须在这条原 control owner 下审查并验证，不能由独立 foundation 自作 chrome.local 写。

预计影响 `indexed-store.js`、`local-control-publication.js`、显式新 factory、`idb-repository` 构造消费点、`browser-native-sync/recovery-session.js` 及原 native 恢复桥。上述影响较广，交集成负责人协调后再实施；默认功能未激活。

## 本包验证

- 第一轮专属文件 22/22，TAP 254.866375 ms；此后增加 schema/receipt/identity 边界。
- 追加 schema/receipt/identity 后 30/30，TAP 315.868041 ms；独审无新增阻断。
- 再追加 invalidated-target 中断恢复、双 owner 并发 advance 和 DDL id 精确检查，最终完整专属文件 **32/32**，TAP **302.374584 ms**，exit 0，fail/cancel/skip/todo 均 0。
- Node 22.23.3、macOS、本地 vendored fake IndexedDB；实际原 Repository transaction/fence/计量路径。没有原生 Chrome、构建、云执行、原规模播种、真实账户/生产资料或费用。
- 测试包含故意超过 2 MiB 的单个 synthetic metadata operand 验证原限额拒绝并全事务回滚；没有削减限额或运行真实大图库。
- 来源：`work/canonical-generation-foundation-20261023/` 的两轮 TAP、源码 SHA256 向量与本报告。原生跨 DB 崩溃、浏览器升级/blocked DB、多个真实 renderer/worker 和默认应用接线均未验收。

本包交付状态：**publication foundation implemented / default wiring NOT_IMPLEMENTED / full graph streaming NOT_IMPLEMENTED / large restore acceptance NOT_RUN**。
