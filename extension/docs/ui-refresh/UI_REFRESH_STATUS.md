# PAIA Chrome UI Refresh — Execution Status

本文件是 UIR 阶段唯一执行状态，不继承旧 UX-R1～R6 / overnight 任务派发。版本 v1.3，2026-09-16。

## Baseline / branch / HEAD

- 仓库：`haohongfei2001-png/paia`
- 冻结设计与产品起点 main HEAD：`c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`
- 唯一开发分支：`chrome-ui-refresh-v1`
- UIR-01 最终认证运行代码 HEAD：`d2e6f92f1a73c7a092f2dd24429a098a312cf6ad`
- UIR-01 收口文档 HEAD：`3e849b539362ad365c461191c291a49ce9f2edee`
- UIR-01 最终认证：PAIA Certification `#298` / run `34934973743` — **SUCCESS**。
- UIR-02 恢复审计 runtime entry：`563de7c60c29a18a0ffa5bd65e8d2cb3710fa3da`。
- UIR-02 本次 Source/revision/review + preview-mask runtime commit：`199f53107372ff883518f5001accf4cd4d525c78`（待/正在以分支 CI 验证）。
- 实时 branch HEAD：每次 execution 从 GitHub `refs/heads/chrome-ui-refresh-v1` 重新解析；本文件不通过自引用提交无限追写 HEAD。
- main 仍保持冻结基线；UIR-02 不合并 main、不部署。

## 当前状态

- 设计交付：**READY**。
- 当前实施轮：**UIR-02 — IN_PROGRESS**。
- 当前实施状态：**IN_PROGRESS**。
- 最后完成实施轮：**UIR-01**。
- UIR-03：**NOT_STARTED**；UIR-02 未完成前不得进入。
- 固定总轮数：4；不默认新增第五轮。

| Round | Status | 任务书 | 实施报告 |
|---|---|---|---|
| UIR-01 | **COMPLETE** | `rounds/UIR_01_SHELL_AND_ARCHIVE_FRAME.md` | `rounds/UIR_01_REPORT.md` |
| UIR-02 | **IN_PROGRESS** | `rounds/UIR_02_ARCHIVE_SEARCH_READER.md` | 最终报告待完成 |
| UIR-03 | NOT_STARTED | `rounds/UIR_03_THOUGHT_AND_AI_PRESENTATION.md` | 尚无 |
| UIR-04 | NOT_STARTED | `rounds/UIR_04_CONTEXT_SETTINGS_AND_ACCEPTANCE.md` | 尚无 |

## UIR-02 恢复审计（2026-09-16）

从 UIR-01 收口 HEAD `3e849b539362ad365c461191c291a49ce9f2edee` 到恢复 entry HEAD `563de7c60c29a18a0ffa5bd65e8d2cb3710fa3da`，远端分支连续前进 7 个提交，没有回退或分叉：

1. `f4013f7` `feat(ui): UIR-02 refresh archive search and reader`
2. `ee09015` `fix(ui): restore Search history before closing`
3. `b2b1020` `fix(ui): align Search task presentation`
4. `28a5db2` `test(ui): stabilize UIR-02 visual evidence`
5. `444e519` `fix(ui): keep internal Search close local`
6. `527950b` `fix(ui): restore Search stale-scope copy`
7. `563de7c` `test(ui): enter Revisit from Archive home`

恢复 entry 范围只改变 4 个路径：`extension/ui/ui-refresh.css`、`extension/ui/universal-search.js`、`extension/tests/uir-02-archive-search-reader-chrome-e2e.test.mjs`、`extension/scripts/test-groups.mjs`。

### 已完成并保留

- Archive：元数据行替代厚卡/泛化 subtitle；当前范围计数明确；搜索框与列表保持原 cursor / document identity，不引入普通正文 snippet。
- Reader：工作区与保存的 640/680/720px 正文宽度分离；正文去厚卡；light/dark surface 对齐；390px 保存失败保留真实 buffer、Retry/复制当前文字/编辑入口仍可见。
- Search：作为主 workspace task 展开；主 query、模式、可选 filters、结果与选择区层级已重排；Search → Reader → Back 恢复 query；关闭内部 Search 不错误离开 Archive；来源时间不暴露 raw ISO；stale-scope copy 已恢复正确语义。
- Revisit：已重排为轻量阅读分区；从 Archive home 进入的 browser journey 已补回，未改 fixed-window / exclusion / old opt-in 底层策略。
- 新增 `uir-02-archive-search-reader-chrome-e2e.test.mjs` 并接入 current browser group；覆盖 source 与 built release、Archive/Reader/Search/Revisit、Reader dark、390px save-failure、离线/零 Provider 请求和关键截图。
- 恢复 entry HEAD 对应 PAIA Certification `#305` / run `34970250345` 为 **SUCCESS**：Current Browser、complete current browser suite、Full Suite、release build/guards、4/4 unit shards、adapter/privacy、macOS secure-store、Certification gate 均通过。
- 同一 run 的 `ux-r2-evidence` artifact `10398561867` 已包含 UIR-02 Archive/Reader/Search/Revisit/390 save-failure/current-release 截图，以及既有 Reader/Source/Revisit 响应式 matrix。
- recovery 已实际打开检查 7 张 UIR-02 原始 PNG，并把 runtime SHA、run/artifact、原始文件名、SHA-256 与逐图结论固化到 `evidence/UIR-02/RECOVERY_VISUAL_REVIEW.md`。

### 本次 execution 子集：Source / revision / review + preview mask

Runtime commit `199f53107372ff883518f5001accf4cd4d525c78` 只改 3 个文件：`ui/review.js`、`ui/r6.css`、`tests/uir-02-archive-search-reader-chrome-e2e.test.mjs`。

- Review：在真实操作现场区分 `待确认归属` 与 `已移除`，说明归属/恢复只作用于工作层，当时记录不被改写；底层 `IMPORT_RESOLVE_BRANCH` / `EXCLUDE_LIBRARY` 请求、恢复与归属语义不变。
- Source：不改数据 owner；UIR-02 browser journey 明确检查 `查看当时记录` 命名、只读 Source、mask 开启时用户主动打开的 Source 全文仍可读，并输出 Source 截图。
- Revision：不改 revision model 或历史恢复算法；journey 明确检查 `版本历史` 与 Source 分离，保留“恢复会建立新版本”语义，并输出 revision 截图。
- Preview mask：补齐 Universal Search `按时间看` 的 `.historical-body` 正文遮挡；comparison 仍显示明确的“内容预览已隐藏”提示，不把被遮文字塞入 tooltip/aria-label；Reader/Source 用户明确打开的全文保持可读。
- Browser journey 新增真实 `EXCLUDE_LIBRARY → 已移除 review → 恢复到 Input Archive` 路径及 review 截图，并在 source 与 built-release 两条路径验证 historical Search mask 与 Reader full-text exception。

### 验证状态

- 当前执行环境仍没有在线 Remote Desktop 设备，因此不能伪称本机执行 focused/browser 命令。
- 代码以单一 runtime commit 组织，后续验证以该 SHA 的 PR Actions 为准。仓库 `pull_request` 工作流会自动包含 Full Suite；这是现有 CI 策略自动触发，不是本 execution 以 Full Suite 代替 focused 选择。
- 若 CI 暴露本子集问题，必须只修本子集并重新验证；不能以恢复 entry `563de7c…` 的旧绿灯替代 runtime 变化后的验证。

### 仍未完成

- 本次 runtime commit 的实际 Actions 结果、由本次 journey 生成的 Source/revision/review 新截图和逐图视觉检查尚需收口记录。
- UIR-02 最终 focused/guards/release acceptance、最终认可 PNG + `evidence/UIR-02/VISUAL_REVIEW.md`、`rounds/UIR_02_REPORT.md` 仍未完成。
- 以上任一项未闭环前 STATUS 必须保持 IN_PROGRESS。

## 下一次继续点

先收口 **`199f531…` 的 CI 与新截图视觉检查**。若本次 Source/revision/review + mask 子集全部通过，则把该子集记为完成，下一 execution 再进入 UIR-02 最终 acceptance/evidence/report；不要提前进入 UIR-03。

只有 UIR-02 全部功能、最终 focused/guards/release、真实 Chrome、关键截图逐图视觉检查、最终 `VISUAL_REVIEW.md` 与 `UIR_02_REPORT.md` 均闭环后，才能改为 COMPLETE。

## UIR-01 最终结果

- Shell / 导航 / Universal Search launcher / Archive 布局框架 / Settings 标题去重 / 必要 popup presentation 已完成，没有改变产品、数据或安全语义。
- 最终运行代码认证 SHA：`d2e6f92f1a73c7a092f2dd24429a098a312cf6ad`。
- PAIA Certification #298：Current Browser、complete current browser suite、Full Suite、release build/guards、4/4 unit shards、adapter/privacy、macOS secure-store、最终 Certification gate 全部 PASS。
- Full Suite：`1089 / 1089 PASS`，fail 0，skipped 0。Full-suite receipt artifact：`10383730806`。
- 最终 current-release artifact：`10383331831`；真实隔离 Chrome built-release smoke PASS。
- 最终视觉 artifacts：UIR/R1 `10383845841`；Settings/R6 `10383571588`。
- 代表性证据与 `VISUAL_REVIEW.md` 位于 `evidence/UIR-01/`。

## 验证限制

- Browser 证据来自 GitHub Actions 隔离 Linux/Xvfb + 真实 Google Chrome 与合成 profile，不是用户日常 macOS Chrome profile。
- macOS secure-store job 认证 CI 路径，不宣称完成真实物理 Secure Enclave 生命周期验证。
- 当前环境没有在线 Remote Desktop 设备。

## 后续更新规则

只用 NOT_STARTED / IN_PROGRESS / BLOCKED / COMPLETE 记录实施状态。每次 execution 先重新解析远端真实 HEAD；已有未完成工作先续做。测试、release、真实 Chrome、截图、逐图视觉检查、报告或 STATUS 缺失均不能标 COMPLETE。
