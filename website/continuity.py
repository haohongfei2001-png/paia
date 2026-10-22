"""PAIA continuity v2: original words, meaningful cases and real local controls."""
from html import escape
from datetime import date
from art_direction import Fragments
from continuity_data import localized
from value_story import render as prior_home
from launch_pages import installation


def select(t):
    lang='zh' if t('zh','en')=='zh' else 'en'
    return lang,lambda cn,en:cn if lang=='zh' else en


def stamp(value,lang,full=False):
    d=date.fromisoformat(value)
    if lang=='zh':return f'{d.year}年{d.month}月{d.day}日' if full else f'{d.month:02d}.{d.day:02d}'
    return d.strftime('%d %b %Y' if full else '%d %b')


def record_markup(record,lang,prefix=''):
    return f'''<article class="ct-entry" data-record-id="{record['id']}" data-record-group="{record['group']}"><p data-original-text>{escape(record['text'])}</p><div class="ct-source"><time datetime="{record['date']}">{stamp(record['date'],lang)}</time><span>{escape(record['conversation'])}</span></div></article>'''


def render(t,a,button,icon):
    lang,say=select(t);cases=localized(lang);project=cases[0];entries=project['records'];by_id={e['id']:e for e in entries}
    previous=prior_home(t,a,button,icon);p=Fragments(previous)
    context=p.outer(p.one('pc-context'));close=p.outer(p.one(attr='data-close-brand'));trust=p.outer(p.one('vs-trust'))
    context=context.replace('class="pc-section pc-context vs-context"','class="pc-section pc-context ct-context"')
    # Directory presentation is inherited. It does not contain grant controls.
    context=context.replace('04 / AI CONTEXT','AI Context')
    trust=trust.replace('class="vs-trust wrap"','class="ct-trust wrap"')
    story_sources=''.join(f'''<article class="ct-fragment ct-fragment-{i}"><header><time datetime="{e['date']}">{stamp(e['date'],lang)}</time><span>{escape(e['conversation'])}</span></header><p>{escape(e['text'])}</p></article>''' for i,e in enumerate([by_id['p3'],by_id['p5']]))
    topic_sources=''.join(f'''<div class="ct-hero-chapter"><h3>{title}</h3><p>{escape(by_id[key]['text'])}</p><time datetime="{by_id[key]['date']}">{stamp(by_id[key]['date'],lang)} · {escape(by_id[key]['conversation'])}</time></div>''' for title,key in [(say('已经留下的边界','A boundary worth keeping'),'p3'),(say('还没有定论的改变','A change still to test'),'p5')])
    hero_parts=Fragments(topic_sources)
    second=[n for n in hero_parts.elements if 'ct-hero-chapter' in n.attrs.get('class','').split()][1]
    inner=hero_parts.outer(second)
    title=say('还没有定论的改变','A change still to test')
    inner=inner.replace('<div class="ct-hero-chapter">','<details class="ct-hero-chapter ct-hero-change" open>',1).replace('<h3>'+title+'</h3>','<summary>'+title+'</summary>',1)
    inner=inner.rsplit('</div>',1)[0]+'</details>'
    topic_sources=topic_sources[:second.start]+inner+topic_sources[second.end:]
    target=installation()['chrome_store_url']
    primary=f'<a class="button" href="{escape(target,quote=True)}" rel="noopener noreferrer">{say("添加到 Chrome","Add to Chrome")}</a>' if target else a('demo.html',say('体验交互演示','Try the interactive demo'),'button')
    hero=f'''<section class="ct-hero wrap" data-product-hero aria-labelledby="hero-title"><div class="ct-hero-copy hero-heading"><p class="ct-eyebrow">{say('个人 AI 输入档案','Personal AI input archive')}</p><h1 id="hero-title">{say('你的表达，<br><span>不止于对话。</span>','Your words.<br><span>Beyond the chat.</span>')}</h1><p class="ct-lead">{say('那些反复想过的问题、改变过的判断，<br>不必随着一次对话结束。','The questions you return to.<br> The decisions you revise.<br> Keep thinking beyond one conversation.')}</p><p class="ct-hero-purpose">{say('留住你发给 AI 的文字，找回、串联，再用起来。','Keep what you tell AI. Find it, connect it, use it again.')}</p><div class="hero-actions">{primary}<a class="ct-link" href="#thought-library">{say('看看一段完整的思考','Follow a complete thread')}</a></div><p class="ct-platform">Chrome · ChatGPT <span aria-hidden="true">/</span> {a('download.html',say('安装状态','Installation status'))}</p></div>
<div class="ct-hero-scene" data-hero-scene><div class="ct-scene-bar"><span>{say('同一个项目，不止一次对话','One project. More than one conversation.')}</span><div class="ct-segment" aria-label="{say('查看同一组原话的两种组织方式','View the same words in two ways')}"><button type="button" data-hero-view="conversations" aria-pressed="false" disabled>{say('按对话','Conversations')}</button><button type="button" data-hero-view="topic" aria-pressed="true" disabled>{say('按主题','A shared topic')}</button></div></div><div class="ct-evolution"><div class="ct-fragments" data-hero-panel="conversations" hidden>{story_sources}</div><article class="ct-hero-topic" data-hero-panel="topic"><header><span class="ct-topic-sign" aria-hidden="true"></span><span>{say('思想库','Thought Library')}</span></header><h2>{escape(project['title'])}</h2>{topic_sources}<a href="#thought-library" class="ct-topic-more">{say('继续读这段思考','Read the whole thread')} <span aria-hidden="true">↗</span></a></article></div><p class="ct-example-note">{say('虚构原话与预设主题示例 · 可切换，不调用 AI','Fictional words and a preset topic · Switch views without a live AI')}</p></div></section>
<div class="ct-continuity wrap"><nav aria-label="{say('产品的三个空间','Three product spaces')}"><a href="#input-library" data-hero-space="archive">{say('输入档案','Input Archive')}</a><a href="#thought-library" data-hero-space="thought">{say('思想库','Thought Library')}</a><a href="#personal-context" data-hero-space="context">AI Context</a></nav></div>'''

    query=say('项目管理','project management')
    results=''.join(f'''<article class="ct-search-result" data-search-record="{e['id']}"><p data-search-text>{escape(e['text'])}</p><footer><time datetime="{e['date']}">{stamp(e['date'],lang,True)}</time><span>{escape(e['conversation'])}</span></footer></article>''' for e in entries)
    archive=f'''<section class="ct-section ct-archive wrap" id="input-library" aria-labelledby="ct-archive-title"><div class="ct-section-copy"><p class="ct-eyebrow">{say('输入档案','Input Archive')}</p><h2 id="ct-archive-title">{say('记得那个判断，<br>不必记得那个窗口。','Remember the decision.<br>Not the conversation title.')}</h2><p>{say('当有人再次提出项目看板，先找回自己为什么没有做。不是让 AI 再猜一遍，而是回到当时说过的话。','When someone suggests a project board again, recover why you ruled it out. Not another guess from AI—your own words from that moment.')}</p><p class="ct-try-copy">{say('试着搜索“估价”或“看板”。','Try searching for “price” or “board”.')}</p></div><div class="ct-search"><label for="ct-search-input">{say('在这段项目记录中查找','Search this project’s expressions')}</label><div class="ct-search-field">{icon('search','mini-icon')}<input id="ct-search-input" type="search" value="{query}" placeholder="{say('查找原话…','Find your words…')}" autocomplete="off" spellcheck="false" disabled><button type="button" data-search-clear disabled>{say('清除','Clear')}</button></div><p class="ct-search-status" data-search-status role="status" aria-live="polite">{say('6 条虚构原话，来自 6 次对话','6 fictional expressions from 6 conversations')}</p><div class="ct-search-results" tabindex="0" role="region" aria-label="{say('示例搜索结果','Example search results')}">{results}<p class="ct-search-empty" hidden>{say('没有匹配的原话。换一个关键词，或清除搜索。','No matching expressions. Try another word, or clear the search.')}</p></div><p class="ct-example-note">{say('仅搜索本页示例，不读取你的聊天。','Searches these examples only, not your conversations.')}</p></div></section>'''

    case_buttons=''.join(f'<button type="button" id="ct-tab-{c["id"]}" role="tab" aria-selected="{str(i==0).lower()}" aria-controls="ct-panel-{c["id"]}" tabindex="{0 if i==0 else -1}" data-case-select="{c["id"]}" disabled>{escape(c["label"])}</button>' for i,c in enumerate(cases))
    panels=[]
    for i,case in enumerate(cases):
        sections=''.join(f'<details class="ct-reader-chapter" data-chapter="{g["id"]}" open><summary><h4>{escape(g["title"])}</h4><span aria-hidden="true"></span></summary><div class="ct-chapter-entries">'+''.join(record_markup(e,lang) for e in case['records'] if e['group']==g['id'])+'</div></details>' for g in case['groups'])
        panels.append(f'''<section class="ct-case-panel" id="ct-panel-{case['id']}" role="tabpanel" aria-labelledby="ct-tab-{case['id']}" data-case-panel="{case['id']}"{' hidden' if i else ''}><aside class="ct-topic-aside"><p class="ct-case-label">{escape(case['label'])}</p><h3>{escape(case['title'])}</h3><p>{escape(case['question'])}</p><div class="ct-case-range"><span>{case['records'][0]['date'][:7].replace('-','.')} — {case['records'][-1]['date'][:7].replace('-','.')}</span><span>{say('6 次对话 · 6 条原话','6 conversations · 6 expressions')}</span></div><p class="ct-case-payoff">{escape(case['outcome'])}</p></aside><div class="ct-reader" data-reader><div class="ct-reader-bar"><span>{say('同一组原话','The same original words')}</span><div class="ct-segment" aria-label="{say('阅读方式','Reading order')}"><button type="button" data-reading-mode="topic" aria-pressed="true" disabled>{say('主题脉络','By topic')}</button><button type="button" data-reading-mode="time" aria-pressed="false" disabled>{say('时间顺序','By time')}</button></div></div><div class="ct-reader-body" data-grouped>{sections}</div><div class="ct-reader-body ct-chronological" data-chronological hidden></div><footer class="ct-reader-foot">{say('保留原话、来源和未定的条件。切换不改写内容。','Original words, sources and open conditions stay intact. Switching never rewrites them.')}</footer></div></section>''')
    thought=f'''<section id="thought-library" class="ct-section ct-library" aria-labelledby="ct-library-title"><div class="wrap"><header class="ct-library-intro"><div><p class="ct-eyebrow">{say('思想库','Thought Library')}</p><h2 id="ct-library-title">{say('跨过很多次对话，<br>还是同一个问题。','Many conversations.<br>One continuing question.')}</h2></div><p>{say('从最初的疑问，到后来放下的方向。<br>把散在不同窗口里的思考，读成一段。','From your first question to a direction you set aside.<br> Read the thinking scattered across conversations as one thread.')}</p></header><div class="ct-case-tabs" role="tablist" aria-label="{say('选择虚构案例','Choose a fictional case')}">{case_buttons}</div>{''.join(panels)}<p class="ct-example-note">{say('三个案例均为虚构。主题分类已预设，切换不会调用 AI。','All three cases are fictional. Topic groupings are preset; switching does not call an AI.')}</p><noscript><p>{a('use-cases.html',say('阅读另外两个案例','Read the other two cases'),'ct-link')}</p></noscript></div></section>'''

    quote=by_id['p3']
    phrases=[say('先核对我已经否决的方向，再给建议。','Check the directions I ruled out before suggesting another one.'),say('不要只认可我的前提，指出最强的反例。','Challenge my premise with the strongest counterexample.'),say('保留不确定的地方，把下一步变成可验证的行动。','Keep the uncertainty. Make the next step something I can test.')]
    rows=''.join(f'<button type="button" data-phrase="{i}" disabled><span>{escape(text)}</span><span aria-hidden="true">↗</span></button>' for i,text in enumerate(phrases))
    draft=say('我在做一款报价工具。有人建议加项目看板。','I am building a quoting tool. Someone suggested adding a project board.')
    reuse=f'''<section id="prompt-reuse" class="ct-section ct-reuse wrap" aria-labelledby="ct-reuse-title"><div class="ct-section-copy"><p class="ct-eyebrow">{say('接着想，也接着用','Keep thinking. Keep using it.')}</p><h2 id="ct-reuse-title">{say('这次，<br>带着以前的判断。','This time,<br>bring what you know.')}</h2><p>{say('找回的原话可以再次使用。自己的常用说法，就留在输入框旁边。','Use the words you recovered. Keep your own useful phrases beside the composer.')}</p><div class="ct-kept-quote"><span>{say('之前留下的边界','A boundary you already kept')}</span><blockquote data-kept-quote>{escape(quote['text'])}</blockquote><footer><time datetime="{quote['date']}">{stamp(quote['date'],lang)}</time><button type="button" data-quote-insert disabled>{say('引用到示例草稿','Quote in the sample draft')} <span aria-hidden="true">↗</span></button></footer></div></div><div class="ct-prompt-host" data-prompt-example><header><span>{say('下一次对话','Your next conversation')}</span><small>{say('本页示例','On-page example')}</small></header><div class="ct-companion"><div class="ct-prompt-board" id="ct-prompt-board"><header>{say('我的常用表达','My saved expressions')}<span>{say('选择一句试试','Choose a phrase')}</span></header>{rows}</div><button class="ct-orb-toggle" data-prompt-toggle-v2 type="button" aria-expanded="true" aria-controls="ct-prompt-board" aria-label="{say('展开或收起常用表达','Expand or collapse saved expressions')}" disabled><span class="paia-orb" aria-hidden="true"></span></button></div><div class="ct-composer"><label for="ct-draft" class="visually-hidden">{say('本页示例草稿，请勿输入私人资料','Sample draft. Do not enter private information.')}</label><textarea id="ct-draft" rows="3" maxlength="2400" autocomplete="off" spellcheck="false" disabled>{escape(draft)}</textarea><span class="ct-composer-note">{say('只填入。发送始终由你决定。','Insert only. Sending stays with you.')}</span></div><footer class="ct-draft-footer"><p role="status" aria-live="polite" data-draft-status>{say('不连接 AI，刷新即清除。','No AI connection. Reloading clears the example.')}</p><button type="button" data-draft-reset disabled>{say('还原示例','Reset example')}</button></footer></div></section>'''
    return '<div class="ct-home" data-continuity="v2">'+hero+archive+thought+reuse+'<div class="art-directed art-refined">'+context+'</div>'+trust+'</div>'+close


def render_cases(t,a,button,invitation):
    lang,say=select(t);cases=localized(lang)
    intro=f'''<section class="nr-intro wrap ct-inner-intro"><div><p class="eyebrow">{say('使用场景','Ways to use PAIA')}</p><h1>{say('有些事情，<br>需要接着想。','Some things take<br>more than one conversation.')}</h1></div><div class="nr-intro-aside"><p class="lead">{say('不是把聊天存得更多，而是让已经想过的，影响接下来怎么做。','Not just keeping more chats. Letting what you already thought through change what you do next.')}</p><p class="ct-example-note">{say('以下均为虚构案例，不是真实用户记录或使用成效。','Fictional cases, not real user records or claims of results.')}</p></div></section>'''
    body=''
    for case in cases:
        quote=next(e for e in case['records'] if e['id']==case['quote'])
        records=''.join(record_markup(e,lang) for e in case['records'])
        url=('/zh/' if lang=='zh' else '/')+'?case='+case['id']+'#thought-library'
        body+=f'''<article class="ct-case-article" id="case-{case['id']}"><header><p class="ct-eyebrow">{escape(case['label'])}</p><h2>{escape(case['title'])}</h2><p>{escape(case['question'])}</p></header><div class="ct-case-evidence"><div><span class="ct-eyebrow">{say('之前说过','What you said before')}</span><blockquote>{escape(quote['text'])}</blockquote><p class="ct-source">{stamp(quote['date'],lang,True)} · {escape(quote['conversation'])}</p></div><div><span class="ct-eyebrow">{say('这一次继续','What you ask next')}</span><p>{escape(case['next'])}</p></div></div><p class="ct-case-consequence">{escape(case['outcome'])}</p><details class="ct-full-thread"><summary>{say('查看这段思考的全部 6 条原话','Read all 6 expressions in this thread')}</summary><div>{records}</div></details><a href="{url}" class="ct-link">{say('在交互主题中查看','Explore the interactive topic')} <span aria-hidden="true">↗</span></a></article>'''
    return '<div class="ct-page">'+intro+'<div class="wrap">'+body+'</div></div>'+invitation()


def render_how(t,a,button,invitation):
    lang,say=select(t);project=localized(lang)[0];e=project['records'][2]
    intro=f'''<section class="nr-intro wrap ct-inner-intro"><div><p class="eyebrow">{say('如何使用','How PAIA works')}</p><h1>{say('留下来，<br>再用起来。','Keep it.<br>Put it to use.')}</h1></div><div class="nr-intro-aside"><p class="lead">{say('以一条真实感的虚构输入，说明保存、找回、主题和复用如何衔接。','Follow one fictional expression through capture, retrieval, topics and reuse.')}</p>{a('demo.html',say('直接体验交互演示','Try the interactive demo'),'ct-link')}</div></section>'''
    steps=[('capture',say('留下','Keep')),('archive',say('找回','Find')),('thought',say('串联','Connect')),('prompt',say('复用','Reuse')),('context',say('控制','Control'))]
    top='<div class="nr-process-top wrap"><nav class="ct-how-index" aria-label="'+say('使用步骤','Steps')+'">'+''.join(f'<a href="#{key}">{label}</a>' for key,label in steps)+'</nav></div>'
    scene=f'<blockquote>{escape(e["text"])}</blockquote><p class="ct-source">{stamp(e["date"],lang,True)} · ChatGPT · {escape(e["conversation"])}</p>'
    flow=[
      ('capture',say('照常说出你的想法。','Say what you think.'),say('在支持的 ChatGPT 页面主动开启保存后，PAIA 才留下你已经发送的文字。未发送的草稿不是采集对象。','After capture is enabled on a supported ChatGPT page, PAIA keeps the words you send. Unsent drafts are not captured.'),scene),
      ('archive',say('找回的是你的原话。','Recover your own words.'),say('用会话或关键词回到那条输入。工作文字可以修订，原始来源单独保留。','Find the input by conversation or keyword. You can revise the working text; its source is retained separately.'),f'<p>{say("这次想找：为什么没有做项目管理？","This time: why did I rule out project management?")}</p><details><summary>{say("查看保留的原话","Read the retained original")}</summary>{scene}</details>'),
      ('thought',say('一个主题，容下多次讨论。','One topic can hold many conversations.'),say('主题中的章节保留问题、取舍和未决之处，而不是把它们压成一句最终结论。官网展示预设组织，不调用实时 AI。','Sections can retain the question, the trade-offs and what remains open—not compress them into a final belief. The website shows preset organization, not a live model.'),f'<div class="ct-how-chapters"><h3>{escape(project["title"])}</h3>'+''.join(f'<p>{escape(g["title"])}</p>' for g in project['groups'])+'</div>'+a('index.html',say('阅读完整主题','Read the complete topic'),'ct-link','#thought-library')),
      ('prompt',say('继续之前，带上已经想过的。','Bring earlier thinking into the next task.'),say('复用一条原话，再从自己的提示词中选择合适的追问。已有草稿保留，最后仍由你决定是否发送。','Reuse an earlier expression and choose a familiar follow-up from your prompts. The existing draft stays; you decide whether to send.'),f'<p class="ct-next-question">{escape(project["next"])}</p>'+a('index.html',say('试试引用和填入','Try quoting and inserting'),'ct-link','#prompt-reuse')),
      ('context',say('保存，不等于对 AI 开放。','Keeping is not granting access.'),say('我的信息、我的规则、我的现在和我的输入分别管理。外部 AI 连接尚未开放；本页演示不会授权或传送个人资料。','My Information, My Rules, My Now and My Inputs are managed separately. External AI connections are not available yet. This example never grants access or transmits personal material.'),a('demo.html',say('体验独立的四卡控制','Explore the four independent controls'),'ct-link','#personal-context')),
    ]
    body=''.join(f'<section class="ct-how-step" id="{key}"><div><p class="ct-eyebrow">{dict(steps)[key]}</p><h2>{title}</h2><p>{copy}</p></div><div class="ct-how-scene">{visual}</div></section>' for key,title,copy,visual in flow)
    return '<div class="ct-page">'+intro+top+'<div class="wrap">'+body+'</div></div>'+invitation()
