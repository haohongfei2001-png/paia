# PAIA 设计修订02 · 连续页面

本修订替代#287第一版的固定舞台方向；不是正式官网，未合并或发布。

解压 `PAIA-Open-Canvas-Revision02.zip` 后打开 `review.html`，或直接打开 `prototype.html`。英文为 `prototype-en.html`。原型01仍保留在父目录供比较。

本轮改变的是页面的空间组织，而不只是把动画加速。取消1200×740统一缩放画布和反复停顿，滚动帧不再写宽高、字号或内距。保留原首屏、结尾、真实表达、同框整理、固定锚点与Context目录隐私。总览改为可阅读的关系构图，不是微型截图拼贴。

[设计说明](DESIGN.md) · [验证与性能诊断](verification.json) · [最终总览](screenshots/zh-overview.webp)

性能采样是同一Chromium中的180个rAF区间诊断；不同内容路径，不能据此声称所有设备无卡顿或帧率提升。正式官网和扩展代码完全未变。字体文件没有打包。
