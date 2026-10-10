"""Four post-capture product previews. Fictional, browser-local, never live AI.
Owner's artwork belongs only to the existing brand marks and closing.
"""
from html import escape


def render(t, a, button, icon, standalone=False):
    def ctl(label, attr='', cls='pc-control'):
        return f'<button type="button" class="{cls}" {attr} disabled>{label}</button>'

    def sample(zh, en):
        return escape(t(zh, en))

    nav = f'''<div class="paia-core" data-core-preview data-locale="{t('zh','en')}">
<nav class="pc-nav wrap" aria-label="{t('从输入到上下文','From input to context')}">
<span class="pc-nav-label">{t('从表达，到下一步。','FROM YOUR WORDS TO WHAT’S NEXT.')}</span>
<a href="#input-library"><span>01</span>{t('查看与编辑','Review & edit')}</a>
<a href="#thought-library"><span>02</span>{t('思想库','Thought Library')}</a>
<a href="#prompt-reuse"><span>03</span>{t('提示词复用','Prompt reuse')}</a>
<a href="#personal-context"><span>04</span>{t('个人上下文','Personal context')}</a>
</nav>
<div class="pc-disclosure wrap"><span class="pc-dot"></span><details><summary>{t('示例数据 · 仅在本页体验', 'FICTIONAL DATA · TRY IT ON THIS PAGE')} <span aria-hidden="true">＋</span></summary><p>{t('虚构的产品示意，不连接档案或 AI。编辑仅在本页保留，刷新即清除。请勿输入私人资料。', 'A fictional product illustration with no archive or AI connection. Edits stay on this page and clear on reload. Please do not enter personal information.')}</p></details>{a('status.html',t('可用范围','Availability'))}</div>
<noscript><p class="wrap pc-noscript">{t('以下为静态示意；启用 JavaScript 可在本页尝试操作。','These previews are readable without JavaScript. Enable it to try the local interactions.')}</p></noscript>'''

    records = [
        ('a', '09:42', t('先比较素材找回和内容生成，看看创作者更需要什么。', 'Compare material retrieval with content generation. Find out what creators need most.')),
        ('b', '11:18', t('第一版只解决一个反复发生的问题，不做多人协作。', 'Solve one recurring problem in the first release. Leave collaboration for later.')),
        ('c', '18:03', t('判断标准不是功能多少，而是下一次任务能否接上这次积累。', 'Success is not more features. It is whether the next task can build on this one.')),
    ]
    entries = ''.join(f'''<article class="pc-record" data-input="{key}"><div class="pc-record-meta"><time><span>{["12 AUG", "26 AUG", "10 SEP"][i]}</span>{time}</time><span>0{i+1}</span></div><label class="visually-hidden" for="pc-input-{key}">{t('编辑示例输入','Edit example input')} {i+1}</label><textarea id="pc-input-{key}" data-working="{key}" rows="2" maxlength="1500" spellcheck="false" disabled>{escape(text)}</textarea></article>''' for i, (key, time, text) in enumerate(records))
    originals = ''.join(f'<p data-original="{key}">{escape(text)}</p>' for key, _, text in records)
    library = f'''<section class="pc-section pc-review wrap" id="input-library" aria-labelledby="pc-review-title">
<div class="pc-heading"><div><p class="eyebrow">01 / INPUT ARCHIVE</p><h2 id="pc-review-title">{t('你说过的，<br>都可以再找到。','Find your words.<br>Pick up the thought.')}</h2></div><div class="pc-intro"><p>{t('找到过去的一句话，回到它原本的位置。连续阅读，直接修改，原始来源始终可核对。','Find a past sentence and return to where it belongs. Read, revise and always check the original.')}</p><span class="pc-instruction">{t('试着直接修改下面的文字','Try editing the words below')} <span aria-hidden="true">↙</span></span></div></div>
<div class="pc-editor-stage pc-reveal">
<div class="pc-editor"><nav class="pc-primary-nav" aria-label="{t('示例中的产品空间','Product spaces in the example')}"><span class="pc-mini-brand">PAIA</span><a href="#input-library" aria-current="location">{icon('collect','mini-icon')}<span>Input Archive</span></a><a href="#thought-library">{icon('topic','mini-icon')}<span>Thought Library</span></a><a href="#personal-context">{icon('shield','mini-icon')}<span>AI Context</span></a><span class="pc-primary-local">{t('本地 · 示例','LOCAL · EXAMPLE')}</span></nav><aside class="pc-sidebar"><div class="pc-archive-search-label">{icon('search','mini-icon')}<span>{t('搜索全部档案','Search all inputs')}</span></div><span class="pc-side-caption">{t("对话","CONVERSATIONS")}</span><div class="pc-side-label">{t('项目','PROJECTS')}</div><div class="pc-project">⌄ <span>{t('产品探索','Product exploration')}</span></div><div class="pc-current-window"><span class="pc-dot"></span>{t('第一版应该做什么','What belongs in v1')}</div><div class="pc-side-muted">{t('用户研究','User research')}</div><div class="pc-side-muted">{t('想法与取舍','Ideas & trade-offs')}</div><div class="pc-side-bottom"><span>{t('输入属于你。<br>不只属于某个对话。','Your inputs belong to you.<br>Not just to a conversation.')}</span></div></aside>
<div class="pc-reader"><header class="pc-reader-head"><span>{t('产品探索 / 第一版应该做什么','Product exploration / What belongs in v1')}</span><span class="pc-origin-chip">ChatGPT</span></header><div class="pc-reader-tools"><label class="pc-search">{icon('search','mini-icon')}<input type="search" data-archive-search placeholder="{t('在此对话中查找','Find in this conversation')}" aria-label="{t('在此对话中查找','Find in this conversation')}" disabled></label>{ctl('↕ <span>'+t('时间顺序','Time order')+'</span>','data-sort aria-label="'+t('时间顺序 — 切换正序或倒序','Time order — reverse chronological order')+'"','pc-quiet')}<div class="pc-find-controls" data-find-controls hidden><output data-find-count role="status" aria-live="polite"></output>{ctl('↑', 'data-find-prev aria-label="'+t('上一个匹配输入','Previous matching input')+'"', 'pc-find-step')}{ctl('↓', 'data-find-next aria-label="'+t('下一个匹配输入','Next matching input')+'"', 'pc-find-step')}</div></div><div class="pc-document"><p class="pc-date">AUG — SEP 2026</p><h3>{t('第一版应该做什么','What belongs in v1')}</h3><div data-records>{entries}</div><p class="pc-empty" data-archive-empty hidden>{t('没有匹配的输入。试试其他关键词。','No matching inputs. Try a different word.')}</p><details class="pc-source"><summary>{t('原始来源','Original source')}</summary><div>{originals}</div></details></div><footer class="pc-editor-foot"><span data-edit-status role="status">{t('工作版本 · 可直接编辑','Working version · Edit directly')}</span>{ctl(t('还原示例','Reset example'),'data-reset-inputs','pc-quiet')}</footer></div>
</div><div class="pc-version-chip"><span class="pc-check">✓</span><div><strong>{t('改的是工作版本','Edit the working version')}</strong><span>{t('原始来源，仍然保留。','The original stays intact.')}</span></div></div>
</div><div class="pc-section-foot"><span>{t('查找 → 编辑 → 再利用','FIND → EDIT → REUSE')}</span><p>{t('工作文字更新，关联示例随之更新；原始来源保留。','Working edits update linked examples. Originals stay intact.')}</p></div>
</section>'''

    from prompt_preview import prompt_section
    prompts = prompt_section(t, ctl)

    from topic_preview import topic_section
    topics = topic_section(t, ctl, records)

    from product_sections import context_section, sync_section
    context = context_section(t, a, ctl, sample)
    sync = sync_section(t, a)

    close = f'''<section class="core-close" data-close-brand><div class="core-close-inner wrap"><div><p class="eyebrow">{t('你的输入始终属于你','YOUR INPUTS STAY YOURS')}</p><h2>{t('保存你对 AI 说过的话。<br>决定下一次 AI 可以使用什么。','Keep what you tell AI.<br>Decide what AI can use next.')}</h2><p>{t('把散落的表达留成自己的积累。找回原话，继续思考，把对 AI 的允许范围掌握在自己手里。','Make scattered expressions an archive of your own. Return to your words, keep developing your ideas, and decide what a connected AI may use.')}</p><div class="actions">{button('beta.html',t('申请内测','Request beta access'))}{a('status.html',t('查看当前状态','See current status'),'text-link')}</div></div><div class="core-close-mark"><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" alt="PAIA" loading="lazy" decoding="async"></div></div></section>'''
    return nav+library+topics+prompts+context+sync+'</div>'+('' if standalone else close)
