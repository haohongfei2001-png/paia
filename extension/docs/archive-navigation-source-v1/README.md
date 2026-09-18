# PAIA Archive Navigation & Source Structure v1

- **Package ID:** `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- **Round prefix:** `ANS-`（不得复用 UIS / UIR / UX-R 的旧队列编号）
- **Planning baseline:** `main@38804b99153074f54148f875e2e09c76568bc1cd`
- **Canonical branch:** `haohongfei2001-png/paia` 的远端 `main`
- **唯一队列与运行状态:** [STATUS.md](STATUS.md)
- **本次交付性质:** DESIGN / PLANNING；没有实施本包任何 runtime 变更。

## 1. 阅读顺序与效力

执行者先读 `extension/AGENTS.md`、`PRODUCT.md`、`ARCHITECTURE.md`、`ROADMAP.md`、`docs/ux/PAIA_DESIGN_CORE_v1.0.md`，再读本目录。
本包是产品所有者 2026-09-18 明确要求的独立开发包，不是已结束的 UI Simplification 的第五轮，也不恢复旧 worktree 队列。
设计核及未被本包明确改变的信任、身份、编辑、删除、授权约束保持最高效力。
本包仅在下表 R1–R9 的导航、显示、来源关系和连续浏览范围内替代旧 UX/UI spec 的对应界面描述；不得据此重设计思想库编辑绑定、AI 授权或产品品牌。

| 文档 | 内容与唯一职责 |
|---|---|
| [AUDIT.md](AUDIT.md) | 冻结起点、真实代码定位、浏览器检查、历史收据与当前 CI 的区别 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 数据契约、投影、状态、布局、迁移与存储裁决 |
| [SOURCE_CAPABILITIES.md](SOURCE_CAPABILITIES.md) | 来源能力证据门槛、ChatGPT adapter 边界、可靠/不可用的处理 |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | 九轮的文件、步骤、测试、非目标、验收与回退 |
| [VERIFICATION.md](VERIFICATION.md) | 行为矩阵、迁移、性能、无回归及认证证据格式 |
| [EXECUTION_PROTOCOL.md](EXECUTION_PROTOCOL.md) | 单轮执行、远端锁定/检查点、Git/worktree、恢复协议 |
| [STATUS.md](STATUS.md) | 唯一 mutable queue；文档中的轮次清单不是第二份运行状态 |
| [PUBLICATION.md](PUBLICATION.md) | 规划发布与远端回读收据，不承担队列调度 |

每轮均必须重新读远端 main 的上述文档。聊天记录、旧分支、未提交代码、截图或本地状态文件不能覆盖 canonical queue。

## 2. 产品目标

Archive 的核心链路是 **查看 → 定位 → 思考 → 编辑 → 复用**。舒适的连续文字界面服务这条链路，不把 PAIA 降格为长文章阅读器或单纯私人表达档案。
Thought Library 是跨 Window / Conversation 的组织增强层：围绕主题重新组织来源忠实的内容，同时保护人工改写与来源历史。
AI Context 是用户控制的复用与授权层；长期可以让主题、多主题及历史成为可读上下文，本包不新建远程 memory 服务，也不削弱已存在的材料复用。

视觉结构是 `PAIA 全局导航 | Archive Navigator | Reader / Workspace`；数据事实仍是现有 Source、Working Input、Thought、provenance、revision 与权限体系。
Project、来源顺序和 Window 的屏幕位置均不是新的 canonical 内容身份。

## 3. 本包正式需求与交付路径

| ID | 正式定义 | 交付轮次 / 核心验收 |
|---|---|---|
| R1 | 删除 Archive 首页重复 `#archive-select-materials`；Input Reader 不新增另一选择入口；Topic Reader 的 `#topic-material-select` 从常驻工具条迁入既有主题三点菜单，保留相同有限选择/确认流程。保留输入三点菜单、原生选段、材料盘内部“从档案/主题选择”、版本与 Context。 | ANS-01；V01/V06/V23 |
| R2 | Input Reader 一个按钮切换正序/倒序；初始缺省 asc，保留既有用户偏好和有效阅读锚点，使用现有 `inputReadingSort`；不改变 Window / Project 排列。 | ANS-01；V03/V22/V23 |
| R3 | 删除每条 Input 自动生成的 `.core-loop-reuse`“加入本次材料”，不是删除所有含“材料”的动作或域服务。该自动装饰器不得再次生成它。 | ANS-01；V05/V06 |
| R4 | 打开 Window 后仍可在左侧选择其他 Project / Window；同一导航投影在首页为主要浏览区，在 Reader 收敛为 Navigator；不复制两套正文/导航状态。覆盖桌面、窄桌面、移动抽屉及返回。 | ANS-04/05；V01/V02/V13/V23 |
| R5 | 思想库主题总览、其搜索/独立思想列表、每个 Topic 原话正文均连续滚动；取消“下一部分/下一页”和替换当前页的死角。主题总览和主题 Reader 仍是两个正常路由，不把全部主题正文强制串成一篇。按需加载/双向 windowing 是内部实现。 | ANS-07/08；V14/V23 |
| R6 | 来源 Project 身份、名称和 Conversation→Project 关系按可靠观察记录；Project 初次折叠；明确未归属和未知归属分开。Conversation / message 身份不含 Project；保留旧档案。 | ANS-02/03/04/05；V07–V09/V13/V21 |
| R7 | 可靠观察后的来源移动/改名只更新当前来源关系；来源删除只记录生命周期事实并保留档案。未加载、未观察、临时不可用不等于删除；远端 Project 删除不推导所有子 Conversation 均已删除。 | ANS-02/03/05；V08/V10–V12/V21 |
| R8 | 本包实现 provider-aware SourceOrderProvider、PAIA/来源顺序设置、能力/新鲜度判断、稳定跨来源组合和 fallback。可靠 provider 用来源顺序；未认证 provider 必须返回 unavailable，不造假。不能只留接口不接 UI。 | ANS-04/06；V15–V20 |
| R9 | Input 时间默认可见，字号小于正文、低噪声但可读；仅可靠 sourceSentAt 显示发送时间；未知明确标记，capturedAt 绝不冒充来源发送时间。 | ANS-01；V04/V22 |

R1 的精确范围来自当前源码而非旧截图：当前没有独立的 Input Reader 页头“选择材料”生产按钮；其菜单与选段功能不是待删除的重复 surface。
Topic Reader 的移入菜单是本包明确的低噪声裁决，不删除整主题材料能力，也不把 Input 的版本历史当成选择功能。

## 4. 明确默认值

| 状态 | 默认、持久化与隔离 |
|---|---|
| Input order | 新用户 asc；有效本篇锚点优先于全局旧偏好，用户本次显式点击优先于锚点；继续使用 `organizer-controls.inputReadingSort`，不新建第二份偏好 |
| Navigator mode | `paia`；新设备本地 `ans:ui:v1`，用户更改失败回滚；不覆盖 Input sort |
| Project 展开 | 首次折叠；已展开集合在当前标签保留；直接打开目标 Window 时仅展开其父 Project，不造成全部展开 |
| PAIA Window 排序 | 复用当前 `documents.libraryDisplay` 的最近可靠发送时间降序、稳定 ID tie-break；未知时间不补 capturedAt |
| PAIA Project 排序 | 当前名称 NFKC + lowercase 的代码点顺序，再稳定 Project key；重命名可改变位置，打开窗口身份不变 |
| 多来源顺序 | 实际存在的 ChatGPT、Claude 优先；其他 provider key 代码点升序；不存在的来源不显示空占位 |
| 来源顺序 | 每 provider / 每 scope 分别验证；24 小时 freshness 上限，provider 可更短；失效 scope 单独 fallback |
| 连续加载 | 每次至多 40 items / 256 KiB 正文响应，初始 40；离尾部 1 视口预取；空中间页可继续内部取游标，不暴露分页 |
| 编辑保护 | dirty、saving、composition、选区覆盖、对话框引用中的节点不得回收；保存失败不通过换 Window/滚动丢缓冲 |

## 5. 非目标

不实现新品牌、新全局首页/搜索层、新正文 truth store、新 capture provider、原生移动 App、联网同步、后台全账户抓取、新的 AI 模型调用或批量自动授权。
不修改 Source/message identity 算法，不把旧档案全部迁为 Project→Conversation→Message 树。
不因来源删除而调用 PAIA 的 purge / trash / remove；不改变 Thought→Input 默认不反写的现有认证语义。
不扩大 manifest 权限、读取凭据/草稿/assistant 正文，不从 ChatGPT DOM 偶然位置生成所谓来源顺序。
不重写 Archive Input 正文现有有界分段协议；本包“无分页”强制范围是 Thought Library，Input 排序控件不等于正文分段导航。
不删除、丢弃或合并已有旧 worktree。当前设计提交只新增本目录 Markdown。

## 6. 真实能力与完成定义

代码审计证明当前 ChatGPT adapter 没有已认证的 Project / source order / source deletion 契约。它不证明 ChatGPT 永远不能提供这些数据。
ANS-03 必须尝试验证合规可观察证据，并逐能力记录支持级别；不能用 synthetic fixture 冒充真实站点认证。
R6/R7 的数据模型、reconciler、导航及已确认状态的测试必须实现；真实 ChatGPT 正例须有可复核的 live contract 才能启用，缺少则保留 unknown / last-known 并写明降级。
R8 模块、设置、真实 UI 接线与可靠 synthetic provider 的完整测试仍必须全部完成；ChatGPT 返回 unavailable 是允许的能力结果，不是跳过本轮的理由。
最终报告必须分别说清“模块已实现”“真实 provider 已认证哪些能力”“哪些只能 fallback”，不得合成一句“全部来源同步完成”。

## 7. 开始下一轮

本包只有 `ANS-01` 在规划发布后 READY。新的用户 execution 消息必须指向本 Package ID 和 STATUS.md。
本次 planning 不领取 ANS-01，不修改 runtime，不自动进入开发。
