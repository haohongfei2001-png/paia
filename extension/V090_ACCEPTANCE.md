# PAIA v0.9.0 — 最终验收

**Implementation complete. Real export compatibility pending one user-selected smoke test.**

独立分支 `codex/history-onboarding-v090`，基线 `9b41ee5`。全部数据与 Provider 为 synthetic，Chrome 为临时隔离实例。没有读取日常私人数据库、真实导出或真实 Key。详细证据在 [outputs/v090-acceptance](outputs/v090-acceptance/README.md)。

1. **前序收口**：v0.8.1 的原话/AI、有界预算和备份没有发现未收口 P0。回归发现并修复后台重启时阅读刷新/状态轮询的未处理异常，以及 Original 准备阶段的界面锁。另修复旧导入与当前 Input 状态/过滤队列的缺口、跨次分支重新确认、搜索空中间页误显示无结果，以及 Backup 对 0.9 版本/来源分支证据的兼容。旧 consent 回归改走新的真实点击步骤。
2. **Onboarding**：首次欢迎、三项说明、实际捕获同意、可跳过的历史补全。升级已有数据/同意状态的用户直接进入正常产品；started/partial/completed/skipped 独立记忆，无 Key 前置条件。
3. **架构**：在原 bounded reader、规范化协议、ImportCoordinator、四张 import 表和后台唯一写入入口上逐能力集成。新增最小 HistoryCompletionProvider 与 OfficialExportProvider 接口；原仓库只有抽象方向文档，并不存在可直接复用的 provider 基类。
4. **Adapter**：`chatgpt-mapping-v1` / profile version 1。supported registry 可用；real-verified registry 仍空，`realExportVerified:false`。版本与数据库 schema 分开。
5. **ZIP/JSON**：用户选文件，不要求解压。单/多 conversation、数组、明确 conversations/data 包装、文件夹及编号分片；ZIP stored/deflate。1 GiB 文件/总展开、512 MiB 单候选、10k 条目、128 候选、200 倍比例；禁止危险路径、重复名、嵌套/加密/ZIP64/多磁盘/未知压缩，校验本地头、目录、EOF、CRC。
6. **检测**：文件名只用于候选定位，结构决定支持。supported/partial/unknown 与 PAIA Backup 独立识别；未知/损坏全容器在写入 Source 前拒绝。可安全隔离的坏 conversation/消息单独跳过。
7. **用户提取**：稳定 conversation/message identity、author 结构、user role、纯文字 content/parts、可接受发送状态共同校验。只落库规范化用户正文；assistant/system/tool、账户字段、附件内容、文件名及 raw export 不持久化。每 conversation 4096 节点/8192 边/4 Mi 候选字符，每消息 1024 parts/200000 合并字符。
8. **分支**：parent/children/current_node 验证当前链；矛盾/缺失/cycle 不猜顺序，other/ambiguous 新输入进入待确认。后续证据变化重新检查未编辑旧输入；不会写用户删除标记或伪造人工修订。人工编辑/移除/保留/确认继续优先。
9. **身份/去重**：平台+conversation+message 的 SHA-256 来源身份，加精确正文哈希区分快照。同文异来源独立；同来源改文保留旧快照；同包重放幂等，新包只新增/补事实。无稳定 ID 保守跳过，不使用文本相等猜来源。
10. **时间**：profile 明确 Unix seconds create_time，未知→合格 official_export/high；不使用 update_time 或导入时间冒充发送时间。保留可靠旧值，跨分片冲突先预检，capturedAt 与 importedAt 独立。
11. **删除保护**：预检与每批事务重新检查 Source/snapshot 墓碑、Input removal、当前修订、迁移和授权。旧文件、并发 capture/edit/purge、恢复均不能复活删除或覆盖用户工作。
12. **进度与恢复**：先完整检查再明确确认；最多 32 条/512 KiB 一批，数据、索引、统计和断点同事务。取消保留已提交部分；关闭/worker 中断后重选相同文件恢复。可见 Chrome 实际写入 32 条后分别取消/中断，再恢复到 100 条无重复。
13. **Thought 衔接**：新 Input 进入正常本地 delta，不自动建 Topic；旧时间变化只使相关 AI 缓存待更新，保留人工字段和 Original 文本检查点。完成页可查看 Archive 或 Thought Library。
14. **收费保护**：导入、入门、切换、读文件、重启均 0 Provider 请求。AI 仍须单独明确动作，使用现有单次/有界请求和共享预算，无自动重试。
15. **隐私/网络**：manifest 权限/host/CSP 与捕获代码和 v0.8.1 相同；已完成的导入、恢复、1k/10k 和实际包场景网络计数为 0，不包含超时的可选 100k 最终断言。无 Key/原始文件进入备份，未扫描硬盘、Downloads、私人 Chrome profile 或 API 凭据。
16. **性能**：1k 导入 2.1s；10k 检查 4.3s、导入 27.2s、尾页搜索 2.3s；页面 50ms 心跳最大间隔 60.1ms。均为本机 synthetic 观察值。Node fake-IDB 的 heap 包含 fixture 和整个模拟库，不能称为 parser 峰值；Chrome heap 指标只覆盖 archive page。
17. **迁移**：物理 schema 5 / local schema 6 不变，无新增事实库副本。冻结 v0.8.1、v0.8.0、v0.7.2c 同隔离扩展实例升级，领域字段相等、幂等、0 请求；旧分阶段迁移/故障恢复继续全量通过。
18. **测试**：最终完整当前 **930/930 pass，0 fail/skip**，输入摘要 `fd19f0b177387cb26cd808688628da58ab15ec89e32ae5ed6f0e917dd446973d`，concurrency=1。前两轮分别 925/13 fail、927/2 fail：入门点击适配后通过；第二轮模拟库计时和分页撤销独立复测通过。第三轮发现阅读消息通道异常后停止，增加三个先失败再修复的确定性场景。最终第四轮完整串行执行，没有放宽原门槛。各轮证据与最终完整运行分开保存，未拼接局部结果。源码 5286 项包检查与开发审计通过；实际 internal/release 分别通过 5338/4874 项包检查。
19. **长期 E2E**：600 历史来源中 1 个墓碑不复活，595 新增/4 匹配，总 599；保留 1 个移除和人工 Input/Entry 编辑。显式 Original 3 请求/48 Inputs、AI 1 请求，备份恢复数据与分支证据相等、无任务复活。新用户 1k 可见 Chrome 另验证 3 请求/50 Inputs 与 AI 1 请求。
20. **构建**：internal unpacked + ZIP、release unpacked + ZIP 均完成。实际包在新隔离 Chrome 验证入门→历史→阅读→显式整理→备份；release 无 fixture/generator/dev reload/internal 网络诊断。internal 133 文件，ZIP SHA-256 `b886f96795ab2557193d760ed8fff0bd57e6ae37085e52b8364939f1dccdcb9c`；release 125 文件，ZIP SHA-256 `a7a22cfd2557afb6739617a630d2ea40a5dcbe8e548023893bcf753daa929a32`。产物在 `outputs/v090-artifacts/`。
21. **部署**：只覆盖明确授权的 `/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive`，0.8.1→0.9.0。先验证旧文件与冻结 v0.8.1 部署回执相等，再精确路径 rsync；部署后 133 文件 SHA-256 全部等于 internal。未 Reload/卸载/新建日常实例，未读写其数据库。
22. **Checkpoint**：实现与产物来源 `2ba662b5ff9b4eeb57a9bd69095a3fc6bd102f79`；最终标签 `checkpoint-v0.9.0-history-onboarding`。Git clean，不 push。v0.8.0/v0.8.1/v0.7.2c 冻结引用、worktree 与原根工作区状态已复核保留。最终冻结回执记录在 `checkpoint.json`。
23. **非阻塞限制**：额外 100k 压力未在 10 分钟提交时限内完成（总运行约 650.5 秒）；未取得最终来源数量和完成后心跳，不能称该次完整导入或其最后的网络断言通过。正常规模门槛仍为已通过的 1k/10k。真实导出 schema 与真实 DeepSeek 质量仍待各自样本；不支持未知/多模态文本混合、无稳定 ID、超限图、ZIP64/加密/嵌套。恢复需用户重新选择相同文件；授权 30 分钟。大库搜索按 200 行分段推进；PAIA Backup 仍为 64 MB/空库恢复，不承诺百万库完整备份。拖放及最近三次摘要未实现，Settings 保留最近完成摘要及可分页未完成任务。
24. **真实 ZIP smoke**：仍需要一次用户主动选择的官方 ZIP。没有把合成 profile 支持标成官方实测兼容；不因此阻断实现、包和已授权文件部署。
25. **用户下一步**：在 Chrome 扩展页 Reload 已有 PAIA，打开“补全历史输入”，同意本次读取并选择真实官方 ZIP。应用自行检查、预览，再由你点击“开始补全”。无需解压、寻找 JSON、写代码或重新安装。取得导出的官方步骤：[OpenAI 帮助](https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data)。
