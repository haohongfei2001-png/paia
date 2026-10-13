"""Homepage presentation, not a second product simulator.
Compose the approved visuals, then REMOVE simulator subtrees at build time.
The original core.py/controller still belong to the independent demo route.
"""
from html import escape
import re
from art_direction import Fragments


def _remove(source, classes=(), attrs=(), tags=()):
    parsed = Fragments(source)
    matches = [n for n in parsed.elements if set(n.attrs.get('class','').split()).intersection(classes) or any(k in n.attrs for k in attrs) or n.tag in tags]
    selected=[]
    for n in sorted(matches,key=lambda n:(n.start,-n.end)):
        if not selected or n.start>=selected[-1].end: selected.append(n)
    for n in reversed(selected): source=source[:n.start]+source[n.end:]
    return source


def _replace(source,cls,value):
    p=Fragments(source)
    return p.swap(p.one(cls),value)


def _static_controls(source):
    p=Fragments(source);edits=[]
    keep_data={'data-locale','data-context-overview','data-context-card','data-card-count','data-topic-count','data-prompt-row','data-ad-specimen-text','data-ad-host','data-scroll-story','data-phase','data-story-document','data-story-original','data-story-organized','data-topic-overview','data-topic-block','data-preview-panel','data-product-hero','data-hero-product','data-hero-glass','data-scroll-art','data-close-brand','data-home-presentation'}
    for n in p.elements:
        classes=n.attrs.get('class','').split();attrs=dict(n.attrs)
        if n.tag=='button':tag='div' if 'pc-card-open' in classes else 'span'
        elif n.tag=='textarea':tag='p';classes+=['hp-input-text']
        elif n.tag=='a' and 'data-topic-open' in attrs:tag='span'
        else:tag=n.tag
        if 'data-preview-tab' in attrs:
            attrs['data-hero-space']=attrs['data-preview-tab']
            if attrs.get('aria-selected')=='true':classes+=['hp-current-space']
            classes+=['hp-space-label']
        for k in list(attrs):
            if k.startswith('data-') and k not in keep_data and k!='data-hero-space':del attrs[k]
        if n.tag in ('button','textarea') or tag!=n.tag:
            for k in ('disabled','type','rows','maxlength','spellcheck','for','href','tabindex','aria-expanded','aria-pressed','aria-controls','aria-selected','aria-label','aria-describedby','role'):attrs.pop(k,None)
        if attrs.get('role') in ('tablist','tabpanel','status','group'):
            attrs.pop('role',None);attrs.pop('aria-labelledby',None)
        attrs.pop('aria-orientation',None)
        if 'pc-row-menu' in classes:attrs['aria-hidden']='true'
        if classes:attrs['class']=' '.join(classes)
        opening='<'+tag+''.join(' '+k+('' if v is None else '="'+escape(v,quote=True)+'"') for k,v in attrs.items())+('/>' if p.opened(n).endswith('/>') else '>')
        edits.append((n.start,n.opening_end,opening))
        if n.tag!=tag:edits.append((n.closing_start,n.end,'</'+tag+'>'))
    for start,end,text in sorted(edits,reverse=True):source=source[:start]+text+source[end:]
    return source


def present(source,t,a):
    source=_remove(source,classes=('pc-disclosure','hero-preview-caption','pc-instruction','ad-location','pc-reader-tools','pc-empty','pc-source','pc-editor-foot','pc-topic-search','pc-topic-match','pc-topic-reader','pc-prompt-management','pc-prompt-caption','pc-suggestion-wrap','pc-prompt-mechanics','ad-context-disclosure','pc-context-detail','pc-context-connection','ad-capsule','ad-morph-note','ad-morph-chevron'),tags=('noscript','label'))
    p=Fragments(source)
    for n in reversed(p.elements):
        if n.attrs.get('data-preview-panel') in ('thought','context'):source=source[:n.start]+source[n.end:]
    sample=escape(t('结合我的实际约束重新分析。','Re-evaluate this using my actual constraints.'))
    source=_replace(source,'pc-composer',f'<div class="pc-composer hp-composer" aria-label="{t("提示词复用展示","Prompt reuse illustration")}"><p class="hp-composer-phrase">{sample}</p><div class="hp-composer-foot"><span>{t("只填入，不自动发送","Inserts only. Never sends automatically.")}</span><span class="pc-send-decoration" aria-hidden="true">↑</span></div></div>')
    source=source.replace('<span data-ad-specimen-text></span>','<span data-ad-specimen-text>'+sample+'</span>')
    source=_static_controls(source)
    source=source.replace('class="paia-core art-directed art-refined"','class="paia-core art-directed art-refined" data-home-presentation',1)
    p=Fragments(source)
    for n in reversed(p.elements):
        if n.attrs.get('data-scroll-story') in ('thought','prompt'):
            value='organize' if n.attrs['data-scroll-story']=='thought' else 'board'
            opening=re.sub(r'data-phase="[^"]+"','data-phase="'+value+'"',p.opened(n))
            source=source[:n.start]+opening+source[n.opening_end:]
    source=source.replace('class="ad-thought-scenes" aria-hidden="true"','class="ad-thought-scenes"').replace('class="ad-chatgpt-user" aria-hidden="true"','class="ad-chatgpt-user"')
    Fragments(source)
    assert not re.search(r'<(?:button|input|textarea|select)\b',source),'Unexpected simulation widget'
    assert 'data-context-text' not in source and 'data-card-detail' not in source
    return source


def render(t,a,button,icon):
    from product_hero import render_hero
    from core import render as render_core
    from art_direction import recompose
    from scroll_story import apply_scroll_story
    source=render_hero(t,a,button,icon)+apply_scroll_story(recompose(render_core(t,a,button,icon),t),t)
    return present(source,t,a)
