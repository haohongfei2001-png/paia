# v0.9.0 起点与差距审计

2026-09-08；独立 `codex/history-onboarding-v090`，从 `9b41ee579bac1be4ca5511779a9f2ddfd9e78f9d` / `checkpoint-v0.8.1-daily-use-reliability` 开始。硬截止 10:52:37 UTC，10:32:37 UTC 后不新增功能。旧 worktree/checkpoint 和私人安装数据库不变。

| 项目 | 起点状态 | 本轮处理 |
|---|---|---|
| v0.8.0/0.8.1 阅读、人工保护、Topic、AI 单次/有界更新 | 已实现；v0.8.1 当前完整 867 项通过 | 保持并跑受影响/完整回归 |
| ZIP/增量 JSON/指纹/预检/事务批次 | 基础设施已实现 | 复用并增强容器识别与资源防线 |
| 正式历史 adapter | 缺失，旧注册表为空 | 支持明确结构 profile；合成验证与真实 ZIP smoke 分别标记 |
| 分支输入与新版状态/过滤队列 | 集成不完整，直接改 block 会漏掉 inputStates/queue | 在创建前传递 branch 状态，事务内建立一致索引 |
| 再次补全后的分支变化 | 旧实现仅处理新增 Input | 未编辑的已有 Input 转待确认；人工编辑、移除、保留和确认优先 |
| 后台重启时的阅读刷新 | 完整回归发现未处理的消息通道异常 | 确定性断线先复现；保留当前内容、停止失败轮询、恢复后继续读取 |
| 首次使用与历史入口 | 缺失；长同意页、旧“一键同步”占位 | 轻量入门、可跳过历史、Settings 再进入 |
| 持久暂停/恢复/取消/完成摘要 | 部分完成 | 保留文件重选断点，新增持久取消与友好进度 |
| Source/Input/Thought 增量衔接 | 需验证当前模型 | 新输入进入本地增量，导入零 Provider 请求 |
| Backup v1 版本范围 | 只允许 0.7/0.8 | 接受 0.9，保留来源导入元数据，不恢复可运行任务 |
| 真官方 ZIP / 真 DeepSeek | 无样本/Key | 不访问私人文件；本轮合成验收，最终一次用户 smoke 非阻塞 |

已复核当前 IDB physical schema 5 / local logical schema 6，导入四表已存在；不需要破坏性 schema 升级。Input 删除与 Source 墓碑仍分别管理。官方帮助（2026-09-08 查询）只说明主动导出 ZIP，不公开稳定字段 schema：[OpenAI 数据导出](https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data)。因此 adapter profile 是实现支持范围，不是官方兼容认证。
