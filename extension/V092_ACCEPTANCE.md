# PAIA v0.9.2 — Product Hardening & Quality 验收

状态：**完成并部署 v0.9.2 release**。完整回归 968/968、实际产物复验 29/29、构建/隐私门禁与部署哈希通过。当前证据见 `outputs/v092-acceptance/`。

## 基线与范围

- 基线 `990566ba802487a71ab957903ef6bd7f5d6cc47b`，`checkpoint-v0.9.1-ux-reliability`。
- 独立分支 `codex/product-hardening-v092`，开始时 Git clean；原工作区已有修改及旧 checkpoint 不动。
- 物理 IndexedDB 5、逻辑 schema 6、备份格式 v1；不改变身份，不读取私人数据库，不接真实模型，不推送远端。
- 时间窗 2026-09-08 13:01:57–17:51:57 UTC；17:31:57 起不启动新功能。

## P0 修复与数据可靠性（条目 7–10、19–27、31–39）

| 问题 | 改变与回归证据 |
|---|---|
| 页面离开未主动保存；IME 未 collect 时可能误判 clean | `session-lifecycle.js` 统一 collect/flush，beforeunload 对未保存/组合中才提示；新增 Chrome 生命周期测试 |
| Topic 重读后短暂旧 DOM 可以输入却没有保存监听 | 解绑到重读期间 inert，异步 token/导航最后意图生效；延迟读取与末尾文字回归 |
| AI 字段连续输入可无限延期；回包丢失重试产生重复版本 | maxWait 3 秒、UndoJournal、RevisionSession 与事务内幂等回执；连续输入、丢失响应仅一条版本、0 API 测试 |
| AI 并发冲突没有对应重读路径 | 草稿保留、明确确认后读取持久版本，取消确认保留草稿 |
| 备份恢复遗漏移出最后 Input 的原聊天索引 | 按工作文档及原始 Source 聊天共同重建计数；先失败后通过的跨文档备份测试 |
| 完全空白/无有效依据 AI 返回可覆盖旧结果 | 无有效字段时拒绝提交；部分有效/可选空数组继续兼容；旧缓存内容不变 |
| 长查询被定时刷新取消，结果迟迟不出现 | 活跃搜索期间暂停页面定时刷新；慢响应与高频刷新故障注入回归 |
| 独立内容弹窗保存失败后恢复入口在弹窗外 | 弹窗内提供本地重试/确认重读；取消保留草稿，明确放弃后才关闭；3 个新恢复测试覆盖冲突、失败与索引状态 |
| 缺乏安全自检 | 新增只读 7 类完整性检查，100 条/页，取消、重复并发页、数据变化 fence，无自动修复 |

既有 Source 不可变/墓碑、Topic identity、合并引用/版本、人为保护、预算/未知结果、session Key、Provider 错误矩阵、历史补全幂等与迁移中断由本轮完整套件再次验证。可选自动 repair 未实施，避免在有限范围内引入新的数据修改路径。

## 产品与导航（条目 1–6、11–18、28–30、44–65）

- 覆盖 Input 首页/阅读、Thought 首页/Topic/AI 阅读、Settings、Source/Legacy/AI Memory 占位、待确认输入/建议、History、Backup、Revision、搜索与 Onboarding。非首页使用 breadcrumb/返回，弹窗使用关闭/Escape。
- 共用 14 个产品状态，安静延迟 loading、明确空态；错误局部说明现有内容与下一步。保存、重命名、删除、恢复等以轻量本机确认反馈。
- Input/Thought/Topic 查询去抖、高亮、键盘；精确标题→部分标题→正文→AI。跨分页保持阶段顺序，新近时间只在有界结果页内比较。AI 每主题一个命中，不使用 embedding。
- Thought 保留标题/搜索/创建/Tabs；条件出现整理动作与建议，未操作不展示预算耗尽。Grid 3/2/2/1，字体/焦点/边框/按钮轻量统一；三点菜单在悬停前可点击。
- Settings 普通配置不读取整库 Organizer/过滤诊断；只有展开高级区或主动动作才读取。备份期间暂停无关诊断与页面定时刷新。
- Entry 删除可以立即 Undo；Topic 删除确认仅容器，Entry/Source/版本保留，可 Settings 恢复；Revision 普通预览显示标题/正文/备注等自然字段。
- Prompt 增强问题/决定、单次行为/偏好、心理画像与价值推断边界。结构/evidence validator 无法证明真实模型语义正确，本轮仅验证合成输出与明确拒绝行为。

## Journeys 与规模（条目 55–58）

- A：全新安装→跳过历史→合成实时捕获→编辑 Input→显式原话整理→AI→依据内容。
- B：全新安装→官方格式 synthetic JSON 预览→导入→Topic→AI 阅读；导入阶段 0 网络。
- C：编辑→版本预览→删除→Input/Entry Undo、Topic 恢复；来源及编辑保留。
- D：备份→新编辑→恢复冲突预览；非空本机不会被覆盖。
- E：已有 AI→故障保留旧内容→仅手动重试→预算 preflight 阻止→被动导航/重启 0 API。
- 长期混合数据：1000 Sources/Inputs、51 Topics、624 Entries、AI 缓存、2533+ 修订、人工编辑、移除、墓碑、stale；完整性结果 7 类为零。
- 1k/10k/100k 真实合成 IDB，输入搜索与 10k/100k 分段备份、UI 心跳。报告实际耗时与阈值。100k 导出不等于本版支持 100k 恢复；恢复限制仍是 64 MB /100000 项。
- 五个冻结版本 v0.7.2、v0.8.0、v0.8.1、v0.9.0、v0.9.1 同路径升级；同时回归部分迁移、重复执行及 worker 中断。

## 测试与性能结果

最终第 4 次完整串行回归 **968/968 pass，0 fail / 0 skipped**：unit 649、browser E2E 176、adapter contract 95、privacy/security 48。5745 项源码包门禁 / 130 runtime resources、开发隐私/权限/网络审计、当前摘要兼容门禁均通过。完整运行期间 runtime/scripts/tests 未改变。

输入摘要：`51dcb0a0f910872e80086b48bc1bd2e955e8b269cb7dcbe51e0c6212f5cac6b5`。

| 规模 | 标题搜索 | 正文搜索 | 分段备份 | UI 心跳最大额外延迟 |
|---|---:|---:|---:|---:|
| 1000 Inputs | 0.32 s | 0.42 s | 长期混合库另测 | 2.9 ms |
| 10000 Inputs | 1.03 s | 1.85 s | 4.89 s | 14.1 ms |
| 100000 Inputs | 3.93 s | 12.85 s | 60.05 s | 118.4 ms |

1000 Input / 51 Topic / 624 Entry 混合库：启动 0.66 s、Input 列表 0.04 s、Thought Grid 1.14 s、Topic 阅读 0.83 s、Thought 搜索 2.65 s、备份 1.50 s。10k 历史输入 Chrome 检查 4.52 s、导入 31.06 s、导入 0 网络。计时均为本机合成观察值，性能阈值与测试断言未放宽。100k 备份约 170 MB，超过当前恢复大小限制，不能将导出通过解释为可在本版本恢复。

完整证据、按页截图和失败复现保存在 `outputs/v092-acceptance/`；不包含导出正文、真实数据或 Key。

第一次完整回归为修复后来确认的隐藏过滤诊断扫描而主动中断；第二次记录一个旧测试仍等待折叠区预填诊断，并在修复长查询刷新竞态前中断。两次均不计最终通过。第三次完成 965 项：962 通过、3 个旧诊断/透明菜单断言失败；更新为展开后核对、入口可点击后，17 项针对性复验全部通过。第四次用于最终门禁。失败复现/中间数据不作为最终验收证据。

## 构建、部署与 checkpoint

交付四个产物：internal unpacked/ZIP、release unpacked/ZIP。Release 排除开发工具、自重载、fixture 和内部诊断入口，保留默认折叠的必要产品诊断。构建绑定当前完整测试 inputDigest；ZIP 校验与逐文件哈希及实际包 Chrome 验证后，部署 release 到唯一原目录：

`/Users/hhf/Documents/Codex/2026-09-05/chrome-manifest-v3-personal-ai-input/outputs/Personal-AI-Input-Archive`

保持该目录路径与现有 identity，不卸载、不清理 IndexedDB、不操作真实用户内容。实现 commit：`494a2d5d2613f543e291ee14b565589949830ae8`。交付 checkpoint：`checkpoint-v0.9.2-product-hardening`（指向包含最终回执的后续交付 commit）。

- 实际 internal/release 合同测试 1/1，internal 生命周期/旅程/恢复 14/14，release 同组 14/14；共 **29/29，0 fail/skip**。
- Internal 5797 项 / 131 runtime resources；release 5333 项 / 123 runtime resources，release guard 134 files；ZIP CRC 与逐文件内容/hash 一致。
- 2026-09-08T15:16:23.311007+00:00 已部署 release，日常目录从 v0.9.1 更新至 v0.9.2，**134/134 文件 SHA-256 匹配**，权限/CSP/content_scripts 不变。
- 未读写真实 IndexedDB、未卸载或自动重载 Chrome；原路径/identity 保留。用户重载前，已打开扩展仍可能运行旧代码。
- 四个旧冻结工作区 clean、五个 checkpoint commit 未变；原工作区 136 条预存状态的 SHA-256 保持 `1e26e033bd1c1e62a80cc89b439ef551366ec451bfc585dd22e992fc3cf16483`。本轮独立交付工作区提交后 Git clean，无 push。
- 发布 ZIP：[release](outputs/v092-artifacts/PAIA-v0.9.2-product-hardening-release.zip)、[internal](outputs/v092-artifacts/PAIA-v0.9.2-product-hardening-internal.zip)；哈希、来源及路径见 [artifacts.json](outputs/v092-acceptance/artifacts.json)。部署及 checkpoint 见同目录回执。


## 已知边界

- 不覆盖真实登录页面、私人库、真实官方导出文件或真实 DeepSeek 的端到端质量；本轮全部是合成与隔离 Chrome 验证。
- 硬杀浏览器/系统断电发生在未提交 IME 组合文字时仍不能保证最后输入持久；正常导航、后台重启和保存重试已测。
- 恢复仍限空库、64 MB /100000 项；超范围导出有明确提示，必须保留原库。
- 全文排名采用稳定简单规则，并非全库复杂相关度；大库扫描显示进度并保持 UI 响应。
- 不实现可选自动 repair，也不开展 AI Memory、云同步、embedding 等非目标功能。

用户唯一下一步：在 `chrome://extensions` 对原来的 Personal AI Input Archive 点一次“重新加载”。
