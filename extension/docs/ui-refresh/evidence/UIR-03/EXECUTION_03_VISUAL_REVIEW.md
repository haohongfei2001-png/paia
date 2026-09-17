# UIR-03 Execution 03 Visual Review — Candidate comparison

状态：**UIR-03 IN_PROGRESS / 本 execution 子集已完成**  
最终 runtime / test HEAD：`ce4c0cb865c5b558d09f8483c3699199a2e98883`  
PAIA Certification：`#324` / run `35047605444` — **SUCCESS**  
最终 UX-R3 artifact：`10427763459` (`ux-r3-evidence-4eeab7e503f6114cde7f32ec5a9afc61f8061d41`)  
Artifact SHA-256：`df1c10c7f3c13af4d95fa02b57b56585443fc12e76c04f90cdc4e67a85ffcb3b`  
Full-suite receipt artifact：`10428615254`，SHA-256 `9771b01794964a6f21348e3d9ac62fb2ab1dbbe6e935ecb434a2307c97e266a1`

本文件只记录 UIR-03 第三个 execution 的 Candidate comparison 视觉与验证闭环，不是整个 UIR-03 的最终 `VISUAL_REVIEW.md`。Topic/material preview mask 与整轮最终 acceptance 仍属于后续 execution。

## 本 execution 的实现边界

- 继续使用既有 `ThoughtWorkspace.renderCandidate()` / `saveCandidate()`、candidate key、staged choices、pre-save AI editor flush、`expectedRevision` 与 CAS；没有增加第二套 candidate state 或 durable truth。
- `ui/ai-candidate.js` 只重排现有 candidate presentation：每个实际 changed field 明确显示“当前稿 / 更新候选”；宽屏并列，容器宽度不大于 900px 时按 DOM 顺序上下排列。
- adopt / keep 仍只是页面内 staged choice；所有实际 changed field 都选择后，底部唯一“保存这些选择”才可用，一次事务保存。Candidate save 不调用 Provider。
- stale candidate 继续显示当前稿与旧候选，并保留可见的 staged choice 意图；adopt / keep 控件禁用、旧保存入口不存在，只允许显式重新更新。没有放宽 stale/CAS fail-closed。
- 重建 candidate DOM 继续恢复键盘焦点；Topic 内重开与 resize 不清除同一 candidate key 下的 staged choices。
- 新 `tests/uir-03-ai-candidate-chrome-e2e.test.mjs` 覆盖 source + built release、1440 双栏、900/390 单栏、light/dark、staged-vs-saved、一次原子保存、stale、零隐藏 Provider 请求与 representative screenshots。
- `scripts/test-groups.mjs` 只把该测试纳入 current browser group。
- 未修改 core candidate/CAS 算法、AI runner、Provider、预算、schema、background、adapter、content、manifest 或 Preview mask。

## 诊断与修复链

1. `bc578fb4e8b4b34083cfda5b5e651a46f692a43e` 增加 UIR-03 Candidate Chrome acceptance。
2. `d9f62b3f2e94db76a9f285fa8b84c1bf3a246795` 落 Candidate presentation 与 current-browser 注册。
3. `42c040938a3c31720588f594304aa8ae4245a551` 将 comparison column 的最小宽度收紧为 450px，确保不大于 900px 时不会意外保留双栏。
4. Certification `#323` / run `35046370848` 的短 gate 均通过，但 Current Browser step 8 在既有 UX-R5 candidate visual matrix 发现真实 presentation 回归：1440 light 的最低文字对比度为 `3.925322502977779`，低于既有 `4.5` 门槛；因此该候选未收口。
5. `ce4c0cb865c5b558d09f8483c3699199a2e98883` 仅修改 `ui/ai-candidate.js` 的 supporting copy 呈现，把 eyebrow、说明、stale staged note 与 footer helper 统一到 `--paia-secondary`；未改 choices/save/stale/CAS 行为。
6. Certification `#324` 在同一最终 HEAD 上通过旧 UX-R5 candidate visual matrix、新 UIR-03 Candidate acceptance 与全部 current-release gate。

## Validation — #324

- Full Suite：**1093 / 1093 PASS**；unit `909` / browser E2E `37` / adapter contract `95` / privacy-security `52`。
- `uir-03-ai-candidate-chrome-e2e.test.mjs`：明确 **PASS**；UIR-03 Original / Organized tests 同时 PASS。
- Current Browser step 8：**32 / 32 PASS**。
- complete current browser suite：**37 / 37 PASS**；新 Candidate test 再次明确 PASS。
- 既有 `ux-r5-ai-update-chrome-e2e`、candidate visual/IME/keyboard/stale matrix、provider-failure recovery、`outcome_unknown` 路径同时 PASS，没有降低旧断言。
- Package/development guards：`PASS: 8446 package guardrails across 197 runtime resources`；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- 4 个 unit shards、Adapter/privacy、Current release build/guards、macOS Secure Store CI path 与最终 Certification Gate：全部 SUCCESS。

## 最终代表截图

| PNG | SHA-256 | 人工检查结论 |
|---|---|---|
| `uir-03-candidate-1440x900-light.png` | `4f2d88319ef832a823a7049dd86b1cb5345b251bd0b4a70498b096954d4dcb43` | PASS — 每个 changed field 的当前稿与更新候选并列清楚；逐字段 adopt/keep 与唯一底部保存层级明确。 |
| `uir-03-candidate-900x900-light.png` | `91d7e549e87ad7d31c7fa4974fe2e19103b753a55f91c0c19727d22ad0942450` | PASS — comparison 按 DOM 顺序堆叠为当前稿→更新候选；没有继续挤成双窄列。 |
| `uir-03-candidate-390x844-light.png` | `489c6597810d6f7332f17f5b6c5391521ac03c8fec44c227f1a9d2ae32e4e5e2` | PASS — 单列、标题自然换行、候选 controls 可达，未见明显根级横向溢出。 |
| `uir-03-candidate-1440x900-dark.png` | `7c677aafdd310efcd16a5dbf5c6316ce4a9f6e1886d89e89464a0494e607ca54` | PASS — 无亮白块回退；supporting copy 可读，旧 3.93:1 对比度缺陷未复现。 |
| `uir-03-candidate-stale-1440x900-light.png` | `2d8b19170c9a0a03a0c635f5917b41fc4c163a2d87460b93e21ce333cdac2dbf` | PASS — stale 原因明确；已暂存“采用这段”仍可见但控件禁用，保存入口消失，只保留“重新更新 AI整理”；当前稿保持不变。 |
| `uir-03-current-release-candidate-1440x900-light.png` | `37f7915f6dbd37ee6c1823b79dea41f943ac3a469dc4accd3690d9a2ca5338a8` | PASS — built release 与 source Candidate 信息架构一致，没有 dev-only presentation 依赖。 |

## 最终视觉结论

- Candidate 是 Topic Organized 下的核对工作区，不再表现成窄小的临时卡片；当前稿和候选之间的语义边界清楚。
- Candidate 尚未保存时，已保存的当前稿继续在下方 Organized 正文中可读；staged choice 没有伪装成持久化成功。
- stale 状态没有允许旧候选继续保存，也没有丢掉用户刚才做过的选择意图。
- 1440 / 900 / 390、light / dark 与 built release 均没有发现需要继续修改 Candidate runtime 的视觉缺陷。

因此 **UIR-03 Execution 03 — Candidate comparison 子集闭环**。UIR-03 整轮仍为 **IN_PROGRESS**；下一 execution 只处理 Preview mask，然后才进入 UIR-03 最终 acceptance / report / final visual review。