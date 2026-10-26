# Coordinator 计量与阶段预留接口差额

状态：**接口建议，NOT_IMPLEMENTED**。签名是供 dot 在原 owner 内实施的具体合同，不是本补丁已有导出，也不是已审定的终态上界或执行许可。下列源码行号以本分支选择闭包为准；dot 后续源码以函数锚点定位。

## 已有接口为何不足

原 owner：`extension/background/application-selection-reservation-coordination.js`。

- `debit` / `nativeDebit` 和 admission/member/repository/driver charge 保存同一私有 r 的累计 references、bytes、costAttribution、原 deadline。包装成本也扣费，迟到的已接受结果仍入原账。
- 第207行 `requireOriginalApplicationSelectionRepositoryWork(action,repository)` 仅返回 deadline；第242行 `requireOriginalApplicationSelectionDriverSettlement(action)` 仅检查 runDone/pending/unobservable。二者没有可持久消费的累计计量回执。
- 第228行 `runPhase` 只有内存 ticket、scope 和阶段 delta；提交后仍有 `portal.committed`、`debit(original-phase-settled)`。第234行 `measuredPreparation` 还有 scope 外工作。单个 IDB receipt 不能代表整个动作。
- 第235行 `originalTerminalDemand` 的历史阶段和乘3仍缺路径支配证明。现有内层 `BNS_GROUP_RESOURCE_LIMIT` 与 production 外层门必须保留，不能把这个估计包装成已批准 reservation。
- `extension/core/idb-repository.js:372 readOriginalCommittedTransactionWork(repository,scope)` 仅返回真实成功且完成尾审 scope 的 references/bytes/activeMs，不含整动作 admission、member/native/local、准备与未来收尾，也不提供失败事务的完整累计回执。不能相加这些局部 receipt 冒充累计账本。

## 建议接口签名

以下均由 coordinator 的私有 action/ticket/lease WeakMap 验真；opaque 参数只接受原 owner 铸造对象，不接收调用方自报计数、成本、deadline、回调或扩阶段配置。

```js
// 内部在受控计量边界调用；phaseTicket 为原 phases Map 的 ticket。
captureOriginalApplicationSelectionAccounting(action, phaseTicket)
// -> opaque AccountingReceipt

// 只读诊断投影，不是写权限或冷恢复继续执行凭据。
readOriginalApplicationSelectionAccounting(receipt, action)
// -> frozen { operationId, phase, sequence, consumedReferences,
//             consumedBytes, elapsedMs, originalDeadline,
//             reservedReferences, reservedBytes, reservedMs,
//             pendingCount, memberPendingCount, unobservable, outcome }

// 依据私有固定阶段计划及已证明上界，失败在启动该阶段前发生。
reserveOriginalApplicationSelectionStage(action, phaseTicket)
// -> opaque StageLease

// 仅绑定原 ticket 所属 repository、authority、scope；不得重复或跨域。
bindOriginalApplicationSelectionStageLease(lease, action, phaseTicket,
                                          repository, scope)
// -> true

// 原真实事务收尾、phase-settled 扣费之后，生成私有结算回执。
// 不接受 actualWork DTO；内部读取原 committedWork 及完整累计计数差额。
settleOriginalApplicationSelectionStage(lease, action, phaseTicket,
                                       repository, scope)
// -> opaque StageSettlementReceipt

// 所有 fixed terminal phases / observer / finish / 原 waitActual 都有上界；
// 在 dispatch 前保留整个尾部债务，不能只预留两次 meta 写。
reserveOriginalApplicationSelectionTerminal(action)
// -> opaque TerminalLease

// 在原 terminal closure 确认 runDone、实际 pending 排空、全部原收尾完成后；
// 只生成证据，不启动一个过期后的新事务。
completeOriginalApplicationSelectionTerminal(action, terminalLease)
// -> opaque TerminalSettlementReceipt
```

AccountingReceipt 绑定原 operation/action/owner/仓库集合、单次进程 invocation、phase/sequence 及固定原期限；投影只返回最小计量元数据。单调 elapsedMs 是同一原动作的区间，不累加重叠 scope 时长。持久记录中的单调 deadline 只用于同一 invocation 审计，**跨进程不可当有效期限**。同一阶段的 checkpoint 不刷新期限或额度。旧 receipt/假对象/跨 action/重复 settle 拒绝。总 consumed 加 reserved 不能超过原4096/2MiB/30秒；已预付项只能按同一真实租约从 reserved 转已付，不重复计费也不凭调用方数值减费。

## 必要调用点与差额

| 原锚点 | dot 必须增加的接线 | 成本/原子性要求 |
| --- | --- | --- |
| admission 创建私有 r，第257行附近；action attach 第280行附近 | 同一 r 保存账本 identity、invocation、sequence，保留 admission 已发生计量 | 不另起钟或复制一个从零开始的 meter；原已接受迟到结果继续计入 |
| `runPhase` 第228行，原 next/ticket 建立后、事务启动前 | 原私有 fixed plan 决定该 ticket 允许的阶段，reserveStage 后才调用原 staged transaction | 禁止调用者传阶段预算；含账本读写、CAS、finalizer、原计量包装与收尾；没有可信上界则不能发 lease |
| `bindOriginalApplicationSelectionPhaseScope` 第218行 | 原 scope 验真后绑定该阶段 lease，保留原 final read fence | 不新增 worker/Port 来源；不允许 scope 间复用。优先利用现有绑定点，不改共享 IDB |
| `application-generation-selection.js #actionApply` 第242行，及 `#actionCommitted` 第256行 | 原固定存储域内读持久账本、验证 task/operation/sequence/prior row CAS，与本阶段原标记在同事务持久化预付债务/进度 | 跨 source/target/registry 没有单一原子事务；每阶段必须先有可信持久预付和明确 home，不能用两个不原子的更新声称全局成功 |
| `runPhase` 事务成功后 | 保留原 committedWork 验真；完成原 portal.committed 与 phase-settled debit 后再铸 accounting / settlement receipt | 先拍快照再扣收尾费会漏账；累计 delta 是 coordinator 真值。scope receipt 仅用于核对，不能再次加进总值 |
| `measuredPreparation` 和 admission/member/repository/driver/native charge | 新 lease/receipt/CAS 序列自身的 bytes/refs 也走原 meter；计数变更令旧 snapshot 不可继续作为最新结算 | 不加入任意 callback、可写 totals 或测试专用生产 bypass |
| 第303行 dispatch-ready、SDK 调用前 | reserveTerminal 覆盖观察、source-selected、target-cleaned、finish、相关只读读取、最终检查及持久债务成本，并先落原持久预付 | 不能沿用乘3估算作为证明；不能扩大预算。尾部写入须在原期限内完成，缺证据保持拒绝 |
| 第310行原 terminal closure / waitActual 收尾 | 原所有实际工作完成后 completeTerminal 生成最终只读回执；对预付全额保留的持久终态作核对 | terminal 回执之后不得为了“写结算”再启动过期事务；无法在原期限内完成的 durable 状态保留 UNKNOWN/债务，不能退款标绿 |
| selection 原冷 inspect/continue/openSelected（文件后半段） | 只读消费者识别新账本版本、任务/阶段序列、paid terminal 与 outstanding debt，显示确定或未决 | 旧 V1 没有计量证明，不自动迁移、补额度或清 UNKNOWN；重启不恢复上一进程 lease/原单调期限 |

阶段序列来自现有 `#actionNext` 第236行：source-prepared、target-prepared、target-dispatched、source-dispatched、source-selected、target-cleaned。上层 reviewed/control-ready/settling 是现有状态机边，不得当作可由外部填写的新 phase。

**需要 dot 明确实现的缺口**：固定阶段的可信资源上界；原任务持久 home 与跨域 CAS/预付顺序；完整原动作 receipt 和序列；原消费者对该证据的真实接线。上面给出 API 形状及插入点，不为尚未证明的上界编造数字。计量快照的序列化、持久化和自身 finalizer 成本必须事先纳入有限 envelope；不能反复写“精确最终计数”形成自计费递归。使用预付全额保留+内存只读最终回执核对；若原期限内不能证明 durable terminal，就保持未决。

## 共享 Repository 与本次已完成补丁

本次 terminal helper 加固不需要 `idb-repository.js` hunk。建议的新 bind 可从现有 phase-scope 接线消费；不要先改 IDB 或增加一个没有消费者的全局 meter。如果 dot 原 owner 接线最终确需 IDB 新接口，应单独提交准确 hunk 与原权限/原子性证明，不在本交接里提供未验证的可执行替换。

已交付真实消费链：`canonical-generation-publication.js:146/161 sealOriginalPhasedHumanCheckpoint` → `canonical-generation-phased-human.js:127` 的 prepare terminal → 原 Repository commit → 第129行 complete → `canonical-generation-task-ledger.js:80` 新 receipt guard。该链本来已全额预付，本次只强制边界合同。

## dot 后续定点验证要求（本次未执行）

伪造/跨动作/重复 lease、阶段重放、所有计量来源计入、计量包装自身成本、原预算精确边界、pending/不可观测/迟到结果、真实 scope 失败和提交后不确定、跨库崩溃前后、原期限届满、冷时钟不续期、旧V1只读拒绝。使用原 owner/Repository 的合成测试时标明 fake-IDB；不据其宣布真实浏览器或全局切库验收。

实施 coordinator 接口与可信上界之前，普通 selection 整动作持久账本仍未完成。不得仅为通过测试移除拒绝门。若要求过期后写结算，需另行具体合同、风险和停止条件以及用户批准；本交接无此授权。
