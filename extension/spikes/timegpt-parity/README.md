# TimeGPT parity spike 0.1.0

独立实验扩展，与 PAIA v0.3.0 没有导入、存储、后台消息或数据连接。只旁路观察 ChatGPT 自己已发起的严格 conversation detail fetch；不发请求，不读正文，不写 Archive。安装本实验并 hard-refresh 后立即开始观察最小 user ID/create_time 元数据，页面按钮可停止并清空，本次停止后仅刷新可重新开始。

真实 QA 登录 harness 已按用户最新指令停用，运行入口只输出 QA_WORKFLOW_RETIRED。保留实现作为历史记录，不再启动真实 QA Chrome 或访问其 profile。当前兼容策略见 [开发采样说明](../../development/compat/README.md)。

计数为 0 不是历史没有时间的证明。面板同时显示 observed detail responses、accepted responses、rejected responses、MAIN hook 和 drain 状态，以区分未观察与已拒绝。observed/accepted/rejected 为本次文档内全局响应计数；候选数为当前 conversation 的有效缓存数，matched 为当前可见、唯一 user DOM exact ID 命中数；不会把其他聊天 prefetch 计为当前聊天成功。

测试：`node --test spikes/timegpt-parity/tests/*.test.mjs`。打包：`python3 spikes/timegpt-parity/package.py`。测试使用已有 Node/Playwright/临时 Chrome，仅人工合成数据，本地拦截所有网站请求。正式发布门槛：真实 parity 成功后另行决定是否接回 provider；本包绝不接回 SourceTimeResolver。
