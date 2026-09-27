"""Owner-selected website: native typography, scroll-collected inputs, scoped context.
All examples are fictional. This module does not implement extension capabilities.
"""
from html import escape

def icon(name, cls='art-icon'):
    paths = {
        'collect': '<circle cx="23" cy="25" r="17"/><circle cx="39" cy="40" r="17" fill="#dce2d3" fill-opacity=".75"/><path d="M24 42a17 17 0 0 0 15-17" stroke="#71806a"/>',
        'connect': '<circle cx="32" cy="32" r="27" stroke="#d4d7d0"/><circle cx="32" cy="32" r="19" stroke="#a1aa9b"/><circle cx="32" cy="32" r="6" fill="#374332" stroke="none"/>',
        'reuse': '<circle cx="32" cy="32" r="27" stroke="#e0e3dc"/><path d="M9 55C29 46 42 34 49 12M31 17l18-5-3 18" stroke="#344130" stroke-width="1.8"/>',
        'note': '<path d="M16 7h23l9 9v41H16zM39 7v12h9M23 28h18M23 36h18M23 44h12"/>',
        'search': '<circle cx="27" cy="27" r="14"/><path d="m38 38 14 14"/>',
        'arrow': '<path d="M12 32h38M36 18l14 14-14 14"/>',
        'down': '<path d="m17 25 15 15 15-15"/>',
        'topic': '<circle cx="18" cy="32" r="10"/><circle cx="45" cy="13" r="6"/><circle cx="45" cy="51" r="6"/><path d="m26 26 14-10M26 38l14 10"/>',
        'shield': '<path d="m32 7 20 8v17c0 12-10 20-20 25-10-5-20-13-20-25V15zM23 32l6 6 13-15"/>',
        'mark': '<path d="M12 54 29 10h8L20 54zM33 33h9l12 21H44z" fill="currentColor" stroke="none"/>',
    }
    return f'<svg class="{cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'

def render(t, a, button, statusmini):
    def brand(name):
        return f'<img class="provider-mark" src="/assets/website/marks/{name}.svg" width="26" height="26" alt="" decoding="async">'
    def card(name, position, body, mark, extra='', date=''):
        return f'<article class="input-card art-node {position}" data-arrival="{position}"><div class="card-source">{mark}<span>{name}</span>{extra}</div>{f"<time>{date}</time>" if date else ""}<p>{body}</p></article>'
    planned=f'<span class="planned">{t("规划中","Planned")}</span>'
    hero=f'''<section class="hero-sequence" data-hero-sequence aria-labelledby="hero-title">
<div class="hero-stage"><div class="hero-inner wrap">
<div class="hero-copy"><h1 id="hero-title">{t('让每次 AI 对话，<br><em>接上你的积累。</em>','Turn what you’ve<br>said into <em>what’s next.</em>')}</h1><p class="hero-description">{t('保存你对 AI 说过的话，<br>整理成下一次任务可用的上下文。','Collect what you tell AI.<br>Build context you can use again.')}</p><div class="hero-actions">{button('beta.html',t('申请内测','Get early access'))}{a('demo.html',t('体验示例','Explore the example'),'text-link')}</div><p class="hero-scope">{t('桌面 Chrome · ChatGPT · 邀请制内测','Chrome desktop · ChatGPT · Private beta')}</p></div>
<div class="collection" id="collection" aria-label="{t('输入汇集的概念示意','Illustration of collected inputs')}"><div class="collection-canvas">
<div class="photo-coast art-node" data-arrival="photo"><img src="/assets/website/media/coast.webp" width="420" height="540" alt="" decoding="async"></div>
<div class="photo-light art-node" data-arrival="photo"><img src="/assets/website/media/light.webp" width="280" height="360" alt="" decoding="async"></div>
<svg class="collection-lines art-node" data-arrival="lines" viewBox="0 0 680 640" fill="none" aria-hidden="true"><g stroke="#a5ada1" stroke-width="1"><path d="M208 228C219 282 252 242 300 302"/><path d="M488 193C534 243 460 258 454 299"/><path d="M573 347C566 389 500 386 466 419"/><path d="M212 477C246 485 281 466 294 444"/></g><g fill="#7f8c78"><circle cx="208" cy="228" r="2"/><circle cx="488" cy="193" r="2"/><circle cx="573" cy="347" r="2"/><circle cx="212" cy="477" r="2"/></g></svg>
{card('ChatGPT','card-gpt',t('“第一版只帮助创作者找回已有素材，不做内容生成。”','“The first version helps creators find their existing material—not generate more.”'),brand('openai'),date='12 Aug 2026')}
{card(t('想法','Thought'),'card-note',t('先解决一个反复发生的问题，而不是再增加一个工具。','Solve a recurring problem. Don’t add another tool to maintain.'),icon('note','provider-mark'))}
{card('Claude','card-claude',t('“把这个产品方向，与之前的用户研究放在一起看。”','“Connect this product direction with the earlier user research.”'),brand('claude'),planned)}
{card('Gemini','card-gemini',t('“第一版应该保留什么，暂缓什么？”','“What belongs in the first release, and what should wait?”'),brand('gemini'),planned)}
<article class="synthesis-card art-node" data-arrival="paia"><div class="card-source"><span class="provider-mark paia-brand-mark" aria-hidden="true"></span><span class="small-wordmark">PAIA</span></div><h2>{t('第一版的上下文','Context for the first release')}</h2><p>{t('面向独立创作者。<br>先找回已有素材。<br>暂不做多人协作。','Independent creators.<br>Recover existing material.<br>Leave collaboration for later.')}</p><div class="synthesis-bottom"><span>{t('3 条已选输入','3 selected inputs')}</span>{a('demo.html',icon('arrow','mini-icon')+'<span class="visually-hidden">'+t('打开示例','Open example')+'</span>',cls='icon-link')}</div></article>
</div><p class="collection-caption">{t('概念示意 · Claude 与 Gemini 接入尚在规划中','Illustration · Claude and Gemini capture is planned')}</p></div>
<a class="scroll-cue" href="#collection" data-scroll-collection aria-label="{t('下滑查看输入如何汇集','Scroll to see your inputs come together')}">{icon('down','mini-icon')}</a>
</div></div></section>'''
    overview=f'''<section class="core-model wrap" aria-labelledby="core-model-title">
<div class="core-model-heading"><p class="eyebrow">{t('PAIA / 五个核心功能','PAIA / FIVE CORE FUNCTIONS')}</p><h2 id="core-model-title">{t('收集只是第一步。<br>后面四件事，让积累真正继续工作。','Capture is only the first step.<br>Four more jobs make it useful again.')}</h2><p>{t('首屏已经是第 1 件事：收集你在各个 AI 中自己的输入。接下来，PAIA 负责查看与编辑、提示词复用、主题整理，以及可授权的个人上下文。','The opening already shows job 1: collecting your own inputs across AI products. From there, PAIA helps you review and edit them, reuse prompts, follow ideas by topic, and control personal context.')}</p></div>
<div class="core-model-grid">
<article><span class="core-number">02</span>{icon('note')}<h3>{t('查看与编辑自己的输入','Review and edit your inputs')}</h3><p>{t('把输入当成自己的材料，而不是散落的聊天记录。','Treat your inputs as your material, not scattered chat history.')}</p></article>
<article><span class="core-number">03</span>{icon('reuse')}<h3>{t('高频提示词复用','Reuse your frequent prompts')}</h3><p>{t('AI 回答后，最常用的下一步提示随手可用。','Bring your most useful next prompts back when you need them.')}</p></article>
<article><span class="core-number">04</span>{icon('connect')}<h3>{t('按主题看一路想法','See your thinking by topic')}</h3><p>{t('跨会话整理、修正并导出一条持续的思路。','Organize, revise and export a line of thinking across conversations.')}</p></article>
<article><span class="core-number">05</span>{icon('shield')}<h3>{t('个人上下文中心','A personal context center')}</h3><p>{t('让连接的 AI 读取你明确授权的个人上下文。','Let connected AI assistants use only the personal context you authorize.')}</p></article>
</div></section>'''
    library=f'''<section class="core-feature core-feature-library" id="input-library"><div class="core-feature-inner wrap">
<div class="core-feature-copy"><p class="eyebrow">{t('02 / 查看与编辑','02 / REVIEW & EDIT')}</p><h2>{t('自己的输入，<br>应该像自己的材料一样好用。','Your inputs should work<br>like material you own.')}</h2><p>{t('按时间、来源和主题找回内容，连续查看，并直接修改当前工作版本。原始来源仍保留，随时可以回去核对。','Find material by time, source or topic, read it continuously, and edit the working version directly. The original source stays available for checking.')}</p><ul class="core-feature-points"><li>{t('搜索、筛选与连续阅读','Search, filter and continuous reading')}</li><li>{t('编辑工作文字，不覆盖原始来源','Edit working text without overwriting the source')}</li><li>{t('自己的输入可以被整理、带走与复用','Organize, export and reuse your own inputs')}</li></ul></div>
<div class="core-feature-visual"><div class="library-shell">
<aside><span class="small-wordmark">PAIA</span><strong>{t('输入','Inputs')}</strong><span>{t('全部输入','All inputs')}</span><span>{t('按主题','By topic')}</span><span>{t('已编辑','Edited')}</span></aside>
<div class="library-main"><div class="library-search">{icon('search','mini-icon')}<span>{t('搜索自己的输入','Search your inputs')}</span></div>
<article><div><span>ChatGPT</span><time>09:42</time></div><p>{t('先明确这个产品真正反复解决的问题。','First define the recurring problem this product actually solves.')}</p><small>{t('原始记录已保留 · 工作版本已编辑','Source preserved · Working text edited')}</small></article>
<article><div><span>{t('想法','Thought')}</span><time>11:18</time></div><p>{t('不要只保存聊天，要让下一次任务能直接接上。','Do not just save chats. Make the next task able to continue from them.')}</p><small>{t('主题：产品方向','Topic: Product direction')}</small></article>
<article><div><span>ChatGPT</span><time>18:03</time></div><p>{t('把真正会改变答案的约束单独留下。','Keep the constraints that actually change the answer.')}</p><small>{t('可编辑 · 可核对来源','Editable · Source available')}</small></article>
</div></div></div>
</div></section>'''
    prompts=f'''<section class="core-feature core-feature-prompt"><div class="core-feature-inner core-feature-flip wrap">
<div class="core-feature-copy"><p class="eyebrow">{t('03 / 高频提示词复用','03 / PROMPT REUSE')}</p><h2>{t('AI 回答之后，<br>下一句不必每次重想。','After the answer,<br>your next prompt is close at hand.')}</h2><p>{t('PAIA 可以在 AI 输出后提示下一步，同时用一个轻量浮窗保留你最常使用的提示词。相似表达合并去重，但顺序和内容始终可以由你编辑。','After an AI response, PAIA can surface useful next steps and keep your most-used prompts in a lightweight panel. Similar prompts are deduplicated, while the wording and order remain yours to edit.')}</p><ul class="core-feature-points"><li>{t('根据场景提示“下一句可以问什么”','Suggest what you may want to ask next')}</li><li>{t('高频提示词相似去重','Deduplicate similar frequent prompts')}</li><li>{t('手动编辑、排序、固定常用项','Edit, reorder and pin what matters')}</li></ul></div>
<div class="core-feature-visual"><div class="prompt-stage"><div class="ai-answer"><div><span>AI</span><small>{t('刚刚回答','just answered')}</small></div><p>{t('建议先验证最核心的使用闭环，再决定是否扩展到更多功能。','Validate the core usage loop first, then decide whether to expand the feature set.')}</p></div>
<div class="prompt-panel"><div class="prompt-panel-head"><strong>PAIA · {t('常用下一步','Next prompts')}</strong><span>{t('相似项已合并','similar items merged')}</span></div>
<div class="prompt-row"><span>1</span><p>{t('结合我的实际约束重新分析。','Re-evaluate this using my actual constraints.')}</p></div>
<div class="prompt-row"><span>2</span><p>{t('给出最强的反例和遗漏变量。','Give the strongest counterexample and missing variables.')}</p></div>
<div class="prompt-row"><span>3</span><p>{t('把结论压缩成三个下一步。','Reduce the conclusion to three next actions.')}</p></div>
<div class="prompt-panel-foot"><span>{t('拖动排序','Drag to reorder')}</span><span>{t('编辑提示词','Edit prompts')}</span></div></div>
<div class="next-prompt-hint"><span>PAIA</span><p>{t('下一步：要不要让 AI 只比较两个最关键的方案？','Next: ask the AI to compare only the two most important options?')}</p></div>
</div></div>
</div></section>'''
    topics=f'''<section class="core-feature core-feature-topics"><div class="core-feature-inner wrap">
<div class="core-feature-copy"><p class="eyebrow">{t('04 / 主题与想法轨迹','04 / TOPICS & THOUGHT TRAILS')}</p><h2>{t('把散落的表达，<br>放回同一个长期问题。','Put scattered expressions<br>back into the same long-running question.')}</h2><p>{t('AI 辅助分类后，不同 AI、不同会话里的输入可以按主题查看。你能继续整理、修正和补充，并把一段想法的发展过程导出，而不是只得到一堆孤立聊天。','With AI-assisted classification, inputs from different AI products and conversations can be viewed by topic. Keep organizing, correcting and adding to them, then export the development of an idea instead of a pile of isolated chats.')}</p><ul class="core-feature-points"><li>{t('AI 辅助归类，用户可以修正','AI-assisted classification that you can correct')}</li><li>{t('按时间看到观点、约束和结论怎样变化','See how views, constraints and conclusions change over time')}</li><li>{t('按主题整理并导出自己的思路','Organize and export your own thinking by topic')}</li></ul></div>
<div class="core-feature-visual"><div class="topic-demo"><header><div><span class="label">{t('主题','TOPIC')}</span><h3>{t('第一版产品应该做什么？','What belongs in the first release?')}</h3></div><span class="topic-export">{t('整理并导出','Organize & export')}</span></header>
<div class="topic-timeline"><article><time>08.12</time><div><span>ChatGPT</span><p>{t('第一版先解决已有素材的找回。','Start by recovering material that already exists.')}</p></div></article>
<article><time>09.03</time><div><span>{t('自己的补充','Your note')}</span><p>{t('关键不是“存得更多”，而是更快接上之前的判断。','The point is not to save more, but to resume prior thinking faster.')}</p></div></article>
<article><time>09.15</time><div><span>AI {t('整理','organization')}</span><p>{t('目前主线：收集 → 找回/编辑 → 复用 → 上下文。','Current thread: capture → review/edit → reuse → context.')}</p></div></article>
<article class="topic-current"><time>{t('现在','NOW')}</time><div><span>{t('当前工作版本','Working view')}</span><p>{t('按主题保留一路变化，而不是把某次表达永久当成最终观点。','Keep the evolution of the topic instead of treating one old statement as a permanent belief.')}</p></div></article></div>
</div></div>
</div></section>'''
    context=f'''<section class="core-feature core-feature-context"><div class="core-feature-inner core-feature-flip wrap">
<div class="core-feature-copy"><p class="eyebrow">{t('05 / 个人上下文中心','05 / PERSONAL CONTEXT CENTER')}</p><h2>{t('让 AI 记住你，<br>但由你决定它能记住什么。','Let AI remember you—<br>with you in control of what it knows.')}</h2><p>{t('PAIA 从你的输入中提出可能有用的个人信息候选，并由你确认；你也可以主动补充。每条信息都显示来源、授权范围与使用情况。连接 PAIA 的 AI 通过插件或连接器按任务取用获准上下文，让 PAIA 成为统一的个人上下文与记忆中心。','PAIA can propose useful personal facts from your own inputs for you to confirm, and you can add facts directly. Each item shows its source, permission scope and usage. AI assistants connected through a plugin or connector request only authorized context for the task, making PAIA a shared personal context and memory center.')}</p><ul class="core-feature-points"><li>{t('从输入提出候选信息 + 你主动补充','Suggested facts from inputs + facts you add yourself')}</li><li>{t('每条信息都有来源与当前版本','Every fact has provenance and a current version')}</li><li>{t('看得见谁被授权、什么被使用','See what is authorized and what was used')}</li></ul></div>
<div class="core-feature-visual"><div class="context-center"><div class="context-center-main"><header><span class="small-wordmark">PAIA</span><strong>{t('个人上下文','Personal context')}</strong></header>
<article><div><span>{t('沟通偏好','Communication preference')}</span><em>{t('你补充','Added by you')}</em></div><p>{t('先给结论，再展开依据。','Lead with the conclusion, then explain the evidence.')}</p><small>{t('授权：当前任务','Permission: current task')}</small></article>
<article><div><span>{t('长期项目','Ongoing project')}</span><em>3 {t('条输入提出','inputs')}</em></div><p>{t('正在持续设计一个个人 AI 上下文系统。','Designing a personal AI context system over time.')}</p><small>{t('已确认 · 可随时修改','Confirmed · Editable anytime')}</small></article>
<article class="context-pending"><div><span>{t('候选信息','Suggested fact')}</span><em>AI</em></div><p>{t('更偏好可以长期复用的工具。','May prefer tools that stay useful over time.')}</p><small>{t('等待你确认，不会自动成为事实','Waiting for your confirmation; not a fact yet')}</small></article></div>
<aside class="context-access"><span class="label">{t('本次访问','THIS ACCESS')}</span><div class="connector-line"><span>AI</span><i></i><span class="paia-brand-mark" aria-hidden="true"></span></div><h4>{t('请求 2 条上下文','2 context items requested')}</h4><p>{t('任务：比较两个产品方案','Task: compare two product options')}</p><dl><div><dt>{t('允许','Allowed')}</dt><dd>{t('沟通偏好','Communication preference')}</dd></div><div><dt>{t('允许','Allowed')}</dt><dd>{t('长期项目','Ongoing project')}</dd></div><div><dt>{t('未发送','Not sent')}</dt><dd>{t('其他个人信息','Other personal facts')}</dd></div></dl><small>{t('你可以查看、撤回或调整授权。','Review, revoke or change access at any time.')}</small></aside></div></div>
</div></section>'''
    close=f'''<section class="core-close"><div class="core-close-inner wrap"><div><p class="eyebrow">{t('一个中心，多次使用','ONE CENTER, MANY AI TASKS')}</p><h2>{t('接住你对 AI 说过的话，<br>也管住 AI 可以知道什么。','Keep what you tell AI.<br>Control what AI can know next.')}</h2><p>{t('这是 PAIA 的核心产品模型。Private Beta 的实际可用范围与规划项会明确区分，以当前状态页为准。','This is PAIA’s core product model. Current Private Beta capabilities and planned features are kept distinct; see the status page for what is available now.')}</p><div class="actions">{button('beta.html',t('申请内测','Get early access'))}{a('status.html',t('查看当前状态','See current status'),'text-link')}</div></div><div class="core-close-mark"><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" alt="PAIA" loading="lazy" decoding="async"></div></div></section>'''
    return hero+overview+library+prompts+topics+context+close
