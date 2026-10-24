"""Scoped V12 outer finish and honest demo-first release entry.
Existing content/form owners stay intact; this module never changes availability.
"""
from pathlib import Path
LINK='<link rel="stylesheet" href="/assets/website/atelier/support12.css?v=20261024-v12">'
MARKER='data-site-polish="12"'

def decorate(document:str,page:str)->str:
    if page in ('index.html','demo.html'):
        return document
    document=document.replace('</head>',LINK+'\n</head>',1)
    document=document.replace('<body ',f'<body {MARKER} ',1)
    return document

def undecorate(document:str)->str:
    """Used only to prove untouched interior copy/links/form markup invariance."""
    return document.replace(LINK+'\n','',1).replace(MARKER+' ','',1)

def download(t,a,button,installation):
    from html import escape
    target=installation()['chrome_store_url']
    if target:
        # The same verified-only activation rule; no guessed store or download.
        action=f'<a class="button release-install" href="{escape(target,quote=True)}" rel="noopener noreferrer">{t("添加到 Chrome","Add to Chrome")} <span aria-hidden="true">↗</span></a>'
        available=t('在 Chrome 网上应用店查看权限并安装。','Review permissions and install from the Chrome Web Store.')
        primary=action
        secondary=a('demo.html',t('先体验产品示例','Explore the example first'),'text-link')
    else:
        action=f'<button type="button" class="release-install p12-install-pending" disabled aria-describedby="install-availability">{t("添加到 Chrome","Add to Chrome")} <span aria-hidden="true">↗</span></button>'
        available=t('公开安装入口尚未开放。','Public installation is not available yet.')
        primary=a('demo.html',t('先体验 PAIA','Try PAIA first')+' <span aria-hidden="true">↗</span>','button p12-try-primary')
        secondary=''
    states=[
      (t('找回一句话','Find a thought'),t('从记得的一个词开始，找到自己的表达。','Start with one word you remember.'),'input-library'),
      (t('沿着主题继续','Continue a topic'),t('看看先前的打算，和后来改变的想法。','See the first intention and what changed.'),'thought-library'),
      (t('把好表达接着用','Use your words again'),t('放进下一次草稿，发送仍由你决定。','Add to your next draft. You decide when to send.'),'prompt-reuse')]
    return f'''<section class="beta-intro release-intro wrap p12-release-intro"><div><p class="eyebrow">YOUR WORDS. YOUR NEXT STEP.</p><h1>{t('先认识 PAIA，<br>再从这里开始。','Meet PAIA.<br>Begin here.')}</h1></div><div><p class="lead">{t('留住已经说过的话，<br>接上还想继续的思考。','Keep the words you have already said.<br>Pick up the thinking you want to continue.')}</p><p class="release-platform">Chrome · ChatGPT</p></div></section>
<section class="release-layout wrap p12-release-layout"><article class="release-download" data-install-available="{str(bool(target)).lower()}"><div class="p12-release-icon"><img src="/assets/website/brand/paia-symbol-soft-blue.svg" alt="" width="52" height="52"><span class="release-app-wordmark">PAIA</span></div><h2>{t('给自己的表达，<br>一个继续的地方。','A place for your words.<br>And what comes next.')}</h2><p>{t('适用于桌面 Chrome，与 ChatGPT 网页版配合使用。','For Chrome on desktop, alongside ChatGPT on the web.')}</p><p id="install-availability" class="release-availability">{available}</p><div class="release-install-actions">{primary}{secondary}</div><p class="p12-example-boundary">{t('网页示例无需注册，不连接你的账号。','No signup. The example does not connect to your account.')}</p>{('<div class="p12-install-later">'+action+'<span>'+t('正式发布后在这里提供官方入口。','The official entry will appear here when released.')+'</span></div>') if not target else ''}<p class="release-permission-link">{a('principles.html',t('了解安装与数据权限','Installation and data permissions'),'text-link')}</p></article>
<aside class="release-first-steps p12-first-experience"><p class="eyebrow">{t('现在就能体验','EXPLORE RIGHT NOW')}</p><ol>{''.join('<li>'+a('demo.html',f'<h3>{title}<span aria-hidden="true">↗</span></h3><p>{desc}</p>','p12-experience-link','#'+anchor)+'</li>' for title,desc,anchor in states)}</ol><div class="release-help-link">{a('help.html',t('阅读使用帮助','Read the help'),'text-link')}{a('contact.html',t('联系 PAIA','Contact PAIA'),'text-link')}</div></aside></section>'''
