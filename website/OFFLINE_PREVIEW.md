# PAIA 第二版离线预览与源码交付

`package_flagship.py` 只读取官网源码与已生成页面，不改写正式网站，不连接外网，也不部署生产环境。本轮成果用于独立审阅，未合并或替换正式官网。

## 生成交付文件

在仓库根目录运行，使用 Python 3.10 或更新版本，无需额外依赖：

```bash
python3 website/build.py
python3 website/package_flagship.py --output-dir ../paia-delivery
```

打包器默认验证生成页面与当前源文件一致；尚未构建的并行修改会让打包停止。`--skip-generation-check` 仅供开发中检查现有生成页，最终交付应重新构建并使用默认检查。

输出目录包含：

- `PAIA-Preview.html`：可用浏览器打开的完整离线官网，默认中文。
- `PAIA-Website-Source.zip`：官网维护源文件、`assets/website/` 资源、全部生成页面、`robots.txt`、`sitemap.xml` 和 `START-HERE.md`。不含扩展、Git 历史、私有研究、旧截图回执、缓存或重复的单 HTML 预览。
- `packaging-report.json`：文件大小、SHA-256、路由与依赖清单，以及本次真正执行的打包检查。

完整网站有 **57 个 HTML 页面**：19 个英文根目录页面、19 个中文页面，以及 19 个相同内容的 `/en/` 英文别名。

## 第二版交互

首页围绕同一句关于写作的表达展开。可以打开“改写这段话”，修改并保留工作文字；原始输入不被覆盖，同页下方的主题阅读同步显示修改。保存或取消后，焦点回到编辑入口。这是本页内的示例状态，不是 AI 生成、个人档案读取或真实产品同步。

独立 Demo 保留档案查找与编辑、核对原话、主题阅读、个人提示词管理和独立权限演示。所有示例材料均为虚构。刷新或切换页面会重建页面状态；同页锚点导航不重建页面，因此不会仅因点击目录而清空示例修改。

## 单 HTML 的浏览方式

全部页面、CSS、JavaScript、字体、Logo、原始插画及实际使用的资源都嵌入文件内部，不依赖 CDN、额外安装或服务器。外层只提供铺满视口的 `iframe srcdoc`，不增加第二套导航。包括新增首页交互在内的页面脚本，随生成页实际依赖一并打包。

外层 URL 的 hash 保存页面和页内锚点，支持网站导航、语言切换及浏览器前进／后退：

```text
PAIA-Preview.html#/zh/
PAIA-Preview.html#/about.html
PAIA-Preview.html#/zh/demo.html#context
PAIA-Preview.html#/zh/demo.html#thought
PAIA-Preview.html#/zh/help.html#inputs
```

按住 Command/Ctrl 点击内部链接，可打开带相应 hash 的同一离线文件。邮箱链接保留 `mailto:` 行为；外部网页链接在新标签页打开，只有主动点击才会离开离线材料。

父页面与 iframe 的消息检查窗口来源、当前路由和随机通道标识；HTTP/HTTPS 下还检查 origin。`file:` 下只放宽发送目标的 origin，窗口、路由和通道校验仍保留。嵌入的 JSON 会转义 `<` 和 Unicode 行分隔符。

## 离线联系页

离线副本移除联系 endpoint，不加载 `flagship-contact.js`，并显示“离线预览，不会发送留言”。检查控件是普通按钮，只通过 `reportValidity()` 检查必填字段、邮箱格式和确认框；有效时显示本地校验结果，不进入提交流程。

iframe 不授予表单提交权限，内部 CSP 禁止网络连接与表单提交，额外的 `submit` 拦截也保留。源码 ZIP 中的正常官网联系流程保持原样；独立邮件链接仍由用户主动选择。

## 检查范围与证据

打包器检查 57 个页面齐全、活动依赖存在、生成页与源文件一致，并生成文件摘要。这些是静态打包检查，不等于浏览器验证。

第二版当前已有 88 个响应式布局检查，以及首页修改、原话保留、主题回显和焦点归还的 CUA 观察。第一版的完整 CI 与旧离线包浏览器检查是历史证据；第二版全套 CI 仍待新提交后执行。具体结果见 [FLAGSHIP_REVIEW.md](FLAGSHIP_REVIEW.md)。

每次交付应实际打开新生成的文件，检查中英文导航、前进／后退、页内锚点、首页改写、Demo 主交互和离线表单。第一版的包曾在本地 HTTP 下验证；受管理浏览器限制，没有直接 `file:` 协议验收记录，不能据此推断所有浏览器或辅助技术均已验证。

从源码 ZIP 预览时，在解压目录运行：

```bash
python3 -m http.server 4173
```

打开 `http://localhost:4173/zh/` 或 `http://localhost:4173/`，结束时按 Ctrl+C。
