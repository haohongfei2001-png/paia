# UIR-03 Execution 04 — Preview mask visual review

Date: 2026-09-16

## Scope

本 checkpoint 只验证 UIR-03 Execution 04 — Preview mask。没有进入 UIR-04，没有修改 core / Provider / AI runner / durable schema / authorization / background / adapter / content / manifest，也没有 merge `main` 或部署。

Runtime/test HEAD: `02cad33c0af62c8f6586bf97b34e4265d16fe3ec` (`fix(ui): sync UIR-03 preview mask`).

Preview mask 继续由 `html.paia-hide-content-previews` 控制。本次只补 presentation selector：

- Thought home 的 Topic card `.summary` 继续被遮；该 slot 承载现有 summary/sourceHint。
- Topic action 中“加入主题”的 selection preview 与 `<details>` 中引用/相关材料 preview 被精确遮挡。
- 没有对 `.topic-selection-preview` 做全局隐藏，因此明确打开的 compare/full-body 边界不会被同一 class 误伤。
- Topic Original、Organized `currentView` 与 evidence `.entry-prose` 不进入 preview mask。
- 测试同时检查被遮正文没有复制进 `title` / `aria-label` 形成旁路泄漏。

## Validation

PR #31 validation-only Certification `#325` / run `35052309393`：**SUCCESS**。Actions 对 PR merge test ref `48cfef28d11c1ac9f22b6b05b2bde1dfd2e0c27a` 运行；开发分支 runtime/test HEAD 仍为 `02cad33c0af62c8f6586bf97b34e4265d16fe3ec`，这不是把开发分支 merge 到 `main`。

- Full Suite：**1094 / 1094 PASS**；unit `909` / browser E2E `38` / adapter contract `95` / privacy-security `52`。
- Current Browser step 8：**32 / 32 PASS**。
- Complete current browser suite：**38 / 38 PASS**。
- `uir-03-preview-mask-chrome-e2e.test.mjs` 在 Full Suite 与 Current Browser 中都明确 PASS。
- Package/development guards：`PASS: 8446 package guardrails across 197 runtime resources`；`DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`。
- 4 个 unit shards、Adapter/privacy、Current release build/guards、macOS Secure Store CI path、最终 Certification gate：全部 SUCCESS。
- Full-suite receipt artifact：`10429593797`，digest `57b402d30058ea0a91e4b496649bd1ecb88331a891187a691bf3b69698775744`。
- UX-R3 visual/browser artifact：`10429574442`，digest `8717d2d7a49948b2ddef480468f160580b6eda26e1e386f0545636248752cc9d`。

Browser acceptance 还直接验证：mask off 时真实 Topic summary 可见；mask on 后 home card summary 隐藏；加入主题 selection preview 与 details quote preview 隐藏；显式 compare/full-body 不隐藏；随后打开真实 Topic 时 Original 正文仍可读；显式确认一次 AI 整理后 Organized `currentView` 与 evidence 原文仍可读；除该次显式生成外没有隐藏 Provider 请求或意外外网。

## Screenshots opened and reviewed

从 UX-R3 artifact `10429574442` 解包并逐张人工打开以下本次新图：

1. `uir-03-preview-mask-home-1440x900-light.png`
   - source Thought 首页。
   - Topic name/date 保留，私人 summary/sourceHint 不显示；卡片明确显示“内容预览已隐藏”。
   - 搜索、AI toggle、导航和卡片布局正常；未见根级横向溢出或残留正文。

2. `uir-03-current-release-preview-mask-home-1440x900-light.png`
   - built current release Thought 首页。
   - 与 source 同一遮挡语义：identity/date 可见、正文 preview 不可见、遮挡提示存在。
   - 未见 source/release 视觉漂移。

3. `uir-03-preview-mask-organized-1440x900-light.png`
   - source，preview mask 仍开启且用户已明确打开 Organized。
   - `blockSummary` / `currentView` 直接可读；“思考线索”下 evidence Original A/B 原文直接可读。
   - 没有把已打开正文模糊、折叠或误替换成“内容预览已隐藏”。

4. `uir-03-current-release-preview-mask-organized-1440x900-light.png`
   - built current release，同一明确打开 Organized/evidence 边界。
   - `currentView`、evolution line 与 evidence 原文均直接可读；层级、宽度与 source 一致。
   - 未见裁切、亮白异常块或明显布局回归。

## Review conclusion

Execution 04 的 Preview mask 子集闭环：预览遮挡只作用于卡片/材料 preview，不扩散到用户已经明确打开的 Original / Organized / evidence/full-body；source 与 built release 一致，且没有 title/ARIA 正文旁路。

这不是 UIR-03 整轮 COMPLETE。UIR-03 仍保持 **IN_PROGRESS**，下一 execution 只允许做整轮最终封口与最终代表证据/报告；UIR-04 继续 **NOT_STARTED**。

## Evidence limits

- Browser 证据来自 GitHub Actions 隔离 Linux/Xvfb + Google Chrome 与合成 profile，不是用户日常 macOS Chrome profile。
- 当前没有在线 Remote Desktop，因此没有伪称本机 browser smoke。
- 本 checkpoint 不验证或修改 UIR-04 Context/Settings presentation owner。
