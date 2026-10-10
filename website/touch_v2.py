"""Touch-emulated Chromium journeys, not physical iOS or virtual-keyboard certification."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('WEBSITE_V2_OUTPUT','/tmp/paia-v2-review'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
rows=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True)
        for locale in ['', 'zh/']:
            for width in [320,390,768]:
                page=browser.new_page(viewport={'width':width,'height':900},has_touch=True,is_mobile=True,device_scale_factor=1,reduced_motion='reduce')
                errors=[];external=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') and not r.url.startswith(base+'/') else None)
                page.goto(base+'/'+locale,wait_until='networkidle')
                page.locator('[data-preview-tab="thought"]').tap()
                assert page.locator('[data-preview-tab="thought"]').get_attribute('aria-selected')=='true'
                page.locator('[data-story-reuse="a"]').tap();page.locator('[data-nb-insert-full]').tap()
                assert page.locator('[data-proof-line="a"]').get_attribute('data-state')=='included'
                if width<=760:page.locator('[data-proof-view-pick="reading"]').tap()
                page.locator('[data-story-reuse="c"]').tap();page.locator('[data-nb-insert-full]').tap()
                assert page.locator('[data-proof-line][data-state=included]').count()==2
                page.locator('[data-proof-reset]').tap()
                assert page.locator('[data-proof-line][data-state=included]').count()==0
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.goto(base+'/'+locale+'demo.html',wait_until='networkidle')
                original=page.locator('[data-original="a"]').text_content()
                page.locator('[data-working="a"]').fill('Touch-emulated working edit.')
                assert page.locator('[data-original="a"]').text_content()==original
                page.locator('[data-topic-block="product"] h3 a').tap()
                assert page.locator('[data-thought-text="a"]').inner_text()=='Touch-emulated working edit.'
                page.locator('[data-topic-reader="product"] [data-topic-back]').tap()
                page.locator('[data-prompt-toggle]').tap();page.locator('[data-prompt-pick="1"]').tap()
                if page.locator('[data-nb-insert-full]').is_visible():page.locator('[data-nb-insert-full]').tap()
                assert page.locator('#pc-composer').input_value()
                page.locator('[data-card-allow="rules"]').tap()
                assert page.locator('[data-context-global]').get_attribute('aria-pressed')=='false'
                assert not page.evaluate('localStorage.length || sessionStorage.length')
                assert not errors and not external
                rows.append({'locale':locale or 'en','width':width,'pages':['home','demo'],'input':'actual Playwright tap events; touch/mobile emulation','pass':True,'errors':errors,'externalRequests':external})
                page.close()
        browser.close()
finally:server.shutdown()
(OUT/'touch.json').write_text(json.dumps({'physicalDevice':False,'operatingSystemIME':False,'virtualKeyboardResize':False,'journeys':rows},indent=2))
print(json.dumps({'journeys':len(rows),'pagesExercised':2*len(rows),'passed':sum(x['pass'] for x in rows)}))
