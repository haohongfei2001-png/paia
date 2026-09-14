# 每小时使用同一条执行指令

建议任务名称：PAIA Overnight Development。
建议配置：一个按小时重复的任务，最多触发8次；不要创建强制对应八个Round的八条不同指令。以下正文不指定绝对开始时间，由任务的Schedule单独设置。重复规则应等价于 `FREQ=HOURLY;COUNT=8`。

---

执行 PAIA 夜间开发的一次受限执行机会，而不是提醒我开发。

仓库：haohongfei2001-png/paia。
产品分支固定为 ux-r2；控制分支固定为 overnight/control-20260914。
本次和后续执行必须以 GitHub 当前真实内容为准，不依赖此前聊天、记忆、上一次运行未提交的本地文件或完成声明。

先解析控制分支 HEAD，在同一固定 ref 读取：
1. overnight/README.md
2. overnight/OVERNIGHT_DEVELOPMENT_STATE.json
3. overnight/OVERNIGHT_DEVELOPMENT_PLAN.md
4. State.last_run_report 指向的执行报告。

再解析 ux-r2 HEAD，校验它与 State.product.expected_head 完全一致；只有 Plan 中精确预登记的 pending_publication 转移允许按其协议恢复，不得采纳其他未知提交。校验冻结 CI 基准 overnight/ci-base-20260914 仍为 ad386c07cff59b9b3472a5aa03626fe89514f8d1，Draft PR #28 的 head/base 未被改变。

产品文件只从经验证的 ux-r2 HEAD 读取；控制分支内继承的 extension/ 文件是旧快照，绝不能当作当前产品。读取产品 extension/AGENTS.md，按其 authority order 读取设计核、完整UX开发规范、当前implementation status和相关产品/架构/安全契约，再读本轮实际源代码与测试。四个启动文件只是入口，不能代替这些必要读取。

遵守 Plan 的并发认领、8次机会/8小时上限、prepare→publish→seal与repair-before-progress。检查上一轮实际diff、测试、CI、receipt、截图/acceptance；存在问题就只修复/重新验证，CI仍运行则记录WAITING_CI，不盲目进下一Round。只有前置门槛全部通过，才从State选第一个允许的未完成切片；不要按第几次触发强行选择ON-几。

先确认本次实际具备GitHub读写、必要批准、原子非强制提交，以及可运行验证环境或可执行并读取完整证据的CI。缺少权限、终端/浏览器/SDK或required gate证据时诚实BLOCKED；不得伪造执行，不得请求绕过批准。只能使用现有允许的工具，不假设Codex、常开电脑或签名秘密存在。

每次最多推进一个有界functional slice。约40分钟后不开始新改动，尽量55分钟内提交可恢复checkpoint并结束；这是预算而非平台时长保证。验证来不及完成时保留明确未认证状态，交由剩余执行机会处理。

禁止修改main、force push、改写已发布历史、任何自动merge、合入main或控制分支、移动CI基准、扩大权限、真实私人数据测试、破坏性迁移、secret落库/日志、隐藏付费请求、降低验收标准。遇到authority冲突、意图不明、数据损失风险、secret/permission问题、未知HEAD漂移或required gate不可验证，按Plan停止，不自行扩权或跳过依赖。

产品代码和官方UX report/status提交到ux-r2；每次执行报告与State只提交到控制分支overnight/目录。所有写入先复核HEAD和独占owner，使用单parent commit和force=false快进；失去所有权或出现未预期新提交立即停止。

每次结束在GitHub记录实际start/end产品HEAD、changed files、实现摘要、每条tests/build/static/lint/CI结果与证据、未解决风险、next recommended action；修复、仅验证和阻断也要记录。未运行写NOT_RUN，不得写PASS；当前无独立lint命令时写NOT_CONFIGURED。提交后重读确认状态、报告和产品HEAD一致，再释放执行锁。

最多8次机会，不自动续期，不创建新任务，不承诺八个Round都完成。所有UX和最终回归通过后才允许Plan里的条件式1.0基础切片；不能把未上架/未部署的模块称为公开1.0。达到次数或截止条件时给出真实最终/部分完成交接，此后不再开发。

本次回复只汇报：执行机会编号、实际Round/模式、做了什么、产品start/end HEAD、验证/CI状态、阻断项、剩余机会和下一步。不要重新写整份产品设计或泛泛路线图。
