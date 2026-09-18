# 起点审计与依据

## 1. 固定基线与来源

- 仓库：`haohongfei2001-png/paia`。
- 起点远端 main：`38804b99153074f54148f875e2e09c76568bc1cd`。
- commit subject：`Recover certified Thought reader preemption`；父提交 `d063707293d887352905143dc1af58c1cbb5e606`。
- 读取方式：GitHub API branch/file/run 回读 + 从 main 新建的独立浅克隆；没有把旧 worktree 当成产品事实源。
- 设计克隆：`/tmp/paia-ans-design-EMMMG9`，与旧 linked worktree 的 Git 目录独立。
- 下述定位均相对于 `extension/`；行号固定于上述 SHA，后续以函数/选择器和实际代码复核，不依赖行号恒定。

已读 `AGENTS.md`、`PRODUCT.md`、`ARCHITECTURE.md`、`ROADMAP.md`、设计核全文、UX/UI 开发规范中全局语义/状态/Archive/Reader/Thought/响应式/迁移/认证章节、UI Simplification README/STATUS、Capture Foundation README/CERTIFICATION/VERIFICATION_RECEIPT；并审查下表实现及相关真实浏览器 harness/测试。

## 2. 当前真实实现与计划影响

| 范围 | 起点位置/事实 | 本包处理 |
|---|---|---|
| Archive 重复入口 | `ui/archive.js:49` 创建 `#archive-select-materials`；`ui/ux-r1-shell-coordinator.js:62–76` 把它移入首页主区 | 删除生产者及重排引用，不仅 CSS 隐藏 |
| 每条材料按钮 | `ui/core-loop.js` 的 `decorateReader()` / `.core-loop-reuse` 自动给 Input 加“加入本次材料” | 移除生成逻辑；保留 contextual selection、Input menu 与 tray |
| Reader 复用 | `ui/archive.js` 的 `addInputMaterial`、selection toolbar、`showMenu` | 按原 ID/revision/span 和 flush 保留；“版本历史”不是选择材料的替代实现 |
| Topic 材料按钮 | `ui/thoughts-base.js:181,286` 的 `#topic-material-select` 和 `selectTopicMaterials()` | 常驻 surface 迁主题既有三点菜单；保留 200 项保护/确认及 AI field refs |
| Input order | `ui/archive.html` 的 `#input-time-order` 两按钮；`ui/archive.js:194` 写 `inputReadingSort`；`core/archive-query.js:36–43` 读同值 | 单 toggle，不混入 Navigator ordering，不重写内容排序 truth |
| 时间 | `ui/archive.js` 创建时间；`ui/reader.css` 桌面 `.block-time` opacity 0，hover/focus 1，mobile 1；`ui/capture-time-view.js` 原位补时 | 默认可见，同时保留原位补全/锚点；unknown 不补假发送时间 |
| 打开 Window | `ui/archive.js` 的 `showCollection` / `refresh` 在打开 doc 时隐藏 collection；仅当前 `state.documents` 页可用 | 不能直接复制 current page 为 Navigator；需独立有界查询与完整覆盖状态 |
| 导航和编辑 | `ui/reader-navigation.js` 唯一 same-URL history；`archive.js leave/navigate/latestRefresh`；`reader-experience.js` window scroll/anchors | 原 coordinator 接入；禁止第二套路由；导航前 flush/CAS/IME 不回归 |
| Thought 根页 | `thoughts-base.js:60,127–130,179–180` nextCursor 替换当前 page；`core/library-documents-store.js:68–80` stable 模式全读 topics 后排序分页 | UI 累积/windowing + 有界可重建索引，而不是隐藏按钮后无法访问后半内容 |
| Topic Reader | `thoughts-base.js:196–246` page/replace/resetScroll；`core/organizer/topic-reading.js` 是实际 sort 读取路径 | 双向连续窗口，保留 entry/section 结构、人工绑定及已修复 preemption |
| Topic 数据成本 | `topic-reading.js:12–30` 每页重扫 sections/placements、读 entry/时间并构建 descriptors/viewRevision | 新增 body-free 可重建读投影，逐批 build/invalidate；不是单纯让 UI 多调用旧全扫描 |
| Topic 时间 | 上述代码排序元数据含 `effectiveTime/timeBasis` 的 source/capture/created 分别标记 | 本包不把排序 fallback 展示成 sourceSentAt；保护现有来源时间显示语义，不顺手重定义历史 |
| Conversation 身份 | `core/indexed-store.js defaultBlock()` 以 `documents.byChat/chatOf` 复用 doc；`core/library.js:14–18` platform + conversationId；`core/dedupe.js:7–15` message sourceKey 与内容版本分开 | 新关系 key 指向既有 identity，不迁移/重算旧 ID 或 sourceKey |
| 可变投影 | `core/workspace.js` / `indexed-store.refreshDoc()` 会重建 conversations/doc 显示字段 | 新关系不能仅塞进易被覆盖的 UI snapshot；使用受验证的既有 meta 空间 |
| 来源删除歧义 | `archive.js` 现有 source-detached“来源已删除”描述 PAIA purge 后的 detached work | 不拿它判断外部平台删除；新 UI 标明“外部来源已删除”，历史详情说明外部与 PAIA 删除区别 |
| Capture Foundation | `adapter/history-contract.js` 只输出 user IDs/create/update；response observer/bridge 与 trusted worker 校验 chat/epoch/session/DOM proof | 复用边界，新增单独 structure 投影；不向旧严格 time DTO 偷塞字段 |
| 路由 | `adapter/chatgpt-adapter.js:77–79` 已支持可选 `/g/.../c/...` 并保留相同 chat ID | `/g/...` 本身没有类型证明，不能直接拿来当 Project ID；移动不应改 chat identity |
| Source ordering | adapter/content 未提供已认证 Project/window rank、scope completeness 或删除事实 | 初始 capability unknown/unavailable；正例须经 SOURCE_CAPABILITIES gate |
| Settings | `ui/core-loop.js` 已有六组设置；`core/workspace.js` 白名单校验既有 preferences | 新增一个阅读与外观组里的简洁排列选择，独立 local meta，不生造高级面板 |
| Backup | `core/backup-format.js` explicit whitelist，`backup-service.js` 原子空库 restore、generation guard、权限安全重置 | 新 durable source metadata 同轮加入严格验证/导出/恢复；位置/排序快照不入 backup |
| 多来源边界 | import 文档有 Claude profile，但当前 Backup sources validator 仍要求 chatgpt；不是所有 provider 均 production-verified | 不交付 Claude capture；ANS-02 必须最小补齐已有合法 import provider 的 Backup 验证，确保其档案及新增 metadata 可往返；仍不称真实 Claude export 已认证 |
| CI 分类 | `scripts/test-groups.mjs` 只自动识别 UX/ UIR / UIS 和显式集合；未知 `*-chrome-e2e` 会进 historical group | ANS-01 必须加 ANS 当前浏览器分类和 guard；后续测试须实际运行在 current_browser |

## 3. 真实 Chrome 中的只读界面审计

2026-09-18，在上述 clone 上使用已有 `tests/harness/fake-chatgpt.mjs` 启动隔离、headless Chrome 扩展。
只在临时 profile 中同意收录、装载一个 3 条 Input 的合成 conversation，未读取用户 Chrome profile、凭据或真实聊天；没有修改任何 tracked runtime/test 文件。
临时审计脚本位于 `/tmp/paia-ans-current-ui-audit.mjs`，不是新产品实现或正式测试认证。

| 观测 | 结果 |
|---|---|
| 1440×900 Archive root 重复选择按钮可见 | true |
| Input 时间顺序按钮数 | 2 |
| 三条 Input 的 `.core-loop-reuse` 数 | 3 |
| 打开 Window 后 Archive collection 仍可见 | false |
| 三条 Input 桌面 time hidden attribute | false / false / false |
| 三条 Input 桌面 computed opacity，无 hover | 0 / 0 / 0 |
| 390×844 首条 Input 时间 computed opacity | 1 |
| 扩展主动网络 / 外部请求 | 0 / 0 |
| page errors | 空数组 |

查看了 home / desktop Reader / mobile Reader 截图；当前日期标题可见不等于每条 Input 时分可见。
截图与 JSON 仅为临时本机审计输出，不作为 future acceptance PASS、不上传私人数据，也不在 planning diff 添加二进制文件。
此检查没有认证真实 ChatGPT 的 Project、顺序或删除数据；未来实站能力必须另列证据。

## 4. 已完成包与历史收据的时间关系

UI Simplification canonical status：UIS-01～UIS-04 已 COMPLETE，不存在要在本 execution 接着执行的 UIS-05。
Capture Foundation 的历史 `VERIFICATION_RECEIPT.json` 明确保留当时 full suite 1129 项中 1119 pass / 10 fail、acceptanceComplete=false / productionCertified=false 的记录；不能改写过去收据来声称当时已通过。
本次另从 GitHub API 核实当前基线的 **PAIA Certification #357，run 35322458613，attempt 3，head 38804b9…，completed / success**。
这两者并不矛盾：后续 main 修复通过 CI，不意味着历史 receipt 自动变成 PASS，也不等于真实 ChatGPT Project adapter 已被认证。
发布本包时仅记录规划与文档校验；不会把基线 CI 或本轮合成界面观测冒充尚未实现的新功能测试结果。

## 5. Documentation alignment 与风险处置

ANS-09 对旧 UI-03/04/05/09/10、Reader 时间披露、Reader materials surface、Thought 分页、来源结构与设置描述做定点对齐；保留历史包 receipt 的真实性。
当前已认证 Thought 原话/AI per-topic、版本、人工编辑隔离及晚到请求防抢占继续作为回归基线；不采纳旧聊天中的相反绑定建议。
来源 provider 可用性属于可验证的技术能力门槛，依照降级设计处理；目前没有需要产品所有者另作范围裁决才能发布本计划的 blocker。
任何 future 实现发现必须扩大权限/抓取范围、重写 identity、放宽 purge 或丢数据才能工作，均必须 BLOCKED，而不能私自以“完成需求”为由突破边界。
