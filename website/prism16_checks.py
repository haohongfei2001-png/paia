"""Prism homepage: verify actual painted static HTML and native-scroll depth.
Prior demo, IME, caret insertion, permissions, release and contact tests remain.
"""
from pathlib import Path
import hashlib,json,re
from art_direction import Fragments
from launch_checks import find,Text

def static(root,check):
    lock=json.loads((root/'website/atelier/preserved-prism16.json').read_text())
    for path,sha in lock['files'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==sha,'Prism retained byte owner: '+path)
    for lang,prefix in [('zh','zh/'),('en','')]:
        source=(root/(prefix+'index.html')).read_text();parsed=Fragments(source)
        check('data-atelier-version="16"' in source and 'data-website-release="prism16-20261024"' in source,prefix+': exact release identity')
        for selector,sha in lock['fragments'][lang].items():
            nodes=find(parsed,selector)
            check(len(nodes)==1 and hashlib.sha256(parsed.outer(nodes[0]).encode()).hexdigest()==sha,prefix+': original approved '+selector)
        for selector,expected in lock['text'][lang].items():
            actual=[Text(parsed.outer(n)).value() for n in find(parsed,selector)]
            check(actual==expected,prefix+': exact original expressions '+selector)
        check('presentation16.js?v=20261024-prism16' in source and 'presentation15.js' not in source,prefix+': one immutable current runtime')
        check('prism16.css?v=20261024-prism16' in source,prefix+': one scoped optical stylesheet')
        check(source.count('data-prism-topic=')==3 and source.count('class="p13-thought-entry"')==2,prefix+': real topic directories and complete chapter')
        check(source.count('class="context-card ')==4,prefix+': exact Context quartet')
        check(not any(k in source for k in ['data-open-source','data-view-source','data-topic-search','data-reading-style']),prefix+': no retired sources/search/reader controls')
        check('data-prism-pause' in source,prefix+': native scroll has an explicit static alternative')
    code=(root/'assets/website/atelier/presentation16.js').read_text()
    check(not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|attachShadow)\b',code),'no data transport/store/hidden shadow replacement')
    check('preventDefault' not in code and 'addEventListener(\'wheel\'' not in code,'no scroll hijack')
    check(all(x in code for x in ['prefers-reduced-motion','visibilitychange','manualFloat=true','ResizeObserver']),'reduced/hidden/manual R3/layout behavior retained')
    for name in ['component.js','fusion.js']:
        a=root/'extension/docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18'/name
        b=root/'assets/website/atelier'/('r3-'+name)
        check(a.read_bytes()==b.read_bytes(),'approved R3 '+name+' unchanged')

def home(page,check,label,deep=False,out=None):
    page.wait_for_selector('body[data-atelier-ready=true][data-prism-ready=true]');page.evaluate('document.fonts.ready')
    def ck(ok,n):check(ok,label+': '+n)
    width=page.viewport_size['width'];page.emulate_media(reduced_motion='reduce')
    ck(page.locator('h1').count()==1 and page.locator('#hero-title').is_visible(),'one readable original hero')
    ck(page.locator('.word-tag').count()==4 and page.locator('#why .manifesto-body').is_visible(),'original colored words and manifesto')
    ck(page.locator('main>section').evaluate_all('es=>es.map(e=>e.id)')==['top','why','archive','thoughts','context','how','story','get-paia'],'same product story and weights')
    ck(page.locator('#thoughts').evaluate('e=>!e.shadowRoot'),'visible content is the real static source, no stale replacement')
    ck(page.locator('.p16-topic').count()==3 and page.locator('.p16-topic-chapters>span').count()==9,'all three existing topics and nine chapters')
    ck(page.locator('.p16-reader .p13-thought-entry').count()==2,'complete two-input Section retained')
    ck(page.locator('.p16-reader time').evaluate_all('es=>es.map(e=>e.getAttribute("datetime"))')==['2026-09-18T21:06','2026-09-12T10:32'],'original times and newest-first order')
    ck(page.locator('.p16-topic p,.p16-topic input,#thoughts input,#thoughts [contenteditable]').count()==0,'no invented root excerpts, search or editing')
    ck(page.locator('#archive .p13-input').count()==4,'all archive expressions retained')
    ck(page.locator('#context .context-card').count()==4 and page.locator('#context [contenteditable]').count()==0,'four safe directory-only Context cards')
    ck(page.locator('.p13-detail-grid>.p13-detail-card').count()==3 and page.locator('.privacy-ring').count()==2,'subordinate details and approved private artwork retained')
    ck(page.locator('#prompt-draft').get_attribute('readonly') is not None,'auto presentation never edits a visitor draft')
    ck(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no document overflow')
    ck(page.locator('.p16-reader .p13-entry-body p').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=(innerWidth<=360?13:14))'),'readable original prose')
    ck(page.locator('.p16-reader').evaluate('e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll("p")].every(p=>{const b=p.getBoundingClientRect();return b.right<=r.right+1&&b.left>=r.left-1&&b.bottom<r.bottom})}'),'no clipped chapter content')
    ck(page.locator('.p16-archive-camera .p13-input-blue').evaluate('e=>e.getBoundingClientRect().top<document.querySelector(".p13-input-rose").getBoundingClientRect().top'),'archive first expression leads the layout')
    ck(page.locator('.p16-apparatus').evaluate('e=>getComputedStyle(e).transform==="none"'),'reduced motion gives complete stationary geometry')
    ck(page.locator('.p16-library-track').evaluate('e=>e.getBoundingClientRect().height<1900'),'no unbounded empty scroll theater')
    if page.locator('.menu-toggle').is_visible():
        button=page.locator('.menu-toggle');button.focus();page.keyboard.press('Enter');ck(page.locator('#mobile-nav').is_visible(),'keyboard menu opens');page.keyboard.press('Escape');ck(not page.locator('#mobile-nav').is_visible() and button.evaluate('e=>e===document.activeElement'),'menu closes and returns focus')
    if out:
        dest=Path(out);dest.mkdir(parents=True,exist_ok=True)
        page.locator('#thoughts').screenshot(path=str(dest/(label.replace('/','-')+'-prism.png')),animations='disabled')
    if not deep:return
    words=page.locator('.p16-reader .p13-entry-body p').all_text_contents()
    page.evaluate('window.__prismNodes=[...document.querySelectorAll(".p16-reader .p13-entry-body p")]')
    if width>900:
        page.emulate_media(reduced_motion='no-preference')
        def scroll(p):
            page.evaluate('p=>{const t=document.querySelector(".p16-library-track"),s=t.querySelector(".p16-pinned");window.scrollTo({top:scrollY+t.getBoundingClientRect().top-90+(t.offsetHeight-s.offsetHeight)*p,behavior:"instant"});}',p)
            page.wait_for_timeout(100)
        scroll(.15);before=page.locator('.p16-apparatus').evaluate('e=>getComputedStyle(e).transform');scroll(.72);after=page.locator('.p16-apparatus').evaluate('e=>getComputedStyle(e).transform')
        ck(before!=after,'scroll actually changes the 3D camera')
        p=float(page.locator('.p16-library-track').get_attribute('data-prism-progress'));ck(.6<p<.9,'camera follows native scroll position')
        pause=page.locator('[data-prism-pause]');pause.click();scroll(.3)
        ck(pause.get_attribute('aria-pressed')=='true' and page.locator('.p16-apparatus').evaluate('e=>getComputedStyle(e).transform==="none"'),'explicit pause holds a readable static object')
        pause.click()
    ck(page.locator('.p16-reader .p13-entry-body p').all_text_contents()==words,'camera never changes expressions')
    ck(page.evaluate('window.__prismNodes.every((n,i)=>n===document.querySelectorAll(".p16-reader .p13-entry-body p")[i])'),'camera preserves paragraph nodes')
    page.emulate_media(reduced_motion='reduce')
    switches=page.locator('.context-switch');master=page.locator('#context [data-ctx-master]')
    ck(switches.evaluate_all('es=>es.every(e=>e.getAttribute("aria-checked")==="false")'),'default-off permissions')
    page.locator('#context [data-ctx-open=information]').first.click();ck(page.locator('#context-dialog').is_visible() and switches.nth(0).get_attribute('aria-checked')=='false','opening content does not grant access');page.keyboard.press('Escape')
    switches.nth(1).click();master.click();master.click();ck(switches.nth(1).get_attribute('aria-checked')=='true' and master.get_attribute('aria-checked')=='false','pausing keeps individual choices')
    page.locator('#context [data-ctx-open=inputs]').first.click();page.locator('[data-topic-permission=product]').click();ck(master.get_attribute('aria-checked')=='false' and switches.nth(3).get_attribute('aria-checked')=='false','topic choice never opens superior access')
    page.locator('[data-ctx-topic=product]').click();ck(page.locator('#context-dialog [contenteditable]').count()==0,'input scope inspection remains read-only');page.keyboard.press('Escape');ck(not page.locator('#context-dialog').is_visible(),'modal Escape after transition')
    draft=page.locator('#prompt-draft');draft.scroll_into_view_if_needed();page.locator('#r3-host .ps-anchor').click();ck(page.locator('#r3-host .ps-board').is_visible() and page.locator('#r3-host .ps-row').count()==6,'approved full R3 board remains usable')
    page.locator('#r3-host .ps-row button').first.click();ck(len(draft.input_value().splitlines())>=2,'reuse retains original fictional draft')
    ck(not page.evaluate('localStorage.length||sessionStorage.length'),'no visitor persistence')
    page.emulate_media(forced_colors='active');ck(page.locator('.p16-reader').is_visible(),'complete content in forced colors');page.emulate_media(forced_colors='none')
