# TimeGPT / PAIA 代码对照（2026-09-06）

上游固定commit：e955766d789303866d1f38fb51f514ccad887c2a。只参考公开架构，自行实现独立JS，不复制上游业务代码。

- [interceptor.ts](https://github.com/deviationist/timegpt/blob/e955766d789303866d1f38fb51f514ccad887c2a/src/interceptor.ts)
- [content.ts](https://github.com/deviationist/timegpt/blob/e955766d789303866d1f38fb51f514ccad887c2a/src/content.ts)
- [manifest.json](https://github.com/deviationist/timegpt/blob/e955766d789303866d1f38fb51f514ccad887c2a/manifest.json)

A. PAIA 44ba90e/content/response-observer.js inspect明确用snapshot正则监听/backend-api/conversation/{8..128 ID}，分类为conversation_load_candidate。命中当前chat且history门禁打开时进入fingerprint中的正式history parser。因此“根本没订阅该endpoint”不成立。

B. 两者MAIN均静态document_start；PAIA bridge是document_start，TimeGPT content是document_idle。PAIA wrapper本身同步安装，但捕获需异步GET_STATUS→control消息。wrapper安装前已有其他扩展包装、在现有页安装扩展、第三方后续覆盖fetch或使用早先引用均不能排除；源码不能保证自己是最早wrapper。PAIA无MAIN早到metadata buffer/主动drain，只有isolated收到后的history cache。bootstrap只接受在门禁放行后才完成的请求；此前完成的响应直接错过。TimeGPT在MAIN合并buffer并推送，content启动立即及1/3秒后drain。PAIA current/currentHistory要求当前路由、session、epoch，切换clear会重置history/proofs且MAIN stop取消旧reader，因此跨聊天prefetch与路由切换窗口可能丢失。

C. 精确detail path在PAIA不会被标成other；带query仍识别snapshot，但旧诊断URL形态拒绝。v0.2.4正式旁路已在该拒绝之前运行。fingerprint #12统计不足以还原真实URL/键名，不能认定它就是detail endpoint。当前主要可验证差异是早到/非当前chat的response无法留到后来drain，而非订阅缺失。

D. sidebar prefetch/route preload若调用被hook的fetch，TimeGPT可缓存；PAIA当前chat门禁会排除其他conversation。若fetch在hook之前完成或客户端复用已有对象不再fetch，任何纯fetch wrapper都无法追溯。浏览器HTTP缓存通常仍经fetch返回Response，可以旁路观察，不能等同于客户端没有调用fetch；WebWorker fetch、XHR、离线应用缓存等路径也不在window.fetch覆盖内。以上为代码推论，不是对真实私有页面网络行为的已验证诊断。

上游额外差异：TimeGPT历史分支async wrapper等待clone.json，可能延后页面拿到Response；SSE分支返回新Response，且还采集sidebar标题、assistant时间及使用storage.sync偏好。本spike只实现detail/user metadata，保留原Promise/Response并有限异步clone，不沿用上述扩展范围。

只读自动反证见 tests/comparison.test.mjs 与 RESULTS.md：实际加载v0.3.0 observer，三项分别证明endpoint正例、早于control完成的丢失、跨聊天prefetch丢失，不修改其正式实现。
