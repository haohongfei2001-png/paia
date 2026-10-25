# 下一 Global Selection slice：当前原 owner 证明缺口（只读）

2026-10-25；读取 checkout HEAD `bf7e5cb1dce4c99f0d77d0466370862e6728eaff` 及当时未提交的 transport coordinator 接线。该工作树存在 root 的未提交改动，本报告未修改或运行任何代码。旧 `selection-consumer-design.md` 是设计参照，以下按实际现状修正，不把已经实现的工作重新派发。

## 已完成的前置，不重复

`application-selection-commands.js` 已有私有 dispatch control、自 accepted Promise 排除和 <=30s drain；`capture-recovery.js` 已有原 owner hold；`prompt-insertion-receipts.js` 已有 warm hold、真实 tasks/tail、pending拒绝和 exact snapshot fence。默认 Assist null birth identity也已接通。root 当前未提交 `application-transport-coordination.js` 将 live source coordinator、capture、receipt 同 turn hold/有界 await/late cleanup 组合；它注释准确声明不是 editor/host、cold legacy、全部后台写入或 ACTIVATE 许可。本报告不对该在改代码给最终独审结论。

硬门仍在 `background/application-selection-commands.js:22–25`：ACTIVATE/CONTINUE/RESTART 拒 `GENERATION_EDITOR_PROTECTION_REQUIRED`，UI `canActivate/canContinue/canRestart/productionActivation` 全 false。保留它们，不能凭以上 live 前置解锁。

## 精确未闭口证据

### 1. Extension editors 与外部 host 分开

`background/application-editor-guard.js:37–64` 已能清点原 runtime.getContexts，校验全部登记 documentId/frame/url，nonce/challenge freeze和复查，新页/断线失效；`ui/application-editor-guard.js` 已保留 dirty/IME/unknown、held断线持续阻塞。archive.js:692–696、popup.js:193–194、prompt-surface.js:349–350 已提供原页面状态判定。缺的是消费者调用和终态持有，不是再设计一套编辑器。

注意 freeze 首次 inventory 发生在 active 建立之前，worker `assertApplicationWorkerAdmission` 此时仍可能放行新的页面请求。最终消费者须在第一次 await 前关闭一个原始、私有全局 admission（或者把原 editor owner 的开始阶段变成同步 ingress hold），再启动 inventory+所有 owner hold。不能只等 freeze Promise 成功后才关其它 producer。已有请求仍真实排空，不清任务集。

该 inventory 不证明 ChatGPT composer/native Context host 无写入。Prompt receipt warm hold 保留 `inspect().legacyCoverageUnknown:true`，只证明本 owner 已知 ledger/tasks。Context 原 source hold亦不能替所有旧 host/未登记历史插入出具证明。不能从 tabs/map空、窗口关闭、DOM相同或旧epoch退休推出旧插入未发生。完整 host 方案仍需沿原 composer/receiver 与 Context host 的确切 admission/ACK/terminal owner，按已有权限证明目标 document 身份和在途写的终态；无法证明的旧/冷 UNKNOWN 继续拒绝。实现与合成协议测试可以在本地继续，真实浏览器验证属于另账，不得擅自运行。

### 2. 三个本地工具：不是三个“自主后台循环”

源码事实：

- `background/import-handler.js:6–12` 返回每个 `ImportLedger` 方法 Promise；`core/import/ledger.js` begin/preflight/ready/commit/pause/cancel/complete/resolveBranch 均由请求推进，未见独立 timer 或批次循环。commit:98–105 在 prepareRows await 前后有 grant检查；revokeOwner:216 删除grant，不是事务回滚。
- `core/backup-service.js:32–39` 只有 staged restore 会话；export入口明确 FEATURE_UNAVAILABLE。restore:145–200 在同请求中执行事务并 await recoverSettings；recoverSettings:202 还会通过原store写 control，再删除 recovery marker。不能只看 restore大事务完成就认为全部结束。startup `backupReady` 被 `originalReady` / worker activity追踪。
- `core/integrity-checker.js:9–15` 是只读分页，page保留真实 `s.pending`，scan不写canonical。sessions存在不等于活跃写入，也不能误称修复数据的后台producer。

三者仍缺**原 owner 局部 admission hold + 全部当前方法的真实 pending + 同DB/restore/fence身份**；只有外层 worker drain不足以证明其它直接调用或等待后续不会进入。下一最小完整包应补它们的 warm 原 owner lease，不新增服务/数据协议/持久内容 truth，不改 Import grant政策、Backup批次/安全检查、Integrity只读性质。

建议文件归属：

1. `core/import/ledger.js` 为真正写 owner（`background/import-handler.js` 仅必要可信透传，不把后者的 wrapper 当证明）。在原实例私有绑定记录 store/repository/db/databaseId，全部公开入口同步计入pending并在held拒绝新操作；原pause/cancel/revoke若允许必须作为限制性入口且使lease snapshot失效，不能悄悄绕过。不要自动pause/cancel用户任务，不删除grants。静态非terminal importTasks可保留，但必须准确证明其本身不会自动前进；若无法证明或尚未接足入口则拒绝，不伪装terminal。
2. `core/backup-service.js`：begin/stage/preview/restore/recoverSettings/cancel 原entry全部覆盖，特别 stage validator异步和restore后的SDK控制恢复。hold不得取消session、丢items或把staging=false当事务完成。默认已有staged但静止session可保留为“尚待用户下一步”，不能称已完成。对cancel是否允许采用与Import一致的失效规则。
3. `core/integrity-checker.js`：只读owner pending drain；不为只读session凭空写metadata。禁止新begin/page与hold竞争、已开始scan排空；cancel的变化若允许必须失效lease。不得因sessions非空就清空用户检查。
4. 新 `tests/application-local-tools-coordination.test.mjs` 或分工具所属tests；在独立小局部组合协调器中仅认原品牌/捕获的方法，最终 root 再接 worker，不占 root 的 service-worker/application-worker-coordination/application-transport-coordination。

最小接口：原owner `holdForApplicationSelection / applicationSelectionHeld / fenceApplicationSelection / releaseApplicationSelection / applicationSelectionSourceIs`（名称与既有保持一致）；opaque私有token，单owner单lease，固定同一截止，不复用“当前环境”重新绑定。Reflect.apply调用捕获原方法；成功hold不产生全局许可。异步pending登记在第一await前；嵌套原内部方法须避免无身份共享外部work，不用全局boolean跳过防护。失败/超时保留未决任务与用户会话；late成功不可复活过期lease；第二hold拒绝不能释放第一个。

验收cases：原真实各方法正控；hold前开始的prepareRows/validator/scan/recoverSettings被等待；hold后新入口拒绝；超时仍有原pending且晚结算不复活；pause/cancel/revoke导致失效但不假装事务回滚；database/repository/restoreEpoch/control代换拒绝；forge/reuse/foreign token与方法替换拒绝；Import grant/Backup items/Integrity counts保持；release只恢复新显式动作，不自动重放。原所属安全测试一次合批，保留真实失败。此包无需云、账号、浏览器、模型。

### 3. Organize 原 owner 另包

`core/organizer/bounded-workflow.js:24–53` 有完整running Promise和连续子任务，start返回它；stop会修改原持久action并调用子owner stop，不是无副作用hold。`original-simple.js:54–58` 有 running/controller；reconcileInterrupted 会把旧prepared记失败、其它active记outcome_unknown；静止实例仍可能有持久UNKNOWN。`configured-organize-runner.js:10–45` 是私有 active/session/service/actions factory，不能用不存在的公共running属性判断空闲；service invalidation调用session.dispose和actionSource.invalidate。`local-organize-session.js:340–354` Promise.race可以先因abort/timeout结束，真实 provider work仍可能晚返回，虽已禁止进入commit，但不证明真实远端停止。

默认 unavailable/null owner 可以用原factory birth身份、无服务无session、无实际任务证明有限live静止；不能把“provider unavailable”推广到先前配置服务、真实费用或旧durable flight已结算。建议独立设计 original/bounded/configured三个原owner的最小hold，不让本地工具包混入它们。Root仍需决定先保守拒configured，还是进一步取得真实原service/Foundation UNKNOWN证明；本地合成开发不需要真实模型调用。

### 4. 先hold，再绑定原review重新资格；不是无条件reprepare

`core/browser-native-sync/application-generation-selection.js:46–75` prepare已捕获 source/target完整继承cut、raw rows、registry root、target gate、SDK before。activate:80–95先要求两cut，再在原严格事务逐表比对并写prepared markers，随后原finishSelection唯一dispatch。当前无review-bound重新资格方法。

Context/source/receipt hold本身可能合法变更metadata，因此“先用户PREPARE，再hold，再直接activate”可能正确拒STALE。所需最小core后继：只有原prepared私有对象可以请求重新资格，保持 operation/review身份及sourceDatabaseId/targetName/targetDatabaseId/datasetId/registry身份、graphDigest/canonicalDigest与用户确认对象不变；在全部有效hold下，用原owner重新生成完整raw cuts/fences，不剥metadata。如果graph、内容、目标或控制含义变化则返回needs-review而不dispatch。同步最终current检查必须进入原dispatch边界，跨最后一次await仍重验，不能只在wrapper外看一次token。

Sync reservation `sync-local-lifecycle.js:170–172` 原本已存在；必须在消费者获取owner的合法顺序中使用，reserve会使随后applicationSelectionOwner()拒busy，所以不能reserve后才重新索要owner。取得原owner后同步reserve，并在每一步资格变化时拒绝；不要以普通pause/resume替代。共用一个总<=30s deadline，不给每一hold/fence/重新资格各续一次完整30s；activity control只消费一次，不循环借它重开drain。

### 5. 终态释放仍需完整消费者

尚未dispatch且原marker证明可取消：可以释放全部holds、late leases和页面，保留草稿/会话，不自动重放。已dispatched/UNKNOWN或无法识别marker：保留source/Sync/page写阻塞，不能finally统一release、重复SDK set或自动cancel。selected：旧页面继续冻结，reloadRequired；仅原startup消费selected receipt。冷CONTINUE的ready可能被原pending gate阻止，原owners未构造，不能绕过ready激活。初次最小消费者可明确只支持本进程prepare→activate；cold CONTINUE仍拒，直到独立原cold协议资格完成。

## 连续队列与外部阻断区分

- 可马上独立本地实现：三本地工具warm lease（上面的完整工作包）；Organize default/null原owner有限live后继；原selection review-bound cut重资格；消费者前置的同步ingress + exact release状态机（保持ACTIVATE门直到所有依赖合格）。这些均不依赖云或dot。
- 需要设计证明但不是等待外部许可即可解决：完整host writer coverage、cold legacy UNKNOWN、configured Organize Foundation/真实provider未决区别。没有证据不能靠状态字段清零。
- 真外部/资源验收：真实扩展多页/IME/宿主composer断联与冷重启；真实provider/account/模型和云CI。当前额度/权限限制继续有效，合成小测试不能代替它们。最终启用全局ACTIVATE前必须明确所支持profile和上述证明，不能把全部用户数据场景一次性宣称可用。

本报告只做只读源码审查，不是新实现或验收通过。既有activity/capture/receipt结果沿各自报告复用，未重复运行。
