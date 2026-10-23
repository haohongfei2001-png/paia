# 七计划收尾只读审计（中途停止）— 2026-10-24

## 身份与范围

本线工作树：`/Users/hhf/.codex/worktrees/paia-active-local-consumer/paia`；分支 `codex/human-source-topic-consumer-20261024`。报告前 HEAD 为 `d4df405e4a534450a77c6fe65cda4d67fbf7a334`，其父 `3ab92f5f5d89c1a4df671bcc7665e9c505192f3e` 是 Source/Input 候选。

本轮只读根集成工作树 `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia`，读取时 HEAD 为 `edf4874976797cc241d92ea9df7fa9b3a4f2067f`。未重新读取远端，不能把该 HEAD 当当前 GitHub/main。主线可能继续改变，应以其最终交接为准。

阅读了当前 `PAIA-TAKEOVER-QUEUE-20261023.md`（最新段落至 checkpoint/Prompt milestone）、七计划对账报告、当前七份计划及其权威引用索引，并对下列具体 Sync 源码/测试作了静态核对。**用户要求现在收尾，因此本轮审计未完成；没有穷尽全部保留前版条款或逐项复查全部产品代码。** 未开发、执行测试/build/native/cloud、修改根工作树、push/main/PR。仅本报告独立提交。

## 已确认的两个本地收口缺口

### 1. 不可比较 checkpoint 与 causal tail 尚未接入实际恢复会话

权威：`extension/docs/consumer-product-v1/BROWSER_NATIVE_SYNC_PLAN.md` §3.2(3) 要求通过原恢复 owner 协调因果尾部与不可比较 checkpoint，不能以最新文件为赢家。

实际源码：

- `extension/core/browser-native-sync/recovery-session.js:73` 明确限定历史 cuts/唯一因果后继；`discover()` 在 `heads.length!==1` 时抛 `BNS_RECOVERY_MULTIPLE_CHECKPOINTS`，随后用原 `requireCheckpointRevisionRetention` 检查所选后继保存全部历史 revision。
- 同文件 `recoverDiscovered()` 仅 discover→recover(ref)，stage/recover 接受单个 manifest。没有面向 tail/多头的本会话协调入口。
- `extension/tests/browser-native-sync-local-recovery.test.mjs:56` 对两个真正不可比较 checkpoint 的当前预期是拒绝且旧库不变；这证明安全拒绝已实现，**不证明收敛已完成**。
- 原 `extension/core/browser-native-sync/group-checkpoint.js:455` 与 `checkpoints.js:173` 已有 `reconcileTail`，原 checkpoints tests 也覆盖显式 tail 合并。不能重新发明 restore engine 或声称这些底层功能整体不存在。
- `extension/core/browser-native-sync/checkpoint-publication.js:61` 的 head discovery 也消费上述恢复会话；真实 worker 在 `extension/background/sync-local-lifecycle.js:231` 构造它。因此这不是只存在于未使用 helper 的缺口。

建议的完整包：单独分配 recovery-session/原 publication-coordinator 及所属测试的所有权；先定义并验证完整远端 listing→认证多头/尾部→原阶段恢复/因果合并→原子激活/原 receipt→re-export 的有限本地消费者。保留所有 heads、缺父/未知 codec/损坏/负向事实/本地 staging edit/失联或晚 ACK 保护；不得将安全拒绝直接删除，不能选按时间/列表位置/大小获胜。

有限验收：同一基底分叉的两个合法 head + 后继 tail、重复分页、漏/损坏父、显式冲突保留、B已有本地修改、暂停/重开与激活失败旧库不变、合并后原用户编辑与 cold C/re-export。仅原 fake transport/合成小图即可准备与实现；不得借此消耗已耗云/规模次数。本轮没有实现或执行此包。

### 2. 参数/profile矩阵仍未形成当前集成 owner 的完整测量与冻结证据

权威：同计划 §3.1、§3.2(5) 明确要求 64/256/1024 KiB × 1k/50k/500k committed Inputs，并涵盖长混合语言、大于段的单体、可压缩与解压滥用；实际集成 owner/restore、冷暖、source/release、驻留/解析放大、重启、对象/修订、恢复时间、checkpoint/扫描等分账。不能延期成真实 provider 阶段的问题。

实际源码/证据：

- `extension/core/browser-native-sync/segments.js:7` 仍为 `bns1-candidate-256`，1MiB encoded/4MiB decoded/512 operations/chunk64KiB/target256KiB/decodedConcurrency1。`packOperations` 已支持64/256/1024KiB候选 target；不能声称打包/profile能力全无。
- `extension/docs/consumer-product-v1/implementation/sync/SYNC-WORKING-INBOX-EXPERIMENT.json` 明确是 Node publication/segment + fake IndexedDB，并明确无 native memory/latency claim；数据为 short-single/max-cjk-note 等工作负载和各打包 target，不能当上述整个 corpus × native restore 矩阵。
- 已读取的当前总队列及对账报告保留 profile/规模未验边界；本次针对 scripts/tests 的有限检索未发现可证明已完成全矩阵的当前 integrated-owner报告。**未穷尽所有历史证据，所以结论是“本轮未找到完整证据，现有已核证据不足”，不是宣称仓库绝无任何额外实验文件。**

建议的完整包：先在独立测试/实验目录准备可复用受控驱动与证据 schema，消费已有 packer、真正 canonical owners 与原 restore；明确每单元输入/修订数量、峰值口径、输出 hash、冷暖/source/release与失败停止。小型机械验证和矩阵准备可在本地已授权范围推进；实际50k/500k大矩阵不得从“计划要求”推导成新的运行额度，须由主线集中提出范围/预算/停止条件。未完成矩阵前保持 candidate profile，不能挑常量宣称最优。

## 其余六条计划与当前工作：没有新确认源码缺口，不等于已验收

当前六个非 Sync 计划分别为 Topic、Context、Settings、AI Usage、Prompt/NIB、Archive；本轮已读其当前计划及队列映射，但未完成逐源码全覆盖。

- 总队列 §4.1 已明确是历史缺口，不再分派其中 authored/Placement Topic、structural restore、plain/note/authored/bound Context 的已实现后继。
- Topic identity issuer、默认自动触发/窗口政策、跨来源旧证据读取、真实 AI entitlement/profile/SQL/model、外部 Context client、真实 Sync账户/native平台、视觉/touch/IME/120Hz/安装/部署等仍需各自资格；不能称普通本地 fixture 已通过这些外部义务，也不能以它们阻挡无依赖本地工程。
- Settings Sync入口、原 Prompt手工纠正/插入、Archive年度阅读与精确返回均有当前队列/消费者证据；本轮没有新的实际反例，不建议重复开发。
- 当前 root 并行处理的 Context mixed lineage、负向事实/portable preferences、existing-active inheritance，与本线已完成的 Source/Input 两Topic/原子 receipt 和 cold linked lifecycle 分页修复，应按精确候选整合，不能从旧队列段落当作全新未做任务。

本线 `3ab92f5f` 的完整所属86/87是真实历史；`d4df405e` 已修复唯一原 cold-B page129违反页上限100的问题，两完整所属21/21。20Topic184祖先闭包仍受原128上限拒绝，**未被分页修复解锁**。先前允许的一次129组恢复整体FAIL且机会已耗，不能重复；小 suppression128/129边界测试不是那次规模恢复。

## 交接与下一步

主线可以直接将上述两包纳入连续总队列，分派不重叠文件后推进；本线未改共享 runtime，未抢写者。剩余计划复核应从这个明确未完范围继续，不把报告提交或局部绿作为“全部计划完成”。最终应保留可运行包、七计划实施/验收映射、原失败、真实阻断、使用/回退方式与资源决策。

本报告是收尾交接材料，不批准新的云执行、真实账户/模型/数据访问、付费、安装或部署。
