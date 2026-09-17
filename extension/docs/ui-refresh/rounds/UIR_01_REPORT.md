# UIR-01 Report — Global Shell、导航与 Archive 布局框架

日期：2026-09-15  
仓库：`haohongfei2001-png/paia`  
分支：`chrome-ui-refresh-v1`  
冻结 main 基线：`c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`  
本次首次固定文档入口 HEAD：`8ad51e741c243271e3d8d7773e995da593974d5f`  
最终认证运行代码 HEAD：`d2e6f92f1a73c7a092f2dd24429a098a312cf6ad`

## 结论

**UIR-01 COMPLETE。**

本轮仅实施已批准的 presentation / interaction shell：共享视觉 tokens、左栏/导航、已有 Universal Search launcher、活动主标题、Archive root 构图、Settings 标题去重与必要 popup 呈现。没有改变 Source / Working Input / Thought 所有权，没有新增 durable schema、权限、Provider 行为、trusted path、删除/tombstone、Backup/Context 业务语义，也没有合并 main 或部署。

执行过程中发现分支已存在未完成的 UIR-01 运行代码，因此按任务书先审查并续做，没有覆盖重来。`main` 在整个过程中始终保持冻结基线。

## 实际改动

- `ui/core-loop.css`：按 SPEC S3 落实 light/dark token、224/192/64 sidebar、32/24/16 workspace padding、1280px 工作区上限、页头/搜索/Archive 响应式构图；保留 640/680/720 阅读宽度和既有持久化 preference 枚举。
- `ui/core-loop.js`：修正实际 label owner，只更新 `.ux-nav-label` / `.ux-search-label`，不再用整按钮 `textContent` 擦掉 SVG/KBD；保留原主题、语言、字号、阅读宽度 owner。
- `ui/ux-r1-shell-coordinator.js`：安全内联 SVG；结构化 nav/search label；Search 主标题提升为场景 h1；移动现有 Archive 节点组成 main/assist 框架；只观察明确 Settings/Search surface 状态，移除全 Shell 持续 MutationObserver；`ui/ui-refresh.css` 只加载一次。
- `ui/ui-refresh.css`：隐藏 Settings 外层重复 breadcrumb/back；将两个既有 Revisit 可点击契约组合成单一“本机变化 / Local changes”视觉行。
- Revisit 兼容性：`#core-loop-return` 继续承担本机变化状态/进入 Revisit；`#revisit-open` 继续是直接打开 Revisit 的真实 44px action。两个旧 ID 都可见、可点击，没有改旧 controller 或历史认证测试。
- `ui/popup.css`：只统一必要颜色、focus、按钮与 spacing，不改 capture/pause 路径。
- `tests/uir-01-shell-chrome-e2e.test.mjs`：新增真实 Chrome 源码 + built release 覆盖，验证单 h1、三根导航、locale 后图标不丢、Search focus、同 URL、Archive 响应式、Revisit 双历史契约单视觉行、零隐式网络与截图矩阵。
- `scripts/test-groups.mjs`：将 UIR-01 browser test 注册到 current browser 分类；没有把失败测试移到历史组。

没有修改 `core/**`、`background/**`、`adapter/**`、`content/**`、`manifest.json`、schema/migration、Provider、authorization、Backup 格式、网站或 overnight 系统。

## 验证与修复链

早期实现已经能通过一次完整认证，但人工打开 1440 Archive 截图后发现 Revisit 重复呈现，因此没有直接标 COMPLETE。

1. 预最终截图：旧 `#revisit-open` 与新 `#core-loop-return` 同时显示“回来看看”。
2. #292：隐藏 `#revisit-open` 后，Round 4.8 current-release journey 因真实入口不可见而失败。
3. #295：保留 `#revisit-open` 但隐藏 `#core-loop-return` 后，Round 4.9 / 4.10 因 return-state 入口不可见而失败。
4. 最终方案：保留两个历史可点击契约，组合成一条视觉行；状态卡显示“本机变化”，直接入口以 icon 呈现。**没有修改旧认证测试。**
5. Final Certification **#298** 对最终运行代码 `d2e6f92f1a73c7a092f2dd24429a098a312cf6ad` 全绿。

## 最终测试 / release 结果

GitHub Actions：PAIA Certification **#298**，run `34934973743`，结论 **SUCCESS**。

- Current Browser Certification：**PASS**。
  - UX-R1→R6 + Round 4.8 / 4.9 / 4.10 真实 Chrome journeys：PASS。
  - complete current browser suite：PASS。
  - package / development guards：PASS。
- Full Suite Certification：**1089 / 1089 PASS**，fail 0，skipped 0。
  - unit：909 PASS。
  - browser E2E：33 PASS。
  - adapter contract：95 PASS。
  - privacy/security：52 PASS。
  - `uir-01-shell-chrome-e2e.test.mjs`：1 PASS。
- 4 个 unit shard：全部 PASS。
- Adapter and privacy contracts：PASS。
- Current release build and guards：PASS。
- macOS Secure Store Certification：PASS；该 job 自身明确区分 CI 与真实物理硬件。
- UIR-01 browser journey 中 DeepSeek/provider、extension external request、unexpected external request：均为 0。

Full-suite receipt artifact：`10383730806`。其中 `historicalBrowserFiles=76` 仍作为单独 pre-migration 证据；`realGolden=UNAVAILABLE`，本报告不把它冒充已完成的额外 golden 环境。

## Release smoke

最终 current-release artifact：`10383331831`。构建/guards PASS，并在隔离真实 Chrome 中加载 built release 重走 Archive Shell；专用 release 截图进入本轮 evidence。内部 diagnostics / 发布裁剪逻辑保持原 guard 约束，没有为了 UI 改版放宽 transform 或泄露内部工具。

## 视觉证据

持久化代表性证据位于 `extension/docs/ui-refresh/evidence/UIR-01/`，逐图检查见 `VISUAL_REVIEW.md`。

最终 Actions 证据：

- UIR/R1 visual artifact：`10383845841`。
- Settings/R6 evidence artifact：`10383571588`。
- Full-suite receipt：`10383730806`。
- Current release artifact：`10383331831`。

代表图覆盖：最终 built-release Archive 1440 light（同时满足 1440 light + release smoke 证据）、最终 Archive 1440 dark、1024 light、390 light，以及最终 Settings 1440 light。仓库内为从最终 PNG 原图生成的轻量 JPEG 证据副本；原始 PNG 保留在 Actions artifacts `10383845841` / `10383571588`。冻结 main 的真实 before 状态在本轮视觉检查中单独作为 before 参考，不混入 after 证据。同一 current browser suite 还生成 320、dark、200% 等原 R1 证据矩阵，本轮不重复全部入库。

人工逐图检查最终结论：单一活动主标题、主列表首屏可见、宽屏未被全页 680px 锁死、search launcher 自然、Revisit 无重复可见文案且两个历史入口仍可用、1024/390 无根级横向溢出、dark 无遗留亮白块、Settings 外层重复标题/返回已消除。没有发现需要再次修改 UIR-01 运行代码的问题。

## 验证限制

- 浏览器证据来自 GitHub Actions 的隔离 Linux/Xvfb + 真实 Google Chrome 与合成 profile，不是用户日常 macOS Chrome profile。
- macOS secure-store job 认证 CI 路径，不宣称进行了物理 Secure Enclave 生命周期验证。
- UIR-02 / UIR-03 / UIR-04 的页面内容尚未按各自任务书重构；本轮只保证共享 Shell 影响下的既有 journeys 未回归。
- 本轮没有部署、没有合并 `main`，也没有自动开始下一轮。

## 交接

UIR-02 是计划中的下一轮，但保持 **NOT_STARTED**，等待用户下一次明确执行指令。本次执行在 UIR-01 的代码、release、真实 Chrome、截图、视觉复查和证据/状态提交完成后停止。
