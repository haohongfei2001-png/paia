"""Formal entry paths, separate from release delivery and demo permissions.

There is no invented installer. Publication copy does not flip an availability
flag: an exact, verified Chrome Web Store address must be configured separately.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import json

MANIFEST = Path(__file__).with_name('launch_manifest.json')

def installation():
    config = json.loads(MANIFEST.read_text())
    url = config.get('chrome_store_url')
    if url is not None:
        parsed = urlsplit(url)
        if (parsed.scheme != 'https' or parsed.hostname != 'chromewebstore.google.com'
                or not parsed.path.startswith('/detail/') or parsed.username or parsed.password
                or parsed.fragment or parsed.query or len(parsed.path.split('/')[-1]) != 32
                or any(c not in 'abcdefghijklmnop' for c in parsed.path.split('/')[-1])):
            raise ValueError('A verified product-specific Chrome Web Store URL is required')
    return config

def download(t, a, button):
    target = installation()['chrome_store_url']
    if target:
        action=f'<a class="button release-install" href="{escape(target,quote=True)}" rel="noopener noreferrer">{t("添加到 Chrome","Add to Chrome")} <span aria-hidden="true">↗</span></a>'
        availability=t('在 Chrome 网上应用店查看权限并安装。','Review permissions and install from the Chrome Web Store.')
    else:
        action=f'<button type="button" class="button release-install" disabled aria-describedby="install-availability">{t("添加到 Chrome","Add to Chrome")} <span aria-hidden="true">↗</span></button>'
        availability=t('安装入口尚未开放。你可以先查看演示，无需注册。','Installation is not open yet. Explore the demo without signing up.')
    steps=[
        (t('添加到浏览器','Add to your browser'),t('从官方安装入口获取 PAIA，核对所需权限。','Get PAIA through the official installation entry and review its permissions.')),
        (t('选择保存范围','Choose what to keep'),t('在 ChatGPT 中主动开启保存，留下已发送的用户文字。','Opt in to capture in ChatGPT to keep the words you send.')),
        (t('从已有的积累继续','Continue from your own work'),t('打开档案找回原话，用主题组织思考，让好用的表达随手可用。','Find earlier words in your archive, organize ideas by topic and keep useful expressions close.')),
    ]
    return f'''<section class="beta-intro release-intro wrap"><div><p class="eyebrow">PAIA / CHROME</p><h1>{t('从你的下一次<br>AI 对话开始。','Start with your<br>next conversation.')}</h1></div><div><p class="lead">{t('让每一次表达，都成为可以继续的积累。','Give every expression a place to stay, and a way to become useful again.')}</p><p class="release-platform">Chrome · ChatGPT</p></div></section>
<section class="release-layout wrap"><article class="release-download" data-install-available="{str(bool(target)).lower()}"><span class="release-app-wordmark">PAIA</span><h2>{t('留住你的表达。','Keep your words.')}</h2><p>{t('适用于桌面 Chrome，与 ChatGPT 网页版配合使用。','For Chrome on desktop, alongside ChatGPT on the web.')}</p><div class="release-install-actions">{action}</div><p id="install-availability" class="release-availability">{availability}</p><div class="release-alternatives">{a('demo.html',t('查看交互演示','View the interactive demo'),'text-link')}{a('help.html',t('阅读使用帮助','Read the help'),'text-link')}</div><p class="release-permission-link">{a('principles.html',t('安装与数据权限','Installation and data permissions'),'text-link')}</p></article>
<aside class="release-first-steps"><p class="eyebrow">{t('第一次使用','YOUR FIRST STEPS')}</p><ol>{''.join(f'<li><h3>{h}</h3><p>{p}</p></li>' for h,p in steps)}</ol><div class="release-help-link">{a('contact.html',t('需要帮助？联系 PAIA','Need a hand? Contact PAIA'),'text-link')}</div></aside></section>'''

def help_page(t, a, button):
    groups=[('start',t('安装与开始','Installing and starting'),[
        (t('在哪里安装 PAIA？','Where can I install PAIA?'),t('从“获取 PAIA”页面进入官方安装地址。安装前核对浏览器、来源网站和权限；不要从不明来源获取扩展。','Use Get PAIA to reach the official installation address. Check the browser, supported site and permissions before installing. Do not use untrusted extension downloads.')),
        (t('从什么环境开始？','Which environment should I use?'),t('从桌面 Chrome 和 ChatGPT 网页版开始。手机可以浏览官网和操作演示，但不等于在手机上安装桌面扩展。','Start with Chrome on desktop and ChatGPT on the web. You can browse this site and try its demo on a phone; that does not install a desktop extension on your phone.')),
        (t('安装后就会保存全部聊天吗？','Does installation save every conversation?'),t('不会。保存需要你主动开启，面向受支持页面中已发送的用户文字。不会因此自动收集完整账号历史、全部 AI 回复、任意网页或未发送的草稿。','No. Capture is opt-in and applies to sent user text on supported pages. It does not automatically collect your full account history, all AI replies, arbitrary webpages or unsent drafts.')),
    ]),('inputs',t('保存与找回','Keeping and finding'),[
        (t('改写会覆盖原话吗？','Do edits replace the original?'),t('工作文字承接你的修改，原始来源单独保留。阅读过滤不等于删除；需要时可以核对来源。','Your edits belong to the working text; source records are kept separately. Reading filters do not delete records. You can check the original when needed.')),
        (t('怎么继续一个长期主题？','How can I continue an ongoing topic?'),t('用主题和章节把相关表达放在一起。沿时间和来源回到上下文，再把当时的判断带进眼前的任务。','Bring related expressions together in topics and sections. Follow their dates and sources back to the context, then bring earlier decisions into the task at hand.')),
        (t('整理会替我增加观点吗？','Does organization add beliefs on my behalf?'),t('整理提供不同详略的阅读方式，保留原话、来源、条件与不确定性。引用、提问或试探，不应被直接当作你的固定观点。','Organization offers different levels of detail while preserving your words, sources, conditions and uncertainty. Quotations, questions and tentative ideas should not become permanent beliefs attributed to you.')),
    ]),('control',t('复用与控制','Reuse and control'),[
        (t('选中提示词会自动发送吗？','Does selecting a prompt send it?'),t('不会。选中后填入输入框，保留原有草稿，最后由你检查并发送。','No. It fills the composer while preserving your draft. You review it and decide when to send.')),
        (t('连接 AI 就等于开放全部档案吗？','Does connecting AI open my entire archive?'),t('不等于。总访问、四张卡片与主题分别控制。新主题默认关闭；未开放的主题不能转而授权读取整个档案。','No. Main access, each of the four cards and individual topics have separate controls. New topics start closed. A closed topic never grants fallback access to the entire archive.')),
        (t('暂停和撤回会发生什么？','What happens when I pause or withdraw access?'),t('暂停会保留范围选择并停止之后的读取。撤回不能收回已经送达外部 AI 的内容。其他卡片中独立保存的内容仍按各自开关管理。','Pausing keeps your scope selections while stopping future reads. Withdrawal cannot recall material already delivered to external AI. Independently saved material in other cards keeps its own controls.')),
    ]),('data',t('设备与数据','Devices and data'),[
        (t('本地优先意味着什么？','What does local-first mean?'),t('日常保存、阅读、查找、编辑和提示词复用从本地开始。需要外部处理或读取时另行授权；本地存储本身不是加密或永久保存的承诺。','Everyday capture, reading, search, editing and prompt reuse start locally. External processing or reading requires separate permission. Local storage alone is not a promise of encryption or permanent preservation.')),
        (t('同步与备份是一回事吗？','Is sync the same as a backup?'),t('不是。同步是设备之间的接续，不是无限期历史备份。按安装入口的支持范围使用同一浏览器生态，重要资料同时保留原平台或其他独立来源。','No. Sync provides continuity across devices, not unlimited backup history. Follow the supported browser ecosystem at the installation entry. Keep another source for important material.')),
        (t('网页演示会保存我输入的内容吗？','Does the website demo save what I type?'),t('不会。演示使用示例资料，不连接个人档案或真实 AI。编辑只保留在当前页面，刷新即清除。请不要输入私人资料。','No. The demo uses sample material and connects to neither personal archives nor a live AI. Edits stay in the current page and clear on reload. Do not enter personal information.')),
    ])]
    links=''.join(f'<a href="#{key}">{heading}</a>' for key,heading,_ in groups)
    sections=''.join(f'<section id="{key}"><h2>{heading}</h2>'+''.join(f'<details class="nr-details"><summary>{q}<span aria-hidden="true">+</span></summary><div><p>{answer}</p></div></details>' for q,answer in questions)+'</section>' for key,heading,questions in groups)
    return f'''<section class="nr-intro wrap"><div><p class="eyebrow">PAIA / HELP</p><h1>{t('找到答案，<br>接着往下。','Find your answer.<br>Keep going.')}</h1></div><div class="nr-intro-aside"><p class="lead">{t('从第一次使用，到自己的长期积累。','From your first conversation to your own body of work.')}</p>{button('download.html',t('获取 PAIA','Get PAIA'))}</div></section><div class="release-help-layout wrap"><nav class="release-help-index" aria-label="{t('帮助目录','Help contents')}">{links}{a('contact.html',t('联系 PAIA','Contact PAIA'))}</nav><article class="release-help-content">{sections}<div class="release-help-end"><h2>{t('还有别的问题？','Have another question?')}</h2><p>{t('带上你的使用环境和遇到的问题，不必附上私人聊天。','Tell us your environment and what happened, without sharing private conversations.')}</p>{a('contact.html',t('联系 PAIA','Contact PAIA'),'text-link')}{a('principles.html',t('查看数据与权限','Read about data and permissions'),'text-link')}</div></article></div>'''

def contact(t, a, button, email, thanks_url):
    return f'''<section class="beta-intro wrap"><div><p class="eyebrow">PAIA / CONTACT</p><h1>{t('有话，<br>保持联系。','Something to share?<br>Get in touch.')}</h1></div><div><p class="lead">{t('使用中的问题、数据与权限，或一个值得分享的想法。欢迎联系 PAIA。','A question about using PAIA, your data, or an idea worth sharing. Get in touch.')}</p></div></section><section class="beta-layout release-contact wrap"><div><form class="beta-form" action="https://formsubmit.co/{email}" method="POST" data-contact-form><input type="hidden" name="_subject" value="PAIA — Contact"><input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false"><input type="hidden" name="_next" value="{thanks_url}"><input type="hidden" name="language" value="{t('zh','en')}"><div class="honeypot" aria-hidden="true"><label for="website-url">Leave this field empty</label><input id="website-url" type="text" name="_honey" tabindex="-1" autocomplete="off"></div>
<h2>{t('给 PAIA 留言','Send PAIA a message')}</h2><label for="beta-email">{t('邮箱','Email')} <span class="required">{t('必填','Required')}</span></label><input id="beta-email" name="email" type="email" required maxlength="254" autocomplete="email" aria-describedby="email-hint"><p class="field-hint" id="email-hint">{t('仅用于回复这条留言，无需填写真实姓名。','Only used to reply to this message. No real name required.')}</p><label for="beta-frequency">{t('关于什么','What is it about?')}</label><select id="beta-frequency" name="frequency"><option value="">{t('请选择（选填）','Choose a topic (optional)')}</option><option value="support">{t('使用帮助','Using PAIA')}</option><option value="privacy">{t('数据与权限','Data and permissions')}</option><option value="feedback">{t('反馈与合作','Feedback and collaboration')}</option></select><label for="beta-goal">{t('你的留言','Your message')}</label><textarea id="beta-goal" name="goal" rows="5" maxlength="1000" aria-describedby="form-privacy" placeholder="{t('描述问题或想法，不要粘贴私人聊天、密码或敏感资料。','Describe your question or idea, not private chats, passwords or sensitive data.')}"></textarea><label class="consent"><input type="checkbox" name="contact_consent" value="yes" required><span>{t('我同意将以上留言交由 FormSubmit 转发至 PAIA 联系邮箱，用于回应本次联系。','I agree to have FormSubmit forward this message to PAIA’s contact email to respond to this inquiry.')}</span></label><p class="small" id="form-privacy">{t('仅发送你填写的表单，不会发送 PAIA 档案。','Only the fields you enter are sent, never your PAIA archive.')} {a('privacy-policy.html',t('隐私政策','Privacy policy'))}</p><button type="submit" class="button">{t('发送留言','Send message')} <span aria-hidden="true">↗</span></button><p class="small">{t('服务接收不等于邮件已送达收件箱。','Service acceptance does not guarantee inbox delivery.')}</p></form><p class="small form-alternative">{t('也可以直接写信：','Or email us directly:')} <a href="mailto:{email}">{email}</a></p></div><aside class="beta-aside"><h2>{t('先找到需要的答案','Find the answer you need')}</h2><p>{t('安装、保存、主题、提示词与权限，可以从帮助中心开始。','Start with Help for installation, capture, topics, prompts and permissions.')}</p>{a('help.html',t('打开帮助中心','Open Help'),'text-link')}<div class="aside-note"><h3>{t('关于你的资料','About your data')}</h3><p>{t('反馈问题时，只描述必要的环境和步骤。请不要发送私人档案或登录凭证。','Describe only the necessary environment and steps. Do not send private archives or login credentials.')}</p>{a('principles.html',t('了解数据与权限','Data and permissions'),'text-link')}</div></aside></section>'''
