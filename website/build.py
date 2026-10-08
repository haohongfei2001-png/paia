from pathlib import Path
from html import escape
import json
import sys
sys.dont_write_bytecode = True
from home import render as render_home
from pages import render_pages
from product_pages import render_demo, render_trust, render_status, render_about
ROOT=Path(__file__).resolve().parents[1]
CHECK='--check' in sys.argv
GENERATED={}
def write(path, content):
    relative=path.relative_to(ROOT).as_posix()
    assert relative in {'index.html','demo.html','beta.html','principles.html','status.html','about.html','privacy-policy.html','terms.html','thanks.html','404.html','how-it-works.html','use-cases.html','blog.html','article-context.html','article-beliefs.html','article-reuse.html','sitemap.xml','robots.txt'} or (relative.split('/')[0] in {'en','zh'} and relative.count('/')==1 and relative.endswith('.html'))
    GENERATED[relative]=content
    if not CHECK:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(content,encoding='utf-8')
BASE='https://inputarchive.com'
EMAIL='haohongfei2001@gmail.com'

def build(lang):
    en=lang=='en'
    prefix='/' if en else '/zh/'
    def t(zh,eng): return eng if en else zh
    def link(page='index.html',anchor=''):
        return prefix + ('' if page=='index.html' else page) + anchor
    def a(page,label,cls='',anchor=''):
        return f'<a class="{cls}" href="{link(page,anchor)}">{label}</a>'
    def button(page,label,cls='button',anchor=''):
        return a(page,label+' <span aria-hidden="true">→</span>',cls,anchor)
    def head(page,title,desc,noindex=False):
        url=BASE+link(page)
        zhurl=BASE+'/zh/'+('' if page=='index.html' else page)
        enurl=BASE+'/'+('' if page=='index.html' else page)
        core_css='<link rel="stylesheet" href="/assets/website/home-core-v1.css?v=7">\n<script src="/assets/website/home-core-v2.js?v=20261008" defer></script>\n' if page in ('index.html','demo.html') else ''
        home_css=core_css+('<link rel="stylesheet" href="/assets/website/home-origin-v7.css?v=71">\n' if page=='index.html' else '')
        return f'''<!doctype html>
<html lang="{'en' if en else 'zh-CN'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc,quote=True)}">
<meta name="theme-color" content="#fdfdfc">
<meta name="referrer" content="strict-origin-when-cross-origin">
{'<meta name="robots" content="noindex,follow">' if noindex else ''}
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="zh-Hans" href="{zhurl}">
<link rel="alternate" hreflang="en" href="{enurl}">
<link rel="alternate" hreflang="x-default" href="{enurl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PAIA">
<meta property="og:locale" content="{'en_US' if en else 'zh_CN'}">
<meta property="og:title" content="{escape(title,quote=True)}">
<meta property="og:description" content="{escape(desc,quote=True)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/assets/website/og-{lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{t('PAIA：说过的，成为下一步的起点。','PAIA: Turn what you’ve said into what’s next.')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{escape(title,quote=True)}">
<meta name="twitter:description" content="{escape(desc,quote=True)}">
<meta name="twitter:image" content="{BASE}/assets/website/og-{lang}.png">
<link rel="icon" href="/assets/website/brand/paia-icon-v1.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/website/brand/paia-icon-v1.png">
<link rel="stylesheet" href="/assets/website/site.css?v=5">
{home_css}<link rel="stylesheet" href="/assets/website/product-consistency.css?v=20261008">
<script src="/assets/website/site.js?v=4" defer></script>
</head>
<body data-page="{page}" data-language="{lang}">
<a class="skip-link" href="#main">{t('跳到正文','Skip to content')}</a>'''
    def header(page):
        other=('/zh/'+('' if page=='index.html' else page)) if en else ('/'+('' if page=='index.html' else page))
        nav=a('index.html',t('首页','Home'))+a('how-it-works.html',t('如何使用','How it works'))+a('use-cases.html',t('使用场景','Use cases'))+a('about.html',t('关于','Our story'))+a('blog.html',t('文章','Blog'))
        nav=nav.replace(f'href="{link(page)}"', f'href="{link(page)}" aria-current="page"')
        return f'''<header class="site-header"><div class="header-inner">
<div class="brand-lockup"><a class="wordmark" href="{prefix}" aria-label="{t('PAIA 首页','PAIA home')}">PAIA</a></div>
<nav class="desktop-nav" aria-label="{t('主导航','Main navigation')}">{nav}</nav>
<div class="header-actions"><a class="language" href="{other}" lang="{'zh-CN' if en else 'en'}" hreflang="{'zh-Hans' if en else 'en'}">{t('EN','中文')}</a>{button('beta.html',t('申请内测','Request beta'),'button button-small')}</div>
<details class="mobile-menu"><summary aria-label="{t('打开导航菜单','Open navigation menu')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></summary><nav aria-label="{t('移动端导航','Mobile navigation')}">{nav}{a('demo.html',t('体验示例','Explore an example'))}{a('status.html',t('当前状态','Current status'))}</nav></details>
</div></header>'''
    def footer():
        return f'''<footer class="site-footer wrap"><a class="wordmark" href="{prefix}">PAIA</a><nav aria-label="{t('页脚导航','Footer navigation')}">{a('principles.html',t('数据与权限','Your data'))}{a('status.html',t('当前状态','Status'))}{a('privacy-policy.html',t('隐私政策','Privacy'))}{a('terms.html',t('使用条款','Terms'))}<a href="mailto:{EMAIL}">{t('联系','Contact')}</a></nav><span class="copyright">© 2026 PAIA · Private beta</span></footer>'''
    def shell(page,title,desc,body,noindex=False,extra=''):
        out=head(page,title,desc,noindex)+header(page)+f'<main id="main" tabindex="-1">{body}</main>'+footer()+extra+'\n</body>\n</html>\n'
        dest=ROOT/('' if en else 'zh')/page
        dest.parent.mkdir(parents=True,exist_ok=True)
        write(dest,out)
        # Existing English deep links remain usable; canonical points to the root.
        if en: write(ROOT/'en'/page,out)
    def invitation():
        return f'''<section class="invitation wrap"><div><h2>{t('下一次，不从零开始。','Your next task. Not from zero.')}</h2><p>{t('从你已经在使用的 ChatGPT 开始。','Start with the ChatGPT conversations you already have.')}</p></div><div class="invitation-action">{button('beta.html',t('申请内测','Request beta access'))}<p class="small">{t('桌面 Chrome · ChatGPT · 邀请制内测','Chrome desktop · ChatGPT · Private beta')}</p></div></section>'''
    def statusmini():
        return f'''<div class="availability"><span class="status-dot" aria-hidden="true"></span><span>{t('桌面 Chrome 扩展 · ChatGPT 网页版 · 邀请制测试','Desktop Chrome extension · ChatGPT Web · Invite-only beta')}</span></div>'''
    home=render_home(t,a,button,statusmini)
    shell('index.html',t('PAIA — 个人 AI 输入档案','PAIA — Personal AI input archive'),t('保存、找回和编辑你对 AI 说过的话。用个人主题组织思考，复用自己的提示词，并自主控制 AI 的访问范围。','Keep, find and edit what you tell AI. Organize ongoing ideas around your topics, reuse your own prompts, and control what AI may access.'),home)

    for route,title,description,body in render_pages(t,a,button,invitation):
        shell(route,title,description,body)

    demo=render_demo(t,a,button)
    shell('demo.html',t('PAIA — 找回、整理、复用的交互示例','PAIA — An interactive example of finding, organizing and reusing'),t('用虚构数据体验输入档案、个人提示词、主题阅读和四卡 Context；无需安装，不连接私人档案或 AI。','Try the archive, personal prompts, topic reading and four-card Context with fictional data. No installation, personal archive or AI connection.'),demo,True)

    beta=f'''<section class="page-intro wrap"><p class="eyebrow">PAIA · PRIVATE BETA</p><h1>{t('参与下一代<br>个人 AI 体验。','Help shape a more<br>personal AI experience.')}</h1><p class="lead">{t('适合已经经常用 ChatGPT 思考、研究或创作，也确实遇到过“以前说过，却难以继续使用”的人。','For people who regularly think, research or create with ChatGPT—and have struggled to put past expressions to use again.')}</p>{statusmini()}</section><section class="beta-layout wrap"><div><form class="beta-form" action="https://formsubmit.co/haohongfei2001@gmail.com" method="POST"><input type="hidden" name="_subject" value="PAIA Private Beta application"><input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false"><input type="hidden" name="_next" value="{BASE}{link('thanks.html')}"><input type="hidden" name="language" value="{lang}"><div class="honeypot" aria-hidden="true"><label for="website-url">Leave this field empty</label><input id="website-url" type="text" name="_honey" tabindex="-1" autocomplete="off"></div><h2>{t('申请加入测试','Request an invitation')}</h2><label for="beta-email">{t('邮箱','Email')} <span class="required">{t('必填','Required')}</span></label><input id="beta-email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="email-hint"><p class="field-hint" id="email-hint">{t('用于 Beta 联系和邀请，不要求填写真实姓名。','For beta contact and invitations. No real name required.')}</p><label for="beta-frequency">{t('你使用 ChatGPT 的频率','How often do you use ChatGPT?')}</label><select id="beta-frequency" name="frequency"><option value="">{t('选填','Optional')}</option><option value="daily">{t('每天','Daily')}</option><option value="several-times-week">{t('每周数次','Several times a week')}</option><option value="weekly-or-less">{t('每周或更少','Weekly or less')}</option></select><label for="beta-goal">{t('你最想找回或复用什么？','What would you like to recover or reuse?')}</label><textarea id="beta-goal" name="goal" rows="4" maxlength="1000" placeholder="{t('选填。描述一个场景即可，不要粘贴聊天记录或私人资料。','Optional. Describe a situation, not private information or actual chat text.')}" aria-describedby="form-privacy"></textarea><label class="consent"><input type="checkbox" name="contact_consent" value="yes" required><span>{t('我同意将以上申请信息交给 FormSubmit 转发至项目邮箱，用于 Beta 招募与联系。','I agree to have FormSubmit forward this application to the project email for beta recruitment and contact.')}</span></label><p class="small" id="form-privacy">{t('只有提交此表单才会发送这些信息。不会发送你的 PAIA 档案。可随时通过项目邮箱申请删除；请勿填写敏感信息。','Only submitting this form sends this information. It does not send your PAIA archive. You can request deletion through the project email. Do not include sensitive information.')} {a('privacy-policy.html',t('隐私政策','Privacy policy'))}</p><button class="button" type="submit">{t('提交申请','Submit application')} <span aria-hidden="true">↗</span></button><p class="small">{t('提交后将前往 FormSubmit 处理。以该服务的提交结果为准；申请不代表已经获邀。','Submission is handled by FormSubmit. Its response determines delivery; applying does not mean you have been invited.')}</p></form><p class="small form-alternative">{t('表单无法使用？也可以直接写信：','Form unavailable? You can email instead:')} <a href="mailto:{EMAIL}?subject=PAIA%20Private%20Beta">{EMAIL}</a></p></div><aside class="beta-aside"><h2>{t('申请后会怎样','What happens next')}</h2><ol class="steps-list"><li><h3>{t('我们了解你的使用场景','We review your use case')}</h3><p>{t('招募以当前测试范围为准，不承诺固定回复时间或一定获得名额。','Invitations depend on the current testing scope. There is no guaranteed place or response time.')}</p></li><li><h3>{t('获邀后收到安装说明','Invited participants receive instructions')}</h3><p>{t('包括可用版本、安装方式、当前限制和反馈方式。不是立即安装，也不是公开商店发布。','Including the available build, setup, limitations and feedback path. This is not an instant installation or public store release.')}</p></li><li><h3>{t('从非关键材料开始','Start with non-critical material')}</h3><p>{t('先验证保存、找回和复用是否适合你。重要资料始终保留独立备份。','Check whether capture, retrieval and reuse help you. Always keep independent backups of important data.')}</p></li></ol><div class="aside-note"><strong>{t('还不确定？','Still exploring?')}</strong><p>{t('先用示例体验，不需要提供邮箱。','Try the sample first. No email needed.')}</p>{a('demo.html',t('打开示例','Open the sample'),'text-link')}</div></aside></section>'''
    shell('beta.html',t('申请 PAIA Private Beta','Request PAIA Private Beta access'),t('申请参与 PAIA 邀请制测试。桌面 Chrome 扩展，围绕 ChatGPT 网页版；先查看范围、数据边界和申请流程。','Request an invitation to test PAIA for desktop Chrome and ChatGPT Web. Review the scope, data boundaries and application process.'),beta)

    shell('principles.html',t('PAIA — 数据与权限','PAIA — Data and permissions'),t('了解本地档案、原话与编辑、四卡 Context、个人主题访问和可选同步的边界。','Understand local archives, sources and edits, four-card Context, personal-topic access and optional sync.'),render_trust(t,a,invitation))
    shell('status.html',t('PAIA — 体验与可用范围','PAIA — Experience and availability'),t('查看可以直接体验的网页示例、测试版申请，以及仍在完成的正式产品能力。','See the web example, beta invitation process and approved capabilities that are still being completed.'),render_status(t,a,invitation,statusmini))
    shell('about.html',t('PAIA — 为什么留下这些表达','PAIA — Why keep these expressions'),t('从输入档案到持续的思考：PAIA 的产品与品牌原点。','From a personal input archive to ongoing ideas: the product and the original image behind PAIA.'),render_about(t,a,invitation))

    privacy_sections=[
      (t('1. 核心原则','1. Core principles'),t('PAIA 当前以本地优先方式运行。核心档案数据默认保存在用户设备上，日常保存、检索、编辑、手动管理与提示词复用在本地完成。','PAIA currently operates local-first. Core archive data is stored on the user’s device by default. Everyday capture, search, editing, manual management and prompt reuse happen locally.')),
      (t('2. AI 相关数据使用','2. AI-related data use'),t('PAIA 不默认把完整档案交给外部 AI。外部 AI 处理须先获得相应许可，并仅使用必要材料。自动维护按用户选择的设置运行，主动生成由用户发起；真实服务尚未开放。AI Context 的读取许可由用户分别控制；连接不会自动开放卡片或主题。','PAIA does not give external AI the complete archive by default. External AI processing requires corresponding permission and uses only necessary material. Automatic maintenance follows the user’s chosen settings; users initiate active generation. These services are not available yet. Users control AI Context reading permissions separately; a connection does not automatically open cards or topics.')),
      (t('3. 本网站','3. This website'),t('当前公开展示网站不连接用户的 PAIA 档案，也不设置分析脚本或行为跟踪器。网站仅用于说明产品理念、交互与当前开发状态。','This public website does not connect to a user’s PAIA archive or install analytics scripts or behavioral trackers. It explains the product, interactions and current development status.')),
      (t('4. Private Beta 申请','4. Private beta applications'),t('Private Beta 申请表通过第三方表单转发服务 FormSubmit 将你主动填写的信息发送到项目联系邮箱 haohongfei2001@gmail.com。申请信息仅用于当前 Beta 的招募、筛选与联系，并会在不再需要用于 Beta 招募后删除。你可以随时通过项目联系邮箱要求提前删除已提交的申请信息。请不要提交敏感信息。','The private beta form uses the third-party forwarding service FormSubmit to send the information you enter to haohongfei2001@gmail.com. Application information is used only for current beta recruitment, selection and contact, and is deleted when no longer needed for recruitment. You can request earlier deletion through the project email at any time. Do not submit sensitive information.')),
      (t('5. Private Beta','5. Private beta'),t('PAIA 仍处于 Private Beta。具体数据结构、同步方式和可选 AI 功能可能继续调整。若未来启用已规划的个人云同步或新的外部 AI 服务，会在正式启用前更新本政策并说明相应数据边界。','PAIA remains in private beta. Data structures, synchronization approaches and optional AI features may change. Before planned personal-cloud sync or new external AI services are activated, this policy will be updated and their data boundaries explained before activation.')),
      (t('6. 用户控制与删除','6. User control and deletion'),t('产品目标是让用户保留对自己档案的最终控制权，包括查看、编辑、管理允许范围和删除。具体能力以当前 Beta 版本实际提供的功能为准。','The product aims to keep users in control of their archives, including viewing, editing, managing access permissions and deleting. Specific capabilities depend on what the current beta build actually provides.'))]
    terms_sections=[
      (t('1. Beta 状态','1. Beta status'),t('PAIA 当前处于 Private Beta。功能、数据结构、界面和支持范围可能持续变化，部分能力可能不稳定或暂时不可用。','PAIA is currently in private beta. Features, data structures, interfaces and support scope may change. Some capabilities may be unstable or temporarily unavailable.')),
      (t('2. 用户数据','2. User data'),t('用户对自己输入、编辑和导入的内容保留相应权利。PAIA 的产品目标是让这些内容保持可查看、可编辑和可管理；当前计划不提供内容导出或新备份生成。','Users retain the relevant rights in content they enter, edit and import. PAIA aims to make this material viewable, editable and manageable. The current plan does not provide content exports or generation of new backups.')),
      (t('3. 备份责任','3. Backups'),t('在 Beta 阶段，用户不应把 PAIA 作为自己重要数据的唯一副本。对于需要长期保存的内容，请同时保留独立备份。','During beta, do not use PAIA as the only copy of important data. Keep independent backups of material that needs long-term preservation.')),
      (t('4. 合理使用','4. Acceptable use'),t('请勿利用 PAIA 进行违法活动、未经授权的数据收集、侵犯他人隐私或知识产权，或规避第三方平台的访问和使用限制。','Do not use PAIA for unlawful activity, unauthorized data collection, violations of others’ privacy or intellectual property, or circumvention of third-party access and usage restrictions.')),
      (t('5. 第三方服务','5. Third-party services'),t('PAIA 可能与浏览器、AI 服务或其他第三方平台配合使用。第三方服务的可用性、条款和技术变化不由 PAIA 控制，相关功能可能因此调整。','PAIA may work with browsers, AI services and other third-party platforms. PAIA does not control their availability, terms or technical changes, which may require changes to related features.')),
      (t('6. 可用性与责任边界','6. Availability and limitations'),t('Beta 版本按当前状态提供，不承诺持续、无错误或永久可用。产品会尽力降低数据风险，但用户仍应为重要资料保留独立备份。','The beta is provided in its current state, without a promise of continuous, error-free or permanent availability. The product seeks to reduce data risks, but users should keep independent backups of important material.'))]
    for page,title,sections,date in [('privacy-policy.html',t('隐私政策','Privacy policy'),privacy_sections,'2026-10-08'),('terms.html',t('使用条款','Terms'),terms_sections,'2026-10-08')]:
        content=f'''<section class="page-intro wrap"><p class="eyebrow">PAIA · PRIVATE BETA</p><h1>{title}</h1><p class="small">{t('政策内容最后更新','Policy content last updated')}: {date} · {t('页面呈现更新','Presentation updated')}: 2026-10-08</p></section><article class="prose legal-prose wrap">{''.join(f'<section><h2>{h}</h2><p>{p}</p></section>' for h,p in sections)}<section><h2>{t('7. 联系','7. Contact')}</h2><p>{t('有关本政策、Beta 或申请信息删除的问题，请联系','For policy, beta or application-deletion questions, contact')} <a href="mailto:{EMAIL}">{EMAIL}</a>{t("。", ".")}</p></section>{f'<aside class="notice"><p>{t("网站示例补充说明：示例输入只在当前页面内存中使用，不上传或持久保存；刷新即清除。网站托管和 FormSubmit 仍有各自的数据处理边界。", "Website sample clarification: inputs are used only in current-page memory, not uploaded or persisted, and clear on reload. Website hosting and FormSubmit have their own data-processing boundaries.")}</p>{a("principles.html",t("查看具体的数据与授权边界","Read the practical data boundaries"))}</aside>' if page=='privacy-policy.html' else ''}</article>'''
        shell(page,'PAIA — '+title,t('PAIA Private Beta 的隐私和使用边界。','Privacy and usage boundaries for the PAIA private beta.'),content)
    thanks=f'''<section class="page-intro compact-intro wrap"><p class="eyebrow">PAIA · PRIVATE BETA</p><h1>{t('接下来，留意你的邮箱。','Next, keep an eye on your inbox.')}</h1><p class="lead">{t('申请不等于获得测试资格。若收到邀请，你会获得安装说明、当前限制与反馈方式。','An application is not an invitation. Invited participants receive setup instructions, current limitations and a feedback path.')}</p><p>{t('此页面本身不确认表单是否送达。没有看到 FormSubmit 的成功结果，或提交时遇到错误？请返回重试，或直接写信联系。','This page alone does not confirm delivery. If you did not see a successful FormSubmit response, or encountered a submission error, return to the form or email us directly.')}</p><div class="actions">{button('index.html',t('回到 PAIA','Back to PAIA'))}{a('beta.html',t('返回申请表','Return to the form'),'text-link')}</div><p class="small"><a href="mailto:{EMAIL}">{EMAIL}</a></p></section>'''
    shell('thanks.html',t('PAIA — 申请后的下一步','PAIA — After applying'),t('Private Beta 申请后的下一步与联系渠道。','Next steps and contact after applying to the private beta.'),thanks,True)
    notfound=f'''<section class="page-intro compact-intro wrap"><p class="eyebrow">404</p><h1>{t('这页没有找到。','This page wasn’t found.')}</h1><p class="lead">{t('链接可能已变化。你的扩展档案不在这个网站里，不受影响。','The link may have changed. Your extension archive is not stored on this website and is unaffected.')}</p><div class="actions">{button('index.html',t('回到首页','Back to home'))}{a('demo.html',t('体验示例','Try the sample'),'text-link')}</div></section>'''
    shell('404.html',t('PAIA — 页面未找到','PAIA — Page not found'),t('返回 PAIA 首页。','Return to the PAIA homepage.'),notfound,True)

for lang in ['zh','en']: build(lang)
# Absolute root paths target the existing custom-domain root deployment.
urls=[]
for locale in ['', 'zh/']:
    for name in ['', 'how-it-works.html','use-cases.html','blog.html','article-context.html','article-beliefs.html','article-reuse.html', 'beta.html','principles.html','status.html','about.html','privacy-policy.html','terms.html']:
        urls.append(f'<url><loc>{BASE}/{locale}{name}</loc></url>')
write(ROOT/'sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(urls)+'</urlset>\n')
write(ROOT/'robots.txt','User-agent: *\nAllow: /\nSitemap: https://inputarchive.com/sitemap.xml\n')
if CHECK:
    changed=[name for name,body in GENERATED.items() if not (ROOT/name).exists() or (ROOT/name).read_text(encoding='utf-8')!=body]
    if changed: raise SystemExit('Generated website drift: '+', '.join(changed))
else:
    (ROOT/'website/generated-paths.txt').write_text('\n'.join(sorted(GENERATED))+'\n',encoding='utf-8')
print(('Checked' if CHECK else 'Generated'),len(GENERATED),'website files')
