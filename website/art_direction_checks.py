"""Homepage-only copy, composition and safety checks against the live baseline.

Run after website/build.py. Uses the same public fictional examples. No private
archive, real host account, AI service, form submission or installed extension.
"""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import hashlib, json, os, sys
from art_direction import Fragments
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = Path(__file__).with_name('art_direction_baseline.json')
OUT = Path(os.environ.get('WEBSITE_ART_OUTPUT', ROOT / 'website-art-test-artifacts'))

def sha(value): return hashlib.sha256(value).hexdigest()

class Words(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True); self.words = []; self.skip = 0; self.feed(source)
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.skip -= 1
    def handle_data(self, data):
        if not self.skip and data.strip(): self.words.append(data.strip())

def copy_digest(source, candidate=False):
    d = Fragments(source); omit = []
    if candidate:
        # Added fictional scroll captions and their repeated specimen phrases
        # are separate from the original bilingual editorial copy.
        for cls in ('ad-capsule', 'ad-morph-track', 'ad-scroll-draft', 'ad-thought-scenes'):
            omit.append(d.one(cls))
        omit.append(d.one('ad-location').children[0])
        omit.append(d.one('ad-context-disclosure').children[0])
    else:
        omit.append(d.one('pc-nav'))
    for node in sorted(omit, key=lambda node:node.start, reverse=True):
        source = source[:node.start] + source[node.end:]
    counter = Counter(Words(source).words)
    return sha(json.dumps(sorted(counter.items()),ensure_ascii=False).encode()), sum(counter.values())

def snapshot(base):
    generated = (ROOT/'website/generated-paths.txt').read_text().splitlines()
    paths = ['assets/website/site.css','assets/website/interior.css','assets/website/product-experience.css','assets/website/home-core-v2.js','assets/website/site.js','website/product_hero.py','website/core.py','website/topic_preview.py','website/prompt_preview.py','website/product_sections.py']
    data = {'base_sha':'8e56ab340f2065b95a909a97b75b6b8eb1ce8bdb','files':{},'home':{},'unchanged_sources':{}}
    for name in generated:
        source = (base/name).read_bytes(); data['files'][name] = sha(source)
        if name in ('index.html','en/index.html','zh/index.html'):
            d = Fragments(source.decode())
            digest, count = copy_digest(source.decode())
            data['home'][name] = {'copy_sha256':digest,'text_nodes':count,'hero_sha256':sha(d.outer(d.one(attr='data-product-hero')).encode())}
    # Read exact Git baseline objects, not candidate files, for unchanged owners.
    import subprocess
    for name in paths:
        data['unchanged_sources'][name] = sha(subprocess.check_output(['git','show',data['base_sha']+':'+name],cwd=ROOT))
    FIXTURE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

if len(sys.argv) == 3 and sys.argv[1] == '--record-baseline':
    snapshot(Path(sys.argv[2])); print(FIXTURE); raise SystemExit

results = []
def check(ok, label):
    results.append({'check':label,'pass':bool(ok)})
    if not ok: raise AssertionError(label)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

server = None
try:
    data = json.loads(FIXTURE.read_text())
    for name, expected in data['files'].items():
        source = (ROOT/name).read_bytes()
        if name not in data['home']:
            check(sha(source)==expected,name+': non-homepage bytes frozen')
            continue
        expected_home = data['home'][name]; d = Fragments(source.decode())
        digest,count = copy_digest(source.decode(),True)
        check(digest==expected_home['copy_sha256'] and count==expected_home['text_nodes'],name+': all original text preserved except the removed navigation')
        check(sha(d.outer(d.one(attr='data-product-hero')).encode())==expected_home['hero_sha256'],name+': entire hero markup frozen')
        check('class="pc-nav ' not in source.decode(),name+': no duplicate section navigation')
    for name,expected in data['unchanged_sources'].items():
        check(sha((ROOT/name).read_bytes())==expected,name+': shared owner byte-identical')
    check((ROOT/'index.html').read_bytes()==(ROOT/'en/index.html').read_bytes(),'English alias remains exact')
    if '--static-only' not in sys.argv:
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
        Thread(target=server.serve_forever,daemon=True).start()
        origin=f'http://127.0.0.1:{server.server_port}'
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'))
            for locale,path in [('zh','/zh/'),('en','/')]:
                for width in (1440,1024,768,390,320):
                    page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
                    errors=[];unexpected=[]
                    page.on('pageerror',lambda error:errors.append(str(error)))
                    page.on('request',lambda req:unexpected.append(req.url) if req.method!='GET' or req.resource_type in ('fetch','xhr','websocket') else None)
                    page.goto(origin+path,wait_until='networkidle');page.evaluate('document.fonts.ready')
                    def test(ok,label): check(ok,f'{locale}/{width}: '+label)
                    page.locator('#prompt-reuse').scroll_into_view_if_needed()
                    permission=page.locator('[data-context-global]').get_attribute('aria-pressed')
                    composer=page.locator('#pc-composer');board=page.locator('#pc-prompt-card')
                    test(page.locator('[data-scroll-story="thought"]').count()==1,'Thought has one scroll transformation')
                    test(page.locator('[data-scroll-story="prompt"]').count()==1,'Prompt has one scroll transformation')
                    test(page.locator('[data-story-advance]').count()==1,'one shape advance, no static three-state display')
                    test(page.locator('.ad-shapes').count()==0,'simultaneous three-shape selectors are gone')
                    test(board.is_visible(),'reduced-motion users retain the usable prompt board')
                    test(composer.input_value()=='','scroll specimen never inserts into the real composer')
                    test(page.locator('.ad-context-disclosure').count()==1 and not page.locator('.ad-context-disclosure').evaluate('e=>e.open'),'redundant Context showcase stays collapsed')
                    test(page.locator('[data-context-global]').get_attribute('aria-pressed')==permission,'presentation does not change Context')
                    # Actual shape dimensions and usable band, not prose promises.
                    box=board.bounding_box();host=page.locator('[data-ad-host]').bounding_box()
                    test(box is not None and box['width']<=(322.1 if page.locator('[data-ad-host]').evaluate('e=>e.clientWidth')<=400 else 336.1),'board respects the approved 322/336px width without widening')
                    test(page.locator('[data-ad-host]').get_attribute('data-geometry')=='available','normal viewport has a usable band')
                    form=page.locator('.ad-host .pc-composer').bounding_box();bar=page.locator('.ad-host .pc-window-bar').bounding_box()
                    test(box['y']>=bar['y']+bar['height']+11 and box['y']+box['height']<=form['y']-11,'board does not overlap composer or top controls')
                    page.locator('[data-prompt-manage="0"]').click()
                    wording='完整的第一行。\n第二行保留原始标点与空格。' if locale=='zh' else 'The complete first line.\nThe second line keeps its exact punctuation.'
                    page.locator('#pc-prompt-0').fill(wording)
                    page.locator('#pc-prompt-0').press('Escape')
                    composer.fill('BeforeAfter');composer.evaluate("e=>{e.setSelectionRange(6,6);e.dispatchEvent(new Event('select',{bubbles:true}));}")
                    page.locator('[data-prompt-pick="0"]').click()
                    test(page.locator('.ad-check').is_visible(),'multiline expression requires visible full-text checking')
                    test(composer.input_value()=='BeforeAfter','checking preserves the full existing draft')
                    test(page.locator('.ad-check>p').inner_text()==wording,'checking shows exact multiline wording')
                    test(page.locator('.ad-check>p').bounding_box()['height']<=150.1,'full-text viewport stays bounded')
                    page.locator('.ad-check-actions button').last.click()
                    test(composer.input_value()=='Before\n\n'+wording+'\n\nAfter','confirmed insertion preserves the middle caret and suffix')
                    # A changed draft invalidates a pending confirmation.
                    page.locator('[data-prompt-pick="0"]').click();composer.fill('New draft')
                    page.locator('.ad-check-actions button').last.click()
                    test(composer.input_value()=='New draft','stale confirmation refuses rather than overwrites')
                    composer.dispatch_event('compositionstart')
                    page.locator('[data-prompt-pick="1"]').click()
                    test(composer.input_value()=='New draft','IME composition prevents insertion')
                    composer.dispatch_event('compositionend')
                    composer.fill('x'*990)
                    page.locator('[data-prompt-pick="1"]').click()
                    test(composer.input_value()=='x'*990,'overflow refusal retains the entire draft')
                    composer.fill('')
                    test(board.is_visible(),'the real prompt board remains available after editing')
                    page.locator('.pc-prompts h2').click();page.wait_for_timeout(250)
                    test(board.is_visible(),'blur and inactivity do not collapse the board')
                    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal page overflow')
                    # Text enlargement must reflow, not shrink the words.
                    page.add_style_tag(content='html{font-size:200%!important}')
                    page.wait_for_timeout(80)
                    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'200% text has no horizontal page overflow')
                    test(page.locator('.pc-review .pc-intro p').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=30,'200% prose is actually enlarged')
                    test(page.locator('[data-prompt-pick]').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=26,'200% board text is enlarged without widening the board')
                    # Every card retains an independently reachable hit target.
                    for key in ('info','rules','now','inputs'):
                        c=page.locator(f'[data-card-open="{key}"]');test(c.is_visible(),key+': card still visible with enlarged text')
                    test(not errors,'no page script errors');test(not unexpected,'no fetch, XHR, WebSocket or submission')
                    page.close()
            # True native-scroll animation journey (non-reduced motion).
            for locale,path in [('zh','/zh/'),('en','/')]:
                for width in (1440,390):
                    page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='no-preference')
                    errors=[];forbidden=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.on('request',lambda r:forbidden.append(r.url) if r.method!='GET' or r.resource_type in ('fetch','xhr','websocket') else None)
                    page.goto(origin+path,wait_until='networkidle')
                    page.wait_for_timeout(120)
                    stories = [('thought',['cards','open','organize']),('prompt',['orb','capsule','board'])] if width>640 else [('thought',['cards','cards','cards']),('prompt',['board','board','board'])]
                    for story,phases in stories:
                        for portion,expected in zip((.08,.48,.88),phases):
                            page.evaluate('''([name,f])=>{
                                const el=document.querySelector('[data-scroll-story="'+name+'"]');
                                const y=el.getBoundingClientRect().top+scrollY+Math.max(1,el.offsetHeight-innerHeight+100)*f;
                                scrollTo({top:y,behavior:'instant'});
                            }''',[story,portion])
                            page.wait_for_function('([name,phase])=>document.querySelector(`[data-scroll-story="${name}"]`)?.dataset.phase===phase',arg=[story,expected],timeout=4000)
                            check(page.locator(f'[data-scroll-story="{story}"]').get_attribute('data-phase')==expected,f'{locale}/{width}: {story} scroll phase {expected}')
                            check(page.locator('#pc-composer').input_value()=='',f'{locale}/{width}: scroll does not insert or send')
                    check(page.locator('.ad-scroll-draft').count()==1,f'{locale}/{width}: suggested text is a nonwriting visual preview')
                    check(page.locator('#pc-prompt-card').is_visible(),f'{locale}/{width}: final narrow board is visible')
                    if width>640:
                        page.evaluate('''()=>{
                            const el=document.querySelector('[data-scroll-story="prompt"]');
                            scrollTo({top:el.getBoundingClientRect().top+scrollY+100,behavior:'instant'});
                        }''')
                        page.wait_for_timeout(85)
                        for expected in ('capsule','board'):
                            page.locator('[data-story-advance]').click()
                            check(page.locator('[data-scroll-story="prompt"]').get_attribute('data-phase')==expected,f'{locale}/{width}: manual progressive control {expected}')
                    else:
                        check(not page.locator('[data-story-advance]').is_visible(),f'{locale}/{width}: mobile uses the accessible continuous board')
                    check(page.locator('#pc-prompt-card').is_visible(),f'{locale}/{width}: manual board remains operable')
                    page.locator('[data-context-global]').click()
                    check(page.locator('[data-context-global]').get_attribute('aria-pressed')=='false',f'{locale}/{width}: real permission remains explicit')
                    check(not errors,f'{locale}/{width}: scroll script has no page errors')
                    check(not forbidden,f'{locale}/{width}: scroll makes no API or send requests')
                    page.close()
            # JavaScript is not required to read any product prose or sample.
            for locale,path in [('zh','/zh/'),('en','/')]:
                context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
                page=context.new_page();page.goto(origin+path,wait_until='networkidle')
                check(page.locator('.pc-record textarea').count()==3,locale+': all original examples retained without JS')
                check(page.locator('[data-topic-reader]').count()==3,locale+': continuous readers remain in the no-JS document')
                check(page.locator('[data-story-advance]:disabled').count()==1,locale+': non-JS morph preview remains inert')
                check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),locale+': no-JS mobile reflow')
                context.close()
            browser.close()
except Exception as error:
    results.append({'check':'suite execution','pass':False,'error':str(error)})
finally:
    if server: server.shutdown()
    OUT.mkdir(parents=True,exist_ok=True)
    report={'scope':'fictional homepage, local HTTP Chromium; not physical-device or extension certification','checks':len(results),'passed':sum(x['pass'] for x in results),'failed':[x for x in results if not x['pass']],'results':results}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
    if report['failed']: raise SystemExit(1)
