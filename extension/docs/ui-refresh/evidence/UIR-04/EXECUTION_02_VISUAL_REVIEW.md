# UIR-04 Execution 02 — Settings shell / six-group owner audit

Date: 2026-09-17

## Scope

本 checkpoint 只收口 UIR-04 Execution 02：Settings shell、六组真实 owner 投影、desktop/mobile 导航与同控件保存/失败回滚。Context Execution 01 已闭环；Backup / 数据与设备细化、Popup / 本机工具和 round-final certification 留给后续 execution。

Runtime/test HEAD: `a81fa050d0ed1b386075d53e1b329733a9d503fc` (`feat(ui): complete UIR-04 Settings shell execution`)；父提交精确为 `cc4d65f66a5f9c13e792f5e79c0b7256007d996b`。

Settings 继续由 `core-loop.setupSettingsShell` 做 presentation projection；现有 controller/handler 没有复制。`r6-settings.js` 继续拥有 preview mask、complete export、storage / last-backup 状态，Thought/Reader/Smart Filter/Backup owner 仍保持原业务语义。

## Owner projection reviewed

| 组 | 既有 selector / owner 投影 |
|---|---|
| 内容与收录 | `#enabled-state`、`#toggle-capture`、`#smart-filter-settings`、`#history-settings` |
| 阅读与外观 | `#ux-appearance`、`#ux-language`、`#ux-font-size`、`#ux-reading-width`、`#time-display`、`#time-emphasis`、`#reader-revisit-settings` |
| AI | `#deepseek-settings`、`.library-updates-bar`、`#library-updates-drawer` |
| 隐私与对外使用 | `#memory-settings`、`#r6-hide-content-previews` |
| 数据与设备 | `#backup-settings`（含 `#r6-complete-export`）、`#manage-excluded`、`#legacy-entry`、现有 Source Records 入口 |
| 高级 | `#library-management`、`#product-diagnostics`、`#diagnostics`、`#prune-revisions`、`#thought-reverse-edit` 与未单列的低频遗留节点 |

每个 selector 在 focused Chrome journey 中断言 `count === 1`，并验证其最近 `.ux-settings-group` 的 `data-group`；移动端分组往返后 `#memory-settings` 仍是同一个 DOM 对象。release journey 同样验证 `#r6-hide-content-previews`、`#r6-complete-export` 唯一 owner，并确认 release-only `#filter-advanced` 裁剪继续生效。

## Presentation changes reviewed

- Settings 自身唯一可见 `h1`；返回、标题、局部 status 组成单一页头。
- Desktop frame 固定为 `180px` 分组导航 + `minmax(0,840px)` 正文，gap `32px`；不是第二个 app sidebar。
- `<800px` 隐藏六个 desktop tab，只显示同一组六选一 `<select id="ux-settings-group-switch">`；切组不 clone 控件，并保留导航焦点。
- 语言切换同步 desktop tab、section heading、mobile option 与 mobile label；中文/英文不会生成第二套表单。
- 保存失败继续由原 preference handler 回滚同一个 control；focused test 人工制造 `readingWidth` 写入失败并确认恢复旧值与 error feedback。
- 打开 Settings 不改变 capture 状态；暂停后 reload / reopen 仍保持暂停。
- release transform 仍在 built current release 上裁剪既定 diagnostics/internal owner，没有为新 shell 放宽 release 边界。

## Screenshots opened and reviewed

本机隔离 Chrome harness 生成并逐张打开：

1. `work/ux-r6/uir-04-settings-content-1440x900-light.png`
   - 单一“设置”标题；六组导航左侧纵向排列，正文为内容与收录。
   - 180 / 840 / 32 几何关系清楚；没有第二套 sidebar 或重复表单。
2. `work/ux-r6/uir-04-settings-privacy-390x844-dark.png`
   - 390px dark 下只保留“当前分组”select；六个 desktop tab 不显示。
   - 隐私 owner 为同一 `#memory-settings` / `#r6-hide-content-previews`；无根级横向溢出。
3. `work/ux-r6/uir-04-current-release-settings-data-390x844-light.png`
   - built current release 保留同一 mobile switch、数据与设备 owner、Backup / complete export / Source Records 与设备同步事实。
   - fixed bottom navigation 在 full-page screenshot 中出现于捕获视口位置；实际页面保留底部滚动留白，focused journey 未发现不可达控件或根级横向溢出。

未发现尚未解决的 Settings shell presentation blocker。

## Validation

- `uir-04-settings-chrome-e2e.test.mjs`: **1 / 1 PASS**；source + built current release。
- UX-R3: **17 / 17 PASS**。
- UX-R4 + Round 4.8: **7 / 7 PASS**。
- privacy/security: **52 / 52 PASS**。
- package guard: **8446 PASS**；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- current release build: **8018 package guardrails / 214 files / RELEASE_PRODUCT_GUARD_PASS**。
- `core-loop.js` 仅标准化文件末尾换行后重跑 Settings / package / release 均 PASS。

### Remote development gate

PR #31 在该 runtime/test HEAD 上保持 **open + Draft + unmerged**。`PAIA UI Refresh Development Gate` run `35153174080`：**SUCCESS**；run head 精确为 `a81fa050d0ed1b386075d53e1b329733a9d503fc`。4 unit shards、Contracts/privacy、Browser + Release 与 aggregate development gate 均未出现 failure。`PAIA Certification #332` / run `35153174083` 因 Draft **SKIPPED as designed**。

## Boundary / next subset

UIR-04 仍为 **IN_PROGRESS**。本 checkpoint 不切 PR Ready、不运行 round-final full certification、不 merge `main`、不部署、不发布。

下一自洽 subset 选择 **Execution 03 — Data & devices / Backup + restore + complete/open export presentation**：只统一现有 Backup/恢复/完整导出/scoped Source/真实存储与 last-backup 状态的层级和说明，保留现有 Backup format、restore/tombstone、OpenExportWriter、download 与 release transform 语义；Popup/本机工具继续留在后续 execution。
