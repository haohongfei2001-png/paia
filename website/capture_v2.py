"""Capture current V2 illustrations over HTTP; fictional data only, no submission."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import hashlib,json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('WEBSITE_V2_OUTPUT','/tmp/paia-v2-review'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True)
        for locale in ['', 'zh/']:
            for width in [1440,390]:
                lang='zh' if locale else 'en';key=f'{lang}-{width}'
                page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
                page.goto(base+'/'+locale,wait_until='networkidle');page.evaluate('document.fonts.ready')
                page.evaluate('async()=>{document.querySelectorAll("img[loading=lazy]").forEach(e=>e.loading="eager");await Promise.all([...document.images].map(e=>e.decode().catch(()=>{})));}')
                page.screenshot(path=str(OUT/f'{key}-hero.png'))
                page.screenshot(path=str(OUT/f'{key}-home.jpg'),full_page=True,type='jpeg',quality=90)
                height=page.evaluate('document.documentElement.scrollHeight')
                page.locator('[data-story-reuse="a"]').click()
                assert page.locator('[data-proof-line][data-state=included]').count()==0
                page.locator('[data-nb-insert-full]').click()
                if width<=760:page.locator('[data-proof-view-pick="reading"]').click()
                page.locator('[data-story-reuse="c"]').click()
                page.locator('[data-nb-insert-full]').click()
                assert page.locator('[data-proof-line][data-state=included]').count()==2
                page.set_viewport_size({'width':width,'height':2000})
                pane=page.locator('[data-proof-pane="draft"]')
                pane.evaluate('e=>scrollTo({top:Math.max(0,scrollY+e.getBoundingClientRect().top-130),behavior:"instant"})')
                pane.screenshot(path=str(OUT/f'{key}-current-request.png'))
                if width<=760:page.locator('[data-proof-view-pick="reading"]').click()
                reader=page.locator('.fs-topic-window')
                reader.evaluate('e=>scrollTo({top:Math.max(0,scrollY+e.getBoundingClientRect().top-130),behavior:"instant"})')
                reader.screenshot(path=str(OUT/f'{key}-thought-reader.png'))
                page.set_viewport_size({'width':width,'height':900})
                for route in ['demo.html','how-it-works.html','use-cases.html','principles.html','status.html']:
                    page.goto(base+'/'+locale+route,wait_until='networkidle');page.evaluate('document.fonts.ready')
                    page.evaluate('async()=>{document.querySelectorAll("img[loading=lazy]").forEach(e=>e.loading="eager");await Promise.all([...document.images].map(e=>e.decode().catch(()=>{})));}')
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    page.screenshot(path=str(OUT/f'{key}-{route[:-5]}.jpg'),full_page=True,type='jpeg',quality=90)
                results.append({'locale':lang,'width':width,'homeViewportHeight':900,'detailViewportHeight':2000,'homeHeight':height,'actualRepositoryFonts':True,'twoPassagesExplicitlyInserted':True,'autoSent':False})
                page.close()
        browser.close()
finally:server.shutdown()
assets={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [*ROOT.glob('*.html'),*ROOT.glob('zh/*.html'),*ROOT.glob('en/*.html'),*ROOT.glob('assets/website/*.js'),*ROOT.glob('assets/website/*.css')]}
(OUT/'visual-evidence.json').write_text(json.dumps({'method':'Real repository build; loopback HTTP; actual local browser fonts; normal document flow; JPEG full-page views and PNG details. Detail captures use a taller viewport only to avoid sticky-header occlusion. No DOM hiding or mock AI.','captures':results,'runtimeSha256':assets},indent=2,ensure_ascii=False))
print(json.dumps({'views':len(list(OUT.glob('*.png')))+len(list(OUT.glob('*.jpg'))),'captures':results}))
