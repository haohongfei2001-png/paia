"""Atelier V9 homepage checks. Existing interior/demo gates remain in test.py.
All records are synthetic. No form is submitted and no real account is accessed.
"""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re

def enabled(root):
    return any(f'data-atelier-version="{v}"' in (root/'index.html').read_text() for v in (9,10))

class Tags(HTMLParser):
    def __init__(self,text):
        super().__init__();self.items=[];self.feed(text)
    def handle_starttag(self,t,a):self.items.append((t,dict(a)))

def verify_static(root,check):
    if 'data-atelier-version="10"' in (root/'index.html').read_text():
        from presentation10_checks import static
        return static(root,check)
    baseline=json.loads((root/'website/atelier/preserved-files.json').read_text())
    for path,digest in baseline['files'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,'Atelier: preserved '+path)
    for lang,path in [('en','index.html'),('zh','zh/index.html')]:
        source=(root/path).read_text();tags=Tags(source).items
        check('data-atelier-version="9"' in source,path+': exact V9 release marker')
        check(sum('data-pd-tab' in a for _,a in tags)==3,path+': three existing primary spaces')
        check(sum('context-card' in a.get('class','').split() for _,a in tags)==4,path+': four Context cards')
        check(sum('paia-logo-v1.webp' in a.get('src','') for t,a in tags if t=='img')==1,path+': original closing artwork only once')
        check('v9-horizon' in source and 'class="hero-disc"' not in source,path+': distinct open hero background')
        check(not any(x in source for x in ['data-open-source','data-view-source','data-tl-open-source','data-cl-source']),path+': no recurring source action')
        check(not any(t=='script' and not a.get('src') for t,a in tags),path+': only owned external scripts')
        check('data-atlas' not in source and 'data-hero-sequence' not in source,path+': no competing legacy home owner')
        check('id="topic-prose"' in source and 'data-edit-id="product-first"' in source,path+': readable prerendered example without JavaScript')
        js=(root/f'assets/website/atelier/site.{lang}.js').read_text()
        check(not re.search(r'\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(',js),path+': example has no transport')
        check('localStorage' not in js and 'sessionStorage' not in js,path+': edits stay in page memory')
    approved=root/'extension/docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18'
    for name in ['component.js','fusion.js']:
        check((approved/name).read_bytes()==(root/'assets/website/atelier'/('r3-'+name)).read_bytes(),'Atelier: approved R3 '+name+' unchanged')
    check((root/'assets/website/type/atelier-serif-sc-OFL.txt').exists(),'Atelier: licensed locally hosted CJK heading font')

def verify_home(page,check,label,deep=False,out=None):
    if page.locator("body").get_attribute("data-atelier-version")=="10":
        from presentation10_checks import home
        return home(page,check,label,deep,out)
    page.wait_for_selector('body[data-atelier-ready="true"]')
    page.evaluate('document.fonts.ready')
    check(page.locator('h1').count()==1 and page.locator('h1').is_visible(),label+': one readable primary heading')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label+': no horizontal overflow')
    check(page.locator('.pd-workspace-head:visible').count()==0,label+': no duplicate workspace heading band')
    check(page.locator('#topic-grid .v8-topic-card').count()==3,label+': three actual Topic directories')
    check(page.locator('#topic-grid .v8-topic-card p,#topic-grid .v8-topic-card blockquote').count()==0,label+': no overview excerpts or synthetic summaries')
    check(page.locator('#thoughts input,#context input').count()==0,label+': no retired Thought or Context search')
    check(page.locator('.context-cards .context-card').count()==4,label+': established Context quartet retained')
    check(page.locator('#topic-prose [contenteditable]').count()>0,label+': direct editing without an Edit mode')
    check(page.locator('#thoughts button').evaluate_all("es=>es.every(e=>!/查看来源|查看原文|继续写|View source|Compare original/.test(e.textContent))"),label+': no recurring source or edit-mode actions')
    check(page.locator('.v9-library .v8-entry-body').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=14)'),label+': readable body type')
    check(page.evaluate('document.fonts.check(\'16px Instrument\')'),label+': display font loaded')
    if out:
        dest=Path(out);dest.mkdir(parents=True,exist_ok=True)
        page.emulate_media(reduced_motion='reduce');page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(dest/(label.replace('/','-').replace(' ','_')+'-hero.png')),animations='disabled')
        for name,selector in [('thoughts','.v9-library .v8-library-stage'),('context','#context'),('archive','#archive')]:
            page.locator(selector).screenshot(path=str(dest/(label.replace('/','-').replace(' ','_')+'-'+name+'.png')),animations='disabled')
    if page.locator('.menu-toggle').is_visible():
        toggle=page.locator('.menu-toggle');toggle.focus();page.keyboard.press('Enter')
        check(page.locator('#mobile-nav').is_visible(),label+': keyboard opens mobile navigation')
        page.keyboard.press('Escape')
        check(not page.locator('#mobile-nav').is_visible() and toggle.evaluate('e=>e===document.activeElement'),label+': Escape closes navigation and restores focus')
    if not deep:return
    en=page.locator('html').get_attribute('lang')=='en'
    # Topic navigation respects the actual Section. A direct edit is retained.
    page.locator('#topic-grid [data-topic="writing"][data-section="1"]').click()
    check(page.locator('#section-title').inner_text()==('Keep my voice' if en else '保留我的声音'),label+': exact chapter destination')
    editor=page.locator('#topic-prose [contenteditable]').first;editor.fill('Atelier synthetic edit. Keep my own words.')
    page.locator('#organize-gallery').click()
    note=page.locator('#topic-prose .v8-ai-note').inner_text()
    check(('out of date' if en else '已失效') in note and page.locator('#topic-prose .v8-entry-body').inner_text()=='Atelier synthetic edit. Keep my own words.',label+': changed input invalidates the preset instead of inventing AI output')
    page.locator('#organize-gallery').click()
    check(page.locator('#topic-prose [contenteditable]').first.inner_text()=='Atelier synthetic edit. Keep my own words.',label+': original working edit retained')
    page.locator('#topic-grid [data-topic="product"][data-section="1"]').click()
    check(page.locator('#topic-prose article').count()==2,label+': complete two-input chapter retained')
    page.locator('#organize-gallery').click()
    check(page.locator('#topic-prose .v8-ai-block').count()==2 and page.locator('#topic-prose [contenteditable]').count()==0,label+': explicitly preset derivative is distinct and read-only')
    page.locator('#organize-gallery').click()
    # Archive discovery selects real fixtures, never opens arbitrary content.
    page.locator('#pd-tab-archive').click()
    check(page.locator('#pd-archive-reader').inner_text()=='',label+': fresh Archive reading area stays empty')
    page.locator('#pd-search-input').fill('first step' if en else '第一步')
    check(page.locator('#pd-archive-list [data-archive-target]').count()>=1,label+': local input search finds actual wording')
    page.locator('#pd-archive-list [data-archive-target]').first.click()
    check(page.locator('#pd-archive-reader [contenteditable]').count()==1,label+': exact result opens directly editable input')
    page.locator('#pd-tab-thought').click();page.locator('#pd-tab-context').focus();page.keyboard.press('ArrowLeft')
    check(page.locator('#pd-tab-thought').get_attribute('aria-selected')=='true',label+': keyboard switches primary tabs')
    # Four independent choices and their superior switch preserve separation.
    switches=page.locator('.context-switch')
    check(switches.evaluate_all('es=>es.every(e=>e.getAttribute("aria-checked")==="false")'),label+': Context starts closed')
    page.locator('#context [data-ctx-open="information"]').first.click()
    check(page.locator('#context-dialog').is_visible() and switches.nth(0).get_attribute('aria-checked')=='false',label+': opening content does not grant access')
    page.keyboard.press('Escape')
    switches.nth(1).click();master=page.locator('#context [data-ctx-master]');master.click();master.click()
    check(switches.nth(1).get_attribute('aria-checked')=='true' and master.get_attribute('aria-checked')=='false',label+': pause retains lower choice')
    page.locator('#context [data-ctx-open="inputs"]').first.click()
    page.locator('[data-topic-permission="product"]').click()
    check(switches.nth(3).get_attribute('aria-checked')=='false' and master.get_attribute('aria-checked')=='false',label+': Topic choice never grants parents')
    page.locator('[data-ctx-topic="product"]').click()
    check(page.locator('#context-dialog [contenteditable]').count()==0,label+': Context input inspection is read-only')
    page.keyboard.press('Escape')
    check(not page.locator('#context-dialog').is_visible(),label+': Escape closes the modal after a chapter transition')
    # Real R3 component; only inserts into this synthetic draft, never sends.
    draft=page.locator('#prompt-draft');draft.fill('Existing draft. ')
    page.locator('[data-r3-mode="board"]').click()
    anchor=page.locator('#r3-host .ps-anchor')
    position="e=>{const a=e.getBoundingClientRect(),h=e.closest('#r3-host').getBoundingClientRect();return {x:a.x-h.x,y:a.y-h.y}}"
    before=anchor.evaluate(position)
    rows=page.locator('#r3-host .ps-row')
    check(rows.count()==6,label+': six approved R3 expression rows')
    use=rows.first.locator('button').first;use.click()
    check(draft.input_value().startswith('Existing draft. ') and len(draft.input_value())>16,label+': insertion preserves the existing draft')
    page.locator('[data-r3-mode="collapsed"]').click();after=anchor.evaluate(position)
    check(abs(before['x']-after['x'])<1 and abs(before['y']-after['y'])<1,label+': R3 anchor stays fixed across states')
    check(not page.evaluate('localStorage.length || sessionStorage.length'),label+': no persistence or account access')
    # Reflow and user preferences remain independently checked on the new home.
    page.emulate_media(reduced_motion='reduce')
    check(page.evaluate('getComputedStyle(document.documentElement).scrollBehavior==="auto"'),label+': reduced motion honored')
    page.emulate_media(forced_colors='active')
    check(page.locator('#hero-title').evaluate('e=>{const s=getComputedStyle(e);return s.color!=="transparent"}'),label+': visible high-contrast headline')
    page.emulate_media(forced_colors='none')
