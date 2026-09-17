# UIR-04 Execution 04 — Popup / 本机工具 + cross-page final consistency

Date: 2026-09-17

## Scope

本 checkpoint 只处理 UIR-04 Execution 04：Popup、本机工具 / Passport surface，以及 Context / Settings / Data & devices 已完成页面的跨页最终一致性检查。不重新设计 Context、Backup / restore、Grant、capture、删除、恢复、AI 算法或数据 owner；不进入 UIR-05。

## Recovery audit

- 远端 `chrome-ui-refresh-v1` 真实起点：`7dcfd0cb9ba734626dcba6778c0b2bd012d5459a`（Execution 03 docs closure 后 encoding repair）。
- PR #31 在开发阶段保持 open + Draft + unmerged；round-final certification 时临时 Ready，成功后已恢复 Draft。
- 旧 `paia-ui-refresh-v1` 本机 worktree 含 Execution 01 的历史未提交现场，未 reset、未覆盖；Execution 04 从远端 HEAD 新建独立干净 worktree 开始。
- Execution 03 runtime/test HEAD `8dc2ea69628e77ae6f993e2cfd5167f8c5bbc844` 和 fast gate SUCCESS 作为已闭环前置，不重做其产品工作。

## Presentation changes reviewed

- Popup 保留唯一 `#open-archive`、`#toggle-capture` 与 `#popup-internal-tools` owner；暂停 / 恢复仍走原 `SET_ENABLED` handler，未复制动作或改变捕获语义。
- Popup 读取现有 UX appearance preference，仅把 UIR-01 shell 的 light / dark token 投影到低频 surface；不增加网络或新设置。
- 本机工具继续使用现有 Product Signals、Passport Grant、Context Package owner；新增清晰的“回到 PAIA”返回入口，不改变 Grant 创建 / 撤销 / 审计 / share 行为。
- 本机工具 light / dark、focus、surface、danger、窄屏重排统一到主应用 token；390px 保持单列、无根级横向溢出。
- built current release 继续按既有 transform 移除 `#popup-internal-tools`；此次修改未放宽 diagnostics / `filter-advanced` / `library-organizer-jobs` 等 release 裁剪边界。
- Execution 01–03 页面只通过完整 UIR browser gate 做跨页回归；未重开 Context / Settings / Data 的 owner 或产品结构。

## Screenshots opened and reviewed

本机真实 Chrome harness 生成并逐张打开：

1. `work/ux-r6/uir-04-popup-350x600-light.png`
   - Popup 主动作、捕获状态、输入计数与本机标签层级清楚；内部工具保持低频折叠区。
2. `work/ux-r6/uir-04-popup-350x600-dark.png`
   - dark token 与主应用一致；主按钮 / secondary / focus 对比保持可读。
3. `work/ux-r6/uir-04-local-tools-1024x768-dark.png`
   - Product Signals、Passport、Context Package 仍为单一 owner；低频工具页具有明确返回路径和一致 surface / control token。
4. `work/ux-r6/uir-04-local-tools-390x844-light.png`
   - 390px 下 metrics / forms / audit / action 区重排为单列，无横向根溢出；内容较长但所有 owner 可通过纵向滚动到达。
5. `work/ux-r6/uir-04-current-release-popup-350x600-dark.png`
   - built current release 保留回到 PAIA、暂停 / 恢复与状态；内部 diagnostics / local-tools details 按既有 release transform 消失。

未发现需要重新打开 Execution 01–03 产品设计的跨页一致性 blocker。

## Local validation

- `uir-04-popup-local-tools-chrome-e2e.test.mjs`: **1 / 1 PASS**；source + built current release，含暂停 / 恢复、theme、390px / 350px reflow、release pruning 和本机工具 owner。
- `npm run test:ui-refresh`: **10 / 10 PASS**（source + built current release；UIR-01～04 全部 current UIR Chrome journeys）。
- Adapter contract：**95 / 95 PASS**；privacy/security：**52 / 52 PASS**。
- `npm run build:release`：PASS；current release package guard `8039` PASS / 214 files / `RELEASE_PRODUCT_GUARD_PASS`。
- `node scripts/check-ui-refresh-ci.mjs`：`CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=11 uir=10`。
- source package guard：`8467` PASS；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- Draft Development Gate：run `35185314723` — **SUCCESS**；同 SHA Draft Full Certification `#334` 已 **SKIPPED as designed**。
- 本机额外 unit 验证：`908 / 909 PASS`；唯一失败为 `history-performance-v090` 10k synthetic case 在本机 Node `v26.8.2` 触发既有 180s 门槛；单文件 `--test-concurrency=1` 复跑也同样超时。CI 固定 Node 22，同 SHA Certification #335 的 Unit 2/4 已 SUCCESS（约 3m02s，包含该性能文件）；未改 timeout / 断言 / 实现。
- `git diff --check`: PASS。
- focused journey 中 DeepSeek request、extension network request、unexpected external request 均为 0；harness errors 为空。

## Runtime / test checkpoint

- Remote runtime/test commit: `c2fd66a34a7a873270def9ddd5d50ab7baca1017` (`feat(ui): align popup and local tools presentation`).
- Commit tree: `cecc6b7c8acf479dda6c5106755921bc675f3304`，与本地冻结 commit tree 完全一致。
- PR #31: open + Draft + unmerged；Final Certification `#335` / run `35185601519` — **SUCCESS**。

## Boundary / final decision

Execution 04 的 runtime/tests、focused visual evidence 与 Draft Development Gate 已稳定；随后仅在 UIR-04 内把 PR #31 临时切 Ready，Final Certification `#335` / run `35185601519` 对同一 SHA `c2fd66a34a7a873270def9ddd5d50ab7baca1017` **SUCCESS**。认证后 PR 已恢复 Draft。Execution 04 因此作为 UIR-04 最后一个 implementation subset 完成；round COMPLETE 由 `UIR_04_REPORT.md` 与最终 `VISUAL_REVIEW.md` 收口。不得 merge `main`、部署、发布或进入 UIR-05。
