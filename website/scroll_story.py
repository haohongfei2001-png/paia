"""Homepage-only, fictional scroll illustrations; never a product data writer.

The interactive Topic, Prompt and Context controllers remain the sole owners of
actual edits. A stable reading sheet and fixed companion anchor carry the story.
"""
from html import escape
import re
from art_direction import Fragments


def _swap_one(source, cls, replacement):
    parsed = Fragments(source)
    return parsed.swap(parsed.one(cls), replacement)


def _snippet(source, key):
    match = re.search(r'<p data-thought-text="' + key + r'">(.*?)</p>', source, re.S)
    if not match:
        raise ValueError("Missing original illustrative Input " + key)
    return match.group(1)


def apply_scroll_story(source, t):
    # Move the preview control into the real board's positioning wrapper. Its
    # right/bottom anchor is identical to the existing board toggle in all modes.
    stages = f'''<div class="ad-morph-track" data-morph-track>
<button class="ad-morph-button" type="button" data-story-advance disabled aria-label="{t('查看下一种悬浮形态','Show the next floating form')}">
<i class="paia-orb" aria-hidden="true"></i><span data-ad-specimen-text></span><span class="ad-morph-chevron" aria-hidden="true">⌃</span>
</button><span class="ad-morph-note" aria-hidden="true">{t('滚动查看形态演变','Scroll to see the transformation')}</span></div>'''
    source = _swap_one(source, 'ad-shapes', '')
    parsed = Fragments(source)
    palette = parsed.one('pc-palette-wrap')
    source = parsed.swap(palette, parsed.opened(palette) + stages + parsed.inner(palette) + '</div>')

    # Retain the existing text and composer owner. New chat chrome is decorative
    # and labelled as a synthetic ChatGPT-shaped setting, never a live account.
    user_question = escape(t('第一版应该做什么', 'What belongs in v1'))
    user_bubble = '<div class="ad-chatgpt-user" aria-hidden="true">' + user_question + '</div>'
    source = source.replace('<div class="pc-answer-body">', user_bubble + '<div class="pc-answer-body">', 1)
    response_tools = '''<span class="ad-chatgpt-actions" aria-hidden="true"><svg viewBox="0 0 72 20" fill="none" stroke="currentColor" stroke-width="1.15"><rect x="3" y="5" width="9" height="11" rx="2"/><path d="M6 3h7a2 2 0 0 1 2 2v8M28 8l4-5h2v5h5l-2 8h-9zm-3 0h3v8h-3zM54 12l4 5h2v-5h5l-2-8h-9zm-3-8h3v8h-3z"/></svg></span>'''
    parsed = Fragments(source)
    answer_body = parsed.one('pc-answer-body')
    source = parsed.swap(answer_body, parsed.opened(answer_body) + parsed.inner(answer_body) + response_tools + '</div>')

    draft = t('结合我的实际约束重新分析。', 'Re-evaluate this using my actual constraints.')
    source = source.replace('<div class="pc-composer">', '<div class="pc-composer"><span class="ad-scroll-draft" data-scroll-draft aria-hidden="true">' + escape(draft) + '</span>', 1)
    parsed = Fragments(source)
    prompt = parsed.one('pc-prompts')
    local = Fragments(parsed.outer(prompt))
    source = parsed.swap(prompt, local.opened(local.elements[0]) +
        '<div class="ad-scroll-track ad-prompt-scroll" data-scroll-story="prompt" data-phase="orb"><div class="ad-scroll-sticky">' +
        local.inner(local.elements[0]) + '</div><div class="ad-scroll-end" aria-hidden="true"></div></div></section>')

    # Four complete existing expressions, their timestamps and chapter labels.
    # Both views occupy this ONE persistent portrait frame; organization only
    # changes its internal typography, ordering emphasis and glass illumination.
    parsed = Fragments(source)
    topics = parsed.one('pc-topics')
    local = parsed.outer(topics)
    first, second, third, note = [_snippet(local, key) for key in ('a', 'b', 'c', 'note')]
    title = t('产品的第一步', 'A product’s first step')
    explore = t('探索方向', 'Exploring a direction')
    decisions = t('判断与取舍', 'Decisions and trade-offs')
    rows = [('12 AUG · 09:42', first), ('26 AUG · 11:18', second), ('10 SEP · 18:03', third), ('24 SEP · 10:26', note)]
    source_labels = []
    for key in ('a', 'b', 'c', 'note'):
        match = re.search(r'<article class="pc-thought" data-thought="' + key + r'">.*?<details class="pc-topic-source">.*?<p>(.*?)</p>', local, re.S)
        if not match:
            raise ValueError('Missing original source label ' + key)
        source_labels.append(match.group(1))
    raw_rows = ''.join(f'<div class="ad-story-entry"><time>{stamp}</time><p>{words}</p><span class="ad-story-provenance">{source_labels[i]}</span></div>' for i, (stamp, words) in enumerate(rows))
    visual = f'''<div class="ad-thought-scenes" aria-hidden="true">
<div class="ad-thought-focus ad-thought-scene">
<div class="ad-thought-expanded" data-story-document>
<div class="ad-document-glint"></div>
<header class="ad-document-header"><span class="ad-story-date">12 AUG — 24 SEP 2026</span><h3>{title}</h3>
<div class="ad-document-mode"><span class="ad-original-cue">{t('原话优先','Original-first')}</span><span class="ad-ai-cue">{t('AI 整理 · 规划能力 · 预设示意','AI ORGANIZATION · PLANNED · PRESET')}</span></div></header>
<div class="ad-document-pages">
<div class="ad-story-expressions" data-story-original>{raw_rows}</div>
<div class="ad-thought-organized" data-story-organized>
<section class="ad-organized-chapter"><span class="ad-chapter-index">01</span><h4>{explore}</h4><p>{first}</p><p>{second}</p><span class="ad-chapter-source">12 AUG / 26 AUG · ChatGPT</span></section>
<section class="ad-organized-chapter"><span class="ad-chapter-index">02</span><h4>{decisions}</h4><p>{third}</p><p class="ad-retained-decision">{note}</p><span class="ad-chapter-source">10 SEP / 24 SEP · ChatGPT</span></section>
</div></div>
<footer class="ad-document-source">{t('4 条原话 · 2 个对话 · 原始来源保留','4 expressions · 2 conversations · Sources retained')}</footer>
</div></div></div>'''
    view = Fragments(local)
    stage = view.one('pc-topic-stage')
    local = view.swap(stage, view.outer(stage) + visual)
    view = Fragments(local)
    top = view.elements[0]
    local = view.opened(top) + '<div class="ad-scroll-track ad-thought-scroll" data-scroll-story="thought" data-phase="cards"><div class="ad-scroll-sticky">' + view.inner(top) + '</div><div class="ad-scroll-end" aria-hidden="true"></div></div></section>'
    source = parsed.swap(topics, local)

    # Existing Context disclosure and all of its permission controls unchanged.
    parsed = Fragments(source)
    context = parsed.one('pc-context')
    local = parsed.outer(context)
    scope = Fragments(local)
    local = _swap_one(local, 'pc-access',
        f'<details class="ad-context-disclosure"><summary>{t("查看授权范围和说明","Review access and scope")}<span aria-hidden="true">⌄</span></summary>' +
        scope.outer(scope.one('pc-access')) + '</details>')
    source = parsed.swap(context, local)
    Fragments(source)
    return source
