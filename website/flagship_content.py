"""Bilingual, reading-led inner pages for PAIA's independent website review.

These pages explain the product through explicitly fictional examples. They do
not connect to an archive, call AI, or change the product's permission model.
Shared navigation, font assets and page generation belong to the main shell.
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

    def sample(copy=None):
        return f'<p class="fp-sample">{copy or t("虚构示例 · 用于说明产品体验", "Fictional example · Illustrates the product experience")}</p>'

    def ending(title=None, copy=None):
        return f'''<section class="fp-ending wrap"><div><h2>{title or t('下一句，由你。', 'The next words are yours.')}</h2><p>{copy or t('在交互演示里，找回原话，试着接着写。', 'Find the original expression and try continuing it in the interactive demo.')}</p></div><div class="fp-ending-actions">{link('demo.html', t('打开交互演示', 'Explore the demo'), 'fp-button')}{link('download.html', t('查看获取方式', 'How to get PAIA'))}</div></section>'''

    original = t('我想写写离开家后的生活。<br>但不知道从哪里开始。', 'I want to write about leaving home.<br>But I do not know where to begin.')
    working = t('我想从搬家那天写起。<br>先记下门关上的声音。', 'I want to start with moving day.<br>The sound of the door closing.')
    topic = t('用自己的语言写作', 'Writing in my own voice')

    if page == "how-it-works.html":
        title = t('如何使用 PAIA', 'How PAIA works')
        description = t('跟随一句关于写作的表达，了解输入档案、思想库、提示词复用和独立的 AI 权限。', 'Follow one expression about writing through Input Archive, Thought Library, prompt reuse and independent AI permissions.')
        body = f'''<header class="fp-how-intro wrap"><div><p class="fp-label">{t('使用方式', 'How it works')}</p><h1>{t('从一句话，<br>到下一次继续。', 'From a first thought<br>to what comes next.')}</h1></div><div class="fp-how-preamble"><p>{t('你想写一篇关于离开家的文章。和 AI 聊过几次，还没有写完。后来，想从那句话继续。', 'You want to write about leaving home. You have talked it through with AI a few times. The piece is still unfinished. Later, you want to pick up that thought.')}</p>{link('demo.html', t('打开交互演示', 'Try the interactive demo'))}</div></header>
<figure class="fp-opening-expression wrap"><div class="fp-expression-caption"><span>{t('当时，你写下', 'What you wrote then')}</span><span>ChatGPT · {t('已发送的输入', 'Sent input')}</span></div><blockquote>{original}</blockquote>{sample(t('以下为同一个人的虚构使用示例，不连接你的聊天。', 'A fictional example following one person. It does not connect to your chats.'))}</figure>
<div class="fp-sequence wrap">
<section class="fp-scene" aria-labelledby="fp-archive-title"><div class="fp-scene-margin"><span class="fp-label">Input Archive</span><span class="fp-scene-when">{t('两周后', 'Two weeks later')}</span></div><div class="fp-scene-content"><h2 id="fp-archive-title">{t('找回当时的自己，<br>具体说过什么。', 'Find the words<br>you actually used.')}</h2><p>{t('搜索记得的关键词，回到那一次会话，连着上下文读下去。原来你想留下的，并不是一篇完整的回忆，而是一个可以开始的地方。', 'Search for a word you remember and return to the conversation. Read what came before and after it. You were not trying to write a complete memoir yet. You were looking for a place to start.')}</p><details class="fp-original"><summary>{t('看看现在的修改，和当时的原话', 'Read the working edit beside the original')}<span aria-hidden="true">+</span></summary><div class="fp-original-pair"><div><span class="fp-label">{t('原始输入', 'Original input')}</span><p>{original}</p></div><div><span class="fp-label">{t('现在的工作文字', 'Current working text')}</span><p>{working}</p></div></div><p class="fp-note">{t('工作文字可以修改，原始来源单独保留。', 'Working text can change. The original source stays separate.')}</p></details></div><aside class="fp-scene-note"><p>{t('在支持的 ChatGPT 页面主动开启保存后，收录已发送的用户文字。', 'Opt in to capture on supported ChatGPT pages to keep the words you send.')}</p><p>{t('安装不会收录全部账号历史，也不会自动保存未发送的草稿、AI 回复或任意网页。', 'Installation does not capture your entire account history, unsent drafts, AI replies or arbitrary webpages.')}</p></aside></section>
<section class="fp-scene" aria-labelledby="fp-thought-title"><div class="fp-scene-margin"><span class="fp-label">Thought Library</span><span class="fp-scene-when">{t('同一件事，接着想', 'Keep the same thought going')}</span></div><div class="fp-scene-content"><h2 id="fp-thought-title">{t('几次对话，<br>可以读成同一个主题。', 'Several conversations.<br>One topic to return to.')}</h2><p>{t('关于怎样写，你已经想过不止一次。把相关表达放进“用自己的语言写作”，在“从哪里开始”里接着读。旧想法和新的修改，都有位置。', 'You have returned to the question of how to write more than once. Bring those expressions into “Writing in my own voice,” and continue reading in “Where to begin.” There is room for the earlier thought and the new edit.')}</p><figure class="fp-topic-reading"><figcaption><span>{topic}</span><span>{t('章节 · 从哪里开始', 'Section · Where to begin')}</span></figcaption><p>{working}</p><div class="fp-topic-following"><span class="fp-label">{t('另一次对话里，你还写过', 'From another conversation')}</span><p>{t('“想不起的细节，可以先空着。不必为了完整而补上。”', '“I can leave the details I do not remember open. I do not need to fill them in for completeness.”')}</p></div></figure></div><aside class="fp-scene-note"><p>{t('主题、章节与内容，由你命名、排列和修改。需要核对时，可以回到具体输入与来源。', 'Name, arrange and edit your topics, sections and entries. Return to the particular input and source when you need to check.')}</p><p>{t('AI 整理是计划中的衍生阅读方式，真实服务仍在开发；它不能替你补出观点，或覆盖人的修改。', 'AI organization is planned as derived reading views. Live services remain in development; they must not invent your beliefs or override your edits.')}</p></aside></section>
<section class="fp-scene" aria-labelledby="fp-prompt-title"><div class="fp-scene-margin"><span class="fp-label">Prompt Reuse</span><span class="fp-scene-when">{t('下一次开口', 'The next conversation')}</span></div><div class="fp-scene-content"><h2 id="fp-prompt-title">{t('用得顺手的说法，<br>不用重新想一遍。', 'Keep a useful phrase<br>within reach.')}</h2><p>{t('你发现一句请求很好用，就把它留作自己的提示词。以后可以修改、置顶或调整顺序，再选中一句填入当前输入框。', 'You find a request that works and keep it as a personal prompt. Edit it, pin it or change its order, then choose it for your current composer.')}</p><figure class="fp-saved-phrase"><figcaption>{t('自己留下的提示词', 'A prompt you keep')}</figcaption><blockquote>{t('帮我把表达写清楚，<br>保留原文里的疑问和不确定。', 'Help me make this clearer.<br>Keep the questions and uncertainty in my words.')}</blockquote></figure><p class="fp-note">{t('填入之后，你可以接着改。已有草稿会保留，发送仍由你完成。', 'Keep editing after insertion. Your existing draft stays, and sending remains your action.')}</p>{link('demo.html', t('试着填入一句', 'Try inserting a phrase'))}</div><aside class="fp-scene-note"><p>{t('Prompt Reuse 是独立的日常入口。不必先整理好整个思想库，也可以使用自己的常用表达。', 'Prompt Reuse has a role of its own. You can reuse a helpful phrase without organizing your entire library first.')}</p><p>{t('本地提示词的支持范围，以获邀版本和支持页面为准。', 'Local prompt availability depends on the invited build and supported pages.')}</p></aside></section>
<section class="fp-scene" aria-labelledby="fp-context-title"><div class="fp-scene-margin"><span class="fp-label">AI Context</span><span class="fp-scene-when">{t('当你愿意提供背景', 'When you choose to share context')}</span></div><div class="fp-scene-content"><h2 id="fp-context-title">{t('让 AI 知道一些，<br>也留下一些。', 'Give AI some context.<br>Keep the choice yours.')}</h2><p>{t('你可以主动在“我的现在”写下自己正在写作；在“我的规则”留下希望保留不确定性的要求。若希望 AI 进一步阅读某个已有主题，再分别选择对应范围。', 'You can write that you are working on this piece in My Now, and add your wish to preserve uncertainty in My Rules. If you want AI to read an existing topic, choose that scope separately.')}</p><div class="fp-context-reading"><div><span>{t('我的现在', 'My Now')}</span><span class="fp-off">{t('读取关闭', 'Reading off')}</span></div><p>{t('正在写离开家以后的生活，还在找一个合适的开头。', 'Writing about life since leaving home. Still looking for a beginning.')}</p></div><p class="fp-note">{t('写下内容、打开查看或编辑，都不等于授权读取。', 'Writing, viewing or editing content does not grant access.')}</p>{link('principles.html', t('看清每一项权限', 'Understand each permission'))}</div><aside class="fp-scene-note"><p>{t('总访问、卡片与新主题，全部默认关闭。下一级的选择不会打开上一级，也不会开放整个输入档案。', 'Main access, cards and new topics all start off. A lower scope does not enable its parent or open the whole Input Archive.')}</p><p>{t('真实外部 AI 连接仍在开发。网页示例不执行真实读取。', 'Live external AI connections remain in development. Website examples do not perform real reads.')}</p></aside></section>
</div>'''
        body += ending()
        return title + ' — PAIA', description, f'<div class="fp-page fp-how">{body}</div>'

    if page == "use-cases.html":
        title = t('使用场景', 'Ways to use PAIA')
        description = t('写一篇文章，长期想一个问题，重新做一次选择。接上自己已经投入的思考。', 'Write a piece, stay with a question, or revisit a decision. Continue the thinking you have already put in.')
        cases = [
            ('project', t('写作', 'Writing'), t('接上自己的语气。', 'Find your own voice again.'), t('你曾经把一个场景、一个句子，或一种说不清的感受写进对话。下一次动笔，先找回它，而不是从一个空白输入框重新开始。', 'You once put a scene, a sentence or a feeling you could not quite explain into a conversation. The next time you write, return to it before starting from an empty composer.'), t('当时，想写的事', 'What you wanted to write'), original, t('现在，找到一个开头', 'A beginning you find now'), working, t('在输入档案找回原话，在思想库里把写作的片段放在一起。你的改写，仍然留下原始来源。', 'Find the original in Input Archive. Bring your writing fragments together in Thought Library. Your edits keep their source.')),
            ('research', t('长期想一个问题', 'Staying with a question'), t('有些答案，需要慢慢长出来。', 'Some answers take time.'), t('“我想过怎样的生活？”可能没有一次聊完的答案。保留不同阶段的疑问和条件，重新读到它们时，才看得见什么变了，什么仍然重要。', '“What kind of life do I want?” may take more than one conversation. Keep the questions and conditions from different moments so you can see what changed and what still matters.'), t('以前的疑问', 'An earlier question'), t('是不是只有把时间安排得更满，才算没有浪费？我还不能确定。', 'Do I need to fill my days to feel I have not wasted them? I am not sure.'), t('后来，换个方向问', 'A different question later'), t('如果留一点没安排的时间，我真正想做的事会不会更容易出现？', 'If I leave some time unplanned, might it become easier to see what I want to do?'), t('让同一个主题容纳不同想法。保留问题的语气，也保留它们各自的来处。', 'Let one topic hold different thoughts. Keep the questions as questions, with the sources they came from.')),
            ('decision', t('做一次选择', 'Making a choice'), t('知道当时的理由，才能重新判断。', 'Know the earlier reasons. Decide again.'), t('换一份工作，搬去另一个城市，或者决定留下。过去的选择有过去的条件，现在的你可以重新衡量。', 'Change jobs, move to another city, or decide to stay. An earlier choice came with earlier circumstances. You can weigh it again as the person you are now.'), t('当时，更在意的', 'What mattered then'), t('我希望离家近一些。工作内容有一点新鲜感就好。', 'I would like to stay closer to home. Some variety in the work would be enough.'), t('现在，更在意的', 'What matters now'), t('我愿意去远一点的地方，但希望工作能让我继续学习，也留出生活的时间。', 'I am open to moving farther away if the work helps me keep learning and leaves time for the rest of life.'), t('旧表达可以保留，当前工作文字可以调整。需要让 AI 了解的近况，再到 AI Context 单独管理。', 'Keep the earlier expression and revise your working text. Manage the current context you want AI to know separately in AI Context.')),
        ]
        body = f'''<header class="fp-use-header wrap"><div><p class="fp-label">{t('使用场景', 'Ways to use PAIA')}</p><h1>{t('你的生活，<br>不会每次从头开始。', 'Your life does not<br>start over with every chat.')}</h1></div><p class="fp-lead">{t('写作，想问题，做选择。<br>之前认真想过的，值得成为下一步的起点。', 'Writing, wondering, deciding.<br>What you have thought through can be a place to begin again.')}</p></header><section class="fp-cases wrap" aria-label="{t('三个使用场景', 'Three ways to use PAIA')}">'''
        for i, (slug, label, heading, intro, old_label, before, new_label, after, use) in enumerate(cases):
            body += f'''<details class="fp-case" name="paia-use-case" {'open' if i == 0 else ''} data-case="{slug}"><summary><span>{label}</span><span class="fp-case-summary-description">{heading}</span><span class="fp-case-plus" aria-hidden="true">+</span></summary><div class="fp-case-expanded"><div class="fp-case-copy"><h2>{heading}</h2><p>{intro}</p>{link('demo.html', t('在示例中体验', 'Explore the demo'))}</div><figure class="fp-case-material"><div><span class="fp-label">{old_label}</span><blockquote>{before}</blockquote></div><div><span class="fp-label">{new_label}</span><blockquote>{after}</blockquote></div><figcaption>{t('虚构的个人表达示例', 'Fictional personal expressions')}</figcaption></figure><p class="fp-case-foot">{use}</p></div></details>'''
        body += f'''</section><aside class="fp-availability-note wrap"><span class="fp-label">{t('关于这些场景', 'About these scenarios')}</span><p>{t('以上均为虚构示例。网站不会读取你的聊天；真实 AI 整理与外部 Context 连接仍在开发。', 'These scenarios are fictional. This website does not read your chats. Live AI organization and external Context connections remain in development.')}</p></aside>'''
        body += ending(t('你还有什么，想接着想？', 'What would you like to return to?'))
        return title + ' — PAIA', description, f'<div class="fp-page fp-use">{body}</div>'

    if page == "about.html":
        title = t('关于 PAIA', 'About PAIA')
        description = t('一个女孩，一只旧信箱。PAIA 从一个未完的故事，走向属于人的表达空间。', 'A girl and an old mailbox. The unfinished story behind a personal space for your expressions.')
        body = f'''<section class="fp-about-opening"><div class="fp-origin-layout wrap"><header class="fp-origin-story"><p class="fp-label">{t('PAIA 的起点', 'Where PAIA began')}</p><h1>{t('一个未完的故事。', 'An unfinished story.')}</h1><div class="fp-origin-facts"><p>{t('女孩靠近旧信箱。<br>擦肩而过，渐渐远去。', 'A girl approaches an old mailbox.<br>She passes by and gradually walks away.')}</p><p>{t('我们不知道，<br>她是否曾经投递。', 'We do not know<br>whether she ever posted anything.')}</p><p>{t('最后，<br>只有信箱仍在那里。', 'In the end,<br>only the mailbox remains.')}</p></div></header><figure class="fp-origin-art"><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" alt="{t('创作者的原始手绘：一个女孩背对画面，手中拿着信，站在旧信箱旁。', 'The creator’s original drawing: a girl seen from behind, holding a letter beside an old mailbox.')}" fetchpriority="high" decoding="async"><figcaption>{t('创作者原作 · PAIA 最初的画面', 'Original drawing by the creator · PAIA’s first image')}</figcaption></figure></div></section>
<section class="fp-about-body wrap"><aside class="fp-about-margin"><span>PAIA</span><p>Personal AI<br>Input Archive</p></aside><div class="fp-about-copy"><h2>{t('给自己的表达，<br>一个自己的地方。', 'A place of your own<br>for the words you put in.')}</h2><p>{t('在和 AI 交流时，你花时间解释背景，寻找措辞，推翻一个假设，也说起尚未想清楚的事。这些表达，是你投入过的思考。', 'When you talk to AI, you take time to explain the background, find the words, question an assumption and describe what you have not worked out yet. Those expressions hold the thinking you put in.')}</p><p>{t('一次发送之后，它们常常沉进漫长的聊天记录。PAIA 从你自己的输入出发，留下原话和来处，围绕主题继续阅读，让有用的说法回到手边。', 'After you send them, they can sink into a long conversation history. PAIA starts from your own inputs. It keeps your words and their sources, gives topics a place to continue, and puts useful phrases within reach again.')}</p><p>{t('它们之后意味着什么，仍然由你决定。', 'What they mean next is still yours to decide.')}</p>{link('how-it-works.html', t('看看 PAIA 怎样工作', 'See how PAIA works'))}</div></section>
<section class="fp-about-belief wrap"><p>{t('你可以还没想清楚。<br>也可以，和昨天想得不一样。', 'You can still be figuring it out.<br>You can think differently tomorrow.')}</p><div><span class="fp-label">{t('为变化留位置', 'Room for change')}</span><p>{t('保留原话，不把一次试探定成长期立场。允许修改，不让整理覆盖人的选择。决定开放哪些内容，也允许自己暂停。', 'Keep the original without turning a tentative thought into a permanent belief. Make room for edits without overruling human choices. Choose what to open, and keep the ability to pause.')}</p>{link('principles.html', t('阅读数据与权限原则', 'Read the data and permission principles'))}</div></section>'''
        body += ending(t('还有下文。', 'There is more to say.'), t('从自己的原话，接着往下写。', 'Start with your own words. See where they take you.'))
        return title, description, f'<div class="fp-page fp-about">{body}</div>'

    if page == "principles.html":
        title = t('数据与权限', 'Data and permissions')
        description = t('保存输入、AI 整理、外部读取和云同步是四项独立选择。了解 PAIA 如何保留人的决定权。', 'Input capture, AI organization, external reading and cloud sync are four independent choices. Understand your control in PAIA.')
        body = f'''<header class="fp-policy-header wrap"><p class="fp-label">{t('数据与权限', 'Data and permissions')}</p><div><h1>{t('属于你的。<br>也由你决定。', 'Your words.<br>Your decisions.')}</h1><p class="fp-lead">{t('保存、整理、允许读取与同步，分别选择。自己的档案，需要清楚的边界。', 'Choose separately what to keep, organize, allow AI to read and sync. A personal archive needs clear boundaries.')}</p>{link('privacy-policy.html', t('阅读完整隐私政策', 'Read the full privacy policy'))}</div></header>'''
        choices = [
            (t('保存自己的输入', 'Keep your inputs'), t('主动开启', 'Opt in'), t('在支持的页面保存已发送的用户文字。本地阅读、查找、工作文字编辑与提示词复用，不依赖 PAIA 的远程模型服务。', 'Capture sent user text on supported pages. Local reading, search, working-text edits and prompt reuse do not depend on PAIA’s remote model service.')),
            (t('允许 AI 整理', 'Allow AI organization'), t('单独许可', 'Separate permission'), t('计划中的 AI 整理与自动维护，按相应处理许可使用必要材料。允许处理，不代表允许外部 AI 随时读取档案。', 'Planned AI organization and automatic maintenance use necessary material under processing permission. Permission to process does not grant an external AI open access to your archive.')),
            (t('允许外部 AI 读取', 'Allow external AI reading'), t('默认关闭', 'Off by default'), t('总访问、独立卡片与主题各有控制。连接可用后，获准的 AI 才能在允许范围内按需读取。', 'Main access, individual cards and topics each have their own controls. When connections become available, authorized AI can read on demand within that scope.')),
            (t('同步到自己的云账号', 'Sync to your own cloud account'), t('主动开启', 'Opt in'), t('可选同步与 AI 处理、外部读取分别控制。真实云传输和新设备恢复仍在开发；同步不等于无限期历史备份。', 'Optional sync is controlled separately from AI processing and external reading. Live cloud transfer and new-device recovery remain in development. Sync is not an unlimited backup history.')),
        ]
        body += f'''<section class="fp-policy-section wrap" aria-labelledby="choices-title"><aside class="fp-policy-margin"><h2 id="choices-title">{t('四项独立选择', 'Four independent choices')}</h2><p>{t('一项许可，不代替另一项。', 'One permission does not grant another.')}</p></aside><div class="fp-choice-list">'''
        for label, state, copy in choices:
            body += f'<article class="fp-choice-row"><div><h3>{label}</h3><span class="fp-choice-state">{state}</span></div><p>{copy}</p></article>'
        body += f'''<p class="fp-note">{t('这里说明产品的权限结构。真实 AI 整理、外部连接与云同步仍在开发。', 'This explains the product’s permission structure. Live AI organization, external connections and cloud sync remain in development.')}</p></div></section>'''
        cards = [
            (t('我的信息', 'My Information'), t('你希望 AI 了解的个人背景。', 'The background you want AI to know.')),
            (t('我的规则', 'My Rules'), t('回答方式、偏好与任务边界。', 'Response preferences and task boundaries.')),
            (t('我的现在', 'My Now'), t('当前项目、近况与最近的变化。', 'Current projects, recent context and changes.')),
            (t('我的输入', 'My Inputs'), t('引用你选择的已有个人主题，分别控制读取。', 'References to existing personal topics, with separate reading choices.')),
        ]
        body += f'''<section class="fp-policy-section wrap" id="context-scopes"><aside class="fp-policy-margin"><span class="fp-label">AI Context</span><h2>{t('开放哪些内容，<br>再分别选择。', 'Choose the content<br>you want to open.')}</h2></aside><div class="fp-policy-reading"><p>{t('我的信息、我的规则、我的现在和我的输入，是“允许外部 AI 读取”中的四类内容范围。它们各自独立；写下、查看和编辑内容，都不会自动授权。', 'My Information, My Rules, My Now and My Inputs are four content scopes within external AI reading. Each is independent. Writing, viewing and editing content never grants access automatically.')}</p><dl class="fp-context-list">{''.join(f'<div><dt>{label}</dt><dd>{copy}</dd><dd class="fp-context-state"><span class="fp-off">{t("默认关闭", "Off by default")}</span></dd></div>' for label, copy in cards)}</dl><p class="fp-note">{t('总访问、卡片，以及“我的输入”中的新主题，真实初始状态均为关闭。', 'Main access, cards and new topics in My Inputs all start closed in the real product.')}</p></div></section>
<section class="fp-policy-section wrap" id="access-boundaries"><aside class="fp-policy-margin"><h2>{t('每一层允许，<br>都要清楚。', 'Clear boundaries<br>at every level.')}</h2></aside><div class="fp-rule-list"><p>{t('打开下一级，不会自动打开上一级。建立连接，也不会自动授权。', 'Opening a lower scope does not open its parent. Establishing a connection does not grant access.')}</p><p>{t('没有开放的主题，不能退回去读取整个输入档案。', 'A closed topic never grants fallback access to the whole Input Archive.')}</p><p>{t('暂停会停止之后的读取，并保留已有范围选择。已经交给外部 AI 的内容，不能通过撤回来收回。', 'Pausing stops future reads while preserving your scope choices. Withdrawal cannot recall material already delivered to an external AI.')}</p><p>{t('关闭一个主题，只改变这个主题的访问。其他卡片中独立保存的内容，仍需分别管理。', 'Closing a topic changes that topic’s access. Independent content in other cards keeps its own controls.')}</p></div></section>
<section class="fp-policy-section fp-policy-questions wrap"><aside class="fp-policy-margin"><h2>{t('也说清这些。', 'A few more distinctions.')}</h2></aside><div class="fp-data-details"><details><summary>{t('编辑、过滤和删除，有什么区别？', 'How are editing, filtering and deletion different?')}<span aria-hidden="true">+</span></summary><div><p>{t('工作文字承接修改，原始来源单独保留。阅读过滤改变可见性，不等于删除。来源平台与 PAIA 是各自的副本，一处删除不会自动删除另一处。具体移除与永久删除应按版本说明操作。', 'Edits belong to working text while the original source stays separate. Reading filters change visibility; they are not deletion. PAIA and the source platform hold separate copies, so deletion in one does not automatically delete the other. Follow the build’s instructions for removal and permanent deletion.')}</p></div></details><details><summary>{t('本地优先，意味着资料永不离开设备吗？', 'Does local-first mean data never leaves the device?')}<span aria-hidden="true">+</span></summary><div><p>{t('不意味着。日常基础功能从本地开始；你允许的外部处理、读取或同步会有各自的数据路径。本地存储本身不代表加密或永久保存保证，重要资料应同时保留独立来源。', 'No. Everyday foundations start locally; external processing, reading or sync that you permit has its own data path. Local storage is not itself a promise of encryption or permanent preservation. Keep another source for important material.')}</p></div></details><details><summary>{t('这个网站会连接我的档案吗？', 'Does this website connect to my archive?')}<span aria-hidden="true">+</span></summary><div><p>{t('不会。产品演示使用虚构资料，不连接个人档案或真实 AI。演示中的编辑只存在于当前页面，刷新即清除。主动提交联系表单时，只有填写的表单字段会交由 FormSubmit 转发。', 'No. Product examples use fictional material and connect to neither personal archives nor a live AI. Demo edits stay in the current page and clear on reload. If you submit the contact form, only its fields are forwarded through FormSubmit.')}</p>{link('privacy-policy.html', t('查看完整隐私说明', 'Read the full privacy policy'))}</div></details></div></section>'''
        body += ending(t('先看清楚，再做选择。', 'Understand it. Then choose.'))
        return title + ' — PAIA', description, f'<div class="fp-page fp-principles">{body}</div>'

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
        body = f'''<header class="fp-journal-header wrap"><div><p class="fp-label">{t('产品手记', 'Product notes')}</p><h1>{t('给还没想完的事，<br>留一点余地。', 'Room for what<br>you are still thinking through.')}</h1></div><p>{t('关于表达、积累，和使用自己的文字。', 'On expression, continuity and using your own words.')}</p></header><section class="fp-journal-list wrap" aria-label="{t('产品文章', 'Product notes')}">'''
        for i, slug in enumerate(('context', 'beliefs', 'reuse')):
            article = articles[slug]
            body += f'''<article class="fp-journal-entry {'fp-journal-featured' if i == 0 else ''}"><div class="fp-journal-meta"><p class="fp-label">{article['category']}</p><span>{t('产品手记', 'A product note')}</span></div><div class="fp-journal-entry-copy"><h2><a href="{prefix}article-{slug}.html">{article['plain']}</a></h2><p>{article['description']}</p>{link('article-' + slug + '.html', t('阅读全文', 'Read the note'))}</div><div class="fp-journal-quote"><p>{article['quote']}</p><span>{t('虚构表达示例', 'A fictional expression')}</span></div></article>'''
        body += '</section>'
        return t('产品手记 — PAIA', 'Product notes — PAIA'), t('关于个人表达、积累、上下文和复用的产品手记。', 'Product notes on personal expression, continuity, context and reuse.'), f'<div class="fp-page fp-journal">{body}</div>'

    slug = page.removeprefix('article-').removesuffix('.html')
    article = articles[slug]
    next_slug = {'context': 'beliefs', 'beliefs': 'reuse', 'reuse': 'context'}[slug]
    body = f'''<header class="fp-article-header wrap"><div class="fp-article-breadcrumb">{link('blog.html', t('产品手记', 'Product notes'))}<span aria-hidden="true">/</span><span>{article['category']}</span></div><h1>{article['title']}</h1><p class="fp-lead">{article['description']}</p></header><div class="fp-article-layout wrap"><aside class="fp-article-index"><p class="fp-label">{t('本文内容', 'In this note')}</p><nav aria-label="{t('文章目录', 'Article contents')}">{''.join(f'<a href="#{anchor}">{heading}</a>' for anchor, heading, _ in article['sections'])}</nav>{link('demo.html', t('打开产品演示', 'Explore the demo'))}</aside><article class="fp-reading"><p class="fp-reading-intro">{article['intro']}</p><figure class="fp-reading-quote"><blockquote>{article['quote']}</blockquote><figcaption>{t('虚构表达示例', 'Fictional expression')}</figcaption></figure>'''
    for anchor, heading, paragraphs in article['sections']:
        body += f'<section id="{anchor}"><h2>{heading}</h2>' + ''.join(f'<p>{paragraph}</p>' for paragraph in paragraphs) + '</section>'
    body += f'''<nav class="fp-next-note" aria-label="{t('继续阅读', 'Continue reading')}"><span class="fp-label">{t('继续阅读', 'Continue reading')}</span><a href="{prefix}article-{next_slug}.html"><strong>{articles[next_slug]['plain']}</strong><span aria-hidden="true">→</span></a></nav></article></div>'''
    return article['plain'] + ' — PAIA', article['description'], f'<div class="fp-page fp-article">{body}</div>'
