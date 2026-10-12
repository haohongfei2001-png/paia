"""Scroll-driven, browser-local PAIA homepage illustrations.

The original product demos and all copy remain the only interactive/data owners.
Scroll controls presentation only; it does not authorize AI, mutate an Input,
send a message, or commit a reader decision.
"""
from html import escape
import re
from art_direction import Fragments

def _swap_one(source, cls, replacement):
    parsed = Fragments(source)
    return parsed.swap(parsed.one(cls), replacement)

def _snippet(source, key):
    pattern = r'<p data-thought-text="' + key + r'">(.*?)</p>'
    match = re.search(pattern, source, re.S)
    if not match:
        raise ValueError("Missing original illustrative Input " + key)
    return match.group(1)

def apply_scroll_story(source, t):
    # Replace the three simultaneous decorative examples with one evolving
    # control. The existing real prompt board, capsule, draft, and reader
    # actions are preserved below.
    stages = f'''<div class="ad-morph-track" data-morph-track>
<button class="ad-morph-button" type="button" data-story-advance disabled aria-label="{t('查看下一种悬浮形态','Show the next floating form')}">
<i class="paia-orb" aria-hidden="true"></i>
<span data-ad-specimen-text></span><span class="ad-morph-chevron" aria-hidden="true">⌃</span>
</button><span class="ad-morph-note" aria-hidden="true">{t('滚动查看形态演变','Scroll to see the transformation')}</span></div>'''
    source = _swap_one(source, 'ad-shapes', stages)

    # This preview is deliberately visual, not another writer into the
    # ChatGPT composer. A user's actual draft is never overwritten by scroll.
    draft = t('结合我的实际约束重新分析。','Re-evaluate this using my actual constraints.')
    source = source.replace(
        '<div class="pc-composer">',
        '<div class="pc-composer"><span class="ad-scroll-draft" data-scroll-draft aria-hidden="true">'+escape(draft)+'</span>',
        1,
    )

    q = Fragments(source)
    prompt = q.one('pc-prompts')
    text = q.outer(prompt)
    q2 = Fragments(text)
    body = q2.inner(q2.elements[0])
    story_marker = (
        '<div class="ad-scroll-track ad-prompt-scroll" data-scroll-story="prompt" '
        'data-phase="orb"><div class="ad-scroll-sticky">'
        + body +
        '</div><div class="ad-scroll-end" aria-hidden="true"></div></div>'
    )
    source = q.swap(prompt, q.opened(prompt) + story_marker + '</section>')

    # Preserve the original PT1 Topic/Section navigation and literal source
    # expression. The added layers are explicitly page-local, fictional
    # presentation, never a claim of generated knowledge or model execution.
    q = Fragments(source)
    topics = q.one('pc-topics')
    text = q.outer(topics)
    first = _snippet(text, 'a')
    second = _snippet(text, 'b')
    third = _snippet(text, 'c')
    note = _snippet(text, 'note')
    visual = f'''<div class="ad-thought-scenes" aria-hidden="true">
<div class="ad-thought-focus ad-thought-scene">
<div class="ad-thought-small-tag">{t('主题 / 产品的第一步','TOPIC / A PRODUCT’S FIRST STEP')}</div>
<div class="ad-thought-expanded"><span class="ad-story-date">12 AUG — 10 SEP</span>
<h3>{t('产品的第一步','A product’s first step')}</h3>
<div class="ad-story-expressions"><p>{first}</p><p>{second}</p><p>{third}</p></div></div></div>
<div class="ad-thought-organized ad-thought-scene">
<span class="ad-ai-cue">{t('AI 整理 · 规划能力 · 预设示意','AI ORGANIZATION · PLANNED · PRESET EXAMPLE')}</span>
<div class="ad-organized-core"><span class="ad-organized-core-dot"></span>
<h3>{t('产品的第一步','A product’s first step')}</h3><p>{note}</p></div>
<div class="ad-organized-path"><div class="ad-organized-branch">
<span>01</span><h4>{t('探索方向','Exploring a direction')}</h4><p>{first}</p></div>
<div class="ad-organized-branch"><span>02</span><h4>{t('判断与取舍','Decisions and trade-offs')}</h4><p>{third}</p></div></div>
</div></div>'''
    q2 = Fragments(text)
    stage = q2.one('pc-topic-stage')
    text = q2.swap(stage, q2.outer(stage) + visual)
    q2 = Fragments(text)
    root = q2.elements[0]
    text = q2.opened(root) + (
        '<div class="ad-scroll-track ad-thought-scroll" data-scroll-story="thought" data-phase="cards">'
        '<div class="ad-scroll-sticky">'
        + q2.inner(root) +
        '</div><div class="ad-scroll-end" aria-hidden="true"></div></div>'
    ) + '</section>'
    source = q.swap(topics, text)

    # The unwanted second Context showcase is removed from the default page.
    # Its scope preview and original working permissions remain available by
    # explicit disclosure, rather than deleting controls or hiding real state.
    q = Fragments(source)
    context = q.one('pc-context')
    local = q.outer(context)
    local = _swap_one(
        local, 'pc-access',
        f'<details class="ad-context-disclosure"><summary>{t("查看授权范围和说明","Review access and scope")}'
        '<span aria-hidden="true">⌄</span></summary>'
        + Fragments(local).outer(Fragments(local).one('pc-access')) +
        '</details>',
    )
    source = q.swap(context, local)
    Fragments(source)
    return source
