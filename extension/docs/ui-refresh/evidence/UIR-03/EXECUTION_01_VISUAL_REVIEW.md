# UIR-03 Execution 01 Visual Review — Thought Home + Topic Original

状态：**UIR-03 IN_PROGRESS / 本 execution 子集已完成**  
Runtime / test HEAD：`bc4fe4a1c390850809c45d947a44d651f88d678f`  
PAIA Certification：`#314` / run `35028697337` — **SUCCESS**  
最终 UX-R3 artifact：`10421049779` (`ux-r3-evidence-fb862848285c2cd77b45b72d22f63bcb463a2cf0`)  
Artifact SHA-256：`2731a8f47981e924c092c72e359bdf9d02710984e84c7f11059f63078545fb39`

本文件只记录 UIR-03 第一个 execution 的视觉闭环，不是整个 UIR-03 的最终 `VISUAL_REVIEW.md`。Organized / AI Presentation、运行状态、candidate comparison 与 Topic/material preview mask 仍属于后续 execution。

| PNG | SHA-256 | 场景 | 实际检查 |
|---|---|---|---|
| `uir-03-thought-home-1440x900-light.png` | `a5898cf3c83cc91f1f0377215ee180cae6f8ce00e24a955dece432893387247a` | Thought 首页 1440×900 light | 唯一 `思想库` 主标题；最近阅读是轻区；本地搜索/更多/接着写属于同一工具层；1440 下主题网格稳定为三列，长标题自然换行，卡片不再固定旧高度，没有悬浮位移或大阴影。 |
| `uir-03-thought-home-1440x900-dark.png` | `343412197663c76feef37fb4d145b44a70d9dfd44841146ae05b086bde3133f2` | Thought 首页 1440×900 dark | 与 light 保持相同信息层级；主题卡、canvas、边界使用 dark tokens，没有正文区域亮白泄漏，标题/摘要/元数据对比清楚。 |
| `uir-03-topic-original-1440x900-light.png` | `8008b4a6a35013489f487e92654d4bb8739a507bdbdff83dd7fde13d6dc38f9b` | Topic Original 1440×900 light | `#topic-heading h1` 是唯一主标题并可自然换行；Topic 外壳明显宽于正文列；搜索、排序、目录、AI 开关和更多仍在既有 owner；正文保持连续阅读，没有把每条 Thought 做成厚卡。 |
| `uir-03-topic-original-1440x900-dark.png` | `218f0762a71352541ac3cbd69e3d17891441f2aab8a06b04e55ead2f00a1afc8` | Topic Original 1440×900 dark | 宽外壳 / 窄正文关系保持；日期、binding、辅助动作没有抢正文层级；未观察到亮白 page/card 残留或横向溢出。 |
| `uir-03-topic-original-390x844-light.png` | `976aeb6f4ffe37b037d596f80c1f004891074ad9a767deb080ce98ad83861013` | Topic Original 390×844 | 长 Topic 标题自然多行；工具、AI 开关、排序与查找回到单列/换行；正文使用移动可用宽度，明确 Edit/Done 入口仍可达；未观察到根级横向溢出。 |
| `uir-03-current-release-thought-home-1440x900-light.png` | `3ab83f189529ddfe96d213c0503f8d5a9885dc050a36555f86a02aa2d1b21e03` | Built release Thought 首页 | `work/current-release` 与 source 的首页 hierarchy / grid / recent / local-search presentation 一致，没有开发专用表面泄漏。 |
| `uir-03-current-release-topic-original-1440x900-light.png` | `83c9954e6fbdb96eb97f0ec28a14fbd919d66db33d197d52d145847544e5bee5` | Built release Topic Original | release 中同样保持宽 Topic shell、saved reading-width 正文、唯一 Topic h1 与原有编辑 owner；没有出现 release transform 导致的窄壳回退。 |

## Browser / visual acceptance

- 新 `uir-03-thought-original-chrome-e2e.test.mjs` 在 source 与 built release 两条路径均 PASS；验证唯一 h1、首页 grid/card measure、Topic shell > prose width、正文 `<= 722px`、原 contenteditable owner、1024/390 root overflow 与零 Provider / extension-external / unexpected network。
- Current Browser Certification step 8：既有 UX-R1→R6 + current core journeys `32 / 32 PASS`。
- Complete current browser suite：`35 / 35 PASS`，新 UIR-03 test 明确 PASS；既有 UX-R3 binding/IME/mobile/F-LARGE 与 UX-R5 AI/candidate/recovery 也同时 PASS。
- Full Suite：`1091 / 1091 PASS`（unit 909 / browser E2E 35 / adapter 95 / privacy-security 52）。
- Current release build and guards、4 个 unit shards、Adapter and privacy contracts、macOS Secure Store CI path、最终 Certification Gate 均 SUCCESS。

## 本 execution 的视觉结论

本次只通过 CSS 与 acceptance 测试刷新首页和 Original presentation，没有重建 `paintHome()` / `renderDocument()` / `entryNode()` 的数据或编辑 owner。人工打开上述 7 张最终 PNG 后，没有发现需要修改本子集 runtime 的视觉缺陷；因此 **Thought home + Topic shell / Original presentation 子集闭环**。

UIR-03 整体仍为 **IN_PROGRESS**。下一 execution 应重新核对真实 HEAD 后进入一个新的自洽子集，优先处理 **Organized / AI Presentation + 真实运行状态映射**；不要在同一子集中同时扩到 candidate comparison，除非前者已经小范围闭环。
