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
    benefits=f'''<section class="benefits wrap" aria-label="{t('PAIA 的核心价值','What PAIA makes possible')}">
<article>{icon('collect')}<h2>{t('汇集你的输入','Bring your inputs together.')}</h2><p>{t('不必在每个对话窗口重新找起。','Your words, beyond a single chat.')}</p></article>
<article>{icon('connect')}<h2>{t('接上同一个问题','Connect related thinking.')}</h2><p>{t('把不同时间的表达放回同一主题。','One topic. Across conversations.')}</p></article>
<article>{icon('reuse')}<h2>{t('用于下一次 AI','Use it in your next AI task.')}</h2><p>{t('你选择材料，决定带走什么。','Choose the context you take forward.')}</p></article></section>'''
    names=[t('留下','Capture'),t('关联','Connect'),t('整理','Refine'),t('复用','Reuse')]
    desc=[t('经你同意，保存支持的用户输入。','Save supported inputs with your consent.'),t('将相关输入放进同一个主题。','Bring related inputs into a topic.'),t('自行修改，或主动使用 AI 整理。','Edit yourself, or choose AI organization.'),t('预览、复制，用于下一次任务。','Review and copy into your next task.')]
    process=f'''<section class="process wrap" id="how"><div class="section-top"><h2>{t('从输入，到下一次任务。','From an input to your next task.')}</h2>{a('how-it-works.html',t('了解具体过程','How it works'),'text-link')}</div><ol class="process-steps">{''.join(f'<li><span class="step-number">{i+1}</span><h3>{n}</h3><p>{d}</p></li>' for i,(n,d) in enumerate(zip(names,desc)))}</ol></section>'''
    records=[
       ('goal',t('产品方向','Direction'),t('第一版帮助创作者找回已有素材，不生成新内容。','Help creators recover existing material, not generate new content.'),True),
       ('audience',t('目标用户','Audience'),t('面向已经有持续创作项目的独立创作者。','Independent creators with ongoing projects.'),True),
       ('scope',t('实现边界','Scope'),t('先验证找回效率，暂不做多人协作。','Test retrieval first. Leave collaboration out for now.'),True),
       ('research',t('研究问题','Research'),t('创作者在哪些环节重复寻找自己已经有的素材？','Where do creators look again for material they already have?'),False),
       ('later',t('稍后考虑','Later'),t('在核心体验成立之后，再考虑移动端。','Consider mobile after the core experience is useful.'),False)]
    fragmenthtml=''.join(f'<button class="v3-fragment" data-v3-fragment data-fragment-id="{id}" aria-pressed="{str(selected).lower()}"><span class="fragment-check" aria-hidden="true"></span><span><strong>{title}</strong><span class="v3-fragment-copy">{text}</span></span></button>' for id,title,text,selected in records)
    views=[('inputs',t('输入','Inputs'),'note'),('topic',t('主题','Topic'),'topic'),('context',t('AI 上下文','AI context'),'reuse')]
    product=f'''<section class="product-section" id="example"><div class="product-inner wrap"><div class="product-copy"><h2>{t('你的上下文。<br><em>交给下一次 AI。</em>','Your context.<br><em>Ready for AI.</em>')}</h2><p>{t('试着选择几条输入。<br>只带上这次任务需要的内容。','Try selecting a few inputs.<br>Take only what this task needs.')}</p>{a('demo.html',t('打开完整示例','Open the full example'),'button')}</div>
<div class="product-display"><div class="app-shell" data-v3-context data-language="{t('zh','en')}"><aside class="app-sidebar"><span class="small-wordmark">PAIA</span><div role="tablist" aria-label="{t('示例视图','Example views')}" aria-orientation="vertical">{''.join(f'<button role="tab" id="mini-tab-{id}" aria-controls="mini-panel-{id}" data-mini-tab="{id}" aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}">{icon(ico,"mini-icon")}{label}</button>' for i,(id,label,ico) in enumerate(views))}</div>{a('principles.html',icon('shield','mini-icon')+t('数据与权限','Data & permissions'),'app-data-link')}</aside><div class="app-body"><div class="app-heading"><h3>{t('创作工具','Creator tool')}</h3><span class="selection-count" data-v3-count aria-live="polite">3 / 5</span></div>
<section id="mini-panel-inputs" role="tabpanel" aria-labelledby="mini-tab-inputs" data-mini-panel="inputs"><label class="app-search">{icon('search','mini-icon')}<input data-mini-search type="search" aria-label="{t('搜索示例输入','Search sample inputs')}" placeholder="{t('搜索这些输入','Search these inputs')}"></label><div class="app-inputs">{fragmenthtml}</div><p class="mini-empty" data-mini-empty hidden>{t('没有匹配的输入。','No matching inputs.')}</p></section>
<section id="mini-panel-topic" role="tabpanel" aria-labelledby="mini-tab-topic" data-mini-panel="topic" hidden><div class="topic-orbit">{icon('connect')}<h4>{t('第一版产品范围','First release scope')}</h4><p>{t('产品方向、目标用户与实现边界，<br>来自同一个持续项目。','Direction, audience and scope,<br>from one ongoing project.')}</p></div><p class="app-note">{t('固定示例主题，不在本页运行自动分类。','A fixed example topic, not automatic classification.')}</p></section>
<section id="mini-panel-context" role="tabpanel" aria-labelledby="mini-tab-context" data-mini-panel="context" hidden><h4>{t('这次带上的材料','Context for this task')}</h4><div class="context-list" data-v3-list></div>{a('demo.html',t('编辑、预览与复制','Edit, review & copy'),'text-link')}</section>
<p class="v3-choice-boundary">{t('只包含你选中的内容。','Only what you select.')}</p></div></div><p class="example-caption">{t('交互示例 · 虚构数据 · 不连接私人档案，不调用 AI','Interactive example · Fictional data · No archive connection or AI calls')}</p></div></div></section>'''
    close=f'''<section class="closing"><div class="closing-inner wrap"><div class="closing-copy"><h2>{t('下一次，<br><em>不从零开始。</em>','Your next conversation.<br><em>Not from zero.</em>')}</h2><p>{t('从你已经在使用的 ChatGPT 开始。','Start with the ChatGPT conversations you already have.')}</p>{button('beta.html',t('申请内测','Get early access'))}</div><img class="closing-image" src="/assets/website/media/arch.webp" width="770" height="626" alt="" loading="lazy" decoding="async"></div></section>'''
    return hero+benefits+process+product+close
