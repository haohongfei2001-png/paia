"""PAIA flagship site. Source of all routes; generated HTML is never hand edited."""
from pathlib import Path
from html import escape
import json
import sys
from flagship_ui import text, href, icon, workspace, prompts, context_cards
from launch_pages import download, help_page, contact

ROOT=Path(__file__).resolve().parents[1]
BASE='https://inputarchive.com'
ROUTES=['index.html','how-it-works.html','use-cases.html','about.html','demo.html','download.html','help.html','contact.html','blog.html','article-beliefs.html','article-context.html','article-reuse.html','principles.html','privacy-policy.html','terms.html','beta.html','status.html','thanks.html','404.html']
NOINDEX={'demo.html','beta.html','status.html','thanks.html','404.html'}


def home(lang):
    t=lambda z,e:text(lang,z,e)
    return f'''<section class="hero wrap"><div class="hero-heading"><h1>{t('你说过的，<br>还有下文。','Your words.<br>Still becoming.')}</h1><div class="hero-introduction"><p class="hero-lead">{t('把你对 AI 的表达，<br>留成自己的积累。','A place for what you tell AI.<br>And what you make of it next.')}</p><p>{t('找回原话，让思考接着发生。<br>哪些可以交给 AI，由你决定。','Find your words. Keep developing your ideas.<br>Choose what AI gets to know.')}</p><div class="actions"><a class="button" href="{href(lang,'demo.html')}">{t('亲自试一试','Try it for yourself')} {icon('arrow')}</a><a class="text-link" href="{href(lang,'how-it-works.html')}">{t('认识 PAIA','Meet PAIA')}</a></div></div></div>
    <div class="hero-product">{workspace(lang,'hero')}</div><div class="hero-caption"><span>Personal AI Input Archive</span><span>{t('为自己的表达，留一个可以继续的地方。','A place to return to. A place to continue.')}</span></div></section>

    <section class="continuity wrap"><div class="continuity-title"><h2>{t('对话会结束。<br>你的思考不必。','The chat ends.<br>Your thinking does not.')}</h2><p>{t('一个问题，一次犹豫，一个还没想完整的想法。它们不只是通向 AI 答案的过程，也构成了你自己的思考。','A question. A hesitation. An idea you have not quite worked out. Your side of a conversation is more than a way to get an answer. It is your thinking taking shape.')}</p></div><div class="continuity-lines"><div><span>{t('留下','Keep')}</span><p>{t('你当时说了什么。','What you actually said.')}</p><small>Input Archive</small></div><div><span>{t('重读','Revisit')}</span><p>{t('那些一直在想的事。','What you keep coming back to.')}</p><small>Thought Library</small></div><div><span>{t('选择','Choose')}</span><p>{t('哪些值得带入下一次。','What belongs in what comes next.')}</p><small>AI Context</small></div></div></section>

    <section class="archive-story wrap"><div class="section-copy"><span class="space-label">{icon('archive')} Input Archive</span><h2>{t('你可以改变想法。<br>原话依然在。','Change your mind.<br>Keep your original words.')}</h2><p>{t('找回某次对话里真正说过的话，核对来源，编辑现在的工作文字。你不必为了继续思考，抹去曾经的自己。','Find what you actually said, return to its source, and edit the version you work with today. Continuing a thought does not require erasing where it began.')}</p><a class="text-link" href="{href(lang,'demo.html')}#archive">{t('试着改写一句话','Try editing an expression')} {icon('arrow')}</a></div><div class="source-composition"><div class="source-working"><span>{t('现在的工作文字','Your working text')}</span><p>{t('先把“找回来”做好。<br>生成更多，可以稍后再想。','Make it easy to find again.<br>Think about generating more later.')}</p><span class="source-edited">{icon('edit')}{t('为眼前的任务重新表达','Reworded for the task at hand')}</span></div><div class="source-original"><span>{t('原始来源','Original source')}</span><p>{t('“而是让已经说过的话，在下一次需要时，还找得到。”','“It is one that helps them find what they have already said, when they need it again.”')}</p><small>{t('虚构示例 · 原话节选，来源独立保留','Fictional example · Exact source excerpt')}</small></div></div></section>

    <section class="thought-story"><div class="wrap thought-story-inner"><div class="thought-statement"><span class="space-label">{icon('thought')} Thought Library</span><h2>{t('散落在不同对话。<br>也属于同一个你。','Across conversations.<br>Still your own train of thought.')}</h2></div><div class="thought-story-body"><p>{t('把相关的表达放回自己的主题。读到当时的判断，也读到后来的迟疑。无需被整理成一个永远正确、始终一致的人。','Bring related expressions into your own topics. Revisit an earlier decision and a later hesitation. You do not have to become a perfectly consistent version of yourself.')}</p><a class="text-link" href="{href(lang,'use-cases.html')}">{t('看看它可以用在哪里','See where it fits')} {icon('arrow')}</a></div><div class="thought-fragments"><div class="fragment-lead"><span>{t('一个持续的主题','An ongoing topic')}</span><h3>{t('做一个值得用的产品','Making something worth using')}</h3></div><div class="fragment"><p>{t('“我原来以为，功能越多越好。”','“I used to think more features meant a better product.”')}</p><span>{t('最初的想法','An earlier thought')}</span></div><div class="fragment"><p>{t('“现在，我更在意它是否值得每天打开。”','“Now I care more about whether I would open it every day.”')}</p><span>{t('后来的一次思考','A later reflection')}</span></div></div><p class="thought-fixture-note">{t('示例表达。整理保留条件、不确定性与来源。','Sample expressions. Organization preserves conditions, uncertainty, and sources.')}</p></div></section>

    <section class="prompt-section wrap"><div class="section-copy"><span class="space-label">{icon('return')}{t('个人提示词','Personal prompts')}</span><h2>{t('那些好用的话，<br>不必再打一次。','Good words.<br>Ready again.')}</h2><p>{t('有些表达，已经很适合你。把它们留在输入框旁，需要时点一下，接着写。草稿保留，发送仍由你决定。','Some expressions already work for you. Keep them beside the composer. Pick one, keep your draft, and carry on. You decide when to send.')}</p><p class="interaction-invite">{t('点开右侧的小入口，试着填入一句。','Open the small control and try inserting a line.')}</p></div>{prompts(lang,'home-prompt')}</section>

    <section class="context-section wrap"><div class="context-heading"><span class="space-label">{icon('context')} AI Context</span><h2>{t('让 AI 了解你，<br>从你的选择开始。','Let AI know you.<br>On your terms.')}</h2><p>{t('你的信息、规则、现在与个人主题，各有自己的边界。无需交出全部档案，才能让下一次对话更了解你。','Your background, rules, current work and personal topics each have their own boundary. Understanding does not need to mean access to everything.')}</p></div><div class="context-home-preview">{context_cards(lang,'home-context')}</div><div class="context-footnote"><span>{t('所有开关只改变本页示例，不连接真实 AI。','These switches only change this example. No live AI is connected.')}</span><a class="text-link" href="{href(lang,'principles.html')}">{t('了解数据与权限','Data and permissions')} {icon('arrow')}</a></div></section>

    <section class="origin-close wrap"><div class="origin-close-copy"><h2>{t('有些话，<br>值得为自己留下。','Some words<br>are worth keeping for yourself.')}</h2><p>{t('PAIA 源于一幅关于女孩和旧信箱的画。<br>关于表达，也关于我们无法知道的部分。','PAIA began with a drawing of a girl and an old mailbox.<br>About expression, and the things we cannot know.')}</p><div class="actions"><a class="button" href="{href(lang,'demo.html')}">{t('打开交互演示','Try the interactive demo')}</a><a class="text-link" href="{href(lang,'about.html')}">{t('读一读 PAIA 的起点','Read the story behind PAIA')}</a></div></div><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" loading="lazy" alt="{t('作者原作：女孩、手中的信与旧信箱','The original artwork: a girl, a letter, and an old mailbox')}"></section>

'''


def demo(lang):
    t=lambda z,e:text(lang,z,e)
    return f'''<section class="demo-intro wrap"><div><h1>{t('接着这段话，<br>亲自试一试。','Make yourself at home.<br>Try a thought of your own.')}</h1></div><div><p>{t('找回、编辑、按主题阅读，再决定开放多少。这里的每一段文字都是虚构示例。','Find, edit, revisit a topic, and choose what to share. Every expression here is a fictional example.')}</p><p class="demo-privacy">{t('不连接个人档案或 AI。修改只在本页，刷新即清除。','No personal archive or AI connection. Changes stay in this page and clear on reload.')}</p></div></section><section class="demo-stage wrap" id="archive">{workspace(lang,'demo',True)}</section><section class="demo-prompt-section wrap" id="prompts"><div class="section-copy"><h2>{t('再试一次，<br>用自己的好表达。','Try your own words,<br>one more time.')}</h2><p>{t('先在输入框里写一点，再选一句提示词。你的草稿不会被替换。','Start a draft in the composer, then pick a prompt. Your draft will not be replaced.')}</p></div>{prompts(lang,'demo-prompt')}</section><section class="demo-end wrap"><p>{t('这是一段产品交互示例。真实安装与服务开放情况，以获取页面为准。','This is a product interaction example. Check Get PAIA for actual installation and service availability.')}</p><a class="button secondary" href="{href(lang,'download.html')}">{t('查看获取方式','See how to get PAIA')}</a></section>'''


def route_content(page,lang):
    t=lambda z,e:text(lang,z,e)
    def a(p,label,cls='',anchor=''): return f'<a class="{cls}" href="{href(lang,p)}{anchor}">{label}</a>'
    def button(p,label,cls='button',anchor=''): return a(p,label,cls,anchor)
    if page=='index.html': return ('PAIA — '+t('你说过的，还有下文。','Your words. Still becoming.'),t('把你对 AI 的表达留成自己的积累。找回原话、继续思考、复用自己的提示词，并自主决定 AI 的读取范围。','Keep your side of the conversation. Find your words, develop your ideas, reuse your prompts, and choose what AI can read.'),home(lang))
    if page=='demo.html': return ('PAIA — '+t('交互演示','Interactive demo'),t('使用虚构资料，体验 PAIA 的三个空间与提示词复用。','Try PAIA’s three spaces and prompt reuse with fictional material.'),demo(lang))
    if page in ('download.html','beta.html'): return (t('获取 PAIA','Get PAIA'),t('查看真实的安装开放状态与使用方式。','Check actual installation availability and how to begin.'),download(t,a,button))
    if page in ('help.html','status.html'): return ('PAIA — '+t('帮助','Help'),t('安装、保存、复用与权限的清楚答案。','Clear answers about installation, capture, reuse and permissions.'),help_page(t,a,button))
    if page=='contact.html': return (t('联系 PAIA','Contact PAIA'),t('关于使用、数据与权限，或者一个想法。','A question about using PAIA, your data, or an idea.'),contact(t,a,button,'haohongfei2001@gmail.com',BASE+href(lang,'thanks.html')))
    if page in ('privacy-policy.html','terms.html'):
        raw=json.loads((ROOT/'website/flagship_legal.json').read_text())[lang][page]
        return ('PAIA — '+t('隐私政策' if page.startswith('privacy') else '使用条款','Privacy policy' if page.startswith('privacy') else 'Terms'),t('PAIA 的数据与使用边界。','PAIA data and usage boundaries.'),raw)
    if page in ('thanks.html','404.html'):
        is404=page=='404.html'
        title=t('这页没有找到。' if is404 else '你的留言，下一步。','This page was not found.' if is404 else 'After your message.')
        desc=t('链接可能已经变化。你可以从首页继续。' if is404 else '这个页面本身不能确认表单是否送达。请以 FormSubmit 的提交结果为准；有疑问时可以直接写信联系。','The link may have changed. You can continue from home.' if is404 else 'This page alone cannot confirm delivery. Check the FormSubmit result. If you are unsure, contact us by email.')
        return ('PAIA — '+title,desc,f'<section class="return-page wrap"><span>{"404" if is404 else "PAIA"}</span><h1>{title}</h1><p>{desc}</p><div class="actions">{button("index.html",t("回到首页","Back to home"))}{a("contact.html",t("联系 PAIA","Contact PAIA"),"text-link")}</div></section>')
    from flagship_content import render_page
    result=render_page(page,lang)
    if result: return result
    raise ValueError('No content for '+page)


def shell(page,lang,title,description,body):
    t=lambda z,e:text(lang,z,e)
    canonical={'beta.html':'download.html','status.html':'help.html'}.get(page,page)
    nav=[('index.html',t('产品','Product')),('how-it-works.html',t('如何使用','How it works')),('use-cases.html',t('使用场景','Use cases')),('about.html',t('关于','About'))]
    nav_html=''.join(f'<a href="{href(lang,p)}"'+(' aria-current="page"' if canonical==p else '')+f'>{label}</a>' for p,label in nav)
    other=href('en' if lang=='zh' else 'zh',canonical)
    groups=[(t('探索','Explore'),[('demo.html',t('交互演示','Interactive demo')),('how-it-works.html',t('如何使用','How it works')),('use-cases.html',t('使用场景','Use cases')),('download.html',t('获取 PAIA','Get PAIA'))]),(t('认识 PAIA','Meet PAIA'),[('about.html',t('品牌故事','Our story')),('blog.html',t('产品手记','Product notes')),('help.html',t('使用帮助','Help')),('contact.html',t('联系','Contact'))]),(t('属于你的','Yours to control'),[('principles.html',t('数据与权限','Data and permissions')),('privacy-policy.html',t('隐私政策','Privacy policy')),('terms.html',t('使用条款','Terms'))])]
    return f'''<!doctype html>
<html lang="{'zh-CN' if lang=='zh' else 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title><meta name="description" content="{escape(description,quote=True)}"><meta name="theme-color" content="#ffffff"><meta name="referrer" content="strict-origin-when-cross-origin">{'<meta name="robots" content="noindex,follow">' if page in NOINDEX else ''}<link rel="canonical" href="{BASE+href(lang,canonical)}"><link rel="alternate" hreflang="en" href="{BASE+href('en',canonical)}"><link rel="alternate" hreflang="zh-Hans" href="{BASE+href('zh',canonical)}"><link rel="alternate" hreflang="x-default" href="{BASE+href('en',canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="PAIA"><meta property="og:title" content="{escape(title,quote=True)}"><meta property="og:description" content="{escape(description,quote=True)}"><meta property="og:url" content="{BASE+href(lang,canonical)}"><meta property="og:image" content="{BASE}/assets/website/og-{lang}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/website/brand/paia-favicon-soft-blue.svg" type="image/svg+xml"><link rel="icon" href="/assets/website/brand/paia-favicon-soft-blue-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/assets/website/brand/paia-app-soft-blue-180.png"><link rel="stylesheet" href="/assets/website/flagship.css"><link rel="stylesheet" href="/assets/website/flagship-pages.css"><link rel="stylesheet" href="/assets/website/flagship-personal.css"><script src="/assets/website/flagship.js" defer></script><script src="/assets/website/flagship-personal.js" defer></script>{'<script src="/assets/website/flagship-contact.js" defer></script>' if page=='contact.html' else ''}</head>
<body data-page="{page}" data-language="{lang}" data-design="flagship-20261021"><a class="skip-link" href="#main">{t('跳到正文','Skip to content')}</a>
<header class="site-header"><div class="header-inner"><a class="wordmark" href="{href(lang)}" aria-label="{t('PAIA 首页','PAIA home')}"><img src="/assets/website/brand/paia-symbol-soft-blue.svg" width="32" height="32" alt=""><span>PAIA</span></a><nav class="desktop-nav" aria-label="{t('主导航','Main navigation')}">{nav_html}</nav><div class="header-actions"><a class="language" href="{other}" lang="{'en' if lang=='zh' else 'zh-CN'}" hreflang="{'en' if lang=='zh' else 'zh-Hans'}">{t('EN','中文')}</a><a class="button button-small" href="{href(lang,'demo.html')}">{t('体验 PAIA','Try PAIA')}</a><details class="mobile-menu"><summary aria-label="{t('打开导航菜单','Open navigation menu')}">{icon('menu')}</summary><nav aria-label="{t('移动导航','Mobile navigation')}">{nav_html}<a href="{href(lang,'download.html')}">{t('获取 PAIA','Get PAIA')}</a><a href="{href(lang,'help.html')}">{t('使用帮助','Help')}</a></nav></details></div></div></header>
<main id="main" tabindex="-1">{body}</main>
<footer class="site-footer wrap"><div class="footer-top"><div class="footer-brand"><a class="wordmark" href="{href(lang)}">PAIA</a><p>{t('你的表达，始终属于你。','Your words stay yours.')}</p><span>Personal AI Input Archive</span></div><nav class="footer-nav" aria-label="{t('页脚导航','Footer navigation')}">{''.join('<div><strong>'+label+'</strong>'+''.join(f'<a href="{href(lang,p)}">{name}</a>' for p,name in links)+'</div>' for label,links in groups)}</nav></div><div class="footer-bottom"><span>© 2026 PAIA</span><span>{t('给还在发生的思考。','For thoughts still in the making.')}</span></div></footer>
</body></html>
'''


def build_site(check=False):
    outputs={}
    for lang in ['en','zh']:
        for page in ROUTES:
            title,desc,body=route_content(page,lang)
            html=shell(page,lang,title,desc,body)
            outputs[('zh/' if lang=='zh' else '')+page]=html
            if lang=='en': outputs['en/'+page]=html
    pages=[p for p in ROUTES if p not in NOINDEX]
    outputs['sitemap.xml']='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{BASE+href(lang,p)}</loc></url>' for lang in ['en','zh'] for p in pages)+'</urlset>\n'
    outputs['robots.txt']='User-agent: *\nAllow: /\nSitemap: https://inputarchive.com/sitemap.xml\n'
    if check:
        drift=[p for p,s in outputs.items() if not (ROOT/p).exists() or (ROOT/p).read_text()!=s]
        if drift: raise SystemExit('Generated website drift: '+', '.join(drift))
    else:
        for p,s in outputs.items():
            (ROOT/p).parent.mkdir(parents=True,exist_ok=True)
            (ROOT/p).write_text(s,encoding='utf-8')
        (ROOT/'website/generated-paths.txt').write_text('\n'.join(sorted(outputs))+'\n')
    print(('Checked' if check else 'Generated'),len(outputs),'flagship website files')
    return outputs
