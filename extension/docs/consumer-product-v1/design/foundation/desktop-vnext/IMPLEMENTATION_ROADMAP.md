# Desktop vNext implementation roadmap

状态：**OWNER_APPROVED / D1_D5_IMPLEMENTATION_AUTHORIZED**。D1→D4 已按 owner 批准范围实施；owner 于 2026-10-02 明确新增并批准 D5 Visual Convergence & Product Acceptance，要求把冻结设计页面以高视觉还原度落实到真实 production PAIA，而不是停留在结构正确或 loose reinterpretation。冻结 DVN-1.0 决定视觉/交互，本包决定代码 ownership、trusted interfaces、验证和迁移。未列能力不得自行扩展。

## 1. 顺序、依赖与进入条件

采用 **D1 Archive finalization → D2 Thought Library → D3 AI Organize → D4 AI Context → D5 Visual Convergence & Product Acceptance**。D5 只在 D4 完成 required verification 并 exact-main integration 后启动，是 Desktop vNext 的强制收口门；D1–D4 的 engineering integration 不等于整包视觉完成，也不得据此宣称 Desktop vNext 产品完成。D1 同时交付实际 Archive journey 所必需的 shared shell/router/components/editor adapter，避免一个独立“只做框架”的横向 D0。D2 依赖 D1 的 route/selection/editor/acknowledgement，建立 Topic 真正完整、可靠时间和角色的读模型；D3 使用它确认实际 organization scope；D4 使用这些稳定 evidence refs/container coverage 和所有 source/candidate invalidation 做完整跨空间 reuse。D4 的现有 Context domain 并不技术依赖 D3 新候选，但默认先稳定 Topic/AI field owner，减少整 Topic选材和 review race 的返工。

DFG-009 未关闭时，D3 engineering 与 synthetic safety 可以独立验证；不得把它标为 live-model fidelity complete。owner另行授权时可继续依赖安全的 D4 engineering，D4不得把未经采纳candidate当Current。B-01/B-02/B-03/B-04/B-05 不以改变顺序绕过；相关 paths保持 fail closed。真实新依赖若要求调整，仅记录具体证据、影响和新的 approval boundary，不能重新设计产品。

每个 slice 开始必须：重新读取 remote main/STATUS/EXECUTION_PROTOCOL；引用获批准的foundation PR head和DVN-1.0；确认owner授权slice范围、唯一writer和仍open gates；保存parent SHA、runtime/tree digests与baseline regression；预先记录本slice实际待删除legacypath。若remote main改变本review结论，先提交小型foundation补充并标清阻塞，不能沿旧代码假设实施。

## 2. D1 — Archive finalization

**用户可完成的闭环：** Archive root → known Conversation → 阅读/直接编辑 → exact selection reuse → scoped full-domain Search → explicit Original/History → safe Back；Remove完整target且保持negative intent；混合/未知Source purge明确拒绝。

**Production files likely affected（范围候选，实施只改必要文件）：**

- `extension/ui/archive.html`、`archive.js`、`archive.css`、`experience.css`、`reader.css`、`reuse.css`；`app-shell-state.js`、`reader-navigation.js`、`archive-shell-chrome.js`、`archive-navigator.js/.css`、`reader-experience.js`、`core-loop.js/.css`、`ux-r1-shell-coordinator.js`。
- `extension/ui/library.js`、`library-entry-editor.js`、`editor-primitives.js`、`session-lifecycle.js`、`recovery-draft.js`、`continue-thought.js`、`document-search-page.js`、`source-export.js`；只适配 UI，不改原先正确的body authority。
- Q1～Q4 所需 `extension/background/service-worker.js`、`core/indexed-store.js`、`ia-store.js`、`thought-maintenance.js`、`recovery-draft.js`、现有Source query adapter。worker保持thin validation/dispatch，复杂logic留service。
- 建议新增 `extension/ui/app-shell.js`、`view-session.js`、`archive-workspace.js`、`editor-session.js`、`components/{scope-search,dialog-stack,status,prose}.js`、production tokens/style。这些是新presentation/adapters，不是新truth层。

**Existing mechanisms reused：** route validator/intent fences；Navigator stable provider/project refs；DocumentEditor/PlainTextSurface/Autosave/Undo/Revision；Input-idempotent receipts；recovery epoch/lifetime/purge fences；GET_REVISIONS/RESTORE_REVISION；SEARCH_INPUTS + #106 40+4 generation intent重建；Source export最后freshcheck；Topic/Context range admission；existing preferences、capture status、Backup/import。

**New interfaces required：** Q1 operation outcome、Q2 full Original sequence、Q3 full-target Remove plan/commit、Q4 fresh mixed/unknown purge refusal。无新Search engine、provider或purge政策。AppShell单route/session interface，EditorRegistry lease/flush/leave/pin/dispose，Navigator admitted snapshot renderer，DialogStack explicit target/invoker。

**Migrations：** body-free versioned history/session decoder，旧 `paiaShell/paiaReader`可安全读取；没有 canonical body、DB version或Source identity迁移。Conversation Remove是既有负向意图范围的命令整合，不借此决定未来capture、人工派生删除或source永久政策。超过事务边界或无法证明完整成员时拒绝；不可多批部分删除后宣称完整原子Remove。Q1 receipt不存在不得推断未提交。

**Tests to add/update：** [TRACEABILITY](TRACEABILITY.md) R/E/H/S/G/K groups；更新 shell/navigator/reader、editor primitives/conflict、recovery/audit、accessibility tests 的 UI 目标并保留全部安全断言。拟新增 `desktop-vnext-archive-contract.test.mjs`（Q1～Q4真实service）、`desktop-vnext-archive-chrome-e2e.test.mjs`（实际worker/IDB/DOM journey）：before/after-commit ack loss、跨1000 Inputs整范围atomic-or-refuse、mixed-human B-02 worker拒绝、all-page Original+final purge race、dialog/historyowner、route+IME+dirtypin、20k未mounted search、#106全六边界回归。失败setting/import recovery与Settings入口同时验。

**Regression gates：** A-01～A-12、S-01/S-02、S01～S04 surface、X-01～X-04相关Archive段；required unit/contracts/privacy/check/release + affected source/built headlessbrowser；此前恢复/Source/Working/history/authorization/Backup断言保持。Topic/Context未迁移通过 single LegacyPageAdapter 仍可完成旧安全能力，shared bootstrap不得注册重复listeners。

**Privacy/data risks：** Original full-copy读取未mountedbody、source snapshot中途改变、选区save前后错ref、unknownack重复写、跨targetRemove、mixedpurge/恢复resurrection、route或diagnostics泄露body。以trustedfreshcheck、sameattempt、typedtarget、negativeintent和worker拒绝封闭；不引入provider request/clipboard reading。

**Rollback scope：** 仅Archive及shared shellcomposition回到已验证parent；保持新写Working revisions/operationReceipts/negativeintent/tombstones。Q1～Q4可安全不使用，但不得回滚库内容或绕过B-02。新data已经触发安全拒绝时，旧unsafe handler不得借rollback恢复开放；保留safe domainguard或阻止该旧版本降级。

**Owner/deferred gates：** foundation + D1 scope授权；B-02/DFG-003未解决，mixed/unknownpurge关闭；DFG-001同IDsigned update、004currentlive、005privateexport、007真实device/IME仍分别未认证。headless验证不要求owner提供private内容或新增付费权限。

**Completion evidence / delete criterion：** exact head/source+built digests、Q1～Q4 boundedDTO/guard receipts、A/S/X逐ID证据、fulltargetcoverage与zero-effectpurge记录、clean allowed diff；只一个shell/router/Archiveeditor owner、一次effect listener count；旧Archive DOM relocation/observer、narrow Edit gate、Inspector布局/样式在同一cutover移除，未迁移Settings纯controller先抽出。不能仅以截图或targeted PASS宣称完成。

## 3. D2 — Thought Library

**用户闭环：** compact Topic root（空也可直接写）→ 内容完整原话 → 这些年真实分布/unknown → full-year jump → independent Thought → Back回原root query/anchor/extent。旧Thought不获得新的direct-edit/reverse authority。

**Production files likely affected：** `extension/ui/thoughts.js`、`thoughts-base.js`、`thought-reader.css`、`continuous-collection.js`、`continuous-topic-reader.js`、`topic-actions.js`、shared AppShell/ViewSession/ScopeSearch；`extension/core/organizer/topic-reading.js`、`topic-chronology.js`、`source-summary.js`、`thought-read-index.js`、`topic-reading-state.js`、`topic-actions.js`、`thought-binding.js`（仅pref migration/保护接线）、`thought-store.js`（只若Q1 creation adapter确需）；建议 `ui/topic-workspace.js`、`components/topic-row.js`、`year-section.js`。

**Reused：** Topic placement/bodyBinding/sourcePresent、independent `CONTINUE_THINKING` operation identity、paged body-free descriptor index、40-item queries/seek、120 clean DOM+pins、key relative anchors/reading positions、query/scoping、existing field/input conflict保护。saved AI view仍existing owner，默认年视图不使用AI inferred evolution。

**New interfaces：** Q5 reliable expression-year overview/page、exact attributed root excerpt；Q1 newThought namespace adapter复用D1。knownYears/unknown/observedInterval/partialcoverage同一generation，year jump定位真实refs。Root+Topic bounded LRU清理已读body DTO；metadata不得长期持正文。组件以actualtime/role/count渲染，不做心理总结。

**Migrations：** F-09 deprecated grid preference→compact list，记录old preference/结果，保留durable bodies、顺序、anchors、locale/dark/size、binding和所有history。year index是可重建projection，不迁移capture time成expression time；缺可靠date保持unknown。UI draft仍tab-local，不擅加独立Thought recovery实体。

**Tests：** T/W/S/E/H/K existing groups；新增 `desktop-vnext-topic-timeline.test.mjs` 和 `desktop-vnext-topic-chrome-e2e.test.mjs`。159dated+1unknown/unevenyears/2022knownempty；partialyear不能声称empty；source/import/edit/capture time角色区别、user_created摘取createdAt不能冒充原表达日期、quoted-third-party/contradiction；300Topicroot和长标题、source scope、trueempty/AIoff可写；全分页end与pins/LRU/Back；sameattempt failed/lostack creation；gridpref migration且数据hash不变；service不激活newoldThought/reverse policy。

**Regression：** T-01～T-06、A-02/A-06、S-01/S-02、X全部Topic段；binding/TopicActions/historypreemption/editpreservation/independentThought+privacy+Backup，source+built browser均用实际worker/IDB。可靠年份和root exact quote是D2闭环必要，不能暂用AI summary或capture年份凑完成。

**Risks：** unknown time伪造、wrongauthor/year/quote、AI误当人类cue、root bodycache长期累积、selection ref随分页错配、新creation重复或误建capturedInput。读projection使用freshrefs+time precision、LRU、stableidentity；不产生新canonical body。

**Rollback：** Topic routefamily/controller与pref-onlymigration；不会逆转新Thought/revisions/placements，不重开reverse edit。旧grid读回仅rollback implementation临时内部，不能作为新产品永久视觉选项。新readmodel可丢弃重建。

**Owner/deferred：** D2授权；B-01/DFG-002仍open，新旧Thought写义关闭；DFG-007physicalIME/screenreader/performance reference device需真实证据；不借Topic年图解决model meaning或semanticSearch。

**Evidence / delete：** T各ID + Q5 coverage/time/excerpt/hash + creationreceipt + cache/DOM/runtime scale记录；移除旧Topic cards/grid renderer及normalyear使用synthetic AI evolution路径，删除Topic LegacyPageAdapter。保留saved-AI `possibleEvolution` canonical field与protected edits，不把删除visual投影变成删除user metadata。

## 4. D3 — AI Organize

**用户闭环：** 明确view saved vs request → actual scope/provider/batch确认 → request保持Current → validated Candidate → explicit Adopt/Keep every changed canonical field → one atomic admitted commit或stale拒绝。first generation与update都必须走此边界。

**Production files likely affected：** `extension/core/organizer/ai-presentation.js`、`ai-candidate.js`、`ai-contract.js`、existing organization metadata serializer/Backup validation、ledger/provider policy adapters；`extension/ui/thoughts.js`、`ai-presentation.js`、`ai-candidate.js`、shared dialog/editor/status；建议 `ui/organize-review.js`、`components/candidate-change.js`、`adopt-keep.js`。`background/service-worker.js`只增加bounded dispatch/validation。不加新provider。

**Reused：** existing deepseek opt-in credential/user-action/network/budget/ledger（不能因UI开新paid调用）；8 AI_FIELDS + evidence schema + field protections、material/layout versions、candidate key、CAS atomic mixedchoicecommit、revision/history/receipt、request singleflight/interruptedunknown、readonly candidatepreview、existing AIReadingEditor recovery。

**New interfaces：** Q6 exact planner/scope confirmation与Topic-scoped status；Q7 first/update unified staged candidate + base-none envelope；Q1 stablecommit outcome adapter。allKeep在first generation维持无Current；nochange terminal不是Saved。choices仅绑定candidate key且默认unset，field array长内容不能拆成多个独立commit。

**Migrations：** 唯一domain format调整是现有metadata内versioned base-none候选envelope，不新增AI body/objectstore。明确compatible read/validation/export/import、old Current/update candidate保留、旧直接first-generationwrite调用点全部cutover；old envelope decoder不能默默drop人类data。未adopt候选是existing derived lifecycle内可重建对象，如何清理必须维持既有policy，不引入新destructivehumanpolicy。若existing store无法容纳并保留compat，回foundation请求schema评审，不能临时另建Current/body truth。

**Tests：** O/E/W/H/A/K groups；更新 `ux-r5-ai-result-contract` 的first-generation期望，保留userAction/budget/evidence/idempotency/receipt断言；新增 `desktop-vnext-organize-stage.test.mjs`、`desktop-vnext-organize-chrome-e2e.test.mjs`。firstzeroCurrentuntiladopt、firstallKeep/firstmixedfieldemptydefaults+adoptedevidence、显式invalidresponse不得normalize成完整candidate、update mixed/alladopt/allkeep/unset、CASdifferentcandidate/base/material/policy/fieldedit、transportbefore/aftercommitack、actual8/bytecutscopechanged拒绝、cancel/unknownjob无paidrerun、savedviewzeroRequests、metadata/Backupoldnewcompat、longfields nextundecided、IME/readonlypreviewmovement、8meaningfixtures机械保留与独立liveevidence分开。

**Regression：** O-01～O-07、S-02、X compare/keyboard/motion/scale；full current candidate/AI states/protected edits/Backup/privacy/network-policy gates；必要source+builtbrowser不跳first。Mechanical schema/evidence checks通过不能把错误意义candidate算通过O-03的产品验收，DFG-009必须保留。

**Risks：** firstgen hiddenCurrentwrite、fakewhole scope、protectedhumanoverwrite、candidate-choice reuse、重复paidrequest、candidate缓存绕purge、newmetadata旧版本误解析。由trustedstage/key/materialversions/CAS/stableoperation、freshplanner和compatibledecode封闭；不得把“Keep”当model质量补救证书。

**Rollback：** 停止newgeneration/commit，保留已adopt Current/revisions/human保护；退回parent前先验证base-none envelope安全decoder。无法安全读时维持safe新domainreader/readonly，拒绝降级；不能直接恢复old automatic first-write。未adoptproposal可按既有derived cleanup处理，不回滚人类body。

**Owner/deferred：** D3范围授权；无授权credential/provider时request fail closed，cachedview/原话继续；DFG-009 actual-model独立语义review 未关闭不宣称全slice fidelity认证；B-01/B-03/B-04/B-05不因organize新增权利。

**Evidence / delete：** O每ID、Q6 exactrequestscope/budgetcounts、Q7 zeroCurrent-beforeadoption trace/oneCASreceipt、oldnewmetadata/Backupcompat、networkrequestcounts、humanfieldfence/stalerace。通过后删除所有old first-generationdirectCurrent路径和candidate旧DOM orchestration；同一Topic只有一个reviewsession，oldcurrent写入口不能作为fallback。

## 5. D4 — AI Context

**用户闭环：** purpose + incoming explicit selection → whole materials → optional authorized lexical supplements → complete readable output → output-only edit/redact → explicit review → Ready → final fresh Copy/Export。源变stale需核对；deny/purge清forbidden derivatives；没有真实Send。

**Production files likely affected：** `extension/core/context-package-service.js`、`manual-context.js`、`context-containers.js`、`context-manifest.js`、`manual-output-packages.js`、`manual-materials.js`；现有Memory/Passport只必要adapter，不增加policy；`extension/ui/material-tray.js`、`memory.js`、`passport-controls.js`、`reuse.css`、AppShell/invalidation/status/dialog/editor adapters；建议 `ui/context-workspace.js`、`components/{context-material,coverage-warning,copy-export}.js`；worker boundedexistingmanual-message dispatch。

**Reused：** same ManualContext 20sessions/15minworkerowner；full-container refs/signature、200items/4M UTF16hardcap、explicitselection优先eligibility/deny仍优先、manualsuggest lexical20、origin labels、roles/readablemanifest、outputredact/override、grapheme allpackages、freshshare、localOnly manualsemantics、MaterialTray sourceEpoch/blockedDOM/fallbackclear、existingPassportmetadata。不得导入#99 reader/connector。

**New interfaces：** Q8 purpose/compile-unconfirmed/confirmReview/editOutput/reconcile，同一个domain/session owner；UI temporary selection与stage route；shared InvalidationAdapter只复用现有generations。share必须trusted reviewed binding + allfreshrefs，UIeffect前再次检查currentintent/generation。output overlay不与itemoverride构成第二个editabletruth，不能写回Archive。

**Migrations：** 无durabletask/body/database/permission迁移；olddrawer/manualpreview presentation切换到Context workspace，仅一个controller调用同一service。Context workerrestart/tabclose真实expire，无sync/reopen承诺；incoming refs/selection只有tab/session内续接。旧permission/profilecontrols保留已有 semantics，不强制添加profile或grant。

**Tests：** C/A/S/E/H/K groups；新增 `desktop-vnext-context-review.test.mjs`、`desktop-vnext-context-chrome-e2e.test.mjs`；compile≠confirm、missingpurpose/incomingselection retained、task/selection/item/output/budget mutations invalidate、whole160and200cap/201refuse、unmountedTopicnote/AI完整roles、explicitranknotdrop、deniedsuggestionabsent、allpackagesfullgrapheme-tail、source/policy/cursor/hash/UIeffect races、safeoverlayreconcile与无法证明independent时clear、hiddenDOM/manualfallback purge、TTL/workertermination/eviction、clipboard success/denial/unknown/download wording、no readclipboard/send/network。新增跨spaces完整冻结end-to-end，不用mocked DOM替代worker/IDB。

**Regression：** C-01～C-10、A-02/A-06、S-01/S-02、X所有Context段；全部manifest/container/supplement/package/review/security/Passport/recovery/privacy gates；Archive/Thought sourcehash+revision不变；LocalOnly/外部accessoff既有manualCopyExport可用，自动cloud仍拒绝；existing source+built current requiredbrowser矩阵。

**Risks：** explicit selections静默被ranking替换、wholeTopictail漏、staleCopy、blockedtext藏在outputoverlay/fallback/history/diagnostics、expiryphantomrestore、historicalinstructions误授权、localOnly误禁manual或放行automated、UI“双Context body”。通过singleowner/fullsnapshot/freshpolicy/generation/manifest/clear-affectedscope guards；不承诺跨appclipboard分布式atomic或recall。

**Rollback：** 停新Contextroute/compile/release，清review bindings和不能证明eligible的derived bodies；service维持安全read/releaseguards，不恢复stale旧fallback。无durablebody要逆迁移。曾复制的文本不可recall；回滚不宣称撤回外部app内容。优先固定safeengine后回退presentation，不能恢复preview直接confirmed旁路。

**Owner/deferred：** D4 scope授权；B-03/B-05/DFG-006真实connector/residency/sync关闭；B-04/DFG-008 replyread关闭；semantic rejectedDFG-010不参与；#99 minimal reader的owner受限批准不能当本slice productionconnector授权。

**Evidence / delete：** C每ID、Q8 confirm/sharefreshtrace、source/Thought unchangedhash、wholeintended/included/excludedcounts、allpackageexactreconstruction、denyabsence assertions含hiddenDOM/fallback、zero automaticrequests、completecrossspacesreceipt。通过后删除MaterialTray永久drawer/DOMrelocation与oldContexttaskrenderer/重复search，保留可复用eligibility/focus/raceguard进入唯一ContextController。D4结束不得留下LegacyPageAdapter或双coordinator。

## 6. D5 — Visual Convergence & Product Acceptance

**唯一目标：** 在不改变 D1–D4 已验证数据/权限/状态语义的前提下，把真实 production PAIA 的全部 Desktop vNext Surface **高还原**到冻结设计。D5 不是“再 polish 一下”，也不是重新设计；它是产品完成前必须通过的 visual conformance gate。详细合同见 [D5_VISUAL_CONVERGENCE.md](D5_VISUAL_CONVERGENCE.md)。

**不可接受的完成方式：**
- 只证明 Shell/route/state/keyboard 正确，却让页面继续保留明显 legacy 视觉；
- 只检查 overflow / clipping / contrast，就把 pixel review 当作 design acceptance；
- 用“截图只是 specimen”为理由自由重解释 PrimaryNav、Navigator、Reader、Topic、Compare、Context 的视觉层级；
- 通过新增更高 specificity 覆盖旧 CSS 而长期保留两套视觉 owner；
- 仅以 unit/browser green、截图无报错或 responsive 不溢出宣称 Desktop vNext 完成。

**D5 production scope：** AppShell / PrimaryNav、Archive root / Navigator / Reader / selection / Original / History、Thought root / Topic / dense year / longitudinal、AI Organize scope / running / candidate / compare / decisions、AI Context task / select / retrieve / review / stale / budget / ready、Settings / recovery / capture / import-backup，以及这些 Surface 的 normal/empty/loading/failure/stale/conflict/long/narrow/dark/reduced-motion 状态。原则上为 P/I presentation-only；若视觉切换暴露真实 behavior defect，必须拆成独立 bounded repair，不得在“视觉还原”名义下改变 Source/Working/Thought/AI/Context/Passport 语义。

**高还原验收：**
1. 使用 production extension + synthetic fixtures，在 **1440 / 1280 / 1024 / 768 / 320 CSS px** 和 light/dark 下生成实际页面，不使用 documentation HTML 代替 production。
2. 同 viewport、同 synthetic content 渲染 DVN canonical reference screens；对固定几何（rail/nav/workspace、gutter、max-width、control height/radius、modal size、selected state、typography roles）做 computed-layout 对照。可确定值必须遵守 tokens；无解释的 >2px fixed-geometry drift 视为 defect。
3. 对 A02 Reader、T01/T03 Thought、O01/O04/O05 Organize、C01/C04/C06/C08 Context、A07/A08 modal、S01 Settings 至少建立 production screenshot ↔ canonical reference 的 side-by-side visual audit。Pixel diff 仅作为信号，不能替代人工设计审查。
4. 真实 Logo 必须使用 approved asset，禁止重绘/替换；品牌 accent、selection、danger、focus 各自语义分离。
5. Typography、视觉层级、正文宽度、留白、导航密度、边界线、selected states、按钮显著性、modal/elevated surface、dark mode 必须与冻结 visual language 保持高一致性；不得以 generic SaaS / Finder / Mail / ChatGPT 风格替代。
6. 清理残留 legacy selectors / overrides / old visual owners；同一 Surface 最终只能有一套 production style owner。不能把 legacy CSS 藏在更高 specificity 下。
7. 每个代表 Surface 必须通过独立 design-conformance review；最后需要 owner visual acceptance。**没有 owner visual acceptance，不得标记 Desktop vNext whole-product COMPLETE。**

**证据：** production SHA、实际 extension screenshots（synthetic/sanitized only）、canonical comparison sheet、computed-style/layout report、legacy CSS retirement list、light/dark/narrow/200%/reduced-motion checks、现有 behavior/security regression、owner acceptance record。Design specimen 本身不是 production PASS；production screenshot 无视觉一致性也不是 PASS。

**进入/回滚：** D5 从 D4 exact-main verified main 开始，不与 active D4 writer 并行修改同一 UI roots。回滚仅限 presentation/theme/component composition，必须保留 D1–D4 已提交 revisions、receipts、negative intent、candidate/context state 与安全 guards。任何回滚不得恢复已退役的双 coordinator、永久 Inspector、第四列、composer、重复 Search、永久 MaterialTray 或旧视觉分支。

## 7. Test architecture 与统一回归纪律

1. **Domain contracts：** 直接执行实际store/services，用syntheticrefs/实际revision/tombstone/operation metadata，failure injection区分not-committed/committed-no-ack/unknown；测试trustedhandlers而非仅disabledbutton。新Q接口的正反boundedvalidation、untrustedcaller、freshness与all-or-refuse都覆盖。
2. **Controller/components：** route/intent/generation/lifecycle/focus/pins/oneeffect仅验证可观测behavior；不写与implementation一比一镜像的无意义tests。token/layoutfreeze由实际production DOM验证；无截图替代domain evidence。
3. **Production browser：** 优先现有CI headless Playwright，实际extensionserviceworker + IndexedDB + builtrelease；同一slice合并fixture与race journeys，source/built保留现有requiredmatrix，不另启可见Chrome抢焦点。浏览器mockprovider只能证明requesttransport/schema，不证明actualmodelmeaning。
4. **Privacy & packaging：** existing privacy/import/background/diagnostics/compat gates、manifest permissiondiff、package check/release，safeBackup兼容。测试/日志/screenshot全部synthetic，不提交body/session/profile/credential。
5. **Scale：** 复用 `extension/tests/cpv1-02-6-scale-benchmark.mjs`、`cpv1-03-6-backup-scale-benchmark.mjs`与现有largefixtureharness；100kInputs/10kConversations、300Topics/160entries、longunbrokentext、longsessionbodycache/DOMpins。记录declaredhardware/data size/p95/input50ms/hotnav150ms/lexical300ms10k或700ms100k目标。120Hz commonframes<4ms须actualdeclareddevice，不以cloud screenshot证明。
6. **Human/device/live：** physicalChineseIME、VoiceOver/NVDA、真实reference-device performance、actualgeneratedmeaning、privateofficialexport、signedsameIDupdate/currentlive各保留对应evidence class及DFG；不能把synthetic等同device/productacceptance。

实施在最少但足够affectedgate通过后只对一个实际PR head进行required完整certification；失败据日志定向修复/批量重跑，head改变才重验证依赖。普通intermediatecommit无productiondeployment；不重复deploy同SHA。当前docs-onlyPR只静态文档验证，不需要runtimebrowser/release/付费API/deployment；这不削弱未来实现gate。

每slice completion receipt至少包含：approvedscope与openowner/DFG、mainparent/PRhead/mergecandidate/exactmain（如已授权合并）、source/runtime digests、fixture/environment、逐AcceptanceID observedresult、existing和newtests/CI immutableURLs、privacyzeronegativeassertions、性能原始数据、删旧path/uniqueowner证据、migrationcompatreceipt、rollbackparent/限制。未做项写NOT_RUN/NOT_CERTIFIED；失败BLOCKED/FAIL，不以overallgreen或旧COMPLETE替代。

## 8. Legacy retirement ledger

| 现有文件/职责 | Cutover / deletion boundary | 必须先保留或提取 | 通过证据 |
|---|---|---|---|
| `ui/archive.js` page-global state/boot，`app-shell-state.js` + `reader-navigation.js`重复接线风险 | D1提取explicitAppShell/Archivecontroller；只一个popstate/action subscription | existingcommand validation、searchintent、editorleave/range、safelegacy route decoder | oneintent→onehandler→oneeffect，Back/IME/latequery pass |
| `ui/core-loop.js/.css` setupShell/setupSettingsShell，`ux-r1-shell-coordinator.js`，`archive-shell-chrome.js` | D1删Archive activepath DOMrelocation/MutationObserver与oldInspector shellrules；未切换lowfrequencypurecontroller临时adapter | preference/locale/capture/health/settingscontrols，不整文件盲删 | no observer touching activeeditor/shell，settingsrollback/capture可用 |
| `ui/archive-navigator.js:place`，`reader-experience.js` narrowedit/relocation | D1改explicitmount/layout，不同时旧place；移除旧breakpoint/CSS overrides | admittedmembership/stableids、nativeedit/selection/resize safety | frozenbreakpoints与selection/dirtyDOMidentity |
| `archive.css`、`experience.css`、`reader.css`、`archive-navigator.css`、`ui-refresh.css`旧layout overrides | 按D1实际importgraph删已切换family的旧selectors；未切换styles隔离且到期 | dark/size/locale/accessiblefocus、非旧布局的pureutility | imports+computedstyle/overflow+unusedpath audit，不靠新增更高specificity长期覆盖 |
| `thoughts-base.js` rootcards/grid、normal evolution DOM；`thought-reader.css`旧familyrules | D2删rootgridrenderer与normalAIinference；remove Topic LegacyPageAdapter | saved-AI fields/possibleEvolution、positions/binding/TopicActions | gridprefcompat、159+1year、300root/realend/pins |
| `thoughts.js` saved/candidate DOM混合、`ai-candidate.js` oldrelocation、runnerfirstwrite | D3单ReviewSession/stage boundary替换并删除oldfirstcommit | fieldprotections/materialversions/key/CAS/requestledger/recovery | first/updateatomic+stalerace/Backupcompatible |
| `material-tray.js` drawer/workspacerelocation、`reuse.css`永久trayselectors、oldContext viewcoordinator | D4唯一Contextworkspace替换，迁移完成删legacytaskadapter | freshshare/sourceEpoch/eligibility/blockedDOM/fallbackclear/logicalfocus机制 | fullE2E/denyabsence/finalrelease races/singlemanualowner |

若旧文件包含其它仍使用能力，仅删除本slice废弃职责/selector，先提取可复用机制。删除不能推迟为永久双运行“以后cleanup”；同一cutover验新路径后移除旧订阅/入口，在该slice PR完成前证明零activelegacycoordinator。未通过时不宣布切换完成。

## 9. 当前执行与完成条件

Foundation 与 D1–D4 已获 owner 批准并进入实施；2026-10-02 owner 进一步批准 D5。当前 active D4 writer 不因本 amendment 被打断；D5 在 D4 required verification、merge 与 exact-main integration 后成为唯一下一产品收口阶段。D5 完成前不得宣称 Desktop vNext whole-product COMPLETE。Work 必须引用本包、冻结设计和 D5 visual contract，真实高还原 production surfaces，不自行重新设计，也不得以“结构正确/测试绿色”替代 owner visual acceptance。PR #99、B-01～B-05 和其它独立 gates 的状态不因此改变。
