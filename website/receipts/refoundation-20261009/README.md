# PAIA Website Refoundation — 视觉对照证据

这份目录保存已生成的页面截图与来源记录。它用于审阅版式、产品形态、移动端呈现和具体交互状态，不代替最终测试或上线验收。

## 来源与比较方法

- **BEFORE**：从生产基线提交 **ca11a1e4cd794e95f2ad515f5d197da9bef4d833** 的网站代码，通过本地 HTTP 运行并截图；来源目录为 website-qa/baseline。这些对照图**并非全部直接从线上域名截图**。
- **AFTER**：本轮网站代码候选的浏览器截图，来自 website-qa/final-visual 与 website-qa/final-full-v3。候选提交与最终交付结果由主 receipt 记录，本目录不擅自指定最终候选 SHA。
- 两组都使用 **Chromium 153.0.8010.0 / local HTTP**。桌面宽度为 **1440 px**，手机宽度为 **390 px**。首页首屏对照的原图尺寸一致：桌面 **1440 × 1000**，手机 **390 × 844**。
- 全页图按同一宽度等比缩放；不拉伸高度，也不截断较长页面。较短页面下方明确标出“全页结束”，其后的灰底属于比较画布，不是网站的留白。
- 桌面首屏每列显示 **900 px**，桌面全页每列显示 **720 px**；手机列保留原生 **390 px**。三张产品状态截图保留原生像素尺寸。
- final-full-v3 全页截图与基线截图的初始视口高度可能不同；全页证据完整保留实际页面高度，没有为了对齐而拉伸。首页首屏与 How 对照使用相同 capture.cjs 截图流程。
- 稳定静帧采用系统减少动效偏好和禁用截图瞬间动画。截图可用于视觉对照，**不能证明动态体验或性能**。
- 所有处理均为确定性的像素拼接、必要的等比缩放与 WebP 编码。没有使用生成式图像重画、修改网页内容、调色或移除控件。

## 六组主要对照

1. 中文首页，桌面首屏。
2. 中文 How it works，桌面完整页面。
3. 中文使用场景，桌面完整页面。
4. 中文 About，桌面完整页面。
5. 中文 Blog，桌面完整页面。
6. 中文 Beta 申请，手机完整页面。

另保存中文手机首页全页与首屏前后对照，以及当前 AI Context 四卡、Thought Library 连续章节阅读、Prompt Reuse 完整表达面板的精选状态。

## 真实线上辅助截图

[12-live-home-before-original.jpg](12-live-home-before-original.jpg) 原字节保存了本任务取得的真实线上首页 BEFORE 截图，来自 /workspace/scratch/paia-live-before.jpg。它没有作为上述同尺寸对照图的替代基线。

这个 JPEG 不携带可验证的浏览器版本、精确截图时间或部署提交号，因此本目录不补写这些事实。图片字节与来源 SHA-256 一致，详见 manifest。

## 文件

| 文件 | 输出像素尺寸 | 体积 |
| --- | --- | --- |
| [01-home-desktop-before-after.webp](01-home-desktop-before-after.webp) | 1864 × 820 | 91.1 KB |
| [02-how-desktop-full-before-after.webp](02-how-desktop-full-before-after.webp) | 1504 × 2554 | 187.3 KB |
| [03-use-cases-desktop-full-before-after.webp](03-use-cases-desktop-full-before-after.webp) | 1504 × 1890 | 134.0 KB |
| [04-about-desktop-full-before-after.webp](04-about-desktop-full-before-after.webp) | 1504 × 1659 | 126.1 KB |
| [05-blog-desktop-full-before-after.webp](05-blog-desktop-full-before-after.webp) | 1504 × 1247 | 85.8 KB |
| [06-beta-mobile-full-before-after.webp](06-beta-mobile-full-before-after.webp) | 844 × 2551 | 205.2 KB |
| [07-home-mobile-full-before-after.webp](07-home-mobile-full-before-after.webp) | 844 × 9706 | 694.1 KB |
| [08-home-mobile-top-before-after.webp](08-home-mobile-top-before-after.webp) | 844 × 1039 | 82.2 KB |
| [09-context-four-cards.webp](09-context-four-cards.webp) | 1168 × 811 | 55.6 KB |
| [10-thought-continuous-reader.webp](10-thought-continuous-reader.webp) | 1024 × 1303 | 55.2 KB |
| [11-prompt-panel.webp](11-prompt-panel.webp) | 580 × 799 | 30.6 KB |
| [12-live-home-before-original.jpg](12-live-home-before-original.jpg) | 1348 × 926 | 69.5 KB |

合计图片体积：**1.77 MiB**。图片使用高质量 WebP（quality 94 / method 6）；独立线上辅助 JPEG 不重新编码。

每个源文件的原始路径、原始 SHA-256、宽高、基线提交、截图 transport、比较图内坐标与缩放比例，均记录在 [manifest.json](manifest.json)。

## 验证边界

本目录只记录实际存在的截图与渲染对照，不宣告测试最终通过，不宣告已合并、已部署或线上候选已核验。最终测试、GitHub 交付和部署读回由主 receipt 补充。

## 工程验证记录

[verification.json](verification.json) 是最终本地结果与运行时内容哈希摘要。
完整本地浏览器记录、全站可访问性记录和 How 后续复核分别以 gzip JSON 保存。
CI、合并和线上结果以交付 PR 及其 Actions 记录为准，不由静态截图推断。
