"""D6.2 shell, PT1 topics and Context Cards v2, with fictional public data.

The webpage illustrates the approved product direction. It never connects to
private archives or pretends that the planned AI services are available.
"""


def render_hero(t, a, button, icon):
    names = [('archive', 'Input Archive', 'collect'), ('thought', 'Thought Library', 'topic'), ('context', 'AI Context', 'shield')]
    tabs = ''.join(f'''<button type="button" id="pv-tab-{key}" role="tab" aria-controls="pv-panel-{key}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}" data-preview-tab="{key}" disabled>{icon(symbol, 'mini-icon')}<span>{label}</span></button>''' for i, (key, label, symbol) in enumerate(names))
    archive = f'''<div class="pv-archive">
<aside class="pv-navigator"><div class="pv-search">{icon('search', 'mini-icon')}<span>{t('搜索此对话…', 'Find in this conversation…')}</span></div><p class="pv-project">⌄ {t('产品探索', 'Product exploration')}</p>
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
    context_cards = ''.join(f'<article class="pv-context-card"><h4>{title}</h4><p>{desc}</p><div><span>{t("尚未开放", "Not shared")}</span><span class="pv-access-capsule">{t("仅自己", "Only me")}</span></div></article>' for title, desc in context_data)
    context = f'''<div class="pv-space"><div class="pv-reader-heading"><h3>AI Context</h3><span class="pv-access-capsule">{t('AI 访问：关', 'AI access: off')}</span></div><p class="pv-space-intro">{t('内容归你，允许范围也由你决定。', 'Your material. Your decisions about access.')}</p><div class="pv-context-grid">{context_cards}</div><p class="pv-source-note">{t('四卡概览示意 · 真实外部连接尚未开放', 'Four-card overview · Real external connections are not available yet')}</p></div>'''
    panels = ''.join(f'<div id="pv-panel-{key}" class="pv-panel" role="tabpanel" aria-labelledby="pv-tab-{key}" data-preview-panel="{key}"{(" hidden" if i else "")}>{content}</div>' for i, (key, content) in enumerate([('archive', archive), ('thought', thought), ('context', context)]))
    return f'''<section class="vnext-hero" data-product-hero aria-labelledby="hero-title">
<div class="optical-field" aria-hidden="true"><span class="optical-ribbon ribbon-blue"></span><span class="optical-ribbon ribbon-lilac"></span><span class="optical-ribbon ribbon-mint"></span><span class="optical-caustic"></span></div>
<div class="hero-heading wrap"><p class="hero-eyebrow"><span class="status-dot" aria-hidden="true"></span>{t('PAIA · 个人 AI 输入档案', 'PAIA · YOUR PERSONAL AI INPUT ARCHIVE')}</p>
<h1 id="hero-title">{t('你的表达，<br><span>不止于一次对话。</span>', 'Your words.<br><span>Beyond a conversation.</span>')}</h1>
<p class="hero-description">{t('找回散落的输入，串起持续的思考，复用真正好用的提示词。<br>让下一次与 AI 的协作，从你已经积累的地方开始。', 'Find your past inputs. Connect your ideas. Reuse your best prompts.<br>Start your next conversation with everything you’ve already learned.')}</p>
<div class="hero-actions">{button('demo.html', t('体验产品示例', 'Explore the product'))}{a('beta.html', t('申请内测', 'Request beta access') + ' <span aria-hidden="true">↗</span>', 'button button-secondary')}</div>
<p class="hero-scope">{t('桌面 Chrome · ChatGPT · 邀请制内测', 'Chrome desktop · ChatGPT · Private beta')}</p></div>
<div class="hero-product wrap" data-hero-product><div class="hero-product-label"><span><i class="example-dot" aria-hidden="true"></i>{t('产品预览 · 示例数据', 'PRODUCT PREVIEW · FICTIONAL DATA')}</span><button type="button" class="motion-control" data-motion-toggle aria-pressed="false" hidden>{t('暂停动效', 'Pause motion')}</button></div>
<div class="hero-product-glass" data-hero-glass><div class="pv-shell"><div class="pv-rail"><div class="pv-brand"><span class="pv-brand-symbol" aria-hidden="true"></span><span>PAIA</span></div><div class="pv-tabs" role="tablist" aria-label="{t('预览 PAIA 的三个空间', 'Preview PAIA’s three spaces')}" aria-orientation="vertical">{tabs}</div><span class="pv-local">{icon('shield', 'mini-icon')}{t('你的私人空间', 'Your private space')}</span></div><div class="pv-workspace">{panels}</div></div></div>
<a class="hero-prompt-capsule" href="#prompt-reuse"><span><strong>{t('好的表达，再用一次。', 'Good words. Ready to reuse.')}</strong><span>{t('个人提示词', 'Your personal prompts')} <span aria-hidden="true">→</span></span></span><i class="paia-orb" aria-hidden="true"></i></a>
<div class="hero-preview-caption"><p>{t('以正式产品计划为目标的交互示意，不连接你的档案或 AI。', 'An illustration of the approved product direction. No personal archive or AI connection.')}</p>{a('status.html', t('查看可用范围', 'See what is available'))}</div>
</div></section>'''
