"""Bilingual inner pages for the independently reviewable flagship website.

These are website explanations and fictional illustrations, not live product
clients. Public capability boundaries come from the existing website source and
the current product contracts. Shared chrome is owned by the main builder.
"""
def render_page(page, lang):
    """Return (title, description, body_html), or None for another route."""
    page = page.rsplit("/", 1)[-1]
    if page not in {
        "how-it-works.html", "use-cases.html", "about.html", "principles.html",
        "blog.html", "article-beliefs.html", "article-context.html", "article-reuse.html",
    }:
        return None
    en = lang == "en"
    prefix = "/" if en else "/zh/"

    def t(zh, english):
        return english if en else zh

    def link(path, label, cls="fp-text-link"):
        return f'<a class="{cls}" href="{prefix}{path}">{label}<span aria-hidden="true">→</span></a>'

    def sample(text=None):
        return f'<p class="fp-sample">{text or t("虚构示例 · 仅用于说明产品体验", "Fictional example · Illustrates the product experience")}</p>'

    def ending(title=None, copy=None):
        return f'''<section class="fp-ending wrap"><div><h2>{title or t('从一句话开始。', 'Begin with a sentence.')}</h2><p>{copy or t('先用示例，看看自己的表达可以怎样接着用。', 'Explore what you can do with the words you have already put into the world.')}</p></div><div class="fp-ending-actions">{link('demo.html', t('打开交互演示', 'Explore the demo'), 'fp-button')}{link('download.html', t('获取 PAIA', 'Get PAIA'))}</div></section>'''

    def opening(label, title, description, extra="", cls=""):
        return f'''<header class="fp-header wrap {cls}"><p class="fp-label">{label}</p><h1>{title}</h1><div class="fp-header-bottom"><p class="fp-lead">{description}</p>{extra}</div></header>'''

    if page == "how-it-works.html":
        title = t("如何使用 PAIA", "How PAIA works")
        description = t("留下自己的输入，找回原话，沿主题继续思考，复用表达，并决定 AI 的读取范围。", "Keep your inputs, find your words, continue a topic, reuse a prompt, and choose what AI may read.")
        body = opening(t("使用方式", "How it works"), t("把说过的话，<br>接着用。", "Make more of<br>what you have said."), t("一个输入，可能在很久以后重新变得有用。PAIA 为它保留来处，也留出继续的空间。", "An input can become useful long after the conversation ends. PAIA keeps where it came from—and room for what comes next."), link("demo.html", t("亲自试一遍", "Try it yourself")))
        body += f'''<section class="fp-first-record wrap" aria-labelledby="first-record-title"><div class="fp-record-context"><span class="fp-label">Input Archive</span><h2 id="first-record-title">{t('从你已经<br>写下的开始。', 'Start with what<br>is already yours.')}</h2><p>{t('在支持的 ChatGPT 页面主动开启保存，收录你已发送的文字。', 'Opt in to capture on supported ChatGPT pages to keep the words you send.')}</p></div><figure class="fp-record-paper"><div class="fp-paper-meta"><span>{t('一个产品想法', 'A product idea')}</span><span>{t('原始输入', 'Original input')}</span></div><blockquote>{t('“先做一个足够小的版本。我想知道，人们能不能找回自己曾经认真想过的事。”', '“Start with a small enough version. I want to know whether people can find something they once thought about carefully.”')}</blockquote>{sample()}</figure></section>
<div class="fp-flow wrap">
<section class="fp-flow-row"><div class="fp-flow-heading"><p class="fp-label">Input Archive</p><h2>{t('找到原话，<br>再决定怎样继续。', 'Find your words.<br>Decide what comes next.')}</h2></div><div class="fp-flow-content"><p>{t('按会话和关键词找回输入，在连续的阅读中看清上下文。工作文字可以修改，原始来源单独保留。', 'Find an input by conversation or keyword, then read it in context. Edit your working text while the original source stays separate.')}</p><details class="fp-original"><summary>{t('看一处修改怎样保留原话', 'See an edit alongside its source')}<span aria-hidden="true">+</span></summary><div class="fp-original-pair"><div><span class="fp-label">{t('原始输入', 'Original input')}</span><p>{t('先做一个足够小的版本。', 'Start with a small enough version.')}</p></div><div><span class="fp-label">{t('工作文字', 'Working text')}</span><p>{t('第一版只验证素材找回，暂不做多人协作。', 'Use v1 to test retrieval. Leave collaboration for later.')}</p></div></div>{sample()}</details><p class="fp-note">{t('安装不等于收录全部账号历史。未发送的草稿、AI 回复和任意网页，不会因此自动进入档案。', 'Installation does not capture your complete account history. Unsent drafts, AI replies and arbitrary webpages are not automatically archived.')}</p></div></section>
<section class="fp-flow-row"><div class="fp-flow-heading"><p class="fp-label">Thought Library</p><h2>{t('一个主题，<br>可以跨过许多次对话。', 'One topic can span<br>many conversations.')}</h2></div><div class="fp-flow-content"><p>{t('用主题与章节，把相关的表达放在一起。旧判断、新问题、改变主意的原因，可以在同一处继续。', 'Bring related expressions together in topics and sections. Keep an earlier decision, a new question and the reason you changed your mind in the same place.')}</p><figure class="fp-topic-example"><div class="fp-topic-title"><span class="fp-topic-dot" aria-hidden="true"></span><strong>{t('做一个真正有用的产品', 'Making something useful')}</strong></div><div class="fp-topic-entry"><span>{t('最初的想法', 'The first idea')}</span><p>{t('“先证明有人需要它。”', '“First, establish that someone needs it.”')}</p></div><div class="fp-topic-entry"><span>{t('还在想的问题', 'An open question')}</span><p>{t('“怎样分清好奇地试一次，和真的想继续用？”', '“How do I tell curiosity from a reason to keep using it?”')}</p></div>{sample()}</figure><p class="fp-note">{t('AI 整理提供不同详略的衍生阅读方式；真实 AI 服务仍在开发。你的命名、排列与修改，不应被自动整理覆盖。', 'AI organization is planned as derived reading views with different levels of detail. Live AI services remain in development; organization must respect your names, order and edits.')}</p></div></section>
<section class="fp-flow-row"><div class="fp-flow-heading"><p class="fp-label">Prompt Reuse</p><h2>{t('用得顺手的话，<br>随手再用。', 'Keep useful phrases<br>within reach.')}</h2></div><div class="fp-flow-content"><p>{t('改写、固定和排列自己的常用提示词。在下一次对话里，选择一句填入输入框，结合眼前的任务修改，再由你发送。', 'Edit, pin and arrange your own prompts. Choose one for your next conversation, adapt it to the task, and send it when you are ready.')}</p><div class="fp-prompt-example"><span class="fp-label">{t('你的常用提示词', 'Your personal prompts')}</span><div><span>{t('指出我的遗漏', 'Find what I missed')}</span><span>{t('给出反例', 'Find a counterexample')}</span><span>{t('接着推演', 'Continue the reasoning')}</span></div><p>{t('“先检查我的前提，再给出建议。”', '“Check my assumptions before making a recommendation.”')}</p></div>{sample()}<p class="fp-note">{t('已有草稿会保留。选择提示词不会替你点击发送。', 'Your existing draft stays. Selecting a prompt never sends it for you.')}</p></div></section>
<section class="fp-flow-row"><div class="fp-flow-heading"><p class="fp-label">AI Context</p><h2>{t('让 AI 了解多少，<br>由你决定。', 'Choose how much<br>AI gets to know.')}</h2></div><div class="fp-flow-content"><p>{t('我的信息、我的规则、我的现在、我的输入，各自管理。真实外部连接可用后，AI 只能在已获准的范围内按需读取。', 'Manage My Information, My Rules, My Now and My Inputs separately. When live external connections become available, AI may read on demand only within the scope you allow.')}</p><div class="fp-access-example"><div><span>{t('总访问', 'Main access')}</span><span class="fp-off">{t('默认关闭', 'Off by default')}</span></div><div><span>{t('卡片与主题', 'Cards and topics')}</span><span>{t('分别选择', 'Separate choices')}</span></div></div><p class="fp-note">{t('连接本身不会打开权限，也不会把整个输入档案自动开放。', 'A connection does not open permissions or automatically grant access to the whole archive.')}</p>{link('principles.html', t('详细了解数据与权限', 'Read about data and permissions'))}</div></section></div>'''
        body += ending()
        return title + " — PAIA", description, f'<div class="fp-page fp-how">{body}</div>'

    if page == "use-cases.html":
        title = t("使用场景", "Ways to use PAIA")
        description = t("在创作、研究与重要选择中，接上自己的积累。", "Bring your own accumulated thinking into creative work, research and important choices.")
        cases = [
            ("project", t("做一个长期项目", "Build an ongoing project"), t("下一个版本，接着上一次判断。", "Let the next version build on the last decision."), t("灵感散落在不同对话里，取舍却彼此相关。找回当时为什么这样决定，再看眼前的变化。", "Ideas may live in different conversations, but your decisions belong together. Recover why you made a choice before deciding what to change."), t("之前定下的边界", "The boundary you set"), t("第一版只验证素材找回。先服务独立创作者，多人协作以后再说。", "Test retrieval in v1. Start with independent creators; consider collaboration later."), t("今天继续的问题", "Today’s next question"), t("如果仍然守住这个范围，下一步最值得验证什么？", "Within that scope, what is the most useful thing to test next?"), t("在 Input Archive 找回决定，用 Thought Library 将项目的表达放在同一处。", "Recover the decision in Input Archive. Bring the project’s expressions together in Thought Library.")),
            ("research", t("想清一个问题", "Think through a question"), t("保留结论，也保留它成立的条件。", "Keep the conclusion and the conditions it depends on."), t("一个问题可能讨论许多次。沿着主题阅读，分清已验证的推理、引用的观点和还没有答案的部分。", "A question can take many conversations. Read along a topic to distinguish tested reasoning, quoted views and what is still unresolved."), t("先前的疑问", "The earlier question"), t("这个结论是不是只在第二个假设成立时才有效？我还不能确定。", "Does this conclusion hold only under the second assumption? I am not certain yet."), t("重新开始的位置", "Where to pick it up"), t("先改变第二个假设，看看推理会在哪一步分开。", "Change the second assumption first, and see where the reasoning diverges."), t("Thought Library 保留问题的连续性。需要核对时，可以回到具体输入与来源。", "Thought Library keeps the question together. Return to a specific input and source when you need to check.")),
            ("decision", t("重新做一次选择", "Revisit a decision"), t("你改变了，判断也可以跟着变。", "Your decision can change as you do."), t("以前的选择有以前的背景。把旧条件与新想法放在一起，给现在的自己留出重新判断的余地。", "Earlier choices came with earlier circumstances. Put the old constraints beside new thoughts, and leave room for a fresh judgment."), t("当时更在意的", "What mattered then"), t("我希望离家近一些。工作内容有一点新鲜感就好。", "I would like to stay closer to home. Some variety in the work would be enough."), t("现在更在意的", "What matters now"), t("我愿意去远一点的地方，但希望工作能真正让我学习和创造。", "I am open to moving farther away if the work offers real room to learn and create."), t("保留过去的表达，更新当前工作文字。AI Context 中的近况可以独立管理。", "Keep the earlier expression and update your working text. Manage current context independently in AI Context.")),
        ]
        body = opening(t("使用场景", "Ways to use PAIA"), t("重要的事，<br>很少只聊一次。", "The things that matter<br>take more than one conversation."), t("一个项目，一个问题，一次选择。先前认真想过的事，可以成为下一步的起点。", "A project, a question, a choice. What you have already thought through can be the start of what comes next."))
        body += f'<section class="fp-cases wrap" aria-label="{t("三个使用场景", "Three ways to use PAIA")}">'
        for i, (slug, label, heading, intro, oldlabel, old, newlabel, new, use) in enumerate(cases):
            body += f'''<details class="fp-case" name="paia-use-case" {'open' if i == 0 else ''} data-case="{slug}"><summary><span>{label}</span><span class="fp-case-summary-description">{heading}</span><span class="fp-case-plus" aria-hidden="true">+</span></summary><div class="fp-case-expanded"><div class="fp-case-copy"><h2>{heading}</h2><p>{intro}</p>{link('demo.html', t('在示例中试一试', 'Try the example'))}</div><div class="fp-case-material"><div class="fp-case-before"><p class="fp-label">{oldlabel}</p><blockquote>{old}</blockquote></div><div class="fp-case-after"><p class="fp-label">{newlabel}</p><blockquote>{new}</blockquote></div>{sample()}</div><p class="fp-case-foot">{use}</p></div></details>'''
        body += f'''</section><aside class="fp-availability-note wrap"><span>{t('关于这些场景', 'About these scenarios')}</span><p>{t('以上均为虚构示例，用于解释产品的使用方向。网站不会读取你的聊天；真实 AI 整理与外部 Context 连接仍在开发。', 'These fictional scenarios explain how the product is intended to be used. This website does not read your chats. Live AI organization and external Context connections are still in development.')}</p></aside>'''
        body += ending(t("找到你的下一步。", "Find your next step."))
        return title + " — PAIA", description, f'<div class="fp-page fp-use">{body}</div>'

    if page == "about.html":
        title = t("关于 PAIA", "About PAIA")
        description = t("PAIA 为人的表达留出一个自己的地方。了解产品与最初的故事。", "PAIA gives personal expression a place of its own. Read about the product and the story it began with.")
        body = opening(t("关于 PAIA", "About PAIA"), t("一个留给<br>你自己的地方。", "A place<br>for your side of the conversation."), t("你花时间解释背景、寻找答案、推翻假设，也说起自己还没想清楚的事。这些表达，构成了你投入过的思考。", "You take time to explain the background, look for answers, question assumptions and describe what you have not worked out yet. Those expressions hold the thinking you put in."), '<span class="fp-name-expansion">Personal AI<br> Input Archive</span>', "fp-about-header")
        body += f'''<section class="fp-about-position wrap"><div class="fp-about-position-title"><h2>{t('对话之外，<br>表达还有自己的生活。', 'Your words have a life<br>beyond the conversation.')}</h2></div><div class="fp-about-position-copy"><p>{t('一次发送之后，一段文字可能就沉进漫长的聊天记录。等到再次需要它，你也许已经忘了在哪个窗口说过，甚至忘了自己曾经这样想过。', 'After you send a message, it may sink into a long conversation history. When you need it again, you may have forgotten where you said it—or that you ever thought that way.')}</p><p>{t('PAIA 从你自己的输入出发。留下原话与来源，围绕主题把表达放在一起，让有用的说法重新回到手边。', 'PAIA starts from your own inputs. It keeps your words and their sources, brings expressions together around topics, and puts useful phrases within reach again.')}</p><p>{t('如果你希望 AI 了解其中一些内容，开放哪些内容、是否继续读取、何时暂停，都应该由你掌握。自己的空间，先属于自己。', 'If you want AI to know some of that context, you should control the scope and whether access continues. A personal space begins with the person it belongs to.')}</p>{link('how-it-works.html', t('看看产品如何实现这些想法', 'See how these ideas shape the product'))}</div></section>
<section class="fp-about-principle"><div class="wrap"><p class="fp-label">{t('留出余地', 'Room to remain unfinished')}</p><p class="fp-about-large">{t('你可以还没想清楚。<br>也可以，和昨天想得不一样。', 'You can still be figuring it out.<br>You can think differently tomorrow.')}</p><p class="fp-about-principle-note">{t('保存过的表达，不应成为对一个人的最终定义。整理要保留语境、条件与不确定性，让新的判断仍然有位置。', 'A saved expression should not become a final definition of a person. Organization needs to preserve context, conditions and uncertainty, leaving room for a new judgment.')}</p></div></section>
<section class="fp-origin wrap"><figure><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" alt="{t('PAIA 创作者的原始手绘：女孩背影、手中的信与旧信箱。', 'The creator’s original PAIA drawing: a girl seen from behind, a letter in her hand and an old mailbox.')}" loading="lazy" decoding="async"><figcaption>{t('创作者原作 · PAIA 最初的画面', 'Original drawing by the creator · Where PAIA began')}</figcaption></figure><div class="fp-origin-story"><p class="fp-label">{t('最初的故事', 'The original story')}</p><h2>{t('最后，<br>只有信箱还在那里。', 'In the end,<br>the mailbox remains.')}</h2><p>{t('女孩靠近旧信箱，随后与它擦肩而过，渐渐走远。我们不知道她是否曾经投递，也不知道她原本想表达什么。', 'A girl approaches an old mailbox, passes by it, and gradually walks away. We do not know whether she ever posted anything, or what she had meant to express.')}</p><p>{t('留下来的画面里，有时间、距离，也有缺席。故事没有交代那封信的去处，没有替她补上一个结局。', 'What remains holds time, distance and absence. The story does not tell us where the letter went, or supply an ending for her.')}</p><p>{t('PAIA 从这个未完成的画面开始。产品所做的，是为已经留下的表达保留一个位置；它们之后意味着什么，可以由你继续决定。', 'PAIA began with this unfinished image. The product gives expressions that have been made a place to remain. What they mean next is still yours to decide.')}</p></div></section>'''
        body += ending(t("让自己的表达，留在自己这里。", "Keep a place for your own words."), t("从原话、主题和你自己的选择开始。", "Start with your words, your topics and your choices."))
        return title, description, f'<div class="fp-page fp-about">{body}</div>'

    if page == "principles.html":
        title = t("数据与权限", "Data and permissions")
        description = t("本地保存、AI 整理、外部读取和云同步是独立选择。了解 PAIA 如何保留人的决定权。", "Local capture, AI organization, external reading and cloud sync are separate choices. See how PAIA preserves your control.")
        body = opening(t("数据与权限", "Data and permissions"), t("留下来以后，<br>决定权仍在你。", "Keep your words.<br>Keep your say."), t("保存、整理、允许读取与同步，分别决定。一份自己的档案，不应因为一个开关就向所有地方开放。", "Decide separately what to keep, organize, allow AI to read and sync. One switch should not open your archive to everything."), link("privacy-policy.html", t("阅读隐私政策", "Read the privacy policy")))
        choices = [
            (t('保存自己的输入', 'Keep your inputs'), t('主动开启', 'Opt in'), t('在支持的页面保存已发送的用户文字。本地阅读、查找、工作文字编辑与提示词复用，不依赖 PAIA 的远程模型服务。', 'Capture sent user text on supported pages. Local reading, search, working-text edits and prompt reuse do not depend on PAIA’s remote model service.')),
            (t('允许 AI 整理', 'Allow AI organization'), t('单独许可', 'Separate permission'), t('计划中的 AI 整理与自动维护，按相应处理许可使用必要材料。允许处理，不代表允许外部 AI 随时读取档案。', 'Planned AI organization and automatic maintenance use necessary material under processing permission. Permission to process does not grant an external AI open access to your archive.')),
            (t('允许外部 AI 读取', 'Allow external AI reading'), t('默认关闭', 'Off by default'), t('总访问、独立卡片与主题各有控制。连接可用后，获准的 AI 才能在允许范围内按需读取。', 'Main access, individual cards and topics each have their own controls. When connections become available, authorized AI can read on demand within that scope.')),
            (t('同步到自己的云账号', 'Sync to your own cloud account'), t('主动开启', 'Opt in'), t('可选同步与 AI 处理、外部读取分别控制。真实云传输和新设备恢复仍在开发；同步不等于无限期历史备份。', 'Optional sync is controlled separately from AI processing and external reading. Live cloud transfer and new-device recovery remain in development. Sync is not an unlimited backup history.')),
        ]
        body += f'''<section class="fp-choices wrap" aria-labelledby="choices-title"><div class="fp-section-head"><h2 id="choices-title">{t('四个选择，互不代替。', 'Four choices, each its own.')}</h2><p>{t('这里说明产品的权限结构。AI 整理、真实外部连接与云同步仍在开发。', 'This explains the product’s permission structure. AI organization, live external connections and cloud sync remain in development.')}</p></div>'''
        for label, state, copy in choices:
            body += f'<article class="fp-choice-row"><h3>{label}</h3><span class="fp-choice-state">{state}</span><p>{copy}</p></article>'
        body += '</section>'
        cards = [
            (t('我的信息', 'My Information'), t('你希望 AI 了解的个人背景。', 'The background you want AI to know.')),
            (t('我的规则', 'My Rules'), t('回答方式、偏好与任务边界。', 'Response preferences and task boundaries.')),
            (t('我的现在', 'My Now'), t('当前项目、近况与最近的变化。', 'Current projects, recent context and changes.')),
            (t('我的输入', 'My Inputs'), t('你允许进一步读取的个人主题。', 'The personal topics you allow for deeper reading.')),
        ]
        body += f'''<section class="fp-context-permissions wrap"><div class="fp-permission-intro"><p class="fp-label">AI Context</p><h2>{t('四张卡片，<br>管理不同的内容。', 'Four cards for<br>different kinds of context.')}</h2><p>{t('它们属于“允许外部 AI 读取”这一项中的内容范围，各自独立。创建内容与开放读取，也是两件事。', 'These cards define content scopes within external AI reading. Each is independent. Creating content and opening it for reading are separate actions.')}</p></div><div class="fp-permission-card-grid">{''.join(f'<article><span class="fp-off">{t("默认关闭", "Off by default")}</span><h3>{label}</h3><p>{copy}</p></article>' for label, copy in cards)}</div></section>
<section class="fp-permission-rules wrap"><div><h2>{t('每一层允许，<br>都要清楚。', 'Every level of access<br>should be clear.')}</h2><p>{t('总访问、卡片和“我的输入”中的新主题，真实初始状态均为关闭。', 'Main access, cards and new topics in My Inputs all start closed in the real product.')}</p></div><div class="fp-rule-list"><p>{t('打开下一级，不会自动打开上一级。建立连接，也不会自动授权。', 'Opening a lower scope does not open its parent. Establishing a connection does not grant access.')}</p><p>{t('没有开放的主题，不能退回去读取整个输入档案。', 'A closed topic never grants fallback access to the whole Input Archive.')}</p><p>{t('暂停会停止之后的读取，并保留已有范围选择。已经交给外部 AI 的内容，不能通过撤回来收回。', 'Pausing stops future reads while preserving your scope choices. Withdrawal cannot recall material already delivered to an external AI.')}</p><p>{t('关闭一个主题，只改变这个主题的访问。其他卡片中独立保存的内容，仍需分别管理。', 'Closing a topic changes that topic’s access. Independent content in other cards keeps its own controls.')}</p></div></section>
<section class="fp-data-details wrap"><details><summary>{t('编辑、过滤和删除，有什么区别？', 'How are editing, filtering and deletion different?')}<span aria-hidden="true">+</span></summary><div><p>{t('工作文字承接修改，原始来源单独保留。阅读过滤改变可见性，不等于删除。来源平台与 PAIA 是各自的副本，一处删除不会自动删除另一处。具体移除与永久删除应按版本说明操作。', 'Edits belong to working text while the original source stays separate. Reading filters change visibility; they are not deletion. PAIA and the source platform hold separate copies, so deletion in one does not automatically delete the other. Follow the build’s instructions for removal and permanent deletion.')}</p></div></details><details><summary>{t('本地优先，意味着资料永不离开设备吗？', 'Does local-first mean data never leaves the device?')}<span aria-hidden="true">+</span></summary><div><p>{t('不意味着。日常基础功能从本地开始；你允许的外部处理、读取或同步会有各自的数据路径。本地存储本身不代表加密或永久保存保证，重要资料应同时保留独立来源。', 'No. Everyday foundations start locally; external processing, reading or sync that you permit has its own data path. Local storage is not itself a promise of encryption or permanent preservation. Keep another source for important material.')}</p></div></details><details><summary>{t('这个网站会连接我的档案吗？', 'Does this website connect to my archive?')}<span aria-hidden="true">+</span></summary><div><p>{t('不会。产品演示使用虚构资料，不连接个人档案或真实 AI。演示中的编辑只存在于当前页面，刷新即清除。主动提交联系表单时，只有填写的表单字段会交由 FormSubmit 转发。', 'No. Product examples use fictional material and connect to neither personal archives nor a live AI. Demo edits stay in the current page and clear on reload. If you submit the contact form, only its fields are forwarded through FormSubmit.')}</p>{link('privacy-policy.html', t('查看完整隐私说明', 'Read the full privacy policy'))}</div></details></section>'''
        body += ending(t("先看清楚，再做选择。", "Understand it. Then choose."))
        return title + " — PAIA", description, f'<div class="fp-page fp-principles">{body}</div>'

    articles = {
        "beliefs": {
            "category": t("表达与语境", "Expression and context"),
            "title": t("发给 AI 的，<br>不一定是你的观点。", "Not every input<br>is a belief."),
            "plain": t("发给 AI 的，不一定是你的观点。", "Not every input is a belief."),
            "description": t("引用、试探、追问和改变主意，都需要各自的空间。", "Quotations, experiments, questions and changed minds need room of their own."),
            "quote": t("“如果换一个前提呢？”", "“What if the assumption changes?”"),
            "intro": t("我们发给 AI 的文字，常常比一个确定的观点复杂得多。有时是在引用别人，有时只是试着把一个模糊的念头说出来。保存它们，首先需要理解这种差别。", "What we send AI is often more complicated than a settled opinion. Sometimes we are quoting another person. Sometimes we are trying to give a vague thought its first words. Keeping these expressions begins with respecting that difference."),
            "sections": [
                ("voices", t("一句输入里，可能有几种声音。", "An input can hold several voices."), [
                    t("一段待改写的文字、一份岗位说明、一种你并不赞同的论证，都可能被放进输入框。记录能够说明你发送过这些文字，却不能据此断定它们都是你的长期立场。", "A draft to rewrite, a job description or an argument you disagree with can all go into the composer. A record establishes that you sent those words. It does not establish that every sentence is your lasting position."),
                    t("问题也不是结论。“这样做会不会更好？”表达的是探索；把它整理成“我认为这样更好”，就悄悄跨过了原话的边界。", "A question is not a conclusion either. ‘Could this work better?’ is an exploration. Organizing it as ‘I believe this is better’ quietly crosses the boundary of what was said."),
                ]),
                ("conditions", t("流畅，不应以丢掉条件为代价。", "Clarity should keep the conditions."), [
                    t("整理可以改变顺序、层级与详略，让一段思考更容易读。它也需要保留那些不够利落却很重要的部分：也许、暂时、如果、我还不能确定。", "Organization can change order, hierarchy and detail to make a line of thought easier to read. It also needs to retain the less tidy but important parts: perhaps, for now, if, I am not certain yet."),
                    t("在 PAIA 的产品原则中，AI 整理是基于材料的衍生阅读方式。原话、来源、立场与不确定性都需要得到保留，AI 的推断不应被写成你的观点。真实 AI 整理服务仍在开发。", "In PAIA’s product principles, AI organization is a derived reading view over the material. Original expression, sources, perspective and uncertainty need to remain intact. An AI inference should not be presented as your belief. Live AI organization is still in development."),
                ]),
                ("change", t("过去的表达，为现在提供参考。", "Past expression is material for the present."), [
                    t("人的判断会随经验和处境变化。曾经说过的话可以保留，而当前的工作文字、主题组织与 AI 允许范围，也可以继续由你调整。", "Judgment changes with experience and circumstances. An earlier expression can remain while you continue to revise your working text, topic organization and AI access choices."),
                    t("让一份档案对人有用，需要它能够承接变化。它不该因为记得太多，就让一个人越来越难成为现在的自己。", "For an archive to serve a person, it needs to accommodate change. Remembering more should not make it harder for someone to be who they are now."),
                ]),
            ],
        },
        "context": {
            "category": t("积累与主权", "Continuity and control"),
            "title": t("聊天结束以后，<br>思考去哪里？", "Where does your thinking go<br>when the chat ends?"),
            "plain": t("聊天结束以后，思考去哪里？", "Where does your thinking go when the chat ends?"),
            "description": t("留下文字，还需要留下找到、理解和再次使用它们的能力。", "Keeping the words also means keeping the ability to find, understand and use them again."),
            "quote": t("“我记得自己认真想过这件事。”", "“I remember thinking this through.”"),
            "intro": t("一段对话会结束，一个问题却可能持续很久。你在不同窗口里交代背景、尝试方案、排除方向。它们分别完成了当时的任务，也共同构成了你自己的积累。", "A conversation ends, but a question may continue for a long time. Across different windows, you explain the background, try approaches and rule things out. These expressions serve the task at hand and become part of your own body of thought."),
            "sections": [
                ("return", t("重新找到，才有机会接着用。", "You need to find it to use it again."), [
                    t("有时你记得一个结论，却不记得它出自哪一次讨论。重新询问 AI 可以得到另一个答案，但未必能找回当时的限制、顾虑和你亲自做出的判断。", "Sometimes you remember a conclusion but not the discussion it came from. Asking AI again may produce another answer, without recovering the constraints, concerns and judgment you brought to the earlier conversation."),
                    t("Input Archive 从已经发送的个人输入出发，保留来源，提供找回和工作文字编辑。它让你有机会回到那句具体的话。", "Input Archive starts from sent personal inputs, retaining sources and providing retrieval and working-text editing. It gives you a way back to the particular sentence."),
                ]),
                ("topic", t("窗口是一次对话，主题是一段过程。", "A conversation is a moment. A topic is a process."), [
                    t("同一个项目可能经历很多次对话。一次在讨论对象，一次在缩小范围，还有一次是在承认之前的假设不成立。把窗口重新排列，并不足以解释这些表达之间的关系。", "A project can involve many conversations: one about the people it serves, another about narrowing scope, and another about admitting an earlier assumption did not hold. Rearranging conversations alone does not explain how those expressions relate."),
                    t("Thought Library 用主题、章节和内容建立连续的阅读空间。人的命名、排列与修改优先，既容纳积累，也容纳未解决的问题。", "Thought Library uses topics, sections and entries to create a continuous reading space. Your names, order and edits take priority, making room for accumulated thinking and unresolved questions alike."),
                ]),
                ("permission", t("保存自己的东西，再决定给 AI 看多少。", "Keep it for yourself. Choose what AI may see."), [
                    t("一个个人空间，可以首先服务于人自己的回看和使用。外部 AI 需要了解背景时，再通过明确的许可读取相应内容。", "A personal space can serve your own reflection and use first. When an external AI needs background, it can read the corresponding material through explicit permission."),
                    t("AI Context 将我的信息、我的规则、我的现在和我的输入分别管理。总访问、卡片与新主题默认关闭；真实连接仍在开发。保存内容不会自动开放整个档案。", "AI Context manages My Information, My Rules, My Now and My Inputs separately. Main access, cards and new topics start closed; live connections are still in development. Keeping content does not automatically open the whole archive."),
                ]),
            ],
        },
        "reuse": {
            "category": t("表达与复用", "Expression and reuse"),
            "title": t("那些用得顺手的话，<br>应该就在手边。", "Keep the phrases that work<br>within reach."),
            "plain": t("那些用得顺手的话，应该就在手边。", "Keep the phrases that work within reach."),
            "description": t("自己的提问方式，是长期形成的工作习惯。", "Your way of asking is part of the practice you have built."),
            "quote": t("“先检查前提，再给出建议。”", "“Check my assumptions before recommending.”"),
            "intro": t("你也许总会要求给出反例，或希望回答先解释依据，再下结论。反复使用的这些说法，往往比一套通用提示词更贴近自己的工作。", "You might regularly ask for a counterexample, or prefer the reasoning before the conclusion. These phrases you return to often fit your work better than a generic prompt collection."),
            "sections": [
                ("yours", t("从自己已经用过的表达开始。", "Start with expressions you already use."), [
                    t("一次好用的追问，可能很快沉进旧聊天。下一次要用时，只好凭记忆重新写。个人提示词让这些说法有一个稳定的位置，可以改写、固定和排列。", "A useful follow-up can quickly disappear into an old conversation. The next time you need it, you rewrite it from memory. Personal prompts give these expressions a stable place where you can edit, pin and arrange them."),
                    t("这不要求你先学习一套提示词分类方法。已经用得顺手的话，本来就是值得保留的起点。", "You do not need to learn a prompt taxonomy first. A phrase that already works for you is a worthwhile starting point."),
                ]),
                ("adapt", t("复用之后，还可以重新表达。", "Reuse leaves room to adapt."), [
                    t("选中一条提示词，只是把它填入当前输入框。已有草稿保留，你仍然可以补上这次的条件、删掉不适用的部分，检查后再发送。", "Selecting a prompt fills the current composer. Your existing draft stays. You can add this task’s conditions, remove what no longer applies, review it, and then send it."),
                    t("旧指令不会因为再次出现，就成为自动执行的新许可。最后的发送动作始终属于用户。", "An old instruction does not become new execution authority just because it appears again. Sending remains the user’s action."),
                ]),
                ("background", t("一句请求，与一份背景，各有作用。", "A request and its background have different roles."), [
                    t("Prompt Reuse 帮助你说出当前想让 AI 做的事。AI Context 管理你允许 AI 了解的背景、规则、近况与主题。两者互相配合，也分别受你控制。", "Prompt Reuse helps you express what you want AI to do now. AI Context manages the background, rules, current context and topics you allow AI to know. They work together while remaining separately controlled."),
                    t("本地提示词的具体范围，以获邀版本与支持页面为准。真实外部 Context 连接仍在开发；网页演示只使用示例资料，不会向真实 AI 发送内容。", "The scope of local prompts depends on the invited build and supported pages. Live external Context connections remain in development. The web demo uses sample material and sends nothing to a real AI."),
                ]),
            ],
        },
    }

    if page == "blog.html":
        body = opening(t("产品手记", "Product notes"), t("给下一次思考，<br>留一点余地。", "Leave room<br>for the next thought."), t("关于表达、积累和使用自己的文字。几个简单的原则，决定了 PAIA 怎样对待它们。", "On expression, continuity and using your own words. A few simple principles shape how PAIA treats them."), cls="fp-journal-header")
        body += f'<section class="fp-journal-list wrap" aria-label="{t("产品文章", "Product notes")}">'
        for i, slug in enumerate(("context", "beliefs", "reuse")):
            article = articles[slug]
            body += f'''<article class="fp-journal-entry {'fp-journal-featured' if i == 0 else ''}"><div class="fp-journal-entry-copy"><p class="fp-label">{article['category']}</p><h2><a href="{prefix}article-{slug}.html">{article['plain']}</a></h2><p>{article['description']}</p>{link('article-' + slug + '.html', t('阅读全文', 'Read the note'))}</div><div class="fp-journal-quote fp-journal-quote-{slug}"><p>{article['quote']}</p><span>{t('一个问题，可以继续。', 'A question can continue.') if slug == 'context' else t('保留语气，也保留可能性。', 'Keep the voice. Keep the possibility.') if slug == 'beliefs' else t('下次，还可以接着用。', 'There for the next time.')}</span></div></article>'''
        body += '</section>'
        return t("产品手记 — PAIA", "Product notes — PAIA"), t("关于个人表达、积累、上下文和复用的产品手记。", "Product notes on personal expression, continuity, context and reuse."), f'<div class="fp-page fp-journal">{body}</div>'

    slug = page.removeprefix("article-").removesuffix(".html")
    article = articles[slug]
    next_slug = {"context": "beliefs", "beliefs": "reuse", "reuse": "context"}[slug]
    body = f'''<header class="fp-article-header wrap"><div class="fp-article-breadcrumb">{link('blog.html', t('产品手记', 'Product notes'))}<span aria-hidden="true">/</span><span>{article['category']}</span></div><h1>{article['title']}</h1><p class="fp-lead">{article['description']}</p></header><div class="fp-article-layout wrap"><aside class="fp-article-index"><p class="fp-label">{t('本文内容', 'In this note')}</p><nav aria-label="{t('文章目录', 'Article contents')}">{''.join(f'<a href="#{anchor}">{heading}</a>' for anchor, heading, _ in article['sections'])}</nav>{link('demo.html', t('打开产品演示', 'Explore the demo'))}</aside><article class="fp-reading"><p class="fp-reading-intro">{article['intro']}</p><figure class="fp-reading-quote"><blockquote>{article['quote']}</blockquote><figcaption>{t('虚构表达示例', 'Fictional expression')}</figcaption></figure>'''
    for anchor, heading, paragraphs in article["sections"]:
        body += f'<section id="{anchor}"><h2>{heading}</h2>' + ''.join(f'<p>{paragraph}</p>' for paragraph in paragraphs) + '</section>'
    body += f'''<nav class="fp-next-note" aria-label="{t('继续阅读', 'Continue reading')}"><span class="fp-label">{t('继续阅读', 'Continue reading')}</span><a href="{prefix}article-{next_slug}.html"><strong>{articles[next_slug]['plain']}</strong><span aria-hidden="true">→</span></a></nav></article></div>'''
    return article["plain"] + " — PAIA", article["description"], f'<div class="fp-page fp-article">{body}</div>'
