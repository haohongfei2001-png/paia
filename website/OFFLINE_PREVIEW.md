# PAIA 离线预览与源码交付

`package_flagship.py` 只读取官网源码与已生成页面，不改写正式网站，不连接外网。

## 生成交付文件

在仓库根目录运行，Python 3.10 或更新版本即可，不需要额外依赖：

```bash
python3 website/build.py
python3 website/package_flagship.py --output-dir ../paia-delivery
```

默认先验证已生成页面与当前源文件完全一致；并行编辑尚未构建时会明确停止。开发过程中可用 `--skip-generation-check` 打包现有生成页面，但最终交付应重新构建后使用默认检查。

输出目录包含：

- `PAIA-Preview.html`：浏览器双击即可打开的完整离线官网，默认中文。
- `PAIA-Website-Source.zip`：官网维护源文件、`assets/website/` 资源、57 个生成页面、`robots.txt` 和 `sitemap.xml`，另附 `START-HERE.md`。不含扩展、Git 历史、私有研究、旧截图回执、缓存和重复的单 HTML 预览。
- `packaging-report.json`：文件大小、SHA-256、路由与依赖清单，以及真实执行的打包检查范围。

## 单 HTML 如何工作

全部页面、共享 CSS、共享 JavaScript 与资源分别放入一个 JSON 数据包。CSS、脚本、字体、Logo、原始插画及其他页面实际依赖均在文件内部，不需要 CDN、安装软件或启动服务器。

外层仅提供一个铺满视口的 `iframe srcdoc`，不增加网站导航条。原官网交互脚本以原始内容嵌入，保持档案编辑、搜索、主题阅读、提示词和权限演示行为。每次切换页面会重建该页面；同页锚点导航不重建页面，因此不会仅因点击目录而清空当前示例状态。

外层 URL 的 hash 保存页面与锚点，支持原导航、语言切换和浏览器前进/后退，例如：

```text
PAIA-Preview.html#/zh/
PAIA-Preview.html#/about.html
PAIA-Preview.html#/zh/demo.html#context
PAIA-Preview.html#/zh/demo.html#thought
PAIA-Preview.html#/zh/help.html#inputs
```

`/en/` 页面别名同样包含在包内。按住 Command/Ctrl 点击内部链接会打开带相应 hash 的同一离线文件。邮箱链接保留普通 `mailto:` 行为，外部网页链接在新标签页打开；只有用户主动点击外链时才会离开离线材料。

父页面与 iframe 双向消息都检查 `event.source`、当前页面和随机通道标识；来自其他窗口或旧页面的消息不能改变路由。在 HTTP/HTTPS 下，消息来源还必须严格匹配父页面的 origin。文件 URL 的 origin 在不同浏览器中可能序列化为 `null` 或其他形式，因此仅在 `file:` 下使用 `*` 发送目标，依然严格校验窗口、128 位随机通道标识和当前路由。所有 JSON 的 `<`、Unicode 行分隔符均转义，避免页面内容中的 `</script>` 提前结束数据块。

## 离线联系页

离线副本不加载 `flagship-contact.js`，移除表单 endpoint，并明确显示“离线预览，不会发送留言”。检查控件使用普通 `type="button"`，点击时直接调用 `reportValidity()` 检查必填、邮箱与确认框；格式有效时只显示本地校验结果，不进入原生提交流程，不产生网络请求。iframe 不授予表单提交权限，内部 CSP 同时禁止网络连接与表单提交；额外的 `submit` 拦截保留作为防线。

生产官网源码和源码 ZIP 中的真实联系流程不因此改变。独立邮件链接仍由用户主动选择。

## 验证边界

打包器检查57个页面齐全、所有活动依赖真实存在、当前源文件与生成页面一致（除非显式跳过），并生成可核对的文件摘要。它不把这些静态检查称为浏览器验证。

最终应由审阅者实际打开生成文件，检查中文/英文导航、前进后退、页内锚点、`demo.html#thought` 与 `#context`、主交互及离线表单。浏览器版本或辅助技术的兼容性需据实际检查记录说明。

从源码 ZIP 预览时，在解压目录运行：

```bash
python3 -m http.server 4173
```

浏览 `http://localhost:4173/zh/` 或 `http://localhost:4173/`。结束时按 Ctrl+C。
