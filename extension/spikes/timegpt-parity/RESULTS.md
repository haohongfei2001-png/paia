# Parity 0.1.0 自动结果与证据

2026-09-06：独立测试 **49/49通过、0失败、0跳过**（9项MV3浏览器、22项契约/缓存、14项interceptor、3项v0.3.0只读对照、1项独立权限/代码审计）。命令 `node --test spikes/timegpt-parity/tests/*.test.mjs`；交付测试日志在项目忽略目录 work/parity-release-tests.txt。

正式项目原有 `node scripts/test.mjs` **309/309通过、0失败、0跳过**，1954项静态包审计通过，40个正式运行资源；日志 work/parity-official-regression.txt。与44ba90e逐字节比较：**原有91个Git跟踪文件全部未变**。本轮只新增spikes/timegpt-parity，不更改正式manifest、store、resolver、migration、dedupe、timeline或旧解压目录。实验9个JS/MJS与1个Python语法检查通过。

## 可复核的链路证据

- 真正Chrome加载本实验manifest，MAIN在document_start；合成页面头部立即调用严格 `/backend-api/conversation/{UUID}`，原页面立即消费json。测试用解析阻塞脚本延迟document_idle，先确认MAIN已产生metadata通知且页面已消费原Response、isolated面板尚不存在，然后才放行。20条旧user的时间由buffer经主动drain、exact DOM匹配到临时结果，assistant不计入。
- 阴性对照仅在临时测试副本禁用drain，其他同上，等候超过1/3秒重试窗口后仍为0。该对照证明正例的早到数据依赖drain，不是parser或resolver中间注入。
- isolated先到、重复响应、另一conversation预取后SPA（无再次fetch）、随后DOM出现、hard refresh清空后重取均通过。时间元数据只在有限内存，重复响应仍20条；停止后清空，停止状态经合成pagehide/pageshow回调仍保持。
- 非法user ID、无create_time、conversation冲突、重复ID的浏览器反例不能产生时间命中。DOM拒绝重复ID、隐藏、assistant及编辑节点；给虚构正文节点textContent/innerText/value安装抛错getter，仍正确匹配且没有正文读取错误。
- VM验证原Promise/Response/this/参数/一次调用；请求body/headers/credentials getter从未访问。慢副本不阻塞原响应、两并发上限、5秒超时、HTTP/type/重定向/实际及声明大小/深度/JSON限制、离页迟到响应不可污染新生命周期、错误conversation不可drain均通过。
- 缓存验证多批merge、同ID冲突后保持null、10分钟TTL、8聊天容量、2000条上限。仅响应metadata旁路；没有添加新请求，也没有任何持久化。

## 对正式版本的只读反证

加载未经修改的v0.3.0 observer与parser：门禁激活后detail endpoint可输出正式history；首次control之前已经完成的同形状响应会丢失；A聊天下预取B后切到B、没有第二次fetch则没有history。三项均自动验证。这证明两个生命周期缺口存在，**不证明真实旧聊天必然使用这些路径**，也不排除真实响应schema/URL/缓存/其他wrapper差异。

## 审计与交付范围

实验manifest只包含同站静态脚本，MAIN start/isolated idle，无API权限、background、host_permissions、web_accessible_resources。运行代码无storage、网络发起、凭证访问、日志、Archive调用、正文属性访问。正文响应字节仅在有限clone临时解码；assistant条目只读role判断，时间/ID/content getter反例确认后续字段不读取。面板白名单计数无正文、ID、URL、标题或完整时间，自动用合成敏感标记逐项检查。

包内仅5个运行文件和6个实验文档；不含正式扩展、测试代码、参考源码、Git、日志、用户导出或原解压目录。使用独立checkpoint-timegpt-parity-v0.1.0，ZIP的CRC/SHA-256及全部成员与checkpoint字节比对保存到work/parity-package-verification.json。

真实验收尚未执行。仅按README进行一次旧聊天smoke：matched user messages与create_time candidates均>0才证明这次真实页面provider观测成功。在此之前不接回SourceTimeResolver。
