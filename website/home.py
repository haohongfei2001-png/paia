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
    from core import render as render_core
    return hero + render_core(t, a, button, icon)
