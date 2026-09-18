# PAIA Capture Foundation Hardening v1 — Certification

审计日期：2026-09-18。代码基线：远端 main `9d996b725150010e6c2b760b937b25790e852be5`。

本报告区分代码中可复现的缺陷、离线真实 Chrome 验证，以及尚无证据支持的生产判断。没有读取用户真实档案逐条归因，没有向用户真实 ChatGPT 对话发送、编辑或删除消息，也没有替换日常使用的扩展。

## ROOT CAUSE

“时间未知”不只有一个可能根因。下面是本轮通过代码追踪和回归用例确认的缺陷；不能据此断言某条用户实际记录必然由其中哪一项造成。

| 编号 | 已确认的问题 | 修复与证据 |
|---|---|---|
| R1 | 补全请求返回成功但尚无 source record 时，bridge 仍记为已确认，后续不再重试 | trusted writer 返回逐位置 `settled`；未落盘保留 pending，capture 提交后唤醒补全。新增旧版失败用例验证 |
| R2 | 发送响应中的已知 user 元数据没有独立进入正式 history 补全通道，且诊断生命周期可能影响读取 | 增加严格的 `parseEvent` 与独立、有界的增量 SSE/JSON 读取；不等流结束，不依赖诊断租约 |
| R3 | 以历史 `capturedAt` 和当前时间的较早值限制来源时间，错误的旧本机时钟可永久阻止后来证实的时间 | 使用当前验证时钟，保持历史 capturedAt 不变 |
| R4 | 已存毫秒 ISO 与原始亚毫秒数值直接比较，重复同一证据可被判为冲突 | 与现有 ISO 毫秒精度一致地比较，重复证据不再自相冲突 |
| R5 | 仅更新时间的 CAPTURE 没有发出 archive 变更通知；已打开的编辑阅读页也不重绘时间 | 通知覆盖 `timeChanged`；只更新时间标签和日期分组，不替换正文节点、未保存文字或选择区 |
| R6 | 整页稳定性签名会被邻近消息变化重置，稳定消息被其他活动拖住 | 改为逐条消息的 WeakMap 稳定状态，保留原有稳定等待和不可读边界 |
| R7 | 文本叶子只检查最近 user 祖先，异常嵌套的 assistant 文本可能继承外层 user 身份 | 检查最近任意 author-role 与内部嵌套角色；异常结构 fail closed |
| R8 | BFCache 返回、部分候选失配、跨分支共享 ID 与无界身份缓存缺少精确处理 | 恢复授权轮询；保留部分失败状态；新分支绑定要求当前聊天元数据；身份缓存到上限显式降级 |
| R9 | runtime 请求可无限等待，消息批次只有条数限制 | 35 秒请求期限和安全重试；同时按条数与序列化 UTF-8 字节限制批次 |

最初新增的六项基础回归在修改前均失败。之后又先复现了两项发送事件、七项适配器及两项调度器问题。阅读页不更新时间是在真实 Chrome 离线端到端测试中进一步发现并修复的。

必须保留的事实边界：没有可靠来源时间时，unknown 是正确结果，不是需要伪造一个日期才能通过的缺陷。

## OLD ARCHITECTURE

旧版并非单纯 DOM 抓取：它已经有 ChatGPT adapter、被动响应观察、时间候选/冲突账本、可信后台写入和 IndexedDB 唯一索引。问题主要发生在这些层之间的确认、生命周期、时间精度和界面更新，而不是完全没有底座。

## NEW ARCHITECTURE

1. `adapter/chatgpt-adapter.js` 判断普通聊天路由、明确 user 角色、消息 ID、非编辑/非忙碌状态及受支持文本叶子；每条消息稳定后才读正文。ID 缺失不使用文本或 DOM 序号冒充身份。
2. `content/capture.js` 在 consent/epoch/adapter 检查后，按最多 200 条及约 2 MiB 消息预算分批。35 秒期限释放挂起的等待；迟到的成功写入由持久去重规则保护，不把超时当成事务回滚证明。
3. `background/service-worker.js` 验证消息来自可信扩展页面或获准的 ChatGPT 顶层内容脚本，检查当前聊天与授权代次。旧聊天、旧授权或错误调用方不能写入。
4. `core/indexed-store.js` 在现有串行队列和 IndexedDB 事务内执行 source/snapshot 去重、原文落盘、时间合并与派生索引更新。成功提交后才形成可确认的 `settled` 结果。
5. MAIN-world observer 仅复制页面已经发起的获准响应；`history-contract.js` 投影明确的 user 身份和时间。ISOLATED-world bridge 用当前聊天、授权/session 和已经确认的 DOM source proof 对齐，不能靠响应正文创建来源记录。
6. 补全与首次抓取可先后到达。缺少来源记录的补全不再被误认为完成；重复观察可补全原记录，而不是另建一份来源。
7. 后台变更通知覆盖时间变化。阅读页只重绘时间元数据，不替换正在编辑的文本节点或重新排序当前阅读快照。

### 关键不变量

- 逻辑来源身份仍为 `(platform, conversation ID, source message ID)`，由现有 `identifySource` 生成持久 key。不存在以文本 hash 代替来源 ID 的新 fallback。
- 同一逻辑来源可以有多个不同正文的不可变快照；这沿用 PAIA 版本语义，不应把这些快照误称为重复来源。同文不同 ID 必须分开。
- 原文、首次 capturedAt、用户 Working Input 编辑、Thought、永久删除与 source tombstone 语义不被覆盖。
- 相同正文的重新观察使用既有唯一索引/内容快照去重。capture 和 enrichment 不越过 consent epoch 或恢复已永久删除的来源。
- 来源 ID 跨分支复用时，只有新 DOM 绑定且存在当前聊天的明确元数据才接受；仍属于旧聊天的同 ID 节点不会被重新贴标签。
- 当前页身份绑定最多 10,000 个；达到上限保留安全证据并报告 `ADAPTER_LIMIT`，不通过遗忘旧绑定换取继续猜测。

## TIMESTAMP SEMANTICS

`sourceSentAt` 是现有时间解析器接受的来源证据；`capturedAt` 是 PAIA 首次实际保存该来源快照的本机时间。UI 不把后者当发送时间。

来源可包括受支持的 DOM 时间属性、已加载历史响应的 user `create_time`、本轮新增的严格发送事件 user `create_time`，以及原有独立授权的官方导入时间。不同候选、冲突和 official_export 保护继续交给原有 resolver/ledger。

本轮修复保存精度与比较精度的一致性，没有宣称保留来源的亚毫秒精度。ISO 时间仍使用现有毫秒粒度。旧 capturedAt、用户原文与既有 ID 不因补全重写。

历史 unknown 只有重新获得可靠、可匹配的证据才会补全；已经被旧逻辑标为 blocked 的冲突账本不批量清空，因为旧数据不足以证明每个 blocked 都是误判。

## FAILURE MODES

本轮不承诺“以后不会坏”，尤其不把未知页面结构当成已验证结构。

| 外部条件或剩余边界 | 当前行为与限制 |
|---|---|
| 当前 ChatGPT 不提供可接受的 user 时间字段，或使用未知事件/状态格式 | 保留 unknown；不取 conversation 时间、当前时间或 capturedAt 冒充 |
| 消息从未进入受支持 DOM，或稳定确认前已经消失 | 无法保证补抓；本扩展不主动遍历全部账户历史或代用户滚动 |
| ChatGPT 的 optimistic sent UI 或发送失败 UI | 当前确认的是稳定的已发送消息展示及身份，不是独立的服务器提交回执；不能把 DOM 观察提升为服务器确认 |
| 页面改版使角色、ID 或文本叶子不再可靠 | 拒绝不可靠候选；已知消息外壳丢失角色或部分身份失败时显式降级。完全未知结构与真正空页并非总可区分 |
| metadata 在普通聊天身份/授权可用前已经流过 | 不回放早先未授权响应；后续重新观察或合法历史响应才可能补全 |
| 过长响应、过多证明或过多页面身份 | 到资源上限停止对应读取并显示 LIMIT/ADAPTER_LIMIT，不扩大读取范围或猜测 |
| 历史账本已 blocked，或不同证据冲突 | 继续保守处理；没有批量清除旧冲突、批量伪造时间的迁移 |
| 所有内容脚本都未运行、扩展被停用或整个存储不可用 | 最近诊断不是完整性证明；没有新增系统级进程守护或云端 watchdog |
| 页面本身被恶意脚本控制 | origin/session 与 canonical DOM 匹配不是加密来源证明；本轮不宣称可对抗整个来源页面失陷 |
| 富文本、多模态、非受支持叶子或来源提交原始格式不可见 | 保留受支持 DOM 叶子的原样文本；不声称已证明所有输入格式与网络请求字节完全一致 |

`create_time` 不是编辑发生时间；新快照的 capturedAt 也不是来源编辑时间。页面顺序和首次看到的顺序不被冒充为完整 conversation tree 的历史顺序。

## BOUNDED DIAGNOSTICS AND RESOURCE LIMITS

本地 health 只保存固定枚举、计数和诊断时间；不复制消息正文、URL、来源 ID、文件名或凭据。新增字段是有界的最近状态，不是无限增长的日志。数值计数上限为 1,000,000。

正式发送事件读取：单个并发副本、2 MiB、15 秒、最多 2,000 个数据事件。历史路径副本上限 2 MiB/5 秒；其他原有受限结构读取为 512 KiB/5 秒。超限不会取消页面自己的响应读取。

元数据/proof 容量沿用 2,000；页面来源身份绑定上限为 10,000。每条用户文本仍遵守既有 200,000 字符限制。抓取批次同时限制 200 条及 2 MiB 总预算，并为 envelope 留出空间。

这些是实现预算，不是浏览器调度时间承诺。新增字节预算测试证明预算被执行，不意味着已实测旧版触发了 Chrome 的硬传输上限。

诊断分别显示响应证据状态、可用/缺失/拒绝时间、未确认来源，以及实际存储最近一批的新增、去重、忽略和未落盘情况。候选时间可用不等于已经保存，最近一批成功也不等于全部聊天完整。

## TEST MATRIX

这里的 PASS 表示所注明环境和断言通过，不把合成场景升级为当前真实站点的结论。

| 场景 | 结果 | 证据级别 |
|---|---|---|
| 单条新输入、多条输入、同文不同 ID | PASS | adapter/store 回归；源码版与发布包 Chrome 隔离场景 |
| assistant、草稿、编辑框、不安全叶子排除 | PASS | 带禁止读取 getter 的 adapter/contract 回归；Chrome 合成哨兵 |
| 嵌套 assistant 借外层 user 角色 | PASS | 旧版先失败；修复后禁止读取 getter 未被触发 |
| observer 重复、DOM remount、刷新、重复打开 | PASS | Chrome 重复扫描/重载后的来源数和快照数断言 |
| SPA A → B → A | PASS | Chrome 场景中来源身份、归属和去重断言 |
| 分支复用相同 message ID | PASS | 合成 adapter：要求当前聊天明确元数据与新 DOM 绑定，旧节点拒绝重新归属 |
| 编辑来源消息 | PASS | Chrome 新建一个正文快照，逻辑 source 数不增加，旧原文保留 |
| metadata 先到、正文先到、补全请求早于落盘 | PASS | bridge/store 定向回归；未落盘请求不能进入已确认集合 |
| 已确认节点离开虚拟化 DOM 后时间才到 | PASS | Chrome 先移除节点再响应，原记录仍可补全 |
| 来源时间存在、缺失、无效、未来、冲突 | PASS | history/resolver/store 回归；unknown 和冲突不被当前时间覆盖 |
| 亚毫秒同一证据重复、旧本机时钟错误 | PASS | 两项旧版失败的时间回归 |
| SSE 未结束即收到用户时间、诊断租约变化 | PASS | 增量流与正式通道独立性回归；Chrome 合成发送响应 |
| 多行、中文、emoji、组合 Unicode、Markdown/code、首尾空白 | PASS | Chrome 与 adapter 保留已确认文本叶子的字符串；不代表所有真实富文本格式 |
| 超长输入、批次条数/字节预算、身份缓存上限 | PASS | adapter/scheduler 的拒绝与预算回归，不裁剪原文后冒充完整保存 |
| 请求悬挂/超时后重试 | PASS | 调度器回归，等待被释放，重试仍经来源去重 |
| BFCache 对应 pagehide/pageshow | PASS / LIMITED | bridge 事件级回归；未在当前真实 ChatGPT 复现完整 BFCache 路径 |
| service worker 停止并以新 heap 唤醒 | PASS | Chrome 实际 worker 生命周期测试 |
| 浏览器退出后同扩展路径/同隔离 profile 重启 | PASS | 源码与发布包都保持扩展 ID、数据和重复扫描安全 |
| 日常 profile 中直接 runtime.reload / 用户实际升级 | NOT VERIFIED | CDP 临时扩展的直接重载探针受 ERR_BLOCKED_BY_CLIENT 限制；未改用户日常安装 |
| 时间补全后打开中的 Reader 更新 | PASS | Chrome 源码与发布包；独立测试保留未保存文字、节点、选择位置和页内顺序 |
| 故意丢失角色、部分身份异常、diagnostic 注入敏感值 | PASS | 明确 ADAPTER_MISMATCH；固定枚举与计数白名单拒绝额外内容 |
| 当前登录 ChatGPT 的新发送、真实响应格式与真实历史数据回填 | NOT VERIFIED | 可用调试上下文无 ChatGPT 目标；当前活动页不在范围内，未转向读取其他页面 |
| 从未渲染的全部历史、完整 conversation tree、所有未来改版 | NOT VERIFIED | 不属于现有被动 DOM 契约可以证明的完整性 |

## DATA MIGRATION

本轮没有提升 IndexedDB 或存档 schema 版本，没有执行破坏性迁移，也没有读取或改写用户日常安装中的真实 archive。新增诊断是可选字段，旧记录无需为了兼容新版本而重写。

现有 `ArchiveRepository.initialize()` 的迁移过程已经审计：旧状态先经过原 loader 规范化，保存摘要校验的备份，分批复制后比较完整状态，再验证恢复路径，最后切换本地数据库标记。失败路径不能把未验证的复制结果标为 active。本轮保留该机制，并运行相关存储/导入/升级回归。

可以补全历史时间的前提仍是重新获得明确来源证据并匹配原 source；这不是把旧 unknown 全部填入一个新日期的迁移。永久删除记录不会因为补全重建，Working Input 编辑也不被抓取原文覆盖。旧 blocked 冲突需要独立可靠证据，未进行无条件修复。

本轮没有改变扩展 ID、manifest 权限、日常安装路径或日常配置。源码目录和独立发布包均在专用离线 Chrome profile 验证，重启后保持数据库和去重状态；这不能替代用户真实数据的备份/升级验证。

## FILES CHANGED

| 路径 | 修改目的 |
|---|---|
| `adapter/chatgpt-adapter.js` | 角色/叶子归属、逐条稳定性、部分降级、分支绑定与有界身份缓存 |
| `adapter/history-contract.js` | 正式已发送 user 元数据的严格事件契约 |
| `content/response-observer.js` | 独立增量读取、受限副本和固定健康状态 |
| `content/response-bridge.js` | 持久确认、重试、生命周期、请求期限和候选健康计数 |
| `content/capture.js` | 抓取完成通知补全器、字节分批、请求期限、页面生命周期和警告保留 |
| `core/indexed-store.js` | 事务确认回执、timeChanged 与存储侧诊断计数 |
| `core/record-time.js` | 来源时间校验时钟与存储精度一致性 |
| `background/service-worker.js` | 时间独立变更通知及诊断投影接入，权限规则保持 |
| `core/constants.js`, `core/diagnostics-schema.js`, `core/diagnostics.js` | 固定降级原因与受限诊断 schema |
| `ui/capture-time-view.js`, `ui/archive.js` | 原位刷新时间元数据，不重建用户编辑的正文 |
| `ui/common.js`, `ui/archive.html`, `ui/popup.html`, `ui/popup.js` | 现有诊断入口中的小型本地健康摘要 |
| `tests/capture-foundation*.test.mjs` 及相关 adapter/bridge/observer/capture/security 测试 | 可复现的失败用例与源码/发布包离线真实 Chrome 回归 |
| `tests/harness/fake-chatgpt.mjs` | 可选的专用临时 profile，使浏览器退出重启后的持久化可验证；默认行为不变 |
| `tests/frozen-capture.test.mjs`, `scripts/test-groups.mjs` | 显式授权的精确新冻结值及当前回归分组，不删除既有冻结保护 |
| `ARCHITECTURE.md`, `PRIVACY.md` | 对齐本轮已实现的捕获边界、诊断隐私与认证限制 |
| `docs/capture-foundation/` | 审计结论、验证收据和未通过/未验证项目 |

## TEST RESULTS — FULL RUN AND FOLLOW-UP

完整执行 `PAIA_HEADLESS=1 npm test` 得到 **1129 项：1119 PASS、10 FAIL、0 SKIP**，退出码 1。不能把这个结果称为全量通过。运行后仅加强/修正了两个测试文件的计时器与重启断言；运行时代码未因此改变，后续独立复跑另记，不改写这次失败收据。

全量失败项目如下：

| 项目 | 当次失败 | 后续判断原则 |
|---|---|---|
| `history-performance-v090` 一万条历史导入 | 180 秒门槛超时 | 修改前 unit 基线已经失败；独立重复仍失败，门槛未调宽 |
| `original-trace-rescue-v072b` 固定期限阶段 | 期望 body_reading，实际停在 headers_received | 未改该模块，单独复跑 7 项全通过；保留全量失败，不据一次复跑宣称永不波动 |
| `source-time` fingerprint 租约撤销 | 原 fake timer 将请求 watchdog 当成下一次 poll | 测试改为真正取消计时器并按延时选择 poll，额外断言已结算请求 watchdog 已取消；原身份隔离断言保留，15 项全通过 |
| `uir-03-ai-presentation`、`uir-03-preview-mask` | 并发构建共享输出目录时 guardrail/文件路径失败 | 以仓库规定的串行 `test:ui-refresh` 独立复跑，最终结果另列；本轮 capture 发布包测试始终使用独立输出目录 |
| `ux-r2`、`ux-r3`、`ux-r4` F-LARGE | 各自十万条 fixture 的 300 秒门槛超时 | 保留为未闭环的大规模回归失败，不仅凭“应该是机器慢”予以豁免 |
| `ux-r5-ai-organize` 键盘焦点 | 焦点 ID 断言不符 | 使用执行基线的独立 worktree 复核，不改 Thought UX 来迎合捕获任务 |
| `ux-r5-certification` | 导航按钮不可见，click 超时 | 使用执行基线的独立 worktree 复核，不删除原断言 |

修改前基线 `PAIA_HEADLESS=1 npm run test:unit` 为 **913 项：912 PASS、1 FAIL**。唯一失败是一万条历史导入性能门槛。之后独立运行该一万条用例仍在 180 秒超时；底层合成 fake-indexeddb 工作继续结束，测得提交约 384.8 秒。这不是当前真实用户档案的性能测量。

修正计时器测试后，`node --test tests/source-time.test.mjs tests/original-trace-rescue-v072b.test.mjs` 为 **22 PASS、0 FAIL、0 SKIP**。没有放宽生产校验、超时门槛或身份隔离断言。

`npm run check` 实际通过 **8570 项静态 package guardrails / 198 个 runtime resources**；`node scripts/check_development.mjs` 返回 `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。静态检查不替代真实站点验证。

### 独立复跑结果

最终 capture 相关回归组合执行了 **262 项，262 PASS、0 FAIL、0 SKIP**。覆盖 adapter、桥接、后台权限、调度器、诊断、历史时间契约、时间合并、迁移、导入升级与冻结保护。完整命令见同目录 `VERIFICATION_RECEIPT.json`。

`PAIA_HEADLESS=1 npm run test:ui-refresh` 串行运行仓库规定的 10 个当前 UIR 浏览器文件，结果 **10 PASS、0 FAIL、0 SKIP**。其中包含全量并发时失败的两个发布包构建场景；没有删除那些测试或修改其断言。

两项 UX-R5 失败也在独立的、未修改运行时代码的执行基线 `9d996b725150010e6c2b760b937b25790e852be5` 上重新失败，分别是焦点 ID 和不可见导航按钮。这证明它们在本轮修改前已经存在，不把它们转记成通过，也没有越界修改 Thought UX。

`npm run build:release` 成功生成 215 文件的当前发布包，版本仍为 0.12.0；发布包静态检查为 **8135 项 / 191 个 runtime resources**，`RELEASE_PRODUCT_GUARD_PASS`。发布包成功构建不等于总体上线认证通过。

## MANUAL VERIFICATION / ACTUAL SITE LIMIT

当前实际站点证据没有取得：可用调试上下文中没有 ChatGPT 页面；普通 Chrome 的活动页不在范围内；随后仅筛选 ChatGPT 域名的只读标签检查也未找到匹配标签。没有切换用户页面、请求聊天 API、读取其他页面正文或修改真实对话。

因此仍需在可以获得明确授权的真实 ChatGPT 页面环境中确认其当前 DOM/响应契约，以及真实来源时间的端到端匹配。验证应先使用已有消息和只读元数据；新消息路径可以随用户正常发送观察，或使用明确隔离的测试账号/对话。不应为了补齐报告而擅自在用户真实对话发送测试文字。

日常扩展更新及用户真实 archive 的升级结果没有自动执行；同路径的专用合成 profile 重启已经验证，但不能冒充真实用户数据库验证。直接 `chrome.runtime.reload()` 在 CDP 临时扩展环境的探针受到 `ERR_BLOCKED_BY_CLIENT` 限制，因此只认证实际成功的浏览器退出/重启路径，不认证普通 profile 的直接自重载。

以上是真正缺少环境证据的项目。自动化能够完成的检查已经以测试或明确失败结果记录，不把全量性能/旧 UI 测试修复转嫁为用户手工点击。

### 最终浏览器复跑与门禁

加强重启前后的网络审计和完整 source record 等值断言后，最终 `tests/capture-foundation-chrome-e2e.test.mjs` 复跑为 **3 PASS、0 FAIL、0 SKIP**：源码扩展、实际输出的发布包，以及未保存正文/选择区保护。两个完整旅程在浏览器重启前后都验证没有外部请求、扩展网络请求、provider 调用或页面异常。

现有 `node scripts/compatibility-gate.mjs` 仍返回 **`AUTOMATIC_VALIDATION_REQUIRED`，退出码 1**。本轮没有伪造 fullSuite/auditPassed 标志，没有放行这个门禁，也没有自动部署到日常 Chrome。

## FINAL CERTIFICATION

| Acceptance gate | 判断 |
|---|---|
| A — Architecture | PASS：明确 adapter、授权、事务落盘、确认回执、补全与界面投影边界 |
| B — Timestamp | PARTIAL：已复现并修复代码中的多层时间缺陷；未读取用户实际受影响记录，未确认当前真实站点提供哪些时间字段 |
| C — All automated tests | FAIL：全量 1129 项中有 10 项失败；后续回归与基线对照已列明，但不能重写原结果为全绿 |
| D — Duplicate safety | PASS：来源/快照模型、重扫/刷新/remount/A-B-A/worker 与浏览器重启的所列场景 |
| E — Same-text safety | PASS：同文不同来源 ID 分开保存；编辑快照与逻辑来源区分 |
| F — Migration | PASS / LIMITED：既有迁移和字段等值回归通过，无 schema 变更；日常真实数据库没有被迁移或验证 |
| G — Browser verification | PARTIAL：源码与发布包在真实 Chrome 的离线隔离场景通过；当前登录 ChatGPT 与日常直接自重载 NOT VERIFIED |
| H — Failure visibility | PASS / LIMITED：故意角色失效、未落盘补全、证据不可用、限额等产生有界诊断；不宣称完整性监控或所有脚本停摆时的独立报警 |

| 底座性质 | 结论 |
|---|---|
| current ChatGPT capture correctness | 已验证实现契约和合成浏览器路径；当前真实 ChatGPT NOT VERIFIED |
| timestamp correctness | 所列来源校验、未知、冲突、时钟与精度回归通过；不批量制造历史时间 |
| duplicate resistance | 所列持久身份与重复操作场景通过，不把文本一致当成同一来源 |
| navigation/reload robustness | 页面/SPA/worker/完整浏览器重启通过；完整真实 BFCache 与日常自重载边界保留 |
| migration safety | 回归通过、无破坏性迁移；不能替代真实用户数据升级证据 |
| diagnostics coverage | 已确认的主要失效可见；最近一批状态不是逐会话历史或完整性证明 |
| regression-test strength | 262 项相关回归及源码/发布包 Chrome 验证成立；整体测试门禁仍未闭环 |

**最终状态：加固代码已实现并完成上述审计与验证，但本轮不签发“生产可靠 / 整体终审通过”的认证。`acceptanceComplete=false`、`productionCertified=false`。**
