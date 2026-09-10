# 已停用：QA_WORKFLOW_RETIRED

以下为历史实现说明，不是当前操作指引。真实入口已停用，禁止恢复登录/目标浏览自动化；保留 QA 目录但不读取或删除。当前采用 development/compat 一次脱敏采样与离线回放。

# 真实 Chrome smoke harness

仅使用固定的 tests/qa-browser-profile（Chrome管理登录态）及 tests/qa-local（本地配置），均在Git忽略列表中。不得复制/读日常profile、Cookie、token、Keychain、密码、Authorization或sessionStorage。代理不调用这些API，不记录浏览器原始错误、控制台、页面正文、标题、网络、截图、trace或HAR。

启动时定位并校验独立parity文件，Chrome使用该QA目录，自动通过CDP加载唯一实验扩展，并从扩展自身manifest校验名称/版本。从安全parity浮层只投影有限计数；hard reload通过CDP ignoreCache，不读任何网络内容。等待计数稳定后输出PASS/FAIL；正例必须两个计数都>0。未登录或未选目标是WAITING，不伪造0或FAIL。

首次仅人工登录QA Chrome及选择旧聊天。harness监听页面地址，识别用户打开的普通/c/UUID聊天，不读取标题或正文；保存加盐SHA256不可逆alias（A）。后续在已恢复目标页或当前ChatGPT sidebar链接中按alias找回目标；若浏览器不再持有该链接，散列无法还原URL，报告TARGET_ALIAS_UNAVAILABLE，不猜其他聊天。需要可靠跨浏览器重启直接导航可选B：在本地设置页填写URL，只进入tests/qa-local/target.json（0600），不进入Git/报告/命令行参数。

A/B均由QA浏览器本地设置页提供。A默认；B只有用户明确提交URL才写本地配置。报告只白名单status/reason和计数，不含alias、conversation/message ID、URL、时间戳或用户输入。Chrome自身管理QA profile；代理不读取其中的数据库/凭证文件。

自动测试在合成网站/临时独立目录完成启动、扩展验证、目标选择/复用、真实reload、稳定计数、安全报告及失败码，随后代理启动真实QA Chrome继续运行。正式PAIA保持原样。真实登录过期时只能由用户重新登录；不能保证第三方永不要求重新认证。
