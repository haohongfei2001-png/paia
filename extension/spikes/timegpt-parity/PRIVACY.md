# 实验隐私边界

无 permissions、host_permissions、background、storage、外部通信或 Archive 接口，仅静态脚本匹配 https://chatgpt.com/*。安装并保留本实验是本轮最小 metadata 观察授权；不提取任何 DOM 正文，不监听键盘或草稿，不读请求体/请求头/凭证，不生成额外fetch。JSON副本临时解码不可避免包含响应字节，代码不访问message.content、不保留assistant ID/时间/正文；完成后仅conversation + user ID + create_time存在有限文档内存。面板只输出安全计数。

MAIN/isolated的postMessage是同页传输，不是保密或真实性认证边界；页面本来拥有这些metadata，也可伪造事件。接收侧严格校验字段与路由。仅供实验，不产生可信正式Archive写入。停止/离开/硬刷新清空；prefetch例外只允许本用户明确授权的该短期实验，不能用于放宽正式Archive的同意门禁。
