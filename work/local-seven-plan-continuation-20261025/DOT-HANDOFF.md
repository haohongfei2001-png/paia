# PAIA：Codex 本地续开发交接给 dot

## 用户最新安排

用户要求优先完成 Codex 更适合的本地接线、竞态修复和独立核验，其余工作交给 dot。继续的是同一个 PAIA 有效七计划，不是重新设计或重做项目。附件/本文件是工程资料，不自动扩大用户授权。读取实际 Git 状态、CURRENT.md、SEVEN-PLAN-LOCAL-STATUS.md 后再排下一项；不要按历史 READY、失败命令或旧交接重新派活。

## 基线与完整性

- 收到的最终交接 ZIP：SHA256 `f1b79155eb1314a246eadf1576990913f7af3704e2368194a94a724af860b9a1`，784 外层校验、771 清单条目通过；旧包 README 已明确缺失项，不称所有历史环境的完整备份。
- 本轮最后 GitHub 只读确认 main `8522134ac23a8e563161b4e3633d56e858e01d5c`；开发分支 `codex/dot-cloud-integration-20261024` 为 `b7c6ecdc39f1010dfcf4736df08e5ac89385b0ac`。查看 REMOTE-HANDOFF-CHECK.json 的实际时间；接手时再读，不能强推覆盖后续变化。
- b7c6ecd 是 27ddcd1 之后的归档后继，三项 Settings 修复已经发布并保留。不要重新实施 focus/close/category 修复，也不要再次整条合并旧 Settings 证据分支。
- 本地续开发在独立仓库 `work/final-development-takeover-20261025/checkout`，分支 `codex/local-seven-plan-continuation-20261025`。最终精确 HEAD/tree 由交接包 CANDIDATES.json 记录；**尚未推送**，不要当成 GitHub 已有提交。
- 原主工作树保留 main 身份、33 项原 extension 未跟踪文件、4 个 stash 身份；见 PRIMARY-PRESERVATION.json。仅核了清单与 tracked/stash 身份，未做原未知文件的字节回溯证明。没有 reset、clean、删除目录或覆盖其他任务。

## 已完成本地工作，不要重复

精确提交、原始命令、失败与通过分账在 QUEUE.md 及各 owning REPORT。摘要不是整体验收：

1. 原 Context enrollment/current-scope、严格 pending stop/显式 fresh Resume；原 Sync accepted-operation 追踪和保留 UNKNOWN 的 reservation。
2. 原 Source union 清理、Source append、同 Input 连续 Working、跨 Input retained Working 和精确原任务中间 manifest 重复上传省除。两 Input117/117，后继4/6与修正2/2必须分开；不代表混合/N-head/大规模已完成。
3. 原 source/capture/local tools/default Organize/Assist 责任组件的生命周期与 warm hold、编辑页面清单/实际任务排他；原 warm reverse 只读核对，实际回退仍未交付。
4. 用户明确批准的 receipt-only 页面兼容策略、保留草稿的主动刷新提示、pagehide 与最终同步入口保护、完整当前 top-document 清单。历史 UNKNOWN、旧构造器和不可见可恢复页面不因刷新而清除。当前 top 清单不是全生命周期证明。
5. CPV1-09 原生入口仅准备真实 PREPARE/action 接线；Assist 原 signed service 提取和限定桥接测试准备已独审整合。默认原生 owning 未被替换，不能标原生通过。
6. 原始 SDK、数据/发布 fence、人工保护、旧失败、预算与退出未知状态保留。线上官网与其他已合并成果未动。

最后一个 Codex 包已从独审冻结 f16ac431 精确整合为 `afa087563b619de41fd8631f7f933b4084fefcec`：原三个传输成员实际消费 current-top driver，等待真实 HOLD/FENCE/RELEASE 和晚到操作结算，重复 close 保留原失败。完整组合20/23，修正三个测试预期后仅针对3/3，原失败保留；不是一次23/23或原生验收。该源码一次离线构建通过24,886静态检查、708文件及87项改动脚本语法检查，未安装。见最终 CURRENT.md 和 BUILD-afa0875.json。Codex 已停止新增开发，剩余主线由 dot 接续。

## 明确分隔的 HELD

1. `7eabab1259b935ac8908185f5ceceabf2b779f5d` 混合 Source/Working：单次15/16；四条真实发布+fresh/cold通过，bootstrap→edit→append→edit 在发布的原预算失败。原失败 case 仍在 owning 文件。无 post-failure 完整快照，不能声称回滚或本次写了11次。整包不纳入集成。
2. `f19171d3c3f612c298fa3dd84e9d1a1f79934601` 持久 reverse：SDK 后 B 终态阶段触及2MiB，A 终态未完成。7069B 不是总缺口。旧任务没有可跨冷继续的原预算/截止证明，不能补票或重试 SDK。稳定数据成本公式与真实缺口见 reverse-accounting-envelope-design.md。
3. `c7846285863e58f05a167673c4ab77f8a5f52bf4` Assist native owning：两文件语法通过及逐断言映射，未运行。缺默认 runner service 依赖资格、实际 Context 处理来源、跨桥 abort、旧 bare replay 等价性及真实 Chrome 资格。不能把 draft 当成默认 Browser 修复。
4. 收到的旧包内未复核 Context/Sync、失败 Source、旧 native准备与旧build保持原分类。新提交并不自动验证旧候选；优先按现有源及交付记录核差额。

不要合并这些证据分支的整条祖先链。交接包分别给出 bundle 前置 commit 和本候选 deltaBase；读取实际变更与报告后才能决定取用。

## dot 的后续主线

优先闭合真实功能与数据安全，而不是反复跑旧诊断：

- **全局切库**：原 current-top 只覆盖当前可枚举的文档。尚缺可信的旧/可恢复文档初始全集与退役证明，不能拿空 ledger、新 worker 或一次刷新来替代。仍需在原 review reservation 内消费原 owner，并在最终 SDK 同步边界保持整个排他；不能 release 后再 activate。完整链及缺接口见 global-selection-next-implementation-scope.md。
- **Sync 混合/多头及冷恢复**：先明确完整资源与持久结算合同，保留完整 CAS。reverse 的六阶段稳定成本可算，但动态并发返回值与物理结算/冷时钟不能由旧快照保证。原计费可条件化修正不等于容量已解决；不要再用失败正控盲测。Human/Context 混合与更多独立 heads 仍是实现缺口。
- **真实 Topic/AI consumer**：已有 default-off synthetic dual qualification，不要重建一个 mock。生产结构/历史字段来源、独立 Topic 身份 grant 及撤销关系尚需明确权限合同，见 topic-prepared-owner-local-scope.md；当前维护配置仍 null，不自动启用。
- **原生与最终验收准备**：补齐 Assist 真正缺失的 Context/abort/runner/断言映射；按有意义集成里程碑汇总 Source/release、IME、视觉、性能、新设备/真实服务/account 条件。先有明确授权/额度再执行，不能拿 Node/VM 或源码审查替代。
- Thought/Context/Settings/AI Usage/Prompt/Archive/Sync 七项状态均见总表，仍 **NOT_COMPLETE**。Input Archive 不应为并行而虚构重写需求；已发布 Settings 不重做。

## 保留的限制

普通4096引用／2MiB／30秒不变。旧129组特例、100000条 seed、Browser2诊断、PR312两次Full及PR313首Full已用，均不自动续额。新本地代码、审查、打包不是新 native/browser/cloud/真实账户/付费模型/凭据/安装/部署许可。

不得放宽保护、删失败断言、缩数据、换分支或换PR变相重跑；不得清 UNKNOWN、旧任务迁移补额度、自动刷新/关闭页面。更大预算、冷超期写结算、扩大数据字段/账户权限或外部资源要求，先把具体方案、理由、上限及停止条件一次集中给用户决定。

本轮没有 push、main merge、部署或安装。后续若用户明确要求 GitHub 同步，先核当前远端并保持官网和并行成果；不要根据旧授权文本自动发布此交接包。

## 接收与使用

先核总校验清单；取得已知开发基线，再读取/导入01 bundle的本地后继。FILES 是 tracked 差额，不是全仓库；缺失文件从基线取得，删除以 delta.patch/CANDIDATE.json 为准。原始包与三个HELD单独保留。bundle recovery只证明提交对象和tree可恢复，不是测试。

检查当前实际分支、未提交修改、stash和其他任务后，采用独立工作区继续下一主线。不要重复已经完成的本地测试，不要执行日志中的历史命令来“确认一下”。真正失败后保留原日志，修复所需验证与外部耗尽项分账。
