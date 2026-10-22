"""Current user-authorized case/design checks, not an installation certificate.

Full original Demo/source/permission/IME tests remain in core_checks.py. This
module changes only homepage composition expectations and explicit sample-copy
assertions, retaining hash checks on inherited runtime after literal restoration.
"""
from pathlib import Path
from html.parser import HTMLParser
from datetime import date
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import hashlib,json,os,sys,re,traceback
from art_direction import Fragments
from continuity_data import localized,sample_mapping
from launch_pages import installation
ROOT=Path(__file__).resolve().parents[1]
MARKER='data-site-revision="continuity-v2"'

class Text(HTMLParser):
    def __init__(self,s):super().__init__(convert_charrefs=True);self.parts=[];self.feed(s)
    def handle_data(self,v):self.parts.append(v)
    def value(self):return ''.join(self.parts)

def active(root):return MARKER in (root/'index.html').read_text()

def restored_runtime(root):
    config=json.loads((root/'website/continuity_runtime_copy.json').read_text())
    source=(root/config['path']).read_text()
    for old,new in sorted(config['replacements'].items(),key=lambda pair:-len(pair[1])):
        source=source.replace(new,old)
    return source.encode()

def verify_static(root,check):
    from launch_checks import find
    preserved=json.loads((root/'website/continuity_preserved.json').read_text())
    for path,sha in preserved['unchanged'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==sha,'continuity: inherited owner exact '+path)
    config=json.loads((root/'website/continuity_runtime_copy.json').read_text())
    check(hashlib.sha256(restored_runtime(root)).hexdigest()==config['original_sha256'],'continuity: full Demo runtime differs only in declared example literals')
    core_tests=(root/'website/core_checks.py').read_text().replace("('Building a quoting tool' if en else '做一个报价工具')","('A product’s first step' if en else '产品的第一步')")
    check(hashlib.sha256(core_tests.encode()).hexdigest()==preserved['core_tests_sha256'],'continuity: original full Demo assertions unchanged except expected fictional title')
    for lang,path in [('en','index.html'),('zh','zh/index.html')]:
        source=(root/path).read_text();parsed=Fragments(source)
        check(MARKER in source,path+': explicit active revision')
        check('换个住处' not in source and 'Finding a place to live' not in source,path+': rejected moving-home example removed')
        check(len(find(parsed,'[data-case-panel]'))==3,path+': three substantive cases')
        fragments=[Text(parsed.outer(e)).value() for e in find(parsed,'.ct-fragment p')]
        topic=[Text(parsed.outer(e)).value() for e in find(parsed,'.ct-hero-chapter p')]
        check(fragments==topic and len(topic)==2,path+': opening switches the same two complete original expressions')
        for case in localized(lang):
            panel=find(parsed,'#ct-panel-'+case['id'])[0]
            content=Fragments(parsed.outer(panel))
            entries=find(content,'[data-record-id]')
            actual={}
            for e in entries:
                part=Fragments(content.outer(e));actual[e.attrs['data-record-id']]=Text(part.outer(find(part,'[data-original-text]')[0])).value()
            expected={e['id']:e['text'] for e in case['records']}
            check(actual==expected,path+'/'+case['id']+': all six complete original expressions are exact')
            check(len(set(e['conversation'] for e in case['records']))==6,path+'/'+case['id']+': counts come from six distinct fictional conversations')
            check((date.fromisoformat(case['records'][-1]['date'])-date.fromisoformat(case['records'][0]['date'])).days>=180,path+'/'+case['id']+': genuinely extended time span, not three nearby dates')
            check([e['id'] for g in case['groups'] for e in case['records'] if e['group']==g['id']]!=[e['id'] for e in case['records']],path+'/'+case['id']+': topic organization differs from chronological ordering')
        check(len(find(parsed,'[data-context-card]'))==4,path+': four retained Context directories')
        check(not any(x in source for x in ('data-card-allow','data-context-global','data-context-text','data-card-detail')),path+': no false real permissions in homepage')
        check(len(find(parsed,'#ct-search-input'))==1 and len(find(parsed,'#ct-draft'))==1,path+': real controls, not decorative fields')
        check(source.count('continuity.js')==1,path+': one page-local controller')
        check(all('src="/assets/website/'+name not in source for name in ('value-story.js','home-core-v2.js','home-presentation.js','home-art.js','scroll-story.js')),path+': no competing homepage controllers')
        ids=[e.attrs['id'] for e in parsed.elements if e.attrs.get('id')]
        check(len(ids)==len(set(ids)),path+': unique HTML IDs')
        close=parsed.outer(parsed.one(attr='data-close-brand'))
        check(hashlib.sha256(close.encode()).hexdigest()==preserved['close'][lang],path+': original closing including illustration remains exact')
        for endpoint in ('use-cases.html','how-it-works.html','demo.html'):
            other=root/('zh' if lang=='zh' else '')/endpoint
            body=other.read_text()
            check(localized(lang)[0]['title'] in body,lang+'/'+endpoint+': project example consistent across routes')
            check('换个住处' not in body and 'Finding a place to live' not in body,lang+'/'+endpoint+': rejected case absent')
        use=(root/('zh' if lang=='zh' else '')/'use-cases.html').read_text()
        check(all(c['next'] in use for c in localized(lang)),lang+': each case shows a concrete next task informed by earlier reasoning')
        check((root/path).read_bytes()==(root/('en/index.html' if lang=='en' else path)).read_bytes(),lang+': alias unchanged')
    runtime=(root/'assets/website/continuity.js').read_text()
    for name in ('fetch(', 'XMLHttpRequest','WebSocket','sendBeacon','localStorage','sessionStorage','setInterval','.submit(', 'requestSubmit('):
        check(name not in runtime,'continuity: no '+name)
    check("dataset.siteRevision !== 'continuity-v2'" in runtime,'continuity: isolated route guard')
    sheet=(root/'assets/website/continuity.css').read_text()
    check('@import' not in sheet and '@font-face' not in sheet and 'url(' not in sheet,'continuity: no new remote visual dependencies')
    check('prefers-reduced-motion:reduce' in sheet and 'forced-colors:active' in sheet,'continuity: motion and contrast alternatives')

def verify_hero(page,check,en=True,motion=False):
    t=lambda ok,name:check(ok,('EN' if en else 'ZH')+' continuity hero: '+name)
    prefix='/' if en else '/zh/'
    t(page.locator('[data-product-hero]').count()==1,'one visible product introduction')
    t(page.locator('#hero-title').is_visible(),'value visible without interaction')
    t(page.locator('[data-hero-space]').evaluate_all('es=>es.map(e=>e.dataset.heroSpace)')==['archive','thought','context'],'three spaces are real in-page links')
    t(page.locator('.hero-actions a').evaluate_all('es=>es.map(e=>e.getAttribute("href"))')==[installation()['chrome_store_url'] or prefix+'demo.html','#thought-library'],'available demo and actual case link')
    t(page.locator('[data-hero-panel=topic]').is_visible(),'grouped result visible by default')
    t(page.locator('[data-hero-view]').count()==2,'explicit operable views, no fake app tabs')
    t(page.locator('.pv-search,[data-preview-tab]').count()==0,'retired dead search and space tabs absent')
    if motion:
        page.locator('[data-hero-view=conversations]').click()
        t(page.locator('[data-hero-panel=conversations]').is_visible() and not page.locator('[data-hero-panel=topic]').is_visible(),'conversation view opens with matching semantics')
        page.locator('[data-hero-view=topic]').focus();page.keyboard.press('Enter')
        t(page.locator('[data-hero-panel=topic]').is_visible() and page.locator('[data-hero-view=topic]').get_attribute('aria-pressed')=='true','keyboard returns to topic view')
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        page.evaluate("scrollTo({top:250,behavior:'instant'})")
        t(abs(page.evaluate('scrollY')-250)<2,'native scroll not trapped')
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        page.emulate_media(reduced_motion='reduce');page.wait_for_function("document.documentElement.dataset.motion==='off'")
        t(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior==='auto'"),'system reduced motion applies')

def verify_home(page,check,label='home',motion=False):
    test=lambda ok,name:check(ok,label+': continuity '+name)
    page.wait_for_selector('body.ct-ready')
    lang='zh' if page.locator('html').get_attribute('lang').startswith('zh') else 'en'
    test(page.locator('[data-continuity=v2]').count()==1,'one homepage owner')
    test(page.locator('[data-case-panel]').count()==3,'three complete cases retained')
    test(page.locator('[data-context-card]').count()==4,'four retained Context directories')
    test(page.locator('[data-context-overview] textarea,[data-context-overview] input,[data-card-detail]').count()==0,'no private bodies in Context overview')
    test(page.locator('#ct-prompt-board').is_visible(),'useful panel visible by default')
    test(page.locator('#ct-search-input').is_enabled() and page.locator('#ct-draft').is_enabled(),'visible fields are actual controls')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow')
    if not motion:return
    search=page.locator('#ct-search-input');initial_query=search.input_value()
    search.fill('看板' if lang=='zh' else 'board')
    test(page.locator('[data-search-record]:visible').evaluate_all('es=>es.map(e=>e.dataset.searchRecord)')==['p6'],'search finds the actual matching source')
    search.fill('<img src=x onerror=alert(1)>')
    test(page.locator('.ct-search-empty').is_visible() and page.locator('.ct-search-results img').count()==0,'unknown query safely returns empty, no HTML execution')
    page.locator('[data-search-clear]').click()
    test(page.locator('[data-search-record]:visible').count()==6,'clear restores every sample expression')
    test(search.evaluate('e=>e===document.activeElement'),'clearing retains search focus')
    search.fill(initial_query)
    draft=page.locator('#ct-draft');initial=draft.input_value();draft.fill('My draft stays while I browse cases.')
    for case in localized(lang):
        page.locator('[data-case-select='+case['id']+']').click()
        panel=page.locator('[data-case-panel='+case['id']+']')
        test(panel.is_visible() and page.locator('[data-case-panel]:visible').count()==1,case['id']+' alone is visible')
        test(draft.input_value()=='My draft stays while I browse cases.',case['id']+' does not rewrite the draft')
        actual=panel.locator('[data-record-id]').evaluate_all('es=>Object.fromEntries(es.map(e=>[e.dataset.recordId,e.querySelector("[data-original-text]").textContent]))')
        test(actual=={e['id']:e['text'] for e in case['records']},case['id']+' keeps exact original expressions')
        panel.locator('[data-reading-mode=time]').click()
        test(panel.locator('[data-chronological] [data-record-id]').evaluate_all('es=>es.map(e=>e.dataset.recordId)')==[e['id'] for e in case['records']],case['id']+' time view sorts true dates')
        test(panel.locator('[data-record-id]:visible').count()==6,case['id']+' all records reachable without a scroll-stage gate')
        panel.locator('[data-reading-mode=topic]').click()
        test(panel.locator('[data-grouped] [data-record-id]').evaluate_all('es=>es.map(e=>e.dataset.recordId)')==[e['id'] for g in case['groups'] for e in case['records'] if e['group']==g['id']],case['id']+' regrouping moves the same original nodes')
        details=panel.locator('[data-chapter]').last
        if not details.evaluate('e=>e.open'):
            details.locator('summary').focus();page.keyboard.press('Enter')
            test(details.evaluate('e=>e.open'),case['id']+' collapsed chapter is keyboard-readable')
            page.keyboard.press('Enter')
    tab=page.locator('[data-case-select=project]');tab.focus();page.keyboard.press('End')
    test(page.locator('[data-case-select=career]').get_attribute('aria-selected')=='true' and page.locator('[data-case-select=career]').evaluate('e=>e===document.activeElement'),'case keyboard End moves both selection and focus')
    page.keyboard.press('Home');test(tab.get_attribute('aria-selected')=='true','Home returns to first case')
    reset=page.locator('[data-draft-reset]');reset.click()
    phrase=page.locator('[data-phrase="0"] span').first.inner_text()
    draft.fill('Alpha selected Omega');draft.evaluate("e=>{e.focus();e.setSelectionRange(6,14);e.dispatchEvent(new Event('select'))}")
    page.locator('[data-phrase="0"]').click()
    test(draft.input_value()=='Alpha selected\n'+phrase+' Omega','phrase insertion preserves selected and unselected text')
    test(draft.evaluate('e=>e===document.activeElement'),'insertion returns focus to draft')
    test(page.locator('#ct-prompt-board').is_visible(),'insertion keeps panel open')
    reset.click();page.locator('[data-quote-insert]').click()
    test(initial in draft.input_value() and page.locator('[data-kept-quote]').text_content() in draft.input_value(),'explicit quote carries the exact old judgment into the new draft')
    reset.click();draft.evaluate("e=>e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'x'}))")
    page.locator('[data-phrase="0"]').click();test(draft.input_value()==initial,'IME composition is protected')
    draft.evaluate("e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'x'}))")
    draft.fill('x'*2395);page.locator('[data-phrase="0"]').click();test(draft.input_value()=='x'*2395,'length refusal preserves all existing text')
    reset.click();toggle=page.locator('[data-prompt-toggle-v2]');toggle.focus();page.keyboard.press('Enter')
    test(not page.locator('#ct-prompt-board').is_visible() and toggle.get_attribute('aria-expanded')=='false','keyboard collapse has honest state')
    page.keyboard.press('Enter');test(page.locator('#ct-prompt-board').is_visible() and toggle.get_attribute('aria-expanded')=='true','keyboard expand works')
    test(not page.evaluate('localStorage.length || sessionStorage.length'),'no persisted visitor material')
    page.emulate_media(reduced_motion='reduce');page.wait_for_selector('body.hp-static')
    zoom=page.add_style_tag(content='html{font-size:200%!important}');page.wait_for_timeout(80)
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'200% text reflows without hiding overflow')
    zoom.evaluate('e=>e.remove()');reset.click()

def verify_visual(page,check,label='home'):
    t=lambda ok,name:check(ok,label+': continuity material '+name)
    t(page.locator('.ct-prompt-host').evaluate("e=>getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)'"),'neutral white composer host')
    if not page.evaluate("matchMedia('(forced-colors:active)').matches"):
        t(page.locator('.ct-prompt-board').evaluate("e=>getComputedStyle(e).backdropFilter.includes('blur(')"),'existing bounded glass language')
    t(page.locator('.ct-entry').evaluate_all("es=>es.every(e=>getComputedStyle(e).boxShadow==='none')"),'continuous original reading, not a card for each sentence')
    t(page.locator('[data-context-card]').count()==4,'retained four-card composition')
    t(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow')

def main():
    from playwright.sync_api import sync_playwright
    result=[];server=None
    def check(ok,label):
        result.append({'check':label,'pass':bool(ok)})
        if not ok:raise AssertionError(label)
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    try:
        verify_static(ROOT,check)
        if '--static-only' not in sys.argv:
            server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
            origin=f'http://127.0.0.1:{server.server_port}'
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
                for lang,prefix in [('en',''),('zh','zh/')]:
                    for width in (1440,1024,768,390,320):
                        page=browser.new_page(viewport={'width':width,'height':980})
                        errors=[];requests=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.on('request',lambda r:requests.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
                        page.goto(origin+'/'+prefix,wait_until='load');page.evaluate('document.fonts.ready')
                        verify_hero(page,check,en=lang=='en',motion=True)
                        verify_home(page,check,lang+'/'+str(width),motion=True)
                        verify_visual(page,check,lang+'/'+str(width))
                        check(not errors,lang+'/'+str(width)+': no JS errors')
                        check(not requests,lang+'/'+str(width)+': no service or submission requests')
                        page.goto(origin+'/'+prefix+'?case=research#thought-library',wait_until='load');page.wait_for_selector('body.ct-ready')
                        check(page.locator('[data-case-panel=research]').is_visible(),lang+'/'+str(width)+': deep link selects its case')
                        check('case=research' in page.locator('.header-actions .language').get_attribute('href'),lang+'/'+str(width)+': language link preserves a directly opened case')
                        page.reload(wait_until='load');page.wait_for_selector('body.ct-ready')
                        check(page.locator('#ct-draft').input_value()==('我在做一款报价工具。有人建议加项目看板。' if lang=='zh' else 'I am building a quoting tool. Someone suggested adding a project board.'),lang+'/'+str(width)+': reload clears the example draft')
                        page.close()
                    ctx=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
                    page=ctx.new_page();page.goto(origin+'/'+prefix,wait_until='load')
                    check(page.locator('[data-hero-panel=topic]').is_visible() and page.locator('[data-case-panel=project] [data-record-id]:visible').count()==6,lang+': no-JS gives complete readable original content')
                    check(page.locator('#ct-search-input').is_disabled() and page.locator('[data-phrase]').evaluate_all('es=>es.every(e=>e.disabled)'),lang+': no-JS actions do not pretend to operate')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),lang+': no-JS mobile reflow')
                    ctx.close()
                browser.close()
    except Exception as e:result.append({'check':'execution','pass':False,'error':str(e),'traceback':traceback.format_exc()})
    finally:
        if server:server.shutdown()
        out=Path(os.environ.get('WEBSITE_ART_OUTPUT',ROOT/'website-continuity-artifacts'));out.mkdir(parents=True,exist_ok=True)
        report={'scope':'Current synthetic homepage. Original full Demo suite remains separate.','checks':len(result),'results':result,'failed':[r for r in result if not r['pass']]}
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
    return 1 if report['failed'] else 0
if __name__=='__main__':raise SystemExit(main())
