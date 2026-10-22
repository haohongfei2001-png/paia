"""Checks for the explicitly requested 22 October live-site refinement.

This replaces ONLY historical home composition/CTA expectations. The full
independent demo, source immutability, permission, IME, contact, asset and route
suites remain in test.py. No public installation, AI or sync is certified.
"""
from pathlib import Path
from html.parser import HTMLParser
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import hashlib, json, os, re, sys, traceback
from art_direction import Fragments
from value_story import SAMPLES
from launch_pages import installation

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'data-site-revision="20261022"'

class Text(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True); self.parts=[]; self.feed(source)
    def handle_data(self, data): self.parts.append(data)
    def value(self): return ''.join(self.parts)

def active(root):
    return MARKER in (root/'index.html').read_text()

def verify_static(root, check):
    from launch_checks import find
    fixture=json.loads((root/'website/value_story_preserved.json').read_text())
    for path,digest in fixture['unchanged'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==digest, 'value story: inherited source unchanged '+path)
    for lang,relative in [('en','index.html'),('zh','zh/index.html')]:
        source=(root/relative).read_text();parsed=Fragments(source)
        check(MARKER in source, relative+': explicit revision authority')
        original=[Text(parsed.outer(n)).value() for n in find(parsed,'[data-vs-original]')]
        check(original==SAMPLES[lang], relative+': all three original expressions remain exact and chronological')
        hero=[Text(parsed.outer(n)).value() for n in find(parsed,'.pv-expression p')]
        check(hero==SAMPLES[lang], relative+': hero and thought share the same source expressions')
        check(Text(parsed.outer(parsed.one('vs-result'))).value().find(SAMPLES[lang][1])>=0,relative+': retrieval highlights without rewriting the source')
        check(len(find(parsed,'[data-context-card]'))==4,relative+': four inherited Context cards')
        check(not any(k in source for k in ('data-context-text','data-card-detail','data-card-allow','data-context-global')),relative+': homepage never contains real grant/edit hooks')
        check(len(find(parsed,'[data-vs-insert]'))==3,relative+': three explicit local phrase choices')
        check(len(find(parsed,'[data-home-presentation]'))==1,relative+': one content owner')
        check(len(find(parsed,'[data-close-brand]'))==1,relative+': existing brand close remains')
        close=parsed.outer(parsed.one(attr='data-close-brand'))
        # Compare the inherited ending with its preceding production bytes,
        # ignoring only the action labels/routes approved for honest delivery.
        normalized=re.sub(r'<div class="actions">.*?</div>','<div class="actions"></div>',close,flags=re.S)
        check(hashlib.sha256(normalized.encode()).hexdigest()==fixture['close'][lang],relative+': ending composition, copy and original illustration retained')
        check(source.count('value-story.js')==1 and 'src="/assets/website/home-presentation.js' not in source,relative+': one new homepage controller, no scroll-stage owner')
        check('src="/assets/website/home-core-v2.js' not in source,relative+': full simulator remains isolated to demo')
        prefix='/zh/' if lang=='zh' else '/'
        actions=[n.attrs['href'] for n in find(parsed,'.hero-actions a')]
        expected=[installation()['chrome_store_url'] or prefix+'demo.html',prefix+'download.html']
        check(actions==expected,relative+': primary action reaches the available experience')
        check(('产品示意 · 虚构内容' if lang=='zh' else 'Product illustration · Fictional content') in source,relative+': illustration is not a claimed installed screenshot')
        check(('外部 AI 连接尚未开放' if lang=='zh' else 'External AI connections are not available yet') in source,relative+': external connection boundary is explicit')
        ids=[n.attrs['id'] for n in parsed.elements if 'id' in n.attrs]
        check(len(ids)==len(set(ids)),relative+': unique HTML IDs')
    check((root/'index.html').read_bytes()==(root/'en/index.html').read_bytes(),'value story: exact English alias')
    script=(root/'assets/website/value-story.js').read_text()
    for api in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'localStorage', 'sessionStorage', 'setInterval', '.submit(', 'requestSubmit('):
        check(api not in script,'value story: no '+api)
    check("dataset.siteRevision !== '20261022'" in script,'value story: isolated route guard')
    for path in (root/'website/generated-paths.txt').read_text().splitlines():
        if path.endswith('.html') and Path(path).name!='index.html':
            check('value-story.js' not in (root/path).read_text(),path+': no homepage controller on another route')


def verify_hero(page, check, en=True, motion=False):
    prefix='/' if en else '/zh/'
    test=lambda ok,name:check(ok,('EN' if en else 'ZH')+' refined hero: '+name)
    test(page.locator('[data-product-hero]').count()==1,'one inherited opening')
    test(page.locator('#hero-title').is_visible(),'value visible without activation')
    test(page.locator('[data-hero-space]').evaluate_all('es=>es.map(e=>e.dataset.heroSpace)')==['archive','thought','context'],'three original spaces retained')
    test(page.locator('[data-preview-panel="archive"]').is_visible(),'source words visible immediately')
    test(page.locator('.hero-actions a').evaluate_all('es=>es.map(e=>e.getAttribute("href"))')==[installation()['chrome_store_url'] or prefix+'demo.html',prefix+'download.html'],'honest demo-first delivery and explicit install status')
    test(page.locator('.pv-expression').count()==3,'a continuous example, not an empty product mockup')
    test(page.locator('.hero-stack i').evaluate_all('es=>es.filter(e=>getComputedStyle(e).display!=="none").length')<=1,'at most one optical backing')
    if motion:
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate("scrollTo({top:250,behavior:'instant'})")
        page.wait_for_function('Math.abs(scrollY-250)<2')
        test(abs(page.evaluate('scrollY')-250)<2,'native scrolling remains untrapped')
        # Let Chromium deliver the preceding media/layout frame before a
        # second emulation change; otherwise same-frame changes can coalesce.
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion==='off'")
        test(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"),'system reduced motion respected')


def verify_home(page,check,label='home',motion=False):
    test=lambda ok,name:check(ok,label+': value story '+name)
    page.wait_for_selector('body.vs-ready')
    test(page.locator('[data-value-story]').count()==1,'one continuous narrative')
    test(page.locator('[data-vs-original]').count()==3,'three preserved source expressions')
    test(page.locator('[data-context-card]').count()==4,'four inherited Context cards')
    test(page.locator('[data-context-overview] textarea,[data-context-overview] input,[data-card-detail]').count()==0,'Context overview contains no private bodies or permission controls')
    test(page.locator('[data-vs-insert]').count()==3,'three explicit phrase choices')
    test(page.locator('#vs-prompt-board').is_visible(),'core prompt value is visible by default')
    test(page.locator('#vs-draft').is_enabled(),'local draft can be edited')
    test(page.locator('script[src]').evaluate_all(r'es=>es.every(e=>!/(home-presentation|scroll-story|home-art|home-core-v2)\.js/.test(e.src))'),'no second simulator or scroll-gated presentation owner')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'viewport reflows')
    if not motion:return
    draft=page.locator('#vs-draft');pick=page.locator('[data-vs-insert="0"]');reset=page.locator('[data-vs-reset]')
    initial=draft.input_value();phrase=pick.locator('span').first.inner_text()
    draft.fill('Alpha selected Omega')
    draft.evaluate("e=>{e.focus();e.setSelectionRange(6,14);e.dispatchEvent(new Event('select'))}")
    pick.click()
    test(draft.input_value()=='Alpha selected\n'+phrase+' Omega','insertion follows selection and preserves the entire existing draft')
    test(draft.evaluate('e=>e===document.activeElement'),'focus returns to composer')
    test(page.locator('#vs-prompt-board').is_visible(),'insertion does not close the panel')
    reset.click();test(draft.input_value()==initial,'reset restores only the fictional fixture')
    pick.focus();page.keyboard.press('Enter')
    test(initial in draft.input_value() and phrase in draft.input_value(),'keyboard activation fills without replacing')
    reset.click()
    draft.evaluate("e=>e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'x'}))")
    pick.click();test(draft.input_value()==initial,'active IME composition is not disrupted')
    draft.evaluate("e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'x'}))")
    draft.fill('x'*1195);pick.click();test(draft.input_value()=='x'*1195,'length limit never silently truncates the draft')
    reset.click()
    toggle=page.locator('[data-vs-toggle]');toggle.focus();page.keyboard.press('Enter')
    test(toggle.get_attribute('aria-expanded')=='false' and not page.locator('#vs-prompt-board').is_visible(),'keyboard collapse has matching visibility and semantics')
    page.keyboard.press('Enter');test(toggle.get_attribute('aria-expanded')=='true' and page.locator('#vs-prompt-board').is_visible(),'keyboard expands with focus retained')
    test(toggle.evaluate('e=>e===document.activeElement'),'toggle keeps keyboard focus')
    test(not page.evaluate('localStorage.length || sessionStorage.length'),'demo does not persist its edits')
    page.emulate_media(reduced_motion='reduce');page.wait_for_selector('body.hp-static')
    test(page.locator('[data-vs-original]').evaluate_all('es=>es.every(e=>getComputedStyle(e).visibility!=="hidden"&&e.getClientRects().length>0)'),'complete thought remains readable without animation')
    zoom=page.add_style_tag(content='html{font-size:200%!important}')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'200% text remains within viewport')
    zoom.evaluate('e=>e.remove()');reset.click()


def main():
    from playwright.sync_api import sync_playwright
    results=[];server=None
    def check(ok,label):
        results.append({'check':label,'pass':bool(ok)})
        if not ok:raise AssertionError(label)
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    try:
        verify_static(ROOT,check)
        if '--static-only' not in sys.argv:
            server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
            Thread(target=server.serve_forever,daemon=True).start()
            base=f'http://127.0.0.1:{server.server_port}'
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True)
                for lang,prefix in [('en',''),('zh','zh/')]:
                    for width in (1440,1024,768,390,320):
                        page=browser.new_page(viewport={'width':width,'height':1000})
                        errors=[];transmits=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.on('request',lambda r:transmits.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
                        page.goto(base+'/'+prefix,wait_until='load');page.evaluate('document.fonts.ready')
                        verify_hero(page,check,en=lang=='en',motion=True)
                        verify_home(page,check,lang+'/'+str(width),motion=True)
                        check(not errors,lang+'/'+str(width)+': no JS errors')
                        check(not transmits,lang+'/'+str(width)+': no API or submission')
                        page.reload(wait_until='load');page.wait_for_selector('body.vs-ready')
                        check(page.locator('#vs-draft').input_value()==('我更在意安静和散步的空间。' if lang=='zh' else 'I care more about quiet evenings and somewhere to walk.'),lang+'/'+str(width)+': reload clears all page edits')
                        page.close()
                    context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
                    page=context.new_page();page.goto(base+'/'+prefix,wait_until='load')
                    check(page.locator('[data-vs-original]').count()==3 and page.locator('#vs-prompt-board').is_visible(),lang+': no-JS complete reading and open panel')
                    check(page.locator('#vs-draft').is_disabled() and page.locator('[data-vs-insert]').evaluate_all('es=>es.every(e=>e.disabled)'),lang+': no-JS controls never pretend to work')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),lang+': no-JS reflow')
                    context.close()
                browser.close()
    except Exception as e:
        results.append({'check':'execution','pass':False,'error':str(e),'traceback':traceback.format_exc()})
    finally:
        if server:server.shutdown()
        out=Path(os.environ.get('WEBSITE_ART_OUTPUT',ROOT/'website-value-story-artifacts'));out.mkdir(parents=True,exist_ok=True)
        report={'scope':'Refined homepage only; full original demo remains in test.py','checks':len(results),'results':results,'failed':[r for r in results if not r['pass']]}
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
    return 1 if report['failed'] else 0

if __name__=='__main__':raise SystemExit(main())
