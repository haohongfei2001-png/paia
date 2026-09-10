# v0.10.1 基线审计与处理

基线为冻结 `5223fa36` / `checkpoint-v0.10.0-ai-memory-mvp`，旧 worktree clean；日常目录全部 139 个文件与 v0.10.0 release receipt 一致。证据：`outputs/v0101-acceptance/baseline.json`。现有 Memory targeted tests 21/21 通过，没有发现 P0/P1 基线阻断。

| 模块 | 实际基线 | 本轮处理 |
|---|---|---|
| 存储 | IDB 5，Thought schema 2，Memory meta v1；无独立 Memory 正文库 | 保留；config 添加可选 externalAccess boolean |
| 授权 | 默认未授权，Profile allow/deny，跨 Profile never，Entry/Section hard exclusion，session grant | 保留所有门禁；SHARE 最先检查全局外部开关 |
| 检索 | Topic/Section/Entry lexical 加权，Topic 权重大，长文 2000 截取 | 并行正文信号优先，2/3 字 n-gram；已经存在正文词面命中时使用弱单字重叠；Unicode 安全相关窗口 |
| currentness | freshness 被用于 current/historical 展示 | freshness 仅数据有效性；展示独立的原话当前/历史/未确认状态 |
| 派生 AI | 严格 evidence/version 绑定的缓存可作为正文 | 本轮仅保留其相关性辅助，不默认外发 AI synthesis 正文 |
| 去重 | 规范化正文直接去重 | 同主题、类型、时间、状态完全重复才合并，保留全部 evidence；不同条件/否定/历史阶段保留 |
| 预算 | 三档 hard cap、条目截断 | 三档不变；相关窗口适应 item cap；移除内容后重新计算冲突说明 |
| 预览 | 连续阅读、依据跳转、临时移除、长期排除、分享前重建 fence | 保留，增加弱状态标签与对外关闭解释 |
| Profiles | 默认也必须看到选择框 | 只有 Default 时隐藏普通选择框；高级 CRUD 不扩功能 |
| 备份/迁移 | namespace strict validation、空库原子恢复、旧版本兼容 | 保存开关；旧 config 兼容 true 保持既有显式分享能力，不新增任何 Topic 授权；失败回滚、重复安全 |
| 活动 | 时间、对象引用、query digest，非正文 | 不变 |
| 部署 | 精确旧 daily unpacked 路径 | 等完整回归和实际产物测试通过后才覆盖；不触碰 private DB/identity |

实现中修正的验证问题：新 Chrome 测试最初漏传编辑接口的 field revisions，已补齐；旧 UI label 断言更新为 AI Context；预算测试将所有候选冲突告警改为仅断言实际输出的不确定状态。首次完整回归主动停止，用于修复长正文候选内存上限；不计作完整通过。

检索 stop rule：单纯权重调整对固定 benchmark 无提升。稀有词加权不能解决完全无共同词项的同义改写，因此未引入该额外状态与复杂度。增加一个受限汉字重叠信号后获得可测提升；不增加同义词表、题目专用规则或继续调参。Recall@10 的小幅下降如实保留，不通过改测试标签掩盖。

实际 release 专项首次在编辑后立即 Build 得到 MEMORY_STALE（5/6 通过）；这是并行本地维护改变 generation 时的安全拒绝。源测试和实际包测试补充三次连续稳定 generation 的只读等待，Build 不自动重试；运行代码保持 7535a3e，不新增功能。修正后重新完整回归及重新构建产物。

最终保真复核修复：跨章节的相同正文不能丢失章节条件；提供原章节/条目标题，去重纳入章节与标题，截断长条目不合并，同内容优先人工来源。新增自动边界断言。第二次重跑主动停止并保留日志，最终以之后完整门禁为准。
