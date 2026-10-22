"""2026-10-22 refinement of the deployed site, not the rejected flagship.

The opening, four-card composition and original closing are inherited. One
fictional moving-home thread connects the new presentation. Nothing here
accesses a personal archive, invokes a model or grants a product permission.
"""
from html import escape
from art_direction import Fragments
from presentation_home import render as previous_presentation
from launch_pages import installation

SAMPLES = {
    'zh': [
        '想搬去离公司近一点的地方，最好步行就能到。',
        '下班后的安静更重要。我不介意多坐几站地铁。',
        '保留这两个条件：夜里安静，附近可以散步。通勤不必最短。',
    ],
    'en': [
        'I want to live closer to work. Somewhere I can walk to the office.',
        'Quiet evenings matter more. I don’t mind a few extra stops on the train.',
        'Keep these two things: quiet nights and somewhere to walk. The shortest commute isn’t essential.',
    ],
}
DATES = [('2026-06-03', '6月3日', '3 Jun'), ('2026-06-18', '6月18日', '18 Jun'), ('2026-07-02', '7月2日', '2 Jul')]


def replace_block(source, cls, value):
    parsed = Fragments(source)
    return parsed.swap(parsed.one(cls), value)


def render(t, a, button, icon):
    zh = t('zh', 'en') == 'zh'
    say = lambda cn, en: cn if zh else en
    words = SAMPLES['zh' if zh else 'en']
    baseline = previous_presentation(t, a, button, icon)
    parsed = Fragments(baseline)
    hero = parsed.outer(parsed.one(attr='data-product-hero'))
    context = parsed.outer(parsed.one('pc-context'))
    closing = parsed.outer(parsed.one(attr='data-close-brand'))

    # Keep the current identity and two-column composition, but show a human
    # decision rather than repeating an abstract product-development example.
    pairs = [
        ('产品的第一步', '换个住处'), ('A product’s first step', 'Finding a place to live'),
        ('产品探索', '生活里的决定'), ('Product exploration', 'Decisions in everyday life'),
        ('用户研究与判断', '关于工作'), ('Research and decisions', 'Thoughts about work'),
        ('下一步，从哪里开始', '写作的想法'), ('Where to begin next', 'Ideas for writing'),
        ('2026.08 — 2026.09', '2026.06 — 2026.07'),
        ('2026.09.24', '2026.07.02'), ('2026.09.10', '2026.06.18'), ('2026.08.26', '2026.06.03'),
        ('2026.08.12 · 09:42', '2026.06.03 · 09:42'),
        ('2026.06.03 · 11:18', '2026.06.18 · 11:18'),
        ('2026.06.18 · 18:03', '2026.07.02 · 18:03'),
        ('先比较素材找回和内容生成，看看创作者更需要什么。', SAMPLES['zh'][0]),
        ('第一版只解决一个反复发生的问题，不做多人协作。', SAMPLES['zh'][1]),
        ('判断标准不是功能多少，而是下一次任务能否接上这次积累。', SAMPLES['zh'][2]),
        ('Compare material retrieval with content generation. Find out what creators need most.', SAMPLES['en'][0]),
        ('Solve one recurring problem in the first release. Leave collaboration for later.', SAMPLES['en'][1]),
        ('Success is not more features. It is whether the next task can build on this one.', SAMPLES['en'][2]),
    ]
    for before, after in pairs:
        hero = hero.replace(before, escape(after))
    hero = replace_block(hero, 'hero-description', f'<p class="hero-description">{say("把你对 AI 说过的话，留成自己的积累。<br>找回原话，看见想法的变化，<br>再用在下一次对话。", "Keep the thinking you put into AI.<br> Find your words, follow how your ideas change,<br> and use them again.")}</p>')
    target = installation()['chrome_store_url']
    primary = (f'<a class="button" href="{escape(target, quote=True)}" rel="noopener noreferrer">{say("添加到 Chrome", "Add to Chrome")}</a>' if target else a('demo.html', say('体验交互演示', 'Try the interactive demo'), 'button'))
    hero = replace_block(hero, 'hero-actions', '<div class="hero-actions">' + primary + a('download.html', say('查看安装状态', 'Installation status'), 'vs-secondary') + '</div>')
    hero = replace_block(hero, 'hero-product-label', f'<div class="hero-product-label"><span>{say("输入档案", "Input Archive")}</span><span>{say("产品示意 · 虚构内容", "Product illustration · Fictional content")}</span></div>')
    hero = replace_block(hero, 'pv-source-note', f'<p class="pv-source-note">{say("保留原话，也留住想法变化的过程。", "Your words, and the way your thinking changes.")}</p>')
    hero = replace_block(hero, 'hero-continuity', f'<div class="hero-continuity wrap"><p>{say("对话结束了，想法还可以继续。", "The conversation ends. Your thinking doesn’t have to.")}</p><a href="#input-library">{say("看看一段想法如何留下来", "Follow one thought")} <span aria-hidden="true">↓</span></a></div>')
    hero = hero.replace('class="vnext-hero"', 'class="vnext-hero vs-hero"')

    query = say('安静', 'Quiet')
    result = escape(words[1]).replace(query, '<mark>' + query + '</mark>')
    archive = f'''<section id="input-library" class="vs-section vs-archive wrap" aria-labelledby="vs-archive-title">
<div class="vs-copy"><p class="vs-kicker">{say('输入档案', 'Input Archive')}</p><h2 id="vs-archive-title">{say('那句话，<br>还找得到。', 'You said it once.<br>Find it again.')}</h2><p>{say('不必记得在哪个窗口说过。找到自己当时的表达，连同它的时间与来处。需要修改时，原话仍然保留。', 'You don’t have to remember which conversation it was in. Find what you said, when you said it, and where it came from. Working edits leave the source intact.')}</p>{a('demo.html', say('试试查找与编辑', 'Try finding and editing'), 'vs-text-link', '#input-library')}</div>
<div class="vs-retrieval" aria-label="{say('用关键词找回过去表达的示意', 'An illustration of finding an earlier expression')}"><div class="vs-search-sample">{icon('search', 'mini-icon')}<span>{query}</span><small>{say('查找示意', 'Example search')}</small></div><article class="vs-result"><header><span>{say('换个住处', 'Finding a place to live')}</span><span>ChatGPT</span></header><time datetime="2026-06-18">{say('2026 年 6 月 18 日', '18 June 2026')}</time><blockquote>{result}</blockquote><footer>{say('你说过的原话', 'Your original words')}<span aria-hidden="true">↗</span></footer></article><p class="vs-retrieval-note">{say('不是重新生成答案，而是找回你已经想过的。', 'Not another generated answer. Something you already thought through.')}</p></div>
</section>'''

    labels = [say('起初', 'At first'), say('后来', 'Later on'), say('现在', 'For now')]
    entries = ''.join(f'<li><div class="vs-thought-meta"><span>{labels[i]}</span><time datetime="{date[0]}">{date[1] if zh else date[2]}</time></div><p data-vs-original="{i}">{escape(words[i])}</p></li>' for i, date in enumerate(DATES))
    thought = f'''<section id="thought-library" class="vs-section vs-thought" aria-labelledby="vs-thought-title"><div class="wrap">
<header class="vs-section-heading"><div><p class="vs-kicker">{say('思想库', 'Thought Library')}</p><h2 id="vs-thought-title">{say('想法变了，<br>来路还在。', 'Ideas change.<br>The thread stays.')}</h2></div><p>{say('把不同对话中的表达，放回同一个主题。读到的不只是一份总结，还有你为什么走到今天。', 'Bring words from different conversations into one topic. See not just a conclusion, but how you arrived there.')}</p></header>
<div class="vs-thought-stage"><article class="vs-thought-paper"><header><span>{say('我的主题', 'My topics')}</span><span>{say('原话阅读', 'Reading your words')}</span></header><h3>{say('换个住处', 'Finding a place to live')}</h3><ol class="vs-thought-lines">{entries}</ol><footer>{say('同一个主题，不同时刻的自己。', 'One topic. Your perspective over time.')}</footer></article><aside class="vs-thought-aside"><span class="vs-thread-mark" aria-hidden="true"></span><p>{say('不替你得出<br>一个“最终的你”。', 'Not a fixed profile.<br>A thought you can<br>keep developing.')}</p><small>{say('保留原话和转折。<br>整理脉络，不代你下结论。', 'Keep the words and the turns.<br>Organize the thread, not your beliefs.')}</small>{a('demo.html', say('打开思想库示例', 'Explore a topic'), 'vs-text-link', '#thought-library')}</aside></div>
<p class="vs-illustration-note">{say('以上为预设的阅读示意，不是实时 AI 生成。', 'This reading illustration is preset, not generated by a live AI.')}</p>
</div></section>'''

    prompts = [say('结合我已经说过的条件，重新比较。', 'Compare again using the conditions I already gave.'), say('先指出我可能忽略的反例。', 'Start with the strongest counterexample I may have missed.'), say('把结论变成三个具体的下一步。', 'Turn the conclusion into three specific next steps.')]
    rows = ''.join(f'<button type="button" class="vs-prompt-row" data-vs-insert="{i}" disabled><span>{escape(text)}</span><span aria-hidden="true">↗</span></button>' for i, text in enumerate(prompts))
    draft = say('我更在意安静和散步的空间。', 'I care more about quiet evenings and somewhere to walk.')
    prompt = f'''<section id="prompt-reuse" class="vs-section vs-prompts wrap" aria-labelledby="vs-prompts-title">
<div class="vs-host" data-vs-host><header class="vs-host-header"><span>ChatGPT</span><span>{say('本页演示', 'On-page example')}</span></header><div class="vs-chat"><p class="vs-chat-question">{say('帮我比较这两处住所。', 'Help me compare these two places.')}</p><p class="vs-chat-response">{say('先从你最在意的条件开始。', 'Start with the things that matter most to you.')}</p></div>
<div class="vs-companion"><div class="vs-prompt-board" id="vs-prompt-board"><header>{say('我的常用表达', 'My saved expressions')}<span>{say('选择一句试试', 'Choose a phrase')}</span></header>{rows}</div><button class="vs-orb-toggle" type="button" data-vs-toggle aria-controls="vs-prompt-board" aria-expanded="true" aria-label="{say('收起或展开提示词', 'Collapse or expand saved expressions')}" disabled><span class="paia-orb" aria-hidden="true"></span></button></div>
<div class="vs-composer"><label class="visually-hidden" for="vs-draft">{say('本页演示草稿，请勿输入私人资料', 'On-page sample draft. Do not enter private information.')}</label><textarea id="vs-draft" rows="3" maxlength="1200" autocomplete="off" spellcheck="false" disabled>{escape(draft)}</textarea><div><span>{say('由你检查，再决定何时发送。', 'You review it. You decide when to send.')}</span><span class="vs-send-decoration" aria-hidden="true">↑</span></div></div>
<div class="vs-demo-status"><p data-vs-status role="status" aria-live="polite">{say('仅在本页填入，不会发送内容。', 'Fills this example only. Nothing is sent.')}</p><button type="button" data-vs-reset disabled>{say('还原示例', 'Reset example')}</button></div>
</div>
<div class="vs-copy"><p class="vs-kicker">{say('个人提示词', 'Personal prompts')}</p><h2 id="vs-prompts-title">{say('熟悉的表达，<br>不必再写一遍。', 'Your way of asking.<br>Ready again.')}</h2><p>{say('那些反复用到、真正适合你的说法，留在输入框旁边。选择一句，填入草稿，接着说下去。', 'Keep the phrases that work for you beside the composer. Choose one, add it to your draft, and carry on.')}</p><p class="vs-invitation">{say('选择一句，看看它如何填入。', 'Choose a phrase in the example to see it fill the draft.')}</p>{a('demo.html', say('体验完整的提示词面板', 'Try the full prompt panel'), 'vs-text-link', '#prompt-reuse')}<noscript><p>{say('示例文字可直接阅读；启用 JavaScript 后可尝试填入。', 'The example remains readable. Enable JavaScript to try filling the draft.')}</p></noscript></div>
</section>'''

    context = replace_block(context, 'pc-intro', f'<div class="pc-intro"><p>{say("哪些背景、规则与近况可以交给 AI，由你决定。四类内容各有边界，而不是一次开放整个档案。", "Choose which background, rules and current work an AI may know. Four separate scopes, not blanket access to your archive.")}</p>{a("demo.html", say("体验权限控制", "Explore the permission controls"), "vs-text-link", "#personal-context")}</div>')
    context = context.replace('AI 访问：开', 'AI 访问：关').replace('AI access: on', 'AI access: off').replace('AI 可读', '未开放').replace('AI readable', 'Access off').replace('2 个主题已开放', '主题单独控制').replace('2 topics open', 'Topics controlled separately')
    context = context.replace('class="pc-section pc-context"', 'class="pc-section pc-context vs-context"')
    context = context.replace('</section>', '<p class="vs-illustration-note wrap">' + say('权限界面示意。外部 AI 连接尚未开放，本页不会建立连接。', 'Permission interface illustration. External AI connections are not available yet; this page never connects.') + '</p></section>')
    trust = f'''<section class="vs-trust wrap" aria-labelledby="vs-trust-title"><div><p class="vs-kicker">{say('本地优先', 'Local first')}</p><h2 id="vs-trust-title">{say('先留在你这里。', 'Yours, first.')}</h2></div><div><p>{say('日常保存、查找、编辑和提示词复用从本地开始。需要外部处理或读取时，另行征得允许。', 'Everyday capture, search, editing and prompt reuse start locally. External processing and reading require separate permission.')}</p><p class="vs-availability">{say('公开安装尚未开放；跨设备云同步与外部 AI 接入仍未提供。网页演示无需注册。', 'Public installation is not open yet. Cross-device cloud sync and external AI connections are not available. The web demo needs no account.') if not target else say('跨设备云同步与外部 AI 接入仍未提供。支持范围以安装页与帮助为准。', 'Cross-device cloud sync and external AI connections are not available. Check installation and Help for supported features.')}</p>{a('principles.html', say('了解数据与权限', 'Read about data and permissions'), 'vs-text-link')}</div></section>'''
    return hero + '<div class="paia-core art-directed art-refined vs-content" data-home-presentation data-value-story="20261022">' + archive + thought + prompt + context + trust + '</div>' + closing
