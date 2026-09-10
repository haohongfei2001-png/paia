# 自动验证计划

先构建失败测试，再实现独立脚本。纯合成 VM 验证原Promise/Response/this/参数、一次调用、未读取请求体头、异步clone不阻塞、响应上限/HTTP/路由/时间/重复ID/缓存merge与冲突/TTL/容量/停止。

真正MV3浏览器使用已打包MAIN document_start + isolated document_idle，从页面fetch开始。以阻塞页面解析的合成脚本控制isolated启动：先等待MAIN已发出早到response通知，再放行解析，确保只有主动drain能恢复。另测isolated先到、prefetch另一聊天后SPA且无第二次fetch、hard refresh、重复加载、20条旧消息、assistant混合、非法ID/缺时间、页面立即消费原Response；检查安全面板、无重复、停止清空及无请求注入。阴性对照禁用drain时早到数据不得凭空出现。

测试与ZIP证据写 RESULTS.md；真实ChatGPT未自动验证，不以合成通过冒称真实成功。正式v0.3.0运行文件逐字节保持基线44ba90e。
