# UIR-04 Execution 01 — Context / MaterialTray visual review

Date: 2026-09-16

## Scope

本 checkpoint 只处理 UIR-04 Execution 01：Context / MaterialTray presentation。UIR-04 仍为 IN_PROGRESS；Settings、Backup / 数据与设备、Popup / 本机工具和 round-final certification 留给后续 execution。

Runtime/test HEAD: `5495f5f2ed7d46344b549101f81eef76f75aebc0` (`test(ui): cover UIR-04 Context material workspace`).

产品语义 owner 未迁移：`MemoryPanel.activate(true)` 继续委托现有 `MaterialTray`；`#material-workbench` 仍是唯一 Context root，drawer 只移动该 root；selection refs/revisions、`sourceEpoch`、draft/IME、order/remove/redact、stale/blocked/expiry、copy/export 仍由既有 MaterialTray + `PAIA_CONTEXT_MANUAL` 负责。

## Presentation changes reviewed

- Context 页面不再把整个工作台锁在旧 680px 宽度；主框架使用可用 workspace。
- >=1100px 的 page/tray 态把“已选材料”和“本次说明 / 补充 / 预览”分成主列与轻量辅助列；drawer 和 <=1024px 回到单列。
- 输出预览与编辑正文继续服从 `--paia-prose-width`，本次 wide preference 实测约 720px。
- desktop MaterialTray drawer 保持约 400px；<=600px 继续 full-width + app-shell inert，不创建第二个 Context owner。
- Material row 明确显示来源角色，保持 remove / source / order controls；没有新增 card-heavy shell。
- Search 原有 search-task、filter、input、pagination、hidden 和 reduced-motion selectors 全部保留；Context CSS 是增量，不再覆盖 Search presentation owner。

## Screenshots opened and reviewed

本机隔离 Chrome harness 生成并逐张打开：

1. `work/ux-r4/uir-04-context-empty-1440x900-light.png`
   - 单一“用于 AI”页标题；“本次材料”主区与右侧说明/补充/预览形成清楚主次。
   - 空态没有大卡片或窄 680px 外框；工作台利用主区宽度。
2. `work/ux-r4/uir-04-context-drawer-1440x900-light.png`
   - Search 保持原有全宽任务态；同一个 MaterialTray root 移入约 400px drawer。
   - 2 项材料、来源角色与操作层级可读；桌面 drawer 不把 app shell 设为 inert。
3. `work/ux-r4/uir-04-context-preview-1440x900-light.png`
   - 输出正文约 720px，主框架明显更宽；复制/Markdown 动作位于正文尾部。
   - 首次人工审查发现 drawer 关闭后残留“关闭材料盘”；已用 `.material-drawer-close` 精确清理并新增回归断言，复查后消失。
4. `work/ux-r4/uir-04-context-preview-1440x900-dark.png`
   - IME 草稿确认后的输出在 dark theme 下层级、对比与阅读宽度正常。
5. `work/ux-r4/uir-04-context-drawer-390x844-dark.png`
   - drawer 占满 390px viewport；材料操作与 textarea 无根级横向溢出；modal/inert 边界保持。
6. `work/ux-r4/uir-04-current-release-context-preview-1440x900-light.png`
   - built current release 与 source 的输出预览宽度、标题、动作和无残留 drawer-close 状态一致。

未发现尚未解决的 Context presentation blocker。

## Local validation

- `uir-04-context-chrome-e2e.test.mjs`: **1 / 1 PASS**；source + built current release。
- `ux-r4-search-reuse-chrome-e2e.test.mjs`: **5 / 5 PASS**；Search fixed refs、exact preview/redaction/rebuild/export、stale/purge、responsive/IME/worker expiry、F-LARGE、Grant/manual identity fences 保持。
- `ux-r1-shell.test.mjs` + `ux-r3-thought-binding.test.mjs`: **22 / 22 PASS**。
- `privacy/security`: **52 / 52 PASS**。
- Round 4.8 current release + UX-R6 browser: **3 / 3 PASS**。
- package guard: **8446 PASS**；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- current release build: **8018 package guardrails / 214 files / RELEASE_PRODUCT_GUARD_PASS**。
- `git diff --check`: PASS。

所有 MaterialTray browser journeys 使用合成 profile / data；手动 Context journey断言 Provider request、extension external request、unexpected external request 均为 0。

## Remote validation

PR #31 保持 open + Draft；runtime/test HEAD `5495f5f2ed7d46344b549101f81eef76f75aebc0`。Full Certification `#331` / run `35089213190` 按 development-mode 设计 **SKIPPED**。Draft Development Gate run `35089213201`：**SUCCESS**；4 个 unit shards、Contracts/privacy、Browser + Release 与最终 `UI Refresh Development Gate` aggregate job 全部 SUCCESS。成功 run 没有上传 artifact；本 checkpoint 的截图为本机隔离 Chrome harness 人工审查证据，不伪称 GitHub artifact。

## Boundary

本 checkpoint 不把 UIR-04 标为 COMPLETE，不切 PR Ready，不运行 round-final full certification，不 merge `main`，不部署，不发布。下一 execution 只能从远端真实 HEAD 与 STATUS 继续 UIR-04 Settings / low-frequency tools presentation，不重做 Context owner。
