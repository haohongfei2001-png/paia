# PAIA 官网完整设计 — Continuous Editorial v1

**状态：DESIGN_ONLY / OWNER_VISUAL_REVIEW_PENDING。仅交付设计，不授权实现或部署。**

2026-09-26，产品 owner 要求将其提供的 PAIA 首屏扩展为完整、高还原的官网设计，保留摄影、非对称编排、纸面叠层、细曲线、衬线字体对比和刻意留白，不能再次在实现阶段抹平成通用 SaaS 页面。

## 直接看图

- [完整设计包与全部页面目录](design/website-editorial-v1/README.md)
- [英文完整首页 · 桌面](design/website-editorial-v1/previews/home-en-1440.png)
- [中文完整首页 · 桌面](design/website-editorial-v1/previews/home-zh-1440.png)
- [英文移动首页](design/website-editorial-v1/previews/home-en-390.png) / [中文移动首页](design/website-editorial-v1/previews/home-zh-390.png)
- [全站缩略图总览](design/website-editorial-v1/previews/CONTACT-SHEETS.md)
- [原始首屏参考图的存档衍生版](design/website-editorial-v1/assets/owner-reference.webp)

## 后续实施的设计事实源

[ART_DIRECTION](design/website-editorial-v1/ART_DIRECTION.md) 与 [FIDELITY_CONTRACT](design/website-editorial-v1/FIDELITY_CONTRACT.md) 是本次新设计方向及还原验收依据。现有官网 README 中把照片替换为 typographic planes 的历史实现决定，不是后续还原本设计的依据。产品能力、隐私、权限与发布状态仍以当前 canonical product docs 为准；事实变更只允许调整相应声明，不允许顺便删除视觉结构。

开始任何后续实现前，先读 [中文实施交接](design/website-editorial-v1/IMPLEMENTATION_HANDOFF.md)。当前提交本身不启动实施。

交付：21 个页面类型，各有 EN/ZH、1440/390 完整稿；另有 4 张交互状态板和 2 张社交分享稿，共 **90 张 SVG + 90 张 PNG**。每个完整稿有逐元素 geometry JSON；同时包含三篇双语文章正文、全站文案、路由、交互、响应式、固定照片、裁切/调色记录、字体版本和文件校验。SVG 是可编辑设计源，不是可直接发布的网页；PNG 是不依赖本机字体的视觉目标。

## 实际验证与限制

- 产品基线：`29222dcab9328eb567db813d77e9cddd486fecb4`；集成前重新核验 main 未变化。
- 制图执行：[GitHub Actions 36252011321](https://github.com/haohongfei2001-png/paia/actions/runs/36252011321)，制图源码提交 `24066ca67b5dd85f4e2b93ef0ce7d6153265fb67`，输出提交 `aaff4ec096c123a77e6b148b1a666945bfcbef33`。
- 已从远端下载生成的 artifact 回读：90 个 SVG、90 个 PNG；`render-audit.json` 报告文字越出画布 **0**；`SHA256SUMS` 的 **308** 个文件校验全部匹配。
- 已查看远端产物的英文桌面全站总览、英文/中文首页及移动端关键区域，区分结构检查、文字检查与真实产品验证。画布越界检查不等于所有元素重叠、可访问性或跨浏览器验证。
- 原图精确字体和原始照片来源未能确认；交付中已固定明确字体与有来源的替代照片，保留原图中的构图角色。不能把替代素材描述为原图原件。
- 字体二进制不在交付中；提供获取来源、版本、文件 SHA256 和已渲染 PNG。私有 Drive 原文、用户档案和真实 AI 会话未公开。
- 新增页面是完整设计提案，尚待 owner 视觉审阅；不把首屏方向获准偷换成全站所有新设计已获批准。
- 未来还原必须对实际网站截图逐区比对；不能承诺一个未执行的实现会自动合格。删除照片、统一卡片网格、替换展示字体、破坏错位和留白均为硬失败。

临时制图工作流与传输分片已从最终变更中移除。最终 PR 仅新增本文件与 `design/website-editorial-v1/**`，不改现有官网 HTML/CSS/JS、部署工作流、扩展实现或扩展开发状态。
