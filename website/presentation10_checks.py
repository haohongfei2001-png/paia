"""V10 presentation checks. Unchanged standalone demo retains full app tests.
These checks concern fictional local pages, not the extension or live models.
"""
from pathlib import Path
import hashlib,json,re

def static(root,check):
    baseline=json.loads((root/'website/atelier/preserved-files.json').read_text())
    for path,digest in baseline['files'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,'V10 preserved: '+path)
    for lang,path in [('zh','zh/index.html'),('en','index.html')]:
        source=(root/path).read_text()
        check('data-atelier-version="10"' in source,path+': exact V10 marker')
        check(all(f'id="{k}"' in source for k in ['archive','thoughts','context','reuse','how','why','story']),path+': complete product narrative')
        check('id="pd-demo"' not in source and 'id="ax-query"' not in source,path+': presentation does not ask visitors to operate a mock application')
        check(source.count('class="p10-thought-line ')==3,path+': three persistent expression nodes')
        check(source.count('class="context-card ')==4,path+': established Context quartet')
        check(source.count('paia-logo-v1.webp')==1,path+': original closing artwork only once')
        check('data-open-source' not in source and 'data-view-source' not in source,path+': no recurring source actions')
        check('data-story-pause' in source and 'data-story-replay' in source,path+': explicit motion controls')
        check('presentation10.js' in source and f'context10.{lang}.js' in source and '/site.'+lang+'.js' not in source,path+': one presentation controller plus separate permissions owner')
        for name in ['presentation10.js',f'context10.{lang}.js']:
            text=(root/'assets/website/atelier'/name).read_text()
            check(not re.search(r'\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(',text),name+': no external transport')
            check('localStorage' not in text and 'sessionStorage' not in text,name+': no visitor persistence')
    approved=root/'extension/docs/consumer-product-v1/design/narrow-input-board-v4/fusion-r3-2026-10-18'
    for name in ['component.js','fusion.js']:
        check((approved/name).read_bytes()==(root/'assets/website/atelier'/('r3-'+name)).read_bytes(),'V10 approved R3 '+name+' exact')
    # Critical language/layout invariants are not removed for visual style.
    js=(root/'assets/website/atelier/presentation10.js').read_text()
    check('prefers-reduced-motion' in js and 'visibilitychange' in js and 'IntersectionObserver' in js,'V10 finite viewport-aware motion with reduced/hidden alternatives')
    check('manualFloat=true' in js,'V10 deliberate component interaction takes ownership from the timeline')

def home(page,check,label,deep=False,out=None):
    page.wait_for_selector('body[data-atelier-ready=true]')
    page.evaluate('document.fonts.ready')
    zh=page.locator('html').get_attribute('lang').startswith('zh')
    check(page.locator('h1').count()==1 and page.locator('h1').is_visible(),label+': one readable primary heading')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label+': no horizontal overflow')
    check(page.locator('#hero-title').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)<=106'),label+': controlled headline scale')
    check(page.locator('.word-tag').count()==4,label+': four approved color-outline words retained')
    check(page.locator('#why .manifesto-body').is_visible(),label+': approved second-screen content retained')
    check(page.locator('#archive input,#thoughts input,#how [role=tab]').count()==0,label+': the main narrative requires no searching or tab selection')
    check(page.locator('.p10-found-quote').is_visible(),label+': archive shows a legible outcome')
    check(page.locator('.p10-thought-line .p10-phrase').count()==3,label+': actual words remain the illustration subject')
    check(page.locator('#context .context-card').count()==4,label+': established Context quartet retained')
    check(page.locator('#context [contenteditable]').count()==0,label+': Context overview exposes directories, not personal bodies')
    check(page.locator('.private-card .privacy-ring').count()==2,label+': approved private-space artwork retained')
    check(page.locator('#prompt-draft').get_attribute('readonly') is not None,label+': automatic presentation cannot overwrite a visitor draft')
    check(page.locator('#how .p10-before').is_visible() and page.locator('#how .p10-after').is_visible(),label+': daily value is visible without operating a selector')
    check(page.locator('[data-story]').count()==5,label+': five independently controlled finite scenes')
    check(page.locator('.p10-illustration-note').is_visible(),label+': synthetic nonconnection boundary is visible')
    if page.locator('.menu-toggle').is_visible():
        b=page.locator('.menu-toggle');b.focus();page.keyboard.press('Enter')
        check(page.locator('#mobile-nav').is_visible(),label+': keyboard opens mobile navigation')
        page.keyboard.press('Escape')
        check(not page.locator('#mobile-nav').is_visible() and b.evaluate('e=>e===document.activeElement'),label+': Escape returns menu focus')
    if out:
        dest=Path(out);dest.mkdir(parents=True,exist_ok=True)
        page.emulate_media(reduced_motion='reduce');page.evaluate("scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(dest/(label.replace('/','-')+'-hero.png')),animations='disabled')
        for name,selector in [('archive','#archive'),('thoughts','#thoughts'),('reuse','#reuse'),('daily','#how'),('context','#context')]:
            page.locator(selector).screenshot(path=str(dest/(label.replace('/','-')+'-'+name+'.png')),animations='disabled')
    if not deep:return
    # Motion belongs to the presentation, not to service work. Preserve words
    # and node identity through movement; honor a pause and system preference.
    scene=page.locator('[data-story=thoughts]');scene.scroll_into_view_if_needed()
    page.emulate_media(reduced_motion='no-preference')
    text=page.locator('.p10-phrase').all_text_contents()
    page.evaluate('window.__paiaReviewNodes=[...document.querySelectorAll(".p10-phrase")]')
    scene.locator('[data-story-replay]').click()
    page.wait_for_function('document.querySelector("[data-story=thoughts]").dataset.phase==="1"',timeout=7000)
    scene.locator('[data-story-pause]').click();phase=scene.get_attribute('data-phase')
    page.wait_for_timeout(250)
    check(scene.get_attribute('data-phase')==phase and scene.get_attribute('data-story-state')=='paused',label+': motion pause holds the presentation')
    scene.locator('[data-story-pause]').click()
    page.wait_for_function('document.querySelector("[data-story=thoughts]").dataset.storyState==="complete"',timeout=14000)
    check(page.locator('.p10-phrase').all_text_contents()==text,label+': moving the expressions does not rewrite them')
    check(page.evaluate('window.__paiaReviewNodes.every((n,i)=>n===document.querySelectorAll(".p10-phrase")[i])'),label+': same nodes keep their identity through composition')
    page.wait_for_timeout(300)
    check(scene.get_attribute('data-story-state')=='complete',label+': presentation stops rather than looping indefinitely')
    page.emulate_media(reduced_motion='reduce')
    check(page.locator('[data-story]').evaluate_all('es=>es.every(e=>e.dataset.phase==="3")'),label+': reduced motion shows every complete outcome')
    check(page.evaluate('getComputedStyle(document.documentElement).scrollBehavior==="auto"'),label+': reduced motion disables animated scrolling')
    # Four independent permissions still default off and never imply a live connection.
    switches=page.locator('.context-switch');master=page.locator('#context [data-ctx-master]')
    check(switches.evaluate_all('es=>es.every(e=>e.getAttribute("aria-checked")==="false")'),label+': Context defaults closed')
    page.locator('#context [data-ctx-open=information]').first.click()
    check(page.locator('#context-dialog').is_visible() and switches.nth(0).get_attribute('aria-checked')=='false',label+': opening content does not grant access')
    page.keyboard.press('Escape');switches.nth(1).click();master.click();master.click()
    check(switches.nth(1).get_attribute('aria-checked')=='true' and master.get_attribute('aria-checked')=='false',label+': pausing keeps subordinate choice')
    page.locator('#context [data-ctx-open=inputs]').first.click();page.locator('[data-topic-permission=product]').click()
    check(master.get_attribute('aria-checked')=='false' and switches.nth(3).get_attribute('aria-checked')=='false',label+': a Topic selection does not grant parent permissions')
    page.locator('[data-ctx-topic=product]').click()
    check(page.locator('#context-dialog [contenteditable]').count()==0,label+': input-scope inspection remains read-only')
    page.keyboard.press('Escape');check(not page.locator('#context-dialog').is_visible(),label+': Context modal closes after replacing its content')
    # The real approved fixed-corner control is still usable, but auto playback
    # cannot override a deliberate visitor interaction or send a message.
    draft=page.locator('#prompt-draft');draft.scroll_into_view_if_needed()
    anchor=page.locator('#r3-host .ps-anchor');anchor.click()
    check(page.locator('#r3-host .ps-board').is_visible(),label+': authentic R3 expands on request')
    check(page.locator('#r3-host .ps-row').count()==6,label+': full six-row R3 board retained')
    page.locator('#r3-host .ps-row button').first.click()
    check(len(draft.input_value().splitlines())>=2,label+': example insertion retains the existing sample line')
    check(not page.evaluate('localStorage.length || sessionStorage.length'),label+': no persistence or account access')
    page.emulate_media(forced_colors='active',reduced_motion='reduce')
    check(page.locator('#hero-title').evaluate('e=>getComputedStyle(e).color!=="transparent"'),label+': visible high-contrast heading')
    page.emulate_media(forced_colors='none')
