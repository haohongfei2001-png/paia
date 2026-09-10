# 实验契约

MAIN document_start 静态注入，无异步后台门禁。原 fetch 只调一次，this/参数/原 Promise/Response 保持，先同步 clone 后异步有限读取，不等待副本。不监听发送/SSE、sidebar列表、other JSON。严格同源 `/backend-api/conversation/{UUID}`（无query/hash/重定向），HTTP 2xx、application/json；conversation以endpoint UUID为来源身份，JSON的id/conversation_id如存在必须相同。只识别mapping，先检查role，仅user提取id/create_time，不提取assistant字段值或任意content字段。无create_time跳过该user；非法user ID、重复user ID、身份冲突整包拒绝。

副本最多2MiB，读取最多5秒，最多2并发。mapping最多4000项，user最多2000；JSON结构深度最多20、节点最多30000。create_time为2000年以来、不晚于当前的有限秒数。未知结构不猜测。

MAIN Map<conversation, Map<exact ID, create_time|null>>：最多8聊天/每聊天2000消息，10分钟TTL、60秒清理；不同批merge，同ID冲突变null不再复活。缓存覆盖非当前路由prefetch，SPA只清当前显示，不清跨聊天短期buffer。isolated document_idle安装监听后立即发drain，1秒/3秒重试；每次路由变化再次drain。drain是可重复快照，不是破坏性取出。

isolated仅保留当前conversation快照与临时exact匹配结果。先确认普通/c/UUID路由且非Temporary，再扫描main内可见且未编辑user role自身的exact data-message-id；重复DOM ID不匹配，无文字读取。页面只显示固定布尔/计数，绝无精确时间、标题、正文、ID或URL。停止、pagehide清空并停止读副本；hard-refresh新文档重新观测。无持久化，缓存不可跨硬刷新恢复；BFCache恢复需重新drain且旧数据清空。
