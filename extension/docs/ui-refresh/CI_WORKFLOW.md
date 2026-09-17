# PAIA UI Refresh — CI Cadence

状态：2026-09-16 用户授权的 Chrome UI Refresh 执行节奏优化。它只改变 `chrome-ui-refresh-v1` 的开发/认证调度，不改变产品、权限、测试断言或最终完成标准。

## 1. 目标

UIR 的单次 execution 不再默认等待整套发布级认证。开发期使用快速 gate；只有正式 round 准备 COMPLETE 时运行完整 PAIA Certification。

这份文档只覆盖 UIR 执行节奏。旧 README / Implementation Plan / round 任务书中“不要新建 CI gate”或“每次 PR push 都跑完整 certification”的冲突文字，以本文件和 `UI_REFRESH_STATUS.md` 为准。所有产品、隐私、授权、删除、数据所有权和 final acceptance 条款继续原样有效。

## 2. PR #31 是唯一 UIR CI 入口

PR #31 仅用于 `chrome-ui-refresh-v1` 的验证，**永不 merge**。

- **Draft = development mode**。
- **Ready for review = final-certification mode**。
- Agent 负责切换 Draft / Ready；用户不需要操作 GitHub UI。
- 一个 round 完成最终认证后，Agent 必须先把 PR #31 切回 Draft，再做 docs-only closure 或进入下一次开发 execution。
- 若 final certification 失败，先切回 Draft，再修复并走快速 gate；不要让失败后的每个修复 commit 自动重复整套 full certification。

## 3. Development mode：自动快速 gate

PR #31 为 Draft 时，普通 runtime/test push 自动运行 `.github/workflows/paia-ui-refresh-development.yml`。

快速 gate 包含：

1. 4 个 unit shards；
2. Adapter contract + privacy/security；
3. `npm run build:release`；
4. 所有 `tests/uir-*-chrome-e2e.test.mjs` 的真实 Chrome journey；
5. package / development guards；
6. aggregate `UI Refresh Development Gate`。

它故意不重复 Full Suite、全部 UX-R1～R6/F-LARGE browser matrix、macOS Secure Store certification。这些仍属于 round final certification。

UIR browser 文件按 `uir-<round>-...-chrome-e2e.test.mjs` 命名后会自动进入：
- 快速 UIR browser gate；
- `browser E2E` current group；
- 最终 Full Suite / Current Browser。

不再需要每个 UIR 文件手工追加 `CURRENT_BROWSER` 白名单。

## 4. Final-certification mode：完整 gate 不降低

当当前 round 的 runtime/tests 已冻结、快速 gate 已通过、截图/功能已达到 final candidate 时：

1. Agent 确认 PR #31 当前 head 就是待认证 branch HEAD；
2. Agent 将 PR #31 从 Draft 切为 Ready for review；
3. `PAIA Certification` 通过 `ready_for_review` 事件自动运行；
4. 必须等待并核对所有 mandatory jobs：
   - Unit 1/4～4/4；
   - Adapter and privacy contracts；
   - Current Browser Certification；
   - Full Suite Certification；
   - macOS Secure Store Certification；
   - Current release build and guards；
   - Certification gate。
5. 失败则 round 不 COMPLETE；先切回 Draft，再修复。
6. 全部 SUCCESS 后记录 run ID / tested SHA / artifact，再将 PR #31 切回 Draft。
7. docs/evidence closure 可使用 `[skip ci]`，但必须明确它没有改变已认证 runtime/test tree。

`main` push 和其他非 `chrome-ui-refresh-v1` PR 仍保持原 PAIA Certification 行为；Draft gating 只作用于这一个 UIR 分支。

## 5. Current Browser 去重，不减少覆盖

旧 Current Browser job 先显式运行 11 个 core browser 文件（32 tests），随后 `npm run test:browser` 又把这些文件作为 `browser E2E` 再跑一次，因此同一个 job 重复执行核心 journey。

现在保留一次完整 `npm run test:browser`，删除前置重复 pass。`scripts/check-ui-refresh-ci.mjs` 在运行前强制证明：
- 旧 11 个 core browser 文件全部仍存在；
- 它们全部仍属于 current `browser E2E`；
- 所有 UIR browser 文件也属于 current `browser E2E`。

`npm run test:browser` 自身仍执行 package/development audits，因此不需要在同一 job 再重复一次相同 guards。最终测试集合、断言、阈值、F-LARGE、privacy/security 与 mandatory jobs 没有减少。

## 6. Agent 执行规则

开发 execution：
- 重新解析真实 branch HEAD；
- 确认 PR #31 是 Draft；若不是 Draft 且没有正在恢复的 final certification，先切回 Draft；
- 做一个自洽子集；
- push 普通代码/test commit；
- 只等待并检查 `PAIA UI Refresh Development Gate`；
- focused browser/视觉证据按当前 round 任务书补充；
- round 未封口时保持 STATUS `IN_PROGRESS`。

最终封口：
- freeze runtime/tests；
- 快速 gate 绿；
- PR #31 Ready → 完整 certification；
- SUCCESS → PR #31 Draft；
- 最终证据/report/STATUS；
- 不 merge main，不部署。

不要高频轮询 Actions。长 job 运行时先完成不依赖结果的报告框架、diff audit、视觉索引等工作；只在关键阶段查询状态。

## 7. 故障边界

- Fast gate 失败：只修真实失败，不改 final gate 来绕过。
- Full certification 失败：不得用 fast gate 替代；必须修复后重新 final certification。
- 不删除测试、不降 threshold、不把 current test 移入 historical、不增加单测/browser test timeout 掩盖竞态。
- CI job 的 wall-clock budget 可以只为允许原测试完整结束而调整，但必须记录原因，不得替代竞态修复。

## 8. 机制验收 — 2026-09-16

实施 commit：`f7a825182f47d8c7820f2647def96705d0e7404a` (`ci(ui): add fast UIR development gate`)。

### Draft / development mode

PR #31 保持 Draft 后，同一 HEAD 的实际结果：

- Full `PAIA Certification` `#329` / run `35080686792`：**SKIPPED as designed**；没有启动原 20–30 分钟完整链。
- `PAIA UI Refresh Development Gate` run `35080686871`：**SUCCESS**。
- 4 unit shards：SUCCESS。
- Adapter/privacy contracts：SUCCESS。
- UI Refresh Browser + Release：SUCCESS；包含 current release build、coverage contract、全部现有 UIR Chrome journeys 与 package/development guards。
- aggregate `UI Refresh Development Gate`：SUCCESS。

这证明普通 UIR execution 的 runtime/test push 可以只走快速开发验证。

### Ready / final-certification mode

随后 Agent 临时将 PR #31 切为 Ready，在**同一个 branch HEAD** 上实际触发完整认证：

- Full `PAIA Certification` `#330` / run `35081073772`：**SUCCESS**。
- tested branch HEAD：`f7a825182f47d8c7820f2647def96705d0e7404a`。
- PR merge test ref：`89e07df862937e41ec37c833c2633abd2977f542`，仅为 PR test ref，不代表 merge `main`。
- Full Suite：**1094 / 1094 PASS**；unit 909 / browser E2E 38 / adapter contract 95 / privacy-security 52。
- Current Browser：**38 / 38 PASS**。
- 4 unit shards、Adapter/privacy、Current release、macOS Secure Store、Certification gate：全部 SUCCESS。
- package guard：`8446` PASS；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- Full-suite receipt：`fullSuite=true auditPassed=true historicalBrowserFiles=76`。
- input digest：`99f792446a2b8a53ab1a17598c45d51f36a706a2a8c7e9604ccdc42536e26612`。
- full-suite artifact：`10440612642`；ZIP SHA-256 `ffa9a695c8d1332ffe5f8eee0186af04558f0406680f6064a9c40c37c1f6d991`。

认证成功后 Agent 已把 PR #31 恢复为 **Draft**。

### 去重效果

旧 #328 Current Browser 在同一 job 里先跑 32 个 core tests，再跑完整 38-test current suite，整体约 27 分钟。#330 删除第一遍重复执行后，Current Browser 约 15–16 分钟结束，同时仍是 **38 / 38 PASS**。

`check-ui-refresh-ci.mjs` 在运行前验证旧 11 个 core browser 文件全部仍在 current group，且所有 UIR browser tests 自动进入 current group；因此减少的是重复执行，不是测试覆盖。

## 9. 当前交接状态

- PR #31：open、unmerged、**Draft**。
- UIR-01/02/03：COMPLETE。
- UIR-04：NOT_STARTED。
- 下一 UIR execution 直接按 `UI_REFRESH_STATUS.md` 开始 UIR-04 entry audit；开发阶段保持 Draft fast mode。
- 用户无需手工管理 Draft/Ready、Actions 或 test registration；Agent 按本文件自行完成。
