"""Public explanations of the approved final product and its current availability.

Authority: website/PRODUCT_CAPABILITY_MAP.md. Product demonstrations are shared
with the homepage so a secondary route cannot revive a retired product flow.
"""
from core import render as render_core
from home import icon


def render_demo(t, a, button):
    return f'''<section class="page-intro wrap product-demo-intro"><p class="eyebrow">{t('PAIA / 产品交互示例', 'PAIA / INTERACTIVE PRODUCT EXAMPLE')}</p>
<h1>{t('说过的话，<br>接着用。', 'Your words.<br>Put them to work again.')}</h1>
<p class="lead">{t('从一次产品探索出发：找回一句话，修改常用提示词，沿着主题继续思考，再看看四张 Context 卡片如何管理 AI 的允许范围。', 'Start with a fictional product exploration: find a sentence, edit a reusable prompt, follow a topic, and see how four Context cards control what AI may read.')}</p>
<div class="demo-disclosure"><strong>{t('可操作的示意，不是已接通的扩展', 'An interactive illustration, not a connected extension')}</strong><p>{t('全部为虚构数据。编辑只留在当前页面，刷新即清除；不连接档案、不调用 AI、不上传或持久保存输入。请勿填写私人资料。AI 整理、外部连接和云同步仍在开发。', 'All data is fictional. Edits stay in this page and clear on reload. No archive connection, AI call, upload or persistent storage. Please do not enter personal information. AI organization, external connections and cloud sync remain in development.')}</p></div></section>
<div class="product-demo-page">{render_core(t, a, button, icon, standalone=True)}</div>'''


def render_trust(t, a, invitation):
    return f'''<section class="page-intro wrap"><p class="eyebrow">{t('数据与权限', 'DATA & PERMISSIONS')}</p>
<h1>{t('长期留下，<br>仍然由你掌握。', 'Keep it over time.<br>Keep it under your control.')}</h1>
<p class="lead">{t('保存自己的表达、让 AI 帮忙整理、允许外部 AI 读取，以及同步到自己的云账号，是分开的选择。', 'Keeping your expressions, asking AI to organize them, allowing an external AI to read them, and syncing to your cloud account are separate choices.')}</p></section>
<section class="article-layout wrap"><nav class="article-nav" aria-label="{t('本页目录', 'On this page')}">
<a href="#local">{t('本地与云', 'Local and cloud')}</a><a href="#source">{t('原话与修改', 'Originals and edits')}</a><a href="#permission">{t('AI 的允许范围', 'AI permissions')}</a><a href="#recovery">{t('管理与恢复', 'Management and recovery')}</a></nav>
<div class="prose"><section id="local"><h2>{t('日常使用从本地开始。', 'Everyday use starts locally.')}</h2>
<p>{t('保存、阅读、查找、工作文字编辑、手动整理 Context 和本地提示词复用，不依赖 PAIA 的远程 AI 服务。这个网站也不会连接你的扩展档案。', 'Capture, reading, search, working-text edits, manual Context management and local prompt reuse do not depend on PAIA’s remote AI service. This website does not connect to your extension archive.')}</p>
<p>{t('本地优先不等于永不离开设备。计划中的 AI 整理与自动维护，会在得到对应处理许可后使用所需材料；外部 AI 连接按读取许可工作。真实 AI 服务和外部连接目前尚未开放。', 'Local-first does not mean material can never leave your device. Planned AI organization and automatic maintenance will use necessary material under separate processing permission. External AI connections have their own reading permissions. These AI services and connections are not available yet.')}</p>
<p>{t('可选同步的正式方向是你自己的浏览器云账号：Chrome 使用 Google Drive，Edge 使用 OneDrive，Safari 使用 iCloud。主动开启后，同一生态中的新设备可恢复已成功同步的数据。真实云传输和恢复仍在开发；不会自动跨生态互通，也不需要建立 PAIA 内容云账号。', 'Optional sync is planned through your own browser cloud account: Google Drive for Chrome, OneDrive for Edge, and iCloud for Safari. Once enabled, it will let a new device in the same ecosystem restore successfully synced data. Cloud transport and recovery remain in development. Cross-ecosystem sync is not automatic, and PAIA will not require its own content-cloud account.')}</p></section>
<section id="source"><h2>{t('修订工作文字，仍能核对原话。', 'Revise your working text. Keep the source in view.')}</h2>
<p>{t('输入档案保留来源事实，工作文字承接当前修改。普通编辑不会覆盖原始来源。阅读过滤是可逆的，不等于删除，也不替你授权 AI。', 'The archive retains source records while the working text holds your edits. Ordinary editing does not overwrite the original source. Reading filters are reversible; filtering is neither deletion nor permission for AI.')}</p>
<p>{t('Thought Library 按你的个人主题、章节和内容组织。AI 整理只提供衍生阅读方式：原话优先、平衡整理、更加概括。它应保留来源、条件与不确定性，也不能覆盖人工命名、移动、排除或写作。', 'Thought Library uses your personal topics, sections and entries. AI organization provides a derived reading view: Original-first, Balanced or More concise. It must preserve sources, conditions and uncertainty, and must not override your names, moves, exclusions or writing.')}</p>
<p>{t('发给 AI 的引用、假设或第三方文字，不会因此自动成为你的长期观点。', 'A quotation, hypothesis or third-party passage does not become your lasting belief just because you sent it to AI.')}</p></section>
<section id="permission"><h2>{t('四张卡片，分别掌握。', 'Four cards. Separate controls.')}</h2>
<dl class="boundary-list"><div><dt>{t('我的信息', 'My Information')}</dt><dd>{t('你希望 AI 了解的背景，可以独立补充、修改或删除。', 'Background you want AI to know, with independent editing and removal.')}</dd></div>
<div><dt>{t('我的规则', 'My Rules')}</dt><dd>{t('你对回答方式、任务边界等的要求。', 'Your instructions for responses and task boundaries.')}</dd></div>
<div><dt>{t('我的现在', 'My Now')}</dt><dd>{t('当前项目、近况与已变化的条件。', 'Current projects, recent context and changed circumstances.')}</dd></div>
<div><dt>{t('我的输入', 'My Inputs')}</dt><dd>{t('逐个决定外部 AI 可以深入读取哪些 Personal Topic。', 'Choose which Personal Topics an external AI may read in depth.')}</dd></div></dl>
<p>{t('总开关、四卡和新主题的访问默认关闭。建立连接不会自动打开这些开关。允许后，AI 才能在需要时读取合格内容；你不必每次选一份材料、审阅并导出。没有开放的主题，不能退回去读取整个输入档案。', 'The main switch, all four cards and every new topic start closed. Connecting an AI does not open them automatically. Once allowed, an AI may read eligible content when needed; you do not have to assemble and export a packet for every task. Closed topics do not grant fallback access to the whole Input Archive.')}</p>
<p>{t('关闭一个主题，只改变该主题的访问。其他卡片中独立保存的内容，仍需分别管理。暂停或撤回会阻止之后的读取，不能收回已经交给外部 AI 的内容。', 'Closing a topic changes access to that topic. Content saved independently in other cards keeps its own controls. Pausing or withdrawing permission stops future reads; it cannot recall content already delivered to an external AI.')}</p></section>
<section id="recovery"><h2>{t('保留、修改和恢复，边界清楚。', 'Clear controls for keeping, editing and recovering.')}</h2>
<p>{t('你可以管理档案里的内容，以及内容是否允许用于 AI。过滤、从主题移除、从档案移除和永久删除不是同一件事。来源平台与 PAIA 是各自的副本，一处删除不会自动删除另一处。', 'You control the content in your archive and whether AI may use it. Filtering, removing a topic placement, removing an archive record and permanent deletion are different actions. PAIA and the source platform keep separate copies; deletion in one does not automatically delete the other.')}</p>
<p>{t('官方历史文件导入、已有备份文件恢复和故障恢复保留在正式计划中。生成内容导出、生成新备份和 Context 打包分享已不属于当前产品方向。同步也不等于无限期备份。', 'Official history-file import, recovery from existing backup files and failure recovery remain in the product plan. Content exports, generating new backups and packaged Context sharing are no longer part of the current product. Sync is not an unlimited backup history.')}</p>
<p>{t('测试版不应成为重要资料的唯一副本。保留原平台或其他独立来源，按获邀版本的说明操作；本地存储也不是加密或永久无损保证。', 'The beta should not be the only copy of important material. Keep the original platform or another independent source and follow the instructions for your invited build. Local storage is not an encryption or permanent lossless-storage guarantee.')}</p></section>
<section><h2>{t('这个网站如何处理信息？', 'What does this website do with information?')}</h2><p>{t('网站没有分析脚本、广告跟踪器、远程字体或档案连接。示例数据只在当前页面内存中使用，刷新即清除。只有主动提交内测申请时，表单字段才会通过 FormSubmit 转发至项目邮箱。网站托管与表单服务有各自的数据处理边界。', 'The website has no analytics scripts, ad trackers, remote fonts or archive connection. Example data stays in the current page and clears on reload. Only submitting the beta application sends form fields through FormSubmit to the project email. Hosting and the form provider have their own data-processing boundaries.')}</p>{a('privacy-policy.html',t('阅读隐私政策', 'Read the privacy policy'), 'text-link')}</section>
</div></section>{invitation()}'''


def render_status(t, a, invitation, statusmini):
    rows = [
        (t('输入档案', 'Input Archive'), t('Chrome / ChatGPT 的本地采集、查找、编辑与来源核对已有集成实现。', 'Local Chrome / ChatGPT capture, search, working-text editing and source readback are integrated.')),
        (t('个人提示词', 'Personal prompts'), t('本地常用表达、编辑、固定、排序和手动填入已有实现。默认关闭的本地下一步建议也已合入开发版；实际可用范围仍以获邀版本和真实站点验证为准。', 'Local reusable phrases, editing, pinning, ordering and manual insertion are implemented. Optional local next-step suggestions, off by default, are also integrated into development builds. Actual support depends on your invited build and site validation.')),
        (t('Thought Library', 'Thought Library'), t('个人主题与章节阅读已有基础；完整写作、组织体验和 AI 阅读方式仍在完善。', 'Personal topics and section reading have an integrated foundation. The full writing, organization and AI reading experience is still being completed.')),
        (t('四卡 Context', 'Four-card Context'), t('本地界面与手动内容管理已有基础，完整自动维护与真实外部 AI 按需读取尚未开放。', 'Local cards and manual content management have an integrated foundation. Full automatic maintenance and real external AI reading are not available.')),
        (t('AI 整理与协助', 'AI organization and assistance'), t('三种整理方式及明确的用户控制已确定。真实模型服务、质量和费用支持尚未上线。', 'Three reading styles and explicit user controls are approved. Live model services, quality validation and billing support are not launched.')),
        (t('自己的云账号同步', 'Sync through your cloud account'), t('方案已确定，部分本地基础已实现；三种生态的真实云传输与新设备恢复尚未开放。', 'The approach is approved and part of the local foundation exists. Live cloud transport and new-device recovery across the three supported ecosystems are not available.')),
    ]
    return f'''<section class="page-intro wrap"><p class="eyebrow">{t('体验与可用范围 · 核对于 2026-10-08', 'EXPERIENCE & AVAILABILITY · CHECKED 8 OCT 2026')}</p>
<h1>{t('先了解产品，<br>再选择如何体验。', 'Explore the product.<br>Know what you can try.')}</h1>
<p class="lead">{t('官网展示正式计划完成后的产品体验。当前可直接使用网页示例，也可以申请测试版；示例不代表全部能力已经交付。', 'The website illustrates the product the approved plan is building toward. You can use the web example now or apply for the beta. An illustration does not mean every capability has shipped.')}</p>{statusmini()}</section>
<section class="status-page wrap"><article><span class="label">{t('现在可以', 'AVAILABLE NOW')}</span><h2>{t('不安装，先用虚构示例试一试。', 'Try the fictional example, without installing.')}</h2>
<p>{t('可以编辑与搜索示例输入，整理自己的提示词，切换主题阅读，体验四卡的允许范围和暂停。所有操作只发生在网页里，不连接 AI 或你的资料。', 'Edit and search sample inputs, organize personal prompts, compare topic reading, and try the four-card permission scope and pause controls. Everything happens in the webpage, without an AI or personal-data connection.')}</p>
<div class="actions">{a('demo.html',t('打开交互示例', 'Open the interactive example'),'button')}{a('beta.html',t('申请测试版', 'Request a beta invitation'),'text-link')}</div></article>
<article><span class="label">{t('测试版与目标能力', 'BETA FOUNDATIONS & TARGET CAPABILITIES')}</span><h2>{t('哪些已有基础，哪些还在完成。', 'What has a foundation, and what is still being completed.')}</h2>
<p>{t('以下“已有实现”指已合入开发版本，不能据此推断商店发布或你已安装的版本。当前没有经过核验的公开安装包或商店下载入口；获邀后提供具体版本与安装说明。', '“Implemented” below means integrated into the development version. It does not imply a store release or availability in your installed build. There is no verified public installer or store download; invitations provide the actual version and setup instructions.')}</p>
<div class="product-table-wrap"><table class="product-availability-table"><thead><tr><th scope="col">{t('能力', 'Capability')}</th><th scope="col">{t('当前范围', 'Current scope')}</th></tr></thead><tbody>{''.join(f'<tr><th scope="row">{label}</th><td>{scope}</td></tr>' for label,scope in rows)}</tbody></table></div></article>
<article><span class="label">{t('来源与安装', 'SOURCES & INSTALLATION')}</span><h2>{t('从桌面 Chrome 与 ChatGPT 开始。', 'Starting with desktop Chrome and ChatGPT.')}</h2>
<p>{t('当前采集实现面向 ChatGPT 的受支持页面和已发送用户文字。Claude、Gemini 等其他来源仍按后续计划推进。全量账号历史、全部 AI 回复、任意网页和草稿不会因为安装就自动被收集。', 'Current capture implementation targets supported ChatGPT pages and sent user text. Other sources, including Claude and Gemini, remain planned. Installation does not automatically collect an entire account history, all AI replies, arbitrary webpages or drafts.')}</p>
<p>{t('真实来源、设备、签名发行、更新以及导入恢复仍需按各自范围验证。请依照邀请中提供的版本说明；重要资料保留独立来源。', 'Live sources, devices, signed distribution, updates and import recovery still need validation within their own scope. Follow the instructions for your invited build and retain an independent source for important material.')}</p></article>
<div class="status-footnote"><p>{t('能力方向以最新批准的产品合同为准。页面核对日期不会随产品提交自动更新，邀请中提供的版本说明才决定当次可体验范围。', 'Capability direction follows the latest approved product contracts. This dated page does not update with every development commit; the instructions accompanying your invitation determine what you can try.')}</p>
<a href="https://github.com/haohongfei2001-png/paia/blob/main/website/PRODUCT_CAPABILITY_MAP.md" rel="noreferrer">{t('查看产品依据', 'Product sources')}</a></div></section>{invitation()}'''


def render_about(t, a, invitation):
    return f'''<section class="page-intro wrap"><p class="eyebrow">WHY PAIA</p><h1>{t('你在对话里投入的，<br>应该留在自己手里。', 'What you put into a chat<br>should remain yours.')}</h1></section>
<article class="prose about-prose wrap"><p class="lead">{t('我们越来越多地借助 AI 想事情。写下背景，解释选择，推翻假设，反复描述自己在意什么。这些表达已经产生了价值，却容易散落在一次次对话里。', 'More of our thinking happens with AI. We explain the background, weigh choices, test assumptions and describe what matters to us. Those expressions already have value, yet they are easily scattered across conversations.')}</p>
<h2>{t('把表达变成自己的积累。', 'Make those expressions an archive of your own.')}</h2><p>{t('PAIA 是个人 AI 输入档案。Input Archive 留下原话与来源；Thought Library 围绕你的主题组织持续的思考；常用提示词让反复需要的表达随手可用。AI Context 则让你决定，连接的 AI 可以按需了解哪些背景与内容。', 'PAIA is a personal AI input archive. Input Archive keeps your words and their sources. Thought Library organizes ongoing ideas around your own topics. Personal prompts keep useful phrases close at hand. AI Context lets you decide what a connected AI may learn about your background and material when it needs to.')}</p>
<h2>{t('整理是帮助，不是替你表达。', 'Organization should help you express yourself.')}</h2><p>{t('一段话可能是引用、试探，也可能只是当时的想法。AI 的整理应能回到来源，保留条件与不确定性。它不能悄悄改写原话、替你确定立场，或越过你选择的范围。', 'A passage may be a quotation, an experiment or simply what you thought at that moment. AI organization should remain traceable to its sources and preserve conditions and uncertainty. It must not silently rewrite your words, decide your beliefs or reach beyond your chosen scope.')}</p>
<h2>{t('一封尚未寄出的信。', 'A letter not yet sent.')}</h2><p>{t('小女孩的背影、旧信箱与未寄出的信，是 PAIA 的品牌原点。它们关乎投递、遗失与保存，也关乎一个人与自己表达之间的距离。产品要做的是让这些表达留下来，并在你需要时重新变得可用。', 'The girl seen from behind, the old mailbox and the unsent letter are PAIA’s original image: sending, losing and keeping, and the distance between a person and their own expressions. The product gives those expressions somewhere to remain, and a way to become useful again.')}</p>
<p>{a('demo.html',t('用示例了解 PAIA', 'Explore PAIA with an example'),'text-link')}</p></article>{invitation()}'''
