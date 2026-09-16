# PAIA Chrome UI Refresh — Execution Status

本文件是 UIR 阶段唯一执行状态。版本 v1.14，2026-09-16。

## 1. Baseline / branch / current state

- 仓库：`haohongfei2001-png/paia`
- 冻结 `main`：`c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`
- 唯一 UI Refresh 开发分支：`chrome-ui-refresh-v1`
- UIR-01：**COMPLETE**
- UIR-02：**COMPLETE**
- UIR-03：**COMPLETE**
- UIR-04：**IN_PROGRESS**
- 当前 implementation round：**UIR-04**；**Execution 01 — Context / MaterialTray presentation COMPLETE**。下一 execution：**Execution 02 — Settings shell / six-group owner audit（NOT_STARTED）**。
- `main` 未 merge，未部署，未发布。

下一次 execution 必须重新解析 GitHub 上 `chrome-ui-refresh-v1` 的真实 HEAD。STATUS 不追写包含自身的 closure SHA。

| Round | Status | 任务书 | 报告 |
|---|---|---|---|
| UIR-01 | **COMPLETE** | `rounds/UIR_01_SHELL_AND_ARCHIVE_FRAME.md` | `rounds/UIR_01_REPORT.md` |
| UIR-02 | **COMPLETE** | `rounds/UIR_02_ARCHIVE_SEARCH_READER.md` | `rounds/UIR_02_REPORT.md` |
| UIR-03 | **COMPLETE** | `rounds/UIR_03_THOUGHT_AND_AI_PRESENTATION.md` | `rounds/UIR_03_REPORT.md` |
| UIR-04 | **IN_PROGRESS** | `rounds/UIR_04_CONTEXT_SETTINGS_AND_ACCEPTANCE.md` | 尚无 |

## 2. Certified checkpoints

- UIR-01 final certified runtime：`d2e6f92f1a73c7a092f2dd24429a098a312cf6ad`
- UIR-02 final certified runtime/test：`786eeee7d5a31c4d49e2b0e56dc834a57dcd07bd`；Certification `#310` / run `35018869252` — **SUCCESS**
- UIR-02 docs closure / UIR-03 entry：`fa48fd5b284e6208c3833b68f4ba5fe4a46f2128`
- UIR-03 final certified branch HEAD：`0b7c7d966a51c1e8e5ddf68d91849b8132b65e10`；Certification `#328` / run `35069245744` — **SUCCESS**
- UIR-03 docs closure：`6a9e603eff58ef0f07351847a2d95d4aa7a6f857`
- UI Refresh CI cadence implementation：`f7a825182f47d8c7820f2647def96705d0e7404a` (`ci(ui): add fast UIR development gate`)

UIR-03 的完整实现、视觉证据和边界以 `rounds/UIR_03_REPORT.md` 与 `evidence/UIR-03/VISUAL_REVIEW.md` 为准；不要在 UIR-04 重做 UIR-03。

## 3. UI Refresh CI cadence — VALIDATED

执行节奏的权威文件：`CI_WORKFLOW.md`。从现在开始，任何 UIR execution 在读取本 STATUS 后都必须读取它。它只改变验证调度，不放宽产品、隐私、授权、删除、数据所有权、测试断言或 round COMPLETE 标准。

### PR #31

- PR #31：`chrome-ui-refresh-v1 → main`
- 用途：**CI-only validation，永不 merge**
- 当前应保持：**open + Draft**
- **Draft = development mode**
- **Ready for review = round-final full-certification mode**
- Draft/Ready 切换由 Agent 自己完成；用户不需要操作 GitHub UI。

### Development mode

普通 UIR runtime/test push 时，PR #31 保持 Draft：

- 完整 `PAIA Certification` 对该 Draft UIR PR 跳过；
- 自动运行 `PAIA UI Refresh Development Gate`；
- 快速 gate 包含 4 unit shards、Adapter/privacy、current release build、全部 `uir-*-chrome-e2e.test.mjs`、package/development guards 和 aggregate gate；
- 不在每个小 execution 重复 1094 Full Suite、完整 UX/F-LARGE browser matrix、macOS Secure Store final certification。

验证事实：

- CI implementation HEAD：`f7a825182f47d8c7820f2647def96705d0e7404a`
- Draft 下 Full Certification `#329` / run `35080686792`：**SKIPPED as designed**
- `PAIA UI Refresh Development Gate` run `35080686871`：**SUCCESS**
- 4 unit shards、Contracts、UI Refresh Browser + Release、package/development guards、aggregate gate：全部 SUCCESS

### Final-certification mode

当前 round 的 runtime/tests 冻结、fast gate 通过、准备正式 COMPLETE 时：

1. Agent 核对 PR #31 head 等于待认证 branch HEAD；
2. Agent 将 PR #31 临时切为 Ready for review；
3. 完整 `PAIA Certification` 自动运行；
4. Unit 1/4～4/4、Adapter/privacy、Current Browser、Full Suite、macOS Secure Store、Current release、Certification gate 必须全部 SUCCESS；
5. 若失败，Agent 先把 PR #31 切回 Draft，再修复；fast gate 不能替代最终认证；
6. 成功后 Agent 立即将 PR #31 切回 Draft，再写 report/evidence/STATUS closure。

端到端机制已在同一 CI implementation HEAD 上实际验证：

- Ready 后 Full Certification `#330` / run `35081073772`：**SUCCESS**
- tested branch HEAD：`f7a825182f47d8c7820f2647def96705d0e7404a`
- PR merge test ref：`89e07df862937e41ec37c833c2633abd2977f542`（仅 PR test ref，不是 merge `main`）
- Full Suite：**1094 / 1094 PASS**；unit 909 / browser E2E 38 / adapter contract 95 / privacy-security 52
- Current Browser：**38 / 38 PASS**
- package guard：`8446` PASS
- `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`
- 4 unit shards、Adapter/privacy、release、macOS Secure Store、Certification gate：全部 SUCCESS
- Full-suite receipt：`fullSuite=true auditPassed=true historicalBrowserFiles=76`
- input digest：`99f792446a2b8a53ab1a17598c45d51f36a706a2a8c7e9604ccdc42536e26612`
- full-suite artifact：`10440612642`；ZIP SHA-256 `ffa9a695c8d1332ffe5f8eee0186af04558f0406680f6064a9c40c37c1f6d991`
- Full certification 成功后 PR #31 已恢复 **Draft**。

## 4. Current Browser optimization boundary

旧 Current Browser job 在同一 job 中：

1. 先显式串行跑 11 个 core browser 文件（32 tests）；
2. 再 `npm run test:browser`，把这些文件作为 current browser 集合的一部分再次跑一遍。

现在删除第 1 次重复执行，只保留一次完整 `npm run test:browser`。覆盖没有减少：

- `scripts/check-ui-refresh-ci.mjs` 在 final Current Browser 前强制验证旧 11 个 core browser 文件仍存在且仍属于 current `browser E2E`；
- 所有 `uir-<round>-...-chrome-e2e.test.mjs` 自动属于 current `browser E2E`；
- #330 最终仍为 **38 / 38 PASS**；
- Full Suite 仍为 **1094 / 1094 PASS**；
- F-LARGE、contrast/keyboard/IME/CAS/privacy 等既有断言没有删除、skip 或降 threshold。

实测 wall-clock：旧 #328 Current Browser 因重复 pass 整体约 27 分钟；去重后的 #330 Current Browser 约 15–16 分钟，同时保持完整 38-test current coverage。该变化是去重复，不是削弱 certification。

## 5. Test registration rule

未来新增 UIR browser test 使用命名：

`uir-<round>-<scope>-chrome-e2e.test.mjs`

即可自动进入：

- Draft fast UI Refresh browser gate；
- current `browser E2E`；
- final Current Browser；
- final Full Suite。

不再为每个 UIR test 手工维护 current-browser 白名单。coverage contract 会在 final gate 前防止漏测。

## 6. UIR-04 current execution / handoff

UIR-04 于 branch entry `b2201ea41e4af032358135607c6685e4138822e3` 开始。PR #31 继续保持 **open + Draft**；`main` 未变化。

### Execution 01 — Context / MaterialTray presentation — COMPLETE

- Runtime/test HEAD：`5495f5f2ed7d46344b549101f81eef76f75aebc0`。
- `MemoryPanel.activate(true)` 继续委托既有 `MaterialTray`；`#material-workbench` 仍是唯一 Context root，desktop/mobile drawer 只移动同一个 root，不 clone。
- selection refs/revisions、`sourceEpoch` / recheck、draft / IME、order / remove / redact、stale / blocked / expiry、最终 copy / Markdown 继续由既有 `PAIA_CONTEXT_MANUAL` + MaterialTray owner 负责；未修改 ContextPackage / Grant / Backup 核心语义。
- Context 主框架解除旧 680px 整页限制；>=1100px page/tray 使用材料主列 + 轻量任务辅助列，<=1024px / drawer 单列；真正 output/edit prose 继续服从 `--paia-prose-width` 640/680/720。
- desktop drawer 约 400px 非模态；<=600px 继续 full-width + inert/focus 边界。Search 原有 presentation selectors 与 reduced-motion 保留。
- 人工视觉审查首次发现 preview 从 drawer 回主区后残留“关闭材料盘”控件；已最小修复并补 browser regression。
- 新增 `tests/uir-04-context-chrome-e2e.test.mjs`；source + built current release 验证唯一 h1、同 root、真实数量/来源角色、720px reading width、desktop/mobile drawer、IME draft、blocked output fail-closed 与 0 unexpected network。
- 本地 focused：UIR-04 `1/1`、UX-R4 `5/5`、R1/R3 `22/22`、privacy/security `52/52`、Round48 + UX-R6 `3/3`；package guard `8446` PASS；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`；current release `8018` guardrails / 214 files / `RELEASE_PRODUCT_GUARD_PASS`。
- PR #31 Draft Development Gate run `35089213201`：**SUCCESS**；4 unit shards、Contracts/privacy、Browser + Release、aggregate gate 全部 SUCCESS。Full Certification `#331` / run `35089213190`：**SKIPPED as designed**。
- Visual evidence：`evidence/UIR-04/EXECUTION_01_VISUAL_REVIEW.md`。

UIR-04 **仍为 IN_PROGRESS**。Execution 01 完成不等于整轮完成；本 checkpoint 不切 PR Ready、不运行 round-final full certification、不 merge `main`、不部署、不发布。

### Next entry — Execution 02 — Settings shell / six-group owner audit

下一 execution 必须先重新解析 GitHub 上 `chrome-ui-refresh-v1` 的真实 HEAD，再读取本 STATUS、`CI_WORKFLOW.md`、UIR-04 任务书与 Execution 01 visual review。只从 Settings 继续：

1. 固定 `core-loop.setupSettingsShell`、`r6-settings.js`、现有 controller/handler 与 release transform 的真实 owner；先做旧 selector / owner → 六组归属清单，不复制控件。
2. 实现 Settings 自身唯一 h1、desktop 180px 组导航 + `minmax(0,840px)` 正文、<800px 同一导航的窄屏切换；保持同一控件/handler、focus 与保存语义。
3. 本 execution 优先完成 Settings shell 与六组 owner projection；Backup/恢复/开放导出、Popup/本机工具若无法在同一自洽 execution 内完成，留在后续 UIR-04 execution，不为了“做完”混入 Context 或 core 语义修改。
4. Context Execution 01 已闭环；除 Settings 改动证明造成跨页回归外，不重做 MaterialTray presentation。

## 7. Recovery / timeout rule

如果聊天、工具或网页消息超时：

- 不重做；
- 先重新读取 branch HEAD、PR #31 Draft/Ready、GitHub Actions 和本 STATUS；
- 已提交/已通过工作继续沿用；
- 只从真实未完成项继续。

不要高频轮询 Actions。长 job 运行时先完成不依赖结果的 diff audit、报告框架或视觉索引，只在关键阶段查询状态。

## 8. 验证限制

- Browser CI 证据来自 GitHub Actions Linux/Xvfb + Google Chrome synthetic profile，不等于用户日常 macOS Chrome profile。
- macOS Secure Store CI path 不等于物理 Secure Enclave 生命周期验证。
- CI cadence 优化没有改变任何产品 runtime 行为。
