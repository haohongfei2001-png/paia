"""Read-only visual evidence from the actual local HTTP website.

No private content, form submission, provider call, persistent browser storage or
new runtime dependency. The screenshots and recording show implemented behavior,
not aesthetic certification. Run after website/test.py for the final candidate.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import argparse, hashlib, io, json, os, statistics
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
args=parser.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
report={'evidence':'SYNTHETIC_HTTP_VISUAL_REVIEW','origin':'ephemeral local HTTP','private_data':False,'form_submitted':False,'frames':[], 'viewports':[]}
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--no-sandbox'])
        report['browser']=browser.version
        def visit(name,width=1440,height=960,motion='reduce'):
            page=browser.new_page(viewport={'width':width,'height':height},reduced_motion=motion)
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            response=page.goto(origin+'/'+name,wait_until='networkidle')
            assert response and response.ok,(name,'HTTP')
            page.evaluate('document.fonts.ready')
            assert not errors,(name,errors)
            return page
        for name in ('index.html','zh/index.html','how-it-works.html','zh/how-it-works.html','use-cases.html','about.html','blog.html','beta.html','demo.html','principles.html'):
            page=visit(name)
            page.screenshot(path=str(OUT/(name.replace('/','-')+'-desktop.png')),full_page=True)
            page.close()
        for name in ('index.html','zh/index.html','how-it-works.html','demo.html','beta.html'):
            page=visit(name,390,844)
            page.screenshot(path=str(OUT/(name.replace('/','-')+'-mobile.png')),full_page=True)
            page.close()
        for width,height in ((1200,800),(1280,720),(1440,960),(1920,1080),(1024,768)):
            page=visit('index.html',width,height,motion='no-preference')
            if width>=1200:
                end=page.evaluate("(()=>{const s=document.querySelector('[data-hero-sequence]');return s.offsetTop+s.offsetHeight-(innerHeight-88)-88})()")
                page.evaluate("y=>scrollTo({top:y,behavior:'instant'})",end)
                page.wait_for_timeout(80)
                assert float(page.locator('[data-hero-sequence]').get_attribute('data-progress'))>=.99
                marks=page.evaluate("[...document.querySelectorAll('.input-card .provider-mark')].every(e=>{const r=e.getBoundingClientRect();return [.15,.5,.85].every(x=>[.15,.5,.85].every(y=>{const hit=document.elementFromPoint(r.x+x*r.width,r.y+y*r.height);return hit&&(hit===e||e.contains(hit))}))})")
                assert marks,(width,height,'obscured brand mark')
                page.screenshot(path=str(OUT/f'collection-{width}x{height}.png'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            report['viewports'].append({'width':width,'height':height,'pass':True})
            page.close()
        page=visit('index.html',motion='no-preference')
        end=page.evaluate("(()=>{const s=document.querySelector('[data-hero-sequence]');return s.offsetTop+s.offsetHeight-(innerHeight-88)-88})()")
        for i,ratio in enumerate((0,.28,.62,1)):
            page.evaluate("y=>scrollTo({top:y,behavior:'instant'})",end*ratio)
            page.wait_for_timeout(80)
            page.screenshot(path=str(OUT/f'hero-{i}.png'))
            report['frames'].append({'progress':ratio,'sources':page.locator('.input-card').evaluate_all('es=>es.map(e=>Number(getComputedStyle(e).opacity))'),'context_opacity':page.locator('.synthesis-card').evaluate('e=>Number(getComputedStyle(e).opacity)')})
        # Record the rendered native-scroll timeline, not a CSS mock of its end states.
        frames=[]
        for i in range(41):
            page.evaluate("y=>scrollTo({top:y,behavior:'instant'})",end*i/40)
            page.wait_for_timeout(35)
            im=Image.open(io.BytesIO(page.screenshot())).convert('RGB')
            im.thumbnail((1080,720),Image.Resampling.LANCZOS)
            frames.append(im)
        frames[0].save(OUT/'PAIA-v5-scroll.gif',save_all=True,append_images=frames[1:],duration=[850]+[85]*39+[1200],loop=0,optimize=True)
        field=page.locator('[data-v3-context]')
        field.scroll_into_view_if_needed();page.wait_for_timeout(1000)
        page.screenshot(path=str(OUT/'product-before.png'))
        research=field.locator('[data-fragment-id="research"]')
        research.click()
        page.wait_for_timeout(125)
        page.screenshot(path=str(OUT/'product-selection-motion.png'))
        page.wait_for_timeout(600)
        assert field.locator('[data-v3-count]').inner_text()=='4 / 5'
        assert field.locator('[data-context-wire].is-selected').count()==4
        page.screenshot(path=str(OUT/'product-selected.png'))
        for button in field.locator('[data-v3-fragment]').all():
            if button.get_attribute('aria-pressed')=='true':button.click()
        assert field.locator('[data-mini-copy]').is_disabled()
        page.screenshot(path=str(OUT/'product-empty.png'))
        # Verify cancellation mid-flight without waiting for the animation to finish.
        research.click()
        page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(50)
        assert page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
        assert page.locator('.selection-transfer').count()==0
        report['motion_cancellation']=True
        page.close();browser.close()
    report['runtime_sha256']={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ('index.html','zh/index.html','assets/website/site.css','assets/website/site.js','assets/website/demo.js')}
    report['pass']=True
finally:
    server.shutdown()
    (OUT/'visual-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
