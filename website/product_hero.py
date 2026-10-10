"""D6.2 shell, PT1 topics and Context Cards v2, with fictional public data.

The webpage illustrates the approved product direction. It never connects to
private archives or pretends that the planned AI services are available.
"""


def render_hero(t, a, button, icon):
    names = [('archive', 'Input Archive', 'collect'), ('thought', 'Thought Library', 'topic'), ('context', 'AI Context', 'shield')]
    tabs = ''.join(f'''<button type="button" id="pv-tab-{key}" role="tab" aria-controls="pv-panel-{key}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}" data-preview-tab="{key}" disabled>{icon(symbol, 'mini-icon')}<span>{label}</span></button>''' for i, (key, label, symbol) in enumerate(names))
    archive = f'''<div class="pv-archive">
<aside class="pv-navigator"><div class="pv-search">{icon('search', 'mini-icon')}<span>{t('搜索全部档案', 'Search all inputs')}</span></div><p class="pv-project">⌄ {t('产品探索', 'Product exploration')}</p>
<div class="pv-conversation is-selected"><strong>{t('产品的第一步', 'A product’s first step')}</strong><span>2026.09.24</span></div>
<div class="pv-conversation"><strong>{t('用户研究与判断', 'Research and decisions')}</strong><span>2026.09.10</span></div>
<div class="pv-conversation"><strong>{t('下一步，从哪里开始', 'Where to begin next')}</strong><span>2026.08.26</span></div>
<p class="pv-project pv-project-secondary">› {t('写作与学习', 'Writing and learning')}</p></aside>
<div class="pv-reader"><div class="pv-reader-heading"><h3>{t('产品的第一步', 'A product’s first step')}</h3><span aria-hidden="true">···</span></div><p class="pv-meta">2026.08 — 2026.09 · ChatGPT</p>
<div class="pv-expression"><time>2026.08.12 · 09:42</time><p>{t('先比较素材找回和内容生成，看看创作者更需要什么。', 'Compare material retrieval with content generation. Find out what creators need most.')}</p></div>
<div class="pv-expression"><time>2026.08.26 · 11:18</time><p>{t('第一版只解决一个反复发生的问题，不做多人协作。', 'Solve one recurring problem in the first release. Leave collaboration for later.')}</p></div>
<div class="pv-expression"><time>2026.09.10 · 18:03</time><p>{t('判断标准不是功能多少，而是下一次任务能否接上这次积累。', 'Success is not more features. It is whether the next task can build on this one.')}</p></div>
<p class="pv-source-note">{t('工作文字可以修改，原始来源仍然保留。', 'Edit your working text. The original source stays intact.')}</p>
</div></div>'''
    topic_data = [
        (t('产品的第一步', 'A product’s first step'), [t('探索方向', 'Exploring a direction'), t('范围与边界', 'Scope and boundaries'), t('判断标准', 'Decision criteria')]),
        (t('写作习惯', 'Writing practice'), [t('先说清楚', 'Making the point'), t('修改与取舍', 'Editing and choosing')]),
        (t('学习与理解', 'Learning and understanding'), [t('从问题开始', 'Start with a question'), t('建立自己的解释', 'Find your own explanation')]),
        (t('持续的想法', 'Ongoing ideas'), [t('值得再看一遍', 'Worth revisiting')]),
    ]
    topic_blocks = ''.join(f'<article class="pv-topic"><h4>{title}</h4>{"".join(f"<p>{section}</p>" for section in sections)}</article>' for title, sections in topic_data)
    thought = f'''<div class="pv-space"><div class="pv-reader-heading"><h3>Thought Library</h3><span class="pv-mini-control">{t('个人主题', 'Personal topics')}</span></div><p class="pv-space-intro">{t('按你的主题，留下可以继续的思考。', 'Your topics. Ideas you can return to.')}</p><div class="pv-topics">{topic_blocks}</div><p class="pv-source-note">{t('个人主题 → 章节 → 连续阅读的内容', 'Personal topics → Sections → Continuous reading')}</p></div>'''
    context_data = [
        (t('我的信息', 'My Information'), t('关于我的背景', 'Background about me')),
        (t('我的规则', 'My Rules'), t('我希望的回应方式', 'How I want AI to respond')),
        (t('我的现在', 'My Now'), t('当下的事情与条件', 'What matters right now')),
        (t('我的输入', 'My Inputs'), t('允许深入读取的主题', 'Topics open for reading')),
    ]
    context_cards = ''.join(f'<article class="pv-context-card"><h4>{title}</h4><p>{desc}</p><div><span>{t("示例已授权", "Sample permission granted")}</span><span class="pv-access-capsule">{t("AI 可读", "AI readable")}</span></div></article>' for title, desc in context_data)
    context = f'''<div class="pv-space"><div class="pv-reader-heading"><h3>AI Context</h3><span class="pv-access-capsule">{t('AI 访问：开', 'AI access: on')}</span></div><p class="pv-space-intro">{t('内容归你，允许范围也由你决定。', 'Your material. Your decisions about access.')}</p><div class="pv-context-grid">{context_cards}</div><p class="pv-source-note">{t('示例用户已授权 · 本页没有真实 AI 连接', 'Pre-authorized sample · No real AI connection')}</p></div>'''
    panels = ''.join(f'<div id="pv-panel-{key}" class="pv-panel" role="tabpanel" aria-labelledby="pv-tab-{key}" data-preview-panel="{key}"{(" hidden" if i else "")}>{content}</div>' for i, (key, content) in enumerate([('archive', archive), ('thought', thought), ('context', context)]))
    return f'''<section class="vnext-hero" data-product-hero aria-labelledby="hero-title">
<div class="optical-field" aria-hidden="true"><span class="optical-sheet" data-scroll-art></span><span class="optical-rule"></span><span class="optical-index">PAIA / 01</span></div>
<div class="hero-grid wrap"><div class="hero-heading"><p class="hero-eyebrow"><span class="status-dot" aria-hidden="true"></span>{t('个人 AI 输入档案', 'PERSONAL AI INPUT ARCHIVE')}</p>
<h1 id="hero-title">{t('你的表达，<br><span>不止于对话。</span>', 'Your words.<br><span>Beyond the chat.</span>')}</h1>
<p class="hero-description">{t('保存你对 AI 说过的话。<br>找回、串联、复用，<br>让下一次从这里开始。', 'Keep what you tell AI.<br>Find it. Connect it. Reuse it.<br>Begin with what you already know.')}</p>
<div class="hero-actions">{button('demo.html', t('体验 PAIA', 'Explore PAIA'))}{a('beta.html', t('申请内测', 'Request access') + ' <span aria-hidden="true">↗</span>', 'hero-secondary')}</div>
<p class="hero-scope">{t('Chrome · ChatGPT · 邀请制内测', 'Chrome · ChatGPT · Private beta')}</p>
<a class="hero-explore" href="#input-library"><span class="hero-scroll-mark" aria-hidden="true">↓</span><span>{t('看见你的积累', 'See what stays with you')}</span></a></div>
<div class="hero-product" data-hero-product><div class="hero-product-label"><span>PAIA / DESKTOP</span><span><i class="example-dot" aria-hidden="true"></i>{t('可切换的产品示意', 'EXPLORE THE THREE SPACES')}</span></div>
<div class="hero-stack" aria-hidden="true"><i></i><i></i></div>
<div class="hero-product-glass" data-hero-glass><div class="pv-shell"><div class="pv-rail"><div class="pv-brand"><span class="pv-brand-symbol" aria-hidden="true"></span><span>PAIA</span></div><div class="pv-tabs" role="tablist" aria-label="{t('预览 PAIA 的三个空间', 'Preview PAIA’s three spaces')}" aria-orientation="vertical">{tabs}</div><span class="pv-local">{icon('shield', 'mini-icon')}{t('你的私人空间', 'Your private space')}</span></div><div class="pv-workspace">{panels}</div></div></div>
<a class="hero-prompt-capsule" href="#prompt-reuse"><i class="paia-orb" aria-hidden="true"></i><span><strong>{t('好的表达，再用一次。', 'Good words. Ready again.')}</strong><span>{t('你的个人提示词', 'YOUR PERSONAL PROMPTS')} <span aria-hidden="true">↗</span></span></span></a>
<div class="hero-preview-caption"><p>{t('虚构数据 · 不连接你的档案或 AI', 'Fictional data · No personal archive or AI connection')}</p>{a('status.html', t('可用范围', 'Availability'))}</div>
</div></div>
<div class="hero-continuity wrap"><span>{t('表达有来源。思考有来处。下一次，有起点。', 'Words with a source. Ideas with a history. A place to begin again.')}</span><span aria-hidden="true">01 — 04</span></div>
</section>'''
