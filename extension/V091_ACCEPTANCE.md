# PAIA v0.9.1 — UX & Reliability 验收

基于冻结 v0.9.0，在独立分支 `codex/ux-reliability-v091` 修改现有实现。验收数据全部为合成数据，Provider 为 deterministic fixture；未读取日常私人库或真实 Key。

| 用户需求 | 实现与关键变化 | 核验 |
|---|---|---|
| A · Settings | Key 保存/清除、条数/每日上限与说明常驻；估算、旧额度、phase/HTTP/trace、重试成本置于默认关闭的高级区。 | 隔离 Chrome 正常设置与折叠可见性 |
| B · 待确认 | 输入提供 breadcrumb、返回、说明；实际归入已有文档、独立保留、暂不处理、忽略/恢复，处理后打开对应文档。输出建议可返回思想库、接受后查看内容。 | Chrome 全路径 + 后台事务、幂等与 Source 相等断言 |
| C · 阅读 | Input/Thought 原话分别记住正序/倒序；Input 全局游标分页及上下文定位生效。文档、Topic、独立内容保留一个显式整体版本入口。 | 125 条跨页、重开偏好、菜单检查、既有保存/撤销/历史回归 |
| D · Thought 顶部 | 标题与 AI 开关、搜索、高频创建、Tabs 四层；合并建议带数量，更新/批量按钮依真实 delta 出现，失败后才有重试。 | 合成主页、主题阅读、窄屏截图及条件按钮断言 |
| E · 提示原则 | 未触发时不展示旧额度或失败；显式操作受阻后局部给出重置/Settings。连续整理使用失败后的最新本地用量，取消不报失败。 | 预算与 HTTP 确定性场景、无自动重试/API 计数 |

修改模块：`ui/archive.html/css/js`、`ui/thoughts.js`、`ui/library-updates.js`，新增 `ui/review.js` 与 `ui/action-feedback.js`；后台 `import-handler` / `ImportLedger`、分页查询/索引方向、现有 Organizer 控制元数据及建议处理结果。未新增事实数据库或不兼容迁移。

归入已有聊天窗口指调整 Input 的工作文档归属，原始聊天身份与 provenance 保持不变。相关修订只调整查询文档索引，历史正文不改。最后一条 Input 移走后仍保留原 Source Archive；随后隐藏、恢复和永久删除会同步清理其索引。重复导入、备份恢复和永久墓碑保护均纳入回归。

整体历史入口已去重；主题内章节/单条 Entry 的独立历史仍保留。Thought 的排序针对原话条目；AI 综合页保持语义章节顺序。

## 最终检查

完整回归 **940/940 通过，0 fail/skip**，并发为 1；5512 项源码包检查、开发隐私/权限/网络审计通过。输入摘要 `174fc9dd703c9d611d8a206cf35311a8d42dc799342a2c3ef488e56627028828`。实际 internal/release 已通过入门→导入→阅读→显式整理→备份，以及各 3 项本轮 UX Chrome 场景，错误和非预期外部请求均为 0。

- 本轮早期受影响回归暴露的 Topic 阅读批量按钮隐藏已修复；旧测试改用折叠高级区及显式历史入口，未降低原断言或时间门槛。
- 第一轮完整回归主动中止，用于补齐连续整理期间用量变化场景；该场景已取得先失败、修复后通过证据。第二轮为同步构建脚本的 0.9.1 版本断言/回执而主动中止；两轮都不计作最终门槛。第三轮完整 939/940，唯一失败是旧 M2 断言要求隐藏显式历史入口；按本轮需求改为可见后，该文件 9/9 通过。最终第四轮独立从头运行完整回归，不拼接局部通过结果。
- 边界：本轮不访问真实官方导出或真实 Provider；继承 v0.9.0 的真实 ZIP 兼容性待用户样本验证，以及 1k/10k 已验证规模边界。

## 交付结果

- **已部署**：`/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive`。先验证旧目录等于冻结 v0.9.0 的部署回执，再覆盖到 v0.9.1；135 个文件逐一 SHA-256 等于最终 internal 产物。权限/host/CSP 不变，未读写日常 IndexedDB。
- **产物**：`outputs/v091-artifacts/` 下 internal/release unpacked + ZIP。实际产物包检查分别 5564/5100 项通过；真实产物 UX 分别 3/3，全部合成隔离 Chrome。
- **源码提交**：`7e42e2a6f3cac9a92740e4971d2bf2141c21d4ff`。最终本地 checkpoint 为 `checkpoint-v0.9.1-ux-reliability`，无远端推送。最终提交只增加验收回执，运行代码与完整回归及产物来源相同。
- **Git**：本轮独立 worktree 在最终 checkpoint 提交后核验 clean；旧 v0.9.0/v0.8.1/v0.8.0 worktree 和冻结引用保持不变。原根目录已有的 136 条状态保持原哈希，未纳入本轮修改。
- **激活**：文件部署完成。没有卸载、新建或 Reload 日常扩展；在 Chrome 现有扩展上点一次 Reload 后加载新代码。

回执与日志见 [outputs/v091-acceptance/README.md](outputs/v091-acceptance/README.md)。主要截图：[Settings](outputs/v091-acceptance/actual-release/settings.png)、[Thought 首页](outputs/v091-acceptance/actual-release/thought-home.png)、[倒序阅读](outputs/v091-acceptance/actual-release/input-desc.png)、[动作额度提示](outputs/v091-acceptance/actual-release/action-budget.png)、[待确认归属](outputs/v091-acceptance/ux/review-assignment.png)。
