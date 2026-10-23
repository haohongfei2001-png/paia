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



def refine_reading_and_routes(source,t,a):
    """Six owner-approved refinements; no new story, simulator or service."""
    # Retain the Topic name and sections; remove only duplicate guide labels.
    source=_remove(source,classes=('pc-topic-root-head','pc-topic-footer'))
    parsed=Fragments(source);toolbar=parsed.one('pc-topic-toolbar')
    old=parsed.outer(toolbar)
    source=parsed.swap(toolbar,_remove(old,classes=('pc-local-tag',)))
    source=source.replace('data-home-presentation data-locale=',
                          'data-home-presentation data-six-refinements="20261023" data-locale=',1)
    def demonstration(anchor,label):
        return '<span class="hp-demo-caption">'+t('界面演示','Interface illustration')+' · '+a('demo.html',label,'hp-demo-link',anchor)+'</span>'
    # Existing small-caption positions identify the illustration and lead to
    # the same section of the independent, fully interactive example.
    source=source.replace('<span>'+t('查找 → 编辑 → 再利用','FIND → EDIT → REUSE')+'</span>',
                          demonstration('#input-library',t('体验查找与编辑','Try finding and editing')),1)
    source=source.replace('<span>'+t('按你的方式组织','ORGANIZED ON YOUR TERMS')+'</span>','',1)
    parsed=Fragments(source);editorial=parsed.one('ad-library-editorial')
    block=parsed.outer(editorial);bp=Fragments(block);intro=bp.one('pc-intro')
    old=bp.outer(intro)
    route=demonstration('#thought-library',t('体验思想库','Explore Thought Library'))
    source=parsed.swap(editorial,bp.swap(intro,old[:-6]+route+'</div>'))
    parsed=Fragments(source);note=parsed.one('pc-plan-note')
    old=parsed.outer(note)
    source=parsed.swap(note,old[:-4]+'<span class="hp-demo-route">'+demonstration('#prompt-reuse',t('体验提示词复用','Try prompt reuse'))+'</span></p>')
    source=source.replace('<span>'+t('对话','CONVERSATION')+'</span>',
                          '<span>'+t('界面演示','Interface illustration')+'</span>',1)
    # The illustrated pre-granted state stays illustrative; real permission
    # defaults and the independent demo's permission owner are unchanged.
    parsed=Fragments(source);badge=parsed.one('pc-master-permission')
    source=parsed.swap(badge,'<span class="pc-master-permission hp-example-state">'+t('示例：已允许','Example: access allowed')+'</span>')
    parsed=Fragments(source);context=parsed.one('pc-context')
    ctx=parsed.outer(context);cp=Fragments(ctx);foot=cp.one('pc-section-foot')
    route=demonstration('#personal-context',t('体验权限控制','Explore access controls'))
    old=cp.outer(foot)
    lead=old[old.index('<span>'):old.index('</span>')+7]
    new=old.replace(lead,'<span class="hp-context-example">'+route+'<span class="hp-availability">'+t('示例状态；外部 AI 连接尚未开放。','Sample state. External AI connections are not available yet.')+'</span></span>',1)
    source=parsed.swap(context,cp.swap(foot,new))
    # Describe the real availability next to the original ecosystem mapping.
    source=source.replace(t('本地优先 · 按需同步','LOCAL FIRST · SYNC BY CHOICE'),
                          t('本地优先 · 同步尚未开放','LOCAL FIRST · SYNC NOT AVAILABLE YET'),1)
    source=source.replace(t('日常保存、查找、编辑与提示词复用，在本地完成。按需使用自己的浏览器云账号，在同一生态的设备间接续已同步的资料。','Everyday capture, search, editing and prompt reuse work locally. Use your own browser cloud account to continue with synced material across devices in the same ecosystem.'),
                          t('日常保存、查找、编辑与提示词复用，在本地完成。跨设备同步尚未开放；下方为预期的浏览器生态对应关系。','Everyday capture, search, editing and prompt reuse work locally. Cross-device sync is not available yet; the mapping below illustrates the intended browser ecosystems.'),1)
    source=source.replace(t('同步由你主动开启，不同浏览器生态之间不会自动互通。','Sync is your choice. Different browser ecosystems do not sync with one another automatically.'),
                          t('以上为功能示意，不表示当前已支持这些云端连接。不同浏览器生态不会自动互通。','This is a feature illustration, not a statement that these cloud connections are available. Browser ecosystems do not automatically sync with one another.'),1)
    return source


def render(t,a,button,icon):
    from product_hero import render_hero
    from core import render as render_core
    from art_direction import recompose
    from scroll_story import apply_scroll_story
    source=render_hero(t,a,button,icon)+apply_scroll_story(recompose(render_core(t,a,button,icon),t),t)
    return refine_reading_and_routes(present(source,t,a),t,a)
