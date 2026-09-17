# UIR-02 Report — Archive、Search、Revisit 与 Input Reader

日期：2026-09-16  
仓库：`haohongfei2001-png/paia`  
分支：`chrome-ui-refresh-v1`  
冻结 main 基线：`c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`  
UIR-01 收口 HEAD：`3e849b539362ad365c461191c291a49ce9f2edee`  
UIR-02 恢复审计 entry：`563de7c60c29a18a0ffa5bd65e8d2cb3710fa3da`  
最终认证代码/测试 HEAD：`786eeee7d5a31c4d49e2b0e56dc834a57dcd07bd`

## 结论

**UIR-02 COMPLETE。**

本轮把 UIR-01 已完成的 Shell 内部真实内容重排为可扫描 Archive、可持续阅读 Reader、主工作区 Search 与轻量 Revisit，并把 Source / revision / removed review 三种状态明确分层，同时补齐移动后的 preview mask。没有新增分类法、摘要、推荐、阅读位置 store、授权、Provider 行为、数据迁移或 durable schema；没有合并 `main`，没有部署，也没有开始 UIR-03。

恢复执行时没有假设 UIR-02 未开始。先从 UIR-01 收口 `3e849b…` 审计到当时真实 HEAD `563de7c…`，确认已有 7 个连续 UIR-02 提交并保留正确工作；之后只补实际剩余子集和验证闭环。

## 恢复审计与已存在工作

从 `3e849b539362ad365c461191c291a49ce9f2edee` 到 `563de7c60c29a18a0ffa5bd65e8d2cb3710fa3da` 连续 7 个提交：

1. `f4013f7` `feat(ui): UIR-02 refresh archive search and reader`
2. `ee09015` `fix(ui): restore Search history before closing`
3. `b2b1020` `fix(ui): align Search task presentation`
4. `28a5db2` `test(ui): stabilize UIR-02 visual evidence`
5. `444e519` `fix(ui): keep internal Search close local`
6. `527950b` `fix(ui): restore Search stale-scope copy`
7. `563de7c` `test(ui): enter Revisit from Archive home`

这组恢复 entry 已完成 Archive / Reader / Search / Revisit 的主要 presentation，并在 PAIA Certification `#305` / run `34970250345` 成功。恢复检查没有把这些工作重写或回退。

## 最终实际改动

### Archive

- 文档列表由厚卡/泛化 subtitle 收敛为真实 title、来源时间状态、message count 与必要类型信息。
- 当前范围/已显示数量保持诚实，不把当前页长度冒充全库总量。
- Search 作为 Archive 工具出现，原 cursor、query、document identity 与稳定 signature 保持不变。
- 普通 Archive DTO 不增加正文 snippet，不用 Source 原文冒充工作版本预览。

### Reader

- 工作区宽度与用户保存的 640/680/720 正文阅读宽度分离。
- 连续正文去掉逐段厚卡，header/date/order/per-input actions 降为辅助层级。
- 既有 dwell/position、asc/desc、展开、邻近 fallback、新收录提示、IME、Undo/Redo、保存失败真实 buffer、移动 Done 等 owner 不变。
- light/dark 与 390px save-failure 视觉状态均通过真实 Chrome 证据检查。

### Search

- Universal Search 保持唯一主 query，结果/选择/模式/filter details 重排为主 workspace task，而不是 dialog。
- Search → Reader → Back 恢复 query/page/selection/scroll；关闭内部 Search 不错误离开 Archive。
- historical Source 与当前版本保持不同语义；来源时间不暴露 raw ISO，stale scope copy 保持既有含义。
- `按时间看` historical body 纳入 R6 preview mask；明确打开 Reader / Source 的全文不被 preview mask 误伤。

### Revisit

- 重排为轻量阅读分区：继续、新材料、Topic 新材料与 old opt-in 保持原 fixed-window / exclusion / old-recall policy。
- 不新增 ranking、AI filler、清任务或自动旧内容曝光。

### Source / revision / review

Presentation runtime commit：`80aa1a3826afa5f6d827f349a983d86027e7c387`。

- Review 明确区分 `待确认归属` 与 `已移除`；解释只作用于工作层，当时记录不被改写。
- Source 保持只读历史层，使用 `查看当时记录` 语义；没有变成编辑器。
- Revision 使用 `版本历史`，明确“恢复会建立新版本”，没有改 revision model 或恢复算法。
- Browser acceptance 新增真实 `EXCLUDE_LIBRARY → 已移除 → 恢复到 Input Archive` 路径，并验证 Source / Revision / Review 的呈现与行为。
- `ui/r6.css` 只新增 historical Search body 的 preview-mask 覆盖；Reader/Source explicit full text 继续可读。

### Browser acceptance

`tests/uir-02-archive-search-reader-chrome-e2e.test.mjs` 覆盖 source 与 built-release 两条路径，并注册进 current browser group。后续 selector-only fix `4db9c699d22b1e69a52b687c1ed9479acbfbec53` 将 `全部结果` locator 收紧为 exact match，以消除它与 `全选全部结果` 的 Playwright strict-mode 歧义；没有修改产品，也没有降低断言。

`786eeee7d5a31c4d49e2b0e56dc834a57dcd07bd` 是同一 tree 的认证 marker HEAD，用于可靠触发当前 PR 的最终 Actions 验证。

## J01–J07 acceptance 对照

- **J01 Archive / F-LARGE**：Archive presentation 由 UIR-02 browser journey 验证；既有 UX-R2 F-LARGE 真实 IndexedDB 100k Inputs / 1000 documents / 300 topics / 5000 entries 继续 PASS，证明本轮没有用每行全文/N+1 破坏 bounded 行为。
- **J02 Reader position / order / fallback**：UX-R2 dwell-position、paging/sort、new capture、remove/purge fallback 等真实 Chrome journeys 全部 PASS；UIR-02 Reader presentation test 继续在同一 owner 上工作。
- **J03 IME / save failure / mobile**：UX-R2 IME/save-failure/Retry/Undo/revision/Source/mobile Done PASS；最终 390×844 save-failure PNG 人工复查 PASS。
- **J04 Search / selection / Reader return / historical Source**：现有 UX-R4 Search current journeys 与 UIR-02 Search journey均 PASS；query/return、selected state、historical presentation 与 mask regression 均有 Chrome 断言。
- **J05 Revisit**：Archive → Revisit 入口、fixed visit window、exclusion、old opt-in 与 quiet presentation 均由现有 Revisit/UX-R2 tests + UIR-02 screenshot 覆盖并 PASS。
- **J06 Source / removal / restore / purge**：Source read-only、revision restore semantics、removed review restore，以及既有 purge invalidation 均在 current suite 中 PASS；没有为视觉保留旧正文。
- **J07 built release**：UIR-02 test 从当前 release tree 走 Archive / Search / Reader presentation，并验证零隐式 provider/network；built-release Archive 截图进入最终 evidence。

## 最终验证链

### PAIA Certification #310

run `35018869252`，最终结论 **SUCCESS**，认证 HEAD `786eeee7d5a31c4d49e2b0e56dc834a57dcd07bd`。

- Full Suite Certification：**1090 / 1090 PASS**，fail 0，skipped 0。
  - unit：909 PASS。
  - browser E2E：34 PASS。
  - adapter contract：95 PASS。
  - privacy/security：52 PASS。
  - `uir-02-archive-search-reader-chrome-e2e.test.mjs`：1 PASS。
- Current Browser targeted rerun（attempt 2）：**SUCCESS**。
  - step 8 UX-R1→R6 + Round 4.8/4.9/4.10：`32 / 32 PASS`。
  - complete current browser suite：`34 / 34 PASS`。
  - UIR-02 browser journey：PASS。
  - package / development guards：PASS。
  - UX-R1～R6 artifact uploads：PASS。
- 4 个 unit shards：全部 PASS。
- Adapter and privacy contracts：PASS。
- Current release build and guards：PASS。
- macOS Secure Store Certification：PASS；仍只代表 CI 路径，不宣称物理 Secure Enclave 生命周期验证。

### Flake / failure 定性

运行过程中没有通过修改无关代码或降低断言来“修绿”。

- `#308` 暴露了 UIR-02 新测试 `全部结果` accessible-name strict-selector 歧义，修复为 exact match；属于测试定位器问题。
- `#310` attempt 1 的 Current Browser 在 complete browser suite 前命中一个既有 UX-R5 provider-failure recovery 波动；同一 HEAD 的 Full Suite 中该用例 PASS，并且此前出现过的 UX-R5 focus 波动也 PASS。
- 因而只 targeted rerun Current Browser。attempt 2 中两个既有 UX-R5 用例与全部 step 8 / step 9 同时通过；没有修改 AI presentation、Provider recovery 或其断言。

## Release / artifact

- Current-release artifact：`10416252960`。
- Full-suite receipt artifact：`10417612200`。
- 最终 UIR-02 / UX-R2 visual artifact：`10418906783`，artifact SHA-256 `e0ef08d5b880339bca8c5380fdbfb069b22264ee01ec720d914895b98e5617c7`。
- 旧失败 attempt 的 UX-R2 artifact `10417257872` 不作为最终视觉完成证据。

## 最终视觉证据

逐图人工检查见 `../evidence/UIR-02/VISUAL_REVIEW.md`。最终 artifact 的原始 PNG 覆盖：

- Archive 1440 light；
- built-release Archive 1440 light；
- Reader 1440 light / dark；
- Search 1440 light；
- Revisit 1440 light；
- Reader 390×844 save failure；
- Source 1440 light；
- Revision 1440 light；
- Removed Review 1440 light。

另一个同 artifact 的既有 UX-R2 matrix 继续包含 320 / 390 / 1024、light/dark、200%、Source、save-failure、large fixture 等真实 Chrome 证据。本轮不把所有 42 个 artifact 文件复制入仓，只在最终 review 中固定关键 PNG 的文件名与 SHA-256；原始 PNG 保留在 Actions artifact。

人工检查最终结论：Archive 首屏信息重量正确且无虚构 summary；Reader 连续正文和 light/dark 层级稳定；Search scope/filter/selection 层级清楚；Revisit 不变成任务面板；390 保存失败动作可达；Source/Revision/Removed Review 三种语义可区分；preview mask 没有误伤明确全文；没有发现需要继续修改 UIR-02 runtime 的视觉问题。

## 验证限制

- Browser 证据来自 GitHub Actions 隔离 Linux/Xvfb + 真实 Google Chrome 与合成 profile，不是用户日常 macOS Chrome profile。
- macOS secure-store job 认证 CI path，不代表真实物理 Secure Enclave 生命周期测试。
- `main` 始终停在冻结基线；本轮没有 merge、release deployment 或生产数据迁移。

## 交接

UIR-02 的功能、final current browser、Full Suite、release/guards、真实截图、人工视觉复查、`VISUAL_REVIEW.md` 与本报告均已闭环，因此本轮正式 COMPLETE。

UIR-03 保持 **NOT_STARTED**。本 execution 到此停止；不得自动开始 Thought / AI presentation 刷新，不合并 `main`，不部署。