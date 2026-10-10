"""Designed public journeys, using fictional examples and approved product scope."""
from home import icon


def render_pages(t, a, button, invitation):
    def intro(kicker, title, body='', extra='', cls=''):
        return f'''<section class="nr-intro wrap {cls}"><div><p class="eyebrow">{kicker}</p><h1>{title}</h1></div><div class="nr-intro-aside">{f'<p class="lead">{body}</p>' if body else ''}{extra}</div></section>'''

    def window_bar(title, detail=''):
        return f'<div class="nr-window-bar"><span class="nr-window-mark" aria-hidden="true"></span><strong>{title}</strong><span>{detail}</span></div>'

    def sample_caption(label):
        return f'<figcaption class="nr-scene-caption"><span class="nr-caption-line" aria-hidden="true"></span>{label}</figcaption>'

    from usage_pages import render_usage_pages
    pages = render_usage_pages(t, a, button, invitation, icon)

    articles = [
        ('context', '01', t('关于积累', 'ON CONTINUITY'), t('聊天历史之外，<br>还需要什么？', 'What do you need<br>beyond chat history?'), t('原生搜索、Project 和记忆已经有用；精确管理自己的输入，是另一个选择。', 'Search, Projects and Memory already help. Working directly with your own inputs is a separate choice.'), t('对话会结束。<br>你的思考不必结束。', 'A conversation ends.<br>Your thinking can continue.'), [
            (t('找到原话，而不是重新猜一次。', 'Return to your words.'), t('ChatGPT 的搜索能找回历史内容，Project 能组织持续工作，Memory 能使用相关过往信息。PAIA 不以这些功能不存在为前提，而是专注于逐条核对和管理用户自己的输入。', 'ChatGPT Search finds past content, Projects organize ongoing work, and Memory can use relevant past information. PAIA does not assume those features are absent. It focuses on inspecting and managing your own inputs as individual pieces of material.'), t('例如“只尝试了两周，不能推广给所有人”，这不只是文章主题，还是一条需要完整保留的证据边界。原始来源和可修改工作文字分开，才能在需要时检查差异。', '“I tried it for two weeks; don’t generalize it to everyone” is not just a topic. It is an evidence limit worth preserving in full. Keeping the original source separate from working edits lets you inspect the difference.')),
            (t('对话会结束，主题可以继续。', 'A conversation ends. A topic can continue.'), t('同一个项目可能分散在许多会话里。个人主题与章节把它们放在一处，让先前的决定、仍待验证的问题和新的材料能够连续阅读。', 'A project may run through many conversations. Personal topics and sections bring it together, so earlier decisions, open questions and new material can be read continuously.'), t('你的命名、排列、修改和排除始终优先。AI 整理是在这些内容之上的阅读帮助，而不是另一份不可修改的结论。', 'Your names, order, edits and exclusions take priority. AI organization is a reading aid over that material, not another unchangeable conclusion.')),
            (t('保存与允许读取，是两次选择。', 'Keeping and allowing access are separate choices.'), t('Context 的我的信息、我的规则、我的现在和我的输入，把背景与允许范围放在明处。真实连接可用后，AI 才能按获准范围按需读取。', 'My Information, My Rules, My Now and My Inputs make your background and reading permissions explicit. Once real connections are available, AI can read on demand within the allowed scope.'), t('安装或保存本身不会自动开放整个档案。真实 AI 整理与外部连接仍在开发，官网展示的是正式计划的目标体验。', 'Installation or capture does not open the whole archive. Live AI organization and external connections are still in development; the website illustrates the experience in the approved plan.')),
        ]),
        ('beliefs', '02', t('关于表达', 'ON EXPRESSION'), t('发给 AI 的，<br>不一定是你的观点。', 'Not every input<br>is a belief.'), t('引用、试探和任务指令，都需要保留各自的语境。', 'Quotations, experiments and instructions need their own context.'), t('你说过什么，<br>不等于你永远相信什么。', 'What you once said<br>is not all you believe.'), [
            (t('输入里有多种声音。', 'An input can contain several voices.'), t('你可能把一份岗位说明、一段待改写文字或一个假设发给 AI。这能证明你发送过这些文字，但不能证明每句话都是你的长期立场。', 'You might send AI a job description, a draft to rewrite or a hypothetical argument. The record establishes that you sent those words. It does not establish that every sentence is a lasting belief.'), t('所以，保存表达也需要保存语境：文字来自哪里、为何被提出，以及哪些只是有待讨论的可能性。', 'Keeping an expression also means keeping its context: where it came from, why it was raised, and what was only a possibility to discuss.')),
            (t('整理要能够回到来源。', 'Organization must stay traceable.'), t('原话优先、平衡整理和更加概括，改变的是衍生阅读方式。无论哪一种，都需要保留条件、立场与不确定性，并能回到来源核对。', 'Original-first, Balanced and More concise change the derived reading view. Each must preserve conditions, perspective and uncertainty, and remain traceable to sources.'), t('AI 不应替你发明观点，也不应因为概括得更顺畅，就删去原本关键的限制条件。真实 AI 整理服务仍在开发。', 'AI should not invent a position for you or remove a crucial condition for the sake of a smoother summary. The live AI organization service is still in development.')),
            (t('当前选择仍然属于你。', 'The current choice still belongs to you.'), t('过去说过的话不一定适用于现在。你可以修改工作内容、管理主题，以及关闭 AI 访问。', 'Past words may no longer apply. You can revise working content, manage topics and close AI access.'), t('让旧表达成为可参考的材料，不让它自动变成对未来行为的授权。这是个人积累应有的边界。', 'Let an earlier expression become useful reference material, without making it automatic permission for a future action. A personal archive should keep that boundary clear.')),
        ]),
        ('reuse', '03', t('关于复用', 'ON REUSE'), t('自己的常用说法，<br>应该就在手边。', 'Keep your useful<br>phrases close.'), t('不用一次次翻旧聊天，也不替你自动发送。', 'Less searching through old chats. Sending stays with you.'), t('不是重新说一遍。<br>是接着说下去。', 'Less starting again.<br>More moving forward.'), [
            (t('复用已经适合自己的表达。', 'Reuse expressions that suit your work.'), t('反复使用的分析要求、写作标准或追问方式，是你自己的工作习惯。PAIA 的个人提示词围绕这些真实表达组织，把相似说法放在一起。', 'Repeated analysis requests, writing standards and follow-up questions are part of your own practice. PAIA organizes personal prompts around those expressions and related wordings.'), t('不必先挑选一套公共模板。自己已经用得顺手的说法，就是一个足够好的起点。', 'You do not need to begin with a public template collection. A phrase that already works for you is a useful starting point.')),
            (t('表达可以跟着工作改变。', 'Let your phrases change with your work.'), t('你可以改写、固定、排序或隐藏自己的提示词。下一次点选填入 AI 输入框，检查和修改后再发送。', 'Rewrite, pin, reorder or hide your prompts. Next time, choose one to fill the AI composer, review or edit it, then send.'), t('已有草稿保留。提示词库不会替你点击发送，也不会把旧指令当作新的执行许可。', 'Your existing draft stays. The prompt library does not send on your behalf or turn an old instruction into fresh execution authority.')),
            (t('请求与背景，各有位置。', 'Your request and your background have their own place.'), t('个人提示词帮助你更快表达当前请求；四卡 Context 管理你允许连接的 AI 按需了解的背景和主题。', 'Personal prompts help you express the current request. Four-card Context manages the background and topics a connected AI may read when needed.'), t('它们互相补充，不要求你每次复制整段历史。真实 Context 连接仍在开发，本地提示词能力以获邀版本为准。', 'They complement one another without asking you to copy an entire history. Real Context connections are still in development. Local prompt availability depends on the invited build.')),
        ]),
    ]

    def editorial_art(slug):
        if slug == 'context':
            words = [t('一次对话', 'A conversation'), t('一个主题', 'A topic'), t('持续的思考', 'Ongoing thought')]
        elif slug == 'beliefs':
            words = [t('“假如……”', '“What if…”'), t('“有人说……”', '“Someone said…”'), t('“我认为……”', '“I think…”')]
        else:
            words = [t('给出反例。', 'Find the counterexample.'), t('说明依据。', 'Show the reasoning.'), t('接着说下去。', 'Keep thinking.')]
        sheets = ''.join(f'<span class="nr-art-sheet nr-art-sheet-{i + 1}"><i>0{i + 1}</i><strong>{word}</strong></span>' for i, word in enumerate(words))
        return f'<div class="nr-editorial-art nr-art-{slug}" aria-hidden="true"><div class="nr-editorial-axis"></div>{sheets}</div>'

    blog = intro(t('产品文章', 'NOTES FROM PAIA'), t('关于表达。<br>关于积累。<br><span>关于下一步。</span>', 'On expression.<br>On continuity.<br><span>On what comes next.</span>'), t('几个简单的原则，决定了 PAIA 如何对待你的文字。', 'A few simple principles shape the way PAIA treats your words.'), cls='nr-journal-intro')
    blog += '<section class="nr-journal wrap" aria-label="' + t('产品文章', 'Product notes') + '">'
    for slug, num, topic, title, summary, pull, sections in articles:
        label = f'<div class="nr-journal-copy"><div class="nr-journal-meta"><span>{num}</span><span>{topic}</span></div><h2>{title}</h2><p>{summary}</p><span class="nr-read-link">{t("阅读全文", "Read the note")} <span aria-hidden="true">↗</span></span></div>{editorial_art(slug)}'
        blog += a('article-' + slug + '.html', label, 'nr-journal-entry nr-journal-' + slug)
    blog += '</section>'
    pages.append(('blog.html', t('PAIA — 产品文章', 'PAIA — Product notes'), t('关于个人表达、上下文与复用的产品思考。', 'Product notes on personal expression, context and reuse.'), blog))

    for index, (slug, num, topic, title, summary, pull, sections) in enumerate(articles):
        body = f'''<header class="nr-article-header wrap"><div class="nr-article-label">{a('blog.html', t('产品文章', 'Product notes'))}<span aria-hidden="true">/</span><span>{num} · {topic}</span></div><h1>{title}</h1><p class="lead">{summary}</p>{editorial_art(slug)}</header><div class="nr-article-layout wrap"><div class="nr-article-aside"><p class="nr-ui-label">{t('本篇内容', 'IN THIS NOTE')}</p><nav aria-label="{t('文章目录', 'Article contents')}">{''.join(f'<a href="#section-{i + 1}"><span>0{i + 1}</span>{heading}</a>' for i, (heading, _, _) in enumerate(sections))}</nav>{a('demo.html', t('体验产品示例', 'Explore the example'), 'text-link')}</div><article class="nr-article-body">'''
        for i, (heading, paragraph, second) in enumerate(sections):
            body += f'<section id="section-{i + 1}" data-reveal><span class="nr-article-section-number">0{i + 1}</span><h2>{heading}</h2><p>{paragraph}</p><p>{second}</p></section>'
            if i == 0:
                body += f'<blockquote class="nr-pullquote" data-reveal><span aria-hidden="true">“</span><p>{pull}</p></blockquote>'
        next_article = articles[(index + 1) % len(articles)]
        body += f'''<nav class="nr-article-next" aria-label="{t('继续阅读', 'Continue reading')}"><span class="nr-ui-label">{t('下一篇', 'NEXT NOTE')}</span>{a('article-' + next_article[0] + '.html', f'<strong>{next_article[3]}</strong><span aria-hidden="true">↗</span>')}{a('blog.html', t('查看全部文章', 'All product notes'), 'text-link')}</nav></article></div>'''
        pages.append(('article-' + slug + '.html', 'PAIA — ' + title.replace('<br>', ' ').replace('<br/>', ' '), summary, body))
    return pages
