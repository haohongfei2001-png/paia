# UIR-04 Execution 03 — Data & devices / Backup + restore + complete/open export visual review

Date: 2026-09-17

## Scope

本 checkpoint 只处理 UIR-04 Execution 03：Data & devices 中既有 Backup / restore、完整开放导出、真实本机数据状态与 scoped Source Records 的 presentation owner 和现场说明。Context Execution 01 与 Settings Execution 02 已闭环；Popup / 本机工具、跨页最终一致性和 round-final certification 留给后续 UIR-04 execution。

Runtime/test HEAD: `8dc2ea69628e77ae6f993e2cfd5167f8c5bbc844` (`feat(ui): clarify UIR-04 data ownership`)；父提交精确为 `06efeab327f5a5dab041cab9ce958675e07b6fc6`。

本次没有修改 Backup format、restore transaction、tombstone / purge 语义、`OpenExportWriter`、下载实现或授权边界。现有 `BackupPanel` / `BackupService` / open-export owner 继续负责真实行为；UI 只重排并解释同一个 owner。

## Owner / presentation changes reviewed

- `#backup-settings` 继续拥有创建 Backup、选择备份、校验预览、显式确认空库恢复和取消；新增“备份与恢复”局部标题，但没有复制按钮或 handler。
- `#r6-complete-export` 从 Backup 容器内部拆为 Data & devices 的同级 presentation owner；JSON / Markdown 仍调用原 `OpenExportWriter` 路径，明确完整导出与当前筛选 Source export 不同，且文件未做应用层加密。
- 新增 `#r6-data-status` 只投影浏览器 `navigator.storage.estimate()`、最近成功 Backup 和本机文件保管事实；未知容量仍保持“无法估计/未报告”，不虚构百分比。
- 现有 Source Records 导航按钮移动到同级 `#r6-source-records`，明确它进入来源记录及当前筛选范围导出，不冒充完整导出；永久删除确认和 tombstone 优先规则不变。
- “设备同步”能力事实仍由 Settings shell 投影为“当前版本未提供设备同步”，不创建未来按钮、设备列表或同步状态。
- Settings shell 明确将 `#backup-settings`、`#r6-complete-export`、`#r6-data-status`、`#r6-source-records`、`#manage-excluded`、`#legacy-entry` 投影到 Data & devices；所有动作仍只有一个 DOM owner。

## Screenshots opened and reviewed

本机隔离 Chrome harness 生成并逐张打开：

1. `work/ux-r6/uir-04-data-1440x900-light.png`
   - Desktop 下 Data & devices 清楚分成 Backup & restore、Complete export、Local data status、Source Records 与 Device sync 事实。
   - Backup 成功后 last-backup 时间来自真实本机状态；完整导出与 Backup 不再视觉嵌套。
2. `work/ux-r6/uir-04-data-390x844-light.png`
   - 390px 下使用同一 Settings group switch 和同一 Data owner；export / Source 动作可达且无根级横向溢出。
   - 固定底部主导航只覆盖 viewport 位置，页面仍可继续滚动到其后的 owner。
3. `work/ux-r6/uir-04-data-restore-preview.png`
   - 真实 Backup 文件经过本机校验后显示日期、PAIA / 格式、Input / Topic / Thought / revision 数量和完整性结果。
   - `确认恢复到空库` 与 `取消` 明确可见；测试实际点击确认后 restore 完成，不是只截图静态 preview。
4. `work/ux-r6/uir-04-current-release-data-390x844-light.png`
   - built current release 保留与 source 相同的四个 Data owner、窄屏布局和 Source scope 说明。
   - release-only diagnostics pruning 继续生效；没有为新 presentation 放宽 build transform。

未发现尚未解决的 Data & devices presentation blocker。

## Local validation

- `uir-04-data-chrome-e2e.test.mjs`: **1 / 1 PASS**；source + built current release + real Backup download / explicit restore round trip。
- `uir-04-settings-chrome-e2e.test.mjs` + UX-R6 release / open-export / compatibility focused set：**13 / 13 PASS**。
- `npm run test:ui-refresh`: **9 / 9 PASS**；UIR-01/02/03 与 UIR-04 Context / Settings / Data 全部 current UIR browser journeys 通过。
- privacy/security：**52 / 52 PASS**。
- package guard：**8446 PASS**；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- current release build：**8018 package guardrails / 214 files / RELEASE_PRODUCT_GUARD_PASS**；release product check **214 files PASS**。
- `git diff --check`: PASS。
- Data journey 中 Provider request、extension network request、unexpected external request 均为 0；harness errors 为空。

## Remote validation

PR #31 应继续保持 open + Draft + unmerged；runtime/test head 必须为 `8dc2ea69628e77ae6f993e2cfd5167f8c5bbc844`。`PAIA Certification #333` / run `35161966879` 已按 Draft development mode **SKIPPED as designed**。

`PAIA UI Refresh Development Gate` run `35161966867`：**SUCCESS**；4 个 unit shards、Contracts/privacy、UI Refresh Browser + Release 与 aggregate `UI Refresh Development Gate` 全部 SUCCESS。该 run 的 head 精确为上述 runtime/test HEAD。

## Boundary / next subset

UIR-04 仍为 **IN_PROGRESS**。本 checkpoint 不切 PR Ready、不运行 round-final full certification、不 merge `main`、不部署、不发布，也不进入 UIR-05。

Gate SUCCESS 后，下一 execution 只从远端真实 HEAD 继续 UIR-04 **Execution 04 — Popup / 本机工具 + cross-page final consistency**：保留 Popup 主回 PAIA、暂停/恢复、Passport / 本机工具动作与 release 裁剪差异，只做必要可读性/主题/窄屏和跨页最终一致性；随后另行决定是否已达到 round-final candidate。
