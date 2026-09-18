# Canonical execution / Git / recovery protocol

## 1. 唯一事实源与单轮边界

Package ID：`PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`。
唯一队列：远端 `main:extension/docs/archive-navigation-source-v1/STATUS.md`。
`AUDIT.md` 的起点SHA与receipt中的SHA是有时点的证据，不是未来永远不变的main。
独立计划已有明确新授权，不从已结束UIS/旧UIR worktree继续，也不把旧README的分支要求覆盖本包canonical main。
本包没有新supervisor/daemon、没有跨聊天隐形后台执行器；只使用普通Git串行协作、当前状态和每轮receipt。

合法状态：PLANNED → READY → IN_PROGRESS → COMPLETE；任何未解决实质阻碍可BLOCKED。
同一时刻最多一轮READY或IN_PROGRESS。当前轮失败/中断不把下一轮升级；dependency全部完成且远端可验证后才在本轮completion中把下轮设READY。
PLANNED只能被前一轮合法completion推进。COMPLETE有不可伪造的actual evidence，不因一句聊天承诺成立。
IN_PROGRESS中断允许新的用户消息显式恢复同一轮；不重编号，不自动开始下一轮。

## 2. 开始execution

1. 解析远端main真实HEAD，固定SHA读取AGENTS、包README/STATUS/DESIGN/当前round与前receipt。确认用户授权的Package/current round一致。
2. 查最新CI和remote status；前轮只有本地commit、PR未合入或未push，均不算canonical complete。不要从聊天补齐缺证据。
3. 在全新干净工作目录建立当前main基线。已有同轮远端IN_PROGRESS成果只能在用户明确恢复时，从main中可验证的checkpoint接续。
4. 本轮开始将STATUS的current round设IN_PROGRESS，记录execution ID、start main SHA、candidate branch和已读前receipt。先以docs-only commit/push main发布并回读，再写产品代码。
5. 发布前再次fetch，若另一execution已经把本轮改为IN_PROGRESS/COMPLETE，停止而不是覆盖它。普通fast-forward拒绝可阻止两个同时自称已领取；不使用force-push或虚构分布式锁。

这一步只是一份可见状态记录，不新增lease数据库、永久owner锁或无人执行系统。

## 3. 推荐Git/worktree方式

每轮从执行当时最新 `origin/main` 建新临时worktree/branch，名称：

```text
branch: ans/v1/ANS-01-<execution-id>
path:   <independent-clone-parent>/paia-ans-01-<execution-id>
```

其余轮次相同模式。Planning可用独立clone，只写本包Markdown。
不要把产品所有者长期使用的主checkout checkout/reset到另一分支；不要复用 `paia-ui-refresh-v1`、`paia-uir04-exec02`、`paia-uir04-exec04`、`paia-uir04-recover-0713`。
先记录 `git status --porcelain`、`git worktree list --porcelain` 和branch/HEAD。看到不属于本轮的修改就停止隔离，不自动stash/discard/clean。
普通更新示例（执行者必须先替换实际路径/branch，不复制占位符运行）：

```sh
git fetch origin main
git worktree add -b ans/v1/ANS-01-EXECUTION ../paia-ans-01-EXECUTION origin/main
# 仅在新worktree读取/开发；按本轮scope提交。
git fetch origin main
# 未发布的本轮本地提交可在干净工作树 rebase origin/main；冲突先审查，不丢文件。
# 已发布到main的提交禁止改写；新冲突用新的集成提交解决并重跑受影响验证。
```

origin/main漂移时比较diff：仅无关docs更新可复核后集成；相关runtime变化需重读/重做本轮受影响测试。不得以“基线是早先SHA”为由覆盖较新的main。
本包默认串行，所有轮次都可新worktree；没有推荐并行写archive/thought/store的轮次。

## 4. 实现、验证、发布、停止

1. 当前round按DEVELOPMENT_PLAN实现，保持本轮commit scope。每个可恢复片段先保存正确文件；中断前优先commit+push到本轮远端branch，而不是留五个dirty files只写聊天报告。
2. 按VERIFICATION跑focused、privacy/现有回归、browser、visual、full/build gates。失败保持IN_PROGRESS，不删测试、不降低原门禁。
3. 可以把尚未全认证的自洽代码push本轮分支作可恢复checkpoint；它**不等于进入产品**。STATUS/receipt明确branch/candidate SHA，不把下轮READY。
4. 满足本地gate后按当前仓库policy将candidate fast-forward/policy PR合入main；本包起点允许直接main publication。PR未合入不算canonical publication。不得merge无关旧implementation branch。
5. main上的candidate保持IN_PROGRESS，读取该runtime SHA对应远端PAIA Certification。必须conclusion=success且head_sha一致，不能拿另一个分支或早先run凑数。
6. 成功后新增/更新本轮receipt，将当前轮COMPLETE、下一轮READY，commit+push；单独completion docs没有runtime变化时无需为自引用SHA无限提交。
7. 从GitHub重新读branch head、STATUS和receipt，确认依赖及actual文件已经在main；报告runtime SHA和completion/docs SHA分别是什么。
8. **立即停止本execution。**整包预授权不等于同execution可连续跑多轮。下一轮只有新用户消息才开始。

最后一轮COMPLETE时current_round=NONE，其余没有READY；不自动安排ANS-10或夜间任务。

## 5. SHA与认证归属

一个commit不能在自己的内容里填写自身SHA。本包不建立循环pending-publication协议解决普通Git自引用。
Planning：先commit完整计划，再以publication receipt记录该planning SHA；receipt提交作为后续main checkpoint，远端核对它只变文档。
Implementation：receipt记录已认证runtime commit SHA与CI run；包含receipt的completion SHA由GitHub真实branch/路径commit解析，最终报告列出。
STATUS里的planning_commit/start/runtime字段是已知快照；`canonical_head`始终通过远端refs解析，不把预填字符串当锁。
可用 `git diff <certified-runtime>..<completion> -- <runtime-paths>` 证明completion只写docs；无需声称当前docsSHA曾被前一个CI run认证。

## 6. 失败/中断恢复

网络push失败：本地保留commits，receipt写未发布；有分支push能力则保留远端candidate，但不称已进main。恢复后fetch、比较、只重发尚未发布的commit。
CI失败：记录run/step/实际失败而非泛称环境；修正当前round并提交新SHA重跑；不能把上一轮green沿用成这轮pass。
保存/迁移/隐私失败：优先保持数据可恢复，暂停相关写路径；涉及产品边界决策时BLOCKED，写最小需要所有者决定的问题。
远端已有本轮另一个IN_PROGRESS执行：不要抢着覆盖状态；明确冲突并停止。本地未提交成果不丢弃，记录路径/branch/patch范围。
本轮runtime已上main但completion没发：恢复时校验其SHA/CI以及真实diff，补正确receipt，不重复实施同功能、不重新跑下一轮。
不能在恢复过程中reset --hard、git clean、discard、删除旧worktree、force push，或把旧未审计分支整体merge main。

## 7. worktree清理条件

本次planning不删除任何现存worktree，也不处理其dirty changes。
未来本包新建的临时worktree只有同时满足：工作树干净、所有正确成果在main、远端receipt已确认、没有独有未合并commit，且已获得适用清理授权，才可清理。
没有清理授权就保留并在receipt写路径；“看起来是残余”不构成删除依据。旧worktree继续由独立完整性审计决定，不纳入本包顺手清理。

## 8. 后续execution最小启动文本

```text
执行 PAIA-ARCHIVE-NAVIGATION-SOURCE-v1 当前 canonical READY round。
先解析 haohongfei2001-png/paia 远端 main，并读取 extension/AGENTS.md 与
extension/docs/archive-navigation-source-v1/STATUS.md、README.md、
ARCHITECTURE.md、SOURCE_CAPABILITIES.md、DEVELOPMENT_PLAN.md、VERIFICATION.md、EXECUTION_PROTOCOL.md。
只实现当前一轮，严格依赖和验收；提交并发布main、远端验证、更新状态后停止。
不自动开始下一轮，不动旧worktree未提交修改，不把本地/候选分支冒充已进入产品。
```

恢复消息将“READY”改为“明确授权恢复STATUS中同一IN_PROGRESS round”，其余约束不变。
