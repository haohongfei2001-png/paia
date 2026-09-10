# v0.11.1 final source regression

Full headless serial suite: 1028/1028 pass, 0 fail, 0 skipped. Current source digest `7da85b3fc790918e0f83d66a7e224c37b577f19b2d4701f09ce0ff8fa9f07273`; full audit passed. See outputs/v0111-acceptance/full-summary.json and full-regression.txt. Targeted reading 15/15, compatibility 8/8, same-snapshot/race 1/1, lazy Settings and Settings review passed. Earlier exploratory runs interrupted for real render/editor/lazy-settings fixes and obsolete UI test contracts are not counted as passing. No real Provider or private Chrome profile was used.

# v0.11.0 final source regression

Full headless serial suite: 1019/1019 pass, fail 0, skip 0. Input digest `588956453c2940cb4adb802d586db4463db53753cd3035dc718bc5e568c60aa1`. Synthetic only, no real logged-in ChatGPT validation. Mode PAIA_HEADLESS=1; old test names and visibleChrome receipt fields are historical labels. See outputs/v0110-acceptance/full-summary.json and full-regression.txt. Three initial runs were interrupted for the sidebar version fix, rendered-pin test synchronization, and a real pending-view checkbox race; none is counted as a pass. The pending-view issue has a delayed-save/failure regression test and no Provider retry. The first scale probe assumed complete 50k coverage; its corrected test explicitly proves the 20k cap and honest partial empty result. No runtime retry added.

# v0.10.1 AI Context Quality

完整串行回归 1011/1011，0 fail/skip；inputDigest `9fc64750a7395dc713550e5d0ff7affb1ea44792ac9340158463fd1d9a311746`。隐私/权限/网络及静态门禁通过。Context A–H、many/deep 5000 Entries、冻结 v0.10.0 原身份升级、旧 Memory 与 v0.9.x 全回归通过。详见 V0101_ACCEPTANCE.md 和 outputs/v0101-acceptance/full-summary.json。无真实私人账号/Provider 验收。

# v0.10.0 AI Memory MVP — 当前结果

实际产物追加验收 **11/11 pass**；已部署原日常目录，**139/139 文件 hash 一致**。详细回执见 V0100_ACCEPTANCE.md。

第 5 次完整串行回归 **997/997 pass，0 fail / 0 skipped**。分类：unit 670、browser E2E 183、adapter contract 95、privacy/security 49。本次运行期间 runtime/scripts/tests 未改变；当前输入摘要门禁、源码包门禁、开发隐私/权限/网络检查通过。

输入摘要：`9592a50cf4190500cf04d6fe7e5e4c2fcec6cdbe886dac08eb10f8e8fc71cafd`。

| 主题 | Thought 条目 | 本地 Context Build | UI 最大额外延迟 | Source 正文读取 |
|---|---:|---:|---:|---:|
| 50 | 250 | 0.123 s | 6.7 ms | 0 |
| 500 | 2500 | 0.743 s | 1.7 ms | 0 |
| 1000 | 5000 | 1.239 s | 1.3 ms | 0 |

Memory 所有浏览器场景均为独立 synthetic Chrome，无真实账号、Key、私人数据或真实 Provider。A–F、Profile CRUD/冲突、Section/Entry 排除、跨 Profile 永不提供、快速搜索选择、受控加载延迟、真实 clipboard 写入与 Markdown 下载、空库 Backup 恢复和响应式检查通过。读取 clipboard 为零；Context Build 为零 API。

Memory migration 是同一物理 IDB v5 / 逻辑 schema 6 中的幂等元数据初始化，冻结 v0.9.2 升级保留所有已存在 Source/Input/Thought/Revision 字段；旧 Backup 与新授权元数据恢复兼容。常规 AI Organizer 只使用离线 deterministic provider 验证，不代表真实模型调用。

第 1、2、4 次完整运行主动中断，未计为通过。第 3 次 993/996：两个旧契约断言和一项快速操作组合失败。已统一 11 类完整性断言、唯一明确 Copy 写入白名单，修复 Profile 初始化/焦点、去抖选择及有效授权展示，并增加对应测试；未放宽性能或读取边界。最终结果来自一次完整运行，不拼接局部通过。

证据与完整交付状态见 [V0100_ACCEPTANCE.md](V0100_ACCEPTANCE.md) 和 `outputs/v0100-acceptance/`。下方旧版本数据仅为历史记录。

# v0.9.2 Product Hardening & Quality — 当前结果

最终第 4 次完整串行回归 **968/968 pass，0 fail / 0 skipped**：unit 649、browser E2E 176、adapter contract 95、privacy/security 48。5745 项源码包门禁 / 130 runtime resources、开发隐私/权限/网络审计、当前摘要兼容门禁均通过。完整运行期间 runtime/scripts/tests 未改变。

输入摘要：`51dcb0a0f910872e80086b48bc1bd2e955e8b269cb7dcbe51e0c6212f5cac6b5`。

| 规模 | 标题搜索 | 正文搜索 | 分段备份 | UI 心跳最大额外延迟 |
|---|---:|---:|---:|---:|
| 1000 Inputs | 0.32 s | 0.42 s | 长期混合库另测 | 2.9 ms |
| 10000 Inputs | 1.03 s | 1.85 s | 4.89 s | 14.1 ms |
| 100000 Inputs | 3.93 s | 12.85 s | 60.05 s | 118.4 ms |

1000 Input / 51 Topic / 624 Entry 混合库：启动 0.66 s、Input 列表 0.04 s、Thought Grid 1.14 s、Topic 阅读 0.83 s、Thought 搜索 2.65 s、备份 1.50 s。10k 历史输入 Chrome 检查 4.52 s、导入 31.06 s、导入 0 网络。计时均为本机合成观察值，性能阈值与测试断言未放宽。100k 备份约 170 MB，超过当前恢复大小限制，不能将导出通过解释为可在本版本恢复。

完整证据、按页截图和失败复现保存在 `outputs/v092-acceptance/`；不包含导出正文、真实数据或 Key。

前 2 次完整运行主动中断，不计通过。第 3 次 962/965，3 个旧断言与新的折叠诊断/可点击菜单契约冲突；调整用户流程断言后 17 项针对性复验通过。最终 968 项来自第 4 次一次完整运行，未拼接局部结果。实际产物额外复验 **29/29**（合同 1、internal 14、release 14），0 fail/skip；已部署 release，134/134 文件 hash 一致。详见 V092_ACCEPTANCE.md 与 outputs/v092-acceptance/actual-artifact-tests.json、deployment.json。

# v0.9.1 UX & Reliability — 当前结果

最终完整串行回归 **940/940 pass，0 fail/skip**；源码包检查 5512 项、开发隐私/权限/网络审计与当前摘要门禁通过。

输入摘要：`174fc9dd703c9d611d8a206cf35311a8d42dc799342a2c3ef488e56627028828`。完整过程及按页面截图见 [outputs/v091-acceptance](outputs/v091-acceptance/README.md)，交付状态见 [V091_ACCEPTANCE.md](V091_ACCEPTANCE.md)。

本轮覆盖 Settings 收口、待确认输入四种动作与输出建议回流、125 条全局排序与独立偏好、显式历史入口、条件化首页工具栏、动作局部额度/失败/重试提示。无动作和本地归属处理均 0 API 请求；Provider 仅为合成 fixture。旧版本同扩展升级、编辑/撤销、重复导入、备份恢复、墓碑与真实 IndexedDB 1k/10k/100k 存储性能全部在完整回归中通过。

早期受影响回归发现 Topic 阅读批量入口隐藏，已修复。完整第 1 轮因补连续额度变化场景主动中止；第 2 轮因构建版本元数据修正主动中止；第 3 轮 939/940，唯一失败是旧 M2 要求隐藏整体历史入口的断言。按用户新要求改为显式可见，M2 9/9 复测通过，最终第 4 轮独立完整 940/940。没有拼接局部结果或放宽时间/性能门槛。

实际 final internal/release 的隔离 Chrome、ZIP/hash 与日常文件部署另外记录在验收回执；完整回归不冒充私人日常库或真实 Provider 验证。历史真实官方 ZIP 兼容性仍继承 v0.9.0 的单样本 smoke 边界。

# v0.9.0 History Completion & First-run Onboarding — 2026-09-08

最终当前完整回归 **930/930 通过，0 fail / 0 skipped**：adapter contract 95、unit 632、browser E2E 155、privacy/security 48。完整扫描及包静态/开发入口审计通过。运行期间 runtime、manifest、scripts 和 tests 的输入摘要保持一致：`fd19f0b177387cb26cd808688628da58ab15ec89e32ae5ed6f0e917dd446973d`。

首次完整回归为 925 项、912 pass、13 fail（含父测试失败后的取消）。两组旧浏览器测试缺少新增“开始使用”点击步骤；更新真实 UI 流程后复测通过。另先增加两个失败的分支回归，再补齐已有未编辑 Input 的跨次分支重新确认；人工编辑、移除和明确保留不变。

第二次为 927 项、925 pass、2 fail：并行负载下 fake-IDB 10k 提交超出 120 秒，以及旧分页撤销等待失败。独立运行相同基准提交 66.6 秒、分页撤销 5.5 秒通过。最终使用 `PAIA_TEST_CONCURRENCY=1 node scripts/test.mjs` 完整串行执行全部测试；原计时/事务/隐私/正确性断言均保留。最终全套来自一次完整当前运行，不拼接局部结果。

第三轮在主动 worker 重启暴露未处理的阅读消息通道异常后停止（534 条 PASS 输出，1 项已知失败，未作为完整结果）。随后三个确定性场景先失败再修复：Grid 刷新、自动状态轮询、Original 准备阶段。现在保留现有内容、停止失败轮询、显示固定提示，重新读取可恢复；准备失败释放界面锁且不发 Provider 请求。

可见隔离 Chrome 验证新安装/跳过/升级、真实 file picker、ZIP 分片/结构检测/预览/确认、分支确认、Settings、重复导入、0 网络，以及已提交 32 条后取消或 worker 中断、重新选择文件恢复到 100 条无重复。1k 和 10k 正式导入分别约 2.1s / 27.2s；10k 检查 4.3s、最后页搜索 2.3s，50ms 心跳最大间隔 60.1ms。所有数据为合成，计时是本机观察值。

非阻塞 100k 压力未在 10 分钟提交时限内观察到完成（总运行约 650.5 秒），已关闭临时实例；不声明该次完整导入、最终响应或零网络断言通过。1k/10k 为正式必须通过的正常规模门槛。

600 历史输入链保留墓碑、人工移除、Input/Entry 编辑；导入 0 请求，之后明确授权的 Original 3 次/48 条和 AI 1 次完成，备份恢复保留领域数据与分支证据、不恢复文件/可运行导入任务。另一个新用户 1k Chrome 链完成 Original 3 次/50 条和 AI 1 次。

冻结 v0.8.1 / v0.8.0 / v0.7.2c 的真实程序 schema 在同一个隔离扩展 ID 升级，Source/Input/Entry/Topic/修订字段一致，重复迁移幂等，旧不完整 AI 缓存安全标 stale，升级 0 Provider。旧迁移故障、备份恢复、Capture、Smart Filter、两种 Organizer、Topic Reading、搜索/Settings 与 1k/10k/100k 存储回归保留。

物理 schema 5 / local logical schema 6 不变；权限、host、CSP 与 capture/adapter 代码逐字节对比 v0.8.1。未读取私人日常数据库、真实 Key 或官方导出。Implementation complete；真实官方 ZIP 兼容仍待用户主动选择一次文件 smoke。实际构建、部署与冻结回执见开发工作区 `outputs/v090-acceptance/` 和 `V090_ACCEPTANCE.md`。

---

# v0.8.1 Daily Use, Reading Experience & Reliability — 2026-09-08

最终当前输入完整回归 **867/867 通过，0 fail / 0 skipped**：adapter contract 95、unit 584、browser E2E 144、privacy/security 44。完整扫描、包静态检查与开发入口审计均通过。最终运行期间，runtime、manifest、scripts 与 tests 字节保持不变。

保留前三次完整扫描证据：865 项中 8 项失败；866 项中 1 项初始化偏好竞争失败；867 项中 1 项旧来源入口断言失败。已修复实际交互问题，更新与 v0.8.1 新阅读/偏好契约对应的旧测试；随后重新运行当前完整门禁。没有将不同版本的局部结果拼成一次全绿。

当前 runtime digest：`31cccc8becbf5cdba48622fec19e4de4d712c4b4a9ce562be899cd9cab360fa2`。完整输入 digest：`8bb87c27403d4f145d29698bafcfbcd736b773855e9cb3c14701edcc68b04618`。静态源审计 4,862 项 / 113 runtime resources；release structure 静态检查通过 / 106 resources。

Visible Chrome 使用临时隔离实例、合成 ChatGPT 页面与拦截的确定性 Provider。验证原话分类→Topic→阅读→正/倒序→本地查找→编辑/版本；AI 缓存切换零调用、有限主题更新、证据回看、人工保护、stale/失败/显式重试；延迟偏好不会覆盖新操作。3 次授权完成 50 条 Input；第二次失败停在 2 次；worker 重启和页面关闭均不续发。

长库包含 500 合成 Inputs、30 Topics、360 Entries、人工编辑、移除、墓碑、stale AI 与重要修订。Node 和 visible Chrome 的备份下载、格式/完整性验证、非空库保护、空库事务恢复、重启后检索与用户工作不变量通过。并发导出、缓存页后的 purge、恢复事务失败、数据提交后设置写入中断均有故障测试。300 Entry Node / 150 Entry Chrome 分页与跨页目录通过。

冻结 v0.7.2c 与 v0.8.0 程序的真实 schema 在同一隔离扩展 ID 升级，逐表用户工作一致、部分旧 AI cache 安全 stale、重复运行幂等、零 Provider。旧 v3/v4、失败重跑、1k/10k/100k 与 M2/M3 性能回归保留并通过。物理 schema 仍为 5。

权限、host origin、CSP 与捕获代码不变；备份无 Key、任务或遥测。未读取日常私人数据库或真实 Key，未使用真实 DeepSeek。internal/release 结构的 capture→Organizer→Reading→Settings→Backup 已在隔离 Chrome 验证；最终文件部署及产物 SHA-256 见开发仓库 `outputs/v081-acceptance/`，完整 19 项交付报告见 `V081_ACCEPTANCE.md`。

---

# v0.8.0 Thought Library Productization — 2026-09-08

综合验收 **829/829 通过，0 fail / 0 skipped**：unit 557、adapter contract 95、browser E2E 134、privacy/security 43。执行一次完整扫描后，仅对两份旧版权限断言做 24 项复测；完整扫描原始结果和复测保留，不声称最初全套一次全绿。此后运行时、manifest、脚本与其余测试字节不变。

4,405 项包静态检查、开发入口隐私审计通过。相对 102160d，storage 权限、DeepSeek host origin、CSP 与 ChatGPT content scripts 不变。运行时 digest：`0d45a0442c0f775e4adafc41aba838d40dce6a5e64a218c6492e0e57f60336c3`。完整当前输入 digest：`67d0b3b9e4174d16782157365d7bfff077522fe6e69a7624ff450676040b382d`。

50 条虚构中文 Input 用 20/20/10 三次显式分类，5 Topics / 49 source-faithful Entries，50 个原始输入保留。AI 两次显式点击覆盖 9 Entry 的 Topic，再一次处理单 Entry delta；500 失败保留结果，无自动 retry。另验证 partial 4 有效/1 人工处理、合格来源不丢失。可见 Chrome A–O、Settings 普通/高级、依据到 Input Archive、独立 AI/user revision、字段保护、重启/切换零请求全部通过。

同路径冻结 102160d → 0.8.0 隔离 Chrome 迁移：原文/Input/Entry/Topic/版本一致，人工编辑保留，未知 AI 状态 stale，幂等、零请求。旧版迁移与 1k/10k/100k 存储、M2/M3 性能回归通过。

真实 Key、私人文本与日常数据库未读取，真实 DeepSeek 成功尚需用户最后一次点击确认。不能用 deterministic fixture 声称历史那次 INVALID_SCHEMA 的具体返回字段已定位。完整证据在开发仓库 `outputs/v080-acceptance/` 与 `V080_ACCEPTANCE.md`。

---

# v0.7.2c AI Experience MVP — 2026-09-08

112/112 targeted/directly affected tests passed (107 Node + 5 isolated Chrome), 0 failed/cancelled/skipped. 4139 static package guardrails. Native Chrome uses synthetic intercepted responses, no private data or paid provider. Original classification and source/Entry behavior remain verified. See [final acceptance](AI_EXPERIENCE_MVP.md). No full historical or extreme-scale run.

---

# v0.7.2b Original Organizer Complete internal — 2026-09-08

274/274 targeted and directly affected regression tests passed (253 Node + 21 isolated Chrome), 0 failed / cancelled / skipped. 4035 package guardrails passed. Twenty Chinese synthetic Inputs completed in four explicit batches; cost and local-original-body invariants verified. Real paid DeepSeek and the daily private database are not claimed verified. See [final acceptance](ORIGINAL_ORGANIZER_COMPLETE.md). No full historical suite run. The following sections are historical evidence.

---

# v0.6.2 Light Filter Coverage Improvement internal — 2026-09-07

实现与隔离评估完成：508/508 自动测试、2878 静态 guardrails 通过。新整句语法、分层 metadata 门禁、当前/升级前匿名原因统计已实现。固定合成集 2432 例零误过滤，观察覆盖率由 0.78125% 提升至 11.47204%；不是实际档案覆盖率。离线语义原型不合格，未进入 runtime。真实 125 条 uncertain 分布和阅读改善仍未验证，未部署日常环境。详见 outputs/v0.6.2-acceptance.md 与 LIGHT_FILTER_COVERAGE.md。以下为历史记录。

---

# v0.6.1.1 Smart Filter Diagnostics internal — 2026-09-07

独立实现与隔离验收完成：502/502 自动测试和 2875 静态 guardrails 通过。已修复历史漏排队、自动续跑及最近过滤分页边界；Settings 新增非敏感聚合状态与恢复入口。Light 规则与捕获/时间/导入边界不变。未部署到日常安装，未引入模型或 Thought Organizer。完整结果见 outputs/v0.6.1.1-acceptance.md；技术契约见 SMART_FILTER_DIAGNOSTICS.md。以下旧版本内容为历史记录。

---

# v0.6.1 Smart Filter internal — 2026-09-07

独立实现与隔离验收完成：490/490 自动测试通过，2829 静态 guardrails 通过。默认轻度 / 关闭、完整搜索、Settings 恢复、永久人工保护、增量迁移和安全阅读快照已实现。未引入分类模型、网络或新权限，未部署到日常 Chrome。

完整结果、迁移 marker、对抗评测局限和性能见 [v0.6.1 验收报告](outputs/v0.6.1-acceptance.md)，设计与技术边界见 [SMART_FILTER.md](SMART_FILTER.md)。以下旧版本段落为历史记录。

---

# v0.6.0 IA Refactor internal — 2026-09-07 验收完成

本版本在独立分支 `codex/ia-refactor-v060` 实现并验收。未安装到日常 Chrome，未对当前用户 IndexedDB 执行读取或写入操作。v0.5.0、v0.5.1 preparation/foundation 和 Auto History Sync R&D 的原分支及 checkpoints 保留。

## 自动测试

- 完整结果：**470 PASS / 0 FAIL / 0 SKIP**。包括适配器、捕获/时间、隐私、安全、迁移、编辑器、导入门禁、Revision、Thought 依赖和真实 Chrome 合成 E2E。
- 静态检查：**2619 package guardrails PASS**；development privacy / permission / network audit PASS。
- 输入摘要：`d67e79f48faf34fddec5e90e7bc8b8b1bd364d323f37eb66824caf8f374b0c10`。
- 运行资源摘要：`ea4392a89377f7aaba53be1fdac2d2192f3de73f1006dfcfa5c8bb1f07add639`。
- 自动测试是离线合成测试，不是已登录的私人 ChatGPT 页面兼容性证明，也不是官方导出 schema 验收。

## 迁移与数据语义

原 Library 的 `blocks`、`documents`、`libraryDocuments` 保留原行与字段，逻辑上成为 Input Archive；`libraryText` 是 Input 正文的兼容存储字段。未重建或改写用户正文、备注、标题、排除、时间、墓碑。新增独立 `thoughts` 空间，迁移后为空。

新增 inputStates、inputRemovals、thoughts、categories、dependencies、revisions、invalidations；物理 IndexedDB v3，逻辑旧控制 schema6 保留。每 100 条建立可恢复的 IA 映射/初始历史并同事务推进进度。旧来源原行不复制；没有永久旧原文备份。中断后重开续传。v0.5.1 import task/batch/evidence/source 行逐字段保留。

测试覆盖：空字符串不是整条删除；删除同来源新快照不复活；旧身份补全迁移 suppression；旧数据兼容决策同步更新移除意图；Undo/Revision 恢复；删除、Revision、stale 同事务回滚；永久来源清理关联历史与缓存；时间不受编辑污染；用户 Thought 不被未来刷新入口覆盖；单向依赖。

Revision 保留最近 90 天 **或** 每实体最近 20 个重要版本。重要操作独立记录，普通连续编辑按固定 60 秒窗口合并。编辑时按实体清理，Settings 可执行策略清理；保留期不意味着一到 90 天立即后台删除。没有额外硬容量上限，也不会为了容量突破最近 20 个重要版本的保护。配额失败会拒绝事务并显示未保存。永久删除来源高于所有历史；独立人工文本可保留，原始数据不能从旧版本复活。

数据库 v3 激活后不支持直接安装旧 v0.5.x 运行时降级。Git 代码 checkpoint 不等于用户数据库回滚。日常数据迁移未执行。

## 真实 Chrome 验收

- 浏览器：Google Chrome **152.0.7977.82**。
- 可见验收使用临时隔离配置与明确合成数据。为避免电脑控制选中日常 Chrome，使用官方 Chrome 二进制的临时应用副本，独立应用标识及本地开发签名；没有修改日常 Chrome 或系统安全设置。
- 从真实冻结 `3cbd0ee` / v0.5.0 internal 构造有标题、正文编辑、排除及永久来源忽略的合成档案，经电脑控制真实点击 internal self-reload 加载 v0.6.0。records / library / conversations / settings / preferences 逐字段相等。
- 验证默认 Input Archive、三个一级导航、空 Thought Library、连续正文、逐条发送时间、标题/正文编辑、自动保存、Undo/Redo、删除抑制与重开后恢复版本。
- 验证主题/类型及 Thought 正文编辑、Input 修改后的 stale 提示与用户编辑保护、只读来源侧栏。
- 电脑控制点击永久删除并检查原生确认框。确认后核对来源已删除、Input 和 Thought 关联历史已清理、重新显示同一合成聊天不能复活；独立人工内容仍保留。
- 测试框架的默认自动取消对话框行为已在验收脚本中关闭，确认由电脑控制完成。可见验收产生的记录均为合成数据。
- 扩展发出的网络请求计数为 **0**。AI Memory 仍为禁用占位。

## 性能

在真实 Chrome IndexedDB 上构造 1k / 10k / 100k 数据，随后运行 IA 迁移与单条编辑。以下为本机单次观测，不是 P95 或普遍性能承诺。

| 规模 | IA 迁移 | IA 单条编辑 | 单条编辑行读取 / 写入 |
| --- | --- | --- | --- |
| 1,000 | 0.328 秒 | 2.0 毫秒 | 7 / 7 |
| 10,000 | 3.779 秒 | 2.4 毫秒 | 7 / 7 |
| 100,000 | 43.857 秒 | 3.6 毫秒 | 7 / 7 |

每个规模迁移后 Thought 均为空；计数持久化正确；单条编辑不扫描全库。原有 v0.5.0 分页、搜索、捕获性能回归继续通过。

## 隐私、权限与范围

权限仍仅 `storage`，匹配范围仍是 `https://chatgpt.com/*`，CSP `connect-src 'none'` 保持。页面捕获、来源时间、History Completion provider/读取器/协调器/门禁与 Auto History Sync R&D 未修改。没有新增 AI Organizer、过滤执行、AI 分类生成、AI Memory、MCP 或多设备同步。

真实 ExportAdapter 注册表仍为空，官方历史导入提交继续被拒绝；不把 synthetic adapter 称作已验证官方格式。首阶段无 Thought 新建 UI，但模型支持 `input_derived` 和 `user_created`，后者允许空 inputRefs。

## 交付

- internal：`outputs/Personal-AI-Input-Archive-v0.6.0-internal-candidate.zip`，含 internal self-reload。
- release 结构包：`outputs/Personal-AI-Input-Archive-v0.6.0.zip`，不含开发重载入口；仍属于本次 IA internal 阶段，未公开发布或部署。
- 两包经过内容一致性与 SHA-256 校验；真实验收门禁绑定当前运行资源摘要。
- 本地 checkpoint：`checkpoint-v0.6.0-ia-refactor-internal`。不推送远端。

以下为历史阶段结果，不作为本版本新增功能的验收证据。

# v0.5.1 Official Export History Completion — 基础设施检查点

2026-09-06。从 `86f086b` 延续的 schema-neutral 产品基础设施，分支 `codex/official-export-history-foundation`。正式 ExportAdapter 注册表仍为空；尚未验证真实官方 schema，尚未完成真实导入交付。日常已安装 v0.5.0、outputs 安装目录和用户 IndexedDB 未由本轮操作读取或更新；不宣称做过真实档案 before/after 比对。

## 本轮实现与验证范围

- 共用“一键同步”面板、逐次授权文件选择、独立预检/确认、任务列表分页、暂停与重新选择原文件续传。
- 原生流式 ZIP/JSON、全内容指纹、完整 CRC、UTF-8/token/目录/压缩/资源限制；不会整 conversation JSON.parse。未知 adapter 完整检查成功仍禁止导入。
- ImportCoordinator → 可信档案页后台入口 → IDB 32 条/512 KiB 批次；预检只存哈希/冲突证据；事务完成后回执，暂停/Worker 重启/丢失回执重放保持幂等。
- 新/旧墓碑优先、并发 capture 去重、同文不同 identity 不合并、原文快照不覆盖、Library 正文/标题/备注/排除/修订不重建、official_export 时间补全与可靠旧时间保留、分支歧义的新 block 保守排除。
- 仓库原有 v0.5.0 回归继续执行；新增导入专项全部为人工构造数据，包含隔离真实 Chrome 引擎，不是用户官方导出证据。

## 关键实际检查

1. 隔离 Chrome 正式空注册表：真正点击文件选择器载入人工 JSON；文件名/正文/标题不进入 UI；未创建导入任务、未写入档案、Settings 不变、无扩展网络请求。合成截图 `work/import-ui/schema-gate.png` 不含用户数据。
2. 临时测试扩展编译注册人工 synthetic-v1（仅临时目录，测试后删除）：33 条跨批预检无原文写入 → 关闭暂停 → Worker 真实停止/唤醒 → 重新同意选择同文件 → 确认写入；再次导入档案/Library 逐字段不变。正式源码从未注册此 adapter。
3. 合成旧 v1 数据库附加升为 v2：每个旧 store 的内容与索引、Library 编辑和 Settings 一致；四个新 store 初始为空；旧版本打开明确失败。它验证升级机制，不表示本轮已升级日常数据库。
4. 故障注入验证原子 abort/quota 失败不前移 checkpoint；迟到 begin 授权被暂停撤销；已提交回执丢失后续传不重复；后续 ZIP 分片 CRC 错误阻止所有正文提交；跨批时间/分支冲突在首批提交前可见。
5. 冻结字节校验仍保留。唯一例外为 record-time 的 6 行 official_export 保护分支：去掉这段精确新增内容必须还原原始哈希。其余 capture/network/adapter/SourceTimeResolver/dedupe 字节不变，导入专项验证为何需要这个例外。
6. Library E2E 沿用研究分支已确认的异步可见性等待修复，仅等待 memory panel 实际渲染，不减少任何断言。

## 最终自动结果

- 全量 `node scripts/test.mjs`：**454/454 PASS，0 fail，0 skipped**。unit 225 / adapter contract 95 / browser E2E 94 / privacy-security 40。保留 86f086b 的全部 405 项，新增 49 项；没有删除或跳过旧测试。
- 原有隔离 Chrome 1k/10k/100k IndexedDB 页读取/编辑/捕获/重开/搜索/无 local 正文性能门槛通过。这是 Storage Foundation 回归，不是宣称 100k 官方文件导入性能已验证。
- 包审计 **2390 checks / 56 runtime resources PASS**；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。权限仍只有 storage，无新增网络能力。
- 报告 `work/test-summary.json`：fullSuite=true / auditPassed=true，inputDigest=`a191de6838ffd2a496b4c2424bf6a9512d89362ce40dbcf9d69f7ce1f81bbb7c`；纯合成详细日志 `work/v051-foundation-tests.log`。工作日志和合成截图不进入 Git。
- 实际调用发布准入检查得到预期 `REAL_CHROME_VERIFICATION_REQUIRED`：自动结果有效，旧真实验收不能替代当前新源码的真实验收。没有生成发布包。
- 初轮 447 项中 2 项失败已定位为冻结模块的有意新增分支和 UI 异步等待；修正后全量 451 项通过；最终边界审查补充 3 项墓碑/分支/资源回归并修复后，本次全量 454 项再次通过。


## 未越过的门禁

真实官方文件未取得，schema 与真实 adapter、官方分片命名覆盖、节点/identity/role/text/time/branch 的实际映射、真实重复/增量/恢复验收均未完成。内部 user-source-v1 与 synthetic-v1 不是官方格式声明。资源上限及先完整预检再重新读取的 I/O 成本见 HISTORY_COMPLETION.md；未宣称超限文件、所有超长聊天、百万条导入吞吐或精确峰值内存通过。

未调试 Auto History Sync。`7d05696` 继续为 technically promising / R&D / unverified for production，独立研究保留；`86f086b` 的 Official Export Fallback Preparation 与结构检查器仍保留。当前正式 provider 方向是 Official Export，基础设施完成不等于 v0.5.1 已可发布。

未变更 manifest 版本、未 self-reload 日常扩展、未正式打包。后续需本机主动选择一次官方文件先验证脱敏结构，完成真实适配与验收后才能发布。

以下是不可替代本轮结果的历史报告。

# v0.5.1 格式准备检查点 — 不是 History Completion 完成交付

日期：2026-09-06。稳定基线：`3cbd0ee` / `checkpoint-v0.5.0-storage-foundation-verified`。本次只更新阶段契约和开发用本地导出结构检查器；manifest/package 仍 0.5.0，adapter/content/background/core/ui 与基线无差异，已有 outputs 安装目录未改动。前置检查点：`checkpoint-v0.5.1-format-preflight`。

## 本次实际通过

- 全量 `node scripts/test.mjs`：**405/405 PASS，0 fail，0 skipped**。unit 182 / adapter contract 95 / browser E2E 92 / privacy-security 36。包含所有原有 385 项和新增 19 项结构检查单元测试 + 1 项隔离 Chrome 文件选择交互。
- 既有真实隔离 Chrome IndexedDB 1k/10k/100k 性能门槛和冻结 v0.4.1 迁移/降级反测随全套再次通过。这里的“真实 Chrome”只指实际浏览器引擎与隔离虚构数据，不表示本阶段真实官方导出成功。
- 新增合成测试：本次同意前不读文件、白名单摘要无正文/标题/身份/精确时间/未知键、UTF-8 和 token 跨块、长正文有界丢弃、采样预算、深度/语法/重复键/异常值、ZIP stored/deflate/CRC/加密/压缩比/路径/不支持格式、停止重启、恶意字段不能伪造嵌套路径。
- 隔离未登录 Chrome 打开本地页面，实际点击文件选择器载入合成 JSON，确认结果脱敏、每次重新同意、停止清空、无原始异常、reload 清空；0 页面错误、0 网络请求、0 下载。没有读取日常 Chrome profile、Cookie、真实导出或 PAIA 档案。
- 静态包审计 **1994 checks / 46 runtime resources PASS**；开发工具纳入 privacy/permission/network 审计并通过；JS 语法与 `git diff --check` 通过。开发检查器不进入 internal/release 资源白名单。
- 全量报告 `work/test-summary.json`：fullSuite=true，auditPassed=true，inputDigest=`f3e6776c2540a1ea24f4230bbed15c2f01bdce5b3a92a9a5389717cbcfe241ef`。详细自动日志 `work/v051-format-preflight-tests.txt` 为纯合成测试结果，不进 Git。

## 未完成与阻塞

用户明确回复尚未取得官方导出包。官方资料确认 ZIP / conversations.json / 可能的编号 JSON 分片，但未公布字段 schema；现有网页响应 fixture 不能证明 export 格式。检查器仅探测候选结构，所有报告 archiveValidated=false，提前达到采样预算不能宣称完整文件校验。

电脑控制尝试打开本机 file:// 检查页被浏览器 URL 安全策略拒绝。没有改用其他浏览器表面、调试端口、系统命令或服务器绕过；隔离合成自动测试与这次日常 Chrome 拒绝明确分开。后续真实采样需要用户主动选择官方文件及工具允许的验证条件。未要求用户进行机械产品验收。

尚未实现 ExportAdapter、产品“一键同步”、official_export 时间写入、分支展示、导入事务/任务断点。因而本阶段 duplicate/incremental import、Library 保护、permanent ignore、Worker/reload 恢复等导入专项验收 **均未通过，不能由已有捕获测试代替**。未升级版本、未重载日常扩展、未生成 v0.5.1 internal/release ZIP、未宣称 v0.5.1 完成。下一步先核实真实格式，再按 HISTORY_COMPLETION.md / TEST_PLAN.md 继续实现。

以下为已验收旧版本的历史记录。

# v0.5.0 Storage Foundation — 验收报告（2026-09-06）

基线 **7af4c0e** / checkpoint-before-storage-v0.5.0；交付检查点标签 **checkpoint-v0.5.0-storage-foundation-verified**。仅实现 Storage Foundation，完成后停止，未开始 v0.5.1。架构、schema/索引、迁移恢复、事务边界和容量模型见 [PRODUCT_SPEC.md](PRODUCT_SPEC.md)。

## 自动测试与审计

**385/385 PASS，0 FAIL，0 SKIP**。adapter contract 95、unit 163、browser E2E 91、privacy/security 36。包含全部 v0.4.1 原业务回归；由于唯一后台持久化改为 IDB，旧 browser harness 的直接 storage.local 档案读取改为可信 IDB/后台读取，UI 断言等待异步分页完成；没有减少旧行为断言。

新增覆盖：schema5 所有字段迁移/恢复、backup/copy/verified/sealed/active 五个崩溃点、目标损坏重建与 active 拒绝恢复、事务 abort、编辑重试幂等、并发去重/修订冲突/永久忽略、legacy exact identity/time enrich、清理最终来源后的所有派生索引、冻结旧 store 与新库逐业务操作字段/分层搜索排序对照、分页及跨部分撤销、真实 frozen commit 扩展回退行为和 1k/10k/100k 性能。

1994 项 package guardrail / 46 个运行资源、开发 privacy/permission/network audit、97 个 JS/MJS 与 5 个 Python 语法检查、git diff --check 通过。与 7af4c0e 对比 adapter/、content/、旧 core/store、dedupe/validation/时间解析与仲裁、response-diagnostics、development/、internal 构建/reload 审计基础设施逐文件不变。manifest 除版本名称外保持：仅 storage、相同 ChatGPT 匹配范围和 CSP；无 unlimitedStorage、网络请求、导入文件访问或新权限。

自动输入摘要：`e7b496f0f97d65dd0a0fd209cfe214e6fafc25dce23fe8bb3a07316e8b9ee0a9`；真实运行资源摘要：`1714458b1738147fe1f563413c6c7b8985a3e11232eb3c3022368dc4c69f5a79`。完整日志和只含安全统计的验收回执在忽略的 work/，没有私人正文、标题、URL 或真实截图。原有两个未跟踪解压目录保留。

## 真实 Chrome：日常安装与隔离自动测试分别说明

代理使用当前登录 Chrome 的原生电脑控制，从现有 internal popup 自行点击 Reload。没有读 Chrome profile、Cookie、凭证、Keychain、真实 IDB 文件；没有脚本注入真实扩展页，没有让用户执行测试。

日常安装先保持原文并暂停捕获、备份代码，再覆盖候选构建和自助 reload。后台完成迁移后，Settings 显示 **50 条原文 / 51 条 Library 内容，逐字段一致，恢复验证通过**；这是实际迁移函数比较完整旧逻辑状态的结果，覆盖 originalText/sourceSentAt/capturedAt、Library libraryText/userTitle/note/exclusion/人工整理、sourceTimes、全部 tombstones 和 Settings，而非只比较数量。6 个活跃 Library 文档保留，原来的启用状态已恢复。

- 默认 Thought Library、两层聊天列表与日期文档、共享保留标题、只读 Original Archive、Settings 锁定开关/默认日期时分与弱时间标签通过。
- 既有专用虚构来源的 Library 正文直接编辑后自动保存；原生键盘撤销改变内容，重做恢复。本轮临时正文最终恢复为原有虚构整理内容。原文保持旧虚构输入，原始标题与自定义标题独立。
- 排除该虚构 Library block 后刷新，活跃文档 6→5；已排除区仍保存整理文字，主动恢复后 5→6；原文不随排除删除。
- 重新打开并刷新真实旧聊天，捕获已启用且总记录仍为 50，无重复新增；同一旧来源身份、内容 SHA-256、sourceSentAt 显示日期、capturedAt 前后相同，发送日期早于升级日期。核对只向工具输出布尔值和数量。
- 日常档案的永久忽略墓碑通过完整迁移比较。**本轮未在日常档案再次执行永久删除，也未完成旧忽略聊天的额外搜索重开验收**；没有将此补充步骤声称通过。永久删除→重扫不复活、同文其他来源不受影响的完整行为由本版隔离真实 Chrome 自动业务回归覆盖。

隔离测试使用真实 Chrome、临时无登录 profile 与合成数据，并从 Git archive 提取真实冻结的 **7af4c0e**：旧版产生/编辑/排除/永久删除数据→新版本迁移→同一安装路径和扩展 ID 重新装旧版本并通过原 popup reload。旧 GET_STATE/CONSENT/SET_ENABLED 拒绝，旧页面捕获未改写 local 或 IDB；重新装新版本后数据仍相等。这不是 mock sentinel，也不代表支持旧版写新库。

## 性能实测

| 原文条数 | 构造写入 | 20条文档页：耗时/实体读/正文数 | 单条编辑：耗时/实体读/写 | 新增捕获：耗时/实体读/写 |
| --- | --- | --- | --- | --- |
| 1,000 | 0.29 s | 3.6 ms / 63 / 20 | 7.2 ms / 4 / 2 | 6.1 ms / 14 / 9 |
| 10,000 | 5.24 s | 15.4 ms / 63 / 20 | 1.2 ms / 4 / 2 | 12.7 ms / 14 / 9 |
| 100,000 | 78.24 s | 131.9 ms / 63 / 20 | 1.3 ms / 4 / 2 | 13.4 ms / 14 / 9 |

每档重新打开后总数正确（原数量+1），集合页不读正文，单条编辑始终读4/写2，搜索能找到保留的人工整理字段。100k 构造含500个聊天、长短混合正文，约28MB逻辑原文；本机整个测试 origin（含1k/10k/100k三个独立数据库）的最后 usage 约 198.2 MiB，不声称是100k单库精确容量。耗时是完整并行回归中的本机单次样本，不是P95或所有设备保障；100k主门槛通过，百万条非阻塞 stress 本轮未运行。

## 备份、降级与仍有的限制

迁移前完整安全副本和恢复验证必须成功；复制目标可在 copying/verified 阶段从副本重建。激活时同事务清理旧私人副本，active 后拒绝该恢复入口，防止回退后续用户劳动。没有声称实现 active 大库的最终流式/加密/跨设备全库恢复体系；现有 JSON/Markdown 是原文导出，最终文件仍在内存生成。

**v0.5 激活后不支持直接降级 v0.4.1**。冻结旧代码的实际测试结果是失败关闭；不能将此解释成安全数据回滚。代码 backup/Git checkpoint 不是用户档案备份。新库容量仍受 Chrome 配额和磁盘约束，未申请 unlimitedStorage。

搜索按原包含语义分批扫描，可继续下一部分；无复杂全文索引或全库即时总数。旧2MiB response旁路限制保持原样。没有 History Completion、官方导入、主动历史请求、多设备、sourceRelations/importCommits 或完整分支展示业务。

正式 release 与 internal ZIP 均按各自允许列表逐文件验证；只有 internal 包含现有 development reload。包校验和与文件列表回执在 outputs/ 与 work/v050-delivery.json。最终安装保留 internal 自助 reload。

---
# v0.4.1 internal — 连续文档工作区（2026-09-06）

基线 1c8a81f / checkpoint-before-v0.4.1，保留 v0.4.0 真实验收检查点。原有两份未跟踪解压目录继续保留；只更新实际 PAIA 开发安装目录，未操作 Chrome 配置、Keychain 或用户数据文件。

## 自动验证

最终文案修订后的全量为**365/365 PASS**，0 FAIL，0 SKIP：adapter contract95、unit146、browser E2E88、privacy/security36。覆盖全部既有 SourceTimeResolver、history、sourceSentAt、capturedAt、dedupe、隐私、权限、网络、SPA、Worker/reload 回归。新边界验证包括原子三层迁移、shared userTitle、原始标题/正文隔离、直接编辑/自动保存、会话撤销重做、多来源选区、输入法、保存失败重试、多页冲突、Legacy处理和锁定设置。

开发中测试先复现并修复了两处问题：跨文档打开上下文菜单不再指向前一篇来源；其他标签永久删除来源时会清除被删原文/撤销缓存，同时保留当前文档无关的未保存修改。全条排除后的键盘撤销、旧版概念文案仅保留在兼容入口也有回归。没有修改 adapter/content/时间resolver/去重文件；capture/enrich/purge 方法逐字冻结。后台只在原有可信 UI 门禁内新增编辑事务/偏好/旧数据处理三个操作。

自动输入摘要：`6fed543c5b2efafb5ca8741347f4715e4a332dc7be311ed1539efe712aae9a65`。

1895项正式包 guardrail / 43个运行资源与开发隐私/权限/网络审计通过；91个JS/MJS、5个Python脚本语法及diff空白检查通过。合成宽/窄屏文档视图检查无卡片边框、无横向溢出，日期分隔和弱时间标签正常；图像仅含虚构数据。真实结构Golden仍不可用，与本次原生Chrome验收明确区分。

## 已完成的真实 Chrome 流程

代理通过已连接原生电脑控制、真实登录Chrome和扩展自身popup操作，无chrome://extensions、无用户手工测试、无真实扩展脚本注入。先暂停并核对50条原始记录、6个活跃Library窗口，安装schema5后数量和暂停状态保留；再恢复原先启用状态。原有旧聊天样本的originalText哈希、sourceSentAt、capturedAt、来源身份均保持，发送时间早于捕获时间。真实核对只主张样本与整体数量，完整存储字段等值由隔离Chromium覆盖。

- 默认Thought Library，左导航顺序和Settings位置正确；两层均按真实聊天窗口列表→连续日期/时间/正文阅读。
- 在既有虚构来源A直接编辑正文，自动保存成功；会话撤销改变文本、重做恢复；查看来源信息确认原文和原始标题不变。用户标题自动保存并在Library和Original Archive共用，原始正文只有只读容器。
- Settings确认autoSave和permanentSourceIgnore固定开启、联动删除固定关闭不可选；日期模式切换生效，已恢复默认日期+时分和弱标签。没有旧数据标记时不显示Legacy入口。
- 排除虚构来源A后重开/刷新真实来源，原始记录仍50条，Library查询为0；已排除区保留整理文字，主动恢复后再次进入Library。
- 另建虚构来源C，输入与A逐字相同的文本，自然捕获使原始记录为51。先确认不同source identity、相同原文hash，再只永久删除C；UI报告永久忽略。
- 重开并刷新C的真实ChatGPT对话，记录数保持50，同文搜索仅剩A；幸存来源身份、hash、原始正文和原始标题保留。

最后仅清理popup/扩展说明/存储满提示中的旧“隐藏/回收站”文案。锁屏解除后，代理继续从4a721e8进行最终复验，没有重新开发业务：先从已打开的internal popup点击reload，重载与正式源码逐文件一致的release运行资源；确认重载前后均50条、捕获启用、默认Library和6个活跃聊天文档。

最终release复验：直接修改虚构Library文本并自动保存，Undo/Redo成功，再撤销本次临时修改；原文、原始标题和shared userTitle保持。Settings锁定值、默认弱时间模式正常，无Legacy入口。Original Archive中相同虚构原文只剩幸存来源。重开并刷新真实旧聊天，仍50条，7个时间标签有序；同一旧记录的来源身份、原文hash、sourceSentAt、capturedAt均未变，发送时间早于捕获时间。

以上完整排除/恢复及永久删除后重开流程在本阶段前一轮已通过；本次延续该验收并复核最终重载持久性，不重复删除或新增测试正文。成功后恢复internal popup/script/manifest并再次由代理点击reload：50条、捕获启用、6个文档、shared userTitle和Library整理文字保留；原有排除文档的独立整理文字仍在，显示来源已删除且可恢复。本机安装保留开发按钮供后续自助重载，正式ZIP不含该入口。最终页面停留在默认Thought Library。

最终真实证据绑定release runtime digest `b318194d99f9ed388ea972ebff38b7a579faa8299d33dc47e9514743e0362d27`，只包含版本、摘要、布尔和数量，位于忽略的work/live-debug/verification.json。自动报告仍匹配最终源码；最终checkpoint为checkpoint-v0.4.1-internal-real-verified，自动检查点4a721e8与既有v0.4.0检查点保留。正式包与internal candidate按checkpoint允许列表及ZIP内容逐文件校验，校验和及交付回执保存在outputs/work。

## 数据迁移与限制

schema4→5原子持久化，保留raw、Library文本/备注/排除、稳定来源墓碑、去重和时间账本；新增共享conversation目录、Settings及编辑修订号。旧hidden/trash由一次性兼容入口明确纳入或保持排除，处理完入口消失；不自动恢复、不永久删除旧数据。真实初始50条保留，本轮仅新增并永久删除一个专用虚构来源，最终仍50条；既有虚构A的Library文本和userTitle更新，原文不变。

Undo/Redo限当前文档会话，轻量revision history记录在ROADMAP，公开测试前加入。schema5不能直接由旧v0.4.0代码读取；忽略目录下的代码备份不包含用户数据，也不是数据回滚。没有新增AI、MCP、外部调用、同步或新权限，2MiB历史response预算保持。

---
# v0.4.0 internal — 自助 reload 与真实验收通过（2026-09-06）

本轮仅开发基础设施；`git diff 9918959 -- adapter content background core ui manifest.json` 为空。v0.3.1 冻结链路仍通过逐文件校验，未重新开发 Thought Library。最终检查点：`checkpoint-v0.4.0-internal-real-verified`；9918959 及旧标签保留。

## 自动验证

- **355/355 PASS，0 FAIL，0 SKIP**：adapter contract 95、unit 140、browser E2E 84、privacy/security 36；全部既有 resolver、history、migration、dedupe、SPA/Worker/reload 回归继续通过。
- 全量输入摘要 `97fab4bcb9667f633c07e4e35842e280a7a6d09f16cc062bbf2a072ff545f397`。2305 项正式包 guardrail / 42 个运行资源及 DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS。报告位于忽略的 work/test-summary.json。
- 最终 90 个 JS/MJS 与 Python 脚本语法检查通过；git diff --check、9918959 业务冻结 diff 通过。
- 新增测试覆盖 internal 有按钮、release 无入口/脚本、拒绝受污染 release、manifest 仅构建名称变化、业务文件不变、仅自身顶层 popup 的可信点击和当前 activation 生效、重复点击限制、chatgpt.com/runtime message/window.postMessage/合成 click 不触发。后台拒绝 DEV_RELOAD，不读取或写入 storage。
- Fake ChatGPT + 临时 Chromium 真实加载扩展：自然捕获 3 条，编辑和排除 Library，暂停；从旧 popup 在磁盘部署新入口，重新打开即可使用。点击后读取新 manifest 标记、旧 Worker 堆标记消失；完整 chrome.storage.local 逐字段相等，所有原文、Library 整理及排除状态不丢；无扩展网络请求。
- 测试先失败于缺少基础设施；初版 harness 还揭示 CDP 加载的临时浏览器需显式启用开发者模式，否则 Chrome 在 reload 后禁用 unpacked 扩展。只修正临时测试配置，没有更改日常 Chrome 设置。Worker 对象标识可能复用，因此改用堆标记与磁盘 manifest 共同验证重载。

## 真实 Chrome 验收（代理自行操作）

使用当前已登录 Chrome 和原生工具栏/扩展 popup/档案 UI；网页控制超时后继续使用原生 UI。没有访问 chrome://extensions、没有注入真实扩展页面脚本、没有读取 Chrome 用户配置或存储导出。磁盘验收证据只含版本、摘要、布尔和数量；没有保存真实正文、标题、来源 URL 或截图。

先逐文件确认已安装的 40 个 v0.3.1 运行资源及 manifest 与 79b2856 相同，备份代码到忽略的 work/reload-infrastructure/stable-v031/。更新 popup 的磁盘资源后重新打开即出现开发按钮，**首次部署也无需人工 reload**。先自行重载稳定版本并确认暂停状态与 46 条记录保留，再由已打开 popup 的受控 handler 重载磁盘上的 v0.4.0 release 运行资源。以下八项在逐字匹配 release 源码的构建上完成：

| 真实要求 | 实际结果 |
| --- | --- |
| 默认主页 | 打开档案默认 Thought Library，档案页刷新后仍是默认页 |
| 真实旧聊天分组 | 46 条原始记录迁移后初始显示 5 个真实 conversation 文档 |
| 连续文档 | conversation document 按日期/时间连续正文显示；无聊天气泡/卡片墙 |
| 日期与时间 | 旧记录发送时间早于捕获时间且两者独立；文档日期与同一原始样本一致，7 个已知时间条目有序；新消息无证据时明确显示 unknown |
| 编辑隔离 | 专用虚构 block 编辑后“查看原文”仍为原文本；原始标题独立，自定义标题保存与刷新持久 |
| Library 排除 | 排除后两个真实测试聊天重开/刷新，Library 不复活；排除区保存编辑文本，主动恢复成功 |
| permanent ignore | 仅删除一条专用虚构原始来源；UI 报告永久忽略，重开并刷新来源后记录数不增加；编辑后的 Library 文本保留并显示来源已删除，无原文入口 |
| 同文来源隔离 | 两个不同聊天自然捕获相同虚构输入；删除其中一个后，另一个仍在。选中幸存原始记录，来源身份不同、原文字段和相同 SHA-256 保留 |

原始 46 条未做编辑或删除。两条虚构输入使数量为 48，永久删除一条后为 47；首次重开旧聊天补录 1 条后为 48，随后刷新与再次重开均保持 48。已确认剩余虚构原始记录只有 1 条，已忽略来源未复活。同一旧记录在升级前后以及旧聊天重扫后的原文 SHA-256、sourceSentAt/capturedAt 显示一致。真实不可变检查为样本核对和整体数量，不冒称逐字段读取了全部私人存储；完整存储等值由临时 Chromium E2E 验证。

八项成功后重新部署 internal popup/script/manifest，代理再点击开发 reload。重载后依然 48 条、捕获启用、自定义标题保留、已排除的独立整理文本仍在排除区。当前真实安装目录保持 internal 开发入口，后续修改可由代理重复自助 reload。最后档案停留在默认 Library，6 个活跃文档；专用虚构原始样本标为 PAIA internal acceptance fixture。

真实结果绑定当前 release runtime digest，保存于忽略的 work/live-debug/verification.json；正式 ZIP 仍由门禁验证。生成 internal candidate 与无开发入口的正式 ZIP，并按最终 checkpoint 的允许列表逐文件核对；ZIP SHA-256 及交付回执在 outputs/work，用户数据不入包、不入 Git。schema4 已迁移，不能直接将旧代码备份当作数据回滚。

---
# 历史：9918959 时 v0.4.0 自动验收通过、真实访问受阻

日期：2026-09-06。来源基线 `79b2856` / `checkpoint-real-history-v0.3.1`；实施前建立 `checkpoint-before-thought-library-v0.4.0`。本轮实现检查点：`checkpoint-v0.4.0-internal-auto-verified`。**这不是已完成真实验收的发布检查点。**

## 自动结果

- 基线全量 334/334 PASS；最终全量 **351/351 PASS，0 FAIL，0 SKIP**。分类：adapter contract 95、unit 138、browser E2E 83、privacy/security 35。
- `node scripts/test.mjs` 同时通过正式包 2305 项 guardrail（42 个运行资源）和开发 privacy/permission/network audit。84 个 JS/MJS 及 Python 脚本语法检查通过；`git diff --check` 通过。
- Manifest 与 79b2856 比较只有 version/version_name 变化：仍只有 storage 权限，ChatGPT 匹配范围和 CSP 不变。
- `tests/frozen-capture.test.mjs` 对 v0.3.1 adapter/、content/、SourceTimeResolver、source/history/response/record-time、dedupe、validation 和 response-diagnostics 逐文件 SHA-256 比对，通过。唯一正式捕获入口增量为 store 的稳定来源墓碑门禁；原文、时间候选获取、仲裁、网络与已确认时间字段的写法不变。
- 全量报告源码摘要：`24e9ffe1f7f32370540a2012396fdde33a3327dae46d8d98595764d98272bbe7`，保存在忽略的 work/test-summary.json。文档不在摘要范围内；运行时/测试/审计脚本变更会使报告失效。

## 覆盖与实现

| 要求 | 自动证据 |
| --- | --- |
| 三层迁移、raw→Library、旧备注与整理版、hidden/trash、重载幂等 | library.test.mjs schema1/2→4、原子失败与重试、12 组单元测试 |
| libraryText 编辑不改 originalText/capturedAt/title | 单元逐字段比较 + 自然捕获后的 UI 编辑完整比较 |
| Library 排除不复活、主动恢复、排除持久化 | 原后台存储 + 重扫、页面刷新、Worker 停止唤醒、SPA 浏览器流程 |
| 原始记录永久删除、原文清除、最小来源墓碑 | 同一来源所有快照清除、改正文后仍忽略、源时间账本清除 |
| 相同文本不同 source identity 不受影响 | 单元跨聊天同文 + 两真实 MV3 合成聊天 UI 删除后重新打开 |
| 删除 direct/edited/merged source | 未编辑单源 block 移除；用户整理保留，provenance/mergedSourceIds/originalTextReference/sourceRecordId 逐项解绑 |
| 日期→时间→conversationOrder；unknown 不用 capturedAt | 跨日期、同时间逆序、unknown 捕获日期反序单元；UI 实际日期/时刻和未知标签断言 |
| conversation document grouping、原始与用户标题 | 两 conversation 分组、保存 userTitle 后原始标题/原记录不变 |
| AI Memory access-layer | trusted UI 才能调用，返回 disabled/空 blocks，无外部调用或事实副本 |
| 阅读/编辑刷新与跨标签删除 | 普通 storage 更新保持原文弹窗/未保存草稿；删除最后来源立即关闭清空原文窗口 |
| v0.3.x regression | 全部旧 resolver/history/legacy enrichment、privacy/security、dedupe、export、合成适配器和浏览器生命周期测试继续通过 |

测试先行记录：新增 Library 单元最初因模块不存在失败；新增 E2E 最初因无 Library 默认主页失败。首轮全量出现 3 个旧兼容回放的 UI 导航失败，原因新默认主页使 Archive 按钮不可见；回放显式选择 Input Archive 后通过，未改变数据断言。新增阅读回归先证明原文弹窗被后台刷新关闭，再修复到通过。v0.4 发布门禁先证明旧真实证据不足以拒绝发布，再要求本版本八项真实布尔证据。

视觉检查只使用人工虚构文本：1440px 连续文档和 720px 布局已查看，窄窗口无横向溢出。截图在忽略的 work/v04，不包含用户实际资料。

## 真实 Chrome：全部八项尚未执行，不能宣称通过

已确认电脑控制服务能列出当前 Chrome，并只输出相关页数量；未输出真实标题、URL、正文或截图。对既有扩展档案页发起只读版本/界面状态检查时，浏览器工具 URL 安全策略拒绝访问，并明确禁止通过其他控制表面或间接执行绕过。因此停止真实页面操作，未更改已安装的 v0.3.1 目录、私人档案或真实聊天。

Thought Library 默认主页、真实旧聊天分组、连续阅读、真实日期时间、编辑原文隔离、Library 排除刷新不复活、Archive 永久删除不复活、同文不同来源隔离：**本轮真实结果均为 NOT_RUN_ACCESS_BLOCKED**。旧 v0.3.1 真实成功仍为历史证据，不作为 v0.4 验收替代。

代理已请求恢复此前可用的扩展页面访问能力；不要求用户手工测试。恢复连接后，才可更新同一扩展目录并执行这八项，安全记录当前 runtime digest 与布尔/计数。

## 打包与回退

正式打包命令已执行，按预期被 `REAL_CHROME_VERIFICATION_REQUIRED` 阻止。**没有生成 v0.4.0 正式 ZIP，因此没有伪造 ZIP 校验或真实证据。** 现有旧 ZIP/用户解压目录保持原样。

本轮 checkpoint 保存完整源码、文档与合成测试，可继续真实验收。真正迁移到 schema4 后，旧 v0.3.x 不认识该 schema；Git 源码回退不等于档案数据回滚，也不能恢复已永久删除的原文。本次未更新用户已安装扩展，真实档案尚未迁移。无远端推送。

---

# v0.3.1 internal：真实旧聊天历史响应读取上限修复

本节为当前结果；后文保留各阶段历史记录，不代表当前验收要求。

- **真实 Chrome 通过**：通过电脑控制用户当前已登录 Chrome，在同一旧聊天完成扩展重载、硬刷新、离开再返回、正式档案 UI 核对；无人工 smoke、独立 QA 登录或 sampler。
- 根因证据：真实 fetch 的 exact plural conversation endpoint 返回 messages 数组 JSON，解压后 672430 字节。原 provider 在读取到 540672 字节时触发通用 524288 字节上限，历史解析尚未开始。hook 与授权门禁已存在，响应已被观察；本例并非未订阅 endpoint 或 metadata 在 hook 前丢失。
- 修复：仅同源且与当前 conversation identity 完全一致的 singular/plural detail endpoint 使用 2097152 字节读取上限，其余 other JSON 仍为 524288 字节。HTTP、JSON、时限、并发、结构、exact DOM identity 与时间可信度校验保持原样。未修改 SourceTimeResolver、store、dedupe、adapter 或 bridge。
- 真实结果：3 条 canonical 用户历史记录恢复到 2026-08-30，response candidate present、DOM candidate absent、timeSource=chatgpt_response_create_time、timeConfidence=high。现有 5 份记录/快照集合及 capturedAt、已有内容哈希保持一致；刷新和重复打开无新增。另 2 份不同 identity 的旧快照保持 unknown，不猜测迁移。
- 正文不可变性：真实验证只读取已加载内存中的时间字段和既有内容哈希，没有查询原文；合成 E2E 直接断言 originalText、capturedAt、contentHash enrichment 前后完全相等。档案 UI 实际显示历史发送日及原捕获时间。临时时间核查接口和显示遮蔽已从加载目录移除。
- 自动回归：334/334 PASS，0 FAIL，0 SKIP；包含大于 512 KiB 的 mapping 与超过 64 项的混合 messages 数组，经页面 fetch → MAIN observer → history contract → bridge → resolver → store；页面立即消费、重复响应、错误聊天、普通 other 超限和超过 2 MiB 均覆盖。旧读取取消测试更新为 exact history 的 2 MiB 边界。
- 保留 parity/旧 QA 工具的离线合成回归另有 57/57 PASS，0 FAIL、0 SKIP；未运行真实登录入口。
- 正式包审计：1955 项 guardrail、40 个运行时资源；开发 privacy/permission/network audit 通过。manifest 仍仅 storage，无新增主机/API 权限、扩展网络请求、凭据/profile 访问或遥测。真实响应正文不写文件、日志、fixture 或 Git。
- 交付门禁：全量测试摘要绑定当前源码；正式 ZIP 另要求当前运行时代码摘要对应的真实 Chrome 验证计数和布尔结果。旧 Golden 工具保留为可选离线功能，不再要求用户生成样本；未伪造真实 Golden。

限制：此次真实结论限于当前已打开的旧聊天；大于 2 MiB、无 exact identity 或不满足可信时间合约的响应仍 fail closed。没有测试发送、删除或编辑用户私人数据。

---

# 2026-09-06：开发兼容性采样工具链

结果：主套件 329 项，328 PASS、0 FAIL、1 SKIP。唯一 SKIP 是真实 Golden 回放，原因 REAL_GOLDEN_UNAVAILABLE；尚未收到用户的一次脱敏样本，不能宣称真实 ChatGPT 兼容通过。分类：adapter contract 95、unit 123、browser E2E 76、privacy/security 34 通过。保留 parity/旧 QA 的离线合成回归另有 57/57 通过；未运行真实 QA 登录入口。

新回放证据：离线页面 fetch 故意使用 other endpoint、未命名 items collection；在授权前响应已被页面立即消费。真实 MAIN observer 的开发构建回调进入原 structural detector，缓存在正常授权后经 drain → 原 isolated bridge → canonical exact identity → 未修改的 SourceTimeResolver → store → archive UI。验证只归档 user、无重复、发送日期显示、时间线按发送时间排序、捕获时间独立。另有 DOM+response very_high 回放。禁用 drain 或 structural detector 时早到响应无法恢复时间，证明未从中间注入 metadata。

采样按钮下载经过独立扫描的五文件容器；未知私人 schema 键的浏览器反例不下载，并只显示四个自检状态及固定 reasonCode。单测验证身份别名一致、嵌套/类型/间隔/create-update关系、无正文/URL/email/真实ID/原始时间、超限/歧义拒绝、指纹一致与receipt篡改检测。开发构建测试确认权限不变、正式observer不含开发hook、resolver/store/adapter/bridge与原文件一致。

审计：1954 项正式包 guardrail PASS；开发源码 privacy/permission/network audit PASS；git diff --check PASS。正式manifest、adapter、content、background、core、UI、icons与20dfdb7保持一致；新增开发逻辑只进入独立构建副本，权限仍为storage，无新增扩展网络请求或凭证/profile访问。QA目录忽略，不打包/提交，原有未跟踪输出不改动。

打包门禁：源码/fixture摘要与完整测试报告绑定；修改代码后旧报告被拒绝。正式候选还必须真实Golden回放，无真实样本时拒绝打包；初次开发采样包仅用于取得该样本。实际用户采样尚待完成，未伪造Golden文件或真实验收结果。

自动命令：`node scripts/test.mjs`；`node --test spikes/timegpt-parity/tests/*.test.mjs spikes/timegpt-parity/qa/safe.test.mjs spikes/timegpt-parity/qa/browser.test.mjs`。浏览器均使用合成网站、临时独立目录及离线网络拦截。

---

## v0.3.0 internal：独立时间候选与统一仲裁

基线 `3b09834`（checkpoint-v0.2.4-internal）。本轮实现 `core/source-time-resolver.js`，将 DOM 与 response 的时间候选归于同一 conversation + exact message ID；两个来源都不直接写正式时间。适配器仅从通过 canonical 的 user 消息受限 metadata 提取 DOM 候选；bridge 随扫描或迟到响应重试，后台是唯一持久写入者。response 的严格结构发现路径保持 v0.2.4 行为。

### 仲裁与兼容

1000ms（含）为容差：两源一致取 response 原时间，dom+response / very_high；单源 high；两个有效来源超限则 null / conflict，候选保留在本地账本；均无有效候选为 null / unknown。拒绝的 response 不是可靠候选，不能否决单独 DOM 或降级已验证 very_high。旧单源冲突阻断仍防止给未解析快照猜时间。capturedAt、originalText、ID、内容哈希均保持不变。official_export 和 firstObservedAt 只有注册占位，本期没有导入或采集；firstObservedAt 预留为 approximate，不能覆盖 high/very_high。

### 自动证据与覆盖边界

- Resolver 矩阵覆盖同值、999ms、1000ms、3秒、1天、单源、无源、非法日历、非法create_time、错identity、重复来源冲突及未来低可信输入。
- 后台测试覆盖双向迟到、候选持久化、Worker重建、跨源冲突撤回、不可变字段、拒绝response与有效DOM的隔离。隔离反例先失败，再修复到通过。
- DOM合成浏览器覆盖 time语义、两个明确data属性、title/aria机器时间、拒绝正文内日期/assistant/错ID/无语义/畸形值；验证唯一祖先、祖先歧义、深度/节点上限、重复canonical ID整体拒绝。
- `multi-source-e2e.test.mjs` 两个空库临时Chrome测试由页面DOM属性与页面fetch出发，经MAIN response observer、bridge、后台Resolver、store直到真实archive UI。三条虚构用户消息分别同值、偏差500ms和偏差5秒，断言前两条very_high、第三条null/conflict；DOM-first与response-first均自动迟到enrichment，不注入中间metadata。重复扫描/response无重复，Worker恢复不改记录，时间线按正式发送时间，assistant不归档。
- UI安全摘要仅固定来源存在状态、一致性、日期和可信度；测试逐项检查不含虚构正文、conversation/message ID或候选精确timestamp。真实源可能不暴露合格DOM时间；自动测试不证明真实ChatGPT兼容。
- 既有 other JSON structural discovery、5+15批次、SPA、suspend/wake、dedupe、legacy、隐私、暂停和存储失败回归全部保留。

最终全量 **309/309通过，0失败，0跳过**：unit122 / adapter contract95 / browser E2E68 / privacy-security24。静态审计1954项通过，覆盖40个运行资源；65个JS/MJS与2个Python语法检查通过；git diff --check通过。日志在忽略的 `work/v0.3.0-release-tests.txt`，分组统计在 `work/test-summary.json`。

### 审计与交付

manifest与基线逐字段比较仅version/version_name变化；仍只有storage、仅chatgpt.com脚本范围、connect-src none。新增模块无网络API、凭证访问、请求读取、遥测、页面正文匹配或日志。DOM不进入正文容器、编辑器、附件或非user role。候选只由后台保存chrome.storage.local，永久删除最后一个来源快照时同步删时间账本。原始解压目录保持未跟踪且不修改；ZIP只含明确打包清单，checkpoint与ZIP逐文件字节比对另存忽略的验证报告。

本轮唯一真实smoke：加载v0.3.0并同意后打开同一个旧聊天，在档案中查看至少一条历史输入的“时间来源摘要”：DOM/response是否存在、是否一致、sourceSentAt最终日期或null。无需正文、ID、候选完整时间、控制台或私人截图。此前版本的人工步骤仅为历史记录。

## v0.2.4 internal：fresh-install 正式结构发现全链路

基线 72b805c。用户 clean-install 真实 smoke 的3/3未知与 legacy/dedupe 无关；本轮只改 adapter/history-contract.js 和 content/response-observer.js 的正式结构接入，store/bridge/cache/UI/canonical逻辑保留。

### 代码考古与 A–E 结论

- v0.1.3.2：MAIN inspect → other 的 fingerprint clone（旧URL拒绝前）→ adapter/json-fingerprint.walk/collection/inspect → fingerprint.matches → bridge fingerprints.ingest → core/json-fingerprint.summary 按 conversation + canonical ID 集合计 exact → 安全诊断/UI。这个过程只诊断，不写正式时间。
- v0.2.3：同一个 other clone → JSON.parse → ChatGPTHistoryContract.parse → emitHistory → bridge history.ingest → history.match(canonical IDs) / evidence / flush → CAPTURE或ENRICH → 后台来源校验 → store/applySourceTime → archive UI。
- A/B：授权/HTTP/JSON/大小/路径等门禁通过后，当前 observer 会看到合格 other response；正式旁路在 URL_SHAPE_NOT_ALLOWED/ENDPOINT_NOT_ALLOWED 返回之前已启动，endpoint=other 不会直接阻断它。
- C：分叉在解码后的 parser。旧 fingerprint 能识别任意命名数组/字典、messages字典；正式 parse 只认 mapping字典和 messages数组。diagnostic candidate=true 不会自动成为正式历史来源。
- D：已有 FakeChatGPT E2E 的页面确实 fetch other 查询URL，经过 MAIN；不是从中间注入 metadata。但其正式成功断言用已知 mapping/messages数组，未充分覆盖旧结构发现支持的集合形态。
- E：已有55条 source-time-integration主要断言诊断匹配/语义，未要求结构形态到正式日期/档案UI成功。因此新增三种结构形态的完整正例与六个浏览器拒绝反例。

### 失败原因的证据边界

三个全新临时profile/空库 fixture 先在 v0.2.3 复现：旧fingerprint可见 root object、messagesLike、conversation identity、55消息/5user/5合法ID/5可解析时间/3exact；正式 parser 不识别集合，3条正文自动保存但3条日期未知。JSON统计不能还原 fingerprint #12 的真实键名、集合类型或请求时序，本轮没有读取真实 payload，因此确认的是该代码缺口及其可导致3/3未知的机制，不能声称已证明真实页面唯一根因。

### 新 full browser E2E 证据

新增 tests/structural-discovery.test.mjs 和纯虚构 fixtures/structural-history.mjs。正例采用未知命名数组、未知命名字典、messages字典三种形态，均55消息/5user，DOM只显示3个canonical user；JSON插入顺序反转，时间按用户消息逐日变化。测试仅设置本地 HTTP response，随后合成页面自己 fetch `/backend-api/fixture-history?chat=...` 并立即消费原Response，不向MAIN/bridge/store注入时间元数据。

逐阶段断言：MAIN的原分类为other且旧URL分类仍拒绝；新增正式投影5个user；canonical exact后只有3条正式记录；sourceSentAt逐ID等于response.create_time，timeSource正确、confidence=high、capturedAt介于本次测试开始/结束；原文为DOM的虚构文本而非response/assistant内容。真实archive UI卡片按sourceSentAt倒序、没有“发送时间未知”，阅读区分开发送/捕获日期。重复response后记录逐字段完全相同，无重复，扩展主动/外部请求为0。

六个独立空库浏览器反例：错conversation、缺create_time、非法ID、零canonical exact、响应超512KiB、重复user ID冲突。最终三条记录均unknown，sourceTimes账本为空。无exact命中的最小投影可以暂存在文档等待DOM，但不会进入正式写入；这保留metadata-before-DOM，不把候选当正式来源。

结构契约重新验证，不信任diagnostic布尔：根object、当前合法conversation、唯一完整集合2–64项、深度4/节点128/对象键64；明确role/ID结构，userID合法唯一、create_time为2000年以来且不未来的数值秒、update缺失或合法且不早于create。非user只读role，不读取其ID/时间/content值。集合含被排除键则整体拒绝，不跳过坏项后接受其余。已有命名parse函数逐字不变。

### 执行记录与安全审计

首轮红日志 work/v0.2.4-structural-red.txt：旧诊断计数通过，三个正式浏览器正例全部失败。修复后三个正例及六个反例通过；发现隐私陷阱测试构造时使用对象展开触发自身getter，改用独立fixture保留读取陷阱。另补排除键导致集合不完整的红测试后收紧契约；20项contract/observer通过。

第一次全量只有旧“集合改名必须失败”的产品断言失败；按本轮明确要求改成合法结构改名成功，同时新增缺conversation身份的拒绝情况，没有取消安全反例。最终统一入口 `node scripts/test.mjs`：**287通过、0失败、0跳过**，25个测试文件；unit104、adapter contract93、browser E2E66、privacy/security24（含父/子事件计数）。日志work/v0.2.4-full-final.txt与work/test-summary.json；**1920项静态审计、39个运行资源**通过。新增三个浏览器正例均覆盖discovery到正式archive UI，而非以计数增长作为完成依据。

Manifest权限/CSP/站点范围与基线完全一致（仅版本变化）；已知parse、canonical、bridge、缓存、store、导出、UI与基线逐字节一致（忽略版本）。无新增网络/telemetry/诊断UI/第三方依赖，不读取真实账号、profile、请求体、凭证或助手正文。沿用被动clone的512KiB、5秒、单任务门禁；不补网络请求。62个JS/MJS、2个Python语法与diff审查通过。测试日志/浏览器数据/ZIP/既存解压目录不提交。

检查点命名checkpoint-v0.2.4-internal，提交后生成outputs/Personal-AI-Input-Archive-v0.2.4-internal.zip，48个白名单成员与Git检查点/工作区逐字节校验、CRC/版本/SHA-256核对。校验证据保存于work/v0.2.4-internal-package-verification.json，不推送远端。

最后仅一次相同clean-install smoke：新的解压目录加载并同意启用后，打开同一旧普通聊天，3条历史输入应显示真实发送日期；capturedAt仍为此次抓取时间。真实私有schema/首个响应授权时序未经自动证实，不能从合成测试推定必然通过。

## v0.2.3 internal：legacy identity → 时间最后一跳

基线 ddc0519。实际复现并修复 CAPTURE dedupe 分支遗漏 identity merge：原先只按 sourceKey 应用时间，缺失 sourceKey 时虽不重复保存却补不到日期。现在 CAPTURE 与 ENRICH 共用来源解析，可依据 exact sourceKey、exact chat/message ID，或唯一的来源绑定 dedupe 证明恢复缺失 identity；有缓存时间时同次应用，晚到 metadata 自动补写。originalText/capturedAt/id/contentHash/dedupeKey/conversationOrder 保持原值。没有重做多批 metadata、observer、adapter 或 bridge。

先执行新增 legacy 测试，3 项实际失败（A/B/E 去重修复、D 纯 metadata 恢复、F high 保留）；另单独复现 high 已有但 ledger 缺失时冲突值可污染新快照的问题，再修复。红日志 work/v0.2.3-legacy-red.txt 与 work/v0.2.3-high-ledger-red.txt。修复后定向 35 项通过（work/v0.2.3-targeted.txt）。

| 要求 | 自动验证与边界 |
| --- | --- |
| A | legacy 缺 sourceMessageId/sourceKey/两者，order 已知；保留来源绑定证明时补 identity 和可靠日期，原文/capturedAt 不变。sourceSentAt 缺失/null/unknown 三种均覆盖 |
| B | 新 canonical 命中旧 dedupe，added=0、仅一条记录；identity/time 同次合并，字段矛盾不能绕过来源校验 |
| C | 仅 order，当前唯一或重复都无法跨片段证明历史身份，拒绝迁移；重复 dedupe 证明也不用于模糊恢复 |
| D | 纯元数据路径先恢复 exact identity，无时间保持未知；后续可靠 metadata 到达补时间，不需重传正文 |
| E | 临时 Chrome：已有 legacy 档案，metadata 缓存在新文档中，canonical DOM 后到，当页恢复 identity/time，不重新打开聊天；反向顺序同样通过 |
| F | high 不被后续有效数值冲突/blocked 证据替换或清空，跨 Worker 保持；未知/新快照继续受冲突账本阻断，无 ledger 时也检查已有 high |

全量 `node scripts/test.mjs`：**273 通过、0 失败、0 跳过**，24 个测试文件；unit 104、adapter contract 90、browser E2E 55、privacy/security 24，沿用父/子事件计数。日志 work/v0.2.3-full.txt 与 work/test-summary.json。**1920 项静态审计、39 个运行资源**通过；**60 个 JS/MJS、2 个 Python**语法通过；diff check 通过。

隐私/权限/网络/diff 审查：manifest 除 version/version_name 外不变；除 core/store.js 与 core/record-time.js 的上述修复外，所有运行资源与基线逐字节一致（忽略版本字符串）。无新增权限/请求/telemetry/诊断 UI；canonical、observer、bridge 缓存机制不变。新增 Chrome 用例扩展主动请求和外部请求均为 0，全部页面请求本地 fulfil，未读取日常 profile、账号、真实档案或真实 metadata。原有暂停/来源验证/存储失败/墓碑/assistant/去重/多批生命周期与 UI 回归全部通过。

按本轮 F，两个旧的 high 撤回回归明确改为 high 保留、持久冲突阻断未知/新快照；没有删除测试来掩盖失败。未擅自清除历史 sourceTimes.blocked。真实该条记录的 sourceMessageId/sourceKey/cache 状态未知；order 在 evidence 检查前补写，故 order 成功不能证明时间命中。这次修复的合成根因不能冒称为真实记录的唯一根因。

本地检查点 checkpoint-v0.2.3-internal；不推送。提交后输出 outputs/Personal-AI-Input-Archive-v0.2.3-internal.zip，48 个白名单成员与检查点逐字节校验、CRC/版本/SHA-256 校验，结果保留在 work/v0.2.3-internal-package-verification.json。既存解压目录、ZIP、日志不提交。

唯一真实 smoke：原目录更新并重新加载原扩展，捕获启用后打开原聊天和同一条旧档案记录，确认未知变历史日期且捕获时间/原文不变。仅 order 无来源证明或仍无合格 metadata 时继续未知，不猜配。

## v0.2.2 internal — 分批较老历史回填

恢复基线 925919d / checkpoint-v0.2.1-internal；全部已跟踪文件原本干净，既存未跟踪解压目录保留。最新实际历史日志是 work/v0.2.1-full-final.txt（260 通过），并非已经完成 5+15 的新版本。已存在的生产回填、clone race、SPA fixture 与 Worker 生命周期实现全部沿用。本轮新增回归在未修改生产逻辑的基线上已通过，因此不声称发现新的生产根因；运行资源仅更新版本号到 0.2.2，version_name 为 0.2.2 internal。

定向执行 `node --test tests/enrichment.test.mjs tests/backfill-e2e.test.mjs`：18 通过、0 失败/跳过，包含 5 项新增测试。首次沙箱环境无法启动临时 Chrome 的 6 项失败不计为产品失败；获准启动离线临时 Chrome 后实际通过，证据 work/v0.2.2-targeted-browser.txt。

| 用户要求 | 实际自动证据 |
| --- | --- |
| 1–3：最近 5 条先到、更早 15 条后到、最终 20 条各自可靠时间 | older 5+15 persisted：20 unknown → 精确最新 5 high → 全部 20 high；按 sourceMessageId 逐条对照不同日期 |
| 4：record first → metadata later | 20 条先存；第二批前移除全部消息 DOM、停止并唤醒 Worker；独立后台回填仍成功 |
| 5、8：metadata first → DOM later，merge 非覆盖 | 两批到达时 0 条记录；Worker 唤醒后才渲染 DOM，20 条全部正确，另有 HistoryTime.Model 合并断言 |
| 6：legacy 安全补 identity | schema-1 人工记录交替保留 exact sourceKey 或精确聊天/消息 ID；分批补齐 20 条 identity 与时间 |
| 7：无 exact identity 保持 unknown | 相同正文/标题/捕获时间但缺少稳定身份，以及矛盾身份两条额外记录逐字段不变 |
| 9：high 不被低可信冲突覆盖 | 20 条不同 create_time 配无效 update 不能覆盖 high；已有缺失/无效/LIMIT 回归与真实有效冲突撤回回归继续保留 |
| 10：capturedAt / originalText 不变 | 后台与临时 Chrome 按记录逐字段比较，同时检查 id/contentHash/sourceKey 和重复批次不增记录 |
| 11：可靠恢复时补 conversationOrder | schema-1 未知顺序补为当前 canonical 的 1–20；已知近期片段顺序保持，未伪造全会话顺序 |
| 12：Worker suspend/wake、SPA | 真实 CDP stopped→running 与新 heap 检查；懒加载旧片段、切换另一个聊天及返回，原聊天记录完全不变 |

新增浏览器测试直接加载 MV3；页面立即消费原 Response，旁路完成通过事件及最终存储状态等待，测试不使用真实账号或真实聊天。新场景的扩展主动请求与外部请求均为 0；所有模拟页面请求仅本地 fulfil。现有 8 项 history-observer 回归继续保护双 clone、页面一次读取、独立有界流、授权和诊断生命周期。

最终统一入口 `node scripts/test.mjs`：**265 通过、0 失败、0 跳过**，24 个测试文件。unit 98 / adapter contract 90 / browser E2E 53 / privacy-security 24（沿用父/子测试事件计数）。日志 work/v0.2.2-full-final.txt，摘要 work/test-summary.json。**1920 项静态审计、39 个运行资源**通过；**60 个 JS/MJS、2 个 Python**语法通过；git diff --check 通过。所有运行资源与基线逐字节比较，仅版本字符串不同；manifest 除 version/version_name 外完全相同。

交付检查点命名 `checkpoint-v0.2.2-internal`，仅本地提交，不推送。提交后按既有白名单生成 `outputs/Personal-AI-Input-Archive-v0.2.2-internal.zip`；核对 CRC、48 个成员集合、每个文件与检查点 Git blob/工作区字节一致、manifest 版本与 ZIP SHA-256，校验证据保留于忽略的 work/v0.2.2-internal-package-verification.json。ZIP、日志、浏览器临时数据和既存解压目录均不提交。

唯一未自动验证项仍是当前登录私有页面的 DOM/JSON 与响应时序兼容性。较老消息必须由页面自行加载，且有合格 metadata 与 exact identity；未获得证据时保持 unknown，不补请求，不把 capturedAt 当 sourceSentAt。

## v0.2.1 internal — 2026-09-05

基线 0e4df44 / checkpoint-v0.2.0-internal。用户真实 smoke 结果：可捕获历史正文，capturedAt 未冒充发送时间，但正式发送时间未知，部分旧记录顺序未知。本轮未读取真实聊天、档案、响应 JSON 或用户 Chrome profile；以下根因是代码审查及合成环境实际复现，不能冒称已经证明私有页面的唯一失败原因。

最终统一入口 `node scripts/test.mjs`：**260 项通过，0 失败、0 跳过**，全部 24 个测试文件执行完毕。计数沿用父测试及子测试事件口径：unit 96、adapter contract 90、browser E2E 50、privacy/security 24。相对 v0.2.0 新增 22 项。静态审计 **1920 项、39 个运行资源**通过；**59 个 JS/MJS、2 个 Python**语法通过；git diff --check 通过。

生命周期审查结果：

- A / 身份持久化：v0.1.2 至 v0.2.0 均保存规范化 chatId、sourceMessageId、sourceKey（平台+聊天+消息 ID 的 SHA-256），不存在已知的 conversationId 字段改名。正文哈希仅负责快照去重，不用于 metadata 身份匹配。
- B / 晚到数据：旧实现只有重复 CAPTURE 扫描能补时间，消息离开当前 DOM 后没有独立写入口。临时 Chrome 先保存三条 unknown、移除 DOM、停止/唤醒 Worker、再返回 metadata，原版失败；新增 ENRICH_SOURCE_METADATA 后三条精确来源成功补写。请求不携带原文，后台不创建记录，只串行更新已存在来源。
- B / 候选契约：同一虚构响应的显式 messages 数组包含 message 包装时，已有指纹解析确认 candidate=true 和精确 user 元数据，但正式 contract 原先拒绝，Chrome 回填失败。本轮只接通这个已有受限形态；明确 conversation_id、author.role=user、合法消息 ID、时间和完整集合门禁仍保留，不增加正文或近似匹配，也不放开未知集合名。
- C / 两种到达顺序：文档缓存仅保存已通过 canonical 的最小 ID/顺序证明及最小用户时间。metadata 后到触发独立补写；metadata 先到由后续 canonical 保存直接携带时间。请求与保存同时进行时，用串行后台和在途补写后的再次处理防止遗漏。缓存最多 2000 个来源，每批最多 200；只比较同次确认片段的顺序，缓存插入顺序不充当会话顺序。
- D / 不可变性：原 store 已允许补时间，UPDATE_RECORD 用户编辑接口仍禁止改来源字段和原文。独立 enrichment 允许 sourceSentAt/timeSource/timeConfidence 和未知 conversationOrder 升级；originalText、capturedAt、contentHash、记录 ID、备注/整理版保持不变。缺失、类型无效、未来或容量不足为不可用证据，不覆盖已有可靠值，也不永久污染未知来源；明确有效数值冲突、create/update 逆序、已确认顺序矛盾仍阻断或撤回。
- E / 有证据的身份修复：只在保留的 sourceKey 精确相等，或规范化聊天身份与来源消息 ID 同时精确相等时补缺失字段。已有任一身份字段矛盾则跳过；同时缺少消息 ID 和来源 key 时，即使原文/标题/时间相同也不回填。旧持久阻断标记不因更新而自动清除，以保留跨 Worker 的既有冲突证据。
- F / 生命周期：正式 historySession 与诊断 session/lease 分开，诊断错误/多标签 lease 变化不取消正式读取或清空正式缓存。暂停、授权代次或聊天改变仍失效。首次初始化前开始、授权确认后才返回的原请求，返回时可建立合法副本；未授权就已返回的响应不读取、不缓冲、不重发。Worker 唤醒不依赖档案页；关闭档案页后 metadata-first 仍能成功保存。

新增要求的对应自动证据：

| 要求 | 自动证据 |
| --- | --- |
| record first → metadata later | backfill-e2e 消失 DOM + Worker 实测；enrichment 纯元数据写入 |
| metadata first → record later | backfill-e2e 缓存先到 + Worker 唤醒 + 档案页关闭；product E2E 原两种顺序 |
| unknown → high | enrichment 升级、缺失后可靠样本升级 |
| high 不被低可信覆盖 | 缺失、unknown、INVALID、LIMIT、无效 update_time 均保留 high |
| capturedAt 不变 | 后台和 Chrome 逐字段相等断言 |
| originalText 不变 | 后台和 Chrome 逐字段相等；enrichment body 字段拒绝 |
| unknown 顺序补写 | 缺失身份字段与未知 conversationOrder 的精确 key 补齐；新加载前序片段正确排序 |
| 身份不符不回填 | 错聊天/消息 ID、冲突持久身份、无稳定 key 均拒绝 |
| assistant 不回填 | contract role 过滤/读取陷阱、后台 role 字段拒绝、原 Fake E2E 隐私回归 |
| Worker suspend/wake | 两种到达顺序的真实 stopped→running 和新 heap 检查；补写失败缓存保留并重试 |

竞态回归继续验证页面只能消费原 Response 一次、两个副本先于页面读取建立、原 fetch 的 this/参数/Promise/Response 与唯一调用保持。新增两项观察器测试覆盖初始化请求到达和诊断 lease 切换。没有固定延迟掩盖补写成功；浏览器通过预期存储状态等待，单元通过完成事件和受控流验证。

全量既有 canonical、默认关闭/暂停、临时聊天、SPA、并发去重、同文不同 ID、源编辑快照、配额失败、墓碑、冲突跨重启、时间线、聊天分组、搜索、备注/整理版、隐藏/回收站/恢复、JSON/Markdown、诊断脱敏与 UI 回归通过。Manifest 与基线除 version/version_name 外逐字段完全一致；v0.1.2 canonical 适配器除版本号外逐字一致，旧 response-parser 完全不变。无新增网络、权限、诊断页面、分析工具或第三方资源。

检查点 **checkpoint-v0.2.1-internal**；仅本地提交，不推送。提交后生成 `outputs/Personal-AI-Input-Archive-v0.2.1-internal.zip`，48 个白名单成员与检查点 Git blob 逐字节核对，检查 CRC、成员集合、版本及 ZIP SHA-256；核对证据保留在忽略的 work/v0.2.1-internal-package-verification.json。真实正文、导出、临时 Chrome 数据、ZIP、测试日志与原有解压目录不进入 Git。

唯一未执行的真实 smoke：原目录更新并重新加载扩展（不卸载），保持捕获启用，打开/刷新一个旧普通聊天，查看一条历史消息是否显示实际发送日期，同时 capturedAt 保持本次原有捕获时间（今天）。不要求新消息、诊断页、控制台或私人内容。仍早于授权初始化完成就已经返回的响应及未经验证的私有 DOM/JSON 变化，不能用自动测试宣称兼容，也不以额外请求补救。

## v0.2.0 internal — 2026-09-05

恢复基线为 a603291 / checkpoint-source-time-semantics-v0.1.3.3。保留全部既有修改和用户已有 outputs/Personal-AI-Input-Archive/ 解压目录；未 reset、checkout、restore、revert 或删除已有工作。已读项目约束、最近 8 个检查点、全部 staged/unstaged diff 与新增源码。

最终统一入口 `node scripts/test.mjs`：**238 项通过，0 失败、0 跳过**，覆盖全部 21 个测试文件。分类互斥，计数沿用测试报告的父测试及子测试事件口径：

| 分类 | 通过 | 失败 | 跳过 |
| --- | ---: | ---: | ---: |
| unit | 79 | 0 | 0 |
| adapter contract | 89 | 0 | 0 |
| browser E2E | 47 | 0 | 0 |
| privacy/security | 23 | 0 | 0 |

竞态先单独运行：本地已有的 immediate page body consumption 测试通过。上轮失败日志为 CLONE_FAILED：历史旁路的 await 让旧诊断 clone 晚于页面消费原 Response。本地已有修复以 void 启动历史旁路，在首个 reader.read() 暂停时继续同步建立旧诊断副本，两个读取任务各自有界完成；原 Promise/Response、this、参数和唯一 fetch 调用不变。

本轮将 40ms 固定等待改为真实完成事件，新增流式原正文尚未到齐、历史旁路超限取消、旧诊断 schema 拒绝三项测试。**6 项响应观察测试通过**：页面第一次读取前已有两个独立且已锁定的副本，原正文完全一致，页面第二次读取仍拒绝，旁路互不破坏，不读取请求 body/headers/credentials。临时目录中的旧 await 变体会立即以“1 个副本而非 2 个”失败；没有改写工作区来做反向验证，也没有增加延迟或放宽断言。

磁盘还保留了晚于上轮 233 项绿色报告的 storage-review-red 日志及两项失败测试，本轮先分别复现再修复：后台按 pageOrder 独立检查批次发送时间逆序；加载无效 schema-2 时间账本时，校验成功前不发布到缓存，连续重试继续拒绝。相关存储、来源安全与竞态共 43 项先通过，再进入上述全量通过结果。

共享 Fake ChatGPT harness 在独立临时未登录 Chrome 中真实加载 MV3。自动覆盖：默认关闭/主动同意/暂停代次、assistant/草稿/编辑态排除、多行原文、同文不同 ID、重复观察/响应/刷新、源编辑快照、metadata 先于 DOM 与 DOM 先于 metadata、历史无需滚动补录、精确聊天与消息身份、多聊天隔离、SPA 路由与旧 DOM 清除、未知发送时间补齐而 capturedAt 不变。Worker 测试确认 stopped→running 事件并验证旧内存标记消失，随后检查档案、去重和冲突证据保持。

时间缺失/非法/未来/逆序/更新关系/同 ID 冲突/畸形 JSON/schema 变化全部失败关闭；冲突会撤回来源时间并跨刷新与 Worker 唤醒保持。时间线已知发送时间优先，未知单列；聊天分组、搜索、备注/整理版、原文不可变、隐藏、回收站、恢复、永久删除墓碑、JSON/Markdown 导出全部通过既有及新增回归。契约测试只用人工合成 ID/正文/时间，未读取真实用户内容。

静态包审计 **1919 项、39 个运行资源**通过；**56 个 JS/MJS、2 个 Python**语法检查通过；git diff --check 通过。Manifest 与基线比较：唯一 API 权限仍为 storage，无主机/可选权限，静态脚本只匹配 https://chatgpt.com/* 顶层，CSP 不变。v0.1.2 canonical 适配器除版本号外逐字一致，旧 response-parser 完全不变。静态禁用 API 审计与浏览器请求计数共同确认无新增扩展网络请求；Fake harness 请求本地 fulfil/abort，并阻断外部 DNS。

第一次全量运行因执行沙箱不能启动 Chrome 而失败；使用已授权的临时浏览器执行权限后，全量通过。没有使用用户日常 Chrome profile、Cookie/token、账号或 Keychain。包审计脚本末尾“real Chrome ... remain manual”是沿用的静态工具提示；本节所列临时 Chrome 合成测试已实际自动执行，仅登录私有页面兼容性尚未验证。

交付检查点命名 **checkpoint-v0.2.0-internal**，不推送远端。internal ZIP 在提交后由白名单脚本生成，只含 48 个扩展资源与公开说明文件；每个成员与该检查点的 Git blob 逐字节核对，并检查成员集合、CRC、版本及 ZIP SHA-256。日志、测试报告 JSON、合成浏览器数据、ZIP 和已有解压目录不进入 Git。核对记录位于忽略的 work/v0.2.0-internal-package-verification.json。

唯一真实 smoke 尚待用户完成：在 Chrome 原加载目录更新并重新加载扩展（不卸载），恢复已同意的捕获，刷新一个旧普通 chatgpt.com 对话；确认可见用户文字自动补录，一条历史记录显示符合实际时期的发送日期，与捕获时间分开。既有记录的 capturedAt 保持首次值，本次首次补录的 capturedAt 才是今天。无需诊断页、控制台、发送新消息或反馈私人内容。合成测试不证明当前私有 DOM/JSON contract 或首个历史响应一定晚于授权初始化；不补发历史请求。

## v0.1.3.3 diagnostic — 2026-09-05

最终代码全量自动测试：**197 项通过，0 失败/跳过/取消，37.08 秒**。新增 15 项时间语义/桥接测试与 1 项临时 Chrome 端到端测试；所有既有 canonical、隐私门禁、并发去重、失败持久化、不可变性、墓碑、导出与 UI 回归同时通过。42 个 JS/MJS 语法与 Python 脚本语法通过；静态包审计 **1826 项，35 个运行资源**通过；git diff --check 通过。

合成历史 fixture 人工生成 55 条消息、5 条 user、3 条 canonical，JSON 字典故意逆序，仍按 canonical 得到 3/3 精确匹配和 2 对无逆序。覆盖 Unix 秒/小数、错误类型/毫秒/未来、所有年龄桶边界、缺失和无效时间、可选 update_time 合理性、严格早于固定诊断采集边界、同 ID 冲突粘性、不同会话排除、部分匹配/单消息/零样本/资源截断不得 high。正文/assistant ID 与时间/凭证设读取陷阱；摘要和 UI 无原始值。

在全新、临时、未登录 Chrome 中实际加载 MV3，全部网站请求由本地 fixture 拦截：验证 MAIN→ISOLATED→后台内存→UI、正确时期 high/错误时期 fail、重复响应与冲突、刷新/暂停/恢复/第二标签/同计数聊天切换/canonical 范围变化清空、UI 请求卡住自动撤销过期 high。无额外扩展请求；三个既有虚构档案逐字段不变，storage 无 sourceSentAt、响应正文或语义时间映射；诊断页不能读取 GET_STATE。既有四条虚构记录回归也通过。宽 1100 与窄 720 像素合成截图已查看，窄屏无水平溢出；截图仅在忽略的 work 目录，不入 Git/ZIP。

恢复基线 c8216fd / checkpoint-json-fingerprints-v0.1.3.2。与基线字节比较：content/capture.js、adapter/response-parser.js、content/response-observer.js、core/store.js、core/validation.js、core/dedupe.js、core/export.js、ui/archive.js、background/service-worker.js 全部不变；canonical 适配器与 fd6d7ab 的 v0.1.2 比较仅版本号变化。Manifest 仍仅 storage，站点范围/CSP/MAIN 入口均未改，只新增本地 ISOLATED 语义模块。

测试环境第一次启动 Chrome 被系统沙盒阻止；按本轮授权使用临时测试启动权限后完成全部浏览器检查，没有使用日常 Chrome 配置或登录数据。审查修复：单标签资格撤销后更换文档内诊断 session，拒绝资格恢复后的旧在途结果；后台保留已知第二聊天限制；UI 过期/卡住不能保留 high；原始 canonical 数量在进入两个诊断模型前分别传递，>2000 明确截断。上述修复均进入最终 197 项全量通过的代码。

**真实限制：** 本轮用户已确认的仅为 v0.1.3.2 安全统计（55/5/5/5/5，canonical=3，exact=3）；未访问用户登录页，v0.1.3.3 真实时间语义尚待 README 三步。beforeCapture 比较本次 canonical 入口的诊断采集边界，不读取或改写旧记录 capturedAt，不宣称验证旧记录精确时间；high 只属于当前可见样本与人工时期，不证明跨刷新逐 ID 时间稳定。

本地交付检查点：checkpoint-source-time-semantics-v0.1.3.3。不推送远端。提交后用 scripts/package.py 打包，并逐文件与该 Git 提交比较字节及成员白名单；ZIP、测试日志、合成截图和两个既有未跟踪解压目录均不加入 Git。包核对结果单独记录在忽略的 work/v0.1.3.3-package-verification.txt。

## v0.1.3.2 diagnostic — 2026-09-05

最终全量自动测试：181 项通过，0 失败/跳过/取消，约 36.71 秒；37 个 JS/MJS 语法与 Python 脚本语法检查通过；静态包审计 1725 项、33 个运行资源通过；git diff --check 通过。

新增 9 个指纹测试覆盖有界探测、根数组、候选判据、身份缺失、精确 chat+ID、分组不依赖值、隐私读取陷阱、分组上限和候选保留、JSON MIME/查询参数路径、HTTP/origin/redirect/类型/大小门禁、认证路径与字段排除、已知第二聊天心跳过期防绕过。

临时无账号 Chrome 合成 MV3 端到端增加 other 历史 JSON fixture：4 条 canonical 精确匹配，原正式 metadata/acceptedResponses 仍为 0，四条虚构既有记录逐字段不变，指纹 UI 不显示原始值。第二个普通聊天撤销诊断资格、清空；关闭后重新取得资格但旧指纹不恢复。没有访问真实 ChatGPT、日常 Chrome 配置或用户档案数据。

与 fd6d7ab 比较：canonical 适配器仅版本号变化；core/store.js、validation.js、dedupe.js、export.js、ui/archive.js 不变。与 da27e83 比较：adapter/response-parser.js 原文件完全不变。权限仍仅 storage；新增本地 MAIN/ISOLATED 指纹模块和后台文档生命周期计数，无新增 API 请求、XHR 监听或数据上传。

早期单元测试发现控制布尔值与指纹负载同名、以及通用结构遍历可能触碰 assistant 标量字段；已分别修正为控制字段不出现在元数据事件、敏感/标量字段不下钻，并通过最终回归。真实用户反馈仅记录其安全计数（118 / 0 / 1 / 117）；没有真实 JSON 样本进入测试或 Git。

交付检查点 checkpoint-json-fingerprints-v0.1.3.2；ZIP 与提交字节核对后交付，保留旧版本与用户未跟踪解压目录。下一步由用户截取 other JSON structural fingerprints / historical candidate 区域。本轮不声称已找到原始发送时间或已确认 create_time 语义。

## v0.1.3.1 diagnostic — 2026-09-05

基线 d8b596c，保留所有旧检查点与用户既有未跟踪解压目录。依据用户第一次真实 PoC 的安全计数（canonical 2、metadata 0、匹配 0、接受 0、结构拒绝 1、超限 0）增加拒绝阶段诊断；没有读取真实响应或假设其具体失败阶段。用户确认按钮曾成功显示“已开始”，未修改控制链路。

最终全量自动测试 172 项全部通过，0 失败/跳过/取消，约 37.34 秒；33 个 JS/MJS 语法与 Python 语法通过；静态包审计 1648 项、30 个运行资源通过；git diff --check 通过。

新增 4 组单元/合成检查覆盖 RSC 不接受、不 clone，JSON/root/identity/mapping/user ID/create_time 各阶段原因，HTTP/origin/endpoint/clone 区分，有界已知路径探测、assistant/未知子树读取陷阱、安全白名单投影、A/B 分组隔离。既有真实 MV3 合成集成新增 RSC 发送拒绝检查，确认旧聊天加载摘要不被覆盖、接受的元数据不增加、四条虚构既有记录不变、诊断 UI 不泄漏。合成按钮启动回归通过；未声称已验证用户本轮真实响应格式。

与 d8b596c 逐字比较：adapter/response-parser.js 原 user()/parse() 函数完全不变；与 fd6d7ab 比较 canonical 适配器仅版本号变化。core/store.js、core/validation.js、core/dedupe.js、core/export.js、ui/archive.js 不变；后台受控按钮命令中继不变。权限仍仅 storage，未修改正式记录或时间线。

所有新增结构诊断只存内存，固定分类/布尔/有界计数，不保存完整 response、头值、页面字符串或异常原文。真实 A/B 阶段定位仍由用户在 Chrome 手工验证；发送结构拒绝不推断历史来源方案失败。

本地检查点 checkpoint-response-diagnostics-v0.1.3.1。ZIP 由提交内容打包并验证，不推送远端，不含测试、日志、Git、真实数据或用户解压目录。

## v0.1.3 response-time diagnostic PoC — 2026-09-05

从 4e025d8 恢复。此前 DOM-only 实现没有未提交修改；原未跟踪解压目录保持不动。v0.1.2 捕获检查点 fd6d7ab 保留。此次只有适配器版本变化，canonical 规则逐字不变；core/store.js、core/validation.js、core/dedupe.js、core/export.js、ui/archive.js 与 v0.1.2 无差异，未迁移或操作真实四条记录。

最终全量自动测试：168 项通过，0 失败/跳过/取消，约 37.25 秒。33 个 JS/MJS 文件语法检查通过，Python 脚本语法通过。静态包审计：1637 项检查、30 个运行资源，通过。git diff --check 通过；权限仍仅 storage，MAIN 例外仅限显式列出的本地解析器与观察脚本。

新增测试覆盖最小元数据投影、assistant 排除、Unix 秒类型/范围、精确 chat+ID 匹配、重复/冲突、容量、受控差值基线/历史 GET 排除、原 fetch 的 this/参数/Promise/Response/调用次数、请求体/请求头不可读、未知 schema、过期路由、有限完整 SSE、大小/并发限制、安全 UI/后台摘要、可选诊断异常不影响捕获。

真实加载 MV3 的临时无账号 Chrome 152.0.7977.82，所有网站请求由本地虚构 fixture 返回：验证 MAIN → ISOLATED → 内存后台 → UI 全链路；精确匹配四条虚构用户消息，四条既有虚构记录逐字段不变；新增虚构消息受控差值在 5 秒内；刷新清空映射、原记录无覆盖；暂停清空；扩展不新增网络请求；诊断页无读取档案状态权限，storage 中无 response 正文或 sourceSentAt。

首轮新增集成测试失败（原有回归通过），原因是 MAIN 观察器未取得共享解析模块。改为 MAIN 专属 adapter/response-parser.js 后，集成及最终全量测试通过。这一真实执行世界验证不能被纯 VM 单元测试替代。

没有使用用户 Chrome 配置、登录会话、真实响应、真实正文或真实记录。真实 ChatGPT 的 endpoint/schema、发送时间语义、覆盖率、差值、冲突与顺序仍待手工 A/B/C 验证。刷新销毁全部原始元数据，所以本版不自动证明逐 ID 跨刷新时间稳定；该验收项为 unknown，不能自动升为 high。详细边界见 README.md。

本阶段建立本地 checkpoint-response-time-v0.1.3；不推送远端。ZIP 仅含经审查的运行资源和说明，不含 tests、Git、日志、导出或用户既有解压目录。

# 检查结果

## v0.1.2 turn 调整诊断版：本次实际检查

执行日期：2026-09-05。从 `6770eee` / `checkpoint-diagnostics-v0.1.1` 继续，本次交付标记为 `checkpoint-diagnostics-v0.1.2`。用户解压的未跟踪 `outputs/Personal-AI-Input-Archive/` 保留，不作为本次源码修改、提交或打包输入。

| 检查 | 本次结果 |
| --- | --- |
| 完整自动测试 `node --test --test-reporter=tap tests/*.test.mjs` | **156 个测试节点通过，0 失败、0 跳过、0 取消**；统计包含父测试节点，约 36.6 秒。 |
| 无 wrapper 回归先失败后通过 | 修改适配器前，合法 role ID 的新测试在旧 turn 门槛返回 ADAPTER_MISMATCH，未能进入稳定窗口；修正后进入窗口、通过后只读取已确认正文叶子。 |
| 身份和范围 | 无任何 wrapper、非 article 包装、标记分离均可使用 role 自身合法 ID；无/非法 role ID 仍拒绝，不提升祖先/后代 ID；assistant 即使有 ID 也拒绝；main 外 role 不捕获。 |
| 保留的排除条件 | 无 wrapper 时仍排除 role 自身/祖先编辑态及 role 内可见四类编辑控件；旧 turn 内 role 之外编辑控件继续阻止捕获。未知、多重、嵌套、隐藏、不安全正文以及 busy、重复 ID、跨聊天旧身份均被拒绝。 |
| 正文读取约束 | 合成 DOM 将 body/main/user role/assistant/输入框整体读取设为抛错，合法消息仍只读已确认正文叶子。拒绝场景仍可在所有正文/标题/HTML 读取抛错时产生无正文诊断。 |
| 真实加载 MV3、仅使用合成页面 | 无 wrapper 消息实际持久保存；完成后续扫描、刷新及第二标签后相同 ID+内容保持一条且 UUID/哈希不变；相同文字不同来源 ID 保留两条。暂停清除结构诊断并保留记录。 |
| 结构诊断 | 无 wrapper 且 ID 合法时 turn=0、editor 可检查并通过、候选可继续产生；未知正文仍候选=0。UI 区分 turn 内/role 子树内/未确认范围；白名单及有界计数/20 行上限回归继续通过。 |
| 既有全部回归 | 同意、暂停、来源验证、不可变原文/版本、并发去重、写失败、墓碑、导出及档案交互一起通过。 |
| 语法 | 25 个 JS/MJS 文件及打包 Python 脚本通过语法检查。 |
| 静态包审计 | 22 个运行时资源、1,375 条规则检查通过；Manifest 与上一检查点比较仅版本字段改变。 |
| 范围比较 | USER/TURN/TEXT/EDITOR/UNSAFE 选择器常量、长度限制、稳定窗口未变；后台、调度、存储、去重、字段校验、诊断 schema/过滤代码与 `6770eee` 完全一致。 |

环境继续为 macOS、Node v24.19.0、Python 3.9.6、Chrome 152.0.7977.82、环境预装 Playwright。所有浏览器测试使用全新、未登录的临时配置，HTTP(S) 拦截后本地返回人工虚构 HTML，未读取用户日常 Chrome 配置、凭证、真实聊天或整页内容。

**关于 v0.1.1 的 editor=0：**结构探测确实执行了，但 `editorCheckAvailable` 取决于 turn，turn 不存在时未查询 turn 内编辑控件，`editorPassed` 又被 `Boolean(turn)` 强制为 false；随后候选循环在缺少 turn 处 continue。因此这不是 editor 本身真实失败的证据，也不能说所有后续诊断都完全没有执行。v0.1.2 在已确认 role 子树实际执行这项检查。

**真实用户环境尚待验证：**本次仅处理已确认的 turn 门槛。真实正文容器、页面编辑布局及实际捕获结果仍由用户手工验收；没有宣称 v0.1.2 在登录 ChatGPT 中已捕获成功。更新和数字反馈步骤见 README.md。

## v0.1.1 结构诊断版：本次恢复后的实际检查

执行日期：2026-09-05。本次从 `ddad81f` 及其未提交实现继续，保留原改动；本地交付检查点标记为 `checkpoint-diagnostics-v0.1.1`。恢复时的 4 个提交、文件缺失和工作区情况见 DECISIONS.md。

### 结果

| 检查 | 本次结果与证据范围 |
| --- | --- |
| 完整自动测试 `node --test --test-reporter=tap tests/*.test.mjs` | **134 个测试节点通过，0 失败、0 跳过、0 取消**；含父测试节点，约 36.6 秒。 |
| 诊断适配器合成 DOM | 区分 user role/可见性、article 与 turn 标记、ID 所在位置/格式、编辑状态、正文容器逐层过滤、重复/跨聊天身份。错误结构仍跳过；无身份替代或新选择器兜底。 |
| 隐私白名单与存储 | 共享 schema 在内容脚本、后台和 UI 过滤；拒绝字符串数值、移除额外字段、有界计数/20 行上限；旧记录不改原文；暂停/未同意清除结构；写失败保留先前数据并支持重试。 |
| 真实加载 MV3 的合成诊断链路 | 全新未登录 Chrome 中，以本地虚构 HTML 验证非 article turn、ID 移到祖先、多正文容器仍拒绝；已核对 chrome.storage.local 的实际持久字段、刷新后的档案精确数字、弹窗概览和暂停清除。 |
| 不读正文验证 | 在扩展的 ISOLATED 上下文把 textContent、innerText、HTML、title、输入值读取设为抛错，结构不匹配诊断仍能生成并显示；诊断与持久状态无虚构敏感哨兵字符串。此测试只使用虚构结构。 |
| 调度 | 结构变化不被重复错误码/节流掩盖；诊断发送失败下次重试；版本不一致使用独立固定码；混合正常/超长消息保存完成后仍显示超长跳过提示。 |
| 第一版回归 | 原有捕获门禁、来源验证、并发/重载去重、独立快照、原文不可变、回收站/墓碑、导出和档案交互测试一起通过。 |
| JS/MJS 语法 | 25 个运行时/测试/fixture 文件通过 `node --check`。 |
| 静态包审计 | `python3 scripts/check_package.py` 通过：22 个运行时资源，1,375 次规则判断。Manifest 仍只有 storage；站点范围、顶层/ISOLATED 和 CSP 不扩大。 |
| diff 检查 | `git diff --check` 通过。未 reset、checkout、restore 或删除既有未提交改动，无远端推送。 |

### 本次审查后补齐的工作

- 原有诊断代码及新增测试已在工作区，直接沿用，没有从头实现产品或盲改选择器。
- 补了一个先失败后通过的回归：同次扫描含正常与超长消息时，前置诊断进入节流缓存，正常保存将后台状态改为 CAPTURING，原来的末尾诊断被缓存跳过。仅在这种保存成功的路径清除诊断节流键、重新发送超长状态；结构规则不变。
- 增强真实 MV3 合成测试，核对实际持久数据及 UI 的完整字段，补充发送失败重试测试。
- 新增此前不存在的 DECISIONS.md；README.md 明确同目录更新、必须刷新 ChatGPT、反馈数字及计数含义；安装包包含这份决策记录。

### 环境与限制

- 本次环境：macOS，Node v24.19.0，Python 3.9.6，Chrome 152.0.7977.82，环境预装 Playwright；无需安装依赖或访问网络文档。
- 当前 shell 的 PATH 没有 node，检查使用环境提供的 Node 可执行文件。浏览器初次在默认系统沙盒中无法启动：该次纯 Node 部分 56 节点通过，20 个依赖浏览器启动的节点失败，不能算全套通过。随后经执行环境授权，在全新临时配置中完整运行得到上述 134/134 最终结果。
- 所有页面内容为人工虚构。测试拦截 HTTP(S)，对 ChatGPT 地址本地返回虚构 HTML，其余请求阻止；不使用登录态，不读取日常 Chrome 配置、真实聊天或凭证。
- **真实用户反馈仍为：扩展可加载、同意后已启用，但普通消息 0 条且 ADAPTER_MISMATCH。v0.1.1 未在用户登录后的真实 ChatGPT 页面验证，不能声称捕获已修复。** 下一步仅收集 README.md 所列安全结构数字。GPT/项目、复杂附件、长历史及真实配额性能等手工项仍未通过本次验证。
- 下方为 v0.1.0 的历史记录，保留其当时的结果与限制；其中旧版本号、ZIP 和数量不代表本次交付。

## v0.1.0 历史检查结果

执行日期：2026-09-05。代码检查点：`cb0bcec`（`checkpoint-v0.1`）。

## 已执行并通过

| 检查 | 结果与证据范围 |
| --- | --- |
| 全部自动测试 `node --test tests/*.test.mjs` | 59 个测试节点通过，0 失败、0 跳过、0 取消；最终合并运行约 37.7 秒。Node 统计包含父测试节点。 |
| 存储测试 | 8 通过：默认同意门禁、暂停/授权代次、并发与重启去重、同文多消息、原文/哈希不可变、独立版本、隐藏/回收站/墓碑、配额失败后重试、诊断字段白名单。 |
| 后台安全测试 | 11 通过：真实后台配合假 Chrome API，验证 TRUSTED_CONTEXTS 完成前不访问存储、隔离失败时关闭、来源白名单、内容脚本不能读档案或修改记录、当前聊天 URL/临时 URL 校验和 SPA 归属。 |
| 捕获调度测试 | 5 通过：同意/暂停/失败不读正文，状态检查与批次代次，501 条分为 200/200/101，路由变化停止后续批次，错误脱敏并保留存储失败原因。 |
| 导出单元测试 | 6 通过：JSON 字段/空白/CRLF、输入不被改变、原文与附属字段分离、任意反引号围栏、HTML 与元数据纯文本、空列表和顺序。 |
| 合成 DOM 浏览器测试 | 11 通过：已显示用户文字、AI/草稿排除、临时聊天、未知身份/容器/编辑/附件/隐藏状态、稳定窗口、SPA 旧节点隔离、同文不同 ID、超长文字、标题长度。 |
| 实际 MV3 集成测试 | 9 通过：在临时 Chrome 真正加载本扩展；默认关闭、同意后捕获、真实弹窗暂停/恢复、双标签/刷新去重、SPA 切换、新聊天形成正式 URL、Temporary Chat/首页跳过、内容脚本实际无法读 storage.local 或 GET_STATE。 |
| 实际档案页交互与下载 | 9 通过：实际勾选同意并点击启用、两聊天三条自然捕获、时间线/分组/四种关键词搜索、HTML 字样不执行、备注与整理版持久化且原文/哈希不变、未保存编辑确认、隐藏范围、回收站恢复/禁导出、永久删除确认及防复活、JSON/Markdown 实际下载内容。 |
| JavaScript 语法 | 18 个运行时/测试 JS 文件全部通过 `node --check`。 |
| 扩展包静态审计 | `python3 scripts/check_package.py` 通过；19 个运行时资源、1,259 次规则判断。核对 MV3、storage 单一 API 权限、chatgpt.com 顶层匹配、本地入口/图标/import、CSP，排查联网/键盘/凭证/剪贴板/文件读取/日志/动态 HTML 等禁用模式。静态规则不构成对所有可能行为的形式化证明。 |
| 视觉检查 | 用虚构档案生成并查看 1440 像素宽与 720 像素宽截图；修正阅读标题布局。无页面脚本错误，窄窗口无水平溢出（clientWidth 与 scrollWidth 均为 720）。预览只含虚构示例。 |

## 测试环境与真实性

- macOS；Node v24.19.0；Python 3.9.6；Chrome 152.0.7977.82；开发环境预装 Playwright。
- 全部浏览器检查都创建全新临时、未登录的配置；不读取日常 Chrome 配置，不使用用户 Cookie、账号或真实消息。
- ChatGPT URL 仅由浏览器测试拦截器在本地返回虚构 HTML；不连接 ChatGPT 服务器。扩展页面从本地包加载，其他 HTTP(S) 请求被拦截阻止。
- 集成测试真正加载了 MV3 包、真实扩展后台、内容脚本、弹窗和档案页，不只是模拟按钮。真实登录后 ChatGPT 的 DOM 则没有测试。
- 浏览器默认沙盒起初阻止了测试 Chrome 启动；经环境许可后使用同一临时配置测试通过。这是测试启动环境限制，不是已通过的真实网页测试。没有读取或迁移日常浏览器资料。
- 首轮实际集成发现 Chrome 在 SPA 后保留旧 `sender.url`。实测 `sender.tab.url` 提供当前路由，后台改为优先校验该字段，无新增权限；相关来源与切换回归已通过。
- 配额失败由内存存储替身模拟；尚未做真实 10 MB 档案性能压力测试。Chrome 114 是声明的最低版本，实际浏览器检查仅使用上述 Chrome 152。

## 尚未执行，不得视为通过

1. 用户登录后，当前真实 ChatGPT 页面中的选择器、Temporary Chat UI、发送、重渲染、切换、刷新及首次新聊天路由。
2. 实际 GPT/项目内对话、分支、长历史懒加载、页面改版、复杂附件/多语言/异常编辑状态。
3. 用户自己的 Chrome 在完全关闭重开后保留数据/暂停状态，真实离线使用，以及接近配额时的性能与提示。
4. 真实浏览器权限界面和扩展主动请求检查。静态审计与拦截测试已经通过，但不能代替用户环境观察。

请按 TEST_PLAN.md 的 16 组清单，用虚构文字手工验收。遇到异常先暂停；只反馈步骤编号、错误代码和版本，不发送私人正文、完整存储、含正文截图或 Chrome 配置。

## 安装包与回退

运行 `python3 scripts/package.py` 生成 outputs 中的 ZIP，仅包含允许列表内的扩展资源与公开说明；不含 tests、work、.git、浏览器配置、截图或任何用户导出数据。解压后选择含 manifest.json 的目录加载。

文档检查点 `25ee863` / `checkpoint-docs`；第一版代码检查点 `cb0bcec` / `checkpoint-v0.1`；交付报告和虚构预览另保存为 `checkpoint-delivery`。本地仓库无远端。回退源码不能恢复已永久删除的 Chrome 本地档案。


## M5 Foundation final acceptance

668/668 passed, 0 failed, 0 skipped (121 browser E2E). Source package 3747 checks / 92 resources; development privacy/permission/network audit passed. Final evidence and limitations: `outputs/v070-m5-acceptance.md`. No real Provider or daily deployment.
## v0.7.2b Original Organizer Rescue — 2026-09-08

### Cost-Safe Runner P0

- Production synthetic smoke and all Original automatic dispatch hooks were removed. The only DeepSeek dispatch is the explicit `UPDATE_ORIGINAL_LIBRARY_VIEW` action; each `userActionId` can cross `sent` at most once.
- A trusted request ledger, durable single-flight gate, worker-restart `outcome_unknown`, Stop/credential-clear abort, and atomic commit guard prevent implicit retry and late-worker commits. All-invalid output now fails without cursor movement; mixed valid/invalid output still commits valid items once.
- Final targeted gate: 48/48 passed, 0 failed, 0 skipped, including two isolated synthetic Chrome paths. It covers success, timeout, 400/401/429/500, network failure, malformed output, validation/commit failure, repeated action/render, Stop, credential clear, restart, explicit retry, cursor safety, and fetch counts. Static package audit passed 3999 guardrails across 96 runtime resources. No real DeepSeek request or private content was used.

Earlier `a5269f2` evidence below is retained for history; its production smoke behavior was removed by the Cost-Safe Runner above.

- DeepSeek runtime rescue fixed an unbounded response-body read after response headers arrived. The provider bounded fetch plus body consumption and Settings added an independent 30-second watchdog.
- Provider/credential/Original/privacy targeted regression: 38/38 passed. The then-current isolated smoke → batch path passed, as did the 200-headers/body-stall timeout. No private content or real credential was used.

- 17/17 focused DeepSeek/Simple Runner/synthetic full-chain tests passed.
- 130/130 directly affected Organizer, dual-view, Library, privacy and regression tests passed; package audit passed 3990 guardrails across 96 runtime resources.
- 1/1 isolated Chrome E2E passed with a synthetic DeepSeek HTTP response: one manual request processed three eligible Inputs, created two exact-deduplicated local-original Entries in one Topic, persisted three per-Input receipts plus one batch receipt, advanced 3/3, and survived an MV3 worker restart.
- No real credential, private Input, daily IndexedDB, or live DeepSeek request was used by automated acceptance.
