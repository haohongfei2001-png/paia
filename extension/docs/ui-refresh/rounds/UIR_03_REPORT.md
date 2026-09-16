# UIR-03 Report — Thought Library、Topic 与 AI Presentation

日期：2026-09-16  
仓库：`haohongfei2001-png/paia`  
分支：`chrome-ui-refresh-v1`  
冻结 main：`c7d132a7359c82a3402a1fbcfbf4d618c0e4d17e`  
UIR-03 entry：`fa48fd5b284e6208c3833b68f4ba5fe4a46f2128`  
最后产品 runtime/test checkpoint：`02cad33c0af62c8f6586bf97b34e4265d16fe3ec`  
最终认证 branch HEAD：`0b7c7d966a51c1e8e5ddf68d91849b8132b65e10`

## 结论

**UIR-03 COMPLETE。**

本轮在不改变 Source / Working Input / Thought / AI candidate / authorization 真值边界的前提下，把 Thought 首页、Topic Original、Organized、真实 AI 运行状态、candidate comparison 与 preview mask 收敛为同一阅读产品。没有新增 durable schema、Provider、自动付费、自动重试、固定思想阶段、taxonomy、任务系统、正文副本或授权概念；没有 merge `main`，没有部署，也没有开始 UIR-04。

UIR-03 由 Execution 01–04 分段完成。最终 closure 没有重做已闭环子集，只补齐任务书明确要求但 Execution 03 缺失的 Candidate 1024 证据、修复该 browser test 在 route repaint 后的导航同步，并让已增长到超过 30 分钟的原完整 Current Browser certification 有足够的 job wall-clock budget 完成。最终 #328 在不删测试、不降断言/阈值、不改产品 runtime 的情况下全链 SUCCESS。

## 实际改动面与边界

从 entry `fa48fd5…` 到认证 HEAD `0b7c7d…`，product presentation runtime 只涉及：

- `ui/thought-reader.css`
- `ui/thoughts.js`
- `ui/ai-presentation.js`
- `ui/ai-candidate.js`
- `ui/r6.css`

另新增 4 个 UIR-03 current-browser tests、`scripts/test-groups.mjs` 注册、本轮 STATUS / visual-review 文档；最终 `.github/workflows/paia-certification.yml` 仅把 **Current Browser job 总 wall-clock** `30 → 40`，没有改变 test timeout、suite 内容、顺序、断言或 threshold。

未修改 `core/**`、`background/**`、`adapter/**`、`content/**`、manifest、Provider runner、预算、CAS 服务、durable schema、backup format、migrations 或 native-hosts；没有 adapter 只读例外。

## Execution 01 — Thought 首页 / Topic Original

Runtime/test HEAD：`bc4fe4a1c390850809c45d947a44d651f88d678f`；Certification `#314` SUCCESS。

- Thought 首页保留唯一 `思想库` h1、真实 Topic identity、已有 summary/sourceHint、recent 与 grid/list preference；没有模型补写缺失简介。
- Topic shell 拓宽，但 Original 正文仍受保存的 prose width 约束；`LibraryEntryEditor`、body binding、revision、provenance、Source compare、mobile Edit/Done owners 不变。
- 首页 search/recent/更多与移动层级重排，但 Topic ID、稳定排序、阅读位置与布局偏好不变。
- `uir-03-thought-original-chrome-e2e.test.mjs` 覆盖 source + current-release。

## Execution 02 — Organized / truthful runtime state

Final runtime/test HEAD：`b6a3cfea75c401df8ba940620bef52c8fe4bc933`；Certification `#320` SUCCESS。

- Organized 使用已有 `blockSummary` / `currentView`；`possibleEvolution` 命名为“思考线索”，不虚构固定成长阶段。
- evidence 继续从真实 evidence Entry 读取；其他非空已保存 AI 字段保留在“其他已保存的整理”，没有静默删人改内容。
- 现有 status owner 映射 `prepared / sent / response_received / validated / candidate / stale / outcome_unknown / failed / unavailable`；不新增 poller 或推断状态。
- 一次显式首次生成只产生一次 synthetic DeepSeek fixture request；处理中 Original 持续可读，cache switch/status/theme/resize/reopen 不产生隐藏请求。
- 修复 `sent` 状态下 optional status refresh 重新创建 first-generation 入口的问题；最终 processing 只保留真实运行状态区。
- `uir-03-ai-presentation-chrome-e2e.test.mjs` 覆盖 source + current-release、light/dark、1024/390、reduced motion 与网络计数。

## Execution 03 — Candidate comparison

Final runtime/test HEAD：`ce4c0cb865c5b558d09f8483c3699199a2e98883`；Certification `#324` SUCCESS。

- 继续使用既有 candidate durable state、staged choice key、pre-save flush、expectedRevision 与 CAS。
- Desktop 当前稿/更新候选并列；窄屏按 DOM 顺序上下排列；adopt/keep 只表示暂存，不冒充 durable save。
- 所有真实 changed fields 处理后才开放唯一保存入口；一次 guarded save 原子提交。
- stale candidate 保留当前稿、旧候选与暂存意图，但禁用旧 adopt/keep、移除旧保存入口，只允许重新更新。
- Execution 03 已闭环 1440/900/390、light/dark、stale 与 built release。Final closure 发现任务书还明确点名 1024，因此 `71cd08ac805efbc2b9b2c49d3103aad3480d9965` 只增加 1024 viewport 断言/截图，不改 runtime。
- #326 随后暴露 test 在 `ARCHIVE_CHANGED` 重绘后点击隐藏 `#back` 的 route race；`3b53ded4498afbf152bafcb90e6a7739faf9e1df` 只把 3 处裸点击收敛为 route-settle/reopen helper，Candidate/CAS/Provider/network 断言全部保留。

## Execution 04 — Preview mask

Runtime/test HEAD：`02cad33c0af62c8f6586bf97b34e4265d16fe3ec`；Certification `#325` SUCCESS。

- R6 mask 继续遮 Topic card `.summary`，并按 DOM 结构精确覆盖“加入主题”selection preview 与 `<details>` 内引用/相关材料 preview。
- 没有全局隐藏 `.topic-selection-preview`；明确 compare/full-body 仍可读。
- 明确打开的 Original、Organized `currentView` 与 evidence 正文不误遮；browser test 同时检查被遮正文没有复制进 `title` / `aria-label`。
- 没有触碰 UIR-04 Context/Settings owner。

## Owner / 数据 / 权限边界保持

- Thought body 编辑仍由既有 editor + binding/revision owners 管理；同一 Thought 多 Topic、首次实际编辑才解除跟随、默认不反写 Input、高级反写及一次性 Undo 确认仍由原 UX-R3 suite 验证。
- AI 字段编辑仍由 `AIReadingEditor` 管理；candidate presentation 只包装既有 proposal / choice / save 流程，没有从展示文案反推写入对象。
- Source purge、Input removal、人工保护、Topic/Section placement、reading position、authorization、local-only、credential、budget 均未被 presentation 层重新定义。
- preview mask 仍只是本地 presentation preference，不扩张成新的输出授权。

## J01–J07 acceptance

- **J01 主题浏览**：UIR-03 Thought/Original test + 既有 UX-R3 journey 覆盖 grid/list、recent、open/back、search/order、stable identity 与 F-LARGE bounded 路径。
- **J02 编辑边界**：UX-R3 binding / reverse / Undo / IME / current Input change / restore 全部继续 PASS；UIR-03 没有改这些业务 owners。
- **J03 视图/首次生成**：Original → 无缓存 → 显式一次生成 → Organized/cache 切换由本轮 test 验证；除显式 synthetic fixture action 外 Provider count 不增加。
- **J04 运行中/失败**：in-flight、当前稿可读、failure / `outcome_unknown`、零自动重试由本轮 + UX-R5 recovery suite 覆盖。
- **J05 候选/保护**：1440/1024/900/390、staged-vs-saved、guarded save、stale CAS、reopen/resize choice retention 全部验证；旧 UX-R5 candidate/update visual matrix 同时 PASS。
- **J06 证据/删除/mask**：Organized evidence、Source purge/依赖失效沿用原服务；Execution 04 验证 card/material preview 遮挡、明确全文可读与无 tooltip/ARIA 旁路。
- **J07 release**：四个 UIR-03 browser tests 都包含 current-release 路径；#328 release build、Current Browser、Full Suite 与 built-release screenshots 同时通过。

## 最终验证 — Certification #328

Run `35069245744`，branch HEAD `0b7c7d966a51c1e8e5ddf68d91849b8132b65e10`，PR merge test ref `5951c8681ad33543d3ad7e4f5116c005132cf878`；最终 **SUCCESS**。PR merge test ref 不是把开发分支 merge 到 `main`。

- Full Suite：**1094 / 1094 PASS**，fail 0，skipped 0。
  - unit 909；browser E2E 38；adapter contract 95；privacy/security 52。
- Current Browser core journeys：**32 / 32 PASS**。
- Complete current browser suite：**38 / 38 PASS**。
- 4 个 UIR-03 专用 browser tests在 Full Suite 与 Current Browser 中都明确 PASS。
- Package/development guards：`PASS: 8446 package guardrails across 197 runtime resources`；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- 4 unit shards、Adapter/privacy、Current release build/guards、macOS Secure Store CI path、Certification gate：全部 SUCCESS。
- Full-suite receipt：`fullSuite=true auditPassed=true historicalBrowserFiles=76`；input digest `6fa315813f6fc0d12532e59f8ad25cf32387bd492c3331ab34cdfd0ed141cd95`。

### #326 / #327 failure 定性

- **#326**：Candidate test route race，不是产品断言失败；只修 test navigation synchronization。
- **#327**：Full Suite 已 1094/1094，Current Browser 的 32/32 core journeys 与四个 UIR-03 tests 也已实际 PASS，但整个 browser job 在约 30 分钟被 job-level wall-clock 取消，因此 Certification gate 失败。
- **#328**：`0b7c7d…` 只把 Current Browser job-level wall-clock 30 → 40；没有 test timeout、skip、降 threshold、删 F-LARGE 或改变 suite 顺序。原 gate 随后完整 32/32 + 38/38 + guards，并最终 SUCCESS。

## Provider / network

本轮 browser tests 使用隔离 synthetic DeepSeek fixture。**Live paid Provider requests = 0。** 明确首次生成/更新只在用户显式动作下触发对应 fixture request；cached/status/reopen/resize/theme/preview-mask 路径不新增隐藏请求。各 UIR-03 tests 还检查 unexpected external requests = 0；manifest/network/privacy 约束由 #328 privacy/security 与 development audit 再验证。

## Release / artifacts

- Current release artifact：`10435094698`；digest `sha256:463493faa460750fd6d5a24ed08f67404c4651a572d4bbec5802b220594fbb18`。
- Final full-suite receipt：`10436906920`；digest `sha256:9aa5ed90f5917d24b4c0c0833d6da3219a17bd9a25609256515fcc191bd3c340`。
- Final UX-R3 visual/browser artifact：`10435977874`；digest `sha256:aaaedf7ec03c893b27d75ca8e6bc67a9c6d536599d713b501958fe1946f6a613`。

## 最终视觉证据

逐图人工检查见 `../evidence/UIR-03/VISUAL_REVIEW.md`。Raw matrix 保留在 #328 UX-R3 artifact并以逐图 SHA-256 固定，覆盖 home light/dark、Original、processing、Organized light/dark、Candidate 1440/1024/390/stale、built release 与 preview mask。

最终 GitHub evidence 目录另外持久化两张由 #328 原始截图生成、已逐字节校验 Git blob 的代表 PNG：

- `UIR_03_REP_CANDIDATE_1024.png`
- `UIR_03_REP_CURRENT_RELEASE_CANDIDATE.png`

完整 raw PNG 不重复全部复制进仓库，Actions artifact + digest + raw image SHA-256 是原始证据；代表 PNG 用于长期快速视觉索引。

人工结论：主标题唯一；Topic/长正文层级稳定；processing 不盖当前稿；Candidate current/proposal 与 staged/saved 语义清楚；1024/390 无根级横向溢出；dark 无亮白残块；stale 不绕过 CAS；preview mask 不误伤已打开正文或从 tooltip/ARIA 泄漏；source 与 built release 无明显漂移。没有需要继续修改 UIR-03 runtime 的视觉问题。

## 验证限制

- Browser 证据来自 GitHub Actions Linux/Xvfb + Google Chrome synthetic profile，不是用户日常 macOS Chrome profile。
- macOS secure-store job 只认证 CI path，不代表物理 Secure Enclave 生命周期验证。
- synthetic Provider fixture 不等同 live Provider 成功；本轮没有 live paid Provider 调用。
- 当前没有在线 Remote Desktop，因此没有伪称本机 browser smoke。
- `main` 始终停在冻结基线；本轮没有 merge、deployment 或生产数据迁移。

## 交接

UIR-03 的四个 implementation subsets、最终 Current Browser / Full Suite / release / guards、1024/390/dark/processing/release/preview-mask screenshots、人工视觉复查、代表图、本报告与 STATUS 均已闭环，因此本轮正式 **COMPLETE**。

**UIR-04 保持 NOT_STARTED。** 下一正式 execution 如进入 UIR-04，必须重新解析 `chrome-ui-refresh-v1` 真实 HEAD，并在同一 SHA 读取 README、SPEC、STATUS、`rounds/UIR_04_CONTEXT_SETTINGS_AND_ACCEPTANCE.md` 与本报告后再开始。本次 execution 到 UIR-03 closure 为止，不实现 UIR-04，不 merge `main`，不部署。
