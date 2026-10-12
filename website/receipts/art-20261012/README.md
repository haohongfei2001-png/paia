# PAIA 现网基础视觉候选 · 2026-10-12

**Draft，仅供视觉审阅。不合并、不发布。PR #240 已被负责人否决，本候选不继承其代码、样式或布局补丁。**

## 直接看结果

下载本目录的 `PAIA-Website-Review-20261012.zip`，解压后打开 `review.html`。中文和英文可操作预览分别为 `home-zh.html`、`home-en.html`。预览不包含字体文件；离线使用系统字体。全部截图由真实浏览器运行页面得到，使用现网原有字体；全页图采用无损 WebP，解码像素已与原 PNG 核对一致。

[中文桌面全页](images/after-zh-1440-full.webp) · [中文手机全页](images/after-zh-390-full.webp) · [中文平板全页](images/after-zh-768-full.webp) · [英文桌面全页](images/after-en-1440-full.webp)

[档案](images/after-zh-archive.png) · [思想库](images/after-zh-thought.png) · [打开主题](images/after-zh-reading.png) · [悬浮球](images/after-zh-orb.png) · [悬浮胶囊](images/after-zh-capsule.png) · [悬浮板](images/after-zh-prompt.png) · [AI Context](images/after-zh-context.png)

## 设计与保留

首屏主体、标题、正文、示例内容及原有品牌资产保留。独立 1–4 导航删除；档案改为原话编辑与来源核对的阅读局部，完整位置导航收进可打开的原生披露控件。思想库形成主题目录／连续阅读在左、说明在右的展开页。悬浮区以三种实际轮廓配合同一聊天环境，球和胶囊是替代的收起形态，不是自动执行的步骤。Context 的四张独立卡片围绕正文组合，权限范围保留为下方独立、可操作的说明区。窄屏自然顺排，不缩小正文冒充适配。

候选只改变官网及对应测试。扩展、Canonical、Sync、开发计划、工作流、真实权限与外部服务不在本轮修改范围。完整 Demo、申请／政策等其余 47 个生成文件与基线逐字节一致。

## 基线与历史

开始时最新 main 为 `8e56ab340f2065b95a909a97b75b6b8eb1ce8bdb`。现网中英文首页及五个正在使用的样式／脚本，共七项实际读回与该主线文件逐字节一致。提交前重新获取 main，仍为同一提交。

历史 `77f4af96` 和第一版蓝白 `282bfe5e` 已在浏览器运行。第一版蓝白是居中标题在上、产品窗口下移，不是整页没有界面图。本轮从其空间感与浅色层次取参考，没有恢复旧文案、旧产品结构或回滚首屏。两版历史首屏都放在审阅页中。

## 实际验证

完整网站回归 **6,437 项通过、0 失败**；首页专项 **435 项通过、0 失败**；离线可操作预览 **74 项通过、0 失败**。包括全部生成页面、文案与首屏源码冻结、三态、窄板尺寸和输入框避让、完整文字核对、草稿／光标保留、过期核对拒绝、输入法组合保护、200% 文字、移动布局、原有交互、键盘、减少动态和无 JavaScript。没有真实表单提交。

文案与非首页文件冻结检查已接入原有 `website/test.py`；没有修改 CI 工作流或降低原有业务断言。截断文字新增显式核对后，原有插入测试走过核对再检查完整的草稿／光标结果。

```sh
python website/build.py --check
python website/test.py
python website/art_direction_checks.py
```

依赖沿用仓库 `website/requirements.txt`。`CHROMIUM_EXECUTABLE` 可指定测试浏览器。本轮浏览器测试不等于物理设备或屏幕阅读器认证；WebKit 尝试未获得可用会话，因此没有计入通过结果。预览均为页面内虚构资料，不证明真实扩展或服务能力。

[汇总与源码哈希](verification.json) · [完整回归](regression.json) · [首页专项](art-direction-tests.json) · [预览验证](preview-verification.json) · [截图记录](screenshots.json) · [现网读回](live-main-comparison.json)
