"""Public website only. The choreography illustrates explicit context selection.
Fictional inputs never imply connected accounts, live AI, or extension certification.
"""
from html import escape


def icon(name, cls='art-icon'):
    """Optically balanced vector family; brand marks are separate immutable assets."""
    paths = {
        'collect': '<path class="icon-paper" d="M17 7h23l9 9v23M17 7a5 5 0 0 0-5 5v37a5 5 0 0 0 5 5h14M39 7v12h10M21 25h18M21 33h12"/><circle class="icon-lens" cx="39" cy="44" r="10"/><path d="m46 51 9 9"/>',
        'connect': '<path class="icon-thread" d="m24 29 17-13M24 37l17 12"/><circle cx="16" cy="33" r="10"/><circle class="icon-node" cx="47" cy="12" r="7"/><circle class="icon-node" cx="47" cy="53" r="7"/>',
        'reuse': '<path class="icon-thread" d="M10 50C27 44 36 33 49 13M32 15l19-5-4 19"/><path class="icon-pen" d="m12 36 12 9-10 13a5 5 0 0 1-8-6z"/>',
        'note': '<path d="M16 7h23l9 9v41H16zM39 7v12h9M23 28h18M23 36h18M23 44h12"/>',
        'search': '<circle cx="27" cy="27" r="14"/><path d="m38 38 14 14"/>',
        'arrow': '<path d="M12 32h38M36 18l14 14-14 14"/>',
        'down': '<path d="M32 10v41M18 37l14 14 14-14"/>',
        'topic': '<circle cx="18" cy="32" r="10"/><circle cx="45" cy="13" r="6"/><circle cx="45" cy="51" r="6"/><path d="m26 26 14-10M26 38l14 10"/>',
        'shield': '<path d="m32 7 20 8v17c0 12-10 20-20 25-10-5-20-13-20-25V15zM23 32l6 6 13-15"/>',
        'copy': '<rect x="22" y="21" width="29" height="34" rx="5"/><path d="M39 21V10H11v33h11"/>',
        'mark': '<path d="M12 54 29 10h8L20 54zM33 33h9l12 21H44z" fill="currentColor" stroke="none"/>',
    }
    return f'<svg class="{cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'


def render(t, a, button, statusmini):
    def brand(name):
        return f'<img class="provider-mark" src="/assets/website/marks/{name}.svg" width="26" height="26" alt="" decoding="async">'

    def card(name, position, body, mark, extra='', date=''):
        return f'''<article class="input-card art-node {position}" data-arrival="{position}">
<div class="card-source">{mark}<span>{name}</span>{extra}</div>
{f'<time>{date}</time>' if date else ''}<p>{body}</p></article>'''

    planned = f'<span class="planned">{t("规划中", "Planned")}</span>'
    hero = f'''<section class="hero-sequence" data-hero-sequence aria-labelledby="hero-title">
<div class="hero-stage"><div class="hero-inner wrap">
<div class="hero-copy"><h1 id="hero-title">{t('让你对 AI 说过的话，<br><em>成为下一次的起点。</em>', 'Turn what you’ve<br>said into <em>what’s next.</em>')}</h1>
<p class="hero-description">{t('留下你的输入。<br>选择下一次 AI 需要的上下文。', 'Keep what you tell AI.<br>Choose the context for what comes next.')}</p>
<div class="hero-actions">{button('beta.html', t('申请内测', 'Get early access'))}{a('demo.html', t('体验示例', 'Try the example'), 'text-link')}</div>
<p class="hero-scope">{t('桌面 Chrome · ChatGPT · 邀请制内测', 'Chrome desktop · ChatGPT · Private beta')}</p></div>
<div class="collection" id="collection" aria-label="{t('输入与已选上下文的概念示意', 'Illustration of inputs and selected context')}"><div class="collection-canvas">
<div class="context-light art-node" data-arrival="field" aria-hidden="true"></div>
<svg class="collection-lines art-node" data-arrival="lines" viewBox="0 0 680 650" fill="none" aria-hidden="true">
<defs><linearGradient id="signal-ink"><stop stop-color="#b9c6be"/><stop offset=".65" stop-color="#4a716a"/><stop offset="1" stop-color="#c5d4cb"/></linearGradient></defs>
<g stroke="url(#signal-ink)" stroke-width="1.2"><path pathLength="1" d="M210 227C255 227 224 331 286 331"/><path pathLength="1" d="M461 190C405 190 454 263 416 280"/><path pathLength="1" d="M212 458C300 458 236 380 286 380"/><path pathLength="1" d="M514 468C526 425 488 424 488 393"/></g>
<g fill="#55756c"><circle cx="210" cy="227" r="3"/><circle cx="461" cy="190" r="3"/><circle cx="212" cy="458" r="3"/><circle cx="514" cy="468" r="3"/></g></svg>
{card('ChatGPT', 'card-gpt', t('“第一版只帮助创作者找回已有素材，不做内容生成。”', '“Help creators find what they already have. Don’t generate more.”'), brand('openai'), date='12 Aug 2026')}
{card(t('想法', 'Thought'), 'card-note', t('已决定：先验证素材找回，暂不做多人协作。', 'Decided: test retrieval first. Leave collaboration for later.'), icon('note', 'provider-mark'))}
{card('Claude', 'card-claude', t('“评估原型时，保留之前确定的产品边界。”', '“Review the prototype using the boundaries we already agreed on.”'), brand('claude'), planned)}
{card('Gemini', 'card-gemini', t('“推迟移动端，会如何影响第一版？”', '“What changes if mobile comes later?”'), brand('gemini'), planned)}
<div class="context-sheets art-node" data-arrival="sheets" aria-hidden="true"><i></i><i></i></div>
<article class="synthesis-card art-node" data-arrival="paia"><div class="card-source">{icon('mark', 'provider-mark')}<span class="small-wordmark">PAIA</span></div>
<h2>{t('下一次任务的上下文', 'Context for your next task')}</h2><p>{t('独立创作者。<br>先找回已有素材。<br>暂不做多人协作。', 'Independent creators.<br>Recover existing material.<br>Leave collaboration for later.')}</p>
<div class="synthesis-bottom"><span>{t('3 条已选输入', '3 selected inputs')}</span>{a('demo.html', icon('arrow','mini-icon')+'<span class="visually-hidden">'+t('打开示例','Open example')+'</span>', 'icon-link')}</div></article>
</div><p class="collection-caption">{t('概念示意 · Claude / Gemini 接入规划中', 'Illustration · Claude / Gemini capture planned')}</p></div>
<a class="scroll-cue" href="#collection" data-scroll-collection>{icon('down','mini-icon')}<span>{t('查看输入如何汇集', 'See your inputs come together')}</span></a>
<button class="motion-toggle" data-motion-toggle type="button" aria-pressed="false">{t('减少动效', 'Reduce motion')}</button>
</div></div></section>'''

    benefits = f'''<section id="how" class="benefits wrap" aria-label="{t('PAIA 的核心价值','What PAIA makes possible')}">
<article data-reveal>{icon('collect')}<h2>{t('找回输入', 'Recover your inputs.')}</h2><p>{t('不必翻遍每个对话窗口。', 'Without opening every old conversation.')}</p></article>
<article data-reveal>{icon('connect')}<h2>{t('关联同一主题', 'Connect a topic.')}</h2><p>{t('把不同会话的相关表达放到一起。', 'Related inputs, across conversations.')}</p></article>
<article data-reveal>{icon('reuse')}<h2>{t('复用所选上下文', 'Reuse your context.')}</h2><p>{t('只带上这次任务需要的材料。', 'Only the material this task needs.')}</p></article></section>'''

    records = [
        ('goal',t('产品方向','Direction'),t('第一版帮助创作者找回已有素材，不生成新内容。','Help creators recover existing material, not generate new content.'),True),
        ('audience',t('目标用户','Audience'),t('面向已经有持续创作项目的独立创作者。','Independent creators with ongoing projects.'),True),
        ('scope',t('实现边界','Scope'),t('先验证找回效率，暂不做多人协作。','Test retrieval first. Leave collaboration out for now.'),True),
        ('research',t('研究问题','Research'),t('创作者在哪些环节重复寻找自己已经有的素材？','Where do creators look again for material they already have?'),False),
        ('later',t('稍后考虑','Later'),t('在核心体验成立之后，再考虑移动端。','Consider mobile after the core experience is useful.'),False),
    ]
    fragments = ''.join(f'''<button class="v3-fragment" data-v3-fragment data-fragment-id="{id}" disabled aria-pressed="{str(selected).lower()}"><span class="fragment-check" aria-hidden="true"></span><span><strong>{title}</strong><span class="v3-fragment-copy">{text}</span></span></button>''' for id,title,text,selected in records)
    views = [('inputs', t('输入','Inputs')), ('topic', t('主题','Topic')), ('context', t('复用','Reuse'))]
    tabs = ''.join(f'<button role="tab" id="mini-tab-{id}" aria-controls="mini-panel-{id}" data-mini-tab="{id}" disabled aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}">{label}</button>' for i,(id,label) in enumerate(views))
    wires = ''.join(f'<path data-context-wire="{id}" class="{"is-selected" if selected else ""}" pathLength="1" d="M8 {38+i*45}C72 {38+i*45} 27 126 107 126"/>' for i,(id,_,_,selected) in enumerate(records))
    product = f'''<section class="product-section" id="example" aria-labelledby="product-title">
<div class="product-inner wrap"><div class="product-copy" data-reveal><h2 id="product-title">{t('决定这次，<br><em>AI 需要知道什么。</em>', 'Choose what<br><em>AI sees next.</em>')}</h2><p>{t('选择几条输入，看右侧上下文随之改变。', 'Select an input. Watch your context change.')}</p></div>
<div class="product-display" data-theatre><div class="app-shell" data-v3-context data-language="{t('zh','en')}">
<header class="app-toolbar"><span class="app-brand">{icon('mark','mini-icon')}PAIA</span><div role="tablist" aria-label="{t('示例视图','Example views')}" aria-orientation="horizontal">{tabs}</div><span class="app-project">{t('创作工具项目','Creator tool project')}</span></header>
<div class="app-workspace"><div class="app-body">
<section id="mini-panel-inputs" role="tabpanel" aria-labelledby="mini-tab-inputs" data-mini-panel="inputs"><label class="app-search">{icon('search','mini-icon')}<input data-mini-search type="search" disabled aria-label="{t('搜索示例输入','Search sample inputs')}" placeholder="{t('搜索示例输入','Search sample inputs')}"></label><div class="app-inputs">{fragments}</div><p class="mini-empty" data-mini-empty hidden>{t('没有匹配的输入。','No matching inputs.')}</p></section>
<section id="mini-panel-topic" role="tabpanel" aria-labelledby="mini-tab-topic" data-mini-panel="topic" hidden><div class="topic-orbit">{icon('connect')}<h3>{t('第一版产品范围','First release scope')}</h3><p>{t('产品方向、用户与边界，<br>来自同一个持续项目。','Direction, audience and scope,<br>from one ongoing project.')}</p><div class="topic-members"><span>{t('产品方向','Direction')}</span><span>{t('目标用户','Audience')}</span><span>{t('实现边界','Scope')}</span></div></div><p class="app-note">{t('固定示例主题，不在本页运行自动分类。','A fixed example topic, not automatic classification.')}</p></section>
<section id="mini-panel-context" role="tabpanel" aria-labelledby="mini-tab-context" data-mini-panel="context" hidden><div class="reuse-instruction">{icon('reuse')}<h3>{t('确认之后，再交给 AI。','Review it before sharing.')}</h3><p>{t('右侧只包含你选中的材料。复制不会自动发送；在完整示例中可以继续编辑。','The preview contains only your selection. Copying does not send it to AI. Continue in the full example to edit it.')}</p>{a('demo.html',t('编辑完整上下文','Edit the full context'),'text-link')}</div></section>
</div><svg class="context-wires" viewBox="0 0 115 260" fill="none" aria-hidden="true">{wires}<circle cx="107" cy="126" r="3"/></svg>
<aside class="context-preview" aria-labelledby="preview-title"><div class="context-preview-head">{icon('reuse','mini-icon')}<span>{t('AI 上下文','AI context')}</span><span class="selection-count" data-v3-count aria-live="polite">3 / 5</span></div><h3 id="preview-title">{t('评估第一版范围','Review the first release')}</h3><div class="context-list" data-v3-list>{"".join(f"<span>{escape(text)}</span>" for _,_,text,selected in records if selected)}</div>
<div class="context-controls"><button type="button" class="button button-copy" data-mini-copy disabled>{icon('copy','mini-icon')}<span>{t('复制上下文','Copy context')}</span></button><p class="copy-status" data-copy-status role="status" aria-live="polite"></p></div><p class="v3-choice-boundary">{t('只包含你选中的内容。','Only what you select.')}</p></aside></div>
</div><noscript><p class="app-note">{t("启用 JavaScript 可更改选择；上方是三条示例输入的静态预览。", "Enable JavaScript to change the selection. Above is a static preview of three sample inputs.")}</p></noscript><div class="example-foot"><p class="example-caption">{t('交互示例 · 虚构数据 · 不连接档案，不调用 AI','Interactive example · Fictional data · No archive or AI connection')}</p>{a('demo.html',t('打开完整示例','Open the full example')+icon('arrow','mini-icon'),'text-link')}</div></div>
</div></section>'''

    close = f'''<section class="closing" aria-labelledby="closing-title"><div class="closing-inner wrap"><div class="closing-copy" data-reveal><h2 id="closing-title">{t('下一次 AI 对话，<br><em>带上你的积累。</em>', 'Bring your context.<br><em>Start the next conversation.</em>')}</h2><p>{t('从桌面 Chrome 中的 ChatGPT 开始。','Start with ChatGPT in desktop Chrome.')}</p><div class="closing-actions">{button('beta.html', t('申请内测','Get early access'))}{a('how-it-works.html',t('了解如何使用','How it works'),'text-link')}</div></div></div></section>'''
    return hero + benefits + product + close
