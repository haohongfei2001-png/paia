"""V13 homepage only: three product outcomes, subordinate daily details.
Prior demo/data/IME/permission, support and publication suites remain unchanged.
These tests use fictional fixtures only and do not certify the installed product.
"""
from pathlib import Path
import hashlib,json,re

def static(root,check):
    lock=json.loads((root/'website/atelier/preserved-v13.json').read_text())
    for path,digest in lock['files'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,'V13 unchanged exact: '+path)
    from art_direction import Fragments
    from launch_checks import find
    for lang,prefix in [('zh','zh/'),('en','')]:
        text=(root/(prefix+'index.html')).read_text();parsed=Fragments(text)
        check('data-atelier-version="13"' in text,prefix+': exact reviewed homepage')
        check('presentation13.js' in text and 'presentation11.js' not in text,prefix+': single finite homepage motion owner')
        check('world13.css' in text,prefix+': one scoped new art-direction sheet')
        for selector,digest in lock['home_fragments'][lang].items():
            nodes=find(parsed,selector)
            check(len(nodes)==1 and hashlib.sha256(parsed.outer(nodes[0]).encode()).hexdigest()==digest,prefix+': retained approved '+selector)
        check(text.count('data-story="')==3,prefix+': archive, thought and reuse scenes only')
        check(text.count('data-topic-art="')==3,prefix+': three actual topic directories')
        check(text.count('class="p13-thought-entry"')==2,prefix+': full two-input Section rather than aphorisms')
        check('class="p10-daily-scene"' not in text and 'id="daily-title"' in text,prefix+': everyday value is subordinate to the main outcomes')
        check('/demo.html#topic-reader' in text,prefix+': specific topic link reaches the existing exact default Section')
        check(not any(x in text for x in ['data-topic-search','data-open-source','data-view-source','data-reading-style']),prefix+': retired source/search/actions stay absent')
    code=(root/'assets/website/atelier/presentation13.js').read_text()
    check(not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(',code),'V13 no new external transport')
    check('localStorage' not in code and 'sessionStorage' not in code,'V13 no visitor persistence')
    check(all(x in code for x in ['subjectVisible','visibilitychange','prefers-reduced-motion','manualFloat=true']),'V13 visibility, reduced motion and manual R3 ownership retained')

def home(page,check,label,deep=False,out=None):
    page.wait_for_selector('body[data-atelier-ready=true]');page.evaluate('document.fonts.ready')
    zh=page.locator('html').get_attribute('lang').startswith('zh')
    def ck(ok,desc):check(ok,label+': '+desc)
    ck(page.locator('h1').count()==1 and page.locator('#hero-title').is_visible(),'single approved readable hero')
    ck(page.locator('.word-tag').count()==4 and page.locator('#why .manifesto-body').is_visible(),'colored words and manifesto retained')
    ck(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'normal-width reflow')
    ck(page.locator('main>section').evaluate_all('es=>es.map(e=>e.id)')==['top','why','archive','thoughts','context','how','story','get-paia'],'single coherent narrative and subordinate detail ensemble')
    ck(page.locator('#archive .p13-input').count()==4,'archive presents several expressions, not search alone')
    ck(page.locator('.p13-topic').count()==3 and page.locator('.p13-topic-chapters>span').count()==9,'three true topics and their actual chapters')
    ck(page.locator('.p13-topic p,.p13-topic blockquote,.p13-topic input').count()==0,'topic overview has no quotes, summaries or search')
    ck(page.locator('.p13-thought-entry').count()==2,'reading stage contains only the actual selected Section')
    ck(page.locator('.p13-thought-entry time').evaluate_all('es=>es.map(e=>e.getAttribute("datetime"))')==['2026-09-18T21:06','2026-09-12T10:32'],'original times and newest-first reading')
    ck(page.locator('.p13-entry-body').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=14)'),'full reading prose remains readable')
    ck(page.locator('#archive input,#thoughts input,#thoughts [contenteditable]').count()==0,'presentation needs no operating or editing')
    ck(page.locator('.p13-detail-grid>.p13-detail-card').count()==3,'reuse/edit/privacy are one small ensemble')
    ck(page.locator('.privacy-art .privacy-ring').count()==2,'original privacy orbit retained')
    ck(page.locator('#context .context-card').count()==4,'four Context cards retained')
    ck(page.locator('#context [contenteditable]').count()==0,'overview exposes directories, never private body content')
    ck(page.locator('#prompt-draft').get_attribute('readonly') is not None,'animation cannot overwrite visitor-authored text')
    ck(page.locator('.p13-boundary').is_visible(),'fictional no-connection boundary visible')
    if page.locator('.menu-toggle').is_visible():
        b=page.locator('.menu-toggle');b.focus();page.keyboard.press('Enter');ck(page.locator('#mobile-nav').is_visible(),'keyboard opens mobile menu');page.keyboard.press('Escape');ck(not page.locator('#mobile-nav').is_visible() and b.evaluate('e=>e===document.activeElement'),'Escape restores menu focus')
    # Required content is always rendered, including the static/instant scene.
    page.emulate_media(reduced_motion='reduce')
    ck(page.locator('[data-story]').evaluate_all('es=>es.every(e=>e.dataset.phase==="3")'),'reduced motion shows the complete composition')
    ck(page.locator('.p13-entry-body p').count()==4,'complete paragraphs, not clipped teaser content')
    ck(page.locator('.p13-chapter-sheet').evaluate('e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll(".p13-entry-body")].every(x=>{const q=x.getBoundingClientRect();return q.left>=r.left&&q.right<=r.right+1&&q.bottom<r.bottom})}'),'entire chapter fits its reading surface')
    ck(page.locator('.p13-scene-foot').evaluate_all('es=>es.every(e=>[...e.querySelectorAll("button")].filter(x=>getComputedStyle(x).display!=="none").length===1)'),'one replay action at rest, not duplicate controls')
    if out:
        dest=Path(out);dest.mkdir(parents=True,exist_ok=True);page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(dest/(label.replace('/','-')+'-hero.png')),animations='disabled')
        for n in ['archive','thoughts','context','how']:
            page.locator('#'+n).screenshot(path=str(dest/(label.replace('/','-')+'-'+n+'.png')),animations='disabled')
    if not deep:return
    # Replaying is finite and preserves every word and its DOM identity.
    scene=page.locator('[data-story=thoughts]');scene.scroll_into_view_if_needed();page.emulate_media(reduced_motion='no-preference')
    text=page.locator('.p13-entry-body').all_text_contents();page.evaluate('window.__worldNodes=[...document.querySelectorAll(".p13-entry-body")]')
    scene.locator('[data-story-replay]').click();page.wait_for_function('document.querySelector("[data-story=thoughts]").dataset.phase==="1"',timeout=6500)
    scene.locator('[data-story-pause]').click();phase=scene.get_attribute('data-phase');page.wait_for_timeout(220)
    ck(scene.get_attribute('data-phase')==phase and scene.get_attribute('data-story-state')=='paused','explicit pause holds the scene')
    scene.locator('[data-story-pause]').click();page.wait_for_function('document.querySelector("[data-story=thoughts]").dataset.storyState==="complete"',timeout=12000)
    ck(page.locator('.p13-entry-body').all_text_contents()==text and page.evaluate('window.__worldNodes.every((x,i)=>x===document.querySelectorAll(".p13-entry-body")[i])'),'movement never rewrites words or replaces body nodes')
    page.wait_for_timeout(160);ck(scene.get_attribute('data-story-state')=='complete','finite completion without looping')
    page.emulate_media(reduced_motion='reduce');ck(page.evaluate('getComputedStyle(document.documentElement).scrollBehavior==="auto"'),'reduced motion disables animated scroll')
    # Retain the prior independent permission boundary, including detail focus.
    switches=page.locator('.context-switch');master=page.locator('#context [data-ctx-master]')
    ck(switches.evaluate_all('es=>es.every(e=>e.getAttribute("aria-checked")==="false")'),'permissions default off')
    page.locator('#context [data-ctx-open=information]').first.click();ck(page.locator('#context-dialog').is_visible() and switches.nth(0).get_attribute('aria-checked')=='false','viewing content never grants access')
    page.keyboard.press('Escape');switches.nth(1).click();master.click();master.click()
    ck(switches.nth(1).get_attribute('aria-checked')=='true' and master.get_attribute('aria-checked')=='false','pause retains subordinate choices')
    page.locator('#context [data-ctx-open=inputs]').first.click();page.locator('[data-topic-permission=product]').click()
    ck(master.get_attribute('aria-checked')=='false' and switches.nth(3).get_attribute('aria-checked')=='false','Topic choice does not grant parents')
    page.locator('[data-ctx-topic=product]').click();ck(page.locator('#context-dialog [contenteditable]').count()==0,'input-scope inspection is read-only');page.keyboard.press('Escape');ck(not page.locator('#context-dialog').is_visible(),'Escape closes after modal content replacement')
    # Approved R3 component and page-local readonly adapter survive the recrop.
    draft=page.locator('#prompt-draft');draft.scroll_into_view_if_needed();anchor=page.locator('#r3-host .ps-anchor');anchor.click()
    ck(page.locator('#r3-host .ps-board').is_visible(),'authentic R3 board opens')
    ck(page.locator('#r3-host .ps-row').count()==6,'all six approved expression rows')
    page.locator('#r3-host .ps-row button').first.click()
    ck(len(draft.input_value().splitlines())>=2,'reuse preserves the initial sample line')
    ck(page.locator('#reuse').get_attribute('data-story-state')=='paused','deliberate interaction owns the floating component')
    ck(not page.evaluate('localStorage.length||sessionStorage.length'),'no private persistence')
    page.emulate_media(forced_colors='active');ck(page.locator('#hero-title').evaluate('e=>getComputedStyle(e).color!=="transparent"'),'high-contrast heading remains visible');page.emulate_media(forced_colors='none')
